const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'db4free.net',
  user: 'ocsupport',
  password: 'rayane2009+',
  database: 'school_app1'
});

db.connect((err) => {
  if (err) throw err;
  console.log("Connecté à MySQL !");
});

module.exports = db;
