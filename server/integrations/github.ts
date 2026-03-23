import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

interface CloneResult {
  success: boolean;
  path: string;
  error?: string;
}

const GITHUB_HTTPS_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/;
const GITHUB_SSH_RE = /^git@github\.com:[\w.-]+\/[\w.-]+(\.git)?$/;

function isValidGitHubUrl(url: string): boolean {
  return GITHUB_HTTPS_RE.test(url) || GITHUB_SSH_RE.test(url);
}

export class GitHubService {
  /**
   * Clone a GitHub repository to the specified target path.
   */
  async cloneRepo(repoUrl: string, targetPath: string): Promise<CloneResult> {
    if (!isValidGitHubUrl(repoUrl)) {
      return {
        success: false,
        path: targetPath,
        error: `Invalid GitHub URL: ${repoUrl}. Must be an HTTPS or SSH GitHub URL.`,
      };
    }

    // Check if target already exists
    try {
      await access(targetPath);
      return {
        success: false,
        path: targetPath,
        error: `Target path already exists: ${targetPath}`,
      };
    } catch {
      // Path doesn't exist — good, we can clone into it
    }

    return new Promise<CloneResult>((resolve) => {
      const proc = spawn('git', ['clone', repoUrl, targetPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stderr = '';
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, path: targetPath });
        } else {
          resolve({
            success: false,
            path: targetPath,
            error: stderr.trim() || `git clone exited with code ${code}`,
          });
        }
      });

      proc.on('error', (err) => {
        resolve({
          success: false,
          path: targetPath,
          error: `Failed to spawn git: ${err.message}`,
        });
      });
    });
  }
}
