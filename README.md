# Workflow Orchestration Engine (PST_AD_165)

## Overview

Workflow Orchestration Engine (PST_AD_165) is a fault-tolerant, durable execution engine built with Python/Flask and React + Vite. Designed for multi-step AI and data pipelines, it ensures workflows survive network drops, API rate limits, and server crashes without re-running completed steps or wasting duplicate LLM inference tokens.

---

## Key Capabilities

* **Atomic Write-Ahead Log (WAL) Checkpointing:** Commits durable state snapshots (`WAL_CHECKPOINT_OK`) after every step execution so runs can deterministically resume from the exact point of failure.
* **Zero-Token-Waste Crash Recovery:** Skips already-succeeded upstream steps (Data Ingestion, AI Analysis, etc.) during retries or post-crash recovery, preventing redundant LLM calls.
* **Bounded Retry Policies:** Automatically handles transient step failures with configurable retry attempts (1/3, 2/3) and clear error surfacing.
* **Human-in-the-Loop (HITL) Approval Gates:** Pauses execution cleanly (`WAITING APPROVAL`) at critical checkpoints so operators can inspect intermediate outputs and Approve & Continue or Reject before persisting results.
* **Real-Time Blueprint Observability Dashboard:**
  * **Live Mode & Demo Mode:** Connects to the Flask backend (port 5001) with configurable polling or simulates full workflow lifecycles in-browser.
  * **Instance & Step Inspection:** Filter runs by status (All, Running, Completed, Failed), look up instances by UUID, inspect raw JSON payloads, and monitor step-level execution metrics.

---

## Quick Start

### 1. Start the Flask Backend

```bash
WF_PORT=5001 python3 app.py
```

### 2. Start the React + Vite Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and toggle between **Live** (connected to Flask on port 5001) and **Demo** mode in the top-right header.

---

## Project Structure

```text
workflow-engine/
├── app.py              # Flask REST API, CORS setup, boot recovery hook, /stats endpoint
├── engine.py           # Workflow state machine, worker threads, retries, recovery, skip counter
├── storage.py          # Thread-safe atomic WAL persistence (temp write -> fsync -> os.replace)
├── state.json          # Persisted workflow & step state store
├── test_crash.py       # Automated 20-run SIGKILL chaos recovery test harness
├── workflows/
│   └── agent_flow.json # Workflow template definition and step specifications
└── frontend/           # React + Vite monitoring dashboard
    └── src/
        ├── components/ # Header, command bar, instance table, step graph, confirm dialogs
        ├── services/   # REST API client and mock data adapters
        └── styles/     # Design tokens, blueprint grid canvas, and dashboard layout styles
```

---

## REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/workflows/start` | Creates and starts a new workflow instance in a background thread |
| `GET` | `/workflows/<instance_id>` | Returns the current state of a workflow instance |
| `POST` | `/workflows/<instance_id>/approve/<step_id>` | Approves or rejects a human-in-the-loop step awaiting approval |
| `POST` | `/api/instances/<instance_id>/approve` | Unified approval endpoint with flexible step targeting |
| `POST` | `/workflows/<instance_id>/retry` | Force-retries a failed workflow from its last failed step |
| `GET` | `/stats` (or `/api/stats`) | Returns runtime metrics: total instances, status counts, and Zero-Token-Waste skips |

---

## Architecture & Guarantees

### Zero-Token-Waste Crash Recovery
When an interrupted workflow is resumed after a crash or process restart, the state machine reads the latest persisted step list from `state.json`. Any step already marked `succeeded` is immediately skipped without re-invoking simulated LLM or agent work, completely eliminating redundant token consumption.

### Atomic WAL Durability
State mutations follow a strict write-ahead log protocol:
1. Serialize updated state dictionary to JSON.
2. Write to a temporary file (`state.json.tmp.<uuid>`) on the same filesystem.
3. Flush application buffers with `fh.flush()` followed by OS filesystem cache sync with `os.fsync(fh.fileno())`.
4. Perform an atomic filesystem rename with `os.replace()`.
5. All operations are synchronized via a mutual exclusion lock (`threading.Lock`).
