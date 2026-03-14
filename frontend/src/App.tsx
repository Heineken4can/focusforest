import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

import { router } from '@/routes/router';
import { syncService } from '@/features/sync/sync-service';
import { metricsService } from '@/features/sync/metrics-service';
import { BootstrapProgressBar } from '@/features/sync/BootstrapProgressBar';
import { ConflictToast } from '@/features/sync/ConflictToast';

function App() {
  useEffect(() => {
    syncService.initAutoSync();
    metricsService.initAutoFlush();

    return () => {
      syncService.destroy();
      metricsService.destroy();
    };
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <BootstrapProgressBar />
      <ConflictToast />
    </>
  );
}

export default App;
