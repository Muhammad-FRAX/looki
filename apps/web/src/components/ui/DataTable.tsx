import { Table, Card } from 'antd';
import type { TableProps } from 'antd';

interface DataTableProps<T> extends TableProps<T> {
  title?: string;
  extra?: React.ReactNode;
}

export default function DataTable<T extends object>({ title, extra, ...tableProps }: DataTableProps<T>) {
  const table = (
    <Table<T>
      scroll={{ x: 'max-content' }}
      pagination={{
        showSizeChanger: true,
        showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
        ...tableProps.pagination,
      }}
      {...tableProps}
      style={{ background: 'var(--bg-elevated)', ...tableProps.style }}
    />
  );

  if (!title) return table;

  return (
    <Card
      title={<span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>}
      extra={extra}
      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
      styles={{ body: { padding: 0 } }}
    >
      {table}
    </Card>
  );
}
