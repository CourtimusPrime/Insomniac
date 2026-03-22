import { readFile, writeFile, readdir, unlink, mkdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { getDeploymentConfig } from "../config/deployment.js";
import { GitHubFileAdapter } from "./github-file-adapter.js";

export type FileEntry = {
  name: string;
  path: string;
  type: "file" | "dir";
};

/**
 * Common interface for file access operations.
 * In local mode, uses the filesystem. In hosted mode, commits to GitHub.
 */
export type FileAccessAdapter = {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string, commitMessage?: string): Promise<void>;
  listFiles(path: string): Promise<FileEntry[]>;
  deleteFile(path: string, commitMessage?: string): Promise<void>;
  readonly mode: "filesystem" | "github";
};

/**
 * Local filesystem adapter — reads and writes files directly.
 */
function createLocalAdapter(basePath: string): FileAccessAdapter {
  function resolve(path: string): string {
    return join(basePath, path);
  }

  return {
    mode: "filesystem",

    async readFile(path: string): Promise<string> {
      return readFile(resolve(path), "utf-8");
    },

    async writeFile(path: string, content: string): Promise<void> {
      const fullPath = resolve(path);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content, "utf-8");
    },

    async listFiles(path: string): Promise<FileEntry[]> {
      const fullPath = resolve(path);
      const entries = await readdir(fullPath, { withFileTypes: true });
      return entries.map((entry) => ({
        name: entry.name,
        path: join(path, entry.name),
        type: entry.isDirectory() ? "dir" as const : "file" as const,
      }));
    },

    async deleteFile(path: string): Promise<void> {
      await unlink(resolve(path));
    },
  };
}

/**
 * GitHub adapter — wraps GitHubFileAdapter with the common interface,
 * binding the repo so callers only pass relative paths.
 */
function createGitHubAdapter(token: string, repo: string): FileAccessAdapter {
  const github = new GitHubFileAdapter(token);

  return {
    mode: "github",

    async readFile(path: string): Promise<string> {
      return github.readFile(repo, path);
    },

    async writeFile(path: string, content: string, commitMessage?: string): Promise<void> {
      await github.writeFile(repo, path, content, commitMessage ?? `Update ${path}`);
    },

    async listFiles(path: string): Promise<FileEntry[]> {
      const entries = await github.listFiles(repo, path);
      return entries.map((entry) => ({
        name: entry.name,
        path: entry.path,
        type: entry.type,
      }));
    },

    async deleteFile(path: string, commitMessage?: string): Promise<void> {
      await github.deleteFile(repo, path, commitMessage ?? `Delete ${path}`);
    },
  };
}

/**
 * Returns the correct file access adapter based on deployment mode.
 *
 * - local/remote: returns a filesystem adapter rooted at `basePath`
 * - hosted: returns a GitHub adapter using the provided token and repo
 */
export function createFileAccessAdapter(options: {
  basePath?: string;
  githubToken?: string;
  githubRepo?: string;
}): FileAccessAdapter {
  const config = getDeploymentConfig();

  if (config.fileAccess === "github") {
    const token = options.githubToken ?? process.env.GITHUB_TOKEN;
    const repo = options.githubRepo ?? process.env.GITHUB_REPO;

    if (!token || !repo) {
      throw new Error(
        "GitHub file access requires GITHUB_TOKEN and GITHUB_REPO env vars (or explicit options)",
      );
    }

    return createGitHubAdapter(token, repo);
  }

  return createLocalAdapter(options.basePath ?? process.cwd());
}
