/* ============================================================
   CampusHub — item routes
   GET    /api/items      → all listings (public feed filters to ACTIVE)
   GET    /api/items/:id  → one listing's full detail
   POST   /api/items      → create (auth, multipart/form-data)
   PUT    /api/items/:id  → update / mark resolved (auth, owner only)
   DELETE /api/items/:id  → delete listing + image (auth, owner only)
   ============================================================ */

const express = require('express');
const pool = require('../config/db');
const { authRequired } = require('../middleware/auth');
const { upload, saveImage, deleteImage } = require('../utils/storage');

const router = express.Router();

const CATEGORIES = ['LOST', 'FOUND', 'SERVICE'];
const STATUSES = ['ACTIVE', 'RESOLVED'];

// Every items column plus the poster's full_name, for cards and details.
const ITEM_SELECT = `
  i.item_id, i.user_id, i.title, i.description, i.category, i.location,
  i.contact_phone, i.image_url, i.status, i.created_at, u.full_name
`;

async function findItemById(itemId) {
  const [rows] = await pool.query(
    `SELECT ${ITEM_SELECT}
       FROM items i
       JOIN users u ON u.user_id = i.user_id
      WHERE i.item_id = ?`,
    [itemId]
  );
  return rows[0] || null;
}

// GET /api/items — newest first. The public feed keeps only ACTIVE listings,
// while the dashboard needs RESOLVED ones too, so the API returns everything.
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${ITEM_SELECT}
         FROM items i
         JOIN users u ON u.user_id = i.user_id
        ORDER BY i.created_at DESC, i.item_id DESC`
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

// GET /api/items/:id
router.get('/:id', async (req, res, next) => {
  try {
    const item = await findItemById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    return res.json(item);
  } catch (err) {
    return next(err);
  }
});

// POST /api/items — multipart fields: title, description, category,
// location, contact_phone, image (file). Requires a logged-in user.
router.post('/', authRequired, upload.single('image'), async (req, res, next) => {
  try {
    const { title, description, category, location, contact_phone } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Title is required.' });
    }
    if (!description || !String(description).trim()) {
      return res.status(400).json({ message: 'Description is required.' });
    }
    if (!category || !CATEGORIES.includes(String(category).toUpperCase())) {
      return res.status(400).json({ message: 'Category must be LOST, FOUND or SERVICE.' });
    }
    if (!location || !String(location).trim()) {
      return res.status(400).json({ message: 'Location is required.' });
    }
    if (!contact_phone || !String(contact_phone).trim()) {
      return res.status(400).json({ message: 'Contact phone is required.' });
    }

    let imageUrl = null;
    if (req.file) imageUrl = await saveImage(req.file);

    try {
      const [result] = await pool.query(
        `INSERT INTO items
           (user_id, title, description, category, location, contact_phone, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.user_id,
          String(title).trim(),
          String(description).trim(),
          String(category).toUpperCase(),
          String(location).trim(),
          String(contact_phone).trim(),
          imageUrl,
        ]
      );

      const item = await findItemById(result.insertId);
      return res.status(201).json(item);
    } catch (dbErr) {
      // The image was already written to S3/disk — don't leave an orphan behind.
      if (imageUrl) await deleteImage(imageUrl);
      throw dbErr;
    }
  } catch (err) {
    return next(err);
  }
});

// PUT /api/items/:id — partial update (JSON or multipart). Owner only.
router.put('/:id', authRequired, upload.single('image'), async (req, res, next) => {
  try {
    const item = await findItemById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    if (Number(item.user_id) !== Number(req.user.user_id)) {
      return res.status(403).json({ message: 'You can only update your own listings.' });
    }

    const body = req.body || {};
    const sets = [];
    const values = [];

    if (body.title !== undefined && String(body.title).trim() !== '') {
      sets.push('title = ?');
      values.push(String(body.title).trim());
    }
    if (body.description !== undefined && String(body.description).trim() !== '') {
      sets.push('description = ?');
      values.push(String(body.description).trim());
    }
    if (body.location !== undefined && String(body.location).trim() !== '') {
      sets.push('location = ?');
      values.push(String(body.location).trim());
    }
    if (body.contact_phone !== undefined && String(body.contact_phone).trim() !== '') {
      sets.push('contact_phone = ?');
      values.push(String(body.contact_phone).trim());
    }
    if (body.category !== undefined && String(body.category).trim() !== '') {
      const category = String(body.category).toUpperCase();
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ message: 'Category must be LOST, FOUND or SERVICE.' });
      }
      sets.push('category = ?');
      values.push(category);
    }
    if (body.status !== undefined && String(body.status).trim() !== '') {
      const status = String(body.status).toUpperCase();
      if (!STATUSES.includes(status)) {
        return res.status(400).json({ message: 'Status must be ACTIVE or RESOLVED.' });
      }
      sets.push('status = ?');
      values.push(status);
    }

    // Optional image replacement on edit.
    let newImageUrl = null;
    if (req.file) {
      newImageUrl = await saveImage(req.file);
      sets.push('image_url = ?');
      values.push(newImageUrl);
    }

    if (sets.length === 0) {
      return res.status(400).json({ message: 'Nothing to update.' });
    }

    values.push(req.params.id);

    try {
      await pool.query(`UPDATE items SET ${sets.join(', ')} WHERE item_id = ?`, values);
      if (newImageUrl) await deleteImage(item.image_url); // old object is now unreferenced
      const updated = await findItemById(req.params.id);
      return res.json(updated);
    } catch (dbErr) {
      if (newImageUrl) await deleteImage(newImageUrl);
      throw dbErr;
    }
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/items/:id — removes the row and its stored image. Owner only.
router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const item = await findItemById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    if (Number(item.user_id) !== Number(req.user.user_id)) {
      return res.status(403).json({ message: 'You can only delete your own listings.' });
    }

    await pool.query('DELETE FROM items WHERE item_id = ?', [req.params.id]);
    await deleteImage(item.image_url);

    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

