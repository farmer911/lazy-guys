import ast
import glob
import os
import unittest

from unittest import mock

from graph_core import (
    EVALUATOR_SIGNATURE,
    MAX_ESCALATION_RETRIES,
    build_bugfix_qa_prompt,
    build_evaluator_prompt,
    build_role_prompt,
    route_bugfix_domain,
    run_escalation_loop,
    run_mechanical_gate,
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

    def test_run_mechanical_gate_runs_init_and_playwright_e2e_by_default(self):
        executed = []

        def fake_run(cmd, cwd, capture_output, text, check, timeout=None):
            executed.append((cmd, timeout))
            res = mock.Mock()
            res.returncode = 0
            res.stdout = f"ok {cmd[0]}"
            res.stderr = ""
            return res

        with mock.patch("graph_core.subprocess.run", side_effect=fake_run):
            gate = run_mechanical_gate("/repo")
            self.assertTrue(gate["ok"])
            self.assertEqual(
                executed, [(["./init.sh"], 600), (["npm", "run", "test:e2e"], 600)]
            )

            executed.clear()
            gate_init_only = run_mechanical_gate("/repo", include_e2e=False)
            self.assertTrue(gate_init_only["ok"])
            self.assertEqual(executed, [(["./init.sh"], 600)])

    def test_build_bugfix_qa_prompt_prevents_orphan_evaluations_file_without_feature_id(self):
        standalone = build_bugfix_qa_prompt(
            bug_report="Fix header overflow",
            commit_sha="abc1234",
            workspace_root="/repo",
            feature_id=None,
        )
        self.assertTrue(standalone.startswith("[AGENT_ROLE: qa]\n"))
        self.assertNotIn("evaluations/bugfix.json", standalone)
        self.assertIn("Do NOT write any file in `evaluations/`", standalone)

        linked = build_bugfix_qa_prompt(
            bug_report="Fix modal close",
            commit_sha="abc1234",
            workspace_root="/repo",
            feature_id="feat-005",
        )
        self.assertIn(EVALUATOR_SIGNATURE, linked)
        self.assertIn("feat-005", linked)

    def test_feature_delivery_instructs_fe_on_e2e_spec_updates(self):
        wf_dir = os.path.dirname(os.path.abspath(__file__))
        with open(os.path.join(wf_dir, "feature_delivery.py"), encoding="utf-8") as handle:
            src = handle.read()
        self.assertIn("apps/e2e/tests/", src)

    def test_build_evaluator_prompt_includes_canonical_structural_markers(self):
        prompt = build_evaluator_prompt(
            feature_id="feat-005",
            commit_sha="82db475",
            workspace_root="/repo",
        )
        self.assertIn("Commit SHA under evaluation: 82db475", prompt)
        self.assertIn("Feature ID: feat-005", prompt)
        self.assertIn("Workspace Root: /repo", prompt)

    def test_validate_agent_output_enforces_schema_and_semantic_invariants(self):
        from graph_core import (
            BE_SCHEMA,
            QA_EVAL_SCHEMA,
            validate_agent_output,
        )

        # Valid BE_READY passes
        validate_agent_output({"status": "BE_READY", "changedFiles": []}, BE_SCHEMA, "be")

        # Invalid enum fails
        with self.assertRaises(ValueError):
            validate_agent_output({"status": "INVALID"}, BE_SCHEMA, "be")

        # Semantic invariant: SCHEMA_MISMATCH must include non-empty mismatches
        with self.assertRaises(ValueError):
            validate_agent_output({"status": "SCHEMA_MISMATCH", "mismatches": []}, BE_SCHEMA, "be")

        # Semantic invariant: QA PASS must have empty blockingIssues
        with self.assertRaises(ValueError):
            validate_agent_output(
                {
                    "verdict": "PASS",
                    "evaluationPath": "evaluations/feat-005.json",
                    "blockingIssues": ["unfixed bug"],
                },
                QA_EVAL_SCHEMA,
                "qa",
            )

    def test_workflow_checkpoint_save_load_and_clear(self):
        import tempfile
        from graph_core import (
            clear_workflow_checkpoint,
            load_workflow_checkpoint,
            save_workflow_checkpoint,
        )

        with tempfile.TemporaryDirectory() as tmp:
            self.assertIsNone(load_workflow_checkpoint(tmp, "feature_delivery", "feat-005"))
            save_workflow_checkpoint(
                tmp,
                "feature_delivery",
                "feat-005",
                phase_name="contract_locked",
                data={"contractPath": "specs/contracts/feat-005.ts"},
            )
            loaded = load_workflow_checkpoint(tmp, "feature_delivery", "feat-005")
            self.assertEqual(loaded["phase"], "contract_locked")
            self.assertEqual(loaded["data"]["contractPath"], "specs/contracts/feat-005.ts")
            clear_workflow_checkpoint(tmp, "feature_delivery", "feat-005")
            self.assertIsNone(load_workflow_checkpoint(tmp, "feature_delivery", "feat-005"))

    def test_run_mechanical_gate_handles_timeout_cleanly(self):
        import subprocess

        def fake_timeout(*_args, **_kwargs):
            raise subprocess.TimeoutExpired(cmd=["./init.sh"], timeout=5, output="partial", stderr="hung")

        with mock.patch("graph_core.subprocess.run", side_effect=fake_timeout) as mocked:
            gate = run_mechanical_gate("/repo", timeout_seconds=5)
            self.assertFalse(gate["ok"])
            self.assertEqual(gate["exitCode"], 124)
            self.assertTrue(gate.get("timedOut"))
            self.assertEqual(mocked.call_args.kwargs.get("timeout"), 5)

    def test_stage_and_finalize_raise_value_error_on_missing_feature(self):
        import json
        import tempfile
        from graph_core import finalize_done_after_eval, stage_ready_for_eval_and_commit

        with tempfile.TemporaryDirectory() as tmp:
            with open(os.path.join(tmp, "feature_list.json"), "w", encoding="utf-8") as handle:
                json.dump({"features": [{"id": "feat-001", "status": "done"}]}, handle)
            with self.assertRaises(ValueError):
                stage_ready_for_eval_and_commit(tmp, "feat-999", "note")
            with self.assertRaises(ValueError):
                finalize_done_after_eval(tmp, "feat-999", "abc1234", "evaluations/feat-999.json")

    def test_assert_role_diff_compliance_flags_out_of_scope_files(self):
        from graph_core import assert_role_diff_compliance

        with mock.patch(
            "graph_core.subprocess.check_output",
            return_value=" M apps/web/src/App.tsx\n M apps/api/src/routes/portfolio.ts\n",
        ):
            # apps/web was pre-existing in baseline, apps/api is allowed for 'be' -> ok
            assert_role_diff_compliance("/repo", "be", baseline_dirty={"apps/web/src/App.tsx"})
            # Without baseline exemption, 'be' touching apps/web/src/App.tsx fails
            with self.assertRaises(PermissionError):
                assert_role_diff_compliance("/repo", "be", baseline_dirty=set())

    def test_feature_delivery_triage_does_not_hardcode_from_fe(self):
        wf_dir = os.path.dirname(os.path.abspath(__file__))
        with open(os.path.join(wf_dir, "feature_delivery.py"), encoding="utf-8") as handle:
            src = handle.read()
        self.assertNotIn("from FE on", src)

    def test_validate_agent_output_rejects_none_for_required_keys_and_empty_fail_issues(self):
        from graph_core import (
            BE_SCHEMA,
            QA_EVAL_SCHEMA,
            TECH_LEAD_CONTRACT_SCHEMA,
            validate_agent_output,
        )

        with self.assertRaises(ValueError):
            validate_agent_output({"status": None}, BE_SCHEMA, "be")
        with self.assertRaises(ValueError):
            validate_agent_output(
                {"contractPath": None, "beInstructions": "x", "feInstructions": "y"},
                TECH_LEAD_CONTRACT_SCHEMA,
                "tl",
            )
        with self.assertRaises(ValueError):
            validate_agent_output(
                {"verdict": "FAIL", "evaluationPath": "evaluations/feat-005.json", "blockingIssues": []},
                QA_EVAL_SCHEMA,
                "qa",
            )

    def test_assert_role_diff_compliance_handles_renames_spaces_untracked_dirs_and_committed_edits(self):
        import subprocess
        import tempfile
        from graph_core import assert_role_diff_compliance, get_dirty_files, get_head_sha

        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run(["git", "init", "-b", "main"], cwd=tmp, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["git", "config", "user.email", "t@e.com"], cwd=tmp, check=True)
            subprocess.run(["git", "config", "user.name", "T"], cwd=tmp, check=True)
            os.makedirs(os.path.join(tmp, "apps/api/src"), exist_ok=True)
            os.makedirs(os.path.join(tmp, "apps/web/src"), exist_ok=True)
            with open(os.path.join(tmp, "apps/api/src/index.ts"), "w", encoding="utf-8") as h:
                h.write("export const a = 1;\n")
            subprocess.run(["git", "add", "-A"], cwd=tmp, check=True)
            subprocess.run(["git", "commit", "-m", "init"], cwd=tmp, check=True, stdout=subprocess.DEVNULL)

            base_head = get_head_sha(tmp)
            base_dirty = get_dirty_files(tmp)

            # 1. File with space inside allowed dir apps/web/src/ must PASS (no quote false positive)
            spaced = os.path.join(tmp, "apps/web/src/my card.tsx")
            with open(spaced, "w", encoding="utf-8") as h:
                h.write("export const x = 1;\n")
            assert_role_diff_compliance(tmp, "fe", baseline_dirty=base_dirty, baseline_head=base_head)
            os.unlink(spaced)

            # 2. git mv from apps/api -> apps/web must FAIL for fe (out-of-scope source deleted!)
            subprocess.run(["git", "mv", "apps/api/src/index.ts", "apps/web/src/moved.ts"], cwd=tmp, check=True)
            with self.assertRaises(PermissionError):
                assert_role_diff_compliance(tmp, "fe", baseline_dirty=base_dirty, baseline_head=base_head)
            subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=tmp, check=True, stdout=subprocess.DEVNULL)

            # 3. Committed out-of-scope edit must FAIL when baseline_head is passed
            with open(os.path.join(tmp, "apps/api/src/index.ts"), "w", encoding="utf-8") as h:
                h.write("export const a = 2;\n")
            subprocess.run(["git", "add", "-A"], cwd=tmp, check=True)
            subprocess.run(["git", "commit", "-m", "sneaky"], cwd=tmp, check=True, stdout=subprocess.DEVNULL)
            with self.assertRaises(PermissionError):
                assert_role_diff_compliance(tmp, "fe", baseline_dirty=base_dirty, baseline_head=base_head)

    def test_finalize_done_rolls_back_feature_list_on_gate_failure_and_validates_eval_path(self):
        import json
        import tempfile
        from graph_core import finalize_done_after_eval

        with tempfile.TemporaryDirectory() as tmp:
            os.makedirs(os.path.join(tmp, "evaluations"), exist_ok=True)
            fl_path = os.path.join(tmp, "feature_list.json")
            original = {
                "features": [
                    {
                        "id": "feat-005",
                        "name": "Polish",
                        "description": "Desc",
                        "dependencies": [],
                        "status": "ready-for-eval",
                        "evidence": "staged",
                    }
                ]
            }
            with open(fl_path, "w", encoding="utf-8") as h:
                json.dump(original, h, indent=2)
            with open(os.path.join(tmp, "evaluations", "feat-005.json"), "w", encoding="utf-8") as h:
                json.dump({"featureId": "feat-005", "evaluatedCommit": "abc1234567890", "verdict": "PASS"}, h)

            # Wrong evaluation_path must raise ValueError before touching feature_list.json
            with self.assertRaises(ValueError):
                finalize_done_after_eval(tmp, "feat-005", "abc1234", "evaluations/other.json")

            # Gate failure must roll back feature_list.json to ready-for-eval
            with mock.patch("graph_core.run_mechanical_gate", return_value={"ok": False, "exitCode": 1, "outputTail": "fail"}):
                with self.assertRaises(RuntimeError):
                    finalize_done_after_eval(tmp, "feat-005", "abc1234", "evaluations/feat-005.json")
            with open(fl_path, encoding="utf-8") as h:
                after = json.load(h)
            self.assertEqual(after["features"][0]["status"], "ready-for-eval")

    def test_round2_folder_agents_wired_and_tech_lead_cannot_overwrite_prd(self):
        from graph_core import assert_role_diff_compliance

        wf_dir = os.path.dirname(os.path.abspath(__file__))
        with open(os.path.join(wf_dir, "feature_delivery.py"), encoding="utf-8") as h:
            fd_src = h.read()
        with open(os.path.join(wf_dir, "bugfix.py"), encoding="utf-8") as h:
            bf_src = h.read()
        self.assertIn("apps/web/AGENTS.md", fd_src)
        self.assertIn("apps/e2e/AGENTS.md", fd_src)
        self.assertIn("apps/web/AGENTS.md", bf_src)

        eval_prompt = build_evaluator_prompt("feat-005", "abc1234", "/repo")
        self.assertIn("apps/e2e/AGENTS.md", eval_prompt)
        standalone_qa = build_bugfix_qa_prompt("bug", "abc1234", "/repo")
        self.assertIn("apps/e2e/AGENTS.md", standalone_qa)

        with mock.patch("graph_core.subprocess.check_output", return_value=" M specs/prd.md\x00"):
            with self.assertRaises(PermissionError):
                assert_role_diff_compliance("/repo", "tech-lead", baseline_dirty=set())
        with mock.patch("graph_core.subprocess.check_output", return_value=" M specs/contracts/feat-005.ts\x00"):
            assert_role_diff_compliance("/repo", "tech-lead", baseline_dirty=set())

    def test_round3_utf8_committed_paths_bugfix_finalization_and_checkpoint_hardening(self):
        import subprocess
        import tempfile
        from graph_core import assert_role_diff_compliance, get_dirty_files, get_head_sha

        # M6: UTF-8 committed filename inside apps/web/src/ must NOT false-positive
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run(["git", "init", "-b", "main"], cwd=tmp, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["git", "config", "user.email", "t@e.com"], cwd=tmp, check=True)
            subprocess.run(["git", "config", "user.name", "T"], cwd=tmp, check=True)
            os.makedirs(os.path.join(tmp, "apps/web/src"), exist_ok=True)
            with open(os.path.join(tmp, "apps/web/src/base.ts"), "w", encoding="utf-8") as h:
                h.write("export const a = 1;\n")
            subprocess.run(["git", "add", "-A"], cwd=tmp, check=True)
            subprocess.run(["git", "commit", "-m", "init"], cwd=tmp, check=True, stdout=subprocess.DEVNULL)

            base_head = get_head_sha(tmp)
            base_dirty = get_dirty_files(tmp)
            with open(os.path.join(tmp, "apps/web/src/café.ts"), "w", encoding="utf-8") as h:
                h.write("export const b = 2;\n")
            subprocess.run(["git", "add", "-A"], cwd=tmp, check=True)
            subprocess.run(["git", "commit", "-m", "utf8"], cwd=tmp, check=True, stdout=subprocess.DEVNULL)
            assert_role_diff_compliance(tmp, "fe", baseline_dirty=base_dirty, baseline_head=base_head)

        # H3 + M5: bugfix.py uses finalize_done_after_eval for linked featureId, project_init resumes checkpoint, feature_delivery guards realpath traversal
        wf_dir = os.path.dirname(os.path.abspath(__file__))
        with open(os.path.join(wf_dir, "bugfix.py"), encoding="utf-8") as h:
            bf_src = h.read()
        with open(os.path.join(wf_dir, "project_init.py"), encoding="utf-8") as h:
            pi_src = h.read()
        with open(os.path.join(wf_dir, "feature_delivery.py"), encoding="utf-8") as h:
            fd_src = h.read()
        self.assertIn("finalize_done_after_eval", bf_src)
        self.assertIn("load_workflow_checkpoint", pi_src)
        self.assertIn("commonpath", fd_src)


if __name__ == "__main__":
    unittest.main()
