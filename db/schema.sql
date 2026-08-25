-- ============================================================
-- CampusHub — database schema
-- ------------------------------------------------------------
-- Create the database and both tables from scratch:
--     mysql -u root -p < db/schema.sql
-- (or `mysql -u root -p campushub < db/schema.sql` if the
--  database already exists)
-- ============================================================

CREATE DATABASE IF NOT EXISTS campushub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE campushub;

-- ------------------------------------------------------------------
-- users — every poster has exactly one account.
-- One user -> many items (1:N, enforced by the FK below).
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,            -- bcrypt, never plain text
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------
-- items — lost / found / service listings posted by users.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
  item_id       INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  title         VARCHAR(150) NOT NULL,
  description   TEXT NOT NULL,
  category      ENUM('LOST','FOUND','SERVICE') NOT NULL,
  location      VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  image_url     VARCHAR(255) NULL,
  status        ENUM('ACTIVE','RESOLVED') NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_items_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------
-- Indexes used by the API queries (feed ordering, ownership checks).
-- ------------------------------------------------------------------
CREATE INDEX idx_items_created_at ON items (created_at);
CREATE INDEX idx_items_user_id ON items (user_id);
