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


if __name__ == "__main__":
    unittest.main()
