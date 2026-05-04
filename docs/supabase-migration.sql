-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  full_name TEXT,
  display_name TEXT,
  skill_level INTEGER DEFAULT 3,
  wins INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  partner_history TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'playing', 'resting')),
  improvement_score INTEGER DEFAULT 0,
  total_play_time_minutes INTEGER DEFAULT 0,
  last_available_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courts table
CREATE TABLE courts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied')),
  current_match_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Queue table (for queuing management)
CREATE TABLE queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queue' CHECK (status IN ('bench', 'queue', 'court')),
  court_id UUID REFERENCES courts(id) ON DELETE SET NULL,
  entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_a UUID[] NOT NULL,
  team_b UUID[] NOT NULL,
  team_a_snapshots JSONB DEFAULT '[]',
  team_b_snapshots JSONB DEFAULT '[]',
  team_a_score INTEGER,
  team_b_score INTEGER,
  court_id UUID REFERENCES courts(id) ON DELETE SET NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'cancelled')),
  winner TEXT CHECK (winner IN ('teamA', 'teamB')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fees table
CREATE TABLE fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  fee_type TEXT CHECK (fee_type IN ('shuttle', 'court', 'entrance')),
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table (for match logic parameters)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment methods table
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table (for tracking play sessions on specific dates)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_date DATE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session participation join table (many-to-many relationship between sessions and players)
CREATE TABLE session_participation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, player_id)
);

-- Create indexes for better performance
CREATE INDEX idx_queue_player_id ON queue(player_id);
CREATE INDEX idx_queue_status ON queue(status);
CREATE INDEX idx_queue_entry_time ON queue(entry_time);
CREATE INDEX idx_matches_court_id ON matches(court_id);
CREATE INDEX idx_matches_timestamp ON matches(timestamp);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_fees_player_id ON fees(player_id);
CREATE INDEX idx_fees_date ON fees(date);
CREATE INDEX idx_sessions_date ON sessions(session_date);
CREATE INDEX idx_session_participation_session_id ON session_participation(session_id);
CREATE INDEX idx_session_participation_player_id ON session_participation(player_id);

-- Enable Realtime on queue table
ALTER PUBLICATION supabase_realtime ADD TABLE queue;

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
  ('default_winning_score', '21', 'Default winning score for matches'),
  ('auto_advance_enabled', 'true', 'Enable auto-advance to next match in queue'),
  ('max_queue_size', '20', 'Maximum number of players in queue'),
  ('match_duration_minutes', '15', 'Expected match duration in minutes');

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_queue_updated_at BEFORE UPDATE ON queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fees_updated_at BEFORE UPDATE ON fees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participation ENABLE ROW LEVEL SECURITY;

-- Allow public read access for authenticated users
CREATE POLICY "Allow read access for authenticated users" ON players
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON queue
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON courts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON matches
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON fees
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON payment_methods
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON sessions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON session_participation
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow full access for service role (admin operations)
CREATE POLICY "Allow full access for service role" ON players
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow full access for service role" ON queue
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow full access for service role" ON courts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow full access for service role" ON matches
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow full access for service role" ON fees
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow full access for service role" ON settings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow full access for service role" ON payment_methods
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow full access for service role" ON sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow full access for service role" ON session_participation
  FOR ALL USING (auth.role() = 'service_role');
