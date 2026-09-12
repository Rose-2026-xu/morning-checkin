/**
 * storage.js - localStorage 抽象层 + 云端同步
 * 所有数据操作经此模块，离线写localStorage，在线时自动同步
 */

const Storage = {
  // Key 前缀
  PREFIX: 'mc_',

  // 服务器地址（可配置）
  serverUrl: '',

  // 同步状态
  _syncTimer: null,
  _isOnline: false,
  _isSyncing: false,

  // ===== 基础读写 =====

  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      console.warn(`Storage.get error for key "${key}":`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      this._enqueueSync(key, value);
    } catch (e) {
      console.error(`Storage.set error for key "${key}":`, e);
    }
  },

  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  // ===== 业务数据快捷方法 =====

  // 用户
  getUser() { return this.get('user', null); },
  setUser(user) { this.set('user', user); },
  clearUser() { this.remove('user'); },

  // ===== 班级管理 =====

  getClasses() { return this.get('classes', []); },
  setClasses(classes) { this.set('classes', classes); },

  getCurrentClassId() { return this.get('currentClass', null); },
  setCurrentClassId(id) { this.set('currentClass', id); },

  getCurrentClass() {
    var id = this.getCurrentClassId();
    if (!id) return null;
    return this.getClasses().find(function(c) { return c.id === id; }) || null;
  },

  ensureCurrentClass() {
    var id = this.getCurrentClassId();
    var classes = this.getClasses();
    if (!id || !classes.find(function(c) { return c.id === id; })) {
      id = classes.length > 0 ? classes[0].id : null;
      if (id) this.setCurrentClassId(id);
    }
    return id;
  },

  createClass(name) {
    var classes = this.getClasses();
    var id = Utils.genId('cls');
    var cls = { id: id, name: name, createdAt: new Date().toISOString() };
    classes.push(cls);
    this.setClasses(classes);
    this.set('students_' + id, []);
    this.set('records_' + id, {});
    return cls;
  },

  renameClass(id, newName) {
    var classes = this.getClasses();
    var cls = classes.find(function(c) { return c.id === id; });
    if (cls) { cls.name = newName; this.setClasses(classes); }
  },

  deleteClass(id) {
    var classes = this.getClasses();
    if (classes.length <= 1) return false;
    this.setClasses(classes.filter(function(c) { return c.id !== id; }));
    this.remove('students_' + id);
    this.remove('records_' + id);
    this.remove('todayTask_' + id);
    if (this.getCurrentClassId() === id) {
      this.setCurrentClassId(this.getClasses()[0].id);
    }
    return true;
  },

  // ===== 一次性迁移：平铺数据 → 班级分班 =====

  migrateToClasses() {
    if (this.get('classMigrated', false)) return;

    var defaultClass = this.createClass('默认班级');
    var oldStudents = this.get('students', null);
    var oldRecords = this.get('records', null);
    var oldTask = this.get('todayTask', null);

    if (oldStudents && oldStudents.length > 0) {
      this.set('students_' + defaultClass.id, oldStudents);
    }
    if (oldRecords && Object.keys(oldRecords).length > 0) {
      this.set('records_' + defaultClass.id, oldRecords);
    }
    if (oldTask) {
      this.set('todayTask_' + defaultClass.id, oldTask);
    }

    this.setCurrentClassId(defaultClass.id);
    this.set('classMigrated', true);
  },

  // ===== 班级作用域数据（自动分班） =====

  // 学生列表
  getStudents() {
    var cid = this.getCurrentClassId();
    return cid ? this.get('students_' + cid, []) : this.get('students', []);
  },
  setStudents(students) {
    var cid = this.getCurrentClassId();
    if (cid) { this.set('students_' + cid, students); }
    else { this.set('students', students); }
  },

  // 任务模板
  getTemplates() { return this.get('templates', []); },
  setTemplates(templates) { this.set('templates', templates); },

  // 今日任务
  getTodayTask() {
    var cid = this.getCurrentClassId();
    return cid ? this.get('todayTask_' + cid, null) : this.get('todayTask', null);
  },
  setTodayTask(task) {
    var cid = this.getCurrentClassId();
    if (cid) { this.set('todayTask_' + cid, task); }
    else { this.set('todayTask', task); }
  },

  // 打卡记录 { "2026-09-11": { checkins: { studentId: timestamp }, taskId: "..." } }
  getRecords() {
    var cid = this.getCurrentClassId();
    return cid ? this.get('records_' + cid, {}) : this.get('records', {});
  },
  setRecords(records) {
    var cid = this.getCurrentClassId();
    if (cid) { this.set('records_' + cid, records); }
    else { this.set('records', records); }
  },

  // 今日打卡
  getTodayRecord() {
    var date = this.getTodayKey();
    var records = this.getRecords();
    return records[date] || null;
  },

  setTodayRecord(record) {
    var date = this.getTodayKey();
    var records = this.getRecords();
    records[date] = record;
    this.setRecords(records);
  },

  getTodayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  // 服务器配置
  getServerUrl() { return this.get('serverUrl', ''); },
  setServerUrl(url) {
    this.serverUrl = url.replace(/\/+$/, '');
    this.set('serverUrl', url);
  },

  // ===== 同步队列 =====

  _getSyncQueue() { return this.get('syncQueue', []); },

  _enqueueSync(key, value) {
    if (!this.serverUrl) return; // 无服务器则不同步
    if (key === 'syncQueue') return; // 避免递归
    const queue = this._getSyncQueue();
    // 去重：同key只保留最新
    const idx = queue.findIndex(item => item.key === key);
    const entry = { key, value, timestamp: Date.now() };
    if (idx >= 0) {
      queue[idx] = entry;
    } else {
      queue.push(entry);
    }
    // 直接写localStorage，不走set避免递归
    try {
      localStorage.setItem(this.PREFIX + 'syncQueue', JSON.stringify(queue));
    } catch (e) { /* ignore */ }
  },

  // ===== 同步逻辑 =====

  initSync(serverUrl) {
    // 防止重复初始化
    if (this._syncInitialized) {
      if (serverUrl) this.serverUrl = serverUrl.replace(/\/+$/, '');
      return;
    }
    this._syncInitialized = true;

    if (serverUrl) this.serverUrl = serverUrl.replace(/\/+$/, '');
    else this.serverUrl = this.getServerUrl();

    if (!this.serverUrl) return;

    // 检测在线状态
    this._checkOnline();
    window.addEventListener('online', () => this._checkOnline());
    window.addEventListener('offline', () => this._checkOnline());

    // 定时同步（30秒）
    this._syncTimer = setInterval(() => this.trySync(), 30000);
    // 首次同步
    setTimeout(() => this.trySync(), 3000);
  },

  _checkOnline() {
    this._isOnline = navigator.onLine;
  },

  async trySync() {
    if (!this._isOnline || this._isSyncing || !this.serverUrl) return;

    const user = this.getUser();
    if (!user || !user.token) return;

    const queue = this._getSyncQueue();
    if (queue.length === 0) return;

    this._isSyncing = true;
    try {
      const resp = await fetch(`${this.serverUrl}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ changes: queue })
      });

      if (resp.ok) {
        const data = await resp.json();
        // 合并服务器返回的最新数据
        if (data.latest) {
          this._mergeServerData(data.latest);
        }
        // 清空同步队列（直接写localStorage避免递归）
        try {
          localStorage.setItem(this.PREFIX + 'syncQueue', JSON.stringify([]));
        } catch (e) { /* ignore */ }
        this.set('lastSync', new Date().toISOString());
      }
    } catch (e) {
      console.warn('Sync failed:', e);
    } finally {
      this._isSyncing = false;
    }
  },

  _mergeServerData(serverData) {
    // 服务器返回格式: { students: { _updatedAt, value: [...] }, ... }
    // 本地存储格式: { students: [...], ... }
    for (const [key, wrapper] of Object.entries(serverData)) {
      const serverValue = wrapper.value !== undefined ? wrapper.value : wrapper;
      const serverTime = wrapper._updatedAt;
      const localVal = this.get(key);
      const localTime = localVal?._updatedAt;

      // 服务器数据优先（有更新的时间戳）
      if (!localVal || (serverTime && (!localTime || serverTime > localTime))) {
        this.set(key, serverValue);
        // 触发UI更新
        window.dispatchEvent(new CustomEvent('storage-updated', { detail: { key } }));
      }
    }
  },

  // ===== 从服务器拉取全量数据（登录后） =====

  async pullFromServer() {
    const user = this.getUser();
    if (!user || !user.token || !this.serverUrl) return;

    try {
      const resp = await fetch(`${this.serverUrl}/api/sync`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.latest) {
          this._mergeServerData(data.latest);
        }
      }
    } catch (e) {
      console.warn('Pull failed:', e);
    }
  },

  destroy() {
    if (this._syncTimer) clearInterval(this._syncTimer);
  }
};

window.Storage = Storage;
