-- ============================================================
-- CampusHub — optional seed data
-- ------------------------------------------------------------
-- OPTIONAL: run only if you want a few example postings before
-- posting your own. The app itself works fine with an empty
-- database — nothing in the code depends on these rows.
--
--     mysql -u root -p < db/seed.sql
--
-- Every seeded account logs in with password: password123
-- ============================================================

USE campushub;

-- Passwords below are bcrypt hashes of "password123" (salted, so the
-- hash is not reversible). Never store plain-text passwords.
INSERT INTO users (full_name, email, password_hash)
VALUES
  ('Ama Boateng',  'ama.boateng@gctu.edu.gh',  '$2b$10$1ji6QgKpdrdY4jPVghcAou1VVVdJ6WYd5PARnS1xJoVTy85FZr7Xm'),
  ('Kojo Mensah',  'kojo.mensah@gctu.edu.gh',  '$2b$10$1ji6QgKpdrdY4jPVghcAou1VVVdJ6WYd5PARnS1xJoVTy85FZr7Xm'),
  ('Efua Owusu',   'efua.owusu@gctu.edu.gh',   '$2b$10$1ji6QgKpdrdY4jPVghcAou1VVVdJ6WYd5PARnS1xJoVTy85FZr7Xm');

INSERT INTO items
  (user_id, title, description, category, location, contact_phone, image_url, status)
VALUES
  (
    (SELECT user_id FROM users WHERE email = 'kojo.mensah@gctu.edu.gh'),
    'Black North Face backpack',
    'Left in the CS lab (Block C, Room C4) after the 2pm Python class. Has a laptop sleeve and a blue keychain on the zipper.',
    'LOST',
    'Block C, Room C4',
    '055 123 4567',
    NULL,
    'ACTIVE'
  ),
  (
    (SELECT user_id FROM users WHERE email = 'efua.owusu@gctu.edu.gh'),
    'Casio scientific calculator',
    'Found under a bench near the library entrance. Name "E. Owusu" is scratched on the back.',
    'FOUND',
    'Library entrance',
    '024 987 6543',
    NULL,
    'ACTIVE'
  ),
  (
    (SELECT user_id FROM users WHERE email = 'ama.boateng@gctu.edu.gh'),
    'Group tutoring — Networking (CSSD 209)',
    'Offering peer tutoring sessions on OSI/TCP-IP models ahead of the quiz. Small groups, weekday evenings.',
    'SERVICE',
    'Student Centre, Room 3',
    '020 555 1122',
    NULL,
    'ACTIVE'
  ),
  (
    (SELECT user_id FROM users WHERE email = 'ama.boateng@gctu.edu.gh'),
    'Silver house key on red lanyard',
    'Found near the main gate security post yesterday evening. Handed in — owner has been contacted.',
    'FOUND',
    'Main gate',
    '020 555 1122',
    NULL,
    'RESOLVED'
  );
