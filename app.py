"""
app.py — PST_AD_165 Workflow Orchestration Engine  ·  Flask REST API
Exposes endpoints to create, inspect, approve, and resume workflow instances.
"""

import logging
import uuid
from datetime import datetime, timezone

from flask import Flask, jsonify, request

import storage
from engine import WorkflowEngine

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App & engine
# ---------------------------------------------------------------------------
app = Flask(__name__)
engine = WorkflowEngine()


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/workflows/start", methods=["POST"])
def start_workflow():
    """
    Create a new workflow instance and kick it off asynchronously.

    Request body (JSON, optional):
        { "workflowId": "PST_AD_165" }

    Returns the new instance_id immediately — the engine runs in a background
    thread so this call never blocks.
    """
    instance_id = str(uuid.uuid4())
    workflow_def = engine.workflow_def

    # Build initial step states from the workflow definition.
    steps = [
        {
            "stepId": s["stepId"],
            "name": s["name"],
            "status": "pending",
            "attempts": 0,
            "maxAttempts": s.get("maxAttempts", 3),
            "requiresApproval": s.get("requiresApproval", False),
            "lastError": None,
            "startedAt": None,
            "completedAt": None,
        }
        for s in workflow_def["steps"]
    ]

    instance = {
        "instanceId": instance_id,
        "workflowId": workflow_def["workflowId"],
        "status": "pending",
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
        "steps": steps,
    }

    state = storage.read_state()
    state[instance_id] = instance
    storage.write_state(state)

    engine.run_instance(instance_id)

    logger.info("Workflow instance %s created and started.", instance_id)
    return jsonify({"instanceId": instance_id, "status": "pending"}), 202


@app.route("/workflows/<instance_id>", methods=["GET"])
def get_workflow(instance_id: str):
    """Return the current state of a workflow instance."""
    state = storage.read_state()
    instance = state.get(instance_id)
    if not instance:
        return jsonify({"error": "Instance not found."}), 404
    return jsonify(instance), 200


@app.route("/workflows/<instance_id>/approve/<step_id>", methods=["POST"])
def approve_step(instance_id: str, step_id: str):
    """
    Approve a step that is in *waiting_approval* status and resume execution.
    Called by the mobile app after the human review gate.
    """
    state = storage.read_state()
    instance = state.get(instance_id)
    if not instance:
        return jsonify({"error": "Instance not found."}), 404

    step = next((s for s in instance["steps"] if s["stepId"] == step_id), None)
    if not step:
        return jsonify({"error": "Step not found."}), 404

    if step["status"] != "waiting_approval":
        return jsonify({"error": f"Step is not awaiting approval (status: {step['status']})."}), 409

    # Mark as pending so the engine loop picks it up.
    step["status"] = "pending"
    instance["updatedAt"] = _now_iso()
    storage.write_state(state)

    # Resume execution in the background.
    engine.run_instance(instance_id)
    logger.info("Step %s approved; instance %s resumed.", step_id, instance_id)
    return jsonify({"instanceId": instance_id, "stepId": step_id, "status": "resumed"}), 200


@app.route("/workflows/<instance_id>/retry", methods=["POST"])
def retry_workflow(instance_id: str):
    """Force-retry a *failed* workflow instance from its last failed step."""
    state = storage.read_state()
    instance = state.get(instance_id)
    if not instance:
        return jsonify({"error": "Instance not found."}), 404

    if instance["status"] != "failed":
        return jsonify({"error": "Only failed instances can be retried."}), 409

    # Reset the failed step so the engine will re-attempt it.
    for step in instance["steps"]:
        if step["status"] == "failed":
            step["status"] = "pending"
            step["attempts"] = 0
            step["lastError"] = None
            break

    instance["status"] = "pending"
    instance["updatedAt"] = _now_iso()
    storage.write_state(state)

    engine.run_instance(instance_id)
    logger.info("Instance %s queued for retry.", instance_id)
    return jsonify({"instanceId": instance_id, "status": "retrying"}), 200


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5000)

