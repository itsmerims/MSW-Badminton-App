-- Smart Player Ingestor Migration
-- Run this script to add the new tables and fields for Viva Engage integration

-- Add full_name and display_name columns to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add unique constraint on full_name for upsert operations
ALTER TABLE players ADD CONSTRAINT players_full_name_key UNIQUE (full_name);

-- Add anon policy to players table for local development
DROP POLICY IF EXISTS "Allow full access for anon role" ON players;
CREATE POLICY "Allow full access for anon role" ON players
  FOR ALL USING (auth.role() = 'anon');

-- Create sessions table (for tracking play sessions on specific dates)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_date DATE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session participation join table (many-to-many relationship between sessions and players)
CREATE TABLE IF NOT EXISTS session_participation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, player_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_session_participation_session_id ON session_participation(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participation_player_id ON session_participation(player_id);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participation ENABLE ROW LEVEL SECURITY;

-- Allow full access for anon role (for local development)
CREATE POLICY "Allow full access for anon role" ON sessions
  FOR ALL USING (auth.role() = 'anon');

CREATE POLICY "Allow full access for anon role" ON session_participation
  FOR ALL USING (auth.role() = 'anon');

-- Allow full access for authenticated users
CREATE POLICY "Allow full access for authenticated users" ON sessions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow full access for authenticated users" ON session_participation
  FOR ALL USING (auth.role() = 'authenticated');

-- Allow full access for service role (admin operations)
CREATE POLICY "Allow full access for service role" ON sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow full access for service role" ON session_participation
  FOR ALL USING (auth.role() = 'service_role');
