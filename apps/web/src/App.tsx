import { ConfigProvider } from 'antd';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from './contexts/ThemeContext';
import { darkTheme, lightTheme } from './theme';
import { AuthProvider } from './auth/AuthProvider';
import { SidebarProvider } from './contexts/SidebarContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AppLayout from './layouts/AppLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Docs from './pages/Docs';
import LookupPage from './features/lookup/LookupPage';
import DashboardPage from './features/dashboard/DashboardPage';
import KeysPage from './features/keys/KeysPage';
import AdminPage from './features/admin/AdminPage';

function AppRoutes() {
  const { theme } = useTheme();

  return (
    <ConfigProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
      <AuthProvider>
        <SidebarProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected — uses AppLayout shell */}
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
