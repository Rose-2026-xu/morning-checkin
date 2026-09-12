/**
 * auth.js - 登录/注册/Token管理
 */

const Auth = {
  // 当前用户
  _user: null,

  init() {
    this._user = Storage.getUser();
  },

  isLoggedIn() {
    return !!this._user && !!this._user.token;
  },

  getUser() {
    return this._user;
  },

  // ===== 离线模式注册（仅localStorage） =====

  registerOffline(username, password, teacherName) {
    const users = Storage.get('offline_users', {});
    if (users[username]) {
      return { error: '用户名已存在' };
    }
    const user = {
      id: Utils.genId('u'),
      username,
      teacherName,
      token: Utils.genId('tk'),
      createdAt: new Date().toISOString()
    };
    // 简易密码存储（离线模式，安全性要求不高）
    users[username] = { ...user, password: btoa(password) };
    Storage.set('offline_users', users);

    this._user = user;
    Storage.setUser(user);
    return { success: true, user };
  },

  loginOffline(username, password) {
    const users = Storage.get('offline_users', {});
    const record = users[username];
    if (!record) return { error: '用户名不存在' };
    if (atob(record.password) !== password) return { error: '密码错误' };

    const user = { id: record.id, username: record.username, teacherName: record.teacherName, token: record.token };
    this._user = user;
    Storage.setUser(user);
    return { success: true, user };
  },

  // ===== 在线模式（服务器API） =====

  async registerOnline(username, password, teacherName) {
    const serverUrl = Storage.getServerUrl();
    if (!serverUrl) return { error: '未配置服务器地址' };

    try {
      const resp = await fetch(`${serverUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, teacherName })
      });
      const data = await resp.json();
      if (!resp.ok) return { error: data.message || '注册失败' };

      this._user = data.user;
      Storage.setUser(data.user);
      return { success: true, user: data.user };
    } catch (e) {
      return { error: '网络错误，请检查服务器连接' };
    }
  },

  async loginOnline(username, password) {
    const serverUrl = Storage.getServerUrl();
    if (!serverUrl) return { error: '未配置服务器地址' };

    try {
      const resp = await fetch(`${serverUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await resp.json();
      if (!resp.ok) return { error: data.message || '登录失败' };

      this._user = data.user;
      Storage.setUser(data.user);
      // 登录后拉取服务器数据
      await Storage.pullFromServer();
      return { success: true, user: data.user };
    } catch (e) {
      return { error: '网络错误，请检查服务器连接' };
    }
  },

  // ===== 通用登录/注册（自动判断在线/离线） =====

  async register(username, password, teacherName) {
    if (Storage.getServerUrl() && navigator.onLine) {
      const result = await this.registerOnline(username, password, teacherName);
      if (result.success) return result;
      // 在线失败则fallback到离线
    }
    return this.registerOffline(username, password, teacherName);
  },

  async login(username, password) {
    if (Storage.getServerUrl() && navigator.onLine) {
      const result = await this.loginOnline(username, password);
      if (result.success) return result;
      // 在线失败则fallback到离线
    }
    return this.loginOffline(username, password);
  },

  logout() {
    this._user = null;
    Storage.clearUser();
    window.location.hash = '#/login';
  }
};

window.Auth = Auth;
