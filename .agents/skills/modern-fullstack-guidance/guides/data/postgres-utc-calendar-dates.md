---
id: "postgres-utc-calendar-dates"
title: "Timezone-Safe PostgreSQL Calendar Dates vs. Timestamps"
description: "Prevent off-by-one day and month shifts on PostgreSQL DATE columns by casting DATE::text and formatting in UTC."
tags: ["postgres", "postgresql", "date", "timestamptz", "timezone", "utc", "DateTimeFormat"]
maturity: "stable"
---

# Timezone-Safe PostgreSQL Calendar Dates vs. Timestamps

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Calendar dates without time-of-day (`DATE` columns: start/end dates, birthdays, billing days)

Serialize `DATE` columns as `'YYYY-MM-DD'` strings in SQL (`col::text`) and format them using `Date.UTC` + `timeZone: 'UTC'` on the client.

```sql
-- apps/api SQL query: prevent node-postgres OID 1082 from creating a local-midnight JS Date
SELECT id, company, start_date::text AS start_date, end_date::text AS end_date
FROM experiences;
```

```ts
const MONTH_YEAR_UTC = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export const formatCalendarMonth = (isoDate: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new RangeError(`Invalid YYYY-MM-DD calendar date: "${isoDate}"`);
  const [, y, m, d] = match;
  return MONTH_YEAR_UTC.format(new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))));
};
```

- **DO** cast PostgreSQL `DATE` columns with `::text` in `SELECT` / `RETURNING` clauses so `pg` returns exact `'YYYY-MM-DD'` strings independent of server `TZ`.
- **DO** pass `timeZone: 'UTC'` to `Intl.DateTimeFormat` when rendering calendar dates.
- **DON'T** call `new Date('2026-03-01').toLocaleDateString()` without `timeZone: 'UTC'` — ES5+ parses date-only ISO strings (`YYYY-MM-DD`) as **UTC midnight (`2026-03-01T00:00:00Z`)**, which shifts backward to `'Feb 28, 2026'` in every negative UTC offset (`America/*`).

### Rule 2: Exact instants in time (`created_at`, audit logs, scheduled events)

Store in `TIMESTAMPTZ` (never bare `TIMESTAMP WITHOUT TIME ZONE`) and render in the viewer's timezone.

- **DO** use `TIMESTAMPTZ DEFAULT NOW()` in DDL and pass parameterized ISO-8601 UTC strings or `Date` objects.
- **DON'T** use `TIMESTAMP` without time zone, which silently reinterprets stored values whenever database session `TimeZone` changes.

## When NOT to replace legacy code

- **Keep existing pattern when:** `node-postgres` has already registered a global custom type parser `types.setTypeParser(1082, (val) => val)` at pool bootstrap, making per-query `::text` casts redundant (keep UTC formatting on the client).
