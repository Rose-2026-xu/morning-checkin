module.exports = {
  apps: [{
    name: 'morning-checkin',
    script: 'server/server.js',
    cwd: '/opt/morning-checkin',
    env: {
      PORT: 3002,
      JWT_SECRET: 'mc-jwt-prod-2026-s3cret'
    }
  }]
};
