import { Card } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

interface KpiCardV2Props {
  label: string;
  value: string | number;
  icon: ReactNode;
  iconColor?: string;
  trend?: number;
  loading?: boolean;
}

export default function KpiCardV2({ label, value, icon, iconColor = 'var(--accent-primary)', trend, loading }: KpiCardV2Props) {
  const trendPositive = trend !== undefined && trend >= 0;

  return (
    <Card loading={loading} className="kpi-card" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'var(--accent-primary-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: 4,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2,
            }}
          >
            {value}
          </div>
          {trend !== undefined && (
            <div
              style={{
                fontSize: 12,
                marginTop: 4,
                color: trendPositive ? 'var(--status-success)' : 'var(--status-danger)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {trendPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
