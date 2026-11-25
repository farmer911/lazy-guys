# Active Task State

## Goal
Close 4 security bypass vectors found in adversarial audit, then run 4-pass skill review and produce consolidated report.

## Checklist
- [x] Verify baseline (`./init.sh` exit 0)
- [x] RED: Write failing tests for B1, A1-A5+D1, E1, E3
- [x] Verify RED (all new tests fail for expected reasons)
- [x] GREEN: Implement fixes in agent-hooks.mjs + check-harness.mjs
- [x] Verify GREEN (all tests pass, `./init.sh` exit 0)
- [ ] 4-pass skill review (security, content, workflows, cross-cutting)
- [ ] Produce final consolidated MD report
