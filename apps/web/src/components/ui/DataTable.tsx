import { Table } from 'antd';
import type { TableProps } from 'antd';

type DataTableProps<T> = TableProps<T> & {
  title?: string;
};

export default function DataTable<T extends object>({ title, ...props }: DataTableProps<T>) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {title && (
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </div>
      )}
      <Table<T>
        scroll={{ x: 'max-content' }}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `${total} records`,
        }}
        {...props}
      />
    </div>
  );
}
