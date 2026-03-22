type GitHubFileEntry = {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
};

type GitHubContentResponse = {
  content?: string;
  encoding?: string;
  sha: string;
  name: string;
  path: string;
  type: string;
};

export class GitHubFileAdapter {
  private token: string;
  private baseUrl = "https://api.github.com";

  constructor(token: string) {
    this.token = token;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };
  }

  private repoUrl(repo: string, path: string): string {
    return `${this.baseUrl}/repos/${repo}/contents/${path}`;
  }

  /**
   * Read a file from a GitHub repository.
   * Returns the file content as a UTF-8 string.
   */
  async readFile(repo: string, path: string): Promise<string> {
    const res = await fetch(this.repoUrl(repo, path), {
      headers: this.headers(),
    });

    if (!res.ok) {
      throw new Error(`GitHub readFile failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as GitHubContentResponse;

    if (data.type !== "file" || !data.content) {
      throw new Error(`Path is not a file: ${path}`);
    }

    return Buffer.from(data.content, "base64").toString("utf-8");
  }

  /**
   * Write (create or update) a file in a GitHub repository.
   * Automatically fetches the current SHA for updates.
   */
  async writeFile(
    repo: string,
    path: string,
    content: string,
    commitMessage: string,
  ): Promise<void> {
    // Try to get existing file SHA for update
    let sha: string | undefined;
    try {
      const existing = await fetch(this.repoUrl(repo, path), {
        headers: this.headers(),
      });
      if (existing.ok) {
        const data = (await existing.json()) as GitHubContentResponse;
        sha = data.sha;
      }
    } catch {
      // File doesn't exist yet — create new
    }

    const body: Record<string, string> = {
      message: commitMessage,
      content: Buffer.from(content, "utf-8").toString("base64"),
    };
    if (sha) {
      body.sha = sha;
    }

    const res = await fetch(this.repoUrl(repo, path), {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`GitHub writeFile failed (${res.status}): ${await res.text()}`);
    }
  }

  /**
   * List files and directories at a path in a GitHub repository.
   */
  async listFiles(repo: string, path: string): Promise<GitHubFileEntry[]> {
    const res = await fetch(this.repoUrl(repo, path), {
      headers: this.headers(),
    });

    if (!res.ok) {
      throw new Error(`GitHub listFiles failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as GitHubContentResponse[];

    if (!Array.isArray(data)) {
      throw new Error(`Path is not a directory: ${path}`);
    }

    return data.map((entry) => ({
      name: entry.name,
      path: entry.path,
      type: entry.type as "file" | "dir",
      sha: entry.sha,
    }));
  }

  /**
   * Delete a file from a GitHub repository.
   */
  async deleteFile(
    repo: string,
    path: string,
    commitMessage: string,
  ): Promise<void> {
    // Must fetch SHA before deleting
    const existing = await fetch(this.repoUrl(repo, path), {
      headers: this.headers(),
    });

    if (!existing.ok) {
      throw new Error(`GitHub deleteFile: file not found (${existing.status}): ${path}`);
    }

    const data = (await existing.json()) as GitHubContentResponse;

    const res = await fetch(this.repoUrl(repo, path), {
      method: "DELETE",
      headers: this.headers(),
      body: JSON.stringify({
        message: commitMessage,
        sha: data.sha,
      }),
    });

    if (!res.ok) {
      throw new Error(`GitHub deleteFile failed (${res.status}): ${await res.text()}`);
    }
  }
}
