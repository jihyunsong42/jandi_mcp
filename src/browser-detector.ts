import { existsSync } from "fs";
import { execSync } from "child_process";

/**
 * Browser paths for different platforms
 */
const BROWSER_PATHS: Record<string, string[]> = {
  darwin: [
    // Google Chrome
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    `${process.env.HOME}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
    // Chromium
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    `${process.env.HOME}/Applications/Chromium.app/Contents/MacOS/Chromium`,
    // Microsoft Edge
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    `${process.env.HOME}/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`,
    // Brave
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    `${process.env.HOME}/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`,
  ],
  linux: [
    // Google Chrome
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/local/bin/google-chrome",
    // Chromium
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/local/bin/chromium",
    "/snap/bin/chromium",
    // Microsoft Edge
    "/usr/bin/microsoft-edge",
    "/usr/bin/microsoft-edge-stable",
    // Brave
    "/usr/bin/brave-browser",
    "/usr/bin/brave",
    "/snap/bin/brave",
  ],
  win32: [
    // Google Chrome
    `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    // Chromium
    `${process.env.PROGRAMFILES}\\Chromium\\Application\\chrome.exe`,
    `${process.env["PROGRAMFILES(X86)"]}\\Chromium\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA}\\Chromium\\Application\\chrome.exe`,
    // Microsoft Edge
    `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env["PROGRAMFILES(X86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
    // Brave
    `${process.env.PROGRAMFILES}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    `${process.env["PROGRAMFILES(X86)"]}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    `${process.env.LOCALAPPDATA}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
  ],
};

/**
 * Browser executable names to search in PATH
 */
const BROWSER_EXECUTABLES = [
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
  "microsoft-edge",
  "microsoft-edge-stable",
  "brave-browser",
  "brave",
];

/**
 * Find browser executable in PATH
 */
function findBrowserInPath(): string | null {
  const command = process.platform === "win32" ? "where" : "which";

  for (const executable of BROWSER_EXECUTABLES) {
    try {
      const result = execSync(`${command} ${executable}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();

      if (result) {
        // 'which' or 'where' can return multiple lines, take the first one
        const firstPath = result.split("\n")[0].trim();
        if (existsSync(firstPath)) {
          return firstPath;
        }
      }
    } catch {
      // Command failed, browser not found in PATH
      continue;
    }
  }

  return null;
}

/**
 * Get browser executable path with the following priority:
 * 1. Environment variables (PUPPETEER_EXECUTABLE_PATH or CHROME_PATH)
 * 2. Platform-specific common installation paths
 * 3. Search in PATH
 *
 * @throws Error if no browser is found
 */
export function getBrowserExecutablePath(): string {
  // Priority 1: Check environment variables
  const envPath =
    process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (envPath) {
    if (existsSync(envPath)) {
      return envPath;
    }
    console.error(
      `Warning: Browser path from environment variable not found: ${envPath}`,
    );
  }

  // Priority 2: Check platform-specific paths
  const platform = process.platform;
  const paths = BROWSER_PATHS[platform] || [];

  for (const browserPath of paths) {
    if (browserPath && existsSync(browserPath)) {
      return browserPath;
    }
  }

  // Priority 3: Search in PATH
  const pathBrowser = findBrowserInPath();
  if (pathBrowser) {
    return pathBrowser;
  }

  // No browser found
  throw new Error(
    `No compatible browser found. Please install one of the following browsers:
- Google Chrome
- Chromium
- Microsoft Edge
- Brave Browser

Or set the PUPPETEER_EXECUTABLE_PATH environment variable to point to your browser executable.

Platform: ${platform}
Searched paths:
${paths.filter(Boolean).map((p) => `  - ${p}`).join("\n")}`,
  );
}
