import { Tag, Select, Popconfirm, Button, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '../../../components/ui';
import { apiClient } from '../../../api/client';
import type { AdminUser } from '../../../api/types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

interface UsersTableProps {
  data: AdminUser[];
  loading: boolean;
}

export default function UsersTable({ data, loading }: UsersTableProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const qc = useQueryClient();

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiClient.patch(`/admin/users/${id}`, { role }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
      void messageApi.success('Role updated');
    },
    onError: () => { void messageApi.error('Failed to update role'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/users/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
      void messageApi.success('User deleted');
    },
    onError: () => { void messageApi.error('Failed to delete user'); },
  });

  const columns: ColumnsType<AdminUser> = [
    {
      title: 'Email',
      dataIndex: 'email',
      sorter: (a, b) => a.email.localeCompare(b.email),
      render: v => <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      render: (v, record) => (
        <Select
          value={v}
          size="small"
          style={{ width: 100 }}
          onChange={role => roleMutation.mutate({ id: record.id, role })}
          options={[
            { value: 'user', label: <Tag color="cyan">user</Tag> },
            { value: 'admin', label: <Tag color="gold">admin</Tag> },
          ]}
        />
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'created_at',
      sorter: (a, b) => a.created_at.localeCompare(b.created_at),
      render: v => dayjs(v).format('MMM D, YYYY'),
    },
    {
      title: '',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm
          title="Delete this user?"
          description="This action cannot be undone."
          onConfirm={() => deleteMutation.mutate(record.id)}
          okText="Delete"
          okButtonProps={{ danger: true }}
          cancelText="Cancel"
        >
          <Button danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <DataTable<AdminUser>
        title="Users"
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
      />
    </>
  );
}
