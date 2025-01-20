import { Docker } from "https://deno.land/x/dockerapi@v0.1.1/mod.ts";

// Create a new Docker client
const docker = new Docker("/var/run/docker.sock");
const HOSTNAME = Deno.env.get("HOSTNAME") || "localhost";
export async function getRunningContainerName() {
  try {
    // Fetch the list of currently running containers
    const containers = await docker.containers.list();

    // Iterate through the containers and print their details
    for (const container of containers) {
      const info = await container.inspect();
      if (info.Config.Hostname === HOSTNAME) {
        return info.Name;
      }
    }
    return null;
  } catch (error) {
        console.warn("WARNING: Fetching containers:", error.message);
    return null;
  }
}
