import { PageHeader } from '../../components/ui/index.js';

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        title="Admin"
        subtitle="System statistics and user management"
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
        Admin page — coming in step 12
      </div>
    </div>
  );
}
