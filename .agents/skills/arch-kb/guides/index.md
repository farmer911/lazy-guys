# Architecture & Contract Knowledge Pack — Guide Index

- [response-envelopes-and-dto-inheritance.md](contracts/response-envelopes-and-dto-inheritance.md) — Canonical `ApiSuccessResponse`/`CursorPageResponse` envelopes, `<= 1`-hop same-tier DTO composition, preventing structural width-subtyping leaks across trust boundaries, and zero-build monorepo contracts.
- [scale-ready-stateless-design.md](scalability/scale-ready-stateless-design.md) — Stateless horizontal scaling, keyset cursor pagination, bounded `pg.Pool` + HTTP `Cache-Control`, DB idempotency, and measured triggers before Redis/PgBouncer/queues.
- [postgres-schema-indexing-and-migrations.md](database/postgres-schema-indexing-and-migrations.md) — Composite B-tree column order (`equality -> sort -> id`), partial predicates, explicit FK child indexes, and keeping `CREATE INDEX CONCURRENTLY` outside `BEGIN/COMMIT`.
- [domain-triage-and-failure-isolation.md](tradeoffs/domain-triage-and-failure-isolation.md) — `BE_DEVIATION` vs `CONTRACT_GAP` escalation triage without hiding approved UI fields, additive contract evolution, and section-level blast-radius isolation.
