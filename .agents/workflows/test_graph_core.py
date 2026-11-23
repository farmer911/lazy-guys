import ast
import glob
import os
import unittest

from graph_core import (
    EVALUATOR_SIGNATURE,
    MAX_ESCALATION_RETRIES,
    build_evaluator_prompt,
    build_role_prompt,
    route_bugfix_domain,
    run_escalation_loop,
    run_qa_gate_loop,
)


class GraphCoreTests(unittest.IsolatedAsyncioTestCase):
    def test_build_role_prompt_injects_role_lock_header_and_skill(self):
        prompt = build_role_prompt(
            role="fe",
            skill_path=".agents/skills/fe-shadcn-clean/SKILL.md",
            task_body="Implement ProjectDetailModal in apps/web",
        )
        self.assertTrue(prompt.startswith("[AGENT_ROLE: fe]\n"))
        self.assertIn(".agents/skills/fe-shadcn-clean/SKILL.md", prompt)
        self.assertIn("Implement ProjectDetailModal in apps/web", prompt)

    def test_build_evaluator_prompt_injects_qa_role_and_evaluator_signature(self):
        prompt = build_evaluator_prompt(
            feature_id="feat-005",
            commit_sha="82db475",
            workspace_root="/repo",
        )
        self.assertTrue(prompt.startswith("[AGENT_ROLE: qa]\n"))
        self.assertIn(EVALUATOR_SIGNATURE, prompt)
        self.assertIn("feat-005", prompt)
        self.assertIn("82db475", prompt)

    async def test_escalation_loop_resolves_mismatch_via_tech_lead_and_be(self):
        calls = []

        async def run_be(directive):
            calls.append(("be", directive))
            return {"status": "BE_READY", "changedFiles": ["apps/api/src/routes/portfolio.ts"]}

        fe_responses = [
            {
                "status": "CONTRACT_MISMATCH",
                "mismatches": [
                    {
                        "endpoint": "GET /api/projects",
                        "expectedByUi": "team_size: number",
                        "actualInContractOrApi": "missing",
                    }
                ],
            },
            {
                "status": "READY",
                "changedFiles": ["apps/web/src/components/ProjectDetailModal.tsx"],
            },
        ]

        async def run_fe(attempt):
            calls.append(("fe", attempt))
            return fe_responses[attempt]

        async def run_tech_lead_triage(mismatches, attempt):
            calls.append(("tech-lead", attempt, len(mismatches)))
            return {
                "classification": "CONTRACT_GAP",
                "beDirective": "Add team_size column and expose in GET /api/projects",
            }

        result = await run_escalation_loop(
            run_be=run_be,
            run_fe=run_fe,
            run_tech_lead_triage=run_tech_lead_triage,
            max_retries=MAX_ESCALATION_RETRIES,
        )

        self.assertEqual(result["status"], "READY")
        self.assertEqual(result["escalationsUsed"], 1)
        self.assertEqual(
            [c[0] for c in calls],
            ["be", "fe", "tech-lead", "be", "fe"],
        )

    async def test_escalation_loop_trips_human_circuit_breaker_after_max_retries(self):
        be_count = 0

        async def run_be(_directive):
            nonlocal be_count
            be_count += 1
            return {"status": "BE_READY", "changedFiles": []}

        async def run_fe(_attempt):
            return {
                "status": "CONTRACT_MISMATCH",
                "mismatches": [
                    {
                        "endpoint": "GET /api/projects",
                        "expectedByUi": "metrics",
                        "actualInContractOrApi": "still mismatched",
                    }
                ],
            }

        async def run_tech_lead_triage(_mismatches, attempt):
            return {
                "classification": "BE_DEVIATION",
                "beDirective": f"Retry fix #{attempt + 1}",
            }

        result = await run_escalation_loop(
            run_be=run_be,
            run_fe=run_fe,
            run_tech_lead_triage=run_tech_lead_triage,
            max_retries=2,
        )

        self.assertEqual(result["status"], "HUMAN_ESCALATION_REQUIRED")
        self.assertEqual(result["escalationsUsed"], 2)
        self.assertEqual(len(result["history"]), 2)
        # Initial BE run (1) + 2 escalation retries = 3 total BE runs; never a 4th
        self.assertEqual(be_count, 3)

    def test_route_bugfix_domain_validates_target_layer(self):
        self.assertEqual(route_bugfix_domain({"domain": "be"}), ["be"])
        self.assertEqual(route_bugfix_domain({"domain": "fe"}), ["fe"])
        self.assertEqual(route_bugfix_domain({"domain": "fullstack"}), ["be", "fe"])
        with self.assertRaises(ValueError):
            route_bugfix_domain({"domain": "unknown"})

    async def test_run_qa_gate_loop_routes_fail_to_tech_lead_and_finalizes_pass(self):
        events = []

        async def stage_and_commit(attempt):
            events.append(("stage_commit", attempt))
            return f"sha000{attempt}"

        qa_verdicts = [
            {
                "verdict": "FAIL",
                "evaluationPath": "evaluations/feat-005.json",
                "blockingIssues": ["Missing aria-pressed on filter buttons"],
            },
            {
                "verdict": "PASS",
                "evaluationPath": "evaluations/feat-005.json",
                "blockingIssues": [],
            },
        ]

        async def run_qa(commit_sha, attempt):
            events.append(("qa", commit_sha))
            return qa_verdicts[attempt]

        async def run_remediation(blocking_issues, attempt):
            events.append(("remediate", attempt, blocking_issues[0]))

        async def finalize_done(commit_sha, eval_path):
            events.append(("finalize_done", commit_sha, eval_path))

        out = await run_qa_gate_loop(
            stage_and_commit=stage_and_commit,
            run_qa=run_qa,
            run_remediation=run_remediation,
            finalize_done=finalize_done,
            max_qa_retries=1,
        )
        self.assertEqual(out["verdict"], "PASS")
        self.assertEqual(out["evaluatedCommit"], "sha0001")
        self.assertEqual(
            [e[0] for e in events],
            ["stage_commit", "qa", "remediate", "stage_commit", "qa", "finalize_done"],
        )

    def test_all_workflow_scripts_compile_with_top_level_await(self):
        wf_dir = os.path.dirname(os.path.abspath(__file__))
        scripts = sorted(glob.glob(os.path.join(wf_dir, "*.py")))
        self.assertGreaterEqual(len(scripts), 5)
        for script_path in scripts:
            with open(script_path, encoding="utf-8") as handle:
                compile(
                    handle.read(),
                    script_path,
                    "exec",
                    flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT,
                )

    def test_be_role_workflows_reference_dedicated_be_express_pg_skill(self):
        wf_dir = os.path.dirname(os.path.abspath(__file__))
        for name in ("feature_delivery.py", "bugfix.py"):
            with open(os.path.join(wf_dir, name), encoding="utf-8") as handle:
                src = handle.read()
            self.assertIn(".agents/skills/be-express-pg/SKILL.md", src, f"{name} must wire be-express-pg skill")

    async def test_escalation_loop_escalates_be_schema_mismatch_before_running_fe(self):
        calls = []
        be_responses = [
            {
                "status": "SCHEMA_MISMATCH",
                "mismatches": [
                    {
                        "endpoint": "GET /api/projects",
                        "expectedByUi": "team_size: number",
                        "actualInContractOrApi": "projects.team_size missing in db/schema.sql",
                    }
                ],
            },
            {"status": "BE_READY", "changedFiles": ["apps/api/src/routes/portfolio.ts"]},
        ]
        be_idx = 0

        async def run_be(directive):
            nonlocal be_idx
            calls.append(("be", directive))
            resp = be_responses[be_idx]
            be_idx += 1
            return resp

        async def run_fe(attempt):
            calls.append(("fe", attempt))
            return {"status": "READY", "changedFiles": []}

        async def run_tech_lead_triage(mismatches, attempt):
            calls.append(("tech-lead", attempt, len(mismatches)))
            return {
                "classification": "CONTRACT_GAP",
                "beDirective": "Schema updated with team_size; expose in GET /api/projects",
            }

        result = await run_escalation_loop(
            run_be=run_be,
            run_fe=run_fe,
            run_tech_lead_triage=run_tech_lead_triage,
            max_retries=MAX_ESCALATION_RETRIES,
        )
        self.assertEqual(result["status"], "READY")
        self.assertEqual(result["escalationsUsed"], 1)
        self.assertEqual([c[0] for c in calls], ["be", "tech-lead", "be", "fe"])


if __name__ == "__main__":
    unittest.main()
