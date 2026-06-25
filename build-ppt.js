const PptxGenJS = require('pptxgenjs');
const { sqlQuery } = require('./db');

async function generate() {
  const [{ totalEmp }] = await sqlQuery('SELECT COUNT(*) totalEmp FROM pre_emp');
  const [{ totalDept }] = await sqlQuery('SELECT COUNT(*) totalDept FROM pre_dept');
  const [{ totalUser }] = await sqlQuery('SELECT COUNT(*) totalUser FROM pre_user');
  const [{ totalLog }] = await sqlQuery('SELECT COUNT(*) totalLog FROM pre_log');
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const [{ m: monthNew }] = await sqlQuery('SELECT COUNT(*) m FROM pre_emp WHERE emp_entry >= ?', [firstDay]);

  const ppt = new PptxGenJS();
  ppt.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
  ppt.layout = 'WIDE';

  const bg = '08080F';
  const surf = '13131F';
  const accent = '6366F1';
  const accent2 = '818CF8';
  const teal = '2DD4BF';
  const amber = 'FBBF24';
  const white = 'F1F5F9';
  const dim = '64748B';
  const line = 'FFFFFF';
  const lineAlpha = 6;

  // ---- helpers ----
  function card(x, y, w, h) {
    return ppt.ShapeType.roundRect;
  }
  function addCard(s, x, y, w, h) {
    s.addShape(card(), { x, y, w, h, fill: { color: surf }, line: { color: line, transparency: 94 - lineAlpha }, rectRadius: 0.15 });
  }
  function addTopLine(s, x, y, w) {
    s.addShape(ppt.ShapeType.rect, { x, y, w, h: 0.04, fill: { color: accent } });
  }
  function titleBar(s, label, title, subtitle) {
    if (label) s.addText(label, { x: 0.8, y: 0.55, w: 3, h: 0.35, fontSize: 9, color: accent2, bold: true, fontFace: 'Segoe UI', charSpacing: 4 });
    s.addText(title, { x: 0.8, y: label ? 1.0 : 0.7, w: 11, h: 0.85, fontSize: 30, color: white, bold: true, fontFace: 'Segoe UI' });
    s.addText(subtitle, { x: 0.8, y: label ? 1.75 : 1.45, w: 11, h: 0.45, fontSize: 13, color: dim, fontFace: 'Segoe UI' });
  }

  // ====== Slide 1: Cover ======
  const s1 = ppt.addSlide();
  s1.background = { color: bg };
  // brand circle with glow
  s1.addShape(ppt.ShapeType.ellipse, { x: 5.6, y: 0.9, w: 2.1, h: 2.1, fill: { color: accent, transparency: 88 }, line: { color: accent2, width: 1, transparency: 40 } });
  s1.addShape(ppt.ShapeType.ellipse, { x: 5.75, y: 1.05, w: 1.8, h: 1.8, fill: { color: accent, transparency: 82 }, line: { color: accent2, width: 0.5, transparency: 60 } });
  s1.addText('E', { x: 5.6, y: 0.9, w: 2.1, h: 2.1, fontSize: 44, color: accent2, bold: true, align: 'center', valign: 'middle', fontFace: 'Segoe UI' });
  // title
  s1.addText('员工管理系统', { x: 1.2, y: 3.4, w: 10.9, h: 1.3, fontSize: 46, color: white, bold: true, align: 'center', fontFace: 'Segoe UI' });
  s1.addText('企业级人事管理平台', { x: 1.2, y: 4.65, w: 10.9, h: 0.5, fontSize: 15, color: dim, align: 'center', fontFace: 'Segoe UI' });
  // tech tags
  const tags = ['Node.js', 'Express 5', 'MySQL', 'EJS', 'Three.js', 'Dark Glass UI'];
  const tagW = tags.reduce((a, t) => a + t.length * 0.11 + 0.35, 0);
  let tagX = (13.333 - tagW) / 2;
  tags.forEach(t => {
    const tw = t.length * 0.11 + 0.3;
    s1.addShape(ppt.ShapeType.roundRect, { x: tagX, y: 5.7, w: tw, h: 0.4, fill: { color: line, transparency: 96 }, line: { color: line, transparency: 94 }, rectRadius: 0.2 });
    s1.addText(t, { x: tagX, y: 5.7, w: tw, h: 0.4, fontSize: 9, color: dim, align: 'center', valign: 'middle', fontFace: 'Segoe UI' });
    tagX += tw + 0.15;
  });

  // ====== Slide 2: Dashboard ======
  const s2 = ppt.addSlide();
  s2.background = { color: bg };
  titleBar(s2, 'OVERVIEW', '数据仪表盘', '实时统计，一屏掌握全局动态');

  const cards2 = [
    { v: totalEmp, l: '在职员工', c: accent },
    { v: totalDept, l: '部门总数', c: teal },
    { v: monthNew, l: '本月入职', c: accent2 },
    { v: totalUser, l: '系统用户', c: amber },
  ];
  cards2.forEach((d, i) => {
    const x = 0.6 + i * 3.15;
    addCard(s2, x, 2.6, 2.95, 2.0);
    s2.addShape(ppt.ShapeType.rect, { x: x + 0.08, y: 2.6, w: 2.79, h: 0.04, fill: { color: d.c } });
    s2.addText(String(d.v), { x, y: 2.85, w: 2.95, h: 0.9, fontSize: 40, color: d.c, bold: true, align: 'center', fontFace: 'Segoe UI' });
    s2.addText(d.l, { x, y: 3.85, w: 2.95, h: 0.4, fontSize: 10, color: dim, align: 'center', fontFace: 'Segoe UI', charSpacing: 3 });
  });

  const feats2 = [
    { t: '员工管理', d: 'CRUD / 搜索 / 分页' },
    { t: '部门管理', d: 'CRUD / 人数统计' },
    { t: '数据导入导出', d: 'Excel / CSV' },
    { t: '权限控制', d: '管理员 / 访客' },
  ];
  feats2.forEach((f, i) => {
    const x = 0.6 + i * 3.15;
    s2.addShape(ppt.ShapeType.roundRect, { x: x + 0.3, y: 5.0, w: 2.55, h: 0.75, fill: { color: line, transparency: 97 }, line: { color: line, transparency: 95 }, rectRadius: 0.4 });
    s2.addText(f.t, { x: x + 0.3, y: 5.0, w: 2.55, h: 0.4, fontSize: 11, color: white, align: 'center', bold: true, fontFace: 'Segoe UI' });
    s2.addText(f.d, { x: x + 0.3, y: 5.4, w: 2.55, h: 0.3, fontSize: 9, color: dim, align: 'center', fontFace: 'Segoe UI' });
  });

  // ====== Slide 3: Features ======
  const s3 = ppt.addSlide();
  s3.background = { color: bg };
  titleBar(s3, 'FEATURES', '核心能力', '从数据录入到权限管控，完整闭环');

  const fCards = [
    { t: 'Excel 批量导入', d: '上传 .xlsx 一键导入员工，自动匹配部门，支持 9 字段批量录入', c: teal },
    { t: '操作日志追踪', d: `增删改操作自动记录操作人、时间、对象，${totalLog} 条记录全程可追溯`, c: accent },
    { t: '多用户角色权限', d: '管理员全部权限，访客仅可查看，后端中间件双重保护', c: accent2 },
    { t: 'CSV 数据导出', d: '按条件筛选后导出，UTF-8 BOM 编码，工龄自动计算', c: amber },
  ];
  fCards.forEach((fc, i) => {
    const x = 0.8 + (i % 2) * 6.2;
    const y = 2.5 + (i < 2 ? 0 : 2.0);
    addCard(s3, x, y, 5.8, 1.7);
    s3.addShape(ppt.ShapeType.rect, { x, y, w: 0.06, h: 1.7, fill: { color: fc.c } });
    s3.addShape(ppt.ShapeType.ellipse, { x: x + 0.4, y: y + 0.3, w: 0.42, h: 0.42, fill: { color: fc.c, transparency: 85 }, line: { color: fc.c, width: 1, transparency: 40 } });
    s3.addText(fc.t, { x: x + 1.1, y: y + 0.18, w: 4.4, h: 0.4, fontSize: 15, color: white, bold: true, fontFace: 'Segoe UI' });
    s3.addText(fc.d, { x: x + 1.1, y: y + 0.68, w: 4.4, h: 0.8, fontSize: 11, color: dim, fontFace: 'Segoe UI', lineSpacing: 18 });
  });

  // ====== Slide 4: Design ======
  const s4 = ppt.addSlide();
  s4.background = { color: bg };
  titleBar(s4, 'DESIGN', '暗色玻璃设计系统', 'Indigo Studio — 现代企业级视觉语言');

  const dFeats = [
    { t: 'WebGL', d: '动态着色器背景', c: accent },
    { t: '毛玻璃', d: 'backdrop-filter', c: '818CF8' },
    { t: '靛蓝主色', d: '#6366F1 Token', c: 'A5B4FC' },
    { t: '响应式', d: '全设备适配', c: teal },
    { t: '渐变按钮', d: '辉光 + 内发光', c: amber },
    { t: '暗色主题', d: 'Dark Glass UI', c: 'C4B5FD' },
  ];
  dFeats.forEach((df, i) => {
    const x = 0.8 + (i % 3) * 4.15;
    const y = 2.5 + Math.floor(i / 3) * 1.7;
    addCard(s4, x, y, 3.9, 1.45);
    s4.addShape(ppt.ShapeType.ellipse, { x: x + 1.45, y: y + 0.15, w: 1.0, h: 1.0, fill: { color: df.c, transparency: 90 } });
    s4.addText(df.t, { x, y: y + 0.95, w: 3.9, h: 0.35, fontSize: 14, color: white, bold: true, align: 'center', fontFace: 'Segoe UI' });
    s4.addText(df.d, { x, y: y + 1.2, w: 3.9, h: 0.25, fontSize: 9, color: dim, align: 'center', fontFace: 'Segoe UI', charSpacing: 1 });
  });

  // tech stack + func list at bottom
  addCard(s4, 0.8, 5.2, 5.8, 1.35);
  s4.addText('技术栈', { x: 1.1, y: 5.3, w: 5.2, h: 0.35, fontSize: 12, color: accent2, bold: true, fontFace: 'Segoe UI' });
  s4.addText('Node.js  ·  Express 5  ·  MySQL 5.7  ·  EJS 6  ·  bcryptjs  ·  multer  ·  xlsx  ·  Three.js', { x: 1.1, y: 5.7, w: 5.2, h: 0.55, fontSize: 10, color: dim, fontFace: 'Segoe UI' });

  addCard(s4, 7, 5.2, 5.5, 1.35);
  s4.addText('功能清单', { x: 7.3, y: 5.3, w: 4.9, h: 0.35, fontSize: 12, color: accent2, bold: true, fontFace: 'Segoe UI' });
  s4.addText('仪表盘  ·  员工CRUD  ·  部门管理  ·  批量删除  ·  CSV导出  ·  Excel导入  ·  操作日志  ·  用户管理  ·  密码修改  ·  角色权限', { x: 7.3, y: 5.7, w: 4.9, h: 0.55, fontSize: 10, color: dim, fontFace: 'Segoe UI' });

  // ====== Slide 5: Thank You ======
  const s5 = ppt.addSlide();
  s5.background = { color: bg };
  // brand circle
  s5.addShape(ppt.ShapeType.ellipse, { x: 5.6, y: 1.2, w: 2.1, h: 2.1, fill: { color: accent, transparency: 88 }, line: { color: accent2, width: 1, transparency: 40 } });
  s5.addShape(ppt.ShapeType.ellipse, { x: 5.75, y: 1.35, w: 1.8, h: 1.8, fill: { color: accent, transparency: 82 }, line: { color: accent2, width: 0.5, transparency: 60 } });
  s5.addText('E', { x: 5.6, y: 1.2, w: 2.1, h: 2.1, fontSize: 44, color: accent2, bold: true, align: 'center', valign: 'middle', fontFace: 'Segoe UI' });
  // title
  s5.addText('Thank You', { x: 1.2, y: 3.7, w: 10.9, h: 1.0, fontSize: 42, color: white, bold: true, align: 'center', fontFace: 'Segoe UI' });
  s5.addText('员工管理系统  ·  企业级人事管理平台', { x: 1.2, y: 4.7, w: 10.9, h: 0.45, fontSize: 14, color: dim, align: 'center', fontFace: 'Segoe UI' });
  // tags
  const tags5 = ['Express', 'MySQL', 'EJS', 'Dark Glass UI', 'WebGL', 'PPTXGenJS'];
  const tagW5 = tags5.reduce((a, t) => a + t.length * 0.11 + 0.35, 0);
  let tagX5 = (13.333 - tagW5) / 2;
  tags5.forEach(t => {
    const tw = t.length * 0.11 + 0.3;
    s5.addShape(ppt.ShapeType.roundRect, { x: tagX5, y: 5.8, w: tw, h: 0.4, fill: { color: line, transparency: 96 }, line: { color: line, transparency: 94 }, rectRadius: 0.2 });
    s5.addText(t, { x: tagX5, y: 5.8, w: tw, h: 0.4, fontSize: 9, color: dim, align: 'center', valign: 'middle', fontFace: 'Segoe UI' });
    tagX5 += tw + 0.15;
  });
  // footer
  s5.addText('emp-manage  ·  Node.js + Express + MySQL', { x: 1, y: 6.8, w: 11.3, h: 0.35, fontSize: 8.5, color: dim, align: 'center', fontFace: 'Segoe UI', transparency: 50 });

  await ppt.writeFile({ fileName: '演示文稿.pptx' });
  console.log('Done: 演示文稿.pptx');
  process.exit(0);
}

generate().catch(e => { console.error(e); process.exit(1); });
