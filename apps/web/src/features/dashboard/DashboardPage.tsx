import { Row, Col } from 'antd';
import {
  PhoneOutlined,
  KeyOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { PageHeader, KpiCardV2 } from '../../components/ui';
import { UsageChart, ApiKeyList } from './components';
import { useDashboard } from './hooks/useDashboard';
import { useResponsive } from '../../hooks';

export default function DashboardPage() {
  const { keys, usage, totalLookups, activeKeys, todayCount, loading } = useDashboard();
  const { kpiMinWidth, sectionGap } = useResponsive();

  const kpis = [
    { label: 'Total Lookups (30d)', value: totalLookups.toLocaleString(), icon: <PhoneOutlined /> },
    { label: 'Active API Keys', value: activeKeys, icon: <KeyOutlined /> },
    { label: 'Lookups Today', value: todayCount.toLocaleString(), icon: <CalendarOutlined /> },
    { label: 'Cached Results', value: '—', icon: <ThunderboltOutlined /> },
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your usage overview and API key summary" />

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${kpiMinWidth}px, 1fr))`, gap: sectionGap }}>
        {kpis.map(k => (
          <KpiCardV2 key={k.label} loading={loading} label={k.label} value={k.value} icon={k.icon} />
        ))}
      </div>

      <UsageChart data={usage} loading={loading} />

      <ApiKeyList data={keys} loading={loading} />
    </>
  );
}
