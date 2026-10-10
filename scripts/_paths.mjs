// Resolve current and legacy PID files for running browsers.
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// --- PID files ---

const runtimeDir = process.env.BROWSER_RUNTIME_DIR || '/tmp';

export function pidFileForId(id) {
  return join(runtimeDir, `browser-id-${id}.json`);
}

export function pidFileForAgent(agentName) {
  return join(runtimeDir, `browser-${agentName}.json`);
}

function legacyPidFileForId(id) {
  return join(runtimeDir, `shimmer-browser-id-${id}.json`);
}

function legacyPidFileForAgent(agentName) {
  return join(runtimeDir, `shimmer-browser-${agentName}.json`);
}

// Resolve PID file — check new path first, fall back to legacy
export function resolvePidFileById(id) {
  const newPath = pidFileForId(id);
  if (existsSync(newPath)) return newPath;
  const legacyPath = legacyPidFileForId(id);
  if (existsSync(legacyPath)) return legacyPath;
  return null;
}

export function resolvePidFileByAgent(agentName) {
  const newPath = pidFileForAgent(agentName);
  if (existsSync(newPath)) return newPath;
  const legacyPath = legacyPidFileForAgent(agentName);
  if (existsSync(legacyPath)) return legacyPath;
  return null;
}
