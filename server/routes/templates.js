/**
 * routes/templates.js - 模板CRUD路由
 */
const express = require('express');
const db = require('../db');

const router = express.Router();

// 获取模板列表
router.get('/', (req, res) => {
  try {
    const templates = db.queryAll('SELECT * FROM templates WHERE user_id = ? ORDER BY updated_at DESC', [req.userId]);
    res.json(templates.map(t => ({
      id: t.id,
      name: t.name,
      data: JSON.parse(t.data),
      updatedAt: t.updated_at
    })));
  } catch (err) {
    res.status(500).json({ message: '获取模板失败' });
  }
});

// 创建/更新模板
router.post('/', (req, res) => {
  const { id, name, data } = req.body;
  if (!name || !data) {
    return res.status(400).json({ message: '缺少模板名称或数据' });
  }

  try {
    const now = new Date().toISOString();
    const templateId = id || ('tpl_' + Date.now().toString(36));

    if (id) {
      const existing = db.queryOne('SELECT * FROM templates WHERE id = ? AND user_id = ?', [id, req.userId]);
      if (existing) {
        db.run('UPDATE templates SET name = ?, data = ?, updated_at = ? WHERE id = ? AND user_id = ?',
          [name, JSON.stringify(data), now, id, req.userId]);
      } else {
        db.run('INSERT INTO templates (id, user_id, name, data, updated_at) VALUES (?, ?, ?, ?, ?)',
          [templateId, req.userId, name, JSON.stringify(data), now]);
      }
    } else {
      db.run('INSERT INTO templates (id, user_id, name, data, updated_at) VALUES (?, ?, ?, ?, ?)',
        [templateId, req.userId, name, JSON.stringify(data), now]);
    }

    db.saveToDisk();
    res.json({ success: true, id: templateId });
  } catch (err) {
    res.status(500).json({ message: '保存模板失败: ' + err.message });
  }
});

// 删除模板
router.delete('/:id', (req, res) => {
  try {
    db.run('DELETE FROM templates WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    db.saveToDisk();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: '删除模板失败' });
  }
});

module.exports = router;
