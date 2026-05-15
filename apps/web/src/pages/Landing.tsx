import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card, Tag, Space, Alert, Spin, Row, Col } from 'antd';
import { SearchOutlined, PhoneOutlined, CheckCircleOutlined, GlobalOutlined } from '@ant-design/icons';
import axios from 'axios';
import type { LookupResponse } from '../api/types.js';
import ThemeToggle from '../components/ThemeToggle.js';

function ResultCard({ result }: { result: LookupResponse }) {
  return (
    <Card
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        marginTop: 24,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)', marginBottom: 4 }}>
            E164 Format
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-primary)' }}>{result.e164}</div>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)', marginBottom: 4 }}>
            Country
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
            {result.country ? `${result.country.name} (+${result.country.calling_code})` : '—'}
          </div>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)', marginBottom: 4 }}>
            Line Type
          </div>
          <Tag color="blue">{result.line_type.replace(/_/g, ' ')}</Tag>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)', marginBottom: 4 }}>
            Region
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{result.region ?? '—'}</div>
        </div>
        {result.carrier && (
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)', marginBottom: 4 }}>
              Original Carrier Allocation
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{result.carrier.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {result.carrier.type.replace(/_/g, ' ')} · {result.carrier.source}
            </div>
          </div>
        )}
        <div style={{ flex: '1 1 100%' }}>
          <Alert
            type="info"
            showIcon
            message={result.portability.note}
            style={{ borderRadius: 8 }}
          />
        </div>
      </div>
    </Card>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [number, setNumber] = useState('');
  const [result, setResult] = useState<LookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup() {
    if (!number.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await axios.get<LookupResponse>(`/api/v1/lookup?number=${encodeURIComponent(number)}`);
      setResult(data);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: { message?: string } } } };
      if (e.response?.status === 429) {
        setError('Demo limit reached (5/hour). Register for full access.');
      } else {
        setError(e.response?.data?.error?.message ?? 'Lookup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <header
        style={{
          background: 'var(--bg-container)',
          borderBottom: '1px solid var(--border)',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-primary)' }}>Looki</span>
        <Space>
          <ThemeToggle />
          <Button type="text" onClick={() => navigate('/login')} style={{ color: 'var(--text-secondary)' }}>
            Sign in
          </Button>
          <Button
            type="primary"
            onClick={() => navigate('/register')}
            style={{ background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', color: '#fff', fontWeight: 600 }}
          >
            Get started
          </Button>
        </Space>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px 48px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <Tag
            color="blue"
            style={{ marginBottom: 16, borderRadius: 20, padding: '4px 16px', fontSize: 12, fontWeight: 600 }}
          >
            Phone Number Intelligence
          </Tag>
          <h1
            style={{
              fontSize: 'clamp(32px, 6vw, 56px)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              margin: '0 0 16px',
            }}
          >
            Identify any phone number<br />
            <span style={{ color: 'var(--accent-primary)' }}>instantly</span>
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', margin: '0 auto 40px', maxWidth: 560 }}>
            Country, region, line type, carrier allocation — all returned in milliseconds.
            Self-hostable. No external paid APIs.
          </p>

          <Card
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              maxWidth: 560,
              margin: '0 auto',
            }}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                size="large"
                prefix={<PhoneOutlined style={{ color: 'var(--text-secondary)' }} />}
                placeholder="+12125550123"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                onPressEnter={handleLookup}
                style={{ borderRadius: '8px 0 0 8px' }}
              />
              <Button
                size="large"
                type="primary"
                icon={loading ? <Spin size="small" /> : <SearchOutlined />}
                onClick={handleLookup}
                disabled={loading || !number.trim()}
                style={{
                  background: 'var(--accent-primary)',
                  borderColor: 'var(--accent-primary)',
                  color: '#fff',
                  borderRadius: '0 8px 8px 0',
                  fontWeight: 600,
                  minWidth: 100,
                }}
              >
                {loading ? '' : 'Look up'}
              </Button>
            </Space.Compact>

            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, textAlign: 'left' }}>
              Anonymous demo — 5 lookups/hour. <button
                onClick={() => navigate('/register')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: 0, fontSize: 12 }}
              >Register for full access →</button>
            </div>
          </Card>

          {error && (
            <Alert
              type="error"
              message={error}
              showIcon
              style={{ marginTop: 24, borderRadius: 8, maxWidth: 560, margin: '24px auto 0' }}
            />
          )}

          {result && <ResultCard result={result} />}
        </div>

        <Row gutter={[24, 24]} style={{ marginTop: 64 }}>
          {[
            {
              icon: <GlobalOutlined style={{ fontSize: 24, color: 'var(--accent-primary)' }} />,
              title: 'Global Coverage',
              desc: 'NANPA (+1), Ofcom (+44), ACMA (+61) and more — all from open public data.',
            },
            {
              icon: <CheckCircleOutlined style={{ fontSize: 24, color: 'var(--status-success)' }} />,
              title: 'Open Source',
              desc: 'Self-host on your own infrastructure. No vendor lock-in, no external paid APIs.',
            },
            {
              icon: <SearchOutlined style={{ fontSize: 24, color: 'var(--status-info)' }} />,
              title: 'Fast & Cached',
              desc: 'Redis cache layer. p50 latency < 10ms on cache hit, < 50ms on miss.',
            },
          ].map((f) => (
            <Col xs={24} md={8} key={f.title}>
              <Card
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  height: '100%',
                }}
              >
                <div style={{ marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {f.title}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f.desc}</div>
              </Card>
            </Col>
          ))}
        </Row>
      </main>

      <footer
        style={{
          textAlign: 'center',
          padding: '24px',
          borderTop: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          fontSize: 13,
        }}
      >
        © 2025 Looki
      </footer>
    </div>
  );
}
