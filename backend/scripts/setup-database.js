const { Client, Pool } = require('pg');
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

const setupDatabase = async () => {
  console.log('Setting up AquaTerra Community database...\n');

  const dbName = process.env.DB_NAME || 'aquaterra_community';

  // Local development only: create database if needed
  if (!process.env.DATABASE_URL) {
    const adminClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: 'postgres'
    });

    try {
      await adminClient.connect();
      const dbCheck = await adminClient.query(
        "SELECT 1 FROM pg_database WHERE datname = $1", [dbName]
      );
      if (dbCheck.rows.length === 0) {
        console.log(`Creating database: ${dbName}`);
        await adminClient.query(`CREATE DATABASE ${dbName}`);
        console.log('Database created successfully!');
      } else {
        console.log('Database already exists');
      }
    } finally {
      await adminClient.end();
    }
  }

  const pool = getPool();

  try {
    // 1. Run main schema
    console.log('Running main schema...');
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Schema applied successfully!');

    // 2. Create schools and classes tables
    console.log('\nCreating schools and classes tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schools (
        school_id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL UNIQUE,
        short_name VARCHAR(50),
        logo_url TEXT,
        location VARCHAR(255),
        website VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS classes (
        class_id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        school_id INTEGER REFERENCES schools(school_id),
        name VARCHAR(100) NOT NULL,
        grade_level VARCHAR(50),
        academic_year VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, name, academic_year)
      );
    `);
    await pool.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(school_id);`);
    await pool.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(class_id);`);
    await pool.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS bio TEXT;`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_members_school ON members(school_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_members_class ON members(class_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);`);
    console.log('Schools and classes tables created!');

    // 3. Run all migrations
    console.log('\nRunning migrations...');
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const migrations = fs.readdirSync(migrationsDir).sort();
    for (const file of migrations) {
      if (file.endsWith('.sql')) {
        console.log(`  Running: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await pool.query(sql);
      }
    }
    console.log('All migrations applied!');

    console.log('\nDatabase setup complete!');
  } catch (error) {
    console.error('Error setting up database:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

setupDatabase();
