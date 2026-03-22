import { chromium, type Browser, type Page } from "playwright";
import type { BrowserConfig, BrowserEngine, ConsoleEntry } from "./types.js";

/** Playwright-based implementation of the BrowserEngine abstraction. */
export class PlaywrightAdapter implements BrowserEngine {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private consoleCallback: ((entry: ConsoleEntry) => void) | null = null;

  async launch(config?: Partial<BrowserConfig>): Promise<void> {
    const headless = config?.headless ?? true;
    this.browser = await chromium.launch({ headless });
    const context = await this.browser.newContext();
    this.page = await context.newPage();

    // Forward page console messages to the registered callback
    this.page.on("console", (msg) => {
      if (!this.consoleCallback) return;
      const rawType = msg.type(); // 'log' | 'debug' | 'info' | 'warning' | 'error' | ...
      let level: ConsoleEntry["level"] = "info";
      if (rawType === "warning") level = "warn";
      else if (rawType === "error") level = "error";
      this.consoleCallback({ level, timestamp: new Date().toISOString(), message: msg.text() });
    });
  }

  async navigate(url: string): Promise<void> {
    await this.requirePage().goto(url, { waitUntil: "load" });
  }

  async click(selector: string): Promise<void> {
    await this.requirePage().click(selector);
  }

  async fill(selector: string, value: string): Promise<void> {
    await this.requirePage().fill(selector, value);
  }

  async screenshot(): Promise<string> {
    const buffer = await this.requirePage().screenshot({ type: "png" });
    return buffer.toString("base64");
  }

  async getText(selector: string): Promise<string> {
    return this.requirePage().textContent(selector).then((t) => t ?? "");
  }

  async evaluate(script: string): Promise<unknown> {
    return this.requirePage().evaluate(script);
  }

  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
    this.page = null;
    this.consoleCallback = null;
  }

  onConsole(callback: (entry: ConsoleEntry) => void): void {
    this.consoleCallback = callback;
  }

  /** Return the active page or throw if the browser hasn't been launched. */
  private requirePage(): Page {
    if (!this.page) {
      throw new Error("Browser not launched. Call launch() first.");
    }
    return this.page;
  }
}
