const dotenv = require('dotenv');
dotenv.config({ path: './config.env' }); // ✅ este es el nombre correcto

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

pool.connect()
  .then(() => console.log('✅ Conectado a PostgreSQL local'))
  .catch(err => console.error('❌ Error al conectar:', err));

module.exports = pool;
