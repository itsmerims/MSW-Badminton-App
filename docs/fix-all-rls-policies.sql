-- Fix RLS Policies for All Tables
-- Run this script to add anon role policies for all tables needed for dashboard operations

-- Add anon policy to players table
DROP POLICY IF EXISTS "Allow full access for anon role" ON players;
CREATE POLICY "Allow full access for anon role" ON players
  FOR ALL USING (auth.role() = 'anon');

-- Add anon policy to courts table
DROP POLICY IF EXISTS "Allow full access for anon role" ON courts;
CREATE POLICY "Allow full access for anon role" ON courts
  FOR ALL USING (auth.role() = 'anon');

-- Add anon policy to queue table
DROP POLICY IF EXISTS "Allow full access for anon role" ON queue;
CREATE POLICY "Allow full access for anon role" ON queue
  FOR ALL USING (auth.role() = 'anon');

-- Add anon policy to matches table
DROP POLICY IF EXISTS "Allow full access for anon role" ON matches;
CREATE POLICY "Allow full access for anon role" ON matches
  FOR ALL USING (auth.role() = 'anon');

-- Add anon policy to sessions table
DROP POLICY IF EXISTS "Allow full access for anon role" ON sessions;
CREATE POLICY "Allow full access for anon role" ON sessions
  FOR ALL USING (auth.role() = 'anon');

-- Add anon policy to session_participation table
DROP POLICY IF EXISTS "Allow full access for anon role" ON session_participation;
CREATE POLICY "Allow full access for anon role" ON session_participation
  FOR ALL USING (auth.role() = 'anon');

-- Add anon policy to fees table
DROP POLICY IF EXISTS "Allow full access for anon role" ON fees;
CREATE POLICY "Allow full access for anon role" ON fees
  FOR ALL USING (auth.role() = 'anon');

-- Add anon policy to payment_methods table
DROP POLICY IF EXISTS "Allow full access for anon role" ON payment_methods;
CREATE POLICY "Allow full access for anon role" ON payment_methods
  FOR ALL USING (auth.role() = 'anon');

-- Add anon policy to settings table
DROP POLICY IF EXISTS "Allow full access for anon role" ON settings;
CREATE POLICY "Allow full access for anon role" ON settings
  FOR ALL USING (auth.role() = 'anon');
