// backend/scripts/init-db.js
// Run: node backend/scripts/init-db.js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://pguser:pgpass@db:5432/kindergarten'
});

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await pool.query(sql);
}

async function seedAdmin() {
  const email = 'admin@school.test';
  const password = 'password123';
  const name = 'School Admin';
  const role = 'admin';

  const hashed = await bcrypt.hash(password, 10);
  const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
  if (exists.rows.length === 0) {
    await pool.query(
      'INSERT INTO users(email,password_hash,role,name,created_at) VALUES($1,$2,$3,$4,NOW())',
      [email, hashed, role, name]
    );
    console.log(`Seeded admin: ${email} / ${password}`);
  } else {
    console.log('Admin user already exists, skipping seed.');
  }
}

async function seedSampleData() {
  const s = await pool.query('SELECT id FROM students LIMIT 1');
  if (s.rows.length === 0) {
    await pool.query(
      `INSERT INTO students(first_name,last_name,dob,class_name,emergency_contact,created_at)
       VALUES ('Aisha','Rahman','2019-05-12','K1','Mother: 017xxxxxxxx',NOW())`
    );
    console.log('Seeded sample student.');
  } else {
    console.log('Students already exist, skipping sample seed.');
  }
}

async function main() {
  try {
    console.log('Running DB schema...');
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    await runSqlFile(schemaPath);
    console.log('Schema applied.');

    console.log('Seeding admin user...');
    await seedAdmin();

    console.log('Seeding sample data...');
    await seedSampleData();

    console.log('Done. Closing pool.');
  } catch (err) {
    console.error('Error initializing DB:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
