import { readFileSync } from "node:fs";

let wslCached: boolean | null = null;

/**
 * Detect whether the current environment is running inside WSL.
 * Checks /proc/version for Microsoft or WSL strings.
 */
export function isWSL(): boolean {
  if (wslCached !== null) return wslCached;

  try {
    const procVersion = readFileSync("/proc/version", "utf-8");
    wslCached =
      /microsoft/i.test(procVersion) || /wsl/i.test(procVersion);
  } catch {
    wslCached = false;
  }

  return wslCached;
}

/**
 * Returns the appropriate VS Code CLI command for the current environment.
 * On WSL, VS Code must be launched via `code.exe` (the Windows binary).
 */
export function getVSCodeCommand(): string {
  return isWSL() ? "code.exe" : "code";
}

/**
 * Converts a Windows-style path to a WSL-compatible path.
 * e.g. "C:\Users\foo\project" -> "/mnt/c/Users/foo/project"
 */
export function resolveWSLPath(windowsPath: string): string {
  // Match drive letter pattern: C:\ or C:/
  const match = windowsPath.match(/^([A-Za-z]):[/\\](.*)/);
  if (!match) return windowsPath;

  const driveLetter = match[1].toLowerCase();
  const rest = match[2].replace(/\\/g, "/");
  return `/mnt/${driveLetter}/${rest}`;
}
