# API Contract & Integration Specifications: PST_AD_165

**Target Backend:** Flask REST API (`app.py`, `engine.py`, `storage.py`)  
**Frontend Client:** React 18 + Vite (`frontend/`)  
**Date:** November 22, 2026  
**Status:** Verified against actual backend source code.

---

## 1. Verified Backend Endpoints

The Flask backend implementation in `app.py` exposes the following 5 HTTP routes:

### 1.1 `POST /workflows/start`
Creates and asynchronously initiates a new workflow instance in a daemon thread.

* **Method:** `POST`
* **URL:** `/workflows/start`
* **Request Body (JSON, Optional):**
  ```json
  {
    "workflowId": "PST_AD_165"
  }
  ```
* **Response Status:** `202 Accepted`
* **Response Body (JSON):**
  ```json
  {
    "instanceId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending"
  }
  ```

---

### 1.2 `GET /workflows/<instance_id>`
Fetches the current durable state of a workflow instance from `state.json`.

* **Method:** `GET`
* **URL:** `/workflows/:instance_id`
* **Path Parameters:**
  * `instance_id` (UUID string, required)
* **Response Status:**
  * `200 OK` (when instance exists)
  * `404 Not Found` (when instance does not exist)
* **Response Body (JSON):**
  ```json
  {
    "instanceId": "550e8400-e29b-41d4-a716-446655440000",
    "workflowId": "PST_AD_165",
    "status": "running",
    "createdAt": "2026-11-22T00:04:00.000Z",
    "updatedAt": "2026-11-22T00:04:05.000Z",
    "steps": [
      {
        "stepId": "step_001",
        "name": "Data Ingestion",
        "status": "succeeded",
        "attempts": 1,
        "maxAttempts": 3,
        "requiresApproval": false,
        "lastError": null,
        "startedAt": "2026-11-22T00:04:01.000Z",
        "completedAt": "2026-11-22T00:04:03.000Z"
      },
      {
        "stepId": "step_002",
        "name": "AI Analysis",
        "status": "running",
        "attempts": 1,
        "maxAttempts": 3,
        "requiresApproval": false,
        "lastError": null,
        "startedAt": "2026-11-22T00:04:03.000Z",
        "completedAt": null
      },
      {
        "stepId": "step_003",
        "name": "Human Approval Gate",
        "status": "pending",
        "attempts": 0,
        "maxAttempts": 1,
        "requiresApproval": true,
        "lastError": null,
        "startedAt": null,
        "completedAt": null
      },
      {
        "stepId": "step_004",
        "name": "Result Persistence",
        "status": "pending",
        "attempts": 0,
        "maxAttempts": 3,
        "requiresApproval": false,
        "lastError": null,
        "startedAt": null,
        "completedAt": null
      }
    ]
  }
  ```

---

### 1.3 `POST /workflows/<instance_id>/approve/<step_id>`
Authorizes or rejects an execution step currently paused in `waiting_approval` status.

* **Method:** `POST`
* **URL:** `/workflows/:instance_id/approve/:step_id`
* **Request Body (JSON, Optional):**
  ```json
  {
    "decision": "approve" 
  }
  ```
  *(Supported values: `"approve"` | `"reject"`. Defaults to `"approve"` if body is omitted).*
* **Behavior:**
  * **Approve:** Resets step status to `"pending"`, instance status to `"running"`, and respawns the worker thread.
  * **Reject:** Marks step status as `"failed"`, instance status as `"failed"`, sets `lastError` to `"Rejected by operator"`.
* **Response Status:**
  * `200 OK`
  * `400 Bad Request` (invalid decision)
  * `404 Not Found` (instance or step not found)
  * `409 Conflict` (step is not in `waiting_approval` status)
* **Response Body (JSON):**
  ```json
  {
    "instanceId": "550e8400-e29b-41d4-a716-446655440000",
    "stepId": "step_003",
    "status": "resumed" 
  }
  ```

---

### 1.4 `POST /api/instances/<instance_id>/approve`
Alternative unified approval endpoint with flexible step targeting.

* **Method:** `POST`
* **URL:** `/api/instances/:instance_id/approve`
* **Request Body (JSON, Optional):**
  ```json
  {
    "stepId": "step_003",
    "decision": "approve"
  }
  ```
  *(If `stepId` is omitted, the backend auto-detects the single step currently in `waiting_approval`).*
* **Response Status:** `200 OK` (or `409 Conflict` if multiple or zero steps are awaiting approval).
* **Response Body (JSON):**
  ```json
  {
    "instanceId": "550e8400-e29b-41d4-a716-446655440000",
    "stepId": "step_003",
    "decision": "approved"
  }
  ```

---

### 1.5 `POST /workflows/<instance_id>/retry`
Forces a failed workflow instance to re-attempt from its first failed step.

* **Method:** `POST`
* **URL:** `/workflows/:instance_id/retry`
* **Response Status:**
  * `200 OK`: `{"instanceId": "...", "status": "retrying"}`
  * `409 Conflict`: `{"error": "Only failed instances can be retried."}`

---

## 2. Status Enums & State Invariants

### Workflow Instance Statuses
* `pending`: Instance created and queued for execution.
* `running`: Actively executing steps in a background thread.
* `completed`: All steps succeeded (terminal state).
* `failed`: Maximum attempts exhausted on a step or rejected by operator (terminal state).

### Step Statuses
* `pending`: Ready to execute or queued for retry.
* `running`: Currently simulating agent work (`time.sleep`).
* `waiting_approval`: Paused before step execution until human operator issues approval.
* `succeeded`: Execution finished. Marked for **Zero-Token-Waste guarantee** (never re-executed across crashes or retries).
* `failed`: Step failed and exceeded `maxAttempts`.

---

## 3. Discovered Gaps & Unresolved Architectural Questions

During frontend integration and verification against `app.py`, the following discrepancies were identified for the backend team:

### 1. Missing `GET /workflows` (List Instances)
* **Gap:** The backend does **not** provide an endpoint to list workflow instances. The client cannot discover previously run workflows without tracking instance IDs.
* **Frontend Resolution:** The frontend maintains a local tracking registry in `localStorage` for newly launched or manually searched UUIDs, and provides an explicit lookup search bar.
* **Backend Recommendation:** Implement `GET /workflows` in `app.py`:
  ```python
  @app.route("/workflows", methods=["GET"])
  def list_workflows():
      state = storage.read_state()
      return jsonify(list(state.values())), 200
  ```

### 2. Missing Dedicated Health Check Route
* **Gap:** `test_crash.py` probes `/workflows/test-health`, but `app.py` has no matching route and relies on Flask's 404 response to confirm the server is running.
* **Backend Recommendation:** Add `GET /health` or `GET /workflows/health` returning `{"status": "ok"}`.

### 3. Step Payload & Context Passing
* **Gap:** The workflow definition and state model currently track execution status and attempt counts, but do not support data inputs or outputs passing between steps (e.g. data ingested in `step_001` passed as context to `step_002`).

### 4. No Runtime Crash Injection Endpoint
* **Gap:** `test_crash.py` simulates crashes via OS `SIGKILL`. There is no HTTP endpoint (e.g., `POST /debug/crash`) to simulate server crashes directly from the dashboard.

