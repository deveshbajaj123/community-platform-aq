const { Client, Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const setupDatabase = async () => {
  console.log('Setting up AquaTerra Community database...\n');

  // Use postgres superuser for database creation
  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: 'postgres',
    password: 'ranita58monster',
    database: 'postgres'
  });

  try {
    await adminClient.connect();
    console.log('Connected to PostgreSQL server');

    // Check if database exists
    const dbCheck = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'aquaterra_community']
    );

    if (dbCheck.rows.length === 0) {
      console.log(`Creating database: ${process.env.DB_NAME || 'aquaterra_community'}`);
      await adminClient.query(`CREATE DATABASE ${process.env.DB_NAME || 'aquaterra_community'}`);
      console.log('Database created successfully!');
    } else {
      console.log('Database already exists');
    }

    await adminClient.end();

    // Now connect to our database and run the schema
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: 'postgres',
      password: 'ranita58monster',
      database: process.env.DB_NAME || 'aquaterra_community'
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
