import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Drawer, Avatar, Dropdown, Space, Button } from 'antd';
import {
  SearchOutlined,
  DashboardOutlined,
  KeyOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuOutlined,
  UserOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext.js';
import { useSidebar } from '../contexts/SidebarContext.js';
import { useResponsive } from '../hooks/index.js';
import ThemeToggle from '../components/ThemeToggle.js';

const { Header, Content } = Layout;

const SIDEBAR_EXPANDED = 220;
const SIDEBAR_COLLAPSED = 72;

function Logo({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '0' : '0 20px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      <span
        style={{
          fontSize: collapsed ? 20 : 22,
          fontWeight: 700,
          color: 'var(--accent-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {collapsed ? 'L' : 'Looki'}
      </span>
    </div>
  );
}

function NavMenu({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const items = [
    { key: '/lookup', icon: <SearchOutlined />, label: 'Lookup' },
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/keys', icon: <KeyOutlined />, label: 'API Keys' },
    { key: '/docs', icon: <FileTextOutlined />, label: 'Docs' },
    ...(user?.role === 'admin'
      ? [{ key: '/admin', icon: <SettingOutlined />, label: 'Admin' }]
      : []),
  ];

  return (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      inlineCollapsed={collapsed}
      items={items}
      onClick={(e) => {
        navigate(e.key);
        onNavigate?.();
      }}
      style={{ flex: 1, border: 'none', background: 'transparent', overflowY: 'auto' }}
      theme="dark"
    />
  );
}

function DesktopSidebar() {
  const { collapsed, toggle } = useSidebar();
  const width = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <div
      style={{
        width,
        minWidth: width,
        background: 'var(--bg-container)',
        borderRight: '1px solid var(--border)',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      <Logo collapsed={collapsed} onClick={toggle} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <NavMenu collapsed={collapsed} />
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { collapsed } = useSidebar();
  const { isMobileOrTablet, contentPadding } = useResponsive();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!isMobileOrTablet) setDrawerOpen(false);
  }, [isMobileOrTablet]);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign out',
      danger: true,
      onClick: () => {
        logout().then(() => navigate('/login'));
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {!isMobileOrTablet && <DesktopSidebar />}

      {isMobileOrTablet && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={260}
          styles={{
            body: {
              padding: 0,
              background: 'var(--bg-container)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
            header: { display: 'none' },
          }}
        >
          <Logo collapsed={false} onClick={() => setDrawerOpen(false)} />
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <NavMenu collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </Drawer>
      )}

      <Layout
        style={{
          marginLeft: isMobileOrTablet ? 0 : sidebarWidth,
          transition: 'margin-left 0.2s ease',
          background: 'var(--bg-base)',
          minHeight: '100vh',
        }}
      >
        <Header
          style={{
            background: 'var(--bg-container)',
            borderBottom: '1px solid var(--border)',
            padding: `0 ${contentPadding}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            height: 64,
            lineHeight: 1,
          }}
        >
          <div>
            {isMobileOrTablet && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerOpen(true)}
                style={{ color: 'var(--text-secondary)', fontSize: 16 }}
              />
            )}
          </div>

          <Space size={8}>
            <ThemeToggle />
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  size={32}
                  icon={<UserOutlined />}
                  style={{ background: 'var(--accent-primary)', color: '#fff' }}
                />
                {!isMobileOrTablet && user?.email && (
                  <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>{user.email}</span>
                )}
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content
          style={{
            padding: contentPadding,
            maxWidth: 1920,
            margin: '0 auto',
            width: '100%',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
