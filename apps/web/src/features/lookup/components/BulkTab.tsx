import { useState } from 'react';
import { Button, Input, Alert, Card, Progress, Tag, Space } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { apiClient } from '../../../api/client.js';

type JobStatus = 'queued' | 'processing' | 'complete' | 'failed';

interface BulkJob {
  id: string;
  status: JobStatus;
  total: number;
  processed: number;
  error_message?: string;
}

const STATUS_COLOR: Record<JobStatus, string> = {
  queued: 'default',
  processing: 'blue',
  complete: 'green',
  failed: 'red',
};

export default function BulkTab() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<BulkJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  async function handleSubmit() {
    if (!lines.length) return;
    setLoading(true);
    setError(null);
    setJob(null);
    try {
      const { data } = await apiClient.post<BulkJob>('/lookup/jobs', {
        numbers: lines,
      });
      setJob(data);
      startPolling(data.id);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message ?? 'Failed to start bulk job');
    } finally {
      setLoading(false);
    }
  }

  function startPolling(jobId: string) {
    const timer = setInterval(async () => {
      try {
        const { data } = await apiClient.get<BulkJob>(`/lookup/jobs/${jobId}`);
        setJob(data);
        if (data.status === 'complete' || data.status === 'failed') {
          clearInterval(timer);
        }
      } catch {
        clearInterval(timer);
      }
    }, 2000);
  }

  const progress =
    job && job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
        Enter one phone number per line (E.164 format recommended). Up to 1,000,000
        numbers processed asynchronously.
      </div>

      <Input.TextArea
        rows={10}
        placeholder={'+12125550123\n+447700900123\n+61211111111'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ borderRadius: 8, fontFamily: 'monospace', resize: 'vertical' }}
      />

      {error && (
        <Alert type="error" message={error} showIcon style={{ borderRadius: 8 }} />
      )}

      <Space>
        <Button
          type="primary"
          icon={<UploadOutlined />}
          loading={loading}
          disabled={!lines.length}
          onClick={handleSubmit}
          style={{
            background: 'var(--accent-primary)',
            borderColor: 'var(--accent-primary)',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          Start Bulk Job
        </Button>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {lines.length.toLocaleString()} numbers entered
        </span>
      </Space>

      {job && (
        <Card
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Job {job.id.slice(0, 8)}&hellip;
            </span>
            <Tag color={STATUS_COLOR[job.status]}>{job.status}</Tag>
          </div>

          <Progress
            percent={progress}
            status={
              job.status === 'failed'
                ? 'exception'
                : job.status === 'complete'
                ? 'success'
                : 'active'
            }
            strokeColor="var(--accent-primary)"
          />

          <div
            style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}
          >
            {job.processed.toLocaleString()} / {job.total.toLocaleString()} processed
          </div>

          {job.status === 'failed' && job.error_message && (
            <Alert
              type="error"
              message={job.error_message}
              showIcon
              style={{ marginTop: 12, borderRadius: 8 }}
            />
          )}

          {job.status === 'complete' && (
            <Button
              type="default"
              icon={<DownloadOutlined />}
              href={`/api/v1/lookup/jobs/${job.id}/result`}
              style={{ marginTop: 12 }}
            >
              Download CSV
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
