import { Card, Tabs, Alert } from 'antd';
import { PageHeader } from '../../components/ui';
import { LookupForm, ResultCard, BulkTab } from './components';
import { useLookup } from './hooks/useLookup';

export default function LookupPage() {
  const { result, loading, error, lookup } = useLookup();

  return (
    <>
      <PageHeader title="Lookup" subtitle="Enter a phone number to get carrier, country, and line type data" />

      <Card style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        <Tabs
          defaultActiveKey="single"
          items={[
            {
              key: 'single',
              label: 'Single',
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <LookupForm loading={loading} onLookup={lookup} />
                  {error && <Alert type="error" message={error} showIcon />}
                  {result && <ResultCard result={result} />}
                </div>
              ),
            },
            {
              key: 'bulk',
              label: 'Bulk',
              children: <BulkTab />,
            },
          ]}
        />
      </Card>
    </>
  );
}
