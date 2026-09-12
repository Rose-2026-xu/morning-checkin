/**
 * avatars.js - 可爱卡通头像生成（按名字哈希+性别，固定不变）
 */

const Avatars = {
  SKINS: ['#ffe4cc', '#ffd8b4', '#f8c99f', '#ffe0c6'],
  OUTFITS: [
    ['#ff8fab', '#ffe4ee'], ['#5ab9f5', '#e2f3ff'], ['#ffc247', '#fff4da'],
    ['#79d95c', '#e9fae3'], ['#b98cf0', '#f1e9ff'], ['#ff9f5a', '#ffecdd'],
    ['#4ecdc4', '#ddf7f5'], ['#ff7b7b', '#ffe5e5'], ['#7c8cf8', '#e8ecff']
  ],
  HAIRS: ['#2f2620', '#4a3324', '#6b4a2f', '#8a5f3a', '#3a3a46', '#9c7350'],

  _hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  },

  _makeRng(seed) {
    let s = seed || 1;
    return function next() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  /**
   * 生成头像SVG
   * @param {string} name - 姓名
   * @param {number} size - 固定尺寸（可选，不传则由CSS控制）
   * @param {string} gender - 'M'男 / 'F'女 / 不传则随机
   */
  render(name, size, gender) {
    const seed = this._hashStr(name) || 1;
    const next = this._makeRng(seed);
    const rnd = (n) => Math.floor(next() * n);

    const skin = this.SKINS[rnd(this.SKINS.length)];
    const hair = this.HAIRS[rnd(this.HAIRS.length)];
    const fit = this.OUTFITS[rnd(this.OUTFITS.length)];
    const cloth = fit[0], bg = fit[1];
    const eyeRy = 5 + next() * 1.2;

    // 根据性别选择发型范围
    // 男: 0短发 5卷发 6呆毛 8鸭舌帽
    // 女: 1齐刘海 2双马尾 3丸子头 4中分 7蝴蝶结
    var style;
    var maleStyles = [0, 0, 5, 6, 8];
    var femaleStyles = [1, 2, 3, 4, 7];
    if (gender === 'M') {
      style = maleStyles[rnd(maleStyles.length)];
    } else if (gender === 'F') {
      style = femaleStyles[rnd(femaleStyles.length)];
    } else {
      style = rnd(9);
    }

    const glasses = rnd(6) === 0;
    const openMouth = rnd(3) === 0;

    const sizeAttr = size ? ' width="' + size + '" height="' + size + '"' : '';
    var s = '<svg viewBox="0 0 100 100"' + sizeAttr + ' xmlns="http://www.w3.org/2000/svg">';

    s += '<circle cx="50" cy="50" r="46" fill="' + bg + '"/>';
    s += '<path d="M13 100 C13 80 28 70 50 70 C72 70 87 80 87 100 Z" fill="' + cloth + '"/>';
    s += '<path d="M39 72 L50 85 L61 72" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>';
    s += '<rect x="44" y="56" width="12" height="17" rx="6" fill="' + skin + '"/>';
    s += '<circle cx="25.5" cy="48" r="5" fill="' + skin + '"/>';
    s += '<circle cx="74.5" cy="48" r="5" fill="' + skin + '"/>';
    s += '<ellipse cx="50" cy="44" rx="25" ry="24" fill="' + skin + '"/>';

    var boyHair = 'M25 48 C22 26 36 17 50 17 C64 17 78 26 75 48 C71 32 60 29 50 31 C40 29 29 32 25 48 Z';
    var bobHair = 'M24 58 C20 28 34 17 50 17 C66 17 80 28 76 58 C73 38 68 35 50 35 C32 35 27 38 24 58 Z';

    if (style === 8) {
      s += '<path d="M23 42 C23 18 77 18 77 42 Z" fill="' + cloth + '"/>';
      s += '<rect x="15" y="39" width="70" height="7" rx="3.5" fill="' + cloth + '"/>';
      s += '<path d="M50 22 l2.4 5.4 h5.8 l-4.7 3.9 1.8 5.8-5.3-3.7-5.3 3.7 1.8-5.8-4.7-3.9 h5.8 z" fill="#fff8e0"/>';
    } else if (style === 1) {
      s += '<path d="' + bobHair + '" fill="' + hair + '"/>';
      s += '<path d="M30 34 C36 29 64 29 70 34 C60 31 40 31 30 34 Z" fill="rgba(255,255,255,.16)"/>';
    } else if (style === 2) {
      s += '<path d="' + bobHair + '" fill="' + hair + '"/>';
      s += '<ellipse cx="18" cy="66" rx="8.5" ry="13" fill="' + hair + '"/>';
      s += '<ellipse cx="82" cy="66" rx="8.5" ry="13" fill="' + hair + '"/>';
      s += '<circle cx="23" cy="52" r="3.4" fill="#ff7b9c"/>';
      s += '<circle cx="77" cy="52" r="3.4" fill="#ff7b9c"/>';
    } else if (style === 3) {
      s += '<path d="' + boyHair + '" fill="' + hair + '"/>';
      s += '<circle cx="50" cy="13" r="9.5" fill="' + hair + '"/>';
      s += '<ellipse cx="50" cy="22" rx="6.5" ry="2.6" fill="#ff7b9c"/>';
    } else if (style === 4) {
      s += '<path d="' + bobHair + '" fill="' + hair + '"/>';
      s += '<path d="M50 17 L45 35 L55 35 Z" fill="' + skin + '"/>';
    } else if (style === 5) {
      s += '<path d="' + boyHair + '" fill="' + hair + '"/>';
      s += '<circle cx="31" cy="26" r="8" fill="' + hair + '"/>';
      s += '<circle cx="50" cy="19" r="9" fill="' + hair + '"/>';
      s += '<circle cx="69" cy="26" r="8" fill="' + hair + '"/>';
    } else if (style === 6) {
      s += '<path d="' + boyHair + '" fill="' + hair + '"/>';
      s += '<path d="M52 21 C54 6 64 3 69 9" stroke="' + hair + '" stroke-width="3.8" fill="none" stroke-linecap="round"/>';
    } else if (style === 7) {
      s += '<path d="' + bobHair + '" fill="' + hair + '"/>';
      s += '<path d="M70 18 l10 -6 v14 z" fill="#ff7b9c"/>';
      s += '<path d="M70 18 l-10 -6 v14 z" fill="#ff8fab"/>';
      s += '<circle cx="70" cy="18" r="3.2" fill="#ff5c86"/>';
    } else {
      s += '<path d="' + boyHair + '" fill="' + hair + '"/>';
    }

    s += '<path d="M35 41 q5.5 -3.6 11 -1" stroke="' + hair + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    s += '<path d="M54 40 q5.5 -2.6 11 1" stroke="' + hair + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    s += '<ellipse cx="40" cy="50" rx="4.3" ry="' + eyeRy.toFixed(1) + '" fill="#3b2418"/>';
    s += '<ellipse cx="60" cy="50" rx="4.3" ry="' + eyeRy.toFixed(1) + '" fill="#3b2418"/>';
    s += '<circle cx="38.5" cy="48" r="1.8" fill="#fff"/>';
    s += '<circle cx="58.5" cy="48" r="1.8" fill="#fff"/>';
    s += '<circle cx="41.6" cy="52.4" r="0.9" fill="#fff" opacity=".8"/>';
    s += '<circle cx="61.6" cy="52.4" r="0.9" fill="#fff" opacity=".8"/>';
    s += '<ellipse cx="31.5" cy="55" rx="5" ry="3.2" fill="#ff9d9d" opacity=".7"/>';
    s += '<ellipse cx="68.5" cy="55" rx="5" ry="3.2" fill="#ff9d9d" opacity=".7"/>';
    s += '<ellipse cx="50" cy="54" rx="1.5" ry="1.1" fill="rgba(120,70,50,.3)"/>';

    if (openMouth) {
      s += '<path d="M44 57.5 q6 8 12 0 z" fill="#c9584c"/>';
      s += '<path d="M47.5 62 q2.5 2.5 5 0 z" fill="#ff9d9d"/>';
    } else {
      s += '<path d="M44.5 57.5 q5.5 5.5 11 0" stroke="#c9584c" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    }

    if (glasses) {
      s += '<g stroke="#4a4a55" stroke-width="1.8" fill="rgba(255,255,255,.25)">';
      s += '<circle cx="40" cy="50" r="8.5"/>';
      s += '<circle cx="60" cy="50" r="8.5"/>';
      s += '<path d="M48.5 50 h3" fill="none"/>';
      s += '<path d="M31.5 48 L25.5 46" fill="none"/>';
      s += '<path d="M68.5 48 L74.5 46" fill="none"/>';
      s += '</g>';
    }

    s += '</svg>';
    return s;
  },

  getAvatarIndex(name) {
    return this._hashStr(name) % 36;
  },

  renderCard(student, size, extraClass) {
    var svg = this.render(student.name, size, student.gender);
    var safeName = Utils.escapeHtml(student.name);
    var safeId = Utils.escapeHtml(student.id);
    return '<div class="avatar-card ' + (extraClass || '') + '" data-student-id="' + safeId + '" data-name="' + safeName + '">' +
      '<div class="avatar-img">' + svg + '</div>' +
      '<div class="avatar-name">' + safeName + '</div>' +
    '</div>';
  }
};

window.Avatars = Avatars;
