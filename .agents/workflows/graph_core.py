import json
import os
import subprocess

MAX_ESCALATION_RETRIES = 2
EVALUATOR_SIGNATURE = "You are an Independent Skeptical QA & Recruiter Product Evaluator"
VALID_ROLES = {"pm", "design", "tech-lead", "be", "fe", "qa"}

PM_SCHEMA = {
    "type": "object",
    "required": ["prdPath", "screens", "featureSummaries"],
    "properties": {
        "prdPath": {"type": "string"},
        "screens": {"type": "array", "items": {"type": "string"}},
        "featureSummaries": {"type": "array", "items": {"type": "string"}},
    },
}

DESIGN_SCHEMA = {
    "type": "object",
    "required": ["status", "stitchProjectId", "frozenFiles"],
    "properties": {
        "status": {
            "type": "string",
            "enum": ["AWAITING_HUMAN_APPROVAL", "FROZEN_TO_GIT"],
        },
        "stitchProjectId": {"type": "string"},
        "frozenFiles": {"type": "array", "items": {"type": "string"}},
    },
}

TECH_LEAD_CONTRACT_SCHEMA = {
    "type": "object",
    "required": ["contractPath", "beInstructions", "feInstructions"],
    "properties": {
        "contractPath": {"type": "string"},
        "beInstructions": {"type": "string"},
        "feInstructions": {"type": "string"},
    },
}

TECH_LEAD_TRIAGE_SCHEMA = {
    "type": "object",
    "required": ["classification", "beDirective"],
    "properties": {
        "classification": {
            "type": "string",
            "enum": ["BE_DEVIATION", "CONTRACT_GAP"],
        },
        "beDirective": {"type": "string"},
        "updatedContractPath": {"type": "string"},
    },
}

BE_SCHEMA = {
    "type": "object",
    "required": ["status"],
    "properties": {
        "status": {"type": "string", "enum": ["BE_READY", "SCHEMA_MISMATCH"]},
        "changedFiles": {"type": "array", "items": {"type": "string"}},
        "testsRun": {"type": "string"},
        "mismatches": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["endpoint", "expectedByUi", "actualInContractOrApi"],
                "properties": {
                    "endpoint": {"type": "string"},
                    "expectedByUi": {"type": "string"},
                    "actualInContractOrApi": {"type": "string"},
                },
            },
        },
    },
}

FE_SCHEMA = {
    "type": "object",
    "required": ["status"],
    "properties": {
        "status": {
            "type": "string",
            "enum": ["READY", "CONTRACT_MISMATCH"],
        },
        "changedFiles": {"type": "array", "items": {"type": "string"}},
        "testsRun": {"type": "string"},
        "mismatches": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["endpoint", "expectedByUi", "actualInContractOrApi"],
                "properties": {
                    "endpoint": {"type": "string"},
                    "expectedByUi": {"type": "string"},
                    "actualInContractOrApi": {"type": "string"},
                },
            },
        },
    },
}

QA_EVAL_SCHEMA = {
    "type": "object",
    "required": ["verdict", "evaluationPath", "blockingIssues"],
    "properties": {
        "verdict": {"type": "string", "enum": ["PASS", "FAIL"]},
        "evaluationPath": {"type": "string"},
        "blockingIssues": {"type": "array", "items": {"type": "string"}},
    },
}

BUGFIX_TRIAGE_SCHEMA = {
    "type": "object",
    "required": ["domain", "rootCause", "fixDirective"],
    "properties": {
        "domain": {"type": "string", "enum": ["be", "fe", "fullstack"]},
        "rootCause": {"type": "string"},
        "fixDirective": {"type": "string"},
    },
}


def build_role_prompt(role: str, skill_path: str, task_body: str) -> str:
    normalized = role.strip().lower()
    if normalized not in VALID_ROLES:
        raise ValueError(f"Unsupported agent role: {role}")
    return (
        f"[AGENT_ROLE: {normalized}]\n"
        f"First read `{skill_path}` and follow its rules strictly.\n\n"
        f"{task_body.strip()}\n"
    )


def build_evaluator_prompt(
    feature_id: str, commit_sha: str, workspace_root: str
) -> str:
    return (
        f"[AGENT_ROLE: qa]\n"
        f"{EVALUATOR_SIGNATURE} for the `lazy-guy` portfolio monorepo.\n"
        f"First read `.agents/skills/evaluating-features/SKILL.md`, "
        f"`.agents/skills/evaluating-features/evaluator-prompt.md`, and "
        f"`.agents/skills/qa-vercel-audit/SKILL.md`.\n\n"
        f"Evaluate feature `{feature_id}` at commit `{commit_sha}` in `{workspace_root}` "
        f"against `specs/prd.md` and `designs/`.\n"
    )


def build_bugfix_qa_prompt(
    bug_report: str,
    commit_sha: str,
    workspace_root: str,
    feature_id: str | None = None,
) -> str:
    cleaned_id = (feature_id or "").strip()
    if cleaned_id and cleaned_id != "bugfix":
        return (
            build_evaluator_prompt(cleaned_id, commit_sha, workspace_root)
            + f"\nRegression context to verify:\n{bug_report.strip()}\n"
        )
    return (
        f"[AGENT_ROLE: qa]\n"
        f"First read `.agents/skills/qa-vercel-audit/SKILL.md`.\n\n"
        f"Verify regression fix at commit `{commit_sha}` in `{workspace_root}` for bug:\n"
        f"{bug_report.strip()}\n\n"
        f"Probe the live running Express + PostgreSQL + Vite stack and run `npm run test:e2e`. "
        f"Do NOT write any file in `evaluations/` (set `evaluationPath` to `'inline-regression-check'`).\n"
    )


async def run_escalation_loop(
    run_be,
    run_fe,
    run_tech_lead_triage,
    max_retries: int = MAX_ESCALATION_RETRIES,
) -> dict:
    history = []
    be_directive = None

    for attempt in range(max_retries + 1):
        be_result = await run_be(be_directive)
        if be_result.get("status") == "SCHEMA_MISMATCH":
            mismatches = be_result.get("mismatches") or []
            if attempt >= max_retries:
                return {
                    "status": "HUMAN_ESCALATION_REQUIRED",
                    "escalationsUsed": attempt,
                    "mismatches": mismatches,
                    "history": history,
                }
            triage = await run_tech_lead_triage(mismatches, attempt)
            history.append(
                {
                    "attempt": attempt + 1,
                    "source": "be",
                    "mismatches": mismatches,
                    "triage": triage,
                }
            )
            be_directive = triage.get("beDirective")
            continue

        fe_result = await run_fe(attempt)

        if fe_result.get("status") == "READY":
            return {
                "status": "READY",
                "escalationsUsed": attempt,
                "beResult": be_result,
                "feResult": fe_result,
                "history": history,
            }

        mismatches = fe_result.get("mismatches") or []
        if attempt >= max_retries:
            return {
                "status": "HUMAN_ESCALATION_REQUIRED",
                "escalationsUsed": attempt,
                "mismatches": mismatches,
                "history": history,
            }

        triage = await run_tech_lead_triage(mismatches, attempt)
        history.append(
            {
                "attempt": attempt + 1,
                "mismatches": mismatches,
                "triage": triage,
            }
        )
        be_directive = triage.get("beDirective")

    return {
        "status": "HUMAN_ESCALATION_REQUIRED",
        "escalationsUsed": max_retries,
        "history": history,
    }


def route_bugfix_domain(triage_result: dict) -> list[str]:
    domain = str(triage_result.get("domain", "")).strip().lower()
    if domain == "be":
        return ["be"]
    if domain == "fe":
        return ["fe"]
    if domain == "fullstack":
        return ["be", "fe"]
    raise ValueError(f"Invalid bugfix domain: {domain}")


def run_mechanical_gate(cwd: str, include_e2e: bool = True) -> dict:
    init_proc = subprocess.run(
        ["./init.sh"],
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,
    )
    combined_out = init_proc.stdout + "\n" + init_proc.stderr
    if init_proc.returncode != 0 or not include_e2e:
        return {
            "ok": init_proc.returncode == 0,
            "exitCode": init_proc.returncode,
            "outputTail": combined_out[-4000:],
        }

    e2e_proc = subprocess.run(
        ["npm", "run", "test:e2e"],
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,
    )
    combined_out += "\n" + e2e_proc.stdout + "\n" + e2e_proc.stderr
    return {
        "ok": e2e_proc.returncode == 0,
        "exitCode": e2e_proc.returncode,
        "outputTail": combined_out[-4000:],
    }


def stage_ready_for_eval_and_commit(cwd: str, feature_id: str, evidence_note: str) -> str:
    feature_path = os.path.join(cwd, "feature_list.json")
    if os.path.exists(feature_path):
        with open(feature_path, encoding="utf-8") as handle:
            data = json.load(handle)
        for item in data.get("features", []):
            if item.get("id") == feature_id and item.get("status") != "done":
                item["status"] = "ready-for-eval"
                item["evidence"] = evidence_note
        with open(feature_path, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)
            handle.write("\n")

    dirty = subprocess.check_output(
        ["git", "status", "--porcelain"], cwd=cwd, text=True
    ).strip()
    if dirty:
        subprocess.run(["git", "add", "-A"], cwd=cwd, check=True)
        subprocess.run(
            ["git", "commit", "-m", f"feat({feature_id}): stage ready-for-eval snapshot"],
            cwd=cwd,
            check=True,
        )

    return subprocess.check_output(
        ["git", "rev-parse", "--short", "HEAD"], cwd=cwd, text=True
    ).strip()


def finalize_done_after_eval(
    cwd: str, feature_id: str, commit_sha: str, evaluation_path: str
) -> None:
    feature_path = os.path.join(cwd, "feature_list.json")
    if os.path.exists(feature_path):
        with open(feature_path, encoding="utf-8") as handle:
            data = json.load(handle)
        for item in data.get("features", []):
            if item.get("id") == feature_id:
                item["status"] = "done"
                item["evidence"] = (
                    f"./init.sh exited 0; independent evaluator PASS at {commit_sha} "
                    f"({evaluation_path})."
                )
        with open(feature_path, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)
            handle.write("\n")

    gate = run_mechanical_gate(cwd, include_e2e=False)
    if not gate["ok"]:
        raise RuntimeError(
            f"Post-evaluation harness gate failed:\n{gate['outputTail']}"
        )

    dirty = subprocess.check_output(
        ["git", "status", "--porcelain"], cwd=cwd, text=True
    ).strip()
    if dirty:
        subprocess.run(["git", "add", "feature_list.json", evaluation_path], cwd=cwd, check=True)
        subprocess.run(
            ["git", "commit", "-m", f"chore(eval): certify {feature_id} PASS at {commit_sha}"],
            cwd=cwd,
            check=True,
        )


async def run_qa_gate_loop(
    stage_and_commit,
    run_qa,
    run_remediation,
    finalize_done,
    max_qa_retries: int = 1,
) -> dict:
    for qa_attempt in range(max_qa_retries + 1):
        commit_sha = await stage_and_commit(qa_attempt)
        qa_verdict = await run_qa(commit_sha, qa_attempt)
        if qa_verdict.get("verdict") == "PASS":
            await finalize_done(commit_sha, qa_verdict["evaluationPath"])
            return {
                "verdict": "PASS",
                "evaluatedCommit": commit_sha,
                "qaAttempts": qa_attempt + 1,
                "qa": qa_verdict,
            }

        blocking_issues = qa_verdict.get("blockingIssues") or []
        if qa_attempt >= max_qa_retries:
            return {
                "verdict": "HUMAN_ESCALATION_REQUIRED",
                "evaluatedCommit": commit_sha,
                "qaAttempts": qa_attempt + 1,
                "blockingIssues": blocking_issues,
                "qa": qa_verdict,
            }

        await run_remediation(blocking_issues, qa_attempt)

    return {"verdict": "HUMAN_ESCALATION_REQUIRED"}
