import { useState } from 'react';
import { Button, Input, Space } from 'antd';
import { SearchOutlined, PhoneOutlined } from '@ant-design/icons';

interface LookupFormProps {
  onLookup: (number: string) => void;
  loading: boolean;
  disabled?: boolean;
}

export default function LookupForm({ onLookup, loading, disabled = false }: LookupFormProps) {
  const [number, setNumber] = useState('');

  function handleSubmit() {
    if (disabled) return;
    const trimmed = number.trim();
    if (!trimmed) return;
    onLookup(trimmed);
  }

  return (
    <Space.Compact style={{ width: '100%', maxWidth: 560 }}>
      <Input
        size="large"
        prefix={<PhoneOutlined style={{ color: 'var(--text-secondary)' }} />}
        placeholder="+12125550123"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        onPressEnter={handleSubmit}
        disabled={loading || disabled}
        style={{ borderRadius: '8px 0 0 8px' }}
      />
      <Button
        size="large"
        type="primary"
        icon={<SearchOutlined />}
        onClick={handleSubmit}
        loading={loading}
        disabled={!number.trim() || disabled}
        style={{
          background: 'var(--accent-primary)',
          borderColor: 'var(--accent-primary)',
          color: '#fff',
          borderRadius: '0 8px 8px 0',
          fontWeight: 600,
          minWidth: 120,
        }}
      >
        {loading ? '' : 'Look up'}
      </Button>
    </Space.Compact>
  );
}
