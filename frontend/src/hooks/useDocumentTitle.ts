import { useEffect } from 'react';

const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'Focus Forest';

export function useDocumentTitle(pageTitle: string) {
  useEffect(() => {
    document.title = `${pageTitle} | ${APP_NAME}`;
  }, [pageTitle]);
}
