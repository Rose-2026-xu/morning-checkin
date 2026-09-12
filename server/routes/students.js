/**
 * routes/students.js - 学生CRUD路由
 */
const express = require('express');
const db = require('../db');

const router = express.Router();

// 获取学生列表
router.get('/', (req, res) => {
  try {
    const students = db.queryAll('SELECT * FROM students WHERE user_id = ? ORDER BY sort_order', [req.userId]);
    res.json(students.map(s => ({
      id: s.id,
      name: s.name,
      avatarIndex: s.avatar_index,
      order: s.sort_order
    })));
  } catch (err) {
    res.status(500).json({ message: '获取学生列表失败' });
  }
});

// 批量更新学生列表
router.post('/', (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students)) {
    return res.status(400).json({ message: '无效数据' });
  }

  try {
    db.run('DELETE FROM students WHERE user_id = ?', [req.userId]);

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const id = s.id || ('s_' + Date.now().toString(36) + '_' + i);
      db.run('INSERT INTO students (id, user_id, name, avatar_index, sort_order) VALUES (?, ?, ?, ?, ?)',
        [id, req.userId, s.name, s.avatarIndex || 0, i + 1]);
    }

    db.saveToDisk();
    res.json({ success: true, count: students.length });
  } catch (err) {
    res.status(500).json({ message: '更新学生列表失败: ' + err.message });
  }
});

module.exports = router;
