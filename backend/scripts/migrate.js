const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const getPool = () => {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'aquaterra_community',
  });
};

const runMigrations = async () => {
  console.log('Running migrations safely (skipping schema drops)...');
  const pool = getPool();
  try {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const migrations = fs.readdirSync(migrationsDir).sort();
    for (const file of migrations) {
      if (file.endsWith('.sql')) {
        console.log(`  Running: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await pool.query(sql);
      }
    }
    console.log('All migrations applied successfully!');
  } catch (error) {
    console.error('Error running migrations:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigrations();
