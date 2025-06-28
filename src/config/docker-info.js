import { Docker } from "https://deno.land/x/dockerapi@v0.1.1/mod.ts";
import { logger } from "../lib/logger.js";

const log = logger.child("docker-info");

// Create a new Docker client
const docker = new Docker("/var/run/docker.sock");
const HOSTNAME = Deno.env.get("HOSTNAME") || "localhost";

export async function getRunningContainerName() {
  try {
    log.debug("Attempting to fetch container name", { hostname: HOSTNAME });

    // Fetch the list of currently running containers
    const containers = await docker.containers.list();

    // Iterate through the containers and find matching hostname
    for (const container of containers) {
      const info = await container.inspect();
      if (info.Config.Hostname === HOSTNAME) {
        log.info("Container name resolved", {
          containerName: info.Name,
          hostname: HOSTNAME,
        });
        return info.Name;
      }
    }

    log.warn("No container found matching hostname", { hostname: HOSTNAME });
    return null;
  } catch (error) {
    log.warn("Failed to fetch container name", {
      error: error.message,
      hostname: HOSTNAME,
    });
    return null;
  }
}
