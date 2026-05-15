import { Card, Tag, Alert, Descriptions } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { LookupResponse } from '../../../api/types.js';

interface ResultCardProps {
  result: LookupResponse;
}

export default function ResultCard({ result }: ResultCardProps) {
  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {result.valid ? (
            <CheckCircleOutlined style={{ color: 'var(--status-success)', fontSize: 18 }} />
          ) : (
            <CloseCircleOutlined style={{ color: 'var(--status-danger)', fontSize: 18 }} />
          )}
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-primary)' }}>
            {result.e164 || result.input}
          </span>
          {result.cached && (
            <Tag color="blue" style={{ marginLeft: 4 }}>
              Cached
            </Tag>
          )}
        </div>
      }
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
      }}
    >
      <Descriptions
        column={{ xs: 1, sm: 2, md: 3 }}
        labelStyle={{
          color: 'var(--text-secondary)',
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontWeight: 500,
        }}
        contentStyle={{ color: 'var(--text-primary)', fontWeight: 500 }}
      >
        <Descriptions.Item label="National Format">
          {result.national_format || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="International Format">
          {result.international_format || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Country">
          {result.country
            ? `${result.country.name} (+${result.country.calling_code})`
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Line Type">
          <Tag color="blue">{result.line_type.replace(/_/g, ' ')}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Region">{result.region ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Valid">
          {result.valid ? (
            <Tag color="green">Yes</Tag>
          ) : (
            <Tag color="red">No</Tag>
          )}
        </Descriptions.Item>
        {result.carrier && (
          <Descriptions.Item label="Carrier" span={3}>
            <div>
              <div style={{ fontWeight: 600 }}>{result.carrier.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {result.carrier.type.replace(/_/g, ' ')} &middot; Source:{' '}
                {result.carrier.source}
                {result.carrier.allocated_at
                  ? ` · Allocated: ${result.carrier.allocated_at}`
                  : ''}
              </div>
            </div>
          </Descriptions.Item>
        )}
      </Descriptions>
      <Alert
        type="info"
        showIcon
        message={result.portability.note}
        style={{ marginTop: 16, borderRadius: 8 }}
      />
    </Card>
  );
}
