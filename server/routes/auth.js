/**
 * routes/auth.js - 认证路由
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'morning-checkin-secret-2026';
const JWT_EXPIRES = '7d';

// 注册
router.post('/register', (req, res) => {
  const { username, password, teacherName } = req.body;

  if (!username || !password || !teacherName) {
    return res.status(400).json({ message: '请填写所有字段' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: '密码至少6位' });
  }

  try {
    const existing = db.queryOne('SELECT * FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(409).json({ message: '用户名已存在' });
    }

    const id = 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run('INSERT INTO users (id, username, password, teacher_name) VALUES (?, ?, ?, ?)', [id, username, hashedPassword, teacherName]);
    db.saveToDisk();

    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({
      user: { id, username, teacherName, token },
      token
    });
  } catch (err) {
    res.status(500).json({ message: '注册失败: ' + err.message });
  }
});

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: '请填写用户名和密码' });
  }

  try {
    const user = db.queryOne('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ message: '用户名不存在' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: '密码错误' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({
      user: { id: user.id, username: user.username, teacherName: user.teacher_name, token },
      token
    });
  } catch (err) {
    res.status(500).json({ message: '登录失败' });
  }
});

module.exports = router;
