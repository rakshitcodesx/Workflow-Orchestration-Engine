"""
app.py — PST_AD_165 Workflow Orchestration Engine  ·  Flask REST API
Exposes endpoints to create, inspect, approve, and resume workflow instances.
"""

import logging
import os
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
# CORS middleware
# ---------------------------------------------------------------------------

@app.before_request
def handle_cors():
    """Handle CORS preflight requests and add CORS headers to all responses."""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response, 200


@app.after_request
def apply_cors_headers(response):
    """Ensure CORS headers are present on all responses."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response



# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/stats", methods=["GET"])
@app.route("/api/stats", methods=["GET"])
def get_stats():
    """
    Return lightweight runtime and storage stats for the workflow engine.

    Response JSON:
        totalInstances: int
        total_instances: int
        statusCounts: dict[str, int]
        status_counts: dict[str, int]
        zero_token_waste_skips: int
        zeroTokenWasteSkips: int
    """
    state = storage.read_state()
    total_instances = len(state)

    status_counts = {
        "pending": 0,
        "running": 0,
        "completed": 0,
        "failed": 0,
    }
    for instance in state.values():
        st = instance.get("status", "unknown")
        status_counts[st] = status_counts.get(st, 0) + 1

    skips = getattr(engine, "zero_token_waste_skips", 0)
    if callable(skips):
        skips = skips()

    return jsonify({
        "totalInstances": total_instances,
        "total_instances": total_instances,
        "statusCounts": status_counts,
        "status_counts": status_counts,
        "zero_token_waste_skips": skips,
        "zeroTokenWasteSkips": skips,
    }), 200


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


@app.route("/workflows/<instance_id>/approve/<step_id>", methods=["POST", "OPTIONS"])
def approve_step(instance_id: str, step_id: str):
    """
    Approve or reject a step that is in *waiting_approval* status.
    
    Request body (JSON, optional):
        { "decision": "approve" | "reject" }
    
    Defaults to "approve" if no body or decision is provided.
    Called by the mobile app or dashboard after human review.
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

    # Parse decision from request body; default to "approve".
    decision = "approve"
    if request.is_json:
        decision = request.json.get("decision", "approve")

    if decision not in ("approve", "reject"):
        return jsonify({"error": "Invalid decision; must be 'approve' or 'reject'."}), 400

    # ------------------------------------------------------------------
    # Approve path: reset to pending and resume execution
    # ------------------------------------------------------------------
    if decision == "approve":
        step["status"] = "pending"
        instance["status"] = "running"
        instance["updatedAt"] = _now_iso()
        storage.write_state(state)
        engine.run_instance(instance_id)
        logger.info(
            "Step %s approved; instance %s resumed.", step_id, instance_id
        )
        return jsonify(
            {"instanceId": instance_id, "stepId": step_id, "status": "resumed"}
        ), 200

    # ------------------------------------------------------------------
    # Reject path: mark as failed and halt the workflow
    # ------------------------------------------------------------------
    else:  # decision == "reject"
        step["status"] = "failed"
        step["completedAt"] = _now_iso()
        step["lastError"] = "Rejected by operator"
        instance["status"] = "failed"
        instance["updatedAt"] = _now_iso()
        storage.write_state(state)
        logger.info(
            "Step %s rejected; instance %s marked failed.", step_id, instance_id
        )
        return jsonify(
            {"instanceId": instance_id, "stepId": step_id, "status": "rejected"}
        ), 200


@app.route("/workflows/<instance_id>/retry", methods=["POST", "OPTIONS"])
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


@app.route("/api/instances/<instance_id>/approve", methods=["POST", "OPTIONS"])
def approve_instance(instance_id: str):
    """
    Alternative approval endpoint with flexible targeting.
    
    Request body (JSON, optional):
        {
            "stepId": "step_NNN",      (optional; if omitted, targets the active waiting_approval step)
            "decision": "approve"|"reject"  (optional; defaults to "approve")
        }
    
    Provides a unified approval interface for both web dashboard and mobile app.
    """
    state = storage.read_state()
    instance = state.get(instance_id)
    if not instance:
        return jsonify({"error": "Instance not found."}), 404

    # Parse request body if provided.
    step_id = None
    decision = "approve"
    if request.is_json:
        step_id = request.json.get("stepId")
        decision = request.json.get("decision", "approve")

    if decision not in ("approve", "reject"):
        return jsonify({"error": "Invalid decision; must be 'approve' or 'reject'."}), 400

    # If stepId not provided, find the active waiting_approval step.
    if not step_id:
        waiting_steps = [
            s for s in instance["steps"] if s.get("status") == "waiting_approval"
        ]
        if not waiting_steps:
            return jsonify(
                {"error": "No step awaiting approval; stepId must be provided."}
            ), 409
        if len(waiting_steps) > 1:
            return jsonify(
                {
                    "error": (
                        f"Multiple steps awaiting approval ({len(waiting_steps)}); "
                        "stepId must be provided to disambiguate."
                    )
                }
            ), 409
        step_id = waiting_steps[0]["stepId"]

    # Find the target step.
    step = next((s for s in instance["steps"] if s["stepId"] == step_id), None)
    if not step:
        return jsonify({"error": "Step not found."}), 404

    if step["status"] != "waiting_approval":
        return jsonify(
            {"error": f"Step is not awaiting approval (status: {step['status']})."}
        ), 409

    # ------------------------------------------------------------------
    # Approve path
    # ------------------------------------------------------------------
    if decision == "approve":
        step["status"] = "pending"
        instance["status"] = "running"
        instance["updatedAt"] = _now_iso()
        storage.write_state(state)
        engine.run_instance(instance_id)
        logger.info(
            "Instance %s — step %s approved; execution resumed.", instance_id, step_id
        )
        return jsonify(
            {"instanceId": instance_id, "stepId": step_id, "decision": "approved"}
        ), 200

    # ------------------------------------------------------------------
    # Reject path
    # ------------------------------------------------------------------
    else:  # decision == "reject"
        step["status"] = "failed"
        step["completedAt"] = _now_iso()
        step["lastError"] = "Rejected by operator"
        instance["status"] = "failed"
        instance["updatedAt"] = _now_iso()
        storage.write_state(state)
        logger.info(
            "Instance %s — step %s rejected; workflow marked failed.", instance_id, step_id
        )
        return jsonify(
            {"instanceId": instance_id, "stepId": step_id, "decision": "rejected"}
        ), 200


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Execute boot-time crash recovery before starting the server.
    logger.info("Executing boot-time recovery…")
    engine.recover_interrupted_instances()

    # Allow port override via environment variable for testing.
    port = int(os.environ.get("WF_PORT", "5000"))
    logger.info(f"Starting Flask server on 0.0.0.0:{port}…")
    app.run(debug=True, host="0.0.0.0", port=port)

