/**
 * Utilities for formatting timestamps, durations, and identifiers.
 */

export function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

export function formatTimeExact(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toISOString().replace('T', ' ').replace('Z', ' UTC');
  } catch {
    return isoString;
  }
}

export function formatRelativeTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffSec = Math.round((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatDate(isoString);
  } catch {
    return isoString;
  }
}

export function formatDuration(startedAt, completedAt) {
  if (!startedAt) return '—';
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  if (isNaN(start) || isNaN(end) || end < start) return '—';

  const durationMs = end - start;
  if (durationMs < 1000) return `${durationMs}ms`;
  const sec = (durationMs / 1000).toFixed(1);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remainingSec = (sec % 60).toFixed(0);
  return `${min}m ${remainingSec}s`;
}

export function abbreviateId(id, prefixLen = 8, suffixLen = 4) {
  if (!id) return '';
  if (id.length <= prefixLen + suffixLen + 2) return id;
  return `${id.slice(0, prefixLen)}...${id.slice(-suffixLen)}`;
}

