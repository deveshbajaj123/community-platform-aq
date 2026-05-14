/**
 * Seed 15 demo members, teams, and 15 demo posts about Kolkata drives.
 * Images are served from frontend/public/demo-images via the Vite dev server.
 */
const { pool } = require('../src/config/database');

const IMG_BASE = 'https://keen-surprise-production-9755.up.railway.app/demo-images';

const MEMBERS = [
  { email: 'aarav.sen@demo.local',     full_name: 'Aarav Sen',           class_grade: '11' },
  { email: 'ishita.roy@demo.local',    full_name: 'Ishita Roy',          class_grade: '12' },
  { email: 'rohan.dutta@demo.local',   full_name: 'Rohan Dutta',         class_grade: '10' },
  { email: 'anushka.basu@demo.local',  full_name: 'Anushka Basu',        class_grade: '11' },
  { email: 'kabir.ghosh@demo.local',   full_name: 'Kabir Ghosh',         class_grade: '12' },
  { email: 'meera.chatterjee@demo.local', full_name: 'Meera Chatterjee', class_grade: '9'  },
  { email: 'arjun.banerjee@demo.local',   full_name: 'Arjun Banerjee',   class_grade: '11' },
  { email: 'saanvi.mitra@demo.local',  full_name: 'Saanvi Mitra',        class_grade: '10' },
  { email: 'veer.bose@demo.local',     full_name: 'Veer Bose',           class_grade: '12' },
  { email: 'diya.mukherjee@demo.local',full_name: 'Diya Mukherjee',      class_grade: '11' },
  { email: 'aditya.das@demo.local',    full_name: 'Aditya Das',          class_grade: '10' },
  { email: 'riya.saha@demo.local',     full_name: 'Riya Saha',           class_grade: '12' },
  { email: 'dev.chakraborty@demo.local', full_name: 'Dev Chakraborty',   class_grade: '11' },
  { email: 'tanya.pal@demo.local',     full_name: 'Tanya Pal',           class_grade: '9'  },
  { email: 'neel.sengupta@demo.local', full_name: 'Neel Sengupta',       class_grade: '12' },
];

const TEAMS = [
  { name: 'Kolkata Outreach',   description: 'Grassroots welfare drives across Kolkata neighbourhoods.', category: 'welfare' },
  { name: 'Event Wizards',      description: 'Planning and running community events and festivals.',       category: 'events' },
  { name: 'Pathshala Initiative', description: 'Education drives and learning content for kids.',           category: 'content' },
  { name: 'Green Bengal',       description: 'Clean-up, plantation, and operations on the ground.',         category: 'operations' },
  { name: 'InnovLabs Kolkata',  description: 'Science, tech and digital literacy labs for students.',       category: 'labs' },
];

const POSTS = [
  {
    body: "Wrapped up our Children's Christmas Drive in Khidirpur today! We distributed gifts, sweets and warm clothes to 120+ kids. Huge thanks to everyone who turned up — the smiles were worth every second. @Ishita Roy @Rohan Dutta led the logistics flawlessly.",
    team: 'Event Wizards', category: 'events', extra: ['welfare'], image: 'christmas-khidirpur.jpeg',
    tags: ['Ishita Roy', 'Rohan Dutta', 'Meera Chatterjee'],
  },
  {
    body: "Christmas came early in Topsia! 🎄 Santa showed up (thanks @Kabir Ghosh) with 80 gift bags for the kids at the community centre. Carols, cake, chaos — and a lot of joy. Looking forward to making this an annual tradition.",
    team: 'Event Wizards', category: 'events', extra: ['welfare'], image: 'christmas-topsia.jpeg',
    tags: ['Kabir Ghosh', 'Anushka Basu', 'Diya Mukherjee'],
  },
  {
    body: "Our Pathshala education drive in Kanchrapara concluded this weekend. Over 6 sessions we covered basic English, math and storytelling with 40 kids from the local primary school. Grateful to the teachers who hosted us. @Meera Chatterjee shared some great curriculum notes.",
    team: 'Pathshala Initiative', category: 'content', extra: ['welfare'], image: 'education-kanchrapara.jpeg',
    tags: ['Meera Chatterjee', 'Saanvi Mitra', 'Tanya Pal'],
  },
  {
    body: "Spent the day running an education drive in the Sundarbans. Reached a school accessible only by boat — 55 kids, workbooks, and a solar-powered projector for a short science film. Reminder of why outreach beyond the city matters. @Aarav Sen @Veer Bose",
    team: 'Pathshala Initiative', category: 'content', extra: ['welfare'], image: 'education-sundarban.jpeg',
    tags: ['Aarav Sen', 'Veer Bose', 'Neel Sengupta'],
  },
  {
    body: "Food distribution drive at Park Circus today — 200 packed meals handed out in under two hours. The team is getting faster every week! Special shoutout to @Riya Saha for coordinating with the cooks.",
    team: 'Kolkata Outreach', category: 'welfare', extra: [], image: 'food-distribution.jpeg',
    tags: ['Riya Saha', 'Aditya Das'],
  },
  {
    body: "Our Diwali fundraising evening raised ₹1.8L for the winter welfare fund! 🎆 Massive thanks to every donor, every performer, and the backstage crew. Full breakdown of fund allocation coming next week.",
    team: 'Event Wizards', category: 'events', extra: ['operations'], image: 'fundraising-diwali.jpeg',
    tags: ['Kabir Ghosh', 'Ishita Roy', 'Dev Chakraborty'],
  },
  {
    body: "Book distribution in Howrah — 300+ storybooks and textbooks handed over to a local NGO-run library. A lot of Ruskin Bond, some Satyajit Ray, and a very excited group of readers. @Saanvi Mitra @Meera Chatterjee curated the selection.",
    team: 'Pathshala Initiative', category: 'content', extra: ['welfare'], image: 'education-kanchrapara.jpeg',
    tags: ['Saanvi Mitra', 'Meera Chatterjee'],
  },
  {
    body: "Winter clothes drive at Salt Lake wrapped up with 450+ garments collected and sorted. Distribution to 3 shelters happens next Saturday — DM if you can help with transport. @Arjun Banerjee coordinating.",
    team: 'Kolkata Outreach', category: 'welfare', extra: ['operations'], image: 'food-distribution.jpeg',
    tags: ['Arjun Banerjee', 'Diya Mukherjee'],
  },
  {
    body: "Free health & vision camp in Behala today with partner doctors. 90 check-ups, 34 pairs of reading glasses given out on the spot. Planning to make this quarterly. @Tanya Pal @Aditya Das managed the registration desk all day.",
    team: 'Kolkata Outreach', category: 'welfare', extra: ['events'], image: 'food-distribution.jpeg',
    tags: ['Tanya Pal', 'Aditya Das', 'Anushka Basu'],
  },
  {
    body: "Sunday morning cleanliness drive at Rabindra Sarobar — 18 of us, 22 bags of waste collected, and a much happier lake. Next target: the Princep Ghat stretch. @Neel Sengupta bringing gloves.",
    team: 'Green Bengal', category: 'operations', extra: ['events'], image: 'fundraising-diwali.jpeg',
    tags: ['Neel Sengupta', 'Dev Chakraborty', 'Rohan Dutta'],
  },
  {
    body: "Blood donation camp at Jadavpur collected 62 units today — thank you to every donor who showed up! Partnered with a local hospital's blood bank. @Veer Bose helped us hit our target in the last hour.",
    team: 'Event Wizards', category: 'events', extra: ['welfare'], image: 'food-distribution.jpeg',
    tags: ['Veer Bose', 'Riya Saha'],
  },
  {
    body: "Ran a hands-on science workshop for kids in Kalighat — slime, circuits, and a homemade volcano. The 'why does this happen?' questions were the best part of the day. @Dev Chakraborty built a fantastic circuit kit.",
    team: 'InnovLabs Kolkata', category: 'labs', extra: ['content'], image: 'education-kanchrapara.jpeg',
    tags: ['Dev Chakraborty', 'Aarav Sen', 'Saanvi Mitra'],
  },
  {
    body: "Tree plantation drive at the Maidan — 75 saplings in the ground, all tagged and mapped. We'll be back monthly to water and monitor. Thanks to the Parks Dept for the plot. @Neel Sengupta @Arjun Banerjee led the planting teams.",
    team: 'Green Bengal', category: 'operations', extra: ['events'], image: 'education-sundarban.jpeg',
    tags: ['Neel Sengupta', 'Arjun Banerjee'],
  },
  {
    body: "Celebrated Holi with the kids at a Ballygunge orphanage — organic colours, sweets, and a LOT of water balloons. Thank you @Diya Mukherjee for organising and @Ishita Roy for the playlist!",
    team: 'Event Wizards', category: 'events', extra: ['welfare'], image: 'christmas-topsia.jpeg',
    tags: ['Diya Mukherjee', 'Ishita Roy', 'Tanya Pal'],
  },
  {
    body: "Digital literacy drive in the Sundarbans — teaching teens to use free learning apps, email, and basic internet safety on donated tablets. Huge potential here. Planning a follow-up in 6 weeks. @Aarav Sen @Kabir Ghosh",
    team: 'InnovLabs Kolkata', category: 'labs', extra: ['welfare'], image: 'education-sundarban.jpeg',
    tags: ['Aarav Sen', 'Kabir Ghosh', 'Meera Chatterjee'],
  },
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find super admin (creator of teams)
    const adminRes = await client.query(
      "SELECT member_id FROM members WHERE is_super_admin = TRUE ORDER BY member_id ASC LIMIT 1"
    );
    if (adminRes.rows.length === 0) throw new Error('No super admin found. Run seed-director first.');
    const adminId = adminRes.rows[0].member_id;

    // 1. Insert members
    const memberIds = {};
    for (const m of MEMBERS) {
      const res = await client.query(
        `INSERT INTO members (email, full_name, class_grade, role, status, is_active)
         VALUES ($1, $2, $3, 'member', 'active', TRUE)
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, status = 'active', is_active = TRUE
         RETURNING member_id, full_name`,
        [m.email, m.full_name, m.class_grade]
      );
      memberIds[res.rows[0].full_name] = res.rows[0].member_id;
    }
    console.log(`Members ready: ${Object.keys(memberIds).length}`);

    // 2. Insert teams
    const teamIds = {};
    for (const t of TEAMS) {
      const existing = await client.query('SELECT team_id FROM teams WHERE name = $1', [t.name]);
      let teamId;
      if (existing.rows.length > 0) {
        teamId = existing.rows[0].team_id;
      } else {
        const res = await client.query(
          `INSERT INTO teams (name, description, category, is_active, created_by)
           VALUES ($1, $2, $3, TRUE, $4) RETURNING team_id`,
          [t.name, t.description, t.category, adminId]
        );
        teamId = res.rows[0].team_id;
      }
      teamIds[t.name] = teamId;
    }
    console.log(`Teams ready: ${Object.keys(teamIds).length}`);

    // 3. Assign each member to 1-3 teams (rotating)
    const teamNames = Object.keys(teamIds);
    const memberNames = Object.keys(memberIds);
    for (let i = 0; i < memberNames.length; i++) {
      const mName = memberNames[i];
      const mId = memberIds[mName];
      const assignments = [teamNames[i % teamNames.length], teamNames[(i + 2) % teamNames.length]];
      for (let j = 0; j < assignments.length; j++) {
        const role = j === 0 && i < 5 ? 'lead' : 'member';
        await client.query(
          `INSERT INTO team_members (team_id, member_id, role, is_active)
           VALUES ($1, $2, $3, TRUE)
           ON CONFLICT (team_id, member_id) DO NOTHING`,
          [teamIds[assignments[j]], mId, role]
        );
      }
    }
    console.log('Team memberships assigned.');

    // 4. Insert posts
    let postCount = 0;
    for (let i = 0; i < POSTS.length; i++) {
      const p = POSTS[i];
      const authorName = memberNames[i % memberNames.length];
      const authorId = memberIds[authorName];
      const teamId = teamIds[p.team];

      const dup = await client.query(
        'SELECT 1 FROM posts WHERE body = $1 AND author_id = $2 LIMIT 1',
        [p.body, authorId]
      );
      if (dup.rows.length > 0) {
        console.log(`Skipping duplicate post by ${authorName}`);
        continue;
      }

      const postRes = await client.query(
        `INSERT INTO posts (author_id, team_id, category, body, status, reviewed_by, reviewed_at)
         VALUES ($1, $2, $3, $4, 'published', $5, CURRENT_TIMESTAMP)
         RETURNING post_id`,
        [authorId, teamId, p.category, p.body, adminId]
      );
      const postId = postRes.rows[0].post_id;

      // Image
      const imageUrl = `${IMG_BASE}/${p.image}`;
      await client.query(
        `INSERT INTO post_images (post_id, blob_url, blob_name, display_order)
         VALUES ($1, $2, $3, 0)`,
        [postId, imageUrl, p.image]
      );

      // Categories (primary + extras)
      const allCats = [p.category, ...(p.extra || [])];
      for (const c of allCats) {
        await client.query(
          `INSERT INTO post_categories (post_id, category) VALUES ($1, $2)
           ON CONFLICT (post_id, category) DO NOTHING`,
          [postId, c]
        );
      }

      // Approvals for each category
      for (const c of allCats) {
        await client.query(
          `INSERT INTO post_approvals (post_id, category, approved_by)
           VALUES ($1, $2, $3) ON CONFLICT (post_id, category) DO NOTHING`,
          [postId, c, adminId]
        );
      }

      // Tags
      for (const tName of p.tags || []) {
        const tId = memberIds[tName];
        if (tId) {
          await client.query(
            `INSERT INTO post_tags (post_id, tagged_member_id) VALUES ($1, $2)
             ON CONFLICT (post_id, tagged_member_id) DO NOTHING`,
            [postId, tId]
          );
        }
      }

      // Likes: 4-10 random members like each post
      const shuffled = memberNames.slice().sort(() => Math.random() - 0.5);
      const likeCount = 4 + Math.floor(Math.random() * 7);
      for (let k = 0; k < likeCount && k < shuffled.length; k++) {
        const lId = memberIds[shuffled[k]];
        if (lId === authorId) continue;
        await client.query(
          `INSERT INTO likes (post_id, member_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [postId, lId]
        );
      }

      postCount++;
    }
    console.log(`Posts created: ${postCount}`);

    await client.query('COMMIT');
    console.log('\nDemo seed complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
