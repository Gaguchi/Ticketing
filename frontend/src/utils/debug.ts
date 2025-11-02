/**
 * Debug utility for development logging
 * Automatically disabled in production builds
 */

const IS_DEV = import.meta.env.DEV;

export const LogLevel = {
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
  DEBUG: "DEBUG",
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export const LogCategory = {
  AUTH: "🔐 Auth",
  PROJECT: "📁 Project",
  API: "🌐 API",
  LAYOUT: "🏗️  Layout",
  TICKET: "🎫 Ticket",
  COMPANY: "🏢 Company",
  USER: "👤 User",
} as const;

export type LogCategory = (typeof LogCategory)[keyof typeof LogCategory];

class DebugLogger {
  private enabled = IS_DEV;

  /**
   * Toggle logging on/off
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Log with category and level
   */
  log(
    category: LogCategory,
    level: LogLevel,
    message: string,
    ...args: any[]
  ): void {
    if (!this.enabled) return;

    const prefix = `${category} [${level}]`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(prefix, message, ...args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, ...args);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, message, ...args);
        break;
      default:
        console.log(prefix, message, ...args);
    }
  }

  /**
   * Convenience methods for each category
   */
  auth(message: string, ...args: any[]): void {
    this.log(LogCategory.AUTH, LogLevel.INFO, message, ...args);
  }

  project(message: string, ...args: any[]): void {
    this.log(LogCategory.PROJECT, LogLevel.INFO, message, ...args);
  }

  api(message: string, ...args: any[]): void {
    this.log(LogCategory.API, LogLevel.INFO, message, ...args);
  }

  layout(message: string, ...args: any[]): void {
    this.log(LogCategory.LAYOUT, LogLevel.INFO, message, ...args);
  }

  ticket(message: string, ...args: any[]): void {
    this.log(LogCategory.TICKET, LogLevel.INFO, message, ...args);
  }

  /**
   * Performance timing utility
   */
  time(label: string): void {
    if (!this.enabled) return;
    console.time(label);
  }

  timeEnd(label: string): void {
    if (!this.enabled) return;
    console.timeEnd(label);
  }

  /**
   * Group logging
   */
  group(label: string): void {
    if (!this.enabled) return;
    console.group(label);
  }

  groupEnd(): void {
    if (!this.enabled) return;
    console.groupEnd();
  }
}

// Export singleton instance
export const debug = new DebugLogger();
