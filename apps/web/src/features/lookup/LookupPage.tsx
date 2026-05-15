import { PageHeader } from '../../components/ui/index.js';

export default function LookupPage() {
  return (
    <div>
      <PageHeader
        title="Phone Lookup"
        subtitle="Look up a phone number or submit a bulk job"
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
        Lookup page — coming in step 12
      </div>
    </div>
  );
}
