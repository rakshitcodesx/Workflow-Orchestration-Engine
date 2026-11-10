"""
engine.py — PST_AD_165 Workflow Orchestration Engine  ·  Core State Machine
============================================================================

Architecture notes
------------------
* Zero-Token-Waste guarantee: steps already marked "succeeded" are **never**
  re-executed.  The skip check is the very first thing evaluated per step.
* Non-blocking: run_instance() spawns a daemon thread so Flask remains
  responsive while a workflow is in-flight.
* Fault injection: a seeded pseudo-random failure (30 % probability) simulates
  network drops and LLM rate-limit errors for automated crash tests.
* Durable state: every status transition is committed to storage *before* and
  *after* simulated work, ensuring the WAL (storage.py) can reconstruct the
  exact position after a process restart.
"""

import json
import logging
import os
import random
import threading
import time
from datetime import datetime, timezone
from typing import Optional

import storage

# ---------------------------------------------------------------------------
# Module-level logger
# ---------------------------------------------------------------------------
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Fault-injection constants (overridable via environment variables for tests)
# ---------------------------------------------------------------------------
# Probability that a single step execution attempt will be simulated as a
# transient failure (network drop / LLM rate-limit).  Default: 30 %.
_FAILURE_PROBABILITY: float = float(os.environ.get("WF_FAILURE_PROBABILITY", "0.30"))

# Seed for the PRNG used in fault injection.  A fixed seed guarantees
# deterministic failure sequences in automated crash tests.
_RANDOM_SEED: int = int(os.environ.get("WF_RANDOM_SEED", "42"))

# Simulated "AI agent thinking" delay in seconds.
_STEP_SLEEP_SECONDS: float = float(os.environ.get("WF_STEP_SLEEP", "2"))

# Path to the workflow definition JSON.
_WORKFLOW_DEF_PATH: str = os.path.join(
    os.path.dirname(__file__), "workflows", "agent_flow.json"
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    """Return the current UTC time as an ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _find_step(instance: dict, step_id: str) -> Optional[dict]:
    """Return the step dict with the given stepId, or None."""
    return next((s for s in instance["steps"] if s["stepId"] == step_id), None)


# ---------------------------------------------------------------------------
# WorkflowEngine
# ---------------------------------------------------------------------------

class WorkflowEngine:
    """
    Core state-machine engine for PST_AD_165.

    Public interface
    ----------------
    run_instance(instance_id)
        Spawn a background thread that drives the workflow instance identified
        by *instance_id* to completion (or failure).
    """

    # Shared PRNG — seeded once at class construction so that a full test run
    # always exercises the same failure sequence.
    _rng: random.Random = random.Random(_RANDOM_SEED)
    # Lock protecting _rng across threads.
    _rng_lock: threading.Lock = threading.Lock()

    def __init__(self) -> None:
        """Load workflow definition and wire up storage access."""
        self.workflow_def: dict = self._load_workflow_def()
        logger.info(
            "WorkflowEngine initialised — workflow '%s' v%s loaded (%d steps).",
            self.workflow_def.get("workflowId"),
            self.workflow_def.get("version", "?"),
            len(self.workflow_def.get("steps", [])),
        )

    # ------------------------------------------------------------------
    # Workflow definition loader
    # ------------------------------------------------------------------

    @staticmethod
    def _load_workflow_def() -> dict:
        """
        Read and parse workflows/agent_flow.json.

        Raises
        ------
        FileNotFoundError
            If the workflow definition file is missing.
        json.JSONDecodeError
            If the file is malformed JSON.
        """
        if not os.path.exists(_WORKFLOW_DEF_PATH):
            raise FileNotFoundError(
                f"Workflow definition not found at: {_WORKFLOW_DEF_PATH}"
            )
        with open(_WORKFLOW_DEF_PATH, "r", encoding="utf-8") as fh:
            definition = json.load(fh)
        logger.debug("Loaded workflow definition: %s", _WORKFLOW_DEF_PATH)
        return definition

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run_instance(self, instance_id: str) -> threading.Thread:
        """
        Spawn a background daemon thread to execute *instance_id*.

        The thread is marked as a daemon so it does not prevent the process
        from exiting if the main thread finishes (e.g. during unit tests).

        Parameters
        ----------
        instance_id:
            The UUID of the workflow instance to execute.

        Returns
        -------
        threading.Thread
            The started thread (useful for tests that want to .join()).
        """
        thread = threading.Thread(
            target=self._execute_loop,
            args=(instance_id,),
            name=f"wf-{instance_id[:8]}",
            daemon=True,
        )
        thread.start()
        logger.info(
            "[%s] Background thread '%s' started.", instance_id[:8], thread.name
        )
        return thread

    # ------------------------------------------------------------------
    # State-machine loop (runs inside the background thread)
    # ------------------------------------------------------------------

    def _execute_loop(self, instance_id: str) -> None:
        """
        Drive the workflow instance through its steps.

        State transitions per step
        --------------------------
        pending / (previous failure that is retryable)
            → running  (pre-execution save)
            → succeeded  (happy path)
            → running again  (retry on transient failure, attempts < maxAttempts)
            → failed  (attempts >= maxAttempts)

        Zero-Token-Waste shortcut
        -------------------------
        Steps already in "succeeded" are logged and skipped immediately.

        Approval gate
        -------------
        Steps in "waiting_approval" break the loop; execution resumes when the
        mobile app calls POST /workflows/<id>/approve/<stepId> which resets the
        step to "pending" and calls run_instance() again.
        """
        log_prefix = f"[{instance_id[:8]}]"
        logger.info("%s Execution loop started.", log_prefix)

        try:
            self._run_steps(instance_id, log_prefix)
        except Exception as exc:  # pylint: disable=broad-except
            # Catch-all: mark the instance as failed so it is never left in
            # an ambiguous "running" state if an unexpected exception occurs.
            logger.exception(
                "%s Unhandled exception in execution loop — marking instance as failed.",
                log_prefix,
            )
            self._emergency_fail(instance_id, str(exc))

    def _run_steps(self, instance_id: str, log_prefix: str) -> None:
        """Inner step iteration, separated for testability."""
        # ------------------------------------------------------------------ #
        # Fetch instance from durable storage.                                #
        # ------------------------------------------------------------------ #
        state = storage.read_state()
        instance = state.get(instance_id)
        if instance is None:
            logger.error(
                "%s Instance not found in storage — aborting.", log_prefix
            )
            return

        steps: list[dict] = instance["steps"]

        # ------------------------------------------------------------------ #
        # Main step loop                                                       #
        # ------------------------------------------------------------------ #
        step_index = 0
        while step_index < len(steps):
            # Always re-read state at the top of each iteration so that
            # external mutations (e.g. an approval) are visible.
            state = storage.read_state()
            instance = state[instance_id]
            step = instance["steps"][step_index]

            step_id = step["stepId"]
            step_name = step["name"]
            step_log = f"{log_prefix} [{step_id}|{step_name}]"

            # -------------------------------------------------------------- #
            # (1) Zero-Token-Waste skip check                                  #
            # -------------------------------------------------------------- #
            if step["status"] == "succeeded":
                logger.info(
                    "%s SKIP — already succeeded (Zero-Token-Waste).", step_log
                )
                step_index += 1
                continue

            # -------------------------------------------------------------- #
            # (2) Approval gate                                                #
            # -------------------------------------------------------------- #
            if step["status"] == "waiting_approval":
                logger.info(
                    "%s PAUSE — waiting for human approval. "
                    "Resume via POST /workflows/%s/approve/%s.",
                    step_log, instance_id, step_id,
                )
                return  # Thread exits; will be re-spawned on approval.

            # -------------------------------------------------------------- #
            # (3) Pre-execution state save  (status → "running")              #
            # -------------------------------------------------------------- #
            step["status"] = "running"
            step["attempts"] = step.get("attempts", 0) + 1
            step["startedAt"] = _now_iso()
            instance["status"] = "running"
            instance["updatedAt"] = _now_iso()
            storage.write_state(state)

            attempt_no = step["attempts"]
            max_attempts = step.get("maxAttempts", 3)
            logger.info(
                "%s attempt %d/%d — status set to 'running', state persisted.",
                step_log, attempt_no, max_attempts,
            )

            # -------------------------------------------------------------- #
            # (4) Simulated work + fault injection                             #
            # -------------------------------------------------------------- #
            logger.debug("%s Simulating AI agent work (%.1fs)…", step_log, _STEP_SLEEP_SECONDS)
            time.sleep(_STEP_SLEEP_SECONDS)

            step_succeeded = self._simulate_step(step_id, attempt_no)

            # -------------------------------------------------------------- #
            # (5a) Happy path — step succeeded                                 #
            # -------------------------------------------------------------- #
            if step_succeeded:
                # Re-read state to guard against concurrent writes.
                state = storage.read_state()
                instance = state[instance_id]
                step = instance["steps"][step_index]

                step["status"] = "succeeded"
                step["completedAt"] = _now_iso()
                step["lastError"] = None
                instance["updatedAt"] = _now_iso()
                storage.write_state(state)

                logger.info("%s SUCCEEDED — state persisted.", step_log)

                # If this step requires approval before the *next* step, mark
                # the following step accordingly (approval gate pattern).
                # (Approval on the *current* step means the step itself pauses
                #  *before* execution — handled in check (2) above.)
                next_index = step_index + 1
                if next_index < len(instance["steps"]):
                    next_step = instance["steps"][next_index]
                    if next_step.get("requiresApproval") and next_step["status"] == "pending":
                        state = storage.read_state()
                        instance = state[instance_id]
                        instance["steps"][next_index]["status"] = "waiting_approval"
                        instance["updatedAt"] = _now_iso()
                        storage.write_state(state)
                        logger.info(
                            "%s Next step '%s' set to 'waiting_approval'.",
                            step_log, next_step["stepId"],
                        )

                step_index += 1  # Advance to next step.

            # -------------------------------------------------------------- #
            # (5b) Failure path                                                #
            # -------------------------------------------------------------- #
            else:
                error_msg = (
                    f"Transient failure on attempt {attempt_no}/{max_attempts} "
                    f"(simulated network/LLM rate-limit drop)."
                )
                logger.warning("%s FAILED — %s", step_log, error_msg)

                state = storage.read_state()
                instance = state[instance_id]
                step = instance["steps"][step_index]
                step["lastError"] = error_msg

                if attempt_no < max_attempts:
                    # Retryable: reset to "pending" so the loop retries.
                    step["status"] = "pending"
                    instance["updatedAt"] = _now_iso()
                    storage.write_state(state)
                    logger.info(
                        "%s Retrying (attempt %d/%d scheduled)…",
                        step_log, attempt_no + 1, max_attempts,
                    )
                    # Do NOT increment step_index — retry the same step.
                else:
                    # Exhausted all attempts — hard fail.
                    step["status"] = "failed"
                    step["completedAt"] = _now_iso()
                    instance["status"] = "failed"
                    instance["updatedAt"] = _now_iso()
                    storage.write_state(state)
                    logger.error(
                        "%s EXHAUSTED %d/%d attempts — instance marked 'failed'.",
                        step_log, attempt_no, max_attempts,
                    )
                    return  # Terminate the execution loop.

        # ------------------------------------------------------------------ #
        # All steps finished successfully                                       #
        # ------------------------------------------------------------------ #
        state = storage.read_state()
        instance = state[instance_id]
        instance["status"] = "completed"
        instance["updatedAt"] = _now_iso()
        storage.write_state(state)
        logger.info(
            "%s All steps completed — instance status set to 'completed'.",
            log_prefix,
        )

    # ------------------------------------------------------------------
    # Fault injection
    # ------------------------------------------------------------------

    def _simulate_step(self, step_id: str, attempt: int) -> bool:
        """
        Simulate step execution with seeded fault injection.

        Returns
        -------
        bool
            True  → step succeeded.
            False → step failed (transient error).

        The PRNG is seeded globally so the failure pattern is fully
        reproducible across test runs (seed = WF_RANDOM_SEED env var, default 42).
        """
        with self._rng_lock:
            roll = self._rng.random()

        succeeded = roll >= _FAILURE_PROBABILITY
        logger.debug(
            "Fault injection — step=%s attempt=%d roll=%.4f threshold=%.2f → %s",
            step_id, attempt, roll, _FAILURE_PROBABILITY,
            "SUCCESS" if succeeded else "FAILURE",
        )
        return succeeded

    # ------------------------------------------------------------------
    # Emergency handler
    # ------------------------------------------------------------------

    def _emergency_fail(self, instance_id: str, reason: str) -> None:
        """
        Best-effort attempt to mark an instance as 'failed' after an
        unexpected exception, so it is never left stuck in 'running'.
        """
        try:
            state = storage.read_state()
            instance = state.get(instance_id)
            if instance is None:
                return
            instance["status"] = "failed"
            instance["updatedAt"] = _now_iso()
            # Also fail any step currently in "running" state.
            for step in instance["steps"]:
                if step["status"] == "running":
                    step["status"] = "failed"
                    step["lastError"] = f"Emergency stop: {reason}"
                    step["completedAt"] = _now_iso()
            storage.write_state(state)
            logger.error(
                "[%s] Emergency fail persisted — reason: %s",
                instance_id[:8], reason,
            )
        except Exception:  # pylint: disable=broad-except
            logger.exception(
                "[%s] Emergency fail handler itself raised an exception.",
                instance_id[:8],
            )

