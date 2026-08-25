/* ============================================================
   CampusHub — image storage helper
   ------------------------------------------------------------
   Two storage backends, selected automatically at runtime:

     • Amazon S3  — when S3_BUCKET_NAME is set in backend/.env.
                    Uploads stream straight from memory to the
                    bucket via the AWS SDK (@aws-sdk/client-s3);
                    credentials come from the EC2 instance role
                    (default provider chain) on the deployed app.
                    Only the object URL is stored in image_url —
                    no image bytes are ever written to EC2 disk.

     • Local disk — otherwise (local development). Files land in
                    backend/uploads/ and are served from /uploads.

   The rest of the app only touches images through saveImage()/
   deleteImage() and the image_url column, so switching backends
   never touches the routes or the database.
   ============================================================ */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Folder used only by the local-disk backend.
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif'];

// Multer buffers uploads in memory on purpose: the bytes stay in file.buffer
// until saveImage() runs, so they can be streamed to S3 (or written to disk)
// in one step — no temp file on EC2 disk is ever needed.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter(req, file, cb) {
    const ext = getExtension(file.originalname);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      const err = new Error('Only image files are allowed (jpg, png, gif, webp, bmp).');
      err.statusCode = 400;
      return cb(err);
    }
    return cb(null, true);
  },
});

function getExtension(filename) {
  return path.extname(filename || '').toLowerCase();
}

function isS3Mode() {
  return Boolean(process.env.S3_BUCKET_NAME);
}

function uniqueObjectName(file) {
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${getExtension(file.originalname)}`;
}

let s3Client = null;
function getS3Client() {
  if (!s3Client) s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
  return s3Client;
}

function publicS3Url(objectKey) {
  const region = process.env.AWS_REGION || 'us-east-1';
  return `https://${process.env.S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${objectKey}`;
}

// Save an uploaded image (multer File object).
// Returns the URL to store in items.image_url, or null when no file was sent:
//   S3 mode → absolute https://<bucket>.s3.<region>.amazonaws.com/<key>
//   local   → /uploads/<name>  (served statically by server.js)
async function saveImage(file) {
  if (!file) return null;
  const objectKey = uniqueObjectName(file);

  if (isS3Mode()) {
    await getS3Client().send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: objectKey,
      Body: file.buffer,
      ContentType: file.mimetype || 'application/octet-stream',
    }));
    return publicS3Url(objectKey);
  }

  fs.writeFileSync(path.join(UPLOADS_DIR, objectKey), file.buffer);
  return `/uploads/${objectKey}`;
}

// Delete a stored image (S3 object or local file). Best-effort — never throws.
async function deleteImage(imageUrl) {
  if (!imageUrl) return;
  const name = path.basename(String(imageUrl).split('/').pop());
  if (!name) return;

  if (isS3Mode()) {
    try {
      await getS3Client().send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: name,
      }));
    } catch (err) {
      console.warn('[storage] failed to delete S3 object:', name, '-', err.message);
    }
    return;
  }

  try {
    fs.unlinkSync(path.join(UPLOADS_DIR, name));
  } catch (err) {
    // File already gone — nothing to clean up.
  }
}

module.exports = { upload, saveImage, deleteImage, UPLOADS_DIR };

