import { Navigate, createBrowserRouter } from 'react-router-dom';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { AppShell } from '@/components/layout/AppShell';
import { ROUTES } from '@/lib/constants/routes';
import { AuthPage } from '@/pages/auth/AuthPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { FocusPage } from '@/pages/focus/FocusPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: ROUTES.home,
    element: <Navigate replace to={ROUTES.dashboard} />,
  },
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        path: ROUTES.dashboard,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.focus,
        element: <FocusPage />,
      },
      {
        path: ROUTES.settings,
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: ROUTES.auth,
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <AuthPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);