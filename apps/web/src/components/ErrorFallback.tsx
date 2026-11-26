import { AlertTriangle } from 'lucide-react';
import type { FallbackProps } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4 text-ink">
      <Card className="w-full max-w-md border-status-err/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-status-err">
            <AlertTriangle className="h-5 w-5" /> Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-secondary">{message}</p>
          <Button onClick={resetErrorBoundary} size="sm">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
