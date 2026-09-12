/**
 * app.js - 路由、页面切换、全局状态
 */

const App = {
  currentPage: null,

  init() {
    // 初始化认证（先于同步，确保token可用）
    Auth.init();
    // 班级数据迁移（一次性，将平铺数据移入默认班级）
    Storage.migrateToClasses();
    Storage.ensureCurrentClass();
    Storage.autoDetectServer();
    Storage.initSync();

    // 路由监听
    window.addEventListener('hashchange', () => this.route());
    ClassBar.init();
    this.route();
  },

  route() {
    const hash = window.location.hash || '#/task';
    const [path, query] = hash.substring(1).split('?');

    // 需要登录的页面
    const authPages = ['/task', '/checkin', '/settings', '/history'];
    if (authPages.includes(path) && !Auth.isLoggedIn()) {
      window.location.hash = '#/login';
      return;
    }

    // 页面映射
    const pages = {
      '/login': () => this.showPage('login'),
      '/register': () => this.showPage('register'),
      '/task': () => this.showPage('task'),
      '/checkin': () => this.showPage('checkin'),
      '/settings': () => this.showPage('settings'),
      '/history': () => this.showPage('history')
    };

    const handler = pages[path];
    if (handler) {
      handler();
    } else {
      // 默认跳转
      window.location.hash = Auth.isLoggedIn() ? '#/task' : '#/login';
    }
  },

  showPage(pageName) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
      p.style.display = 'none';
    });

    // 显示目标页面
    const page = document.getElementById(`page-${pageName}`);
    if (page) {
      page.style.display = '';
      page.classList.add('active');
    }

    this.currentPage = pageName;

    // 触发页面初始化
    window.dispatchEvent(new CustomEvent('page-show', { detail: { page: pageName } }));

    // 更新导航高亮
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageName);
    });
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.App = App;
