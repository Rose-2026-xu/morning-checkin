/**
 * import.js - Excel/CSV解析（SheetJS CDN + 本地CSV fallback）
 * 返回 { names: [...], genders: [...] }
 */

const ImportFile = {
  // SheetJS CDN
  XLSX_CDN: 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
  _xlsxLoaded: false,

  async _loadXLSX() {
    if (this._xlsxLoaded && window.XLSX) return true;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = this.XLSX_CDN;
      script.onload = () => { this._xlsxLoaded = true; resolve(true); };
      script.onerror = () => { console.warn('SheetJS CDN failed'); resolve(false); };
      document.head.appendChild(script);
    });
  },

  async parse(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'csv' || ext === 'txt') {
      return this._parseCSV(file);
    }

    if (ext === 'xlsx' || ext === 'xls') {
      const loaded = await this._loadXLSX();
      if (loaded && window.XLSX) {
        return this._parseExcel(file);
      }
      throw new Error('Excel解析库加载失败，请将文件另存为CSV格式后重试');
    }

    throw new Error('不支持的文件格式');
  },

  async _parseCSV(file) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const names = [];
    const genders = [];

    for (const line of lines) {
      const parts = line.split(/[,，\t]/);
      const name = parts[0]?.trim();
      if (name && name.length >= 1 && name.length <= 10 && !/^\d+$/.test(name)) {
        // 跳过表头行
        if (name === '姓名' || name === '学生姓名' || name === '名字' || name === '学生') continue;
        names.push(name);
        genders.push((parts[1] || '').trim());
      }
    }

    return { names, genders };
  },

  async _parseExcel(file) {
    const buffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = window.XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    const names = [];
    const genders = [];

    // 检测表头行
    let startRow = 0;
    if (data.length > 0 && Array.isArray(data[0])) {
      const firstCell = String(data[0][0] || '').trim();
      if (firstCell === '姓名' || firstCell === '学生姓名' || firstCell === '名字' || firstCell === '学生') {
        startRow = 1;
      }
    }

    for (let r = startRow; r < data.length; r++) {
      const row = data[r];
      if (!Array.isArray(row) || row.length === 0) continue;
      const name = String(row[0] || '').trim();
      if (name && name.length >= 1 && name.length <= 10 && !/^\d+$/.test(name)) {
        names.push(name);
        genders.push(String(row[1] || '').trim());
      }
    }

    return { names, genders };
  }
};

window.ImportFile = ImportFile;
