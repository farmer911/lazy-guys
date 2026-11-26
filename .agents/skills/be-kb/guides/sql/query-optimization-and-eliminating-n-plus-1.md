---
id: "query-optimization-and-eliminating-n-plus-1"
title: "Eliminate N+1 Queries, Unbounded Projections & Serialization Drift"
description: "Eliminate N+1 query loops with LATERAL or ANY($1::uuid[]), project explicit deterministic pg types, and paginate via keyset cursors."
tags: ["eliminate", "n-plus-1", "query", "lateral", "jsonb_agg", "timestamptz", "keyset", "pagination"]
maturity: "stable"
---

# Eliminate N+1 Queries, Unbounded Projections & Serialization Drift

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Loading parent rows with child collections or per-row aggregates

Fetch parent and child records in a **single SQL roundtrip** via `LEFT JOIN LATERAL` + `jsonb_agg`, or a second batch query using `WHERE parent_id = ANY($1::uuid[])` grouped in memory with `Map`.

```sql
SELECT
  p.id,
  p.title,
  p.created_at,
  COALESCE(m.items, '[]'::jsonb) AS milestones
FROM projects p
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', pm.id,
      'label', pm.label,
      'completedOn', pm.completed_on::text
    )
    ORDER BY pm.sort_order ASC
  ) AS items
  FROM project_milestones pm
  WHERE pm.project_id = p.id
) m ON TRUE
ORDER BY p.sort_order ASC, p.id ASC;
```

- **DO** wrap `jsonb_agg` in `COALESCE(..., '[]'::jsonb)` so parents with zero children return `[]` rather than `[null]` or `null`.
- **DO** batch heterogeneous lookups with `WHERE parent_id = ANY($1::uuid[])` when child rows map into rich TypeScript domain objects.
- **DON'T** execute `await pool.query(...)` inside `for` loops or `Promise.all(rows.map(...))` — `Promise.all` over `N` rows checks out `N` pool connections simultaneously and starves concurrent HTTP requests.

### Rule 2: Explicit column projection & `node-postgres` (`pg`) runtime type parity

List required columns explicitly and align PostgreSQL OID parsers with TypeScript DTO contracts.

```ts
interface RawIncidentRow {
  id: string;
  occurred_on: string;      // SQL: occurred_on::text
  severity_score: number;   // SQL: severity_score::float8
  created_at: Date;         // pg OID 1184 returns JS Date for top-level TIMESTAMPTZ!
}

export const toIncidentDto = (row: RawIncidentRow) => ({
  id: row.id,
  occurredOn: row.occurred_on,
  severityScore: row.severity_score,
  createdAt: row.created_at.toISOString(),
});
```

- **DO** cast `DATE` columns `::text` (`'YYYY-MM-DD'`) and `NUMERIC` columns `::float8` directly in `SELECT` / `RETURNING` projections.
- **DO** type top-level `TIMESTAMPTZ` columns on raw `pg` rows as `Date` (calling `.toISOString()` in the DTO mapper) or cast in SQL (`to_jsonb(col)#>>'{}'`).
- **DON'T** use `SELECT *` (leaks internal columns and breaks DTO shapes on `ALTER TABLE`) or type raw `pg` top-level `TIMESTAMPTZ` columns as `string` — `node-postgres` parses OID `1184` into `Date` instances at runtime, unlike `jsonb_build_object` which emits ISO strings.

### Rule 3: Paginating growing feeds or event tables

Use keyset (seek) pagination on `(sort_col, id)` with `limit + 1` lookahead to populate `CursorPageResponse<T>`.

```sql
SELECT id, summary, created_at
FROM audit_events
WHERE ($1::timestamptz IS NULL OR (created_at, id) < ($1::timestamptz, $2::uuid))
ORDER BY created_at DESC, id DESC
LIMIT $3;
```

- **DO** include a deterministic tie-breaker column (`id`) in both the tuple comparison `(created_at, id) < ($1, $2)` and `ORDER BY`, requesting `clampedLimit + 1` rows to compute `hasMore = rows.length > clampedLimit`.
- **DON'T** hardcode an unparameterized `LIMIT 20` with no cursor or use large `OFFSET` scans that degrade linearly (`O(offset + limit)`).

## When NOT to replace legacy code

- **Keep existing pattern when:** Querying small bounded reference tables (`< 50` rows such as `experiences` or `tech_stacks`) whose shared contract in `specs/contracts/*` intentionally specifies an unpaginated flat list, or running an offline CLI maintenance script that deliberately throttles sequential batch updates.
