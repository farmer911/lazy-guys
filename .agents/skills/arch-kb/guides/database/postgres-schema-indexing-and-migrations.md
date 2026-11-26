---
id: "postgres-schema-indexing-and-migrations"
title: "PostgreSQL Composite Index Column Order & Safe Migrations"
description: "Order composite B-tree index columns by equality, sort, and tie-breaker ID, index foreign-key child columns explicitly, and keep CREATE INDEX CONCURRENTLY out of transaction blocks."
tags: ["postgres", "composite", "index", "column", "order", "btree", "partial", "concurrently", "migration", "foreign-key"]
maturity: "stable"
---

# PostgreSQL Composite Index Column Order & Safe Migrations

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Composite B-tree column order (`Equality -> Sort/Range -> Tie-breaker ID`) + Partial Predicate

Design composite B-tree indexes to match query `WHERE` and `ORDER BY` clauses from left to right so PostgreSQL performs a single ordered index scan with zero in-memory `Sort`.

```sql
-- Query: WHERE profile_id = $1 AND category = $2 AND is_archived = false
--        ORDER BY sort_order ASC, id ASC LIMIT 20
CREATE INDEX IF NOT EXISTS idx_tech_stacks_active_feed
  ON tech_stacks (profile_id, category, sort_order ASC, id ASC)
  WHERE is_archived = false;
```

- **DO** place exact equality columns first (`profile_id`, `category`), the range or `ORDER BY` column next (`sort_order` or `created_at`), and the unique cursor tie-breaker (`id`) last.
- **DO** append a partial `WHERE` predicate (`WHERE is_archived = false` or `WHERE featured = true`) when `> 80%` of reads target a specific subset, shrinking index size and write amplification.
- **DON'T** put range or sort columns (`created_at`, `sort_order`) **before** equality filter columns (`(sort_order, profile_id)`)—B-tree traversal cannot narrow equality predicates efficiently after an leading range/sort scan.

### Rule 2: Explicit indexes on Foreign Key (`REFERENCES`) child columns

```sql
-- PostgreSQL auto-indexes PRIMARY KEY / UNIQUE, NEVER REFERENCES child columns
CREATE INDEX IF NOT EXISTS idx_experiences_profile_sort
  ON experiences (profile_id, sort_order, id);
```

- **DO** create an explicit index whose **leading column** is the foreign key (`profile_id`) on every child table with `REFERENCES parent(id) ON DELETE CASCADE` (combining it with common sort columns when applicable).
- **DON'T** assume `REFERENCES profiles(id)` creates an index automatically—missing FK child indexes trigger full sequential table scans on child joins and hold long table locks whenever a parent row is deleted or its key is updated.

### Rule 3: Idempotent bootstrap DDL vs Non-transactional `CONCURRENTLY` migrations

Match DDL syntax to whether the file runs inside an atomic transaction or bootstrap script (`db/schema.sql`) versus a live zero-downtime migration runner:

```sql
-- 1. Safe inside idempotent db/schema.sql or transactional migration steps:
BEGIN;
SET LOCAL lock_timeout = '2s';

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS architecture_notes TEXT,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_projects_profile_sort
  ON projects (profile_id, sort_order, id)
  WHERE is_archived = false;
COMMIT;

-- 2. Standalone non-transactional production migration (NO surrounding BEGIN/COMMIT):
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_live_feed
  ON projects (profile_id, sort_order, id)
  WHERE is_archived = false;
```

- **DO** use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, and plain `CREATE INDEX IF NOT EXISTS` inside `db/schema.sql` (`./init.sh`) and transactional (`BEGIN ... COMMIT`) migration files.
- **DO** split `CREATE INDEX CONCURRENTLY IF NOT EXISTS` into a dedicated, non-transactional production migration step when indexing large populated live tables, and guard `ALTER TABLE` metadata locks with `SET LOCAL lock_timeout = '2s'`.
- **DO** validate multi-step constraint rollouts on populated tables with `ADD CONSTRAINT ... NOT VALID` inside a short transaction followed by `VALIDATE CONSTRAINT` so concurrent reads and writes stay unblocked.
- **DON'T** place `CREATE INDEX CONCURRENTLY` inside `BEGIN; ... COMMIT;` or transactional schema runners—PostgreSQL aborts immediately at runtime with `ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block` (`SQLSTATE 25001`).
- **DON'T** drop an existing index before creating its replacement composite index—create the new index first, verify `Index Scan` in `EXPLAIN`, and drop the redundant index in a subsequent step.

## When NOT to replace legacy code

- **Keep existing pattern when:** A tiny static reference table (`< 500` rows) fits in a few 8 KB pages where PostgreSQL's planner intentionally chooses `Seq Scan` over index random I/O, or an already-shipped numbered migration file is locked by checksum verification (author a new additive migration instead).
