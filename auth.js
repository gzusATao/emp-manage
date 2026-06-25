const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;

// 登录验证中间件
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/login');
}

// 密码加密
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// 密码校验
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

module.exports = { isAuthenticated, hashPassword, verifyPassword };
