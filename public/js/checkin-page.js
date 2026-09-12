/**
 * checkin-page.js - 打卡页：头像移动、打卡操作、自动适配
 * 性能优化：事件委托，_bindEvents只在init时调用一次
 */

const CheckinPage = {
  _students: [],
  _originalOrder: [],
  _checkedIn: new Set(),
  _sorted: false,
  _resizeTimer: null,
  _resizeHandler: null,
  _eventsBound: false,

  init() {
    var old = document.getElementById('checkin-content');
    if (old) {
      var fresh = old.cloneNode(false);
      fresh.id = 'checkin-content';
      old.parentNode.replaceChild(fresh, old);
    }

    var task = Storage.getTodayTask();
    if (!task) {
      Utils.toast('请先设置今日任务');
      window.location.hash = '#/task';
      return;
    }

    this._students = Storage.getStudents();
    this._originalOrder = [].concat(this._students);
    if (this._students.length === 0) {
      Utils.toast('请先导入学生名单');
      window.location.hash = '#/settings';
      return;
    }

    var record = Storage.getTodayRecord();
    if (record && record.checkins) {
      this._checkedIn = new Set(Object.keys(record.checkins));
    }

    this._eventsBound = false;
    this._render();
    this._bindEvents();
    requestAnimationFrame(() => this._fitGrids());
  },

  _render() {
    var container = document.getElementById('checkin-content');
    if (!container) return;

    var task = Storage.getTodayTask();
    var total = this._students.length;
    var done = this._checkedIn.size;

    container.innerHTML =
      '<div class="checkin-header">' +
        '<h2>完成晨读/背诵/默写/作业后打卡</h2>' +
        '<div class="checkin-progress">' +
          '<div class="progress-bar"><div class="progress-fill" style="width:' + (total > 0 ? (done / total * 100) : 0) + '%"></div></div>' +
          '<span class="progress-text">' + done + '/' + total + '</span>' +
        '</div>' +
        '<div class="checkin-header-actions">' +
          '<button class="btn btn-secondary" id="btn-sort-surname">按姓氏排序</button>' +
          '<button class="btn btn-danger" id="btn-reset-checkin">重置</button>' +
          '<button class="btn btn-secondary" id="btn-back-task">返回</button>' +
        '</div>' +
      '</div>' +
      '<div class="checkin-body">' +
        '<div class="checkin-col checkin-pending">' +
          '<div class="checkin-col-header">' +
            '<span class="col-title">\u{1F4CB} 待完成 <span class="col-count pending-count">' + (total - done) + '</span></span>' +
          '</div>' +
          '<div class="checkin-grid" id="pending-grid">' + this._renderAllSlots('pending') + '</div>' +
        '</div>' +
        '<div class="checkin-divider"></div>' +
        '<div class="checkin-col checkin-done">' +
          '<div class="checkin-col-header">' +
            '<span class="col-title">✅ 已完成 <span class="col-count done-count">' + done + '</span></span>' +
          '</div>' +
          '<div class="checkin-grid" id="done-grid">' + this._renderAllSlots('done') + '</div>' +
        '</div>' +
      '</div>' +
      (task && task.message ? '<div class="checkin-message"><p class="inspirational-quote">' + Utils.escapeHtml(task.message) + '</p></div>' : '');

    if (done === total && total > 0) {
      this._showCelebration();
    }
  },

  _renderAllSlots(side) {
    var html = '';
    for (var i = 0; i < this._students.length; i++) {
      var s = this._students[i];
      var isChecked = this._checkedIn.has(s.id);
      var safeId = Utils.escapeHtml(s.id);
      var safeName = Utils.escapeHtml(s.name);

      if (side === 'pending') {
        if (isChecked) {
          html += '<div class="avatar-slot empty-slot"></div>';
        } else {
          html += '<div class="avatar-slot pending-card" data-student-id="' + safeId + '">' +
            '<div class="avatar-img">' + Avatars.render(s.name, undefined, s.gender) + '</div>' +
            '<div class="avatar-name">' + safeName + '</div>' +
          '</div>';
        }
      } else {
        if (!isChecked) {
          html += '<div class="avatar-slot empty-slot"></div>';
        } else {
          html += '<div class="avatar-slot done-card" data-student-id="' + safeId + '">' +
            '<div class="avatar-img">' + Avatars.render(s.name, undefined, s.gender) + '</div>' +
            '<div class="avatar-name">' + safeName + '</div>' +
          '</div>';
        }
      }
    }
    return html;
  },

  // ===== 自适应铺满 =====

  _fitGrids() {
    var GAP = 4;
    var NAME_MIN = 9, NAME_MAX = 18;
    var NAME_EXTRA = 8;

    function nameFont(av, cw) {
      var f = Math.max(NAME_MIN, Math.min(NAME_MAX, Math.round(av * 0.26)));
      if (cw) f = Math.min(f, Math.max(NAME_MIN, Math.floor((cw - 2) / 4.5)));
      return f;
    }

    var fits = [];
    var ids = ['pending-grid', 'done-grid'];
    for (var gi = 0; gi < ids.length; gi++) {
      var g = document.getElementById(ids[gi]);
      if (!g) { fits.push(null); continue; }
      var n = g.children.length;
      var w = n ? g.clientWidth : 0;
      var h = n ? g.clientHeight : 0;
      if (!n || !w || !h) { fits.push(null); continue; }

      var bestC = 1, bestAv = 0, bestScore = -1;
      for (var c = 1; c <= Math.min(n, 30); c++) {
        var rows = Math.ceil(n / c);
        var cw = (w - (c - 1) * GAP) / c;
        var ch = (h - (rows - 1) * GAP) / rows;
        var av = Math.min(cw * 0.94, ch);
        for (var k = 0; k < 4; k++) {
          av = Math.min(cw * 0.94, ch - nameFont(av, cw) * 1.3 - NAME_EXTRA);
        }
        var score = nameFont(av, cw) * 100 + av;
        if (score > bestScore) { bestScore = score; bestC = c; bestAv = av; }
      }
      fits.push({ g: g, c: bestC, w: w, av: Math.max(18, Math.min(Math.round(bestAv), 140)) });
    }

    var cap = null;
    for (var fi = 0; fi < fits.length; fi++) {
      if (fits[fi] && (cap === null || fits[fi].av < cap)) cap = fits[fi].av;
    }
    for (var fi2 = 0; fi2 < fits.length; fi2++) {
      var f = fits[fi2];
      if (!f) continue;
      var av = cap === null ? f.av : Math.min(f.av, cap);
      var cw = (f.w - (f.c - 1) * GAP) / f.c;
      f.g.style.gridTemplateColumns = 'repeat(' + f.c + ', minmax(0, 1fr))';
      f.g.style.setProperty('--av', av + 'px');
      f.g.style.setProperty('--fs', nameFont(av, cw) + 'px');
    }
  },

  // ===== 事件绑定（仅init时调用一次） =====

  _bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    var self = this;
    var container = document.getElementById('checkin-content');
    if (!container) return;

    // 全部用事件委托
    container.addEventListener('click', function(e) {
      var card = e.target.closest('.pending-card');
      if (card) { self._checkin(card.dataset.studentId); return; }

      var doneCard = e.target.closest('.done-card');
      if (doneCard) { self._uncheckin(doneCard.dataset.studentId); return; }

      if (e.target.closest('#btn-sort-surname')) {
        self._sorted = !self._sorted;
        if (self._sorted) {
          self._students = Utils.sortBySurname(self._students);
        } else {
          self._students = [].concat(self._originalOrder);
        }
        self._render();
        requestAnimationFrame(function() { self._fitGrids(); });
        Utils.toast(self._sorted ? '已按姓氏排序' : '已恢复原序');
        return;
      }

      if (e.target.closest('#btn-reset-checkin')) {
        self._showConfirmDialog('确定要重置所有打卡记录吗？所有人将回到待完成状态。', function() {
          self._resetCheckin();
        });
        return;
      }

      if (e.target.closest('#btn-back-task')) {
        window.location.hash = '#/task';
        return;
      }
    });

    // resize 只绑一次
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
    this._resizeHandler = function() {
      clearTimeout(self._resizeTimer);
      self._resizeTimer = setTimeout(function() { self._fitGrids(); }, 120);
    };
    window.addEventListener('resize', this._resizeHandler);
  },

  _resetCheckin() {
    this._checkedIn = new Set();
    var date = Storage.getTodayKey();
    var records = Storage.getRecords();
    delete records[date];
    Storage.setRecords(records);
    this._render();
    requestAnimationFrame(() => this._fitGrids());
    Utils.toast('已重置打卡');
  },

  _showConfirmDialog(message, onConfirm) {
    var overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = '<div class="dialog"><h3>确认</h3><p>' + Utils.escapeHtml(message) + '</p><div class="dialog-actions"><button class="btn btn-danger" id="btn-confirm-ok">确定</button><button class="btn btn-secondary dialog-close">取消</button></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#btn-confirm-ok').addEventListener('click', function() { overlay.remove(); onConfirm(); });
    overlay.querySelector('.dialog-close').addEventListener('click', function() { overlay.remove(); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  },

  _checkin(studentId) {
    this._checkedIn.add(studentId);
    var record = Storage.getTodayRecord() || {
      taskId: Storage.getTodayTask() && Storage.getTodayTask().date ? Storage.getTodayTask().date : Storage.getTodayKey(),
      checkins: {}
    };
    record.checkins[studentId] = new Date().toISOString();
    Storage.setTodayRecord(record);
    this._render();
    requestAnimationFrame(() => this._fitGrids());
  },

  _uncheckin(studentId) {
    this._checkedIn.delete(studentId);
    var record = Storage.getTodayRecord();
    if (record && record.checkins) {
      delete record.checkins[studentId];
      Storage.setTodayRecord(record);
    }
    this._render();
    requestAnimationFrame(() => this._fitGrids());
  },

  _showCelebration() {
    var overlay = document.createElement('div');
    overlay.className = 'celebration-overlay';
    overlay.innerHTML = '<div class="celebration-content">' +
      '<div class="celebration-emoji">\u{1F389}</div>' +
      '<h2>全部完成！</h2>' +
      '<p>太棒了，所有同学都完成了今日任务！</p>' +
      '<button class="btn btn-primary celebration-close">好的</button>' +
    '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.celebration-close').addEventListener('click', function() { overlay.remove(); });
    this._confetti();
  },

  _confetti() {
    var colors = ['#E74C3C', '#F39C12', '#2ECC71', '#3498DB', '#9B59B6', '#EC407A'];
    for (var i = 0; i < 50; i++) {
      var el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = 'left:' + (Math.random() * 100) + '%;background:' +
        colors[Math.floor(Math.random() * colors.length)] +
        ';animation-delay:' + (Math.random() * 2) + 's;animation-duration:' + (2 + Math.random() * 2) + 's';
      document.body.appendChild(el);
      setTimeout(function() { el.remove(); }, 5000);
    }
  }
};

window.CheckinPage = CheckinPage;
