import { Tag } from 'antd';
import { DataTable } from '../../../components/ui';
import type { ColumnsType } from 'antd/es/table';
import type { ApiKey } from '../../../api/types';
import dayjs from 'dayjs';

interface ApiKeyListProps {
  data: ApiKey[];
  loading?: boolean;
}

const columns: ColumnsType<ApiKey> = [
  {
    title: 'Name',
    dataIndex: 'name',
    render: v => <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{v}</span>,
  },
  {
    title: 'Prefix',
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
    render: v => v
      ? <Tag color="red">Revoked</Tag>
      : <Tag color="green">Active</Tag>,
  },
];

export default function ApiKeyList({ data, loading }: ApiKeyListProps) {
  return (
    <DataTable<ApiKey>
      title="API Keys"
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 5, showSizeChanger: false }}
    />
  );
}
