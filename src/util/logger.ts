/**
 * Application Logger
 * 
 * Centralized logging utility for errors, debugging, and monitoring.
 * Provides structured logging with different levels and context.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
  url?: string;
  userAgent?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  stack?: string;
  timestamp: string;
}

/**
 * Logger class with structured logging capabilities
 */
class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;
  private sessionId: string;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createLogEntry(
    level: LogLevel, 
    message: string, 
    context?: LogContext, 
    error?: Error
  ): LogEntry {
    const timestamp = new Date().toISOString();
    
    const baseContext: LogContext = {
      sessionId: this.sessionId,
      timestamp,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      ...context,
    };

    return {
      level,
      message,
      context: baseContext,
      error,
      stack: error?.stack,
      timestamp,
    };
  }

  private formatConsoleOutput(entry: LogEntry): void {
    const { level, message, context, error } = entry;
    
    const levelEmojis = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '🚨',
    };

    if (this.isDevelopment) {
      console.group(`${levelEmojis[level]} [${level.toUpperCase()}] ${message}`);
      
      if (context && Object.keys(context).length > 0) {
        console.log('%cContext:', 'font-weight: bold;', context);
      }
      
      if (error) {
        console.error('%cError:', 'font-weight: bold; color: #dc2626;', error);
        if (error.stack) {
          console.error('%cStack:', 'font-weight: bold; color: #6b7280;', error.stack);
        }
      }
      
      console.groupEnd();
    } else {
      // Production: Simple logging
      console[level](
        `[${entry.timestamp}] [${level.toUpperCase()}] ${message}`,
        context ? JSON.stringify(context) : ''
      );
    }
  }

  private sendToExternalService(entry: LogEntry): void {
    if (!this.isProduction) return;

    // This would integrate with external logging services
    // Examples: Sentry, LogRocket, DataDog, etc.
    
    try {
      // Example implementation:
      // if (window.Sentry) {
      //   window.Sentry.captureMessage(entry.message, {
      //     level: entry.level,
      //     extra: entry.context,
      //     tags: {
      //       component: entry.context?.component,
      //       action: entry.context?.action,
      //     }
      //   });
      // }
      
      // For now, just store in localStorage for development
      if (typeof window !== 'undefined' && window.localStorage) {
        const logs = this.getStoredLogs();
        logs.push(entry);
        
        // Keep only last 100 logs
        if (logs.length > 100) {
          logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('app_logs', JSON.stringify(logs));
      }
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  private getStoredLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem('app_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return;
    
    const entry = this.createLogEntry('debug', message, context);
    this.formatConsoleOutput(entry);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('info', message, context);
    this.formatConsoleOutput(entry);
    this.sendToExternalService(entry);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('warn', message, context);
    this.formatConsoleOutput(entry);
    this.sendToExternalService(entry);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const entry = this.createLogEntry('error', message, context, error);
    this.formatConsoleOutput(entry);
    this.sendToExternalService(entry);
  }

  /**
   * Log API error specifically
   */
  apiError(
    endpoint: string, 
    method: string, 
    error: Error, 
    context?: LogContext
  ): void {
    this.error(`API Error: ${method} ${endpoint}`, error, {
      ...context,
      endpoint,
      method,
      component: 'API',
    });
  }

  /**
   * Log component error
   */
  componentError(
    componentName: string, 
    error: Error, 
    context?: LogContext
  ): void {
    this.error(`Component Error: ${componentName}`, error, {
      ...context,
      component: componentName,
    });
  }

  /**
   * Log user action
   */
  userAction(action: string, context?: LogContext): void {
    this.info(`User Action: ${action}`, {
      ...context,
      action,
      component: 'User',
    });
  }

  /**
   * Get all stored logs (for debugging)
   */
  getLogs(): LogEntry[] {
    return this.getStoredLogs();
  }

  /**
   * Clear all stored logs
   */
  clearLogs(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('app_logs');
    }
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
  }
}

// Create singleton logger instance
const logger = new Logger();

// Export logger instance and utility functions
export default logger;
export { logger };

// Convenience exports for common logging patterns
export const logError = (message: string, error?: Error, context?: LogContext) => 
  logger.error(message, error, context);

export const logWarn = (message: string, context?: LogContext) => 
  logger.warn(message, context);

export const logInfo = (message: string, context?: LogContext) => 
  logger.info(message, context);

export const logDebug = (message: string, context?: LogContext) => 
  logger.debug(message, context);

export const logAPIError = (endpoint: string, method: string, error: Error, context?: LogContext) => 
  logger.apiError(endpoint, method, error, context);

export const logComponentError = (componentName: string, error: Error, context?: LogContext) => 
  logger.componentError(componentName, error, context);

export const logUserAction = (action: string, context?: LogContext) => 
  logger.userAction(action, context);