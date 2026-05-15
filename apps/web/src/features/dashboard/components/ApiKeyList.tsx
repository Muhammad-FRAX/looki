import { Button, Tag, Popconfirm, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../../components/ui/index.js';
import type { ApiKey } from '../../../api/types.js';

interface ApiKeyListProps {
  data?: ApiKey[];
  loading: boolean;
  onRevoke: (id: string) => void;
}

export default function ApiKeyList({ data = [], loading, onRevoke }: ApiKeyListProps) {
  const columns: ColumnsType<ApiKey> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => (
        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{v}</span>
      ),
    },
    {
      title: 'Prefix',
      dataIndex: 'key_prefix',
      key: 'key_prefix',
      render: (v: string) => (
        <Typography.Text code style={{ fontSize: 12 }}>
          {v}&hellip;
        </Typography.Text>
      ),
    },
    {
      title: 'Tier',
      dataIndex: 'tier',
      key: 'tier',
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'revoked_at',
      key: 'status',
      render: (v: string | null) =>
        v ? <Tag color="red">Revoked</Tag> : <Tag color="green">Active</Tag>,
    },
    {
      title: 'Last Used',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (v: string | null) =>
        v ? (
          dayjs(v).format('MMM D, YYYY HH:mm')
        ) : (
          <span style={{ color: 'var(--text-tertiary)' }}>Never</span>
        ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => dayjs(v).format('MMM D, YYYY'),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: ApiKey) =>
        record.revoked_at ? null : (
          <Popconfirm
            title="Revoke API Key?"
            description="The key will stop working immediately."
            onConfirm={() => onRevoke(record.id)}
            okText="Revoke"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        ),
    },
  ];

  return (
    <DataTable<ApiKey>
      title="API Keys"
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
    />
  );
}
