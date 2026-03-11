-- Add username + login email for auth mapping
ALTER TABLE profiles
  ADD COLUMN username text,
  ADD COLUMN email_login text;

-- Backfill email_login from auth.users if possible
UPDATE profiles p
SET email_login = u.email
FROM auth.users u
WHERE u.id = p.id
  AND p.email_login IS NULL;

-- Backfill username from email_login (best-effort)
WITH base AS (
  SELECT p.id,
         lower(regexp_replace(split_part(p.email_login, '@', 1), '[^a-z0-9._-]', '', 'g')) AS base
  FROM profiles p
),
normalized AS (
  SELECT id,
         CASE
           WHEN base IS NULL OR base = '' THEN 'user' || right(id::text, 8)
           ELSE base
         END AS base2
  FROM base
),
dedup AS (
  SELECT id,
         CASE
           WHEN row_number() OVER (PARTITION BY base2 ORDER BY id) = 1
             THEN base2
           ELSE base2 || '_' || row_number() OVER (PARTITION BY base2 ORDER BY id)
         END AS username
  FROM normalized
)
UPDATE profiles p
SET username = d.username
FROM dedup d
WHERE p.id = d.id
  AND p.username IS NULL;

ALTER TABLE profiles
  ADD CONSTRAINT chk_username_lower CHECK (username = lower(username)),
  ADD CONSTRAINT chk_username_format CHECK (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');

CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_username ON profiles (username);
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_email_login ON profiles (lower(email_login));

ALTER TABLE profiles
  ALTER COLUMN email_login SET NOT NULL;
