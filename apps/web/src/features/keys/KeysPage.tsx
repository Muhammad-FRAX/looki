import { PageHeader } from '../../components/ui/index.js';

export default function KeysPage() {
  return (
    <div>
      <PageHeader
        title="API Keys"
        subtitle="Manage your API keys"
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
        Keys page — coming in step 12
      </div>
    </div>
  );
}
