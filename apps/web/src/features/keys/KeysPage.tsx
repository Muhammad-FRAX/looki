import { useState } from 'react';
import { Button, Tag, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, DataTable } from '../../components/ui';
import { CreateKeyModal } from './components';
import { apiClient } from '../../api/client';
import type { ApiKey, ApiKeyCreateResponse } from '../../api/types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

export default function KeysPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const qc = useQueryClient();

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['keys'],
    queryFn: () => apiClient.get<ApiKey[]>('/me/keys').then(r => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/me/keys/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['keys'] });
      void messageApi.success('API key revoked');
    },
    onError: () => { void messageApi.error('Failed to revoke key'); },
  });

  async function handleCreate(name: string): Promise<string> {
    const { data } = await apiClient.post<ApiKeyCreateResponse>('/me/keys', { name });
    void qc.invalidateQueries({ queryKey: ['keys'] });
    return data.plaintext;
  }

  const columns: ColumnsType<ApiKey> = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: v => <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{v}</span>,
    },
    {
      title: 'Key Prefix',
      dataIndex: 'key_prefix',
      render: v => <code style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v}…</code>,
    },
    {
      title: 'Tier',
      dataIndex: 'tier',
      render: v => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Last Used',
      dataIndex: 'last_used_at',
      render: v => v ? dayjs(v).format('MMM D, YYYY') : <span style={{ color: 'var(--text-tertiary)' }}>Never</span>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      render: v => dayjs(v).format('MMM D, YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'revoked_at',
      render: v => v ? <Tag color="red">Revoked</Tag> : <Tag color="green">Active</Tag>,
    },
    {
      title: '',
      key: 'actions',
      render: (_, record) => (
        record.revoked_at ? null : (
          <Popconfirm
            title="Revoke this API key?"
            description="Existing requests using this key will stop working."
            onConfirm={() => revokeMutation.mutate(record.id)}
            okText="Revoke"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        )
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <PageHeader
        title="API Keys"
        subtitle="Manage your API keys for programmatic access"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            style={{ fontWeight: 600 }}
          >
            New Key
          </Button>
        }
      />

      <DataTable<ApiKey>
        columns={columns}
        dataSource={keys}
        rowKey="id"
        loading={isLoading}
      />

      <CreateKeyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </>
  );
}
