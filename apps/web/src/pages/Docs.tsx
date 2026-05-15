export default function Docs() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <iframe
        src="/api/v1/docs"
        title="API Documentation"
        style={{ width: '100%', flex: 1, minHeight: 'calc(100vh - 128px)', border: 'none', borderRadius: 12 }}
      />
    </div>
  );
}
