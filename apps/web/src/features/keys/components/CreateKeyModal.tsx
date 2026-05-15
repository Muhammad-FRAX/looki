import { useState } from 'react';
import { Modal, Form, Input, Alert, Typography, Button, Space } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';

interface CreateKeyModalProps {
  open: boolean;
  onCreate: (name: string) => Promise<string>;
  onClose: () => void;
}

export default function CreateKeyModal({
  open,
  onCreate,
  onClose,
}: CreateKeyModalProps) {
  const [form] = Form.useForm<{ name: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plainKey, setPlainKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(values: { name: string }) {
    setLoading(true);
    setError(null);
    try {
      const key = await onCreate(values.name);
      setPlainKey(key);
      form.resetFields();
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(e.response?.data?.error?.message ?? 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (plainKey) {
      navigator.clipboard.writeText(plainKey).catch(() => undefined);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleClose() {
    setPlainKey(null);
    setError(null);
    setCopied(false);
    form.resetFields();
    onClose();
  }

  return (
    <Modal
      title="Create API Key"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={480}
    >
      {plainKey ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Alert
            type="warning"
            showIcon
            message="Copy your API key now — it won't be shown again."
            style={{ borderRadius: 8 }}
          />
          <div
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Typography.Text
              code
              style={{
                fontSize: 13,
                wordBreak: 'break-all',
                flex: 1,
                color: 'var(--text-primary)',
              }}
            >
              {plainKey}
            </Typography.Text>
            <Button
              type="text"
              icon={
                copied ? (
                  <CheckOutlined style={{ color: 'var(--status-success)' }} />
                ) : (
                  <CopyOutlined />
                )
              }
              onClick={handleCopy}
              style={{ flexShrink: 0 }}
            />
          </div>
          <Button
            type="primary"
            block
            onClick={handleClose}
            style={{
              background: 'var(--accent-primary)',
              borderColor: 'var(--accent-primary)',
              color: '#fff',
            }}
          >
            Done
          </Button>
        </div>
      ) : (
        <Form<{ name: string }>
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
        >
          {error && (
            <Alert
              type="error"
              message={error}
              showIcon
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
          )}
          <Form.Item
            name="name"
            label="Key Name"
            rules={[{ required: true, message: 'Please enter a name for this key' }]}
          >
            <Input
              placeholder="e.g. Production, My App, Testing"
              autoFocus
              size="large"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={handleClose}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{
                  background: 'var(--accent-primary)',
                  borderColor: 'var(--accent-primary)',
                  color: '#fff',
                }}
              >
                Create
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
