import { Card } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

interface KpiCardV2Props {
  label: string;
  value: string | number;
  icon: ReactNode;
  iconColor?: string;
  trend?: number;
  trendLabel?: string;
  loading?: boolean;
}

export default function KpiCardV2({
  label,
  value,
  icon,
  iconColor = 'var(--accent-primary)',
  trend,
  trendLabel,
  loading = false,
}: KpiCardV2Props) {
  const trendPositive = trend !== undefined && trend >= 0;

  return (
    <Card
      loading={loading}
      className="kpi-card"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        transition: 'all 0.2s ease',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'var(--accent-primary-soft, rgba(59,130,246,0.12))',
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
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
                color: trendPositive ? 'var(--status-success)' : 'var(--status-danger)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 4,
              }}
            >
              {trendPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {Math.abs(trend).toFixed(1)}%
              {trendLabel && (
                <span style={{ color: 'var(--text-secondary)' }}>{trendLabel}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
