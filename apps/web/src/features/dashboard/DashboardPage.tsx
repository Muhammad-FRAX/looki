import { PageHeader } from '../../components/ui/index.js';

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Usage analytics and API key overview"
      />
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 32,
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}
      >
        Dashboard page — coming in step 12
      </div>
    </div>
  );
}
