import { useState } from 'react';
import { Button, Tag, Popconfirm, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader, DataTable } from '../../components/ui/index.js';
import { CreateKeyModal } from './components/index.js';
import { useApiKeys, useCreateKey, useRevokeKey } from '../dashboard/hooks/useDashboard.js';
import type { ApiKey } from '../../api/types.js';

export default function KeysPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: keys, isLoading } = useApiKeys();
  const { mutateAsync: createKey } = useCreateKey();
  const { mutate: revokeKey } = useRevokeKey();

  async function handleCreate(name: string): Promise<string> {
    const result = await createKey(name);
    return result.plaintext;
  }

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
      title: 'Key Prefix',
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
            title="Revoke this API key?"
            description="The key will stop working immediately and cannot be restored."
            onConfirm={() => revokeKey(record.id)}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="API Keys"
        subtitle="Create and manage API keys for programmatic access"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            style={{
              background: 'var(--accent-primary)',
              borderColor: 'var(--accent-primary)',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            Create Key
          </Button>
        }
      />

      <DataTable<ApiKey>
        columns={columns}
        dataSource={keys ?? []}
        rowKey="id"
        loading={isLoading}
      />

      <CreateKeyModal
        open={modalOpen}
        onCreate={handleCreate}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
