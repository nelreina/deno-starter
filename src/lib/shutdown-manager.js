/**
 * Graceful shutdown management
 * Handles SIGINT/SIGTERM signals and cleanup logic
 */

import {
  getIsShuttingDown,
  setShuttingDown,
  getShutdownTimer,
  setShutdownTimer,
  getSignalListeners,
  setSignalListeners,
} from "./app-state.js";

export function createShutdown(log, redisConnectionManager) {
  return async function shutdown(signal) {
    if (getIsShuttingDown()) {
      log.warn("Shutdown already in progress");
      return;
    }

    setShuttingDown(true);
    const shutdownStart = Date.now();

    log.info(`Shutdown initiated by ${signal}`, { signal });

    // Remove signal listeners to prevent memory leaks
    getSignalListeners().forEach(({ signal: sig, listener }) => {
      try {
        Deno.removeSignalListener(sig, listener);
        log.debug(`Removed signal listener for ${sig}`);
      } catch (error) {
        log.warn(`Failed to remove signal listener for ${sig}`, error);
      }
    });

    // Set a maximum shutdown time of 30 seconds
    const timer = setTimeout(() => {
      log.error("Graceful shutdown timeout exceeded, forcing exit");
      Deno.exit(1);
    }, 30000);
    setShutdownTimer(timer);

    try {
      // Stop accepting new requests
      log.info("Stopping HTTP server");

      // Cancel scheduled jobs
      if (globalThis.scheduledJob) {
        globalThis.scheduledJob.cancel();
        log.info("Scheduled jobs cancelled");
      }

      // Close Redis connections
      log.info("Closing Redis connections");
      await redisConnectionManager.disconnect();

      const shutdownDuration = Date.now() - shutdownStart;
      log.info("Graceful shutdown completed", {
        duration: `${shutdownDuration}ms`,
        signal,
      });

      clearTimeout(getShutdownTimer());
      Deno.exit(0);
    } catch (error) {
      log.error("Error during shutdown", error);
      clearTimeout(getShutdownTimer());
      Deno.exit(1);
    }
  };
}

export function setupSignalHandlers(shutdown) {
  // Create signal listener functions and store references
  const sigintListener = () => shutdown("SIGINT");
  const sigtermListener = () => shutdown("SIGTERM");

  // Store signal listeners for cleanup
  setSignalListeners([
    { signal: "SIGINT", listener: sigintListener },
    { signal: "SIGTERM", listener: sigtermListener },
  ]);

  // Register signal handlers
  Deno.addSignalListener("SIGINT", sigintListener);
  Deno.addSignalListener("SIGTERM", sigtermListener);
}