import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';

import PublicHomePage from './pages/PublicHomePage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import ProfilePage from './pages/ProfilePage';
import UsersGridPage from './pages/UsersGridPage';
import CreateUserPage from './pages/CreateUserPage';
import UserCardPage from './pages/UserCardPage';
import WorkshopsGridPage from './pages/WorkshopsGridPage';
import CreateWorkshopPage from './pages/CreateWorkshopPage';
import WorkshopCardPage from './pages/WorkshopCardPage';
import CloseWorkshopPage from './pages/CloseWorkshopPage';
import ImportCsvPage from './pages/ImportCsvPage';
import AccessLogPage from './pages/AccessLogPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<PublicHomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />

            {/* Authenticated (any role) */}
            <Route element={<AuthGuard />}>
              <Route element={<Layout />}>
                <Route path="/profile" element={<ProfilePage />} />

                {/* Admin only */}
                <Route element={<AuthGuard adminOnly />}>
                  <Route path="/admin/users" element={<UsersGridPage />} />
                  <Route path="/admin/users/new" element={<CreateUserPage />} />
                  <Route path="/admin/users/:id" element={<UserCardPage />} />
                  <Route path="/admin/workshops" element={<WorkshopsGridPage />} />
                  <Route path="/admin/workshops/new" element={<CreateWorkshopPage />} />
                  <Route path="/admin/workshops/:id" element={<WorkshopCardPage />} />
                  <Route path="/admin/workshops/:id/close" element={<CloseWorkshopPage />} />
                  <Route path="/admin/import" element={<ImportCsvPage />} />
                  <Route path="/admin/access-log" element={<AccessLogPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
