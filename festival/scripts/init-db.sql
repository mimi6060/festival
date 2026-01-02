-- ============================================
-- Festival Platform - Database Initialization
-- ============================================
-- This script runs on first PostgreSQL container startup

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create application user with limited privileges (for production)
-- The main user is created by Docker environment variables

-- Grant schema permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO festival_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO festival_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO festival_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO festival_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO festival_user;

-- Create indexes for common queries (Prisma will manage most of these)
-- These are just examples and may be overwritten by Prisma migrations

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Festival database initialized successfully';
END $$;
