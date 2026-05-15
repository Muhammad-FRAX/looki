import { Tag } from 'antd';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../../components/ui/index.js';
import type { AdminUser } from '../../../api/types.js';

interface UsersTableProps {
  data?: AdminUser[] | undefined;
  total?: number | undefined;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
}

export default function UsersTable({
  data = [],
  total = 0,
  loading,
  page,
  pageSize,
  onPageChange,
}: UsersTableProps) {
  const columns: ColumnsType<AdminUser> = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (v: string) => (
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (v: string) => (
        <Tag color={v === 'admin' ? 'gold' : 'blue'}>{v}</Tag>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => dayjs(v).format('MMM D, YYYY'),
    },
  ];

  return (
    <DataTable<AdminUser>
      title="Users"
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (t) => `${t} users`,
        onChange: onPageChange,
      }}
    />
  );
}
