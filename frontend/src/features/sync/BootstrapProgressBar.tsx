import React, { useEffect, useState } from 'react';
import { appStore } from '../../stores/app-store';

export const BootstrapProgressBar: React.FC = () => {
  const [snapshot, setSnapshot] = useState(appStore.getSnapshot());

  useEffect(() => {
    // CR-FE-01 Fixed: Cleanup unsubscribe to prevent memory leaks
    const unsubscribe = appStore.subscribe(() => {
      setSnapshot(appStore.getSnapshot());
    });
    return () => { unsubscribe(); };
  }, []);

  if (snapshot.bootstrapStatus === 'idle' || snapshot.bootstrapStatus === 'completed') {
    return null;
  }

  // CR-FE-04 Fixed: Proper type usage for snapshot fields
  const currentBatch = snapshot.currentBatch;
  const totalBatches = snapshot.totalBatches;
  const progress = totalBatches > 0 ? (currentBatch / totalBatches) * 100 : 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          데이터 동기화 중...
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          기존 데이터를 서버와 안전하게 병합하고 있습니다. ({currentBatch}/{totalBatches})
        </p>
        
        <div 
          className="w-full h-2 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700"
          aria-hidden="true"
        >
          <div 
            className="h-full bg-green-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className="mt-4 text-xs text-center text-gray-400">
          잠시만 기다려 주세요. 완료 후 대시보드로 이동합니다.
        </p>
      </div>
    </div>
  );
};
