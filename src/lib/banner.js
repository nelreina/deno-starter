import { logger } from "./logger.js";

const log = logger.child("banner");

/**
 * Creates and displays a banner in the console with the service name
 * @param {string} serviceName - The name of the service to display
 * @param {string} version - The service version
 * @param {string} environment - The environment (dev, staging, prod, etc.)
 */
export function displayBanner(serviceName, version = "1.0.0", environment = "development") {
  const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m"
  };

  // ASCII art banner
  const padlength = 51;
//   calculate the padlength based on the length of the service name, version, environment, and timestamp the pad end must be 51



  const banner = `
${colors.cyan}╔══════════════════════════════════════════════════════════════╗
║${colors.bright}${colors.white}                    🚀 SERVICE STARTUP 🚀                     ${colors.cyan}║
╠══════════════════════════════════════════════════════════════╣
║${colors.yellow}  Service: ${colors.white}${serviceName.padEnd(padlength)}${colors.cyan}║
║${colors.yellow}  Version: ${colors.white}${version.padEnd(padlength)}${colors.cyan}║
║${colors.yellow}  Started: ${colors.white}${new Date().toISOString().padEnd(padlength)}${colors.cyan}║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
`;

  // Display the banner
  console.log(banner);
  
  log.info("Service banner displayed", {
    serviceName,
    version,
    environment,
    timestamp: new Date().toISOString()
  });
}

/**
 * Creates a simple text banner without ASCII art (for environments that don't support it)
 * @param {string} serviceName - The name of the service to display
 * @param {string} version - The service version
 * @param {string} environment - The environment
 */
export function displaySimpleBanner(serviceName, version = "1.0.0", environment = "development") {
  const banner = `
==========================================
🚀 SERVICE STARTUP 🚀
==========================================
Service: ${serviceName}
Version: ${version}
Environment: ${environment}
Started: ${new Date().toISOString()}
==========================================
`;

  console.log(banner);
  
  log.info("Simple service banner displayed", {
    serviceName,
    version,
    environment,
    timestamp: new Date().toISOString()
  });
}

/**
 * Detects if the current environment supports ANSI color codes
 * @returns {boolean} True if colors are supported
 */
function supportsColors() {
  // Check if we're in a TTY environment
  if (typeof Deno !== 'undefined' && Deno.isatty && Deno.isatty(Deno.stdout.rid)) {
    return true;
  }
  
  // Check environment variables
  const noColor = Deno.env.get("NO_COLOR");
  const forceColor = Deno.env.get("FORCE_COLOR");
  
  if (noColor) return false;
  if (forceColor) return true;
  
  // Default to true for most modern terminals
  return true;
}

/**
 * Main banner function that automatically chooses the appropriate display method
 * @param {string} serviceName - The name of the service to display
 * @param {string} version - The service version
 * @param {string} environment - The environment
 */
export function showBanner(serviceName, version = "1.0.0", environment = "development") {
  if (!serviceName) {
    log.warn("No service name provided for banner");
    return;
  }

  try {
    if (supportsColors()) {
      displayBanner(serviceName, version, environment);
    } else {
      displaySimpleBanner(serviceName, version, environment);
    }
  } catch (error) {
    log.error("Failed to display banner", error);
    // Fallback to simple console log
    console.log(`🚀 ${serviceName} v${version} (${environment}) started at ${new Date().toISOString()}`);
  }
} 