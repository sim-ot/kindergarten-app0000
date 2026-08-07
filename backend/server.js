require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// File upload setup
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// --- Auth helpers ---
async function createUser(email, password, role, name) {
  const hashed = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO users(email,password_hash,role,name) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
    [email, hashed, role, name]
  );
}

async function verifyUser(email, password) {
  const res = await pool.query('SELECT id,email,password_hash,role,name FROM users WHERE email=$1', [email]);
  if (!res.rows[0]) return null;
  const user = res.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  delete user.password_hash;
  return user;
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function roleCheck(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// --- Routes ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await verifyUser(email, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

// Example: Students CRUD
app.get('/api/students', authMiddleware, async (req, res) => {
  const result = await pool.query('SELECT * FROM students ORDER BY id');
  res.json(result.rows);
});

app.post('/api/students', authMiddleware, roleCheck(['admin','teacher']), upload.single('photo'), async (req, res) => {
  const { first_name, last_name, dob, class_name, emergency_contact } = req.body;
  const photo = req.file ? `/uploads/${path.basename(req.file.path)}` : null;
  const result = await pool.query(
    `INSERT INTO students(first_name,last_name,dob,class_name,emergency_contact,photo) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [first_name,last_name,dob,class_name,emergency_contact,photo]
  );
  res.json(result.rows[0]);
});

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on ${port}`));
