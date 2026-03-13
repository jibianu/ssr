/**
 * SSR Performance Monitoring Utilities
 * 
 * Provides performance tracking for server-side rendering:
 * - Render time measurement
 * - Memory usage tracking
 * - Request metrics
 * - Performance data aggregation
 */

import { performance, PerformanceObserver, PerformanceEntry } from 'perf_hooks';
import * as os from 'os';

export interface PerformanceMetrics {
  renderTime: number;          // Time to render (ms)
  cacheTime?: number;           // Time to check cache (ms)
  totalTime: number;            // Total request time (ms)
  memoryBefore: NodeJS.MemoryUsage;
  memoryAfter: NodeJS.MemoryUsage;
  memoryDelta: {
    heapUsed: number;           // Memory change (bytes)
    heapTotal: number;
    external: number;
    rss: number;
  };
  requestPath: string;
  requestMethod: string;
  timestamp: number;
  cacheHit: boolean;
  userAgent?: string;
}

export interface PerformanceStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  avgRenderTime: number;
  avgTotalTime: number;
  p95RenderTime: number;        // 95th percentile
  p99RenderTime: number;         // 99th percentile
  p95TotalTime: number;
  p99TotalTime: number;
  avgMemoryDelta: number;
  maxMemoryDelta: number;
  errors: number;
  timeRange: {
    start: number;
    end: number;
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 10000; // Keep last 10k requests
  private readonly observer: PerformanceObserver;

  constructor() {
    // Monitor mark/measure performance entries
    this.observer = new PerformanceObserver((list) => {
      // Optional: Log detailed performance marks if needed
      // Uncomment for verbose logging:
      // list.getEntries().forEach((entry) => {
      //   console.log(`Performance: ${entry.name} ${entry.duration.toFixed(2)}ms`);
      // });
    });
    
    this.observer.observe({ entryTypes: ['measure', 'mark'], buffered: true });
  }

  /**
   * Start performance measurement for a request
   */
  startMeasure(requestPath: string, requestMethod: string = 'GET', userAgent?: string): string {
    const markId = `ssr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const memoryBefore = process.memoryUsage();
    
    performance.mark(`${markId}-start`);
    performance.mark(`${markId}-memory-start`);
    
    // Store context for this measurement
    (performance as any)[`${markId}-context`] = {
      requestPath,
      requestMethod,
      userAgent,
      memoryBefore,
      startTime: performance.now()
    };
    
    return markId;
  }

  /**
   * Mark cache check start
   */
  markCacheStart(markId: string): void {
    performance.mark(`${markId}-cache-start`);
  }

  /**
   * Mark cache check end
   */
  markCacheEnd(markId: string): void {
    performance.mark(`${markId}-cache-end`);
    performance.measure(`${markId}-cache`, `${markId}-cache-start`, `${markId}-cache-end`);
  }

  /**
   * Mark render start
   */
  markRenderStart(markId: string): void {
    performance.mark(`${markId}-render-start`);
  }

  /**
   * Mark render end and record metrics
   */
  endMeasure(markId: string, cacheHit: boolean = false): PerformanceMetrics | null {
    try {
      const context = (performance as any)[`${markId}-context`];
      if (!context) {
        console.warn(`Missing context for markId: ${markId}`);
        return null;
      }

      performance.mark(`${markId}-end`);
      
      // Measure total time
      performance.measure(`${markId}-total`, `${markId}-start`, `${markId}-end`);
      
      // Measure render time
      let renderTime = 0;
      try {
        performance.measure(`${markId}-render`, `${markId}-render-start`, `${markId}-end`);
        const renderMeasure = performance.getEntriesByName(`${markId}-render`)[0];
        renderTime = renderMeasure?.duration || 0;
      } catch (e) {
        // Render mark might not exist if cache hit
      }
      
      // Measure cache time
      let cacheTime = 0;
      try {
        const cacheMeasure = performance.getEntriesByName(`${markId}-cache`)[0];
        cacheTime = cacheMeasure?.duration || 0;
      } catch (e) {
        // Cache marks might not exist
      }
      
      // Get total time
      const totalMeasure = performance.getEntriesByName(`${markId}-total`)[0];
      const totalTime = totalMeasure?.duration || 0;
      
      const memoryAfter = process.memoryUsage();
      
      const memoryDelta = {
        heapUsed: memoryAfter.heapUsed - context.memoryBefore.heapUsed,
        heapTotal: memoryAfter.heapTotal - context.memoryBefore.heapTotal,
        external: memoryAfter.external - context.memoryBefore.external,
        rss: memoryAfter.rss - context.memoryBefore.rss
      };
      
      const metrics: PerformanceMetrics = {
        renderTime,
        cacheTime: cacheTime > 0 ? cacheTime : undefined,
        totalTime,
        memoryBefore: context.memoryBefore,
        memoryAfter,
        memoryDelta,
        requestPath: context.requestPath,
        requestMethod: context.requestMethod,
        timestamp: Date.now(),
        cacheHit,
        userAgent: context.userAgent
      };
      
      // Store metrics (limit to last N requests)
      this.metrics.push(metrics);
      if (this.metrics.length > this.maxMetrics) {
        this.metrics.shift();
      }
      
      // Clean up performance marks
      try {
        performance.clearMarks(`${markId}-start`);
        performance.clearMarks(`${markId}-end`);
        performance.clearMarks(`${markId}-render-start`);
        performance.clearMarks(`${markId}-cache-start`);
        performance.clearMarks(`${markId}-cache-end`);
        performance.clearMeasures(`${markId}-total`);
        performance.clearMeasures(`${markId}-render`);
        performance.clearMeasures(`${markId}-cache`);
        delete (performance as any)[`${markId}-context`];
      } catch (e) {
        // Ignore cleanup errors
      }
      
      return metrics;
    } catch (error) {
      console.error('Error in endMeasure:', error);
      return null;
    }
  }

  /**
   * Get performance statistics
   */
  getStats(timeRangeMinutes: number = 60): PerformanceStats {
    const cutoff = Date.now() - (timeRangeMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);
    
    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        avgRenderTime: 0,
        avgTotalTime: 0,
        p95RenderTime: 0,
        p99RenderTime: 0,
        p95TotalTime: 0,
        p99TotalTime: 0,
        avgMemoryDelta: 0,
        maxMemoryDelta: 0,
        errors: 0,
        timeRange: {
          start: cutoff,
          end: Date.now()
        }
      };
    }
    
    const renderTimes = recentMetrics.map(m => m.renderTime).filter(t => t > 0).sort((a, b) => a - b);
    const totalTimes = recentMetrics.map(m => m.totalTime).sort((a, b) => a - b);
    const memoryDeltas = recentMetrics.map(m => m.memoryDelta.heapUsed);
    
    const p95Index = Math.floor(recentMetrics.length * 0.95);
    const p99Index = Math.floor(recentMetrics.length * 0.99);
    
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const cacheMisses = recentMetrics.length - cacheHits;
    
    return {
      totalRequests: recentMetrics.length,
      cacheHits,
      cacheMisses,
      avgRenderTime: renderTimes.length > 0 
        ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length 
        : 0,
      avgTotalTime: totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length,
      p95RenderTime: renderTimes[p95Index] || 0,
      p99RenderTime: renderTimes[p99Index] || 0,
      p95TotalTime: totalTimes[p95Index] || 0,
      p99TotalTime: totalTimes[p99Index] || 0,
      avgMemoryDelta: memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length,
      maxMemoryDelta: Math.max(...memoryDeltas),
      errors: 0, // Could track errors separately
      timeRange: {
        start: cutoff,
        end: Date.now()
      }
    };
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit).reverse();
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    return {
      cpu: os.cpus().length,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      nodeMemory: process.memoryUsage(),
      timestamp: Date.now()
    };
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Destroy observer
   */
  destroy(): void {
    this.observer.disconnect();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

