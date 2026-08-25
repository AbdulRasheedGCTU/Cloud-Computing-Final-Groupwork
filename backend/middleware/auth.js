/* ============================================================
   CampusHub — JWT authentication middleware
   Verifies the `Authorization: Bearer <token>` header on
   protected routes and attaches the decoded user to req.user.
   ============================================================ */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required. Please log in.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      user_id: payload.user_id,
      full_name: payload.full_name,
      email: payload.email,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
  }
}

module.exports = { authRequired };
