/**
 * Centralized application state management
 * Contains all shared state variables used across the application
 */

// Track event stream status
export const eventStreamStatus = {
  active: false,
  lastMessage: null,
};

// Graceful shutdown state
export let isShuttingDown = false;
export let shutdownTimer = null;
export let signalListeners = [];

// Rate limiting state
export let lastTestEventTime = 0;
export const RATE_LIMIT_MS = 1000; // 1 second between requests

// State update functions
export function setShuttingDown(value) {
  isShuttingDown = value;
}

export function setShutdownTimer(timer) {
  shutdownTimer = timer;
}

export function setSignalListeners(listeners) {
  signalListeners = listeners;
}

export function setLastTestEventTime(time) {
  lastTestEventTime = time;
}

export function getIsShuttingDown() {
  return isShuttingDown;
}

export function getShutdownTimer() {
  return shutdownTimer;
}

export function getSignalListeners() {
  return signalListeners;
}

export function getLastTestEventTime() {
  return lastTestEventTime;
}