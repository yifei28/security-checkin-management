/**
 * API Error Boundary Component
 * 
 * Catches and gracefully handles API-related errors with fallback UI,
 * retry functionality, and integration with React Query error handling.
 */

import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface APIErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  resetQueries?: () => void;
}

/**
 * Fallback component displayed when an API error occurs
 */
function APIErrorFallback({ error, resetErrorBoundary, resetQueries }: APIErrorFallbackProps) {
  const queryClient = useQueryClient();

  // Determine error type and severity
  const isNetworkError = error.message.includes('Network Error') || 
                         error.message.includes('fetch') ||
                         error.message.includes('timeout');
  
  const isAuthError = error.message.includes('401') || 
                      error.message.includes('Unauthorized') ||
                      error.message.includes('Authentication');

  const isServerError = error.message.includes('500') || 
                        error.message.includes('503') ||
                        error.message.includes('502');

  // Handle retry with cache invalidation
  const handleRetry = async () => {
    try {
      // Clear relevant queries before retry
      if (resetQueries) {
        resetQueries();
      } else {
        // Invalidate all queries as fallback
        await queryClient.invalidateQueries();
      }
      
      // Reset error boundary to re-render components
      resetErrorBoundary();
      
      console.log('[API ERROR BOUNDARY] Retrying after error:', error.message);
    } catch (retryError) {
      console.error('[API ERROR BOUNDARY] Retry failed:', retryError);
    }
  };

  // Handle navigation to home
  const handleGoHome = () => {
    window.location.href = '/admin';
  };

  // Handle page refresh
  const handleRefresh = () => {
    window.location.reload();
  };

  // Get error details for display
  const getErrorDetails = () => {
    if (isNetworkError) {
      return {
        title: '网络连接问题',
        description: '无法连接到服务器，请检查您的网络连接。',
        severity: 'warning' as const,
        suggestions: [
          '检查网络连接是否正常',
          '确认服务器是否可访问',
          '稍后重试'
        ]
      };
    }

    if (isAuthError) {
      return {
        title: '身份验证失败',
        description: '您的登录状态已过期，请重新登录。',
        severity: 'destructive' as const,
        suggestions: [
          '点击下方按钮重新登录',
          '清除浏览器缓存后重试',
          '联系管理员获取帮助'
        ]
      };
    }

    if (isServerError) {
      return {
        title: '服务器错误',
        description: '服务器正在维护或遇到问题，请稍后重试。',
        severity: 'destructive' as const,
        suggestions: [
          '稍后重试',
          '刷新页面',
          '如果问题持续存在，请联系技术支持'
        ]
      };
    }

    return {
      title: '应用程序错误',
      description: '应用程序遇到意外错误。',
      severity: 'destructive' as const,
      suggestions: [
        '刷新页面重试',
        '返回首页',
        '如果问题持续存在，请联系技术支持'
      ]
    };
  };

  const errorDetails = getErrorDetails();

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">{errorDetails.title}</CardTitle>
          <CardDescription className="text-base">
            {errorDetails.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant={errorDetails.severity}>
            <Bug className="h-4 w-4" />
            <AlertTitle>错误详情</AlertTitle>
            <AlertDescription className="font-mono text-xs mt-2 p-2 bg-gray-50 rounded">
              {error.message}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">建议解决方案：</p>
            <ul className="text-sm text-gray-600 space-y-1 pl-4">
              {errorDetails.suggestions.map((suggestion, index) => (
                <li key={index} className="list-disc">
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button 
              onClick={handleRetry} 
              className="flex-1"
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              重试
            </Button>
            <Button 
              onClick={handleGoHome} 
              variant="outline"
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              返回首页
            </Button>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="ghost" 
            size="sm"
            className="w-full"
          >
            刷新页面
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

interface APIErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<APIErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetQueries?: () => void;
}

/**
 * API Error Boundary component that wraps components prone to API errors
 */
export function APIErrorBoundary({ 
  children, 
  fallback: Fallback = APIErrorFallback,
  onError,
  resetKeys,
  resetQueries
}: APIErrorBoundaryProps) {
  const queryClient = useQueryClient();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log error for debugging
    console.error('[API ERROR BOUNDARY] Caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Send error to external logging service if available
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      // errorTrackingService.captureException(error, { extra: errorInfo });
    }

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Clear React Query cache for fresh data on retry
    if (resetQueries) {
      resetQueries();
    }
  };

  const handleReset = () => {
    // Clear all cached queries when resetting
    queryClient.clear();
    console.log('[API ERROR BOUNDARY] Cache cleared on reset');
  };

  return (
    <ErrorBoundary
      FallbackComponent={(props) => (
        <Fallback {...props} resetQueries={resetQueries} />
      )}
      onError={handleError}
      onReset={handleReset}
      resetKeys={resetKeys}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * HOC for wrapping components with API Error Boundary
 */
export function withAPIErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<APIErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <APIErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </APIErrorBoundary>
  );

  WrappedComponent.displayName = `withAPIErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for manually triggering error boundary reset
 */
export function useErrorBoundaryReset() {
  const queryClient = useQueryClient();

  return React.useCallback(async () => {
    // Clear all React Query cache
    queryClient.clear();
    
    // Force reload if needed
    window.location.reload();
  }, [queryClient]);
}

export default APIErrorBoundary;