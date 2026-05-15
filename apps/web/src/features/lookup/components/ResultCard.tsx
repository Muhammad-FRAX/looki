import { Card, Tag, Divider, Descriptions } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { LookupResponse } from '../../../api/types';

interface ResultCardProps {
  result: LookupResponse;
}

const lineTypeColors: Record<string, string> = {
  mobile: 'blue',
  fixed_line: 'cyan',
  fixed_line_or_mobile: 'geekblue',
  toll_free: 'green',
  voip: 'purple',
  premium_rate: 'red',
  unknown: 'default',
};

export default function ResultCard({ result }: ResultCardProps) {
  const valid = result.valid;

  return (
    <Card
      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', borderRadius: 12 }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {valid ? (
            <CheckCircleOutlined style={{ color: 'var(--status-success)', fontSize: 18 }} />
          ) : (
            <CloseCircleOutlined style={{ color: 'var(--status-danger)', fontSize: 18 }} />
          )}
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            {result.e164 ?? result.input}
          </span>
          {result.line_type && (
            <Tag color={lineTypeColors[result.line_type] ?? 'default'} style={{ borderRadius: 4, textTransform: 'capitalize' }}>
              {result.line_type.replace(/_/g, ' ')}
            </Tag>
          )}
          {result.cached && <Tag color="blue">Cached</Tag>}
        </div>
      }
    >
      <Descriptions
        column={{ xs: 1, sm: 2, md: 3 }}
        size="small"
        labelStyle={{ color: 'var(--text-tertiary)', fontWeight: 500 }}
        contentStyle={{ color: 'var(--text-primary)' }}
      >
        <Descriptions.Item label="E.164">{result.e164 ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="National">{result.national_format ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="International">{result.international_format ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Country">
          {result.country ? `${result.country.name} (+${result.country.calling_code})` : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Region">{result.region ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Line Type">
          {result.line_type ? result.line_type.replace(/_/g, ' ') : '—'}
        </Descriptions.Item>
      </Descriptions>

      {result.carrier && (
        <>
          <Divider style={{ borderColor: 'var(--border)', margin: '12px 0' }} />
          <Descriptions
            title={<span style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Carrier</span>}
            column={{ xs: 1, sm: 2, md: 3 }}
            size="small"
            labelStyle={{ color: 'var(--text-tertiary)', fontWeight: 500 }}
            contentStyle={{ color: 'var(--text-primary)' }}
          >
            <Descriptions.Item label="Name">{result.carrier.name}</Descriptions.Item>
            <Descriptions.Item label="Type">{result.carrier.type.replace(/_/g, ' ')}</Descriptions.Item>
            <Descriptions.Item label="Source">{result.carrier.source}</Descriptions.Item>
            <Descriptions.Item label="Allocated">
              {result.carrier.allocated_at ?? '—'}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}

      <Divider style={{ borderColor: 'var(--border)', margin: '12px 0' }} />
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
        {result.portability.note} · Lookup ID: {result.lookup_id}
      </div>
    </Card>
  );
}
