import { TeamOutlined, PhoneOutlined, ThunderboltOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { KpiCardV2 } from '../../../components/ui';
import { useResponsive } from '../../../hooks';
import type { AdminStats } from '../../../api/types';

interface StatsGridProps {
  data: AdminStats | undefined;
  loading: boolean;
}

export default function StatsGrid({ data, loading }: StatsGridProps) {
  const { kpiMinWidth, sectionGap } = useResponsive();

  const kpis = [
    {
      label: 'Total Users',
      value: data?.total_users.toLocaleString() ?? '—',
      icon: <TeamOutlined />,
    },
    {
      label: 'Total Lookups',
      value: data?.total_lookups.toLocaleString() ?? '—',
      icon: <PhoneOutlined />,
    },
    {
      label: 'Cache Hit Ratio',
      value: data ? `${(data.cache_hit_ratio * 100).toFixed(1)}%` : '—',
      icon: <ThunderboltOutlined />,
    },
    {
      label: 'p95 Latency',
      value: data ? `${data.latency_p95_ms}ms` : '—',
      icon: <ClockCircleOutlined />,
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${kpiMinWidth}px, 1fr))`,
        gap: sectionGap,
      }}
    >
      {kpis.map(k => (
        <KpiCardV2 key={k.label} label={k.label} value={k.value} icon={k.icon} loading={loading} />
      ))}
    </div>
  );
}
