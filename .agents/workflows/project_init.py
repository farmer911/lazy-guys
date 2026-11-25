# Graph 1: Project Discovery & Full-Flow Google Stitch UI (`run_workflow`)
# Args: {"requirement": str, "stitchApproved": bool (optional), "stitchProjectId": str (optional)}

import os

ROOT = WORKSPACES[0]
with open(os.path.join(ROOT, ".agents", "workflows", "graph_core.py"), encoding="utf-8") as _f:
    exec(compile(_f.read(), "graph_core.py", "exec"), globals())

requirement = str((args or {}).get("requirement", "")).strip()
stitch_approved = bool((args or {}).get("stitchApproved", False))
stitch_project_id = str((args or {}).get("stitchProjectId", "")).strip()
target_key = stitch_project_id or "init-draft"

if not requirement and not stitch_approved:
    raise ValueError("args.requirement is required to start project_init.py")
if stitch_approved and not stitch_project_id:
    raise ValueError("args.stitchProjectId is required when stitchApproved=True")

existing_cp = load_workflow_checkpoint(ROOT, "project_init", target_key)

if not stitch_approved:
    if (
        existing_cp
        and existing_cp.get("phase") == "prd_ready"
        and os.path.isfile(os.path.join(ROOT, "specs", "prd.md"))
    ):
        pm_result = validate_agent_output(existing_cp.get("data"), PM_SCHEMA, "checkpoint-pm")
        log("Resumed PRD from checkpoint:", pm_result["prdPath"])
    else:
        phase("1. PM — Product Requirements & User Stories")
        pm_baseline, pm_head = get_dirty_files(ROOT), get_head_sha(ROOT)
        pm_result = validate_agent_output(
            await agent(
                prompt=build_role_prompt(
                    "pm",
                    ".agents/skills/pm-prd-story/SKILL.md",
                    f"Write `specs/prd.md` for this requirement:\n\n{requirement}",
                ),
                schema=PM_SCHEMA,
                role="PM Agent",
            ),
            PM_SCHEMA,
            "pm",
        )
        assert_role_diff_compliance(ROOT, "pm", pm_baseline, baseline_head=pm_head)
        save_workflow_checkpoint(ROOT, "project_init", target_key, "prd_ready", pm_result)
        log("PRD ready:", pm_result["prdPath"])

    phase("2. Design — Google Stitch Full UI Flow (Pre-Approval)")
    design_baseline, design_head = get_dirty_files(ROOT), get_head_sha(ROOT)
    design_draft = validate_agent_output(
        await agent(
            prompt=build_role_prompt(
                "design",
                ".agents/skills/design-stitch-flow/SKILL.md",
                (
                    f"Read `{pm_result['prdPath']}` and generate the full multi-screen UI flow "
                    f"and design system in Google Stitch for screens: {pm_result['screens']}. "
                    f"STOP at the Human Gate (`status='AWAITING_HUMAN_APPROVAL'`) without freezing `designs/` yet. "
                    f"If the PRD lacks required user-flow/state detail, return `status='REVISION_REQUIRED'` with `notes`."
                ),
            ),
            schema=DESIGN_SCHEMA,
            role="Design Agent (Stitch Draft)",
        ),
        DESIGN_SCHEMA,
        "design",
    )
    assert_role_diff_compliance(ROOT, "design", design_baseline, baseline_head=design_head)
    save_workflow_checkpoint(
        ROOT,
        "project_init",
        target_key,
        design_draft["status"].lower(),
        {"prd": pm_result, "design": design_draft},
    )
    print(
        {
            "stage": design_draft["status"],
            "prd": pm_result,
            "design": design_draft,
            "nextStep": (
                "Address design/PRD revision notes before retrying."
                if design_draft["status"] == "REVISION_REQUIRED"
                else "Review screens in Google Stitch, then re-run with stitchApproved=True and stitchProjectId."
            ),
        }
    )
else:
    if (
        existing_cp
        and existing_cp.get("phase") == "frozen_to_git"
        and os.path.isfile(os.path.join(ROOT, "designs", "stitch-manifest.json"))
    ):
        frozen = validate_agent_output(existing_cp.get("data"), DESIGN_SCHEMA, "checkpoint-frozen")
        log("Resumed frozen Stitch designs from checkpoint:", frozen["stitchProjectId"])
    else:
        phase("2b. Design — Freeze Approved Stitch Screens to designs/")
        freeze_baseline, freeze_head = get_dirty_files(ROOT), get_head_sha(ROOT)
        frozen = validate_agent_output(
            await agent(
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
            ),
            DESIGN_SCHEMA,
            "design-freeze",
        )
        assert_role_diff_compliance(ROOT, "design", freeze_baseline, baseline_head=freeze_head)
    if frozen["status"] != "FROZEN_TO_GIT":
        save_workflow_checkpoint(ROOT, "project_init", target_key, "revision_required", frozen)
        print({"stage": frozen["status"], "frozen": frozen})
    else:
        save_workflow_checkpoint(ROOT, "project_init", target_key, "frozen_to_git", frozen)
        phase("3. Tech Lead — System Structure, DB Schema & Feature Breakdown")
        tl_baseline, tl_head = get_dirty_files(ROOT), get_head_sha(ROOT)
        arch_result = validate_agent_output(
            await agent(
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
            ),
            TECH_LEAD_CONTRACT_SCHEMA,
            "tech-lead",
        )
        assert_role_diff_compliance(ROOT, "tech-lead", tl_baseline, baseline_head=tl_head)
        clear_workflow_checkpoint(ROOT, "project_init", target_key)
        clear_workflow_checkpoint(ROOT, "project_init", "init-draft")
        print({"stage": "PROJECT_INITIALIZED", "frozen": frozen, "architecture": arch_result})
