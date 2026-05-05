const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function runMigration(filename) {
  const filePath = path.join(__dirname, '..', 'migrations', filename);

  console.log(`Running migration: ${filename}`);

  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log(`Migration ${filename} completed successfully!`);
  } catch (error) {
    console.error(`Migration ${filename} failed:`, error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Get migration filename from command line args
const migrationFile = process.argv[2] || '002_phase3_projects_teams.sql';
runMigration(migrationFile);
