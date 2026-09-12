/**
 * server.js - Express 入口
 */
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');

const { initDatabase, saveToDisk, queryAll, queryOne, run } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'morning-checkin-secret-2026';

// 中间件
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// JWT认证中间件
const authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未登录' });
  }

  try {
    const token = auth.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.username = decoded.username;
    next();
  } catch (err) {
    return res.status(401).json({ message: '登录已过期，请重新登录' });
  }
};

// 启动服务器（先初始化数据库）
async function start() {
  try {
    await initDatabase();
    console.log('✅ 数据库初始化完成');

    // 路由（需要在DB初始化后加载）
    const authRoutes = require('./routes/auth');
    const studentRoutes = require('./routes/students');
    const templateRoutes = require('./routes/templates');
    const recordRoutes = require('./routes/records');

    app.use('/api', authRoutes);
    app.use('/api/students', authMiddleware, studentRoutes);
    app.use('/api/templates', authMiddleware, templateRoutes);
    app.use('/api/records', authMiddleware, recordRoutes);

    // 同步端点 - 推送
    app.post('/api/sync', authMiddleware, (req, res) => {
      try {
        const students = queryAll('SELECT * FROM students WHERE user_id = ? ORDER BY sort_order', [req.userId]);
        const templates = queryAll('SELECT * FROM templates WHERE user_id = ? ORDER BY updated_at DESC', [req.userId]);
        const records = queryAll('SELECT * FROM records WHERE user_id = ? ORDER BY date DESC LIMIT 90', [req.userId]);

        res.json({
          success: true,
          latest: {
            students: {
              _updatedAt: new Date().toISOString(),
              value: students.map(s => ({ id: s.id, name: s.name, avatarIndex: s.avatar_index, order: s.sort_order }))
            },
            templates: {
              _updatedAt: new Date().toISOString(),
              value: templates.map(t => ({ id: t.id, name: t.name, data: JSON.parse(t.data), updatedAt: t.updated_at }))
            },
            records: {
              _updatedAt: new Date().toISOString(),
              value: Object.fromEntries(records.map(r => [r.date, JSON.parse(r.data)]))
            }
          }
        });
      } catch (err) {
        res.status(500).json({ message: '同步失败' });
      }
    });

    // 同步端点 - 拉取
    app.get('/api/sync', authMiddleware, (req, res) => {
      try {
        const students = queryAll('SELECT * FROM students WHERE user_id = ? ORDER BY sort_order', [req.userId]);
        const templates = queryAll('SELECT * FROM templates WHERE user_id = ? ORDER BY updated_at DESC', [req.userId]);
        const records = queryAll('SELECT * FROM records WHERE user_id = ? ORDER BY date DESC LIMIT 90', [req.userId]);

        res.json({
          latest: {
            students: {
              _updatedAt: new Date().toISOString(),
              value: students.map(s => ({ id: s.id, name: s.name, avatarIndex: s.avatar_index, order: s.sort_order }))
            },
            templates: {
              _updatedAt: new Date().toISOString(),
              value: templates.map(t => ({ id: t.id, name: t.name, data: JSON.parse(t.data), updatedAt: t.updated_at }))
            },
            records: {
              _updatedAt: new Date().toISOString(),
              value: Object.fromEntries(records.map(r => [r.date, JSON.parse(r.data)]))
            }
          }
        });
      } catch (err) {
        res.status(500).json({ message: '拉取数据失败' });
      }
    });

    // 静态文件服务（可选：将前端放在public目录）
    const publicDir = path.join(__dirname, '..', 'public');
    if (require('fs').existsSync(publicDir)) {
      app.use(express.static(publicDir));
    }

    app.listen(PORT, () => {
      console.log(`\n☀️  早读打卡服务器已启动`);
      console.log(`   地址: http://localhost:${PORT}`);
      console.log(`   API:  http://localhost:${PORT}/api/health\n`);
    });

  } catch (err) {
    console.error('❌ 启动失败:', err);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', () => {
  saveToDisk();
  process.exit(0);
});

start();
