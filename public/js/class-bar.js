/**
 * class-bar.js - 班级选择器顶栏
 */

const ClassBar = {
  init() {
    this._render();
    this._bindEvents();
  },

  refresh() {
    this._render();
  },

  _render() {
    var bar = document.getElementById('class-bar');
    if (!bar) return;

    var classes = Storage.getClasses();
    var currentId = Storage.getCurrentClassId();

    if (classes.length === 0) {
      bar.style.display = 'none';
      return;
    }

    bar.style.display = '';
    bar.classList.toggle('single-class', classes.length <= 1);

    var selector = document.getElementById('class-selector');
    if (selector) {
      var html = '';
      for (var i = 0; i < classes.length; i++) {
        var c = classes[i];
        html += '<option value="' + Utils.escapeHtml(c.id) + '"' + (c.id === currentId ? ' selected' : '') + '>' + Utils.escapeHtml(c.name) + '</option>';
      }
      selector.innerHTML = html;
    }
  },

  _bindEvents() {
    var self = this;
    var selector = document.getElementById('class-selector');
    if (selector) {
      selector.addEventListener('change', function(e) {
        Storage.setCurrentClassId(e.target.value);
        window.dispatchEvent(new CustomEvent('class-changed'));
      });
    }
  }
};

window.ClassBar = ClassBar;
