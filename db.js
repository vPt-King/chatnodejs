const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: '10.0.88.20',
  user: 'root',
  password: '123',
  database: 'project',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});



module.exports = pool;
