# Graph 3: Targeted Bugfix & Regression Verification (`run_workflow`)
# Args: {"bugReport": str, "featureId": str (optional)}

import os
import subprocess

ROOT = WORKSPACES[0]
with open(os.path.join(ROOT, ".agents", "workflows", "graph_core.py"), encoding="utf-8") as _f:
    exec(compile(_f.read(), "graph_core.py", "exec"), globals())

bug_report = str((args or {}).get("bugReport", "")).strip()
feature_id = str((args or {}).get("featureId", "")).strip() or None
commit_scope = feature_id or "bugfix"
if not bug_report:
    raise ValueError("args.bugReport is required")

phase("1. Tech Lead — Root Cause & Domain Triage")
tl_baseline, tl_head = get_dirty_files(ROOT), get_head_sha(ROOT)
triage = validate_agent_output(
    await agent(
        prompt=build_role_prompt(
            "tech-lead",
            ".agents/skills/tech-lead-contract/SKILL.md",
            (
                f"Investigate root cause for bug:\n{bug_report}\n\n"
                f"Classify target `domain` (`be`, `fe`, or `fullstack`) and state exact TDD fix directive."
            ),
        ),
        schema=BUGFIX_TRIAGE_SCHEMA,
        role="Tech Lead (Bug Triage)",
    ),
    BUGFIX_TRIAGE_SCHEMA,
    "tech-lead-bugfix",
)
assert_role_diff_compliance(ROOT, "tech-lead", tl_baseline, baseline_head=tl_head)

targets = route_bugfix_domain(triage)
phase(f"2. Scoped TDD Fix ({', '.join(targets)})")

if "be" in targets:
    be_baseline, be_head = get_dirty_files(ROOT), get_head_sha(ROOT)
    be_fix = validate_agent_output(
        await agent(
            prompt=build_role_prompt(
                "be",
                ".agents/skills/be-express-pg/SKILL.md",
                f"Read `apps/api/AGENTS.md`, write a failing API test first, then fix:\n{triage['fixDirective']}",
            ),
            schema=BE_SCHEMA,
            role="BE Bugfix Agent",
        ),
        BE_SCHEMA,
        "be-bugfix",
    )
    assert_role_diff_compliance(ROOT, "be", be_baseline, baseline_head=be_head)
    if be_fix.get("status") != "BE_READY":
        raise RuntimeError(f"BE bugfix blocked by schema mismatch: {be_fix}")

if "fe" in targets:
    fe_baseline, fe_head = get_dirty_files(ROOT), get_head_sha(ROOT)
    fe_fix = validate_agent_output(
        await agent(
            prompt=build_role_prompt(
                "fe",
                ".agents/skills/fe-shadcn-clean/SKILL.md",
                f"Read `apps/web/AGENTS.md` and `apps/e2e/AGENTS.md`, write a failing RTL test first, then fix in arrow-function style:\n{triage['fixDirective']}",
            ),
            schema=FE_SCHEMA,
            role="FE Bugfix Agent",
        ),
        FE_SCHEMA,
        "fe-bugfix",
    )
    assert_role_diff_compliance(ROOT, "fe", fe_baseline, baseline_head=fe_head)
    if fe_fix.get("status") != "READY":
        raise RuntimeError(f"FE bugfix blocked by contract mismatch: {fe_fix}")

phase("3. Hard Mechanical Gate & Commit Snapshot")
gate = run_mechanical_gate(ROOT)
if not gate["ok"]:
    raise RuntimeError(f"Mechanical gate failed (exit {gate['exitCode']}):\n{gate['outputTail']}")

dirty = subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT, text=True).strip()
if dirty:
    subprocess.run(["git", "add", "-A"], cwd=ROOT, check=True)
    subprocess.run(["git", "commit", "-m", f"fix({commit_scope}): apply verified bugfix"], cwd=ROOT, check=True)

head_sha = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, text=True
).strip()

phase("4. White-Room QA Regression Verification")
qa_baseline, qa_head = get_dirty_files(ROOT), get_head_sha(ROOT)
qa_verdict = validate_agent_output(
    await agent(
        prompt=build_bugfix_qa_prompt(bug_report, head_sha, ROOT, feature_id=feature_id),
        schema=QA_EVAL_SCHEMA,
        role="QA Regression Evaluator",
    ),
    QA_EVAL_SCHEMA,
    "qa-bugfix",
)
assert_role_diff_compliance(ROOT, "qa", qa_baseline, baseline_head=qa_head)

if qa_verdict.get("verdict") != "PASS":
    log("QA regression verification FAILED:", qa_verdict)
    raise RuntimeError(
        f"Bugfix QA regression check FAILED at {head_sha}: {qa_verdict.get('blockingIssues')}"
    )

if feature_id and feature_id != "bugfix":
    finalize_done_after_eval(ROOT, feature_id, head_sha, qa_verdict["evaluationPath"])
else:
    qa_dirty = get_dirty_files(ROOT) - qa_baseline
    if qa_dirty:
        subprocess.run(["git", "add", *sorted(qa_dirty)], cwd=ROOT, check=True)
        subprocess.run(
            ["git", "commit", "-m", f"chore(qa): record regression verification for {commit_scope} at {head_sha}"],
            cwd=ROOT,
            check=True,
        )

print({"bugReport": bug_report, "triage": triage, "qa": qa_verdict})
