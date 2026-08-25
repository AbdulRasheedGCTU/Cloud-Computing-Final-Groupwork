/* ============================================================
   CampusHub — Express server entry point
   Reads PORT (and the DB/JWT settings) from backend/.env.
   ============================================================ */

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const { UPLOADS_DIR } = require('./utils/storage');

// Fail fast if the JWT secret is missing so routes never sign/verify with
// an empty key. Copy backend/.env.example to backend/.env and fill it in.
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set.');
  console.error('Copy backend/.env.example to backend/.env and fill in the values.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Local uploads folder (created here so it always exists, even in git clones).
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploaded images are served back to the frontend from /uploads/<filename>.
app.use('/uploads', express.static(UPLOADS_DIR));

// The plain-HTML frontend is served from here too, so in the AWS deployment
// the ALB delivers both the site and the API from the same origin.
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

// Lightweight health check for verifying the server is up.
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);

// JSON 404 for any unknown API route.
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Central error handler — every failure answers with JSON, never HTML.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error.';

  // Multer's built-in limit errors (e.g. file too large) carry a code.
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    status = 400;
    message = 'Image file is too large. Maximum size is 5 MB.';
  }

  if (status >= 500) {
    console.error('[server error]', err);
    message = 'Internal server error.';
  }

  return res.status(status).json({ message });
});

app.listen(PORT, () => {
  console.log(`CampusHub API listening on http://localhost:${PORT}`);
});
