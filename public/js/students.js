/**
 * students.js - 学生管理：导入、添加、删除、排序、班级管理
 * 性能优化：事件委托，_bindEvents只在init时调用一次
 */

const Students = {
  _eventsBound: false,

  init() {
    var old = document.getElementById('settings-content');
    if (old) {
      var fresh = old.cloneNode(false);
      fresh.id = 'settings-content';
      old.parentNode.replaceChild(fresh, old);
    }
    this._eventsBound = false;
    this._render();
    this._bindEvents();
  },

  _render() {
    var container = document.getElementById('settings-content');
    if (!container) return;
    var students = Storage.getStudents();
    var classes = Storage.getClasses();
    var currentClassId = Storage.getCurrentClassId();
    var html = '';

    // ===== 班级管理 =====
    html += '<div class="settings-section">';
    html += '<h3>🏫 班级管理</h3>';
    html += '<div class="class-list">';
    for (var ci = 0; ci < classes.length; ci++) {
      var cls = classes[ci];
      var isCurrent = cls.id === currentClassId;
      var clsStudents = Storage.get('students_' + cls.id, []);
      html += '<div class="class-row' + (isCurrent ? ' current-class' : '') + '" data-class-id="' + Utils.escapeHtml(cls.id) + '">';
      html += '<span class="class-name">' + Utils.escapeHtml(cls.name) + '</span>';
      html += '<span class="class-student-count">' + clsStudents.length + '人</span>';
      if (isCurrent) html += '<span class="current-tag">当前</span>';
      if (!isCurrent) html += '<button class="btn btn-secondary btn-sm btn-switch-class" data-class-id="' + Utils.escapeHtml(cls.id) + '">切换</button>';
      html += '<button class="btn-icon btn-rename-class" data-class-id="' + Utils.escapeHtml(cls.id) + '" title="重命名">✎</button>';
      if (classes.length > 1) html += '<button class="btn-icon btn-delete-class" data-class-id="' + Utils.escapeHtml(cls.id) + '" title="删除">✕</button>';
      html += '</div>';
    }
    html += '</div>';
    html += '<button class="btn btn-primary btn-sm" id="btn-add-class" style="margin-top:10px">+ 添加班级</button>';
    html += '</div>';

    // ===== 学生名单 =====
    html += '<div class="settings-section">';
    html += '<h3>👥 当前班级学生名单</h3>';
    html += '<div class="student-count">当前共 ' + students.length + ' 名学生</div>';
    html += '<div class="import-area"><h4>导入名单</h4>';
    html += '<div class="import-buttons">';
    html += '<label class="btn btn-secondary import-file-btn">📂 导入 Excel/CSV<input type="file" id="import-file" accept=".xlsx,.xls,.csv,.txt" hidden/></label>';
    html += '<button class="btn btn-secondary" id="btn-batch-paste">📋 批量粘贴</button>';
    html += '</div>';
    html += '<div class="import-hint">Excel第一列为姓名第二列为性别(男/女)；CSV格式: 姓名,性别</div>';
    html += '</div>';
    html += '<div class="add-student-area"><h4>手动添加</h4>';
    html += '<div class="add-student-row">';
    html += '<input type="text" id="new-student-name" placeholder="姓名" style="flex:2"/>';
    html += '<select id="new-student-gender" style="flex:0 0 70px"><option value="">未知</option><option value="M">男</option><option value="F">女</option></select>';
    html += '<button class="btn btn-primary" id="btn-add-student">添加</button>';
    html += '</div></div>';
    html += '<div class="student-list-area"><div class="student-list-header"><h4>当前名单</h4>';
    html += '<div class="student-list-actions">';
    html += '<button class="btn btn-secondary btn-sm" id="btn-sort-surname">按姓氏排序</button>';
    html += '<button class="btn btn-danger btn-sm" id="btn-clear-all">清空</button>';
    html += '</div></div>';
    html += '<div class="student-list" id="student-list">';
    if (students.length > 0) {
      for (var i = 0; i < students.length; i++) {
        var s = students[i];
        var gl = s.gender === 'M' ? '男' : (s.gender === 'F' ? '女' : '');
        html += '<div class="student-row" data-id="' + Utils.escapeHtml(s.id) + '">';
        html += '<span class="student-index">' + (i + 1) + '</span>';
        html += '<div class="student-avatar-small">' + Avatars.render(s.name, 32, s.gender) + '</div>';
        html += '<span class="student-name">' + Utils.escapeHtml(s.name) + '</span>';
        if (gl) html += '<span class="student-gender">' + gl + '</span>';
        html += '<button class="btn-icon btn-toggle-gender" title="切换性别">↺</button>';
        html += '<button class="btn-icon btn-delete-student" title="删除">✕</button>';
        html += '</div>';
      }
    } else {
      html += '<div class="empty-hint">暂无学生，请导入或手动添加</div>';
    }
    html += '</div></div></div>';
    html += '<div class="settings-section"><h3>👤 账户</h3>';
    html += '<div class="account-info">';
    var uname = Auth.getUser() ? (Auth.getUser().teacherName || Auth.getUser().username) : '未登录';
    html += '<p>当前用户：' + Utils.escapeHtml(uname) + '</p>';
    html += '<button class="btn btn-danger" id="btn-logout">退出登录</button>';
    html += '</div></div>';
    container.innerHTML = html;
  },

  _bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    var self = this;
    var container = document.getElementById('settings-content');
    if (!container) return;

    // 统一事件委托
    container.addEventListener('click', function(e) {
      // 删除学生
      if (e.target.classList.contains('btn-delete-student')) {
        var row = e.target.closest('.student-row');
        var id = row && row.dataset.id;
        if (id) {
          Storage.setStudents(Storage.getStudents().filter(function(s) { return s.id !== id; }));
          self._render();
        }
        return;
      }
      // 切换性别
      if (e.target.classList.contains('btn-toggle-gender')) {
        var row2 = e.target.closest('.student-row');
        var id2 = row2 && row2.dataset.id;
        if (id2) {
          var sts = Storage.getStudents();
          var stu = sts.find(function(s) { return s.id === id2; });
          if (stu) {
            stu.gender = stu.gender === 'M' ? 'F' : (stu.gender === 'F' ? '' : 'M');
            Storage.setStudents(sts);
            self._render();
          }
        }
        return;
      }
      // 按姓氏排序
      if (e.target.closest('#btn-sort-surname')) {
        Storage.setStudents(Utils.sortBySurname(Storage.getStudents()));
        self._render();
        Utils.toast('已按姓氏排序');
        return;
      }
      // 清空学生
      if (e.target.closest('#btn-clear-all')) {
        self._showConfirmDialog('确定要清空所有学生吗？', function() {
          Storage.setStudents([]);
          self._render();
        });
        return;
      }
      // 退出登录
      if (e.target.closest('#btn-logout')) {
        self._showConfirmDialog('确定退出登录吗？', function() { Auth.logout(); });
        return;
      }
      // 批量粘贴
      if (e.target.closest('#btn-batch-paste')) {
        self._showBatchPasteDialog();
        return;
      }
      // 添加学生
      if (e.target.closest('#btn-add-student')) {
        self._addOne();
        return;
      }
      // 添加班级
      if (e.target.closest('#btn-add-class')) {
        self._showInputDialog('添加班级', '请输入班级名称', function(name) {
          if (!name) return;
          Storage.createClass(name);
          ClassBar.refresh();
          self._render();
          Utils.toast('班级已添加');
        });
        return;
      }
      // 切换班级
      var switchBtn = e.target.closest('.btn-switch-class');
      if (switchBtn) {
        Storage.setCurrentClassId(switchBtn.dataset.classId);
        ClassBar.refresh();
        self._render();
        return;
      }
      // 重命名班级
      var renameBtn = e.target.closest('.btn-rename-class');
      if (renameBtn) {
        var rid = renameBtn.dataset.classId;
        var rcls = Storage.getClasses().find(function(c) { return c.id === rid; });
        if (rcls) {
          self._showInputDialog('重命名班级', '请输入新名称', function(newName) {
            if (!newName) return;
            Storage.renameClass(rid, newName);
            ClassBar.refresh();
            self._render();
          }, rcls.name);
        }
        return;
      }
      // 删除班级
      var delBtn = e.target.closest('.btn-delete-class');
      if (delBtn) {
        var did = delBtn.dataset.classId;
        self._showConfirmDialog('删除班级将同时删除该班级的所有学生、打卡记录和任务数据，此操作不可恢复。确定删除吗？', function() {
          if (Storage.deleteClass(did)) {
            ClassBar.refresh();
            self._render();
            Utils.toast('班级已删除');
          } else {
            Utils.toast('至少保留一个班级');
          }
        });
        return;
      }
    });

    // 文件导入（change事件不能用委托）
    container.addEventListener('change', function(e) {
      if (e.target.id === 'import-file') {
        var file = e.target.files[0];
        if (!file) return;
        ImportFile.parse(file).then(function(result) {
          self._importNames(result.names || result, result.genders || []);
          Utils.toast('导入成功');
        }).catch(function(err) {
          Utils.toast('导入失败：' + err.message);
        });
        e.target.value = '';
      }
    });

    // Enter键添加学生
    container.addEventListener('keydown', function(e) {
      if (e.target.id === 'new-student-name' && e.key === 'Enter') {
        self._addOne();
      }
    });
  },

  _addOne() {
    var nameInput = document.getElementById('new-student-name');
    var genderSelect = document.getElementById('new-student-gender');
    var name = nameInput ? nameInput.value.trim() : '';
    if (!name) return;
    var students = Storage.getStudents();
    if (students.some(function(s) { return s.name === name; })) { Utils.toast('该学生已存在'); return; }
    students.push({
      id: Utils.genId('s'), name: name,
      gender: genderSelect ? genderSelect.value : '',
      avatarIndex: Avatars.getAvatarIndex(name),
      order: students.length + 1
    });
    Storage.setStudents(students);
    if (nameInput) nameInput.value = '';
    this._render();
  },

  _importNames(names, genders) {
    var students = Storage.getStudents();
    var existing = {};
    for (var k = 0; k < students.length; k++) existing[students[k].name] = true;
    var added = 0;
    for (var i = 0; i < names.length; i++) {
      var trimmed = (names[i] || '').trim();
      if (!trimmed || existing[trimmed]) continue;
      var g = (genders && genders[i]) ? genders[i].trim() : '';
      if (g === '男' || g === 'M' || g === 'm') g = 'M';
      else if (g === '女' || g === 'F' || g === 'f') g = 'F';
      else g = '';
      students.push({ id: Utils.genId('s'), name: trimmed, gender: g, avatarIndex: Avatars.getAvatarIndex(trimmed), order: students.length + 1 });
      existing[trimmed] = true; added++;
    }
    Storage.setStudents(students);
    this._render();
    Utils.toast('成功导入 ' + added + ' 名学生');
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

  _showInputDialog(title, placeholder, onConfirm, defaultValue) {
    var overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = '<div class="dialog"><h3>' + Utils.escapeHtml(title) + '</h3><input type="text" id="dialog-input" placeholder="' + Utils.escapeHtml(placeholder) + '" value="' + Utils.escapeHtml(defaultValue || '') + '" style="width:100%;margin:12px 0;padding:10px 14px;border:1.5px solid var(--color-border);border-radius:8px;font-size:15px"/><div class="dialog-actions"><button class="btn btn-primary" id="btn-input-ok">确定</button><button class="btn btn-secondary dialog-close">取消</button></div></div>';
    document.body.appendChild(overlay);
    var input = overlay.querySelector('#dialog-input');
    if (input) { input.focus(); input.select(); }
    overlay.querySelector('#btn-input-ok').addEventListener('click', function() {
      var val = input ? input.value.trim() : '';
      overlay.remove();
      if (val) onConfirm(val);
    });
    if (input) input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var val = input.value.trim();
        overlay.remove();
        if (val) onConfirm(val);
      }
    });
    overlay.querySelector('.dialog-close').addEventListener('click', function() { overlay.remove(); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  },

  _showBatchPasteDialog() {
    var self = this;
    var overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = '<div class="dialog"><h3>批量粘贴</h3><p class="dialog-hint">每行一个姓名，或: 姓名,性别（如: 张三,男）</p><textarea id="batch-paste-input" rows="10" placeholder="张三,男\n李四,女\n王五"></textarea><div class="dialog-actions"><button class="btn btn-primary" id="btn-do-paste">导入</button><button class="btn btn-secondary dialog-close">取消</button></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#btn-do-paste').addEventListener('click', function() {
      var text = overlay.querySelector('#batch-paste-input').value || '';
      var lines = text.split(/[\n]+/).filter(function(l) { return l.trim(); });
      var names = [], genders = [];
      for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].split(/[,，\s]+/);
        names.push(parts[0]); genders.push(parts[1] || '');
      }
      self._importNames(names, genders);
      overlay.remove();
    });
    overlay.querySelector('.dialog-close').addEventListener('click', function() { overlay.remove(); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  }
};

window.Students = Students;
