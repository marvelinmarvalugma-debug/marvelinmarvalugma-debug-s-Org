
/**
 * ERP BRIDGE - CONECTOR SQL SERVER v3.2 (Optimizado para Site4Now)
 * Ejecutar con: node server.js
 */

const express = require('express');
const mssql = require('mssql');
const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

const sqlConfig = {
  user: 'db_ac3772_enterpriseadmindb_admin',
  password: 'Libre2021$',
  server: 'SQL5113.site4now.net', 
  database: 'db_ac3772_enterpriseadmindb',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000
  }
};

let pool = null;

async function getPool() {
  if (pool && pool.connected) return pool;
  try {
    console.log(`[${new Date().toLocaleTimeString()}] 🌐 Intentando conectar a Site4Now...`);
    pool = await mssql.connect(sqlConfig);
    console.log(`[${new Date().toLocaleTimeString()}] ✅ CONECTADO A SQL REMOTO`);
    return pool;
  } catch (err) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ ERROR:`, err.message);
    throw err;
  }
}

// Prueba de conexión rápida
app.get('/health', async (req, res) => {
  const start = Date.now();
  try {
    await getPool();
    const latencia = Date.now() - start;
    res.json({ 
      status: 'OK', 
      db: 'Site4Now Online', 
      latency: `${latencia}ms`,
      server: sqlConfig.server 
    });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
});

// Lectura de Productos
app.get('/products', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query(`
      SELECT TOP 100 
        CodProd as id, 
        CodProd as code, 
        Descrip as name, 
        Precio1 as price, 
        Existen as stock 
      FROM dbo.saprod 
      WHERE Existen > 0
      ORDER BY Descrip ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lectura de Clientes
app.get('/customers', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query(`
      SELECT TOP 200 CodClie as id, Descrip as name 
      FROM dbo.sacli 
      ORDER BY Descrip ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 SERVIDOR BRIDGE ACTIVO EN PUERTO ${PORT}`);
  console.log(`📡 APUNTANDO A: SQL5113.site4now.net`);
  console.log(`--------------------------------------------------`);
  console.log(`Si la App no carga productos, verifica:`);
  console.log(`1. Que Site4Now permita conexiones desde tu IP.`);
  console.log(`2. Que hayas autorizado 'Contenido no seguro' en el navegador.`);
  console.log(`--------------------------------------------------\n`);
});
