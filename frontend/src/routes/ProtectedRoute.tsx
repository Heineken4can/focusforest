import { type ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { LoadingState } from '@/components/states/LoadingState';
import { refreshSession } from '@/features/auth/auth.api';
import { ROUTES } from '@/lib/constants/routes';
import { appStore } from '@/stores/app-store';

type ProtectedRouteProps = {
  children: ReactNode;
};

function useIsAuthenticated() {
  return useSyncExternalStore(
    appStore.subscribe,
    () => appStore.getSnapshot().isAuthenticated,
    () => appStore.getSnapshot().isAuthenticated,
  );
}

function useLocalModeFlag() {
  return useSyncExternalStore(
    appStore.subscribe,
    () => appStore.getSnapshot().localModeFlag,
    () => appStore.getSnapshot().localModeFlag,
  );
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = useIsAuthenticated();
  const localModeFlag = useLocalModeFlag();
  const [didSessionExpire, setDidSessionExpire] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(
    !isAuthenticated && !localModeFlag,
  );

  useEffect(() => {
    let isActive = true;

    if (isAuthenticated || localModeFlag) {
      setDidSessionExpire(false);
      setIsCheckingSession(false);
      return () => {
        isActive = false;
      };
    }

    setDidSessionExpire(false);
    setIsCheckingSession(true);

    void refreshSession({ redirectOnFailure: false })
      .catch(() => {
        appStore.clearAuthenticatedSession();
        if (isActive) {
          setDidSessionExpire(true);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, localModeFlag]);

  if (isAuthenticated || localModeFlag) {
    return <>{children}</>;
  }

  if (isCheckingSession) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10 md:px-6">
        <LoadingState
          title="로그인 상태를 확인하고 있어요"
          description="잠시만 기다려 주세요."
        />
      </div>
    );
  }

  return (
    <Navigate
      replace
      to={ROUTES.auth}
      state={{ from: location.pathname, sessionExpired: didSessionExpire }}
    />
  );
}
