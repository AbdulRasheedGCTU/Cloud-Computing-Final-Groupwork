# CampusHub

A platform for university students to report **lost / found** items on campus or list **student-to-student services**.
Plain HTML/CSS/JS frontend, Node.js + Express REST API, and a local MySQL database.

```
Website/
├── backend/                 Express API (JWT auth, multer image upload)
├── db/                      schema.sql + optional seed.sql
├── frontend/                plain HTML/CSS/JS (no build step)
└── README.md
```

---

## 1. Requirements

- **Node.js** 18+ (tested on Node 24)
- **npm**
- **MySQL** 8.x (or MariaDB) running locally

---

## 2. Create the database

From the project root, run the schema script (it creates the `campushub`
database and the `users` + `items` tables):

```bash
mysql -u root -p < db/schema.sql
```

Optional sample data (three users, four listings — all seeded accounts log in
with password `password123`):

```bash
mysql -u root -p < db/seed.sql
```

The app works correctly with an **empty** database — nothing in the code
depends on the seed rows.

---

## 3. Configure the backend

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in the values:

| Key          | Example                  |
|--------------|--------------------------|
| `PORT`       | `5000`                   |
| `DB_HOST`    | `localhost`              |
| `DB_USER`    | `root`                   |
| `DB_PASSWORD`| your MySQL password      |
| `DB_NAME`    | `campushub`              |
| `JWT_SECRET` | a long random string     |

> Images are stored on disk under `backend/uploads/` in this build and served
> from `/uploads`. The `.env.example` includes commented-out `AWS_*` keys and
> `S3_BUCKET_NAME` placeholders — to swap in Amazon S3 later, uncomment them
> and update only `backend/utils/storage.js`.

---

## 4. Install and run the backend

```bash
cd backend
npm install          # installs express, mysql2, bcrypt, jsonwebtoken, dotenv, multer, cors (+ nodemon)
npm run dev          # nodemon — restarts on file changes
# or
npm start            # plain node
```

The API will be available at `http://localhost:5000`:

- `GET /api/health` — simple up check

### API endpoints

| Method | Endpoint            | Auth? | Description                              |
|--------|---------------------|-------|------------------------------------------|
| POST   | `/api/auth/register`| No    | Create account (`full_name`, `email`, `password`) — bcrypt hashed |
| POST   | `/api/auth/login`   | No    | Returns `{ token, user }`                 |
| GET    | `/api/items`        | No    | All listings (each includes poster's `full_name`) |
| GET    | `/api/items/:id`    | No    | Single listing full detail                |
| POST   | `/api/items`        | Yes   | Create listing — multipart fields `title`, `description`, `category` (`LOST`/`FOUND`/`SERVICE`), `location`, `contact_phone`, `image` (file) |
| PUT    | `/api/items/:id`    | Yes   | Update / mark `RESOLVED` (owner only, 403 otherwise) |
| DELETE | `/api/items/:id`    | Yes   | Delete listing + its image (owner only)   |

Authenticated calls send the JWT as `Authorization: Bearer <token>`.

---

## 5. Run the frontend

The frontend is plain HTML/CSS/JS with no build step. Serve the folder with any
static server, e.g.:

```bash
npx serve frontend
```

Then open **http://localhost:3000** (or whatever `serve` prints). The frontend
talks to the API at `http://localhost:5000` — change `BASE_URL` in
`frontend/js/api.js` if your backend runs on a different host/port.

> The backend also serves the frontend statically (see `server.js`), so the app
> works from a single origin when deployed — in that case set `BASE_URL` to `""`.

Pages:
- `index.html` — public feed with All / Lost / Found / Services filters and a
  "Post an item" modal (multipart upload with photo).
- `login.html` / `register.html` — JWT-based auth; on success you land on the
  dashboard.
- `dashboard.html` — only *your* posts, with Edit / Delete / Mark as Resolved.

---

## 6. Run it end to end

```bash
# 1. Database
mysql -u root -p < db/schema.sql          # required
mysql -u root -p < db/seed.sql            # optional sample data

# 2. Backend (terminal 1)
cd backend
cp .env.example .env                      # then edit .env
npm install
npm run dev

# 3. Frontend (terminal 2)
npx serve frontend
```

Open http://localhost:3000, register or log in, and post a listing.

---

## 7. AWS deployment

CampusHub is also deployed on AWS Free Tier (ALB → 2× EC2 in two AZs, private
RDS MySQL, S3 image storage, CloudWatch monitoring). Two documents describe it:

- **`AWS_BUILD_SUMMARY.md`** — completed-state write-up for the Final Technical
  Report (Cloud Architecture & Security section) and the Deployment Proof
  Portfolio.
- **`DEPLOYMENT.md`** — step-by-step rebuild/verification guide for the team.

On AWS, uploaded images stream straight to S3 via the AWS SDK and only the
object URL is stored in `items.image_url` (set `S3_BUCKET_NAME` in
`backend/.env` to enable S3 mode; leave it empty to keep using local disk).

---

## Notes

- `frontend/js/data.js` (the old mock data file) has been removed — every
  screen reads from the live API through `frontend/js/api.js`.
- The public feed shows only `ACTIVE` listings; `GET /api/items` returns all
  listings so the dashboard can display and manage your `RESOLVED` posts too.
- `backend/uploads/`, `backend/.env` and `node_modules/` are git-ignored.

