import { Modal, Form, Input, Alert, Button, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useState } from 'react';

interface CreateKeyModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<string>;
}

const { Text } = Typography;

export default function CreateKeyModal({ open, onClose, onCreate }: CreateKeyModalProps) {
  const [form] = Form.useForm<{ name: string }>();
  const [loading, setLoading] = useState(false);
  const [plaintext, setPlaintext] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleFinish(values: { name: string }) {
    setLoading(true);
    try {
      const key = await onCreate(values.name);
      setPlaintext(key);
      form.resetFields();
    } catch {
      // error handled by parent
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setPlaintext('');
    setCopied(false);
    form.resetFields();
    onClose();
  }

  function copy() {
    void navigator.clipboard.writeText(plaintext);
    setCopied(true);
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title="Create API Key"
      footer={plaintext ? (
        <Button onClick={handleClose} type="primary">Done</Button>
      ) : null}
    >
      {plaintext ? (
        <div>
          <Alert
            type="warning"
            message="Copy your API key now — it won't be shown again."
            showIcon
            style={{ marginBottom: 16 }}
          />
          <div
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text code style={{ flex: 1, wordBreak: 'break-all', fontSize: 13 }}>
              {plaintext}
            </Text>
            <Button
              icon={<CopyOutlined />}
              size="small"
              onClick={copy}
              type={copied ? 'primary' : 'default'}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      ) : (
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item
            name="name"
            label="Key Name"
            rules={[{ required: true, message: 'Give this key a name' }]}
          >
            <Input placeholder="e.g. Production, Development" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={handleClose} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>Create</Button>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
