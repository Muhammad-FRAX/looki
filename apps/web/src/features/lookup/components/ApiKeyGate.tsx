import { useState } from 'react';
import { Alert, Button, Input, Space, Tag, Typography } from 'antd';
import { KeyOutlined, CheckCircleFilled } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { getStoredApiKey, setStoredApiKey } from '../../../api/lookupClient.js';

interface ApiKeyGateProps {
  onChange?: (key: string | null) => void;
}

export default function ApiKeyGate({ onChange }: ApiKeyGateProps) {
  const [stored, setStored] = useState<string | null>(getStoredApiKey());
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(stored === null);

  function save() {
    const next = draft.trim();
    if (!next) return;
    setStoredApiKey(next);
    setStored(next);
    setDraft('');
    setEditing(false);
    onChange?.(next);
  }

  function clear() {
    setStoredApiKey(null);
    setStored(null);
    setEditing(true);
    onChange?.(null);
  }

  if (!editing && stored) {
    const masked = `${stored.slice(0, 12)}…${stored.slice(-4)}`;
    return (
      <Alert
        type="success"
        showIcon
        icon={<CheckCircleFilled />}
        message={
          <Space size="middle" wrap>
            <span>Using API key</span>
            <Tag color="green" style={{ fontFamily: 'monospace' }}>{masked}</Tag>
            <Button size="small" type="link" onClick={() => setEditing(true)}>Change</Button>
            <Button size="small" type="link" danger onClick={clear}>Remove</Button>
          </Space>
        }
        style={{ borderRadius: 8, maxWidth: 720 }}
      />
    );
  }

  return (
    <Alert
      type="info"
      showIcon
      icon={<KeyOutlined />}
      message="Paste your API key to use the lookup"
      description={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          <Typography.Text type="secondary">
            Don't have one yet? <Link to="/keys">Create an API key</Link> on the API Keys page, then paste it here.
          </Typography.Text>
          <Space.Compact style={{ width: '100%', maxWidth: 560 }}>
            <Input.Password
              size="large"
              placeholder="pi_live_…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPressEnter={save}
              style={{ borderRadius: '8px 0 0 8px' }}
            />
            <Button
              size="large"
              type="primary"
              onClick={save}
              disabled={!draft.trim()}
              style={{
                background: 'var(--accent-primary)',
                borderColor: 'var(--accent-primary)',
                color: '#fff',
                borderRadius: '0 8px 8px 0',
                fontWeight: 600,
                minWidth: 100,
              }}
            >
              Save
            </Button>
          </Space.Compact>
        </div>
      }
      style={{ borderRadius: 8, maxWidth: 720 }}
    />
  );
}
