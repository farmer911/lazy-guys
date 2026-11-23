# Graph 3: Targeted Bugfix & Regression Verification (`run_workflow`)
# Args: {"bugReport": str, "featureId": str (optional)}

import os
import subprocess

ROOT = WORKSPACES[0]
with open(os.path.join(ROOT, ".agents", "workflows", "graph_core.py"), encoding="utf-8") as _f:
    exec(compile(_f.read(), "graph_core.py", "exec"), globals())

bug_report = str((args or {}).get("bugReport", "")).strip()
feature_id = str((args or {}).get("featureId", "bugfix")).strip()
if not bug_report:
    raise ValueError("args.bugReport is required")

phase("1. Tech Lead — Root Cause & Domain Triage")
triage = await agent(
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
)

targets = route_bugfix_domain(triage)
phase(f"2. Scoped TDD Fix ({', '.join(targets)})")

if "be" in targets:
    await agent(
        prompt=build_role_prompt(
            "be",
            "apps/api/AGENTS.md",
            f"Write a failing API test first, then fix:\n{triage['fixDirective']}",
        ),
        schema=BE_SCHEMA,
        role="BE Bugfix Agent",
    )

if "fe" in targets:
    await agent(
        prompt=build_role_prompt(
            "fe",
            ".agents/skills/fe-shadcn-clean/SKILL.md",
            f"Write a failing RTL test first, then fix in arrow-function style:\n{triage['fixDirective']}",
        ),
        schema=FE_SCHEMA,
        role="FE Bugfix Agent",
    )

phase("3. Hard Mechanical Gate (0% LLM — ./init.sh)")
gate = run_mechanical_gate(ROOT)
if not gate["ok"]:
    raise RuntimeError(f"Mechanical gate failed (exit {gate['exitCode']}):\n{gate['outputTail']}")

head_sha = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, text=True
).strip()

phase("4. White-Room QA Regression Verification")
qa_verdict = await agent(
    prompt=build_evaluator_prompt(feature_id, head_sha, ROOT),
    schema=QA_EVAL_SCHEMA,
    role="QA Regression Evaluator",
)
print({"bugReport": bug_report, "triage": triage, "qa": qa_verdict})
