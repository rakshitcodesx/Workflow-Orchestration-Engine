"""
storage.py — PST_AD_165 Workflow Orchestration Engine
Atomic write-ahead log backed by a single JSON file.
Uses os.fsync to guarantee durability before returning to the caller.
"""

import json
import logging
import os
import tempfile

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# File location
# ---------------------------------------------------------------------------
_STATE_FILE = os.path.join(os.path.dirname(__file__), "state.json")


def _ensure_state_file() -> None:
    """Create the state file with an empty registry if it does not exist."""
    if not os.path.exists(_STATE_FILE):
        _atomic_write({})


def _atomic_write(data: dict) -> None:
    """
    Write *data* to the state file atomically.

    Strategy:
      1. Serialise to a sibling temp file in the same directory.
      2. fsync the temp file's data to storage.
      3. os.replace() (atomic rename on POSIX / Win32) over the target path.
      4. fsync the parent directory so the directory entry is durable too.
    """
    dir_path = os.path.dirname(os.path.abspath(_STATE_FILE))
    fd, tmp_path = tempfile.mkstemp(dir=dir_path, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_path, _STATE_FILE)
        # Flush the directory entry on POSIX systems.
        dir_fd = os.open(dir_path, os.O_RDONLY)
        try:
            os.fsync(dir_fd)
        finally:
            os.close(dir_fd)
    except Exception:
        # Clean up the temp file if anything goes wrong.
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def read_state() -> dict:
    """Return the full state registry (instance_id → instance dict)."""
    _ensure_state_file()
    with open(_STATE_FILE, "r", encoding="utf-8") as fh:
        return json.load(fh)


def write_state(state: dict) -> None:
    """
    Atomically persist *state* to disk.

    Parameters
    ----------
    state:
        The complete state registry to write.  The caller is responsible for
        merging updates into the existing state before calling this function.
    """
    _atomic_write(state)
    logger.debug("State written — %d instance(s) persisted.", len(state))

