import { useState } from 'react';
import { Card, Tabs, Alert } from 'antd';
import { SearchOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/ui/index.js';
import { LookupForm, ResultCard, BulkTab, ApiKeyGate } from './components/index.js';
import { useLookup } from './hooks/useLookup.js';
import { getStoredApiKey } from '../../api/lookupClient.js';

export default function LookupPage() {
  const { mutate, data: result, isPending, error, reset } = useLookup();
  const [hasKey, setHasKey] = useState<boolean>(getStoredApiKey() !== null);

  const errMessage =
    error !== null
      ? ((error as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message ?? 'Lookup failed. Please try again.')
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="Phone Lookup"
        subtitle="Look up a phone number or submit a bulk job"
      />

      <ApiKeyGate onChange={(k) => setHasKey(k !== null)} />

      <Card
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 12,
        }}
        styles={{ body: { padding: '0 24px 24px' } }}
      >
        <Tabs
          defaultActiveKey="single"
          onChange={() => reset()}
          items={[
            {
              key: 'single',
              label: (
                <span>
                  <SearchOutlined style={{ marginRight: 6 }} />
                  Single
                </span>
              ),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <LookupForm
                    onLookup={(n) => mutate(n)}
                    loading={isPending}
                    disabled={!hasKey}
                  />
                  {errMessage && (
                    <Alert
                      type="error"
                      message={errMessage}
                      showIcon
                      style={{ borderRadius: 8, maxWidth: 560 }}
                    />
                  )}
                  {result && <ResultCard result={result} />}
                </div>
              ),
            },
            {
              key: 'bulk',
              label: (
                <span>
                  <UnorderedListOutlined style={{ marginRight: 6 }} />
                  Bulk
                </span>
              ),
              children: <BulkTab />,
            },
          ]}
        />
      </Card>
    </div>
  );
}
