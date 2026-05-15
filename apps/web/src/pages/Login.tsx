import { Form, Input, Button, Alert, Card, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: { email: string; password: string }) {
    setError('');
    setLoading(true);
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        padding: 16,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border)',
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '-1px' }}>
            Looki
          </div>
          <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Phone Number Intelligence
          </div>
        </div>

        {error && (
          <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />
        )}

        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Password required' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{ fontWeight: 600 }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ borderColor: 'var(--border)' }} />

        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
          No account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-primary)' }}>
            Register
          </Link>
        </div>

        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 11, marginTop: 24 }}>
          © 2025 Looki
        </div>
      </Card>
    </div>
  );
}
