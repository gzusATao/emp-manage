const { sqlQuery } = require('./db');
const { hashPassword } = require('./auth');

async function init() {
  try {
    // 创建用户表
    await sqlQuery(`
      CREATE TABLE IF NOT EXISTS pre_user (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('用户表 pre_user 创建成功');

    // 检查是否已有 admin 用户
    const existing = await sqlQuery('SELECT * FROM pre_user WHERE username = ?', ['admin']);
    if (existing.length === 0) {
      const hashedPwd = await hashPassword('admin123');
      await sqlQuery('INSERT INTO pre_user (username, password) VALUES (?, ?)', ['admin', hashedPwd]);
      console.log('默认管理员帐号创建成功：admin / admin123');
    } else {
      console.log('admin 用户已存在，跳过');
    }

    process.exit(0);
  } catch (err) {
    console.error('初始化失败：', err.message);
    process.exit(1);
  }
}

init();
