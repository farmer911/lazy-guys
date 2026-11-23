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
    "required": ["status", "changedFiles", "testsRun"],
    "properties": {
        "status": {"type": "string", "enum": ["BE_READY"]},
        "changedFiles": {"type": "array", "items": {"type": "string"}},
        "testsRun": {"type": "string"},
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


def run_mechanical_gate(cwd: str) -> dict:
    proc = subprocess.run(
        ["./init.sh"],
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,
    )
    return {
        "ok": proc.returncode == 0,
        "exitCode": proc.returncode,
        "outputTail": (proc.stdout + "\n" + proc.stderr)[-4000:],
    }
