-- Add UNIQUE constraint to full_name column
-- Run this script to enable upsert operations on the players table

-- First, check if the constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'players_full_name_key'
    ) THEN
        -- Add the unique constraint
        ALTER TABLE players ADD CONSTRAINT players_full_name_key UNIQUE (full_name);
        RAISE NOTICE 'Added unique constraint on full_name';
    ELSE
        RAISE NOTICE 'Unique constraint on full_name already exists';
    END IF;
END $$;
