#!/bin/bash
# ============================================================================
# PostgreSQL Primary Initialization Script
# Festival Management Platform
# ============================================================================
# This script is executed when the primary container starts for the first time
# It creates the replication user and sets up replication slots
# ============================================================================

set -e

echo "Initializing PostgreSQL Primary..."

# Create replication user
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create replication user
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${POSTGRES_REPLICATION_USER:-replicator}') THEN
            CREATE ROLE ${POSTGRES_REPLICATION_USER:-replicator} WITH REPLICATION LOGIN PASSWORD '${POSTGRES_REPLICATION_PASSWORD:-replicator_secret}';
        END IF;
    END
    \$\$;

    -- Create backup user
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'backup') THEN
            CREATE ROLE backup WITH REPLICATION LOGIN PASSWORD '${BACKUP_PASSWORD:-backup_secret}';
        END IF;
    END
    \$\$;

    -- Create read-only user for replicas
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'festival_readonly') THEN
            CREATE ROLE festival_readonly WITH LOGIN PASSWORD '${READONLY_PASSWORD:-readonly_secret}';
            GRANT CONNECT ON DATABASE festival TO festival_readonly;
            GRANT USAGE ON SCHEMA public TO festival_readonly;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO festival_readonly;
        END IF;
    END
    \$\$;

    -- Create replication slots for replicas
    SELECT pg_create_physical_replication_slot('replica1_slot', true)
    WHERE NOT EXISTS (SELECT 1 FROM pg_replication_slots WHERE slot_name = 'replica1_slot');

    SELECT pg_create_physical_replication_slot('replica2_slot', true)
    WHERE NOT EXISTS (SELECT 1 FROM pg_replication_slots WHERE slot_name = 'replica2_slot');

    SELECT pg_create_physical_replication_slot('replica3_slot', true)
    WHERE NOT EXISTS (SELECT 1 FROM pg_replication_slots WHERE slot_name = 'replica3_slot');

    -- Enable required extensions
    CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE EXTENSION IF NOT EXISTS uuid-ossp;
    CREATE EXTENSION IF NOT EXISTS citext;
EOSQL

echo "Primary initialization complete!"

# Create monitoring queries for pg_stat_statements
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create view for slow queries monitoring
    CREATE OR REPLACE VIEW slow_queries AS
    SELECT
        round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percent,
        round(total_exec_time::numeric, 2) AS total_ms,
        round(mean_exec_time::numeric, 2) AS avg_ms,
        calls,
        query
    FROM pg_stat_statements
    ORDER BY total_exec_time DESC
    LIMIT 100;

    -- Create function to check replication lag
    CREATE OR REPLACE FUNCTION check_replication_lag()
    RETURNS TABLE(
        client_addr inet,
        application_name text,
        state text,
        sent_lsn pg_lsn,
        replay_lsn pg_lsn,
        lag_bytes bigint,
        lag_time interval
    ) AS \$\$
    BEGIN
        RETURN QUERY
        SELECT
            r.client_addr,
            r.application_name,
            r.state,
            r.sent_lsn,
            r.replay_lsn,
            pg_wal_lsn_diff(r.sent_lsn, r.replay_lsn) AS lag_bytes,
            COALESCE(r.reply_time - r.write_time, '0'::interval) AS lag_time
        FROM pg_stat_replication r;
    END;
    \$\$ LANGUAGE plpgsql;
EOSQL

echo "Monitoring functions created!"
