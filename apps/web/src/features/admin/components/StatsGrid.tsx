import { KpiCardV2 } from '../../../components/ui/index.js';
import {
  UserOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { AdminStats } from '../../../api/types.js';

interface StatsGridProps {
  data?: AdminStats;
  loading: boolean;
}

export default function StatsGrid({ data, loading }: StatsGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
      }}
    >
      <KpiCardV2
        label="Total Users"
        value={(data?.total_users ?? 0).toLocaleString()}
        icon={<UserOutlined />}
        loading={loading}
      />
      <KpiCardV2
        label="Total Lookups"
        value={(data?.total_lookups ?? 0).toLocaleString()}
        icon={<ThunderboltOutlined />}
        loading={loading}
      />
      <KpiCardV2
        label="Cache Hit Ratio"
        value={
          data != null
            ? `${(data.cache_hit_ratio * 100).toFixed(1)}%`
            : '—'
        }
        icon={<DatabaseOutlined />}
        loading={loading}
      />
      <KpiCardV2
        label="Queue Depth"
        value={(data?.queue_depth ?? 0).toLocaleString()}
        icon={<ClockCircleOutlined />}
        loading={loading}
      />
    </div>
  );
}
