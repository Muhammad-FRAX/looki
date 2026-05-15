import { useState } from 'react';
import { Button, Input, Card, Tag, Alert, Divider, Space } from 'antd';
import { SearchOutlined, CheckCircleOutlined, ArrowRightOutlined, PhoneOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import type { LookupResponse } from '../api/types';

export default function Landing() {
  const navigate = useNavigate();
  const [number, setNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResponse | null>(null);
  const [error, setError] = useState('');

  async function handleLookup() {
    if (!number.trim()) return;
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const { data } = await axios.get<LookupResponse>(`/api/v1/lookup`, {
        params: { number: number.trim() },
      });
      setResult(data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        setError('Demo limit reached (5/hour). Register for full access.');
      } else {
        setError('Lookup failed. Enter a valid phone number in E.164 format (e.g. +12125550123).');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Nav */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          background: 'var(--bg-container)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '-0.5px' }}>
          Looki
        </span>
        <Space>
          <Button type="text" onClick={() => navigate('/login')} style={{ color: 'var(--text-secondary)' }}>
            Sign In
          </Button>
          <Button type="primary" onClick={() => navigate('/register')} style={{ fontWeight: 600 }}>
            Get Started
          </Button>
        </Space>
      </div>

      {/* Hero */}
      <div
        style={{
          textAlign: 'center',
          padding: '80px 24px 48px',
          maxWidth: 760,
          margin: '0 auto',
        }}
      >
        <Tag color="blue" style={{ marginBottom: 16, borderRadius: 20, padding: '2px 12px' }}>
          Self-hostable · No paid APIs
        </Tag>
        <h1
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: 1.15,
            margin: '0 0 16px',
            letterSpacing: '-1.5px',
          }}
        >
          Phone Number<br />
          <span style={{ color: 'var(--accent-primary)' }}>Intelligence</span>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', margin: '0 0 40px', lineHeight: 1.6 }}>
          Instant country, carrier, line type, and region data for any phone number.
          Self-hosted, open data, no vendor lock-in.
        </p>

        {/* Demo lookup */}
        <Card
          style={{
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border)',
            borderRadius: 12,
            textAlign: 'left',
            maxWidth: 520,
            margin: '0 auto',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Try it — 5 free lookups/hour
          </div>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              size="large"
              placeholder="+12125550123"
              prefix={<PhoneOutlined style={{ color: 'var(--text-tertiary)' }} />}
              value={number}
              onChange={e => setNumber(e.target.value)}
              onPressEnter={handleLookup}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              loading={loading}
              onClick={handleLookup}
            >
              Look up
            </Button>
          </Space.Compact>

          {error && (
            <Alert type="error" message={error} style={{ marginTop: 12 }} showIcon />
          )}

          {result && (
            <div style={{ marginTop: 16 }}>
              <Divider style={{ borderColor: 'var(--border)', margin: '12px 0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['E.164', result.e164 ?? '—'],
                  ['Country', result.country ? `${result.country.name} (+${result.country.calling_code})` : '—'],
                  ['Line type', result.line_type ?? '—'],
                  ['Region', result.region ?? '—'],
                  ['Carrier', result.carrier?.name ?? 'Unknown'],
                  ['Format', result.national_format ?? '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-tertiary)', marginBottom: 2 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>
              {result.cached && (
                <Tag color="blue" style={{ marginTop: 8 }}>Cached</Tag>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Features */}
      <div style={{ padding: '48px 24px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {[
            { title: 'Open Data', desc: 'NANPA, Ofcom, ACMA — no paid upstream APIs required.' },
            { title: 'Self-hosted', desc: 'One docker compose command. Your data, your infrastructure.' },
            { title: 'REST API', desc: 'Versioned JSON API with API key auth and rate limiting.' },
            { title: 'Bulk Processing', desc: 'Up to 1M numbers per async job with CSV download.' },
          ].map(f => (
            <Card
              key={f.title}
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', borderRadius: 12 }}
            >
              <CheckCircleOutlined style={{ color: 'var(--accent-primary)', fontSize: 20, marginBottom: 8 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f.desc}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '40px 24px 64px' }}>
        <Button
          type="primary"
          size="large"
          icon={<ArrowRightOutlined />}
          onClick={() => navigate('/register')}
          style={{ fontWeight: 600, height: 48, paddingInline: 32 }}
        >
          Get full access — free
        </Button>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-tertiary)' }}>
          No credit card. Self-host in minutes.
        </div>
        <Divider style={{ borderColor: 'var(--border)', marginTop: 48 }} />
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          This service returns the original carrier the number block was allocated to.
          Real-time portability requires integration with a paid upstream provider,
          which the architecture supports via a pluggable lookup module.
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 12 }}>
          © 2025 Looki
        </div>
      </div>
    </div>
  );
}
