# Graph 1: Project Discovery & Full-Flow Google Stitch UI (`run_workflow`)
# Args: {"requirement": str, "stitchApproved": bool (optional), "stitchProjectId": str (optional)}

import os

ROOT = WORKSPACES[0]
with open(os.path.join(ROOT, ".agents", "workflows", "graph_core.py"), encoding="utf-8") as _f:
    exec(compile(_f.read(), "graph_core.py", "exec"), globals())

requirement = str((args or {}).get("requirement", "")).strip()
stitch_approved = bool((args or {}).get("stitchApproved", False))
stitch_project_id = str((args or {}).get("stitchProjectId", "")).strip()

if not requirement and not stitch_approved:
    raise ValueError("args.requirement is required to start project_init.py")
if stitch_approved and not stitch_project_id:
    raise ValueError("args.stitchProjectId is required when stitchApproved=True")

if not stitch_approved:
    phase("1. PM — Product Requirements & User Stories")
    pm_result = await agent(
        prompt=build_role_prompt(
            "pm",
            ".agents/skills/pm-prd-story/SKILL.md",
            f"Write `specs/prd.md` for this requirement:\n\n{requirement}",
        ),
        schema=PM_SCHEMA,
        role="PM Agent",
    )
    log("PRD ready:", pm_result["prdPath"])

    phase("2. Design — Google Stitch Full UI Flow (Pre-Approval)")
    design_draft = await agent(
        prompt=build_role_prompt(
            "design",
            ".agents/skills/design-stitch-flow/SKILL.md",
            (
                f"Read `{pm_result['prdPath']}` and generate the full multi-screen UI flow "
                f"and design system in Google Stitch for screens: {pm_result['screens']}. "
                f"STOP at the Human Gate (`status='AWAITING_HUMAN_APPROVAL'`) without freezing `designs/` yet."
            ),
        ),
        schema=DESIGN_SCHEMA,
        role="Design Agent (Stitch Draft)",
    )
    print(
        {
            "stage": "AWAITING_HUMAN_APPROVAL",
            "prd": pm_result,
            "design": design_draft,
            "nextStep": "Review screens in Google Stitch, then re-run with stitchApproved=True and stitchProjectId.",
        }
    )
else:
    phase("2b. Design — Freeze Approved Stitch Screens to designs/")
    frozen = await agent(
        prompt=build_role_prompt(
            "design",
            ".agents/skills/design-stitch-flow/SKILL.md",
            (
                f"Human approved Google Stitch project `{stitch_project_id}`. "
                f"Export and freeze `designs/design-tokens.json`, `designs/stitch-manifest.json`, "
                f"and `designs/screens/*.html`, then return `status='FROZEN_TO_GIT'`."
            ),
        ),
        schema=DESIGN_SCHEMA,
        role="Design Agent (Freeze to Git)",
    )

    phase("3. Tech Lead — System Structure, DB Schema & Feature Breakdown")
    arch_result = await agent(
        prompt=build_role_prompt(
            "tech-lead",
            ".agents/skills/tech-lead-contract/SKILL.md",
            (
                f"Inspect `specs/prd.md` and frozen screens `{frozen['frozenFiles']}` in `designs/`. "
                f"Update foundational `db/schema.sql`, `specs/contracts/`, and `feature_list.json`."
            ),
        ),
        schema=TECH_LEAD_CONTRACT_SCHEMA,
        role="Tech Lead Agent",
    )
    print({"stage": "PROJECT_INITIALIZED", "frozen": frozen, "architecture": arch_result})
