/**
 * Development route to test database connection
 * Route: /dev/db-test
 */

import { createFileRoute } from '@tanstack/react-router';
import { pingDb } from '@/server/functions/dev';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@cdecaire/sable';
import { Region, Stack, Row } from '@cdecaire/sable/layout';

export const Route = createFileRoute('/dev/db-test')({
  component: DbTestPage,
});

interface DbStatus {
  success: boolean;
  connected: boolean;
  userCount?: number;
  error?: string;
  timestamp: string;
}

function DbTestPage() {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    try {
      const result = await pingDb();
      setStatus(result);
    } catch (error) {
      setStatus({
        success: false,
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Region max="42rem" className="py-8">
      <PageHeader title="Database Connection Test" />

      <Card className="p-6">
        <Stack gap={2}>
          <Row align="center" justify="between">
            <h2 className="text-xl font-semibold">Test Database Connection</h2>
            <Button onClick={handleTest} disabled={loading}>
              {loading ? <LoadingSpinner size="sm" /> : 'Test Connection'}
            </Button>
          </Row>

          {status && (
            <Stack gap={1.5} className="mt-6">
              <div className={`p-4 rounded-lg ${status.success ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                <Row align="center" gap={1} className="mb-2">
                  <div className={`w-3 h-3 rounded-full ${status.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-semibold">
                    {status.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </Row>

                {status.success && status.userCount !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    Users in database: <span className="font-mono font-semibold">{status.userCount}</span>
                  </p>
                )}

                {status.error && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    Error: {status.error}
                  </p>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                  Tested at: {new Date(status.timestamp).toLocaleString()}
                </p>
              </div>
            </Stack>
          )}

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Ensure DATABASE_URL is set in your .env.local file</li>
              <li>Run database migrations using: <code className="bg-background px-1 rounded">npm run db:migrate</code></li>
              <li>Click "Test Connection" to verify database connectivity</li>
            </ol>
          </div>
        </Stack>
      </Card>
    </Region>
  );
}

