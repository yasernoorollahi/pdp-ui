import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicLayout from '../layouts/public/PublicLayout';
import AdminLayout from '../layouts/admin/AdminLayout';
import UserLayout from '../layouts/user/UserLayout';
import HomePage from '../features/home/pages/HomePage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { UserDashboard } from '../features/user/pages/UserDashboard';
import { AdminDashboard } from '../features/dashboard/AdminDashboard';
import { LockedUsersPage } from '../features/admin/pages/LockedUsersPage';
import { AdminStatsPage } from '../features/stats/AdminStatsPage';
import { AdminAuditLogsPage } from '../features/audit/pages/AdminAuditLogsPage';
import { RoleGuard } from '../shared/components/guards/RoleGuard';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* USER ROUTES */}
        <Route element={<RoleGuard allowedRoles={['ROLE_USER']} />}>
          <Route element={<UserLayout />}>
            <Route path="/app" element={<UserDashboard />} />
            <Route path="/app/chat" element={<UserDashboard />} />
            <Route path="/app/insights" element={<UserDashboard />} />
          </Route>
        </Route>

        {/* ADMIN ROUTES */}
        <Route element={<RoleGuard allowedRoles={['ROLE_ADMIN']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin"                    element={<AdminDashboard />} />
            <Route path="/admin/stats"              element={<AdminStatsPage />} />
            <Route path="/admin/users/locked"       element={<LockedUsersPage />} />
            <Route path="/admin/audit"              element={<AdminAuditLogsPage />} />

          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
