/**
 * routes/records.js - 打卡记录CRUD路由
 */
const express = require('express');
const db = require('../db');

const router = express.Router();

// 查询历史记录
router.get('/', (req, res) => {
  const { from, to } = req.query;
  const fromDate = from || '2000-01-01';
  const toDate = to || '2099-12-31';

  try {
    const records = db.queryAll(
      'SELECT * FROM records WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date DESC',
      [req.userId, fromDate, toDate]
    );
    res.json(records.map(r => ({
      id: r.id,
      date: r.date,
      data: JSON.parse(r.data),
      updatedAt: r.updated_at
    })));
  } catch (err) {
    res.status(500).json({ message: '获取记录失败' });
  }
});

// 获取某日记录
router.get('/:date', (req, res) => {
  try {
    const record = db.queryOne(
      'SELECT * FROM records WHERE user_id = ? AND date = ?',
      [req.userId, req.params.date]
    );
    if (!record) {
      return res.json(null);
    }
    res.json({
      id: record.id,
      date: record.date,
      data: JSON.parse(record.data),
      updatedAt: record.updated_at
    });
  } catch (err) {
    res.status(500).json({ message: '获取记录失败' });
  }
});

// 保存/更新打卡记录
router.post('/', (req, res) => {
  const { date, data } = req.body;
  if (!date || !data) {
    return res.status(400).json({ message: '缺少日期或数据' });
  }

  try {
    const now = new Date().toISOString();

    // 检查是否已有记录
    const existing = db.queryOne(
      'SELECT * FROM records WHERE user_id = ? AND date = ?',
      [req.userId, date]
    );

    if (existing) {
      db.run('UPDATE records SET data = ?, updated_at = ? WHERE user_id = ? AND date = ?',
        [JSON.stringify(data), now, req.userId, date]);
    } else {
      const id = 'rec_' + Date.now().toString(36);
      db.run('INSERT INTO records (id, user_id, date, data, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, req.userId, date, JSON.stringify(data), now]);
    }

    db.saveToDisk();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: '保存记录失败: ' + err.message });
  }
});

module.exports = router;
