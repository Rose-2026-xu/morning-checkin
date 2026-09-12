/**
 * task-page.js - 任务页：编辑任务、时间
 * 性能优化：事件委托，_bindEvents只在init时调用一次
 */

const TaskPage = {
  _taskData: null,
  _eventsBound: false,

  init() {
    this._taskData = Storage.getTodayTask() || this._createDefaultTask();
    var old = document.getElementById('task-content');
    if (old) {
      var fresh = old.cloneNode(false);
      fresh.id = 'task-content';
      old.parentNode.replaceChild(fresh, old);
    }
    this._eventsBound = false;
    this._render();
    this._bindEvents();
  },

  _createDefaultTask() {
    var today = new Date();
    return {
      date: Utils.formatDateKey(today),
      dateDisplay: Utils.formatDate(today),
      title: '今日早读计划',
      subtitle: '',
      tasks: [
        { id: Utils.genId('t'), startTime: '07:30', endTime: '07:45', content: '' },
        { id: Utils.genId('t'), startTime: '07:45', endTime: '08:00', content: '' }
      ],
      message: '',
      bottomNote: '小组组长检查背诵情况并汇总；\n完成任务的同学点击开始打卡'
    };
  },

  _render() {
    var container = document.getElementById('task-content');
    if (!container) return;

    var d = this._taskData;
    var html = '';
    html += '<div class="task-left">';
    html += '<h1 class="task-title" contenteditable="true" data-field="title">' + Utils.escapeHtml(d.title) + '</h1>';
    html += '<div class="task-date">';
    html += '<span>时间：</span>';
    html += '<input type="date" id="task-date-input" value="' + d.date + '" />';
    html += '</div>';
    html += '<div class="task-list" id="task-list">';
    for (var i = 0; i < d.tasks.length; i++) {
      html += this._renderTaskItem(d.tasks[i], i);
    }
    html += '</div>';
    html += '<button class="btn btn-add-task" id="btn-add-task">+ 添加时间段</button>';
    html += '<div class="task-bottom-note">';
    html += '<textarea id="task-bottom-note" rows="2" placeholder="底部提示文字">' + Utils.escapeHtml(d.bottomNote || '') + '</textarea>';
    html += '</div>';
    html += '<div class="task-actions">';
    html += '<button class="btn btn-primary btn-start" id="btn-start-checkin">开始打卡</button>';
    html += '</div>';
    html += '</div>';
    html += '<div class="task-right">';
    html += '<div class="task-decor-img">';
    html += '<svg viewBox="0 0 200 200" width="200" height="200">';
    html += '<defs><linearGradient id="morningGrad" x1="0%" y1="0%" x2="100%" y2="100%">';
    html += '<stop offset="0%" style="stop-color:#F39C12"/>';
    html += '<stop offset="100%" style="stop-color:#E74C3C"/>';
    html += '</linearGradient></defs>';
    html += '<circle cx="100" cy="80" r="35" fill="url(#morningGrad)"/>';
    html += '<path d="M30,180 Q100,100 170,180" fill="#FDEBD0" opacity="0.6"/>';
    html += '<path d="M50,170 Q100,110 150,170" fill="#F5CBA7" opacity="0.4"/>';
    html += '<path d="M10,190 Q100,130 190,190" fill="#FDEBD0" opacity="0.3"/>';
    html += '</svg></div>';
    html += '<div class="task-message">';
    html += '<label>📝 今日寄语</label>';
    html += '<textarea id="task-message" rows="3" placeholder="输入励志寄语...">' + Utils.escapeHtml(d.message || '') + '</textarea>';
    html += '</div></div>';
    container.innerHTML = html;
  },

  _renderTaskItem(task, index) {
    return '<div class="task-item" data-task-id="' + task.id + '">' +
      '<div class="task-time-row">' +
      '<input type="time" class="task-start-time" value="' + task.startTime + '" />' +
      '<span>—</span>' +
      '<input type="time" class="task-end-time" value="' + task.endTime + '" />' +
      '<button class="btn-icon btn-remove-task" title="删除此任务">✕</button>' +
      '</div>' +
      '<div class="task-content-row">' +
      '<textarea class="task-content-input" rows="2" placeholder="输入任务内容...">' + Utils.escapeHtml(task.content || '') + '</textarea>' +
      '</div></div>';
  },

  _bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    var self = this;
    var container = document.getElementById('task-content');
    if (!container) return;

    // 统一click事件委托
    container.addEventListener('click', function(e) {
      // 删除任务
      if (e.target.classList.contains('btn-remove-task')) {
        var item = e.target.closest('.task-item');
        var taskId = item && item.dataset.taskId;
        if (self._taskData.tasks.length <= 1) {
          Utils.toast('至少保留一个时间段');
          return;
        }
        self._taskData.tasks = self._taskData.tasks.filter(function(t) { return t.id !== taskId; });
        self._render();
        self._save();
        return;
      }
      // 添加时间段
      if (e.target.closest('#btn-add-task')) {
        var last = self._taskData.tasks[self._taskData.tasks.length - 1];
        var newTask = {
          id: Utils.genId('t'),
          startTime: last ? last.endTime : '08:00',
          endTime: last ? self._addMinutes(last.endTime, 15) : '08:15',
          content: ''
        };
        self._taskData.tasks.push(newTask);
        self._render();
        self._save();
        return;
      }
      // 开始打卡
      if (e.target.closest('#btn-start-checkin')) {
        self._save();
        window.location.hash = '#/checkin';
        return;
      }
    });

    // input/change事件委托
    container.addEventListener('input', function(e) {
      // 任务内容变化
      var item = e.target.closest('.task-item');
      if (item) {
        var taskId = item.dataset.taskId;
        var task = self._taskData.tasks.find(function(t) { return t.id === taskId; });
        if (task) {
          if (e.target.classList.contains('task-start-time')) task.startTime = e.target.value;
          if (e.target.classList.contains('task-end-time')) task.endTime = e.target.value;
          if (e.target.classList.contains('task-content-input')) task.content = e.target.value;
          self._save();
        }
        return;
      }
      // 寄语
      if (e.target.id === 'task-message') {
        self._taskData.message = e.target.value;
        self._save();
        return;
      }
      // 底部提示
      if (e.target.id === 'task-bottom-note') {
        self._taskData.bottomNote = e.target.value;
        self._save();
        return;
      }
    });

    // 日期变化
    container.addEventListener('change', function(e) {
      if (e.target.id === 'task-date-input') {
        self._taskData.date = e.target.value;
        self._taskData.dateDisplay = Utils.formatDate(new Date(e.target.value));
        self._save();
      }
    });

    // 标题编辑（blur）
    container.addEventListener('blur', function(e) {
      if (e.target.dataset && e.target.dataset.field === 'title') {
        self._taskData.title = e.target.textContent;
        self._save();
      }
    }, true); // capture阶段以捕获contenteditable的blur
  },

  _addMinutes(time, mins) {
    var parts = time.split(':');
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var total = h * 60 + m + mins;
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
  },

  _save() {
    Storage.setTodayTask(this._taskData);
  }
};

window.TaskPage = TaskPage;
