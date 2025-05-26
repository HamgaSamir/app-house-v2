
require('dotenv').config();
const mysql = require('mysql2'); 


const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) throw err;
  console.log("Connecté à MySQL !");
});

db.query('SELECT DATABASE() AS db', (err, result) => {
  if (!err) console.log('Connecté à la base :', result[0].db);
});

module.exports = db;
