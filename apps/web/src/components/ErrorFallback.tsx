import { AlertTriangle } from 'lucide-react';
import type { FallbackProps } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from '@/i18n/translations';

export const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  const t = useTranslations();
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4 text-on-surface">
      <Card className="w-full max-w-md border-error/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-error">
            <AlertTriangle className="h-5 w-5" /> {t.app.somethingWentWrong}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-on-surface-variant">{message}</p>
          <Button onClick={resetErrorBoundary} size="sm">
            {t.app.tryAgain}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
