import { ConfigProvider } from 'antd';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from './contexts/ThemeContext.js';
import { SidebarProvider } from './contexts/SidebarContext.js';
import { AuthProvider } from './auth/AuthProvider.js';
import { darkTheme } from './theme/darkTheme.js';
import { lightTheme } from './theme/lightTheme.js';
import AppLayout from './layouts/AppLayout.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import AdminRoute from './components/AdminRoute.js';
import Landing from './pages/Landing.js';
import Login from './pages/Login.js';
import Register from './pages/Register.js';
import Docs from './pages/Docs.js';
import LookupPage from './features/lookup/LookupPage.js';
import DashboardPage from './features/dashboard/DashboardPage.js';
import KeysPage from './features/keys/KeysPage.js';
import AdminPage from './features/admin/AdminPage.js';

function AppRoutes() {
  const { theme } = useTheme();

  return (
    <ConfigProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
      <AuthProvider>
        <SidebarProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/lookup" element={<LookupPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/keys" element={<KeysPage />} />
              <Route path="/docs" element={<Docs />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                }
              />
              <Route path="/app" element={<Navigate to="/dashboard" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SidebarProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default function App() {
  return <AppRoutes />;
}
