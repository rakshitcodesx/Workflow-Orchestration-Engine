# PST_AD_165 — Durable Workflow Orchestration Engine

A fault-tolerant AI workflow orchestration engine and real-time monitoring dashboard built with **Python (Flask)** and **React (Vite)**. It persists workflow and step state using an **atomic Write-Ahead Log (WAL)**, recovers interrupted runs automatically on startup with **Zero-Token-Waste** step skipping, pauses at **Human-in-the-Loop (HITL)** approval gates, and exposes live state and metrics over a REST API.

---

## Core Features

* **Atomic Write-Ahead Log (`storage.py`, `state.json`):** Serializes state to a temporary file, flushes buffers (`flush` + `os.fsync`), and performs an atomic rename (`os.replace`) under a thread lock so crashes or `SIGKILL`s never corrupt persisted state.
* **Boot-Time Crash Recovery & Zero-Token-Waste (`engine.py`, `app.py`):** Scans `state.json` on startup (`recover_interrupted_instances()`) for workflows interrupted mid-run, resumes execution in background worker threads, and skips already-`succeeded` steps while tracking skip counts thread-safely.
* **Human-in-the-Loop (HITL) Approval Gates:** Pauses execution cleanly at approval checkpoints (`waiting_approval`) until an operator approves or rejects the step via API or dashboard.
* **Retry & Error Handling:** Tracks per-step attempts, transient error messages, and retries without losing progress on earlier completed steps.
* **Chaos Testing (`test_crash.py`):** Automates hard process kills (`SIGKILL` / `kill -9`) across 20 iterations and verifies clean recovery and state integrity.
* **Real-Time Dashboard (`frontend/`):** Live polling UI with instance status filtering, UUID lookup, step execution timeline, raw JSON inspector, approval/rejection/retry controls, and Demo Mode fallback.

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
        ├── components/ # Header, command bar, instance table, step graph, aqua wave backdrop
        ├── services/   # REST API client and mock data adapters
        └── styles/     # Design tokens, glass surfaces, and dashboard layout styles
```

---

## Getting Started

### Prerequisites
* Python 3.10+ (with virtual environment)
* Node.js 18+ & npm

### 1. Backend Setup

```bash
# Navigate to project root
cd workflow-engine

# Activate virtual environment
source venv/bin/activate

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Start the Flask API server (runs on port 5000)
python3 app.py
```

### 2. Frontend Setup

```bash
# In a separate terminal, navigate to frontend directory
cd workflow-engine/frontend

# Install dependencies
npm install

# Start Vite dev server (runs on port 3000 with proxy to :5000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access the dashboard.

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

### Zero-Token-Waste
When an interrupted workflow is resumed after a crash or process restart, the state machine reads the latest persisted step list from `state.json`. Any step already marked `succeeded` is immediately skipped without re-invoking simulated LLM or agent work, completely eliminating redundant token consumption.

### Atomic WAL Durability
State mutations follow a strict write-ahead log protocol:
1. Serialize updated state dictionary to JSON.
2. Write to a temporary file (`state.json.tmp.<uuid>`) in the same filesystem.
3. Flush application buffers with `fh.flush()` followed by OS filesystem cache sync with `os.fsync(fh.fileno())`.
4. Perform an atomic filesystem rename with `os.replace()`.
5. All operations are synchronized via a mutual exclusion lock (`threading.Lock`).
