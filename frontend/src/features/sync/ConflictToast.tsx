import React, { useEffect, useState } from 'react';
import { appStore } from '../../stores/app-store';
import { SYNC_CONSTANTS } from '../../lib/constants/sync';

export const ConflictToast: React.FC = () => {
  const [snapshot, setSnapshot] = useState(appStore.getSnapshot());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // CR-FE-01 Fixed: Cleanup unsubscribe to prevent memory leaks
    const unsubscribe = appStore.subscribe(() => {
      const nextSnapshot = appStore.getSnapshot();
      if (nextSnapshot.lastConflict !== snapshot.lastConflict) {
        setSnapshot(nextSnapshot);
        if (nextSnapshot.lastConflict) {
          setVisible(true);
        }
      }
    });
    return () => { unsubscribe(); };
  }, [snapshot.lastConflict]);

  useEffect(() => {
    if (visible && snapshot.lastConflict) {
      const timer = setTimeout(() => setVisible(false), SYNC_CONSTANTS.CONFLICT_TOAST_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [visible, snapshot.lastConflict]);

  if (!visible || !snapshot.lastConflict) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center p-4 bg-amber-50 border border-amber-200 rounded-lg shadow-lg dark:bg-amber-900/30 dark:border-amber-800">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-amber-100 rounded-full dark:bg-amber-800/50">
          <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            데이터 충돌이 감지되었습니다.
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            다른 기기에서의 변경 사항이 우선 적용되었습니다. (ID: {snapshot.lastConflict.id.slice(0, 8)}...)
          </p>
        </div>
        <button 
          onClick={() => setVisible(false)}
          className="ml-auto pl-3 text-amber-400 hover:text-amber-500"
          aria-label="알림 닫기"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};
