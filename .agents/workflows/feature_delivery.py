# Graph 2: Feature Delivery & Tech Lead Escalation Loop (`run_workflow`)
# Args: {"featureId": str}

import os

ROOT = WORKSPACES[0]
with open(os.path.join(ROOT, ".agents", "workflows", "graph_core.py"), encoding="utf-8") as _f:
    exec(compile(_f.read(), "graph_core.py", "exec"), globals())

feature_id = str((args or {}).get("featureId", "")).strip()
if not feature_id:
    raise ValueError("args.featureId is required (e.g. 'feat-005')")

existing_cp = load_workflow_checkpoint(ROOT, "feature_delivery", feature_id)
cp_contract = (existing_cp or {}).get("data", {}).get("contractSpec") or {}
cp_contract_rel = str(cp_contract.get("contractPath", "")).strip()
contracts_root = os.path.realpath(os.path.join(ROOT, "specs", "contracts"))
cp_contract_full = os.path.realpath(os.path.join(ROOT, cp_contract_rel)) if cp_contract_rel else ""
cp_has_valid_contract = (
    bool(cp_contract_rel)
    and cp_contract_full != contracts_root
    and os.path.commonpath([contracts_root, cp_contract_full]) == contracts_root
    and os.path.isfile(cp_contract_full)
)

if (
    existing_cp
    and existing_cp.get("phase") in ("contract_locked", "delivery_ready")
    and cp_has_valid_contract
):
    contract_spec = validate_agent_output(
        cp_contract,
        TECH_LEAD_CONTRACT_SCHEMA,
        "checkpoint-contract",
    )
    log("Resumed locked contract from checkpoint:", contract_spec["contractPath"])
else:
    phase(f"1. Tech Lead — Lock API & DB Contract ({feature_id})")
    tl_baseline, tl_head = get_dirty_files(ROOT), get_head_sha(ROOT)
    contract_spec = validate_agent_output(
        await agent(
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
        ),
        TECH_LEAD_CONTRACT_SCHEMA,
        "tech-lead-contract",
    )
    assert_role_diff_compliance(ROOT, "tech-lead", tl_baseline, baseline_head=tl_head)
    save_workflow_checkpoint(
        ROOT,
        "feature_delivery",
        feature_id,
        "contract_locked",
        {"contractSpec": contract_spec},
    )


async def _run_be(directive):
    extra = f"\nTech Lead Escalation Directive:\n{directive}\n" if directive else ""
    be_baseline, be_head = get_dirty_files(ROOT), get_head_sha(ROOT)
    res = validate_agent_output(
        await agent(
            prompt=build_role_prompt(
                "be",
                ".agents/skills/be-express-pg/SKILL.md",
                (
                    f"Read `apps/api/AGENTS.md` and implement backend for `{feature_id}` strictly following "
                    f"`{contract_spec['contractPath']}` and `designs/`.\n"
                    f"{contract_spec['beInstructions']}{extra}"
                    f"If `db/schema.sql` lacks required columns/constraints, return `status='SCHEMA_MISMATCH'`; "
                    f"otherwise run `npm run test --workspace=apps/api && npm run typecheck --workspace=apps/api` before finishing."
                ),
            ),
            schema=BE_SCHEMA,
            role="BE Agent (apps/api)",
        ),
        BE_SCHEMA,
        "be",
    )
    assert_role_diff_compliance(ROOT, "be", be_baseline, baseline_head=be_head)
    return res


async def _run_fe(attempt):
    fe_baseline, fe_head = get_dirty_files(ROOT), get_head_sha(ROOT)
    res = validate_agent_output(
        await agent(
            prompt=build_role_prompt(
                "fe",
                ".agents/skills/fe-shadcn-clean/SKILL.md",
                (
                    f"Integration pass #{attempt + 1} for `{feature_id}`.\n"
                    f"Read `apps/web/AGENTS.md` and `apps/e2e/AGENTS.md`. "
                    f"Build arrow-function `shadcn/ui` components in `apps/web/` matching `designs/`, "
                    f"wire to `{contract_spec['contractPath']}`, and update/add Playwright E2E coverage in `apps/e2e/tests/`.\n"
                    f"{contract_spec['feInstructions']}\n"
                    f"If any API endpoint or field diverges from `designs/`, return `status='CONTRACT_MISMATCH'`."
                ),
            ),
            schema=FE_SCHEMA,
            role=f"FE Agent (Pass #{attempt + 1})",
        ),
        FE_SCHEMA,
        "fe",
    )
    assert_role_diff_compliance(ROOT, "fe", fe_baseline, baseline_head=fe_head)
    return res


async def _run_triage(mismatches, attempt, source="fe"):
    origin_label = "BE (SCHEMA_MISMATCH)" if source == "be" else "FE (CONTRACT_MISMATCH)"
    tl_baseline, tl_head = get_dirty_files(ROOT), get_head_sha(ROOT)
    res = validate_agent_output(
        await agent(
            prompt=build_role_prompt(
                "tech-lead",
                ".agents/skills/tech-lead-contract/SKILL.md",
                (
                    f"Escalation #{attempt + 1} from {origin_label} on `{feature_id}`:\n"
                    f"Mismatches: {mismatches}\n"
                    f"Classify as `BE_DEVIATION` or `CONTRACT_GAP`, update `{contract_spec['contractPath']}` / "
                    f"`db/schema.sql` if `CONTRACT_GAP`, and issue exact `beDirective`."
                ),
            ),
            schema=TECH_LEAD_TRIAGE_SCHEMA,
            role=f"Tech Lead Triage (#{attempt + 1})",
        ),
        TECH_LEAD_TRIAGE_SCHEMA,
        "tech-lead-triage",
    )
    assert_role_diff_compliance(ROOT, "tech-lead", tl_baseline, baseline_head=tl_head)
    return res


if existing_cp and existing_cp.get("phase") == "delivery_ready" and cp_has_valid_contract:
    delivery = {
        "status": "READY",
        "escalationsUsed": int(existing_cp.get("data", {}).get("escalationsUsed", 0)),
    }
    log("Resumed delivery_ready state from checkpoint; skipping escalation loop.")
else:
    phase(f"2. Implementation & Tech Lead Escalation Loop (max={MAX_ESCALATION_RETRIES})")
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
    save_workflow_checkpoint(
        ROOT,
        "feature_delivery",
        feature_id,
        "delivery_ready",
        {"contractSpec": contract_spec, "escalationsUsed": delivery["escalationsUsed"]},
    )

    async def _stage_and_commit(qa_attempt):
        phase(f"3. Hard Mechanical Gate & Stage Commit (Pass #{qa_attempt + 1})")
        gate = run_mechanical_gate(ROOT)
        if not gate["ok"]:
            raise RuntimeError(
                f"Mechanical gate failed (exit {gate['exitCode']}):\n{gate['outputTail']}"
            )
        return stage_ready_for_eval_and_commit(
            ROOT,
            feature_id,
            f"./init.sh green on QA pass #{qa_attempt + 1}; awaiting independent evaluator.",
        )

    async def _run_qa(commit_sha, qa_attempt):
        phase(f"4. White-Room QA & Vercel Guidelines Evaluator (Pass #{qa_attempt + 1})")
        qa_baseline, qa_head = get_dirty_files(ROOT), get_head_sha(ROOT)
        res = validate_agent_output(
            await agent(
                prompt=build_evaluator_prompt(feature_id, commit_sha, ROOT),
                schema=QA_EVAL_SCHEMA,
                role=f"Independent QA Evaluator (#{qa_attempt + 1})",
            ),
            QA_EVAL_SCHEMA,
            "qa",
        )
        assert_role_diff_compliance(ROOT, "qa", qa_baseline, baseline_head=qa_head)
        return res

    async def _run_remediation(blocking_issues, qa_attempt):
        phase(f"4b. Tech Lead QA Remediation Triage (#{qa_attempt + 1})")
        tl_baseline, tl_head = get_dirty_files(ROOT), get_head_sha(ROOT)
        fix_plan = validate_agent_output(
            await agent(
                prompt=build_role_prompt(
                    "tech-lead",
                    ".agents/skills/tech-lead-contract/SKILL.md",
                    (
                        f"Independent QA Evaluator failed `{feature_id}` with blockingIssues:\n"
                        f"{blocking_issues}\n"
                        f"Classify target `domain` (`be`, `fe`, or `fullstack`) and issue TDD fix instructions."
                    ),
                ),
                schema=BUGFIX_TRIAGE_SCHEMA,
                role="Tech Lead (QA Remediation)",
            ),
            BUGFIX_TRIAGE_SCHEMA,
            "tech-lead-qa-remediation",
        )
        assert_role_diff_compliance(ROOT, "tech-lead", tl_baseline, baseline_head=tl_head)
        for domain in route_bugfix_domain(fix_plan):
            if domain == "be":
                re_be = await _run_be(fix_plan["fixDirective"])
                if re_be.get("status") != "BE_READY":
                    raise RuntimeError(f"BE QA remediation returned {re_be}")
            else:
                fe_baseline, fe_head = get_dirty_files(ROOT), get_head_sha(ROOT)
                re_fe = validate_agent_output(
                    await agent(
                        prompt=build_role_prompt(
                            "fe",
                            ".agents/skills/fe-shadcn-clean/SKILL.md",
                            f"Read `apps/web/AGENTS.md` and `apps/e2e/AGENTS.md`, then fix QA blocking issues via TDD:\n{fix_plan['fixDirective']}",
                        ),
                        schema=FE_SCHEMA,
                        role="FE QA Remediation",
                    ),
                    FE_SCHEMA,
                    "fe-qa-remediation",
                )
                assert_role_diff_compliance(ROOT, "fe", fe_baseline, baseline_head=fe_head)
                if re_fe.get("status") != "READY":
                    raise RuntimeError(f"FE remediation returned {re_fe}")

    async def _finalize_done(commit_sha, eval_path):
        finalize_done_after_eval(ROOT, feature_id, commit_sha, eval_path)
        clear_workflow_checkpoint(ROOT, "feature_delivery", feature_id)

    qa_outcome = await run_qa_gate_loop(
        stage_and_commit=_stage_and_commit,
        run_qa=_run_qa,
        run_remediation=_run_remediation,
        finalize_done=_finalize_done,
        max_qa_retries=1,
    )
    print(
        {
            "featureId": feature_id,
            "escalationsUsed": delivery["escalationsUsed"],
            "outcome": qa_outcome,
        }
    )
