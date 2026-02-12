-- Store user timezone so "Daily launch" is in their local time (e.g. 11:00 = 11h chez toi).
ALTER TABLE user_schedule
  ADD COLUMN IF NOT EXISTS timezone TEXT;

COMMENT ON COLUMN user_schedule.timezone IS 'IANA timezone (e.g. Europe/Paris). Null = UTC. launch_time is interpreted in this timezone.';
