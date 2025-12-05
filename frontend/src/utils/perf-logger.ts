/**
 * Performance Logger - Focused on request times and render performance
 * Only logs actionable performance metrics
 */

const IS_DEV = import.meta.env.DEV;

// Thresholds for logging (only log when exceeded)
const SLOW_REQUEST_MS = 1000; // Log requests slower than 1 second
const SLOW_RENDER_MS = 16; // Log renders slower than 1 frame (16ms)

interface RequestMetric {
  url: string;
  method: string;
  duration: number;
  status?: number;
}

interface RenderMetric {
  component: string;
  duration: number;
  reason?: string;
}

class PerfLogger {
  private enabled = IS_DEV;
  private requestMetrics: RequestMetric[] = [];
  private renderMetrics: RenderMetric[] = [];

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Log slow API requests
   */
  logRequest(metric: RequestMetric): void {
    if (!this.enabled) return;

    this.requestMetrics.push(metric);

    // Only log slow requests
    if (metric.duration >= SLOW_REQUEST_MS) {
      const emoji = metric.status && metric.status >= 400 ? "🔴" : "🐢";
      console.log(
        `${emoji} SLOW REQUEST: ${metric.method} ${metric.url} - ${metric.duration}ms`
      );
    }
  }

  /**
   * Log slow component renders
   */
  logRender(metric: RenderMetric): void {
    if (!this.enabled) return;

    this.renderMetrics.push(metric);

    // Only log slow renders
    if (metric.duration >= SLOW_RENDER_MS) {
      console.log(
        `🐢 SLOW RENDER: ${metric.component} - ${metric.duration.toFixed(2)}ms${
          metric.reason ? ` (${metric.reason})` : ""
        }`
      );
    }
  }

  /**
   * Time a function and log if slow
   */
  time<T>(label: string, fn: () => T): T {
    if (!this.enabled) return fn();

    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    if (duration >= SLOW_RENDER_MS) {
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  /**
   * Time an async function and log if slow
   */
  async timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return fn();

    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    if (duration >= SLOW_REQUEST_MS) {
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  /**
   * Get performance summary
   */
  getSummary(): { requests: RequestMetric[]; renders: RenderMetric[] } {
    return {
      requests: [...this.requestMetrics],
      renders: [...this.renderMetrics],
    };
  }

  /**
   * Print performance summary to console
   */
  printSummary(): void {
    if (!this.enabled) return;

    const slowRequests = this.requestMetrics.filter(
      (r) => r.duration >= SLOW_REQUEST_MS
    );
    const slowRenders = this.renderMetrics.filter(
      (r) => r.duration >= SLOW_RENDER_MS
    );

    if (slowRequests.length === 0 && slowRenders.length === 0) {
      console.log("✅ No performance issues detected");
      return;
    }

    console.group("📊 Performance Summary");

    if (slowRequests.length > 0) {
      console.log(`\n🐢 Slow Requests (>${SLOW_REQUEST_MS}ms):`);
      slowRequests.forEach((r) => {
        console.log(`  ${r.method} ${r.url}: ${r.duration}ms`);
      });
    }

    if (slowRenders.length > 0) {
      console.log(`\n🐢 Slow Renders (>${SLOW_RENDER_MS}ms):`);
      const grouped = slowRenders.reduce(
        (acc, r) => {
          acc[r.component] = (acc[r.component] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      Object.entries(grouped).forEach(([component, count]) => {
        console.log(`  ${component}: ${count} slow renders`);
      });
    }

    console.groupEnd();
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.requestMetrics = [];
    this.renderMetrics = [];
  }
}

export const perfLogger = new PerfLogger();

// Expose to window for debugging
if (IS_DEV && typeof window !== "undefined") {
  (window as any).perfLogger = perfLogger;
}
