import { PageHeader } from '../components/ui/index.js';

export default function Docs() {
  return (
    <div>
      <PageHeader
        title="API Documentation"
        subtitle="Interactive Swagger UI for all Looki API endpoints"
      />
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          height: 'calc(100vh - 180px)',
        }}
      >
        <iframe
          src="/api/v1/docs"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Looki API Docs"
        />
      </div>
    </div>
  );
}
