// _paths.mjs — Shared path resolution for PID files and auth state
//
// Handles migration from shimmer paths to browser paths:
//   PID files:  /tmp/shimmer-browser-* → /tmp/browser-*
//   Auth state: ~/.config/shimmer/browser/ → ~/.config/browser/

import { existsSync, mkdirSync } from 'node:fs';
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

// --- Auth state ---

export function authDir(agentName) {
  return join(process.env.HOME, '.config', 'browser', agentName);
}

export function ensureAuthDir(agentName) {
  const dir = authDir(agentName);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// Resolve auth file — check new path first, fall back to legacy
export function resolveAuthFile(agentName, site) {
  const newFile = join(authDir(agentName), `${site}.json`);
  if (existsSync(newFile)) return newFile;
  const oldFile = join(process.env.HOME, '.config', 'shimmer', 'browser', agentName, `${site}.json`);
  if (existsSync(oldFile)) return oldFile;
  return newFile; // default to new location for writes
}

// Auth file at new location (for writing)
export function newAuthFile(agentName, site) {
  return join(ensureAuthDir(agentName), `${site}.json`);
}
