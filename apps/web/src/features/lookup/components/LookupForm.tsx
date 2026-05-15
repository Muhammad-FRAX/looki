import { Form, Input, Button, Select } from 'antd';
import { SearchOutlined, PhoneOutlined } from '@ant-design/icons';

interface LookupFormProps {
  loading: boolean;
  onLookup: (number: string, country?: string) => void;
}

const countrySuggestions = [
  { value: 'US', label: 'US (+1)' },
  { value: 'GB', label: 'GB (+44)' },
  { value: 'AU', label: 'AU (+61)' },
  { value: 'DE', label: 'DE (+49)' },
  { value: 'FR', label: 'FR (+33)' },
  { value: 'IN', label: 'IN (+91)' },
  { value: 'BR', label: 'BR (+55)' },
];

export default function LookupForm({ loading, onLookup }: LookupFormProps) {
  const [form] = Form.useForm<{ number: string; country?: string }>();

  function handleFinish(values: { number: string; country?: string }) {
    onLookup(values.number, values.country);
  }

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Form.Item
          name="number"
          label="Phone Number"
          rules={[{ required: true, message: 'Enter a phone number' }]}
          style={{ flex: '1 1 280px', minWidth: 0, marginBottom: 0 }}
        >
          <Input
            size="large"
            prefix={<PhoneOutlined style={{ color: 'var(--text-tertiary)' }} />}
            placeholder="+12125550123"
          />
        </Form.Item>

        <Form.Item
          name="country"
          label="Hint Country (optional)"
          style={{ flex: '0 0 160px', marginBottom: 0 }}
        >
          <Select
            size="large"
            placeholder="Auto"
            allowClear
            options={countrySuggestions}
          />
        </Form.Item>

        <Form.Item label=" " style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            icon={<SearchOutlined />}
            loading={loading}
            style={{ fontWeight: 600 }}
          >
            Look up
          </Button>
        </Form.Item>
      </div>
    </Form>
  );
}
