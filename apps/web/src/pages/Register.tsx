import { Form, Input, Button, Alert, Card, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: { email: string; password: string; confirm: string }) {
    if (values.password !== values.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(values.email, values.password);
      navigate('/dashboard');
    } catch {
      setError('Registration failed. Email may already be taken.');
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
            Create your account
          </div>
        </div>

        {error && (
          <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />
        )}

        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, min: 8, message: 'Minimum 8 characters' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          <Form.Item name="confirm" rules={[{ required: true, message: 'Please confirm password' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" size="large" />
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
              Create Account
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ borderColor: 'var(--border)' }} />

        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)' }}>
            Sign In
          </Link>
        </div>

        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 11, marginTop: 24 }}>
          © 2025 Looki
        </div>
      </Card>
    </div>
  );
}
