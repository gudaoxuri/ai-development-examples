// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./database.sqlite');

app.use((req, res, next) => {
  const auth = { login: 'jzy', password: 'dE3254D$#' };

  // 解析认证头信息
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  // 验证登录信息
  if (login && password && login === auth.login && password === auth.password) {
    return next();
  }

  // 认证失败
  res.set('WWW-Authenticate', 'Basic realm="401"');
  res.status(401).send('需要认证');
});
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 初始化数据库
db.serialize(() => {
  // 创建表格
  db.run(`
    CREATE TABLE IF NOT EXISTS JobCategory (
      CategoryName TEXT PRIMARY KEY,
      ParentCategoryName TEXT,
      FOREIGN KEY (ParentCategoryName) REFERENCES JobCategory(CategoryName)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS JobInfo (
      JobName TEXT PRIMARY KEY,
      JobCategoryName TEXT,
      JobDescription TEXT,
      FOREIGN KEY (JobCategoryName) REFERENCES JobCategory(CategoryName)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS Knowledge (
      KnowledgeId INTEGER PRIMARY KEY AUTOINCREMENT,
      KnowledgeName TEXT NOT NULL,
      KnowledgeDescription TEXT,
      ParentKnowledgeId INTEGER,
      FOREIGN KEY (ParentKnowledgeId) REFERENCES Knowledge(KnowledgeId)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS JobKnowledgeRelation (
      RelationId INTEGER PRIMARY KEY AUTOINCREMENT,
      JobName TEXT,
      JobLevel TEXT CHECK (JobLevel IN ('实习', '初级', '中级', '高级')),
      KnowledgeId INTEGER,
      KnowledgeRequirement TEXT CHECK (KnowledgeRequirement IN ('了解', '掌握', '熟悉', '精通')),
      IsRequired INTEGER CHECK (IsRequired IN (0,1)),
      IsImportant INTEGER CHECK (IsImportant IN (0,1)),
      FOREIGN KEY (JobName) REFERENCES JobInfo(JobName),
      FOREIGN KEY (KnowledgeId) REFERENCES Knowledge(KnowledgeId)
    );
  `);

  // 插入初始数据
  db.get("SELECT COUNT(*) AS count FROM JobCategory", (err, row) => {
    if (row.count === 0) {
      insertInitialData();
    }
  });
});

function insertInitialData() {
  // 插入初始数据
  db.serialize(() => {
    // Job Categories
    db.run(`INSERT INTO JobCategory (CategoryName, ParentCategoryName) VALUES ('技术', NULL)`);
    db.run(`INSERT INTO JobCategory (CategoryName, ParentCategoryName) VALUES ('开发', '技术')`);
    db.run(`INSERT INTO JobCategory (CategoryName, ParentCategoryName) VALUES ('测试', '技术')`);
    db.run(`INSERT INTO JobCategory (CategoryName, ParentCategoryName) VALUES ('运维', '技术')`);
    db.run(`INSERT INTO JobCategory (CategoryName, ParentCategoryName) VALUES ('前端', '开发')`);
    db.run(`INSERT INTO JobCategory (CategoryName, ParentCategoryName) VALUES ('后端', '开发')`);

    // Job Info
    db.run(`INSERT INTO JobInfo (JobName, JobCategoryName, JobDescription) VALUES ('平台开发工程师', '后端', '负责平台化系统的研发')`);
    db.run(`INSERT INTO JobInfo (JobName, JobCategoryName, JobDescription) VALUES ('软件测试工程师', '测试', '负责软件测试工作')`);
    db.run(`INSERT INTO JobInfo (JobName, JobCategoryName, JobDescription) VALUES ('前端开发工程师', '前端', '负责前端页面开发')`);
    db.run(`INSERT INTO JobInfo (JobName, JobCategoryName, JobDescription) VALUES ('系统运维工程师', '运维', '负责系统运维工作')`);

    // Knowledge Points
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('计算机基础', NULL, NULL)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('数据结构与算法', NULL, 1)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('操作系统', NULL, 1)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('网络原理', NULL, 1)`);

    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('编程语言', NULL, NULL)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('Java', NULL, 5)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('Python', NULL, 5)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('JavaScript', NULL, 5)`);

    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('Web开发', NULL, NULL)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('前端框架', NULL, 9)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('React', NULL, 10)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('Vue', NULL, 10)`);

    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('数据库', NULL, NULL)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('关系型数据库', NULL, 13)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('MySQL', NULL, 14)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('PostgreSQL', NULL, 14)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('NoSQL数据库', NULL, 13)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('MongoDB', NULL, 17)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('Redis', NULL, 17)`);

    // Additional Knowledge Points
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('软件测试', NULL, NULL)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('功能测试', NULL, 20)`);
    db.run(`INSERT INTO Knowledge (KnowledgeName, KnowledgeDescription, ParentKnowledgeId) VALUES ('性能测试', NULL, 20)`);

    // Job Knowledge Relations
    db.run(`INSERT INTO JobKnowledgeRelation (JobName, JobLevel, KnowledgeId, KnowledgeRequirement, IsRequired, IsImportant) VALUES ('平台开发工程师', '初级', 6, '熟悉', 1, 1)`);
    db.run(`INSERT INTO JobKnowledgeRelation (JobName, JobLevel, KnowledgeId, KnowledgeRequirement, IsRequired, IsImportant) VALUES ('平台开发工程师', '高级', 6, '精通', 1, 1)`);
    db.run(`INSERT INTO JobKnowledgeRelation (JobName, JobLevel, KnowledgeId, KnowledgeRequirement, IsRequired, IsImportant) VALUES ('前端开发工程师', '初级', 8, '熟悉', 1, 1)`);
    db.run(`INSERT INTO JobKnowledgeRelation (JobName, JobLevel, KnowledgeId, KnowledgeRequirement, IsRequired, IsImportant) VALUES ('前端开发工程师', '初级', 11, '了解', 1, 1)`);
    db.run(`INSERT INTO JobKnowledgeRelation (JobName, JobLevel, KnowledgeId, KnowledgeRequirement, IsRequired, IsImportant) VALUES ('前端开发工程师', '高级', 11, '精通', 1, 1)`);
    db.run(`INSERT INTO JobKnowledgeRelation (JobName, JobLevel, KnowledgeId, KnowledgeRequirement, IsRequired, IsImportant) VALUES ('软件测试工程师', '高级', 2, '熟悉', 1, 1)`);
    db.run(`INSERT INTO JobKnowledgeRelation (JobName, JobLevel, KnowledgeId, KnowledgeRequirement, IsRequired, IsImportant) VALUES ('软件测试工程师', '中级', 21, '掌握', 1, 1)`);
    db.run(`INSERT INTO JobKnowledgeRelation (JobName, JobLevel, KnowledgeId, KnowledgeRequirement, IsRequired, IsImportant) VALUES ('系统运维工程师', '中级', 3, '掌握', 1, 1)`);
    db.run(`INSERT INTO JobKnowledgeRelation (JobName, JobLevel, KnowledgeId, KnowledgeRequirement, IsRequired, IsImportant) VALUES ('系统运维工程师', '高级', 19, '精通', 1, 1)`);
  });
}

// API 路由

// 获取所有知识点
app.get('/api/knowledge', (req, res) => {
  db.all('SELECT * FROM Knowledge', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 获取岗位信息
app.get('/api/jobs', (req, res) => {
  db.all('SELECT * FROM JobInfo', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 获取岗位知识关系
app.get('/api/relations', (req, res) => {
  const { jobName, jobLevel, requirement } = req.query;
  let query = 'SELECT * FROM JobKnowledgeRelation WHERE 1=1';
  let params = [];

  if (jobName) {
    query += ' AND JobName = ?';
    params.push(jobName);
  }
  if (jobLevel) {
    query += ' AND JobLevel = ?';
    params.push(jobLevel);
  }
  if (requirement) {
    query += ' AND KnowledgeRequirement = ?';
    params.push(requirement);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 创建岗位知识关系
app.post('/api/relations', (req, res) => {
  const { JobName, JobLevel, KnowledgeId, KnowledgeRequirement, IsRequired, IsImportant } = req.body;
  const stmt = db.prepare(`
    INSERT INTO JobKnowledgeRelation
    (JobName, JobLevel, KnowledgeId, KnowledgeRequirement, IsRequired, IsImportant)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run([JobName, JobLevel, KnowledgeId, KnowledgeRequirement, IsRequired, IsImportant], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ RelationId: this.lastID });
  });
  stmt.finalize();
});

// 更新岗位知识关系
app.put('/api/relations/:id', (req, res) => {
  const { JobName, JobLevel, KnowledgeRequirement, IsRequired, IsImportant } = req.body;
  const { id } = req.params;
  const stmt = db.prepare(`
    UPDATE JobKnowledgeRelation
    SET JobName = ?, JobLevel = ?, KnowledgeRequirement = ?, IsRequired = ?, IsImportant = ?
    WHERE RelationId = ?
  `);
  stmt.run([JobName, JobLevel, KnowledgeRequirement, IsRequired, IsImportant, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
  stmt.finalize();
});

// 删除岗位知识关系
app.delete('/api/relations/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare(`DELETE FROM JobKnowledgeRelation WHERE RelationId = ?`);
  stmt.run([id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
  stmt.finalize();
});

// 获取特定知识点的岗位知识关系
app.get('/api/knowledge/:id/relations', (req, res) => {
  const { id } = req.params;
  db.all('SELECT * FROM JobKnowledgeRelation WHERE KnowledgeId = ?', [id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 获取特定RelationId的关系
app.get('/api/relations/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM JobKnowledgeRelation WHERE RelationId = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row);
  });
});

// 启动服务器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
