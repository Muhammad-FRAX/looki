import { Button, Card, Popconfirm, message, Row, Col } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '../../components/ui';
import { StatsGrid, UsersTable } from './components';
import { apiClient } from '../../api/client';
import type { AdminStats, AdminUser, PaginatedResponse } from '../../api/types';
import { useTheme } from '../../contexts/ThemeContext';
import { getChartColors, getChartTextColor, getChartGridColor, getChartTooltip, getChartGrid } from '../../theme/echarts';
import { useResponsive } from '../../hooks';
import ReactECharts from 'echarts-for-react';

export default function AdminPage() {
  const { theme } = useTheme();
  const { isMobile, chartHeight } = useResponsive();
  const [messageApi, contextHolder] = message.useMessage();

  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiClient.get<AdminStats>('/admin/stats').then(r => r.data),
    staleTime: 30 * 1000,
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiClient.get<PaginatedResponse<AdminUser>>('/admin/users').then(r => r.data),
    staleTime: 60 * 1000,
  });

  const reloadMutation = useMutation({
    mutationFn: () => apiClient.post('/admin/data/reload'),
    onSuccess: () => { void messageApi.success('Data reload triggered'); },
    onError: () => { void messageApi.error('Failed to trigger reload'); },
  });

  const stats = statsQuery.data;
  const textColor = getChartTextColor(theme);
  const gridColor = getChartGridColor(theme);
  const tooltip = getChartTooltip(theme);
  const colors = getChartColors(theme);

  const latencyOption = {
    color: colors,
    tooltip: { trigger: 'axis', ...tooltip },
    grid: getChartGrid(isMobile),
    xAxis: {
      type: 'category',
      data: ['p50', 'p95', 'p99'],
      axisLabel: { color: textColor },
      axisLine: { lineStyle: { color: gridColor } },
    },
    yAxis: {
      type: 'value',
      name: 'ms',
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
    },
    series: [
      {
        name: 'Latency',
        type: 'bar',
        data: [
          stats?.latency_p50_ms ?? 0,
          stats?.latency_p95_ms ?? 0,
          stats?.latency_p99_ms ?? 0,
        ],
        barMaxWidth: 64,
        itemStyle: { borderRadius: [3, 3, 0, 0] },
      },
    ],
  };

  return (
    <>
      {contextHolder}
      <PageHeader
        title="Admin"
        subtitle="System statistics and user management"
        action={
          <Popconfirm
            title="Reload prefix data?"
            description="This will download and reload all carrier prefix data and flush the lookup cache."
            onConfirm={() => reloadMutation.mutate()}
            okText="Reload"
            cancelText="Cancel"
          >
            <Button
              icon={<ReloadOutlined />}
              loading={reloadMutation.isPending}
              style={{ fontWeight: 600 }}
            >
              Reload Data
            </Button>
          </Popconfirm>
        }
      />

      <StatsGrid data={stats} loading={statsQuery.isLoading} />

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title={<span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Latency Distribution (24h)</span>}
            loading={statsQuery.isLoading}
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
          >
            <ReactECharts
              option={latencyOption}
              style={{ height: chartHeight * 0.7 }}
              notMerge
            />
          </Card>
        </Col>
      </Row>

      <UsersTable
        data={usersQuery.data?.data ?? []}
        loading={usersQuery.isLoading}
      />
    </>
  );
}
