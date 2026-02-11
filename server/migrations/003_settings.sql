CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  notifications_enabled INTEGER NOT NULL,
  notifications_recipients TEXT NOT NULL,
  notifications_events TEXT NOT NULL
);

INSERT INTO settings (
  id,
  notifications_enabled,
  notifications_recipients,
  notifications_events
) VALUES (
  1,
  1,
  '[]',
  '[]'
) ON CONFLICT(id) DO NOTHING;
