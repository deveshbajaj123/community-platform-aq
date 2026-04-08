/**
 * Seed Director Account
 *
 * This script creates a director account directly in the database.
 * Directors can ONLY be created via this script - there is no self-registration.
 *
 * Usage: node scripts/seed-director.js
 *
 * You will be prompted for the director's details.
 */

const readline = require('readline');
const { pool } = require('../src/config/database');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function seedDirector() {
  console.log('\n==================================================');
  console.log('   AquaTerra Community Platform - Seed Director');
  console.log('==================================================\n');

  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully.\n');

    // Get director details
    const email = await question('Director email: ');
    const fullName = await question('Director full name: ');
    const googleId = await question('Google ID (from Google OAuth, or leave blank): ');

    if (!email || !fullName) {
      console.error('\nError: Email and full name are required.');
      process.exit(1);
    }

    // Check if email already exists
    const existing = await pool.query(
      'SELECT member_id, role FROM members WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      if (existing.rows[0].role === 'director') {
        console.log('\nThis email is already registered as a director.');
        process.exit(0);
      } else {
        // Upgrade to director
        await pool.query(
          `UPDATE members SET role = 'director', status = 'active' WHERE email = $1`,
          [email]
        );
        console.log('\nExisting member upgraded to director successfully!');
        process.exit(0);
      }
    }

    // Create new director
    const result = await pool.query(
      `INSERT INTO members (email, full_name, google_id, role, status, is_active)
       VALUES ($1, $2, $3, 'director', 'active', TRUE)
       RETURNING member_id, uuid, email, full_name, role`,
      [email, fullName, googleId || null]
    );

    const director = result.rows[0];

    console.log('\n==================================================');
    console.log('   Director created successfully!');
    console.log('==================================================');
    console.log(`   ID:    ${director.member_id}`);
    console.log(`   UUID:  ${director.uuid}`);
    console.log(`   Email: ${director.email}`);
    console.log(`   Name:  ${director.full_name}`);
    console.log(`   Role:  ${director.role}`);
    console.log('==================================================\n');

    if (!googleId) {
      console.log('Note: No Google ID was provided. The director will need to');
      console.log('update their Google ID when they first sign in with Google.\n');
    }

  } catch (error) {
    console.error('\nError seeding director:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
}

seedDirector();
