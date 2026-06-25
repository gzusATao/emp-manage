const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const xlsx = require('xlsx');
const { sqlQuery } = require('./db');
const { isAuthenticated, verifyPassword, hashPassword } = require('./auth');
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// 操作日志辅助
async function addLog(username, action, target, detail) {
  try {
    await sqlQuery('INSERT INTO pre_log(username,action,target,detail) VALUES (?,?,?,?)',
      [username, action, target, detail || '']);
  } catch (e) { console.error('日志写入失败:', e.message); }
}

// 全局配置
app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: 'emp-manage-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24小时
}));

// 每页展示条数
const PAGE_SIZE = 10;

// ===================== 登录页面 =====================
app.get('/login', (req, res) => {
  // 已登录直接跳转首页
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: '' });
});

// ===================== 登录提交 =====================
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('login', { error: '用户名和密码不能为空' });
  }
  try {
    const rows = await sqlQuery('SELECT * FROM pre_user WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.render('login', { error: '用户名或密码错误' });
    }
    const user = rows[0];
    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return res.render('login', { error: '用户名或密码错误' });
    }
    req.session.user = { user_id: user.user_id, username: user.username, role: user.role || 'admin' };
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.render('login', { error: '登录失败，请重试' });
  }
});

// ===================== 退出登录 =====================
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// ===================== 以下路由需要登录 =====================
app.use(isAuthenticated);

// 管理员中间件
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') return next();
  return res.status(403).send('权限不足，仅管理员可操作');
}

// ===================== 0. 修改密码 =====================
app.get('/changePwd', (req, res) => {
  res.render('changePwd', { error: '', success: '', user: req.session.user });
});
app.post('/changePwd', async (req, res) => {
  const { oldPwd, newPwd, confirmPwd } = req.body;
  if (!oldPwd || !newPwd || !confirmPwd) {
    return res.render('changePwd', { error: '所有字段不能为空', success: '', user: req.session.user });
  }
  if (newPwd !== confirmPwd) {
    return res.render('changePwd', { error: '两次输入的新密码不一致', success: '', user: req.session.user });
  }
  if (newPwd.length < 6) {
    return res.render('changePwd', { error: '新密码至少6位', success: '', user: req.session.user });
  }
  try {
    const rows = await sqlQuery('SELECT password FROM pre_user WHERE user_id = ?', [req.session.user.user_id]);
    const valid = await verifyPassword(oldPwd, rows[0].password);
    if (!valid) {
      return res.render('changePwd', { error: '原密码错误', success: '', user: req.session.user });
    }
    const hashed = await hashPassword(newPwd);
    await sqlQuery('UPDATE pre_user SET password = ? WHERE user_id = ?', [hashed, req.session.user.user_id]);
    addLog(req.session.user.username, '修改密码', req.session.user.username, '');
    res.render('changePwd', { error: '', success: '密码修改成功', user: req.session.user });
  } catch (err) {
    console.error(err);
    res.render('changePwd', { error: '修改失败，请重试', success: '', user: req.session.user });
  }
});

// ===================== Excel 批量导入 =====================
app.get('/importEmp', async (req, res) => {
  const deptList = await sqlQuery('SELECT * FROM pre_dept');
  res.render('importEmp', { result: null, deptList, user: req.session.user });
});
app.post('/importEmp', isAdmin, upload.single('xlsxFile'), async (req, res) => {
  const deptList = await sqlQuery('SELECT * FROM pre_dept');
  if (!req.file) {
    return res.render('importEmp', { result: { ok: false, msg: '请选择 Excel 文件' }, deptList, user: req.session.user });
  }
  try {
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    if (rows.length < 2) {
      return res.render('importEmp', { result: { ok: false, msg: 'Excel 文件为空或无表头' }, deptList, user: req.session.user });
    }
    const header = rows[0];
    const idx = (name) => header.findIndex(h => h && h.includes(name));
    const nameIdx = idx('姓名');
    const deptIdx = idx('部门');
    const birthIdx = idx('出生');
    const entryIdx = idx('入职');
    const salaryIdx = idx('月薪');
    const phoneIdx = idx('手机');
    const emailIdx = idx('邮箱');
    const genderIdx = idx('性别');
    const positionIdx = idx('职位');

    let success = 0, fail = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[nameIdx]) continue;
      try {
        const deptName = (r[deptIdx] || '').trim();
        let deptId = null;
        if (deptName) {
          const deptRows = await sqlQuery('SELECT dept_id FROM pre_dept WHERE dept_name = ?', [deptName]);
          if (deptRows.length) deptId = deptRows[0].dept_id;
        }
        await sqlQuery(
          `INSERT INTO pre_emp(emp_name,emp_dept_id,emp_birth,emp_entry,emp_salary,emp_phone,emp_email,emp_gender,emp_position)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [
            r[nameIdx] || '',
            deptId,
            r[birthIdx] || null,
            r[entryIdx] || null,
            r[salaryIdx] || null,
            r[phoneIdx] ? String(r[phoneIdx]) : null,
            r[emailIdx] || null,
            r[genderIdx] || null,
            r[positionIdx] || null
          ]
        );
        success++;
      } catch (e) { fail++; }
    }
    addLog(req.session.user.username, '批量导入', success + '条员工', '成功' + success + ' 失败' + fail);
    res.render('importEmp', { result: { ok: true, msg: `导入完成：成功 ${success} 条，失败 ${fail} 条` }, deptList, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.render('importEmp', { result: { ok: false, msg: '文件解析失败：' + err.message }, deptList, user: req.session.user });
  }
});

// ===================== 1. 仪表盘首页 =====================
app.get('/', async (req, res) => {
  try {
    // 统计卡片数据
    const empCount = await sqlQuery('SELECT COUNT(*) totalEmp FROM pre_emp');
    const totalEmp = empCount[0].totalEmp;
    const deptCount = await sqlQuery('SELECT COUNT(*) totalDept FROM pre_dept');
    const totalDept = deptCount[0].totalDept;
    
    // 本月入职人数
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const monthRows = await sqlQuery('SELECT COUNT(*) monthNew FROM pre_emp WHERE emp_entry >= ?', [firstDay]);
    const monthNew = monthRows[0].monthNew;
    const monthTotal = monthNew; // 本月入职总人数

    // 本月入职分页
    let monthPage = parseInt(req.query.mp) || 1;
    const monthLimit = 6;
    const monthMaxPage = Math.ceil(monthTotal / monthLimit) || 1;
    monthPage = Math.max(1, Math.min(monthPage, monthMaxPage));
    const monthOffset = (monthPage - 1) * monthLimit;
    
    // 月薪总额
    const salaryRows = await sqlQuery('SELECT COALESCE(SUM(emp_salary),0) totalSalary FROM pre_emp');
    const totalSalary = salaryRows[0].totalSalary;
    
    // 各部门人数
    const deptStat = await sqlQuery(`
      SELECT d.dept_name, COUNT(e.emp_id) cnt
      FROM pre_dept d
      LEFT JOIN pre_emp e ON d.dept_id = e.emp_dept_id
      GROUP BY d.dept_id
      ORDER BY cnt DESC
    `);
    
    // 本月入职员工明细
    const monthEmps = await sqlQuery(`
      SELECT e.emp_name, e.emp_entry, e.emp_salary, d.dept_name
      FROM pre_emp e
      LEFT JOIN pre_dept d ON e.emp_dept_id = d.dept_id
      WHERE e.emp_entry >= ?
      ORDER BY e.emp_entry ASC
      LIMIT ?,?
    `, [firstDay, monthOffset, monthLimit]);
    
    const stats = {
      totalEmp,
      totalDept,
      monthNew,
      totalSalary: `¥${Number(totalSalary).toLocaleString()}`
    };
    
    res.render('dashboard', {
      stats, deptStat, monthEmps, firstDay, monthPage, monthMaxPage,
      user: req.session.user
    });
  } catch (err) {
    console.error(err);
    res.send('数据查询失败：' + err.sqlMessage);
  }
});

// ===================== 2. 员工列表：多条件筛选、搜索、排序、分页、统计 =====================
app.get('/emp', async (req, res) => {
    try {
      // 1. 获取请求参数
      let page = parseInt(req.query.page) || 1;
      let limit = [5,10,20,50].includes(Number(req.query.limit)) ? Number(req.query.limit) : PAGE_SIZE;
      let search = req.query.search || '';
      let order = req.query.order || 'emp_id';
      let sort = req.query.sort || 'asc';
      let startDate = req.query.startDate || '';
      let endDate = req.query.endDate || '';
      let deptId = req.query.deptId || '';

      // 合法排序字段校验
      const allowField = ['emp_id','emp_name','emp_dept_id','emp_birth','emp_entry','emp_salary'];
      if(!allowField.includes(order)) order = 'emp_id';
      if(!['asc','desc'].includes(sort)) sort = 'asc';

      // 2. 拼接SQL条件 + 动态参数数组
      let whereSql = "WHERE 1=1";
      let queryParams = [];
      if(search){
        whereSql += " AND emp_name LIKE ?";
        queryParams.push(`%${search}%`);
      }
      if(startDate){
        whereSql += " AND emp_entry >= ?";
        queryParams.push(startDate);
      }
      if(endDate){
        whereSql += " AND emp_entry <= ?";
        queryParams.push(endDate);
      }
      if(deptId){
        whereSql += " AND emp_dept_id = ?";
        queryParams.push(deptId);
      }
      let orderSql = `ORDER BY ${order} ${sort}`;

      // 3. 查询总条数（分页）
      let countSql = `SELECT COUNT(*) total FROM pre_emp 
                      LEFT JOIN pre_dept ON pre_emp.emp_dept_id = pre_dept.dept_id
                      ${whereSql}`;
      let countRes = await sqlQuery(countSql, [...queryParams]);
      const total = countRes[0].total;
      const maxPage = Math.ceil(total / limit) || 1;
      page = Math.max(1, Math.min(page, maxPage)); // 页码边界处理

      // 4. 分页查询员工数据，分页参数追加到数组末尾
      let offset = (page - 1) * limit;
      let empSql = `SELECT pre_emp.*, pre_dept.dept_name FROM pre_emp 
                    LEFT JOIN pre_dept ON pre_emp.emp_dept_id = pre_dept.dept_id
                    ${whereSql} ${orderSql} LIMIT ?,?`;
      let empList = await sqlQuery(empSql, [...queryParams, offset, limit]);

      // 部门下拉全部数据
      let deptList = await sqlQuery("SELECT * FROM pre_dept");
      // 各部门人数统计
      let deptStat = await sqlQuery(`
        SELECT d.dept_name,COUNT(e.emp_id) cnt
        FROM pre_dept d
        LEFT JOIN pre_emp e ON d.dept_id = e.emp_dept_id
        GROUP BY d.dept_id
      `);

      // 5. 渲染页面
      res.render('index', {
        empList, page, maxPage, search, order, sort, limit, total,
        startDate, endDate, deptId, deptList, deptStat,
        user: req.session.user
      });
    } catch (err) {
      console.error(err);
      res.send('数据查询失败：' + err.sqlMessage);
    }
  });

// ===================== 批量删除员工接口 =====================
app.post('/batchDelEmp', isAdmin, async (req,res)=>{
  let ids = req.body.ids;
  if(!ids){
    return res.json({code:1,msg:"未勾选任何员工"})
  }
  const idArr = ids.split(',');
  const placeholders = idArr.map(()=>'?').join(',');
  await sqlQuery(`DELETE FROM pre_emp WHERE emp_id IN (${placeholders})`, idArr);
  addLog(req.session.user.username, '批量删除', idArr.length + '名员工', 'ID列表:' + ids);
  return res.json({ code: 0, msg: "批量删除成功" });
})

// ===================== 导出员工CSV文件接口 =====================
app.get('/exportEmp', async (req, res) => {
  let search = req.query.search || '';
  let startDate = req.query.startDate || '';
  let endDate = req.query.endDate || '';
  let deptId = req.query.deptId || '';

  let whereSql = "WHERE 1=1";
  const params = [];
  if (search) {
    whereSql += " AND emp_name LIKE ?";
    params.push('%' + search + '%');
  }
  if (startDate) {
    whereSql += " AND emp_entry >= ?";
    params.push(startDate);
  }
  if (endDate) {
    whereSql += " AND emp_entry <= ?";
    params.push(endDate);
  }
  if (deptId) {
    whereSql += " AND emp_dept_id = ?";
    params.push(deptId);
  }

  const list = await sqlQuery(`
    SELECT e.emp_id, e.emp_name, d.dept_name, e.emp_birth, e.emp_entry, e.emp_salary, e.emp_phone, e.emp_email, e.emp_gender, e.emp_position
    FROM pre_emp e
    LEFT JOIN pre_dept d ON e.emp_dept_id = d.dept_id
    ${whereSql}
    ORDER BY e.emp_id
  `, params);

  // UTF8 BOM 防止中文乱码 + 表头
  let csv = "\uFEFFID,姓名,所属部门,出生日期,入职日期,月薪,手机,邮箱,性别,职位,工龄\n";
  if (list.length === 0) {
    csv += ",暂无匹配员工数据,,,\n";
  } else {
    list.forEach(item => {
      const entry = new Date(item.emp_entry);
      const now = new Date();
      let y = now.getFullYear() - entry.getFullYear();
      let m = now.getMonth() - entry.getMonth();
      if (m < 0) {
        y--;
        m += 12;
      }
      const workAge = `${y}年${m}个月`;
      const birth = new Date(item.emp_birth).toISOString().split('T')[0];
      const entryDay = entry.toISOString().split('T')[0];
      csv += `${item.emp_id},${item.emp_name},${item.dept_name},${birth},${entryDay},¥${item.emp_salary || '-'},${item.emp_phone || '-'},${item.emp_email || '-'},${item.emp_gender || '-'},${item.emp_position || '-'},${workAge}\n`;
    });
  }

  res.setHeader('Content-Type', 'text/csv;charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment;filename=员工列表.csv');
  res.send(csv);
});

// ===================== 2. 添加员工 =====================
// 跳转添加页面
app.get('/addEmp', async (req, res) => {
  let deptList = await sqlQuery('SELECT * FROM pre_dept');
  res.render('addEmp', { deptList, user: req.session.user });
});
// 提交添加表单
app.post('/addEmp', isAdmin, async (req, res) => {
  const { emp_dept_id, emp_name, emp_birth, emp_entry, emp_salary, emp_phone, emp_email, emp_gender, emp_position } = req.body;
  let sql = `INSERT INTO pre_emp(emp_dept_id,emp_name,emp_birth,emp_entry,emp_salary,emp_phone,emp_email,emp_gender,emp_position) VALUES (?,?,?,?,?,?,?,?,?)`;
  await sqlQuery(sql, [emp_dept_id, emp_name, emp_birth, emp_entry, emp_salary || null, emp_phone || null, emp_email || null, emp_gender || null, emp_position || null]);
  const dept = await sqlQuery('SELECT dept_name FROM pre_dept WHERE dept_id=?', [emp_dept_id]);
  addLog(req.session.user.username, '添加员工', emp_name, `部门:${dept[0]?.dept_name || '-'} 职位:${emp_position || '-'} 月薪:${emp_salary || '-'}`);
  res.redirect('/emp');
});

// ===================== 3. 编辑员工（修复变量名 emp → empInfo，解决报错） =====================
// 跳转编辑页面
app.get('/editEmp', async (req, res) => {
  const emp_id = req.query.id;
  let empInfo = await sqlQuery(`SELECT * FROM pre_emp WHERE emp_id=?`, [emp_id]);
  // 兜底判断，id不存在跳转首页
  if(!empInfo.length){
    return res.send("员工不存在，<a href='/'>返回列表</a>");
  }
  let deptList = await sqlQuery('SELECT * FROM pre_dept');
  // 模板使用 empInfo，这里统一传递 empInfo
  res.render('editEmp', { empInfo: empInfo[0], deptList, user: req.session.user });
});
// 提交编辑表单
app.post('/editEmp', isAdmin, async (req, res) => {
  const { emp_id, emp_dept_id, emp_name, emp_birth, emp_entry, emp_salary, emp_phone, emp_email, emp_gender, emp_position } = req.body;
  let sql = `UPDATE pre_emp SET emp_dept_id=?,emp_name=?,emp_birth=?,emp_entry=?,emp_salary=?,emp_phone=?,emp_email=?,emp_gender=?,emp_position=? WHERE emp_id=?`;
  await sqlQuery(sql, [emp_dept_id, emp_name, emp_birth, emp_entry, emp_salary || null, emp_phone || null, emp_email || null, emp_gender || null, emp_position || null, emp_id]);
  addLog(req.session.user.username, '编辑员工', emp_name, `职位:${emp_position || '-'} 月薪:${emp_salary || '-'} 手机:${emp_phone || '-'}`);
  res.redirect('/emp');
});

// ===================== 4. 单行删除员工（原GET删除） =====================
app.get('/delEmp', isAdmin, async (req, res) => {
  const emp_id = req.query.id;
  const emp = await sqlQuery('SELECT emp_name, emp_position FROM pre_emp WHERE emp_id=?', [emp_id]);
  const name = emp[0]?.emp_name || '未知';
  const pos = emp[0]?.emp_position || '-';
  await sqlQuery(`DELETE FROM pre_emp WHERE emp_id=?`, [emp_id]);
  addLog(req.session.user.username, '删除员工', name, `职位:${pos}`);
  res.redirect('/emp');
});

// ===================== 5. 部门管理（带部门人数统计） =====================
// 部门列表页（携带每个部门人数cnt）
app.get('/dept', async (req, res) => {
  let deptList = await sqlQuery(`
    SELECT d.*,COUNT(e.emp_id) cnt
    FROM pre_dept d
    LEFT JOIN pre_emp e ON d.dept_id = e.emp_dept_id
    GROUP BY d.dept_id
  `);
  res.render('dept', { deptList, user: req.session.user });
});

// 添加部门
app.post('/addDept', isAdmin, async (req, res) => {
  const { dept_name } = req.body;
  await sqlQuery(`INSERT INTO pre_dept(dept_name) VALUES (?)`, [dept_name]);
  addLog(req.session.user.username, '添加部门', dept_name, '新建部门');
  res.redirect('/dept');
});

// 删除部门（页面JS校验人数，后端无拦截）
app.get('/delDept', isAdmin, async (req, res) => {
  const dept_id = req.query.id;
  const dept = await sqlQuery('SELECT dept_name FROM pre_dept WHERE dept_id=?', [dept_id]);
  const dname = dept[0]?.dept_name || '未知';
  await sqlQuery(`DELETE FROM pre_dept WHERE dept_id=?`, [dept_id]);
  addLog(req.session.user.username, '删除部门', dname, 'ID:' + dept_id);
  res.redirect('/dept');
});

// 修改部门页面
app.get('/editDept', async (req, res) => {
  const deptId = req.query.id;
  let deptInfo = await sqlQuery("SELECT * FROM pre_dept WHERE dept_id=?", [deptId]);
  res.render('editDept', { deptInfo: deptInfo[0] });
})
// 修改部门提交
app.post('/editDept', isAdmin, async (req, res) => {
  const { dept_id, dept_name } = req.body;
  const old = await sqlQuery('SELECT dept_name FROM pre_dept WHERE dept_id=?', [dept_id]);
  const oldName = old[0]?.dept_name || '';
  await sqlQuery(`UPDATE pre_dept SET dept_name=? WHERE dept_id=?`, [dept_name, dept_id]);
  addLog(req.session.user.username, '编辑部门', dept_name, `原名:${oldName}`);
  res.redirect('/dept');
});

// ===================== 操作日志查看 =====================
app.get('/log', async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  const limit = 20;
  const total = (await sqlQuery('SELECT COUNT(*) total FROM pre_log'))[0].total;
  const maxPage = Math.ceil(total / limit) || 1;
  page = Math.max(1, Math.min(page, maxPage));
  const offset = (page - 1) * limit;
  const logs = await sqlQuery('SELECT * FROM pre_log ORDER BY created_at DESC LIMIT ?,?', [offset, limit]);
  res.render('log', { logs, page, maxPage, user: req.session.user });
});

app.get('/users', isAdmin, async (req, res) => {
  const users = await sqlQuery('SELECT user_id, username, role, created_at FROM pre_user ORDER BY user_id');
  res.render('users', { users, user: req.session.user });
});
app.post('/addUser', isAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.redirect('/users');
  try {
    const hashed = await hashPassword(password);
    await sqlQuery('INSERT INTO pre_user(username,password,role) VALUES (?,?,?)', [username, hashed, role || 'viewer']);
    addLog(req.session.user.username, '添加用户', username, '角色:' + (role || 'viewer'));
  } catch (e) { console.error(e); }
  res.redirect('/users');
});
app.get('/delUser', isAdmin, async (req, res) => {
  const uid = parseInt(req.query.id);
  if (uid === req.session.user.user_id) return res.send("不能删除自己，<a href='/users'>返回</a>");
  const u = await sqlQuery('SELECT username FROM pre_user WHERE user_id=?', [uid]);
  if (u.length) {
    await sqlQuery('DELETE FROM pre_user WHERE user_id=?', [uid]);
    addLog(req.session.user.username, '删除用户', u[0].username, '角色:' + (u[0].role || 'viewer'));
  }
  res.redirect('/users');
});

// 启动服务
const port = 3000;
app.listen(port, () => {
  console.log(`员工管理系统运行：http://localhost:${port}`);
});