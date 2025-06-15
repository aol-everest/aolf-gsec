-- Check ownership and permissions for PersonRelationshipType enum
-- Run this to diagnose the permission issue

-- 1. Check who owns the personrelationshiptype enum
SELECT 
    t.typname as enum_name,
    u.usename as owner,
    t.oid as type_oid
FROM pg_type t
JOIN pg_user u ON t.typowner = u.usesysid
WHERE t.typname = 'personrelationshiptype';

-- 2. Check current database user and their roles
SELECT current_user, session_user;

-- 3. Check if current user is superuser
SELECT usesuper FROM pg_user WHERE usename = current_user;

-- 4. Check what privileges the current user has
SELECT 
    r.rolname,
    r.rolsuper,
    r.rolinherit,
    r.rolcreaterole,
    r.rolcreatedb,
    r.rolcanlogin
FROM pg_roles r 
WHERE r.rolname = current_user;

-- 5. Check all enum values currently in the type
SELECT enumlabel, enumsortorder
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'eventtype'
)
ORDER BY enumsortorder; 