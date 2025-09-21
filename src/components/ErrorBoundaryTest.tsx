/**
 * Error Boundary Test Component
 * 
 * Component for testing different types of errors with the APIErrorBoundary.
 * Only included in development builds for testing purposes.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryTestProps {
  onError?: (error: Error) => void;
}

export function ErrorBoundaryTest({ onError }: ErrorBoundaryTestProps) {
  const [errorType, setErrorType] = useState<string>('');

  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const triggerError = (type: string) => {
    setErrorType(type);
    
    let error: Error;
    
    switch (type) {
      case 'network':
        error = new Error('Network Error: Failed to fetch data from server');
        (error as Error & { code?: string }).code = 'NETWORK_ERROR';
        break;
        
      case 'auth':
        error = new Error('Unauthorized: Authentication token has expired');
        (error as Error & { response?: { status: number } }).response = { status: 401 };
        break;
        
      case 'server':
        error = new Error('Internal Server Error: Database connection failed');
        (error as Error & { response?: { status: number } }).response = { status: 500 };
        break;
        
      case 'timeout':
        error = new Error('Request timeout: Server took too long to respond');
        (error as Error & { code?: string }).code = 'ECONNABORTED';
        break;
        
      case 'client':
        error = new Error('Bad Request: Invalid data format');
        (error as Error & { response?: { status: number } }).response = { status: 400 };
        break;
        
      case 'javascript':
        error = new Error('TypeError: Cannot read property of undefined');
        error.stack = `TypeError: Cannot read property 'data' of undefined
    at ErrorBoundaryTest.triggerError (/src/components/ErrorBoundaryTest.tsx:45:20)
    at onClick (/src/components/ErrorBoundaryTest.tsx:80:25)`;
        break;
        
      default:
        error = new Error('Unknown Error: Something unexpected happened');
    }

    if (onError) {
      onError(error);
    }
    
    // Throw the error to trigger the boundary
    setTimeout(() => {
      throw error;
    }, 100);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg">🧪 Error Boundary Test</CardTitle>
        <p className="text-sm text-muted-foreground">
          Test different error scenarios (Development Only)
        </p>
      </CardHeader>
      
      <CardContent className="space-y-2">
        <Button 
          onClick={() => triggerError('network')} 
          variant="outline" 
          size="sm"
          className="w-full justify-start"
        >
          🌐 Network Error
        </Button>
        
        <Button 
          onClick={() => triggerError('auth')} 
          variant="outline" 
          size="sm"
          className="w-full justify-start"
        >
          🔐 Authentication Error
        </Button>
        
        <Button 
          onClick={() => triggerError('server')} 
          variant="outline" 
          size="sm"
          className="w-full justify-start"
        >
          🖥️ Server Error
        </Button>
        
        <Button 
          onClick={() => triggerError('timeout')} 
          variant="outline" 
          size="sm"
          className="w-full justify-start"
        >
          ⏱️ Timeout Error
        </Button>
        
        <Button 
          onClick={() => triggerError('client')} 
          variant="outline" 
          size="sm"
          className="w-full justify-start"
        >
          🚫 Client Error
        </Button>
        
        <Button 
          onClick={() => triggerError('javascript')} 
          variant="outline" 
          size="sm"
          className="w-full justify-start"
        >
          ⚠️ JavaScript Error
        </Button>
        
        {errorType && (
          <p className="text-xs text-muted-foreground mt-2">
            Last triggered: {errorType} error
          </p>
        )}
      </CardContent>
    </Card>
  );
}