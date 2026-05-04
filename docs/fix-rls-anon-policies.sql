-- Fix RLS Policies for Anon Role
-- Run this script to add anon role policies for local development

-- Add anon policy to players table
DROP POLICY IF EXISTS "Allow full access for anon role" ON players;
CREATE POLICY "Allow full access for anon role" ON players
  FOR ALL USING (auth.role() = 'anon');

-- Add anon policy to sessions table
DROP POLICY IF EXISTS "Allow full access for anon role" ON sessions;
CREATE POLICY "Allow full access for anon role" ON sessions
  FOR ALL USING (auth.role() = 'anon');

-- Add anon policy to session_participation table
DROP POLICY IF EXISTS "Allow full access for anon role" ON session_participation;
CREATE POLICY "Allow full access for anon role" ON session_participation
  FOR ALL USING (auth.role() = 'anon');
