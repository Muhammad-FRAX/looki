import { PageHeader, KpiCardV2 } from '../../components/ui/index.js';
import { UsageChart, ApiKeyList } from './components/index.js';
import { useUsage, useApiKeys, useRevokeKey } from './hooks/useDashboard.js';
import {
  ThunderboltOutlined,
  ClockCircleOutlined,
  ApiOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

export default function DashboardPage() {
  const { data: usage, isLoading: usageLoading } = useUsage();
  const { data: keys, isLoading: keysLoading } = useApiKeys();
  const { mutate: revokeKey } = useRevokeKey();

  const totalLookups = usage?.reduce((s, d) => s + d.count, 0) ?? 0;
  const today = dayjs().format('YYYY-MM-DD');
  const todayCount =
    usage?.find((d) => d.date === today)?.count ?? 0;
  const activeKeys = keys?.filter((k) => !k.revoked_at).length ?? 0;
  const activeDays = usage?.filter((d) => d.count > 0).length ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="Dashboard"
        subtitle="Usage analytics and API key overview"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        <KpiCardV2
          label="Total Lookups (30d)"
          value={totalLookups.toLocaleString()}
          icon={<ThunderboltOutlined />}
          loading={usageLoading}
        />
        <KpiCardV2
          label="Lookups Today"
          value={todayCount.toLocaleString()}
          icon={<ClockCircleOutlined />}
          loading={usageLoading}
        />
        <KpiCardV2
          label="Active API Keys"
          value={activeKeys}
          icon={<ApiOutlined />}
          loading={keysLoading}
        />
        <KpiCardV2
          label="Active Days (30d)"
          value={activeDays}
          icon={<CalendarOutlined />}
          loading={usageLoading}
        />
      </div>

      <UsageChart data={usage} loading={usageLoading} />

      <ApiKeyList
        data={keys}
        loading={keysLoading}
        onRevoke={(id) => revokeKey(id)}
      />
    </div>
  );
}
