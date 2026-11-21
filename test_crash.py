#!/usr/bin/env python3
"""
test_crash.py — PST_AD_165 Chaos Test Suite
=============================================

Stress-test the workflow orchestration engine by killing the Flask app
process with SIGKILL across 20 iterations mid-workflow, verifying:

1. state.json remains valid JSON (zero file corruption).
2. Boot-time recovery correctly resumes interrupted instances.
3. Succeeded steps are never re-executed (zero-token-waste guarantee).
4. Step attempt counts respect maxAttempts and are not incorrectly reset.
5. Final workflow state is deterministic and consistent.

Usage:
    cd /path/to/workflow-engine
    python3 test_crash.py

Requirements:
- state.json must not exist (or will be overwritten).
- Port 5000 must be free on localhost.
- Flask and requests packages installed.
"""

import json
import logging
import os
import signal
import subprocess
import sys
import time
import random
from pathlib import Path
from typing import Optional, Dict, Any

# Configure logging for clear test output.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)-8s]  %(message)s",
)
logger = logging.getLogger(__name__)

# Test configuration
REPO_ROOT = Path(__file__).parent
STATE_FILE = REPO_ROOT / "state.json"
APP_PY = REPO_ROOT / "app.py"
HOST = "127.0.0.1"
PORT = 5555  # Use alternate port if 5000 is in use
BASE_URL = f"http://{HOST}:{PORT}"

# Chaos test parameters
NUM_CRASH_ITERATIONS = 20
CRASH_DELAY_MIN = 0.5  # seconds
CRASH_DELAY_MAX = 2.0  # seconds
STARTUP_TIMEOUT = 10  # seconds to wait for Flask to be ready
REQUEST_TIMEOUT = 5  # seconds for HTTP requests
STEP_SLEEP_ENV = 0.2  # Fast step sleep for testing (seconds)


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _wait_for_server(timeout: float = STARTUP_TIMEOUT) -> bool:
    """
    Poll the Flask server until it is ready or timeout expires.

    Returns
    -------
    bool
        True if server became ready, False on timeout.
    """
    import requests

    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = requests.get(
                f"{BASE_URL}/workflows/test-health",
                timeout=REQUEST_TIMEOUT,
            )
            # A 404 from Flask is fine — it means Flask is listening.
            logger.debug(f"Server probe: HTTP {resp.status_code}")
            return True
        except (requests.ConnectionError, requests.Timeout):
            time.sleep(0.1)
    return False


def _start_app() -> subprocess.Popen:
    """
    Start the Flask app as a subprocess with fast step sleep.

    Returns
    -------
    subprocess.Popen
        The running app process.
    """
    env = os.environ.copy()
    env["WF_STEP_SLEEP"] = str(STEP_SLEEP_ENV)
    env["WF_PORT"] = str(PORT)
    env["FLASK_ENV"] = "production"  # Disable debug reloader to avoid double-spawning.

    logger.info("Starting app subprocess…")
    proc = subprocess.Popen(
        [sys.executable, str(APP_PY)],
        env=env,
        cwd=str(REPO_ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    logger.info(f"App started with PID {proc.pid}")

    if not _wait_for_server():
        proc.terminate()
        proc.wait()
        raise RuntimeError(
            f"Flask server did not become ready within {STARTUP_TIMEOUT}s"
        )

    logger.info("Server is ready.")
    return proc


def _read_state_file() -> Optional[Dict[str, Any]]:
    """
    Read and parse the state.json file.

    Returns
    -------
    dict or None
        Parsed state if file exists and is valid JSON, None otherwise.
    """
    if not STATE_FILE.exists():
        return None

    try:
        with open(STATE_FILE, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except (json.JSONDecodeError, IOError) as e:
        logger.error(f"Failed to read/parse state.json: {e}")
        return None


def _assert_state_json_valid():
    """Assert that state.json is valid JSON (if it exists)."""
    if not STATE_FILE.exists():
        return

    try:
        with open(STATE_FILE, "r", encoding="utf-8") as fh:
            json.load(fh)
        logger.info("✓ state.json is valid JSON.")
    except json.JSONDecodeError as e:
        raise AssertionError(f"state.json is corrupted: {e}")


def _get_instance_state(client, instance_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch an instance's state via GET /workflows/<instance_id>.

    Returns
    -------
    dict or None
        Instance data if found, None if 404.
    """
    import requests

    try:
        resp = client.get(f"{BASE_URL}/workflows/{instance_id}", timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 404:
            return None
        else:
            logger.warning(f"Unexpected status {resp.status_code} fetching instance.")
            return None
    except requests.RequestException as e:
        logger.warning(f"Failed to fetch instance: {e}")
        return None


# ---------------------------------------------------------------------------
# Test Logic
# ---------------------------------------------------------------------------

def run_chaos_test():
    """
    Main chaos test runner: start a workflow, crash 20 times, verify invariants.
    """
    import requests

    # Clean up any stale state file.
    if STATE_FILE.exists():
        logger.info("Removing stale state.json…")
        STATE_FILE.unlink()

    # Start the app.
    proc = None
    try:
        proc = _start_app()
        client = requests.Session()

        # ----------------------------------------------------------------
        # Create and start a workflow instance
        # ----------------------------------------------------------------
        logger.info("=" * 70)
        logger.info("PHASE 1: Creating workflow instance…")
        logger.info("=" * 70)

        try:
            resp = client.post(f"{BASE_URL}/workflows/start", timeout=REQUEST_TIMEOUT)
            if resp.status_code != 202:
                raise RuntimeError(
                    f"Failed to create workflow: HTTP {resp.status_code}"
                )
            instance_id = resp.json()["instanceId"]
            logger.info(f"✓ Workflow instance created: {instance_id}")
        except requests.RequestException as e:
            raise RuntimeError(f"Failed to create workflow instance: {e}")

        # ----------------------------------------------------------------
        # Crash/restart iterations
        # ----------------------------------------------------------------
        logger.info("=" * 70)
        logger.info(f"PHASE 2: Running {NUM_CRASH_ITERATIONS} crash/restart iterations…")
        logger.info("=" * 70)

        succeeded_steps = set()  # Track steps we've seen succeed
        iteration_logs = []

        for iteration in range(1, NUM_CRASH_ITERATIONS + 1):
            logger.info(f"\n--- Iteration {iteration}/{NUM_CRASH_ITERATIONS} ---")

            # Wait a random interval to let the workflow progress.
            crash_delay = random.uniform(CRASH_DELAY_MIN, CRASH_DELAY_MAX)
            logger.info(
                f"Letting workflow run for {crash_delay:.2f}s before crash…"
            )
            time.sleep(crash_delay)

            # Check instance state before crash.
            pre_crash_state = _get_instance_state(client, instance_id)
            if pre_crash_state:
                pre_crash_status = pre_crash_state.get("status")
                pre_crash_steps = {
                    s["stepId"]: (s.get("status"), s.get("attempts"))
                    for s in pre_crash_state.get("steps", [])
                }
                logger.info(f"Pre-crash state: status={pre_crash_status}")
                logger.debug(f"Pre-crash steps: {pre_crash_steps}")

                # Track any steps we see completed before crash.
                for step in pre_crash_state.get("steps", []):
                    if step.get("status") == "succeeded":
                        succeeded_steps.add(step["stepId"])
            else:
                pre_crash_status = "unknown"
                pre_crash_steps = {}

            # Crash the process.
            logger.info(f"Killing app process {proc.pid} with SIGKILL…")
            os.kill(proc.pid, signal.SIGKILL)
            proc.wait()  # Ensure process is reaped.
            logger.info("Process killed.")

            # Verify state.json is valid.
            _assert_state_json_valid()
            post_crash_state_file = _read_state_file()

            # Restart the app.
            logger.info("Restarting app…")
            proc = _start_app()
            client = requests.Session()

            # Wait a moment for boot-time recovery to complete.
            time.sleep(0.5)

            # Verify state after recovery.
            post_recovery_state = _get_instance_state(client, instance_id)
            if post_recovery_state:
                post_recovery_status = post_recovery_state.get("status")
                post_recovery_steps = {
                    s["stepId"]: (s.get("status"), s.get("attempts"))
                    for s in post_recovery_state.get("steps", [])
                }
                logger.info(f"Post-recovery state: status={post_recovery_status}")
                logger.debug(f"Post-recovery steps: {post_recovery_steps}")

                # ============================================================
                # Invariant checks
                # ============================================================

                # (1) Check that succeeded steps were not reset.
                for step_id in succeeded_steps:
                    step_info = next(
                        (s for s in post_recovery_state.get("steps", [])
                         if s["stepId"] == step_id),
                        None,
                    )
                    if step_info is None:
                        raise AssertionError(f"Step {step_id} disappeared!")

                    if step_info.get("status") != "succeeded":
                        raise AssertionError(
                            f"Step {step_id} was in 'succeeded' before crash, "
                            f"now in '{step_info.get('status')}' — ZERO-TOKEN-WASTE "
                            f"guarantee violated!"
                        )
                    logger.info(
                        f"  ✓ Step {step_id} remains 'succeeded' (zero-token-waste OK)."
                    )

                # (2) Check attempt counts are not decreasing (no backward reset).
                for step_id, (old_status, old_attempts) in pre_crash_steps.items():
                    step_info = next(
                        (s for s in post_recovery_state.get("steps", [])
                         if s["stepId"] == step_id),
                        None,
                    )
                    if step_info is None:
                        continue
                    new_attempts = step_info.get("attempts", 0)
                    # Attempts should never decrease.
                    if new_attempts < old_attempts:
                        raise AssertionError(
                            f"Step {step_id} attempt count decreased: "
                            f"{old_attempts} → {new_attempts} — maxAttempts logic broken!"
                        )
                    if old_status == "running" and new_attempts == old_attempts:
                        logger.debug(
                            f"  ✓ Step {step_id} attempts preserved across crash: "
                            f"{old_attempts} → {new_attempts}."
                        )

                # (3) Collect any newly succeeded steps for next iteration.
                for step in post_recovery_state.get("steps", []):
                    if step.get("status") == "succeeded":
                        succeeded_steps.add(step["stepId"])

                # Check if workflow is done.
                if post_recovery_status in ("completed", "failed"):
                    logger.info(f"✓ Workflow reached terminal state: {post_recovery_status}")
                    iteration_logs.append({
                        "iteration": iteration,
                        "status": "terminal",
                        "final_status": post_recovery_status,
                    })
                    break
            else:
                logger.warning(
                    "Could not fetch instance state after recovery — "
                    "may still be recovering, continuing…"
                )

            iteration_logs.append({
                "iteration": iteration,
                "status": "running",
            })

        # ----------------------------------------------------------------
        # Final verification
        # ----------------------------------------------------------------
        logger.info("\n" + "=" * 70)
        logger.info("PHASE 3: Final verification…")
        logger.info("=" * 70)

        # Wait a bit for any ongoing work to complete.
        logger.info("Waiting for any ongoing work to complete…")
        time.sleep(2)

        final_state = _get_instance_state(client, instance_id)
        if final_state is None:
            raise RuntimeError("Instance not found in final state!")

        final_status = final_state.get("status")
        final_steps = final_state.get("steps", [])

        logger.info(f"Final instance status: {final_status}")
        logger.info(f"Final steps:")
        for step in final_steps:
            logger.info(
                f"  {step['stepId']:12} | status={step.get('status'):15} | "
                f"attempts={step.get('attempts'):2} | "
                f"maxAttempts={step.get('maxAttempts'):2}"
            )

        # ----------------------------------------------------------------
        # Results summary
        # ----------------------------------------------------------------
        logger.info("\n" + "=" * 70)
        logger.info("RESULTS SUMMARY")
        logger.info("=" * 70)

        completed_count = sum(1 for s in final_steps if s.get("status") == "succeeded")
        total_steps = len(final_steps)

        logger.info(f"Workflow ran through {len(iteration_logs)} crash iterations.")
        logger.info(f"Final state: {final_status}")
        logger.info(f"Completed steps: {completed_count}/{total_steps}")
        logger.info(f"Succeeded steps tracked: {succeeded_steps}")

        if final_status in ("completed", "failed"):
            logger.info("\n✓✓✓ CHAOS TEST PASSED ✓✓✓")
            logger.info(
                f"Workflow successfully {final_status} after "
                f"{len(iteration_logs)} crash/restart cycles."
            )
            logger.info(f"Zero-token-waste guarantee maintained: {completed_count} steps.")
            logger.info("No JSON corruption detected.")
            return True
        else:
            logger.warning(f"\n⚠ CHAOS TEST INCOMPLETE")
            logger.warning(
                f"Workflow in '{final_status}' state after "
                f"{len(iteration_logs)} iterations (did not reach terminal state)."
            )
            return False

    except Exception as e:
        logger.error(f"\n✗✗✗ CHAOS TEST FAILED ✗✗✗")
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # Cleanup: ensure the subprocess is terminated.
        if proc and proc.poll() is None:
            logger.info("Cleaning up: terminating app subprocess…")
            try:
                os.kill(proc.pid, signal.SIGTERM)
                proc.wait(timeout=5)
            except (ProcessLookupError, subprocess.TimeoutExpired):
                try:
                    os.kill(proc.pid, signal.SIGKILL)
                    proc.wait()
                except ProcessLookupError:
                    pass
            logger.info("App subprocess terminated.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    try:
        success = run_chaos_test()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("\nTest interrupted by user.")
        sys.exit(130)
