-- Migration script to add timezone fields to countries table
-- Usage: psql -h hostname -U username -d database -f add_timezone_to_countries_table.sql

-- Add the timezones array column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = current_schema()
    AND table_name = 'countries'
    AND column_name = 'timezones'
  ) THEN
    ALTER TABLE countries ADD COLUMN timezones VARCHAR[] DEFAULT '{}';
  END IF;
END $$;

-- Add the default_timezone column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = current_schema()
    AND table_name = 'countries'
    AND column_name = 'default_timezone'
  ) THEN
    ALTER TABLE countries ADD COLUMN default_timezone VARCHAR;
  END IF;
END $$;

-- Add index on the default_timezone column
CREATE INDEX IF NOT EXISTS idx_countries_default_timezone ON countries(default_timezone);

-- Print a message confirming the migration
DO $$ 
BEGIN
  RAISE NOTICE 'Timezone columns added to countries table.';
END $$; 