/**
 * utils.js - 姓氏排序、日期格式化等工具
 */

const Utils = {
  // ===== 姓氏排序（按拼音） =====

  // 常见复姓
  COMPOUND_SURNAMES: [
    '欧阳','上官','司马','诸葛','尉迟','公孙','令狐','宇文','长孙','慕容',
    '东方','南宫','西门','皇甫','夏侯','万俟','呼延','端木','拓跋','完颜',
    '赫连','澹台','公冶','宗政','濮阳','淳于','单于','太叔','申屠','公羊',
    '乐正','谷梁','左丘','百里','轩辕'
  ],

  // 获取姓氏
  getSurname(name) {
    if (!name) return '';
    // 先检查复姓
    if (name.length >= 2 && this.COMPOUND_SURNAMES.includes(name.substring(0, 2))) {
      return name.substring(0, 2);
    }
    return name.charAt(0);
  },

  // 按姓氏拼音排序
  sortBySurname(students) {
    return [...students].sort((a, b) => {
      const sa = this.getSurname(a.name);
      const sb = this.getSurname(b.name);
      // 先按姓氏拼音排
      const cmp = sa.localeCompare(sb, 'zh-CN');
      if (cmp !== 0) return cmp;
      // 同姓按名字拼音排
      return a.name.localeCompare(b.name, 'zh-CN');
    });
  },

  // ===== 日期格式化 =====

  formatDate(date) {
    if (typeof date === 'string') date = new Date(date);
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${y}年${m}月${d}日`;
  },

  formatDateKey(date) {
    if (typeof date === 'string') return date;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  formatTime(date) {
    if (typeof date === 'string') date = new Date(date);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  },

  // ===== HTML转义（防XSS） =====

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // ===== ID生成 =====

  genId(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  },

  // ===== 姓名hash（用于头像分配） =====

  nameHash(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash; // 转为32位整数
    }
    return Math.abs(hash);
  },

  // ===== 简易toast提示 =====

  toast(message, duration = 2000) {
    const existing = document.getElementById('mc-toast');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'mc-toast';
    el.className = 'mc-toast';
    el.textContent = message;
    document.body.appendChild(el);

    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }
};

window.Utils = Utils;
