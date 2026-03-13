import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

/**
 * LoggerService
 * 
 * Provides a centralized logging service that:
 * - Guards console statements in production
 * - Provides different log levels (debug, info, warn, error)
 * - Only logs in development or browser environment
 * - Automatically formats messages with timestamps
 * 
 * Benefits:
 * - Prevents console pollution in production builds
 * - Improves performance by eliminating unnecessary console calls
 * - Provides consistent logging format across the application
 * - SSR-safe (won't crash on server)
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly isBrowser: boolean;
  private readonly isProduction = environment.production;
  private readonly enableLogging: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // ✅ FIX: Initialize in constructor to prevent injector errors during SSR
    // Field initializers with inject() can fail if injector is destroyed during SSR
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.enableLogging = !this.isProduction || this.isBrowser;
  }

  /**
   * Logs a debug message (only in development)
   */
  debug(message: string, ...args: any[]): void {
    if (this.enableLogging && this.isBrowser) {
      console.debug(`[DEBUG] ${this.getTimestamp()} ${message}`, ...args);
    }
  }

  /**
   * Logs an info message
   */
  info(message: string, ...args: any[]): void {
    if (this.enableLogging && this.isBrowser) {
      console.info(`[INFO] ${this.getTimestamp()} ${message}`, ...args);
    }
  }

  /**
   * Logs a warning message
   */
  warn(message: string, ...args: any[]): void {
    if (this.enableLogging && this.isBrowser) {
      console.warn(`[WARN] ${this.getTimestamp()} ${message}`, ...args);
    }
  }

  /**
   * Logs an error message (always logged, even in production)
   */
  error(message: string, error?: any, ...args: any[]): void {
    if (this.isBrowser) {
      const errorDetails = error ? (error instanceof Error ? error.message : JSON.stringify(error)) : '';
      console.error(`[ERROR] ${this.getTimestamp()} ${message}`, errorDetails, ...args);
    }
  }

  /**
   * Logs a group of related messages
   */
  group(label: string): void {
    if (this.enableLogging && this.isBrowser) {
      console.group(label);
    }
  }

  /**
   * Ends a console group
   */
  groupEnd(): void {
    if (this.enableLogging && this.isBrowser) {
      console.groupEnd();
    }
  }

  /**
   * Logs a table (useful for arrays/objects)
   */
  table(data: any): void {
    if (this.enableLogging && this.isBrowser) {
      console.table(data);
    }
  }

  /**
   * Returns formatted timestamp
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }
}
