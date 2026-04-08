const { Client, Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const setupDatabase = async () => {
  console.log('Setting up AquaTerra Community database...\n');

  const dbName = process.env.DB_NAME || 'aquaterra_community';

  // If DATABASE_URL is set (Railway/production), skip database creation and just run schema
  if (process.env.DATABASE_URL) {
    console.log('DATABASE_URL detected — running schema on existing database...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(schema);
    console.log('Schema applied successfully!');
    await pool.end();
    console.log('\nDatabase setup complete!');
    return;
  }

  // Local development: create database if needed
  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'postgres'
  });

  try {
    await adminClient.connect();
    console.log('Connected to PostgreSQL server');

    // Check if database exists
    const dbCheck = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (dbCheck.rows.length === 0) {
      console.log(`Creating database: ${dbName}`);
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log('Database created successfully!');
    } else {
      console.log('Database already exists');
    }

    await adminClient.end();

    // Now connect to our database and run the schema
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: dbName
    });

    console.log('\nRunning schema...');
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(schema);
    console.log('Schema applied successfully!');

    await pool.end();
    console.log('\nDatabase setup complete!');

  } catch (error) {
    console.error('Error setting up database:', error.message);
    process.exit(1);
  }
};

setupDatabase();
