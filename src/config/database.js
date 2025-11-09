const { Pool } = require('pg');
require('dotenv').config({ path: './config.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Probar la conexión
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Conexión a PostgreSQL exitosa');
    client.release();
    return true;
  } catch (error) {
    console.error('Error conectando a PostgreSQL:', error.message);
    return false;
  }
}

// Ejecutar consultas normales
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query ejecutada:', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error en la consulta:', error.message);
    throw error;
  }
}

// Obtener cliente para transacciones
async function getClient() {
  const client = await pool.connect();
  return client;
}

module.exports = { pool, query, testConnection, getClient };
