# Graph 2: Feature Delivery & Tech Lead Escalation Loop (`run_workflow`)
# Args: {"featureId": str}

import os
import subprocess

ROOT = WORKSPACES[0]
with open(os.path.join(ROOT, ".agents", "workflows", "graph_core.py"), encoding="utf-8") as _f:
    exec(compile(_f.read(), "graph_core.py", "exec"), globals())

feature_id = str((args or {}).get("featureId", "")).strip()
if not feature_id:
    raise ValueError("args.featureId is required (e.g. 'feat-005')")

phase(f"1. Tech Lead — Lock API & DB Contract ({feature_id})")
contract_spec = await agent(
    prompt=build_role_prompt(
        "tech-lead",
        ".agents/skills/tech-lead-contract/SKILL.md",
        (
            f"Read `feature_list.json` (`{feature_id}`), `specs/prd.md`, and frozen UI in `designs/`. "
            f"Write `specs/contracts/{feature_id}.ts` (and `db/schema.sql` updates if needed), "
            f"then return exact BE and FE implementation instructions."
        ),
    ),
    schema=TECH_LEAD_CONTRACT_SCHEMA,
    role="Tech Lead (Contract)",
)

phase(f"2. Implementation & Tech Lead Escalation Loop (max={MAX_ESCALATION_RETRIES})")


async def _run_be(directive):
    extra = f"\nTech Lead Escalation Directive:\n{directive}\n" if directive else ""
    return await agent(
        prompt=build_role_prompt(
            "be",
            "apps/api/AGENTS.md",
            (
                f"Implement backend for `{feature_id}` strictly following "
                f"`{contract_spec['contractPath']}` and `designs/`.\n"
                f"{contract_spec['beInstructions']}{extra}"
                f"Run `npm run test --workspace=apps/api && npm run typecheck --workspace=apps/api` before finishing."
            ),
        ),
        schema=BE_SCHEMA,
        role="BE Agent (apps/api)",
    )


async def _run_fe(attempt):
    return await agent(
        prompt=build_role_prompt(
            "fe",
            ".agents/skills/fe-shadcn-clean/SKILL.md",
            (
                f"Integration pass #{attempt + 1} for `{feature_id}`.\n"
                f"Build arrow-function `shadcn/ui` components in `apps/web/` matching `designs/` "
                f"and wire to `{contract_spec['contractPath']}`.\n"
                f"{contract_spec['feInstructions']}\n"
                f"If any API endpoint or field diverges from `designs/`, return `status='CONTRACT_MISMATCH'`."
            ),
        ),
        schema=FE_SCHEMA,
        role=f"FE Agent (Pass #{attempt + 1})",
    )


async def _run_triage(mismatches, attempt):
    return await agent(
        prompt=build_role_prompt(
            "tech-lead",
            ".agents/skills/tech-lead-contract/SKILL.md",
            (
                f"Escalation #{attempt + 1} from FE on `{feature_id}`:\n"
                f"Mismatches: {mismatches}\n"
                f"Classify as `BE_DEVIATION` or `CONTRACT_GAP`, update `{contract_spec['contractPath']}` / "
                f"`db/schema.sql` if `CONTRACT_GAP`, and issue exact `beDirective`."
            ),
        ),
        schema=TECH_LEAD_TRIAGE_SCHEMA,
        role=f"Tech Lead Triage (#{attempt + 1})",
    )


delivery = await run_escalation_loop(
    run_be=_run_be,
    run_fe=_run_fe,
    run_tech_lead_triage=_run_triage,
    max_retries=MAX_ESCALATION_RETRIES,
)

if delivery["status"] != "READY":
    log("Circuit breaker tripped — escalating to human:", delivery)
    print(delivery)
else:
    phase("3. Hard Mechanical Gate (0% LLM — ./init.sh)")
    gate = run_mechanical_gate(ROOT)
    if not gate["ok"]:
        raise RuntimeError(f"Mechanical gate failed (exit {gate['exitCode']}):\n{gate['outputTail']}")

    head_sha = subprocess.check_output(
        ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, text=True
    ).strip()

    phase("4. White-Room QA & Vercel Guidelines Evaluator")
    qa_verdict = await agent(
        prompt=build_evaluator_prompt(feature_id, head_sha, ROOT),
        schema=QA_EVAL_SCHEMA,
        role="Independent QA Evaluator",
    )
    print(
        {
            "featureId": feature_id,
            "escalationsUsed": delivery["escalationsUsed"],
            "mechanicalGate": "PASS",
            "qa": qa_verdict,
        }
    )
