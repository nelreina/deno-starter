import { Docker } from "https://deno.land/x/dockerapi@v0.1.1/mod.ts";
import { logger } from "../lib/logger.js";

const log = logger.child("docker-info");

// Create a new Docker client with timeout
const docker = new Docker("/var/run/docker.sock");
const HOSTNAME = Deno.env.get("HOSTNAME") || "localhost";

// Timeout for Docker operations (5 seconds)
const DOCKER_TIMEOUT_MS = 5000;

export async function getRunningContainerName() {
  try {
    log.debug("Attempting to fetch container name", { hostname: HOSTNAME });

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Docker operation timeout")),
        DOCKER_TIMEOUT_MS,
      );
    });

    // Create the Docker operation promise
    const dockerOperation = async () => {
      // Fetch the list of currently running containers
      const containers = await docker.containers.list();

      // Iterate through the containers and find matching hostname
      for (const container of containers) {
        try {
          const info = await container.inspect();
          if (info.Config.Hostname === HOSTNAME) {
            log.info("Container name resolved", {
              containerName: info.Name,
              hostname: HOSTNAME,
            });
            return info.Name;
          }
        } catch (containerError) {
          log.warn("Failed to inspect container", {
            error: containerError.message,
            containerId: container.Id,
          });
          // Continue to next container
        }
      }

      log.warn("No container found matching hostname", { hostname: HOSTNAME });
      return null;
    };

    // Race between timeout and Docker operation
    const result = await Promise.race([dockerOperation(), timeoutPromise]);
    return result;
  } catch (error) {
    // Log the error but don't expose sensitive information
    const errorMessage = error.message || "Unknown error";
    const isTimeout = errorMessage.includes("timeout");
    const isPermission = errorMessage.includes("permission") ||
      errorMessage.includes("access");

    if (isTimeout) {
      log.warn("Docker operation timed out, using fallback", {
        hostname: HOSTNAME,
        timeout: DOCKER_TIMEOUT_MS,
      });
    } else if (isPermission) {
      log.warn("Docker access denied, using fallback", {
        hostname: HOSTNAME,
        error: "Permission denied",
      });
    } else {
      log.warn("Failed to fetch container name, using fallback", {
        hostname: HOSTNAME,
        error: errorMessage,
      });
    }

    return null;
  }
}
