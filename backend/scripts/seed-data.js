const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'aquaterra_community'
});

const seedData = async () => {
  console.log('Seeding sample data...\n');

  try {
    // Create Director
    console.log('Creating director account...');
    const directorResult = await pool.query(`
      INSERT INTO members (google_id, email, full_name, avatar_url, class_grade, role, status, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO UPDATE SET role = 'director', status = 'active'
      RETURNING member_id, uuid, email, full_name
    `, [
      'google-director-001',
      'director@aquaterra.org',
      'Sarah Director',
      'https://ui-avatars.com/api/?name=Sarah+Director&background=2D6A4F&color=fff',
      'Staff',
      'director',
      'active',
      true
    ]);
    console.log(`  Created director: ${directorResult.rows[0].full_name} (${directorResult.rows[0].email})`);
    const directorId = directorResult.rows[0].member_id;

    // Create Active Members
    console.log('\nCreating active members...');
    const activeMembers = [
      { name: 'Alex Johnson', email: 'alex@example.com', grade: 'Grade 11', googleId: 'google-alex-001' },
      { name: 'Maya Patel', email: 'maya@example.com', grade: 'Grade 10', googleId: 'google-maya-001' },
      { name: 'James Wilson', email: 'james@example.com', grade: 'Grade 12', googleId: 'google-james-001' },
      { name: 'Emma Chen', email: 'emma@example.com', grade: 'Grade 11', googleId: 'google-emma-001' },
    ];

    const memberIds = [];
    for (const member of activeMembers) {
      const result = await pool.query(`
        INSERT INTO members (google_id, email, full_name, avatar_url, class_grade, role, status, is_active, approved_by, approved_at)
        VALUES ($1, $2, $3, $4, $5, 'member', 'active', true, $6, NOW())
        ON CONFLICT (email) DO UPDATE SET status = 'active'
        RETURNING member_id, full_name
      `, [
        member.googleId,
        member.email,
        member.name,
        `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`,
        member.grade,
        directorId
      ]);
      memberIds.push(result.rows[0].member_id);
      console.log(`  Created member: ${result.rows[0].full_name}`);
    }

    // Create Pending Members (for director to approve)
    console.log('\nCreating pending members...');
    const pendingMembers = [
      { name: 'Ryan Thompson', email: 'ryan@example.com', grade: 'Grade 9', reason: 'I want to join the environmental initiatives and help organize community clean-ups.' },
      { name: 'Sophia Lee', email: 'sophia@example.com', grade: 'Grade 10', reason: 'Interested in startup ventures and learning about entrepreneurship from peers.' },
    ];

    for (const member of pendingMembers) {
      const result = await pool.query(`
        INSERT INTO members (google_id, email, full_name, avatar_url, class_grade, join_reason, role, status, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, 'member', 'pending_approval', true)
        ON CONFLICT (email) DO NOTHING
        RETURNING full_name
      `, [
        `google-${member.name.toLowerCase().replace(' ', '-')}`,
        member.email,
        member.name,
        `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`,
        member.grade,
        member.reason
      ]);
      if (result.rows[0]) {
        console.log(`  Created pending member: ${result.rows[0].full_name}`);
      }
    }

    // Create Published Posts
    console.log('\nCreating published posts...');
    const posts = [
      {
        authorIdx: 0,
        category: 'events',
        body: 'Excited to announce our upcoming beach cleanup drive next Saturday! We\'ve partnered with the local environmental council to make this happen. Who\'s joining us? \n\nMeeting point: Central Beach Pavilion\nTime: 8:00 AM\nBring: Gloves, water bottle, and lots of enthusiasm!',
        status: 'published'
      },
      {
        authorIdx: 1,
        category: 'labs',
        body: 'Just launched my first app - a study group finder for students! It helps you connect with classmates working on the same subjects.\n\nWould love feedback from fellow AquaTerra members. Download link in my bio!',
        status: 'published'
      },
      {
        authorIdx: 2,
        category: 'welfare',
        body: 'Proud moment! Our robotics team just won 2nd place at the regional competition. Months of hard work paid off. Thanks to everyone who supported us throughout this journey.',
        status: 'published'
      },
      {
        authorIdx: 3,
        category: 'content',
        body: 'Started a 30-day meditation challenge. Day 7 complete! The difference in focus and stress management is already noticeable.\n\nAnyone else into mindfulness practices? Would love to start a small group for accountability.',
        status: 'published'
      },
      {
        authorIdx: 0,
        category: 'operations',
        body: 'AquaTerra monthly meetup this Friday!\n\nAgenda:\n- Project updates from all teams\n- New member introductions\n- Planning for upcoming semester\n\nPizza will be provided. See you all there!',
        status: 'published'
      },
    ];

    for (const post of posts) {
      const result = await pool.query(`
        INSERT INTO posts (author_id, category, body, status, reviewed_by, reviewed_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING post_id, category
      `, [
        memberIds[post.authorIdx],
        post.category,
        post.body,
        post.status,
        directorId
      ]);
      console.log(`  Created post: ${post.category} (by member ${post.authorIdx + 1})`);
    }

    // Create Pending Posts (for director to moderate)
    console.log('\nCreating pending posts for moderation...');
    const pendingPosts = [
      {
        authorIdx: 1,
        category: 'events',
        body: 'Planning to organize a book donation drive for underprivileged schools. Looking for volunteers to help collect and distribute books. Any interested members please comment!',
      },
      {
        authorIdx: 3,
        category: 'labs',
        body: 'Working on a sustainability tracking app that helps students monitor their carbon footprint. Need beta testers! The app will be ready by next month.',
      },
    ];

    for (const post of pendingPosts) {
      await pool.query(`
        INSERT INTO posts (author_id, category, body, status)
        VALUES ($1, $2, $3, 'pending_review')
      `, [
        memberIds[post.authorIdx],
        post.category,
        post.body
      ]);
      console.log(`  Created pending post: ${post.category}`);
    }

    // Add some likes
    console.log('\nAdding likes to posts...');
    const allPosts = await pool.query('SELECT post_id FROM posts WHERE status = $1', ['published']);
    for (const post of allPosts.rows) {
      // Random members like each post
      const likers = memberIds.filter(() => Math.random() > 0.3);
      for (const likerId of likers) {
        await pool.query(`
          INSERT INTO likes (post_id, member_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [post.post_id, likerId]);
      }
    }
    console.log('  Added random likes to posts');

    await pool.end();

    console.log('\n========================================');
    console.log('Sample data seeded successfully!');
    console.log('========================================');
    console.log('\nTest Accounts:');
    console.log('  Director: director@aquaterra.org');
    console.log('  Members: alex@example.com, maya@example.com, james@example.com, emma@example.com');
    console.log('\nNote: Use Google OAuth mock in LoginPage to sign in');
    console.log('========================================\n');

  } catch (error) {
    console.error('Error seeding data:', error.message);
    process.exit(1);
  }
};

seedData();
