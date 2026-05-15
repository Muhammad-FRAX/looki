import { useState } from 'react';
import { Button, Popconfirm, Alert } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { PageHeader, ResponsiveChart } from '../../components/ui/index.js';
import { StatsGrid, UsersTable } from './components/index.js';
import {
  useAdminStats,
  useAdminUsers,
  useDataReload,
} from './hooks/useAdmin.js';
import { useTheme } from '../../contexts/ThemeContext.js';
import { echartsColorsDark, echartsColorsLight } from '../../theme/tokens.js';

export default function AdminPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: users, isLoading: usersLoading } = useAdminUsers(page, pageSize);
  const { mutate: reloadData, isPending: reloading, isSuccess: reloaded } = useDataReload();

  const { theme } = useTheme();
  const colors = theme === 'dark' ? echartsColorsDark : echartsColorsLight;

  const latencyOption = {
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: 'var(--bg-elevated)',
      borderColor: 'var(--border)',
      textStyle: { color: 'var(--text-primary)', fontSize: 13 },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: ['p50', 'p95', 'p99'],
      axisLine: { lineStyle: { color: 'var(--border)' } },
      axisLabel: { color: 'var(--text-secondary)', fontSize: 12 },
    },
    yAxis: {
      type: 'value' as const,
      name: 'ms',
      nameTextStyle: { color: 'var(--text-secondary)', fontSize: 12 },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: 'var(--border)', type: 'dashed' as const } },
      axisLabel: { color: 'var(--text-secondary)', fontSize: 12, formatter: '{value} ms' },
    },
    series: [
      {
        type: 'bar',
        data: [
          stats?.latency_24h?.p50 ?? 0,
          stats?.latency_24h?.p95 ?? 0,
          stats?.latency_24h?.p99 ?? 0,
        ],
        itemStyle: {
          color: colors[0],
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top' as const,
          color: 'var(--text-secondary)',
          fontSize: 12,
          formatter: '{c} ms',
        },
      },
    ],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="Admin"
        subtitle="System statistics, user management, and data controls"
        action={
          <Popconfirm
            title="Reload prefix data?"
            description="This will download fresh carrier data and flush the lookup cache."
            onConfirm={() => reloadData()}
            okText="Reload"
            cancelText="Cancel"
          >
            <Button
              icon={<ReloadOutlined />}
              loading={reloading}
              style={{ fontWeight: 600 }}
            >
              Reload Data
            </Button>
          </Popconfirm>
        }
      />

      {reloaded && (
        <Alert
          type="success"
          message="Data reload triggered successfully."
          showIcon
          closable
          style={{ borderRadius: 8 }}
        />
      )}

      <StatsGrid data={stats} loading={statsLoading} />

      <ResponsiveChart
        title="API Latency (Last 24h)"
        option={latencyOption}
        loading={statsLoading}
        height={240}
      />

      <UsersTable
        data={users?.users}
        total={users?.total}
        loading={usersLoading}
        page={page}
        pageSize={pageSize}
        onPageChange={(p, ps) => {
          setPage(p);
          setPageSize(ps);
        }}
      />
    </div>
  );
}
