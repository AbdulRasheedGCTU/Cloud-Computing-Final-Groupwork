/* ============================================================
   CampusHub — auth routes
   POST /api/auth/register  → create account (bcrypt-hashed password)
   POST /api/auth/login     → verify credentials, return JWT + user
   ============================================================ */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 10;

// POST /api/auth/register
// Body: { full_name: string, email: string, password: string }
router.post('/register', async (req, res, next) => {
  try {
    const { full_name, email, password } = req.body || {};

    if (!full_name || !String(full_name).trim()) {
      return res.status(400).json({ message: 'Full name is required.' });
    }
    if (!email || !EMAIL_RE.test(String(email).trim())) {
      return res.status(400).json({ message: 'A valid email address is required.' });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const fullName = String(full_name).trim();

    const [existing] = await pool.query(
      'SELECT user_id FROM users WHERE email = ?',
      [normalizedEmail]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);

    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
      [fullName, normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      message: 'Account created successfully.',
      user: {
        user_id: result.insertId,
        full_name: fullName,
        email: normalizedEmail,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/login
// Body: { email: string, password: string }
// Response: { token: <JWT>, user: { user_id, full_name, email } }
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const [rows] = await pool.query(
      'SELECT user_id, full_name, email, password_hash FROM users WHERE email = ?',
      [normalizedEmail]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const passwordMatches = await bcrypt.compare(String(password), user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, full_name: user.full_name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
