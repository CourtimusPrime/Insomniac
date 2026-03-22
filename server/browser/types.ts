/** Configuration for selecting and configuring a browser engine. */
export interface BrowserConfig {
  engine: "lightpanda" | "playwright";
  headless: boolean;
}

/** A single browser console entry. */
export interface ConsoleEntry {
  level: "info" | "warn" | "error";
  timestamp: string;
  message: string;
}

/** Abstraction over browser engines so we can swap between implementations. */
export interface BrowserEngine {
  /** Launch a new browser instance. */
  launch(config?: Partial<BrowserConfig>): Promise<void>;

  /** Navigate to the given URL. */
  navigate(url: string): Promise<void>;

  /** Click an element matching the CSS selector. */
  click(selector: string): Promise<void>;

  /** Fill an input element matching the CSS selector with the given value. */
  fill(selector: string, value: string): Promise<void>;

  /** Capture a screenshot of the current viewport, returned as a base64 PNG string. */
  screenshot(): Promise<string>;

  /** Get the text content of an element matching the CSS selector. */
  getText(selector: string): Promise<string>;

  /** Execute arbitrary JavaScript in the page context and return the result. */
  evaluate(script: string): Promise<unknown>;

  /** Close the browser instance and release resources. */
  close(): Promise<void>;

  /** Register a callback for browser console messages. */
  onConsole(callback: (entry: ConsoleEntry) => void): void;
}
