import { Layout, Menu, Drawer, Avatar, Dropdown, Button } from 'antd';
import {
  SearchOutlined,
  DashboardOutlined,
  KeyOutlined,
  SettingOutlined,
  FileTextOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useResponsive } from '../hooks';
import { useAuth } from '../auth/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const { Sider, Header, Content } = Layout;

const menuItems = [
  { key: '/lookup', icon: <SearchOutlined />, label: 'Lookup' },
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/keys', icon: <KeyOutlined />, label: 'API Keys' },
  { key: '/docs', icon: <FileTextOutlined />, label: 'API Docs' },
];

const adminItem = { key: '/admin', icon: <SettingOutlined />, label: 'Admin' };

export default function AppLayout() {
  const { isMobileOrTablet, contentPadding, sectionGap } = useResponsive();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const items = user?.role === 'admin' ? [...menuItems, adminItem] : menuItems;

  function handleMenuClick({ key }: { key: string }) {
    navigate(key);
    setDrawerOpen(false);
  }

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
        onClick={() => setCollapsed(c => !c)}
      >
        {collapsed ? (
          <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent-primary)' }}>L</span>
        ) : (
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '-0.5px' }}>
            Looki
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={items}
          onClick={handleMenuClick}
          inlineCollapsed={collapsed}
          style={{ background: 'transparent', border: 'none' }}
        />
      </div>

      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          fontSize: 10,
          color: 'var(--text-tertiary)',
          textAlign: 'center',
        }}
      >
        {!collapsed && '© 2025 Looki'}
      </div>
    </div>
  );

  const header = (
    <Header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 64,
        padding: `0 ${contentPadding}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isMobileOrTablet && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setDrawerOpen(true)}
            style={{ color: 'var(--text-secondary)' }}
          />
        )}
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
          {items.find(i => i.key === location.pathname)?.label ?? 'Looki'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ThemeToggle />
        <Dropdown
          menu={{
            items: [
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: 'Sign Out',
                danger: true,
                onClick: () => { void logout(); navigate('/login'); },
              },
            ],
          }}
          placement="bottomRight"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <Avatar size={32} icon={<UserOutlined />} style={{ background: 'var(--accent-primary)' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{user?.email}</span>
          </div>
        </Dropdown>
      </div>
    </Header>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isMobileOrTablet ? (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={260}
          styles={{ body: { padding: 0, background: 'var(--bg-container)', height: '100%' } }}
          title={null}
          closable={false}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        <Sider
          collapsible
          collapsed={collapsed}
          collapsedWidth={72}
          width={220}
          trigger={null}
          style={{ background: 'var(--bg-container)', borderRight: '1px solid var(--border)' }}
        >
          {sidebarContent}
        </Sider>
      )}

      <Layout>
        {header}
        <Content
          style={{
            padding: contentPadding,
            maxWidth: 1920,
            margin: '0 auto',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: sectionGap }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
