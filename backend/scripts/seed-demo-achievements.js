/**
 * Seed 2-4 external achievements per demo member (@demo.local).
 * Idempotent: skips members that already have achievements.
 */
const { pool } = require('../src/config/database');

const POOL = [
  { type: 'leadership', title: 'President, Rotaract Club', description: 'Led a 40-member chapter organizing monthly welfare drives across South Kolkata.' },
  { type: 'leadership', title: 'Head of Volunteers, Durga Puja Committee', description: 'Coordinated 120+ volunteers across 3 pandals during the festival week.' },
  { type: 'leadership', title: 'Captain, School Sports Team', description: 'Led the team to state-level finals two years running.' },
  { type: 'leadership', title: 'Student Council Secretary', description: 'Represented the student body and organized 12 campus-wide events.' },
  { type: 'academic', title: 'Dean\'s List', description: 'Top 5% of the cohort for academic performance.' },
  { type: 'academic', title: 'INSPIRE Scholarship', description: 'Awarded by the Department of Science & Technology, Government of India.' },
  { type: 'academic', title: 'Merit Scholarship — West Bengal Board', description: 'Recognized for top rank in Higher Secondary examinations.' },
  { type: 'academic', title: 'Research Publication, IEEE Student Conference', description: 'Co-authored paper on low-cost water quality sensing.' },
  { type: 'competition', title: 'Winner, Smart India Hackathon', description: 'Built a civic-tech solution for municipal grievance tracking.' },
  { type: 'competition', title: 'Runner-up, Inter-college Debate', description: 'All India Parliamentary Debate Championship.' },
  { type: 'competition', title: 'Gold Medal, State Science Olympiad', description: 'Ranked 1st in West Bengal regional round.' },
  { type: 'competition', title: 'Finalist, HULT Prize Regionals', description: 'Social enterprise pitch on urban food waste.' },
  { type: 'personal_project', title: 'Founder — Pathshala Weekend Tutoring', description: 'Free weekend tutoring for 60+ students from migrant communities in Topsia.' },
  { type: 'personal_project', title: 'Built Kolkata Bus-Tracker App', description: 'Open-source React Native app with 2k+ downloads on the Play Store.' },
  { type: 'personal_project', title: 'Documentary — Voices of the Sundarbans', description: 'Short film on climate displacement, screened at 3 regional festivals.' },
  { type: 'personal_project', title: 'Community Library, Khidirpur', description: 'Set up a 500-book neighbourhood library run by local volunteers.' },
];

function pickAchievements() {
  const count = 2 + Math.floor(Math.random() * 3); // 2-4
  const shuffled = [...POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomDateRange() {
  const now = new Date();
  const startYear = 2020 + Math.floor(Math.random() * 5); // 2020-2024
  const startMonth = Math.floor(Math.random() * 12);
  const start = new Date(startYear, startMonth, 1 + Math.floor(Math.random() * 27));
  const ongoing = Math.random() < 0.3;
  if (ongoing) return { start, end: null };
  const durationMonths = 1 + Math.floor(Math.random() * 18);
  const end = new Date(start);
  end.setMonth(end.getMonth() + durationMonths);
  if (end > now) return { start, end: null };
  return { start, end };
}

const fmt = (d) => d.toISOString().slice(0, 10);

async function run() {
  try {
    const { rows: members } = await pool.query(
      `SELECT m.member_id, m.full_name
       FROM members m
       WHERE m.email LIKE '%@demo.local'
       ORDER BY m.member_id`
    );

    if (members.length === 0) {
      console.log('No demo members found.');
      return;
    }

    console.log(`Found ${members.length} demo members.\n`);

    let inserted = 0;
    let skipped = 0;

    for (const m of members) {
      const existing = await pool.query(
        `SELECT COUNT(*)::int AS c FROM external_achievements WHERE member_id = $1`,
        [m.member_id]
      );
      if (existing.rows[0].c > 0) {
        console.log(`  - ${m.full_name}: already has ${existing.rows[0].c} achievement(s), skipping`);
        skipped++;
        continue;
      }

      const picks = pickAchievements();
      for (const p of picks) {
        const { start, end } = randomDateRange();
        await pool.query(
          `INSERT INTO external_achievements
             (member_id, title, description, achievement_type, achievement_date, achievement_end_date)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [m.member_id, p.title, p.description, p.type, fmt(start), end ? fmt(end) : null]
        );
      }
      console.log(`  + ${m.full_name}: added ${picks.length} achievement(s)`);
      inserted += picks.length;
    }

    console.log(`\nDone. Inserted ${inserted} achievements across ${members.length - skipped} members (${skipped} skipped).`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
