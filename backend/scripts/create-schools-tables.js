require('dotenv').config();
const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false }
  : { host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD };

const pool = new Pool(poolConfig);

async function createTables() {
  const client = await pool.connect();

  try {
    console.log('Creating schools and classes tables...');

    await client.query(`
      -- Create schools table
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
    console.log('✓ Schools table created');

    await client.query(`
      -- Create classes table
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
    console.log('✓ Classes table created');

    // Add columns to members if they don't exist
    await client.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(school_id);`);
    await client.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(class_id);`);
    await client.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS bio TEXT;`);
    console.log('✓ Members table updated with school_id, class_id, bio columns');

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_members_school ON members(school_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_members_class ON members(class_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);`);
    console.log('✓ Indexes created');

    console.log('\n✅ All tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTables().catch(console.error);
