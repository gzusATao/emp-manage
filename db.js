const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'itcast',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10
});

// 封装数据库查询方法
function sqlQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

module.exports = { sqlQuery };
