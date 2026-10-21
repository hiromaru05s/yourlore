-- Prior names have no provenance: never assume that a provider name was consented to.
ALTER TABLE users ADD COLUMN username_set INTEGER NOT NULL DEFAULT 0 CHECK(username_set IN (0,1));
-- Server-controlled test opponents have authored names, not provider identities.
UPDATE users SET username_set = 1 WHERE source = 'match-test-bot' AND password = 'bot-disabled' AND id GLOB 'lore-test-bot-[0-9][0-9]';
UPDATE users SET display = 'Seeker-' || lower(hex(randomblob(6))) WHERE username_set = 0;
-- Protect signups from the old Worker during the schema-first rolling release.
CREATE TRIGGER private_username_insert AFTER INSERT ON users WHEN NEW.username_set = 0 AND NOT (length(NEW.display) = 19 AND substr(NEW.display,1,7) = 'Seeker-' AND substr(NEW.display,8) NOT GLOB '*[^0-9a-f]*')
BEGIN
  UPDATE users SET display = 'Seeker-' || lower(hex(randomblob(6))) WHERE id = NEW.id;
END;
CREATE TRIGGER private_username_update AFTER UPDATE OF display ON users WHEN NEW.username_set = 0 AND NOT (length(NEW.display) = 19 AND substr(NEW.display,1,7) = 'Seeker-' AND substr(NEW.display,8) NOT GLOB '*[^0-9a-f]*')
BEGIN
  UPDATE users SET display = 'Seeker-' || lower(hex(randomblob(6))) WHERE id = NEW.id;
END;
