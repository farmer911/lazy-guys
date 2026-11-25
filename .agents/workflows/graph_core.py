import datetime
import inspect
import json
import os
import subprocess

MAX_ESCALATION_RETRIES = 2
DEFAULT_GATE_TIMEOUT_SECONDS = 600
EVALUATOR_SIGNATURE = "You are an Independent Skeptical QA & Recruiter Product Evaluator"
VALID_ROLES = {"pm", "design", "tech-lead", "be", "fe", "qa"}

ROLE_WRITE_ALLOWLIST = {
    "pm": ("specs/prd.md", "feature_list.json"),
    "design": ("designs/",),
    "tech-lead": (
        "specs/contracts/",
        "db/schema.sql",
        "feature_list.json",
        "progress.md",
        "session-handoff.md",
    ),
    "be": ("apps/api/", "db/seed.sql"),
    "fe": ("apps/web/", "apps/e2e/tests/"),
    "qa": ("apps/e2e/", "evaluations/"),
}

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
            "enum": ["AWAITING_HUMAN_APPROVAL", "FROZEN_TO_GIT", "REVISION_REQUIRED"],
        },
        "stitchProjectId": {"type": "string"},
        "frozenFiles": {"type": "array", "items": {"type": "string"}},
        "notes": {"type": "string"},
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


def _validate_value(value, schema: dict, path_label: str) -> None:
    expected_type = schema.get("type")
    if expected_type == "object":
        if not isinstance(value, dict):
            raise ValueError(f"{path_label} must be an object, got {type(value).__name__}")
        required_set = set(schema.get("required", []))
        for req in required_set:
            if req not in value:
                raise ValueError(f"{path_label} missing required key '{req}'")
        props = schema.get("properties", {})
        for key, prop_schema in props.items():
            if key in value and (value[key] is not None or key in required_set):
                _validate_value(value[key], prop_schema, f"{path_label}.{key}")
    elif expected_type == "array":
        if not isinstance(value, list):
            raise ValueError(f"{path_label} must be an array, got {type(value).__name__}")
        item_schema = schema.get("items")
        if item_schema:
            for idx, item in enumerate(value):
                _validate_value(item, item_schema, f"{path_label}[{idx}]")
    elif expected_type == "string":
        if not isinstance(value, str):
            raise ValueError(f"{path_label} must be a string, got {type(value).__name__}")
        if "enum" in schema and value not in schema["enum"]:
            raise ValueError(
                f"{path_label} must be one of {schema['enum']}, got {value!r}"
            )
    elif expected_type == "boolean":
        if not isinstance(value, bool):
            raise ValueError(f"{path_label} must be a boolean, got {type(value).__name__}")
    elif expected_type in ("number", "integer"):
        if isinstance(value, bool) or not isinstance(
            value, int if expected_type == "integer" else (int, float)
        ):
            raise ValueError(
                f"{path_label} must be a {expected_type}, got {type(value).__name__}"
            )


def validate_agent_output(result: dict, schema: dict, role_label: str = "agent") -> dict:
    """Defense-in-depth schema and semantic invariant validation on agent results."""
    _validate_value(result, schema, role_label)

    status = result.get("status")
    if status in ("SCHEMA_MISMATCH", "CONTRACT_MISMATCH"):
        mismatches = result.get("mismatches")
        if not isinstance(mismatches, list) or len(mismatches) == 0:
            raise ValueError(
                f"{role_label}: status '{status}' requires a non-empty 'mismatches' array"
            )

    if schema is QA_EVAL_SCHEMA or "verdict" in result:
        verdict = result.get("verdict")
        if verdict == "PASS":
            if result.get("blockingIssues"):
                raise ValueError(
                    f"{role_label}: verdict 'PASS' cannot contain blockingIssues"
                )
            if not str(result.get("evaluationPath", "")).strip():
                raise ValueError(
                    f"{role_label}: verdict 'PASS' requires a non-empty evaluationPath"
                )
        elif verdict == "FAIL":
            if not result.get("blockingIssues"):
                raise ValueError(
                    f"{role_label}: verdict 'FAIL' requires at least one entry in blockingIssues"
                )

    return result


def _checkpoint_file(cwd: str) -> str:
    return os.path.join(cwd, ".agents", "logs", "workflow-checkpoint.json")


def _atomic_write_json(target_path: str, payload: dict) -> None:
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    tmp_path = f"{target_path}.{os.getpid()}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")
    os.replace(tmp_path, target_path)


def save_workflow_checkpoint(
    cwd: str,
    workflow_name: str,
    target_id: str,
    phase_name: str,
    data: dict | None = None,
) -> dict:
    cp_path = _checkpoint_file(cwd)
    all_cp = {}
    if os.path.exists(cp_path):
        try:
            with open(cp_path, encoding="utf-8") as handle:
                all_cp = json.load(handle)
        except (OSError, json.JSONDecodeError):
            all_cp = {}
    entry = {
        "workflow": workflow_name,
        "targetId": target_id,
        "phase": phase_name,
        "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "data": data or {},
    }
    all_cp[f"{workflow_name}:{target_id}"] = entry
    _atomic_write_json(cp_path, all_cp)
    return entry


def load_workflow_checkpoint(
    cwd: str, workflow_name: str, target_id: str
) -> dict | None:
    cp_path = _checkpoint_file(cwd)
    if not os.path.exists(cp_path):
        return None
    try:
        with open(cp_path, encoding="utf-8") as handle:
            all_cp = json.load(handle)
        return all_cp.get(f"{workflow_name}:{target_id}")
    except (OSError, json.JSONDecodeError):
        return None


def clear_workflow_checkpoint(cwd: str, workflow_name: str, target_id: str) -> None:
    cp_path = _checkpoint_file(cwd)
    if not os.path.exists(cp_path):
        return
    try:
        with open(cp_path, encoding="utf-8") as handle:
            all_cp = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return
    key = f"{workflow_name}:{target_id}"
    if key in all_cp:
        del all_cp[key]
        _atomic_write_json(cp_path, all_cp)


def get_head_sha(cwd: str) -> str | None:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=cwd, text=True, stderr=subprocess.DEVNULL
        ).strip()
    except subprocess.CalledProcessError:
        return None


def get_dirty_files(cwd: str) -> set[str]:
    out = subprocess.check_output(
        ["git", "status", "--porcelain=v1", "-z", "-uall"], cwd=cwd, text=True
    )
    files: set[str] = set()
    if "\0" in out:
        tokens = out.split("\0")
        idx = 0
        while idx < len(tokens):
            entry = tokens[idx]
            idx += 1
            if len(entry) < 4:
                continue
            status_code = entry[:2]
            rel = entry[3:].replace("\\", "/")
            if rel:
                files.add(rel)
            if "R" in status_code or "C" in status_code:
                if idx < len(tokens) and tokens[idx]:
                    files.add(tokens[idx].replace("\\", "/"))
                    idx += 1
        return files

    for line in out.splitlines():
        if len(line) < 4:
            continue
        rel = line[3:].strip()
        if " -> " in rel:
            src, dst = rel.split(" -> ", 1)
            files.add(src.strip().strip('"').replace("\\", "/"))
            files.add(dst.strip().strip('"').replace("\\", "/"))
        elif rel:
            files.add(rel.strip('"').replace("\\", "/"))
    return files


def assert_role_diff_compliance(
    cwd: str,
    role: str,
    baseline_dirty: set[str] | None = None,
    baseline_head: str | None = None,
) -> None:
    normalized = role.strip().lower()
    allowlist = ROLE_WRITE_ALLOWLIST.get(normalized)
    if not allowlist:
        raise ValueError(f"Unsupported agent role: {role}")
    baseline = baseline_dirty or set()
    current_dirty = get_dirty_files(cwd)
    new_changes = set(current_dirty - baseline)

    if baseline_head:
        current_head = get_head_sha(cwd)
        if current_head and current_head != baseline_head:
            committed = subprocess.check_output(
                ["git", "diff", "--name-only", "-z", f"{baseline_head}..{current_head}"],
                cwd=cwd,
                text=True,
            )
            tokens = committed.split("\0") if "\0" in committed else committed.splitlines()
            for tok in tokens:
                if tok.strip():
                    new_changes.add(tok.strip().replace("\\", "/"))

    violations = [
        rel
        for rel in sorted(new_changes)
        if not any(
            rel.lower().startswith(prefix.lower())
            if prefix.endswith("/")
            else rel.lower() == prefix.lower()
            for prefix in allowlist
        )
    ]
    if violations:
        raise PermissionError(
            f"Role '{normalized}' modified out-of-scope file(s): {', '.join(violations)}. "
            f"Allowed: {', '.join(allowlist)}"
        )


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
        f"First read `apps/e2e/AGENTS.md`, `.agents/skills/evaluating-features/SKILL.md`, "
        f"`.agents/skills/evaluating-features/evaluator-prompt.md`, and "
        f"`.agents/skills/qa-vercel-audit/SKILL.md`.\n\n"
        f"Feature ID: {feature_id}\n"
        f"Commit SHA under evaluation: {commit_sha}\n"
        f"Workspace Root: {workspace_root}\n\n"
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
        f"First read `apps/e2e/AGENTS.md` and `.agents/skills/qa-vercel-audit/SKILL.md`.\n\n"
        f"Verify regression fix at commit `{commit_sha}` in `{workspace_root}` for bug:\n"
        f"{bug_report.strip()}\n\n"
        f"Probe the live running Express + PostgreSQL + Vite stack and run `npm run test:e2e`. "
        f"Do NOT write any file in `evaluations/` (set `evaluationPath` to `'inline-regression-check'`).\n"
    )


async def _invoke_triage(run_tech_lead_triage, mismatches, attempt: int, source: str):
    params = list(inspect.signature(run_tech_lead_triage).parameters.values())
    if len(params) >= 3 or any(p.kind == inspect.Parameter.VAR_POSITIONAL for p in params):
        return await run_tech_lead_triage(mismatches, attempt, source)
    return await run_tech_lead_triage(mismatches, attempt)


async def run_escalation_loop(
    run_be,
    run_fe,
    run_tech_lead_triage,
    max_retries: int = MAX_ESCALATION_RETRIES,
) -> dict:
    history = []
    be_directive = None

    for attempt in range(max_retries + 1):
        be_result = validate_agent_output(await run_be(be_directive), BE_SCHEMA, "be")
        if be_result.get("status") == "SCHEMA_MISMATCH":
            mismatches = be_result.get("mismatches") or []
            if attempt >= max_retries:
                return {
                    "status": "HUMAN_ESCALATION_REQUIRED",
                    "escalationsUsed": attempt,
                    "source": "be",
                    "mismatches": mismatches,
                    "history": history,
                }
            triage = validate_agent_output(
                await _invoke_triage(run_tech_lead_triage, mismatches, attempt, "be"),
                TECH_LEAD_TRIAGE_SCHEMA,
                "tech-lead-triage",
            )
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

        fe_result = validate_agent_output(await run_fe(attempt), FE_SCHEMA, "fe")

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
                "source": "fe",
                "mismatches": mismatches,
                "history": history,
            }

        triage = validate_agent_output(
            await _invoke_triage(run_tech_lead_triage, mismatches, attempt, "fe"),
            TECH_LEAD_TRIAGE_SCHEMA,
            "tech-lead-triage",
        )
        history.append(
            {
                "attempt": attempt + 1,
                "source": "fe",
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


def _coerce_output_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return str(value)


def run_mechanical_gate(
    cwd: str,
    include_e2e: bool = True,
    timeout_seconds: int = DEFAULT_GATE_TIMEOUT_SECONDS,
) -> dict:
    try:
        init_proc = subprocess.run(
            ["./init.sh"],
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired as exc:
        partial = _coerce_output_text(exc.output) + "\n" + _coerce_output_text(exc.stderr)
        return {
            "ok": False,
            "exitCode": 124,
            "timedOut": True,
            "outputTail": f"[timeout after {timeout_seconds}s running ./init.sh]\n{partial}"[-4000:],
        }

    combined_out = init_proc.stdout + "\n" + init_proc.stderr
    if init_proc.returncode != 0 or not include_e2e:
        return {
            "ok": init_proc.returncode == 0,
            "exitCode": init_proc.returncode,
            "timedOut": False,
            "outputTail": combined_out[-4000:],
        }

    try:
        e2e_proc = subprocess.run(
            ["npm", "run", "test:e2e"],
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired as exc:
        partial = _coerce_output_text(exc.output) + "\n" + _coerce_output_text(exc.stderr)
        return {
            "ok": False,
            "exitCode": 124,
            "timedOut": True,
            "outputTail": (
                f"{combined_out}\n[timeout after {timeout_seconds}s running npm run test:e2e]\n{partial}"
            )[-4000:],
        }

    combined_out += "\n" + e2e_proc.stdout + "\n" + e2e_proc.stderr
    return {
        "ok": e2e_proc.returncode == 0,
        "exitCode": e2e_proc.returncode,
        "timedOut": False,
        "outputTail": combined_out[-4000:],
    }


def stage_ready_for_eval_and_commit(cwd: str, feature_id: str, evidence_note: str) -> str:
    feature_path = os.path.join(cwd, "feature_list.json")
    if not os.path.exists(feature_path):
        raise FileNotFoundError(f"feature_list.json not found in {cwd}")
    with open(feature_path, encoding="utf-8") as handle:
        data = json.load(handle)

    matched = False
    for item in data.get("features", []):
        if item.get("id") == feature_id:
            matched = True
            if item.get("status") != "done":
                item["status"] = "ready-for-eval"
                item["evidence"] = evidence_note
            break
    if not matched:
        raise ValueError(f"Feature not found in feature_list.json: {feature_id}")

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
    if not os.path.exists(feature_path):
        raise FileNotFoundError(f"feature_list.json not found in {cwd}")

    expected_eval_rel = f"evaluations/{feature_id}.json"
    norm_eval_rel = (
        os.path.relpath(evaluation_path, cwd).replace("\\", "/")
        if os.path.isabs(evaluation_path)
        else os.path.normpath(evaluation_path).replace("\\", "/")
    )
    if norm_eval_rel != expected_eval_rel:
        raise ValueError(
            f"evaluation_path must be '{expected_eval_rel}', got '{evaluation_path}'"
        )

    with open(feature_path, encoding="utf-8") as handle:
        original_raw = handle.read()
    data = json.loads(original_raw)

    target_item = None
    for item in data.get("features", []):
        if item.get("id") == feature_id:
            target_item = item
            break
    if target_item is None:
        raise ValueError(f"Feature not found in feature_list.json: {feature_id}")

    eval_full_path = os.path.join(cwd, expected_eval_rel)
    if not os.path.exists(eval_full_path):
        raise FileNotFoundError(f"Evaluation artifact not found: {expected_eval_rel}")

    with open(eval_full_path, encoding="utf-8") as handle:
        eval_report = json.load(handle)
    recorded_sha = str(eval_report.get("evaluatedCommit") or commit_sha).strip()
    if recorded_sha and commit_sha and not (
        recorded_sha.startswith(commit_sha) or commit_sha.startswith(recorded_sha)
    ):
        raise ValueError(
            f"Evaluation artifact evaluatedCommit '{recorded_sha}' does not match staged commit '{commit_sha}'"
        )
    cited_sha = recorded_sha or commit_sha

    target_item["status"] = "done"
    target_item["evidence"] = (
        f"./init.sh exited 0; independent evaluator PASS at {cited_sha} "
        f"({expected_eval_rel})."
    )

    with open(feature_path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")

    try:
        gate = run_mechanical_gate(cwd, include_e2e=False)
        if not gate["ok"]:
            raise RuntimeError(
                f"Post-evaluation harness gate failed:\n{gate['outputTail']}"
            )
    except Exception:
        with open(feature_path, "w", encoding="utf-8") as handle:
            handle.write(original_raw)
        raise

    dirty_files = get_dirty_files(cwd)
    if dirty_files:
        stage_paths = ["feature_list.json", expected_eval_rel]
        for rel in sorted(dirty_files):
            if rel.startswith("apps/e2e/"):
                stage_paths.append(rel)
        subprocess.run(["git", "add", *stage_paths], cwd=cwd, check=True)
        subprocess.run(
            ["git", "commit", "-m", f"chore(eval): certify {feature_id} PASS at {cited_sha}"],
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
        qa_verdict = validate_agent_output(
            await run_qa(commit_sha, qa_attempt),
            QA_EVAL_SCHEMA,
            "qa-evaluator",
        )
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
