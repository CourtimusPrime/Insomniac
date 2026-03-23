import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join, relative } from 'node:path';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { settings, workspaces } from '../db/schema/index.js';
import { broadcast } from '../ws/handler.js';

export interface Recommendation {
  type: 'security' | 'performance' | 'quality' | 'coverage' | 'architecture';
  severity: 'critical' | 'warning' | 'info';
  file: string;
  line?: number;
  message: string;
}

interface ScanInterval {
  minutes: number;
}

const DEFAULT_SCAN_INTERVAL_MINUTES = 30;

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
  '.cache',
]);

const SCANNABLE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.rs',
  '.py',
  '.go',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.rb',
  '.php',
  '.swift',
  '.kt',
  '.cs',
  '.vue',
  '.svelte',
]);

export class BackseatDriver {
  private scanTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Scan a project directory and return recommendations.
   * V1 uses basic static analysis: TODO/FIXME detection, missing test files, common anti-patterns.
   */
  async scan(projectPath: string): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const sourceFiles: string[] = [];

    await this.collectFiles(projectPath, sourceFiles);

    for (const filePath of sourceFiles) {
      const relPath = relative(projectPath, filePath);

      let content: string;
      try {
        content = await readFile(filePath, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');

      this.checkTodoFixme(relPath, lines, recommendations);
      this.checkSecurityPatterns(relPath, lines, recommendations);
      this.checkPerformancePatterns(relPath, lines, recommendations);
      this.checkQualityPatterns(relPath, lines, recommendations);
    }

    this.checkMissingTests(projectPath, sourceFiles, recommendations);

    broadcast('backseat:recommendations', {
      projectPath,
      recommendations,
      scannedAt: new Date().toISOString(),
    });

    return recommendations;
  }

  /**
   * Start automatic scanning on a configurable interval.
   * Reads the scan interval from the settings table.
   */
  async startAutoScan(projectPath: string): Promise<void> {
    this.stopAutoScan();

    const intervalMinutes = await this.getScanInterval();

    this.scanTimer = setInterval(
      () => {
        this.scan(projectPath).catch(() => {});
      },
      intervalMinutes * 60 * 1000,
    );
  }

  /**
   * Stop automatic scanning.
   */
  stopAutoScan(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
  }

  /**
   * Read the configured scan interval from settings, falling back to the default.
   */
  private async getScanInterval(): Promise<number> {
    const ws = db.select().from(workspaces).limit(1).get();
    if (!ws) return DEFAULT_SCAN_INTERVAL_MINUTES;

    const row = db
      .select()
      .from(settings)
      .where(
        and(
          eq(settings.workspaceId, ws.id),
          eq(settings.key, 'backseat.scanInterval'),
        ),
      )
      .get();

    if (!row || !row.value) return DEFAULT_SCAN_INTERVAL_MINUTES;

    const parsed = row.value as ScanInterval;
    return typeof parsed.minutes === 'number' && parsed.minutes > 0
      ? parsed.minutes
      : DEFAULT_SCAN_INTERVAL_MINUTES;
  }

  /**
   * Recursively collect source files from the project directory.
   */
  private async collectFiles(dir: string, results: string[]): Promise<void> {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.') continue;
      if (SKIP_DIRS.has(entry.name)) continue;

      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.collectFiles(fullPath, results);
      } else if (
        entry.isFile() &&
        SCANNABLE_EXTENSIONS.has(extname(entry.name))
      ) {
        results.push(fullPath);
      }
    }
  }

  /**
   * Detect TODO and FIXME comments.
   */
  private checkTodoFixme(
    relPath: string,
    lines: string[],
    recommendations: Recommendation[],
  ): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const upper = line.toUpperCase();

      if (upper.includes('TODO')) {
        recommendations.push({
          type: 'quality',
          severity: 'info',
          file: relPath,
          line: i + 1,
          message: `TODO comment: ${line.trim().slice(0, 120)}`,
        });
      } else if (
        upper.includes('FIXME') ||
        upper.includes('HACK') ||
        upper.includes('XXX')
      ) {
        recommendations.push({
          type: 'quality',
          severity: 'warning',
          file: relPath,
          line: i + 1,
          message: `FIXME/HACK comment needs attention: ${line.trim().slice(0, 120)}`,
        });
      }
    }
  }

  /**
   * Detect common security anti-patterns.
   */
  private checkSecurityPatterns(
    relPath: string,
    lines: string[],
    recommendations: Recommendation[],
  ): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Hardcoded secrets
      if (
        /(?:password|secret|api_?key|token)\s*[:=]\s*["'][^"']{8,}["']/i.test(
          line,
        )
      ) {
        recommendations.push({
          type: 'security',
          severity: 'critical',
          file: relPath,
          line: i + 1,
          message: 'Possible hardcoded secret or credential detected.',
        });
      }

      // eval() usage
      if (/\beval\s*\(/.test(line) && !line.trimStart().startsWith('//')) {
        recommendations.push({
          type: 'security',
          severity: 'critical',
          file: relPath,
          line: i + 1,
          message:
            'Use of eval() is a security risk. Consider safer alternatives.',
        });
      }

      // innerHTML assignment
      if (/\.innerHTML\s*=/.test(line)) {
        recommendations.push({
          type: 'security',
          severity: 'warning',
          file: relPath,
          line: i + 1,
          message:
            'Direct innerHTML assignment may cause XSS. Use textContent or a sanitization library.',
        });
      }
    }
  }

  /**
   * Detect common performance anti-patterns.
   */
  private checkPerformancePatterns(
    relPath: string,
    lines: string[],
    recommendations: Recommendation[],
  ): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Synchronous file operations in non-config files
      if (
        /\b(readFileSync|writeFileSync|readdirSync|statSync)\b/.test(line) &&
        !relPath.includes('config') &&
        !relPath.includes('setup')
      ) {
        recommendations.push({
          type: 'performance',
          severity: 'warning',
          file: relPath,
          line: i + 1,
          message:
            'Synchronous file I/O can block the event loop. Consider using the async version.',
        });
      }

      // console.log in non-test files
      if (
        /\bconsole\.log\s*\(/.test(line) &&
        !relPath.includes('test') &&
        !relPath.includes('spec') &&
        !line.trimStart().startsWith('//')
      ) {
        recommendations.push({
          type: 'quality',
          severity: 'info',
          file: relPath,
          line: i + 1,
          message:
            'console.log left in code. Consider using a proper logger or removing.',
        });
      }
    }
  }

  /**
   * Detect code quality patterns.
   */
  private checkQualityPatterns(
    relPath: string,
    lines: string[],
    recommendations: Recommendation[],
  ): void {
    // Check for very long files
    if (lines.length > 500) {
      recommendations.push({
        type: 'architecture',
        severity: 'info',
        file: relPath,
        message: `File has ${lines.length} lines. Consider splitting into smaller modules.`,
      });
    }

    // Check for deeply nested code (rough heuristic)
    for (let i = 0; i < lines.length; i++) {
      const leadingSpaces = lines[i].search(/\S/);
      if (leadingSpaces >= 24) {
        // 6+ levels of indentation (4 spaces each)
        recommendations.push({
          type: 'quality',
          severity: 'warning',
          file: relPath,
          line: i + 1,
          message:
            'Deeply nested code detected. Consider extracting into helper functions.',
        });
        break; // Only report once per file
      }
    }

    // Check for any/unknown type assertions in TS files
    if (relPath.endsWith('.ts') || relPath.endsWith('.tsx')) {
      for (let i = 0; i < lines.length; i++) {
        if (/as\s+any\b/.test(lines[i])) {
          recommendations.push({
            type: 'quality',
            severity: 'info',
            file: relPath,
            line: i + 1,
            message:
              "'as any' type assertion bypasses type safety. Consider proper typing.",
          });
        }
      }
    }
  }

  /**
   * Check for source files that don't have corresponding test files.
   */
  private checkMissingTests(
    projectPath: string,
    sourceFiles: string[],
    recommendations: Recommendation[],
  ): void {
    const testFiles = new Set(
      sourceFiles
        .filter(
          (f) =>
            f.includes('.test.') ||
            f.includes('.spec.') ||
            f.includes('__tests__'),
        )
        .map((f) => basename(f).replace(/\.(test|spec)\./, '.')),
    );

    const srcFiles = sourceFiles.filter(
      (f) =>
        !f.includes('.test.') &&
        !f.includes('.spec.') &&
        !f.includes('__tests__') &&
        !f.includes('node_modules') &&
        !basename(f).startsWith('index.'),
    );

    // Only report up to 10 missing test files to avoid noise
    let count = 0;
    for (const filePath of srcFiles) {
      if (count >= 10) break;

      const fileName = basename(filePath);
      if (!testFiles.has(fileName)) {
        const relPath = relative(projectPath, filePath);
        recommendations.push({
          type: 'coverage',
          severity: 'info',
          file: relPath,
          message: `No test file found for ${fileName}. Consider adding tests.`,
        });
        count++;
      }
    }
  }
}
