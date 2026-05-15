import { useState, useRef, useEffect } from 'react';
import { Button, Input, Alert, Tag, Progress, Upload, Space, Divider } from 'antd';
import { UploadOutlined, SendOutlined, DownloadOutlined } from '@ant-design/icons';
import { apiClient } from '../../../api/client';
import type { JobResponse } from '../../../api/types';

const { TextArea } = Input;

export default function BulkTab() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [job, setJob] = useState<JobResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => stopPolling(), []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function pollJob(jobId: string) {
    try {
      const { data } = await apiClient.get<JobResponse>(`/lookup/jobs/${jobId}`);
      setJob(data);
      if (data.status === 'complete' || data.status === 'failed') {
        stopPolling();
      }
    } catch {
      stopPolling();
    }
  }

  async function submitBulk(numbers: string[]) {
    if (numbers.length === 0) { setError('Enter at least one number.'); return; }
    if (numbers.length > 1000) {
      // Use async job for large batches
      setError('');
      setLoading(true);
      try {
        const { data } = await apiClient.post<JobResponse>('/lookup/jobs', { numbers });
        setJob(data);
        pollRef.current = setInterval(() => { void pollJob(data.job_id); }, 2000);
      } catch {
        setError('Failed to submit job.');
      } finally {
        setLoading(false);
      }
    } else {
      setError('');
      setLoading(true);
      try {
        const { data } = await apiClient.post<{ results: unknown[] }>('/lookup/bulk', { numbers });
        const blob = new Blob([JSON.stringify(data.results, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bulk-results.json';
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        setError('Bulk lookup failed.');
      } finally {
        setLoading(false);
      }
    }
  }

  function handleTextSubmit() {
    const numbers = text
      .split(/[\n,]/)
      .map(s => s.trim())
      .filter(Boolean);
    void submitBulk(numbers);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
          Paste phone numbers (one per line or comma-separated). Up to 1,000 for sync; larger batches use async job processing.
        </div>
        <TextArea
          rows={6}
          placeholder={'+12125550123\n+442071234567\n+61291234567'}
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ fontFamily: 'monospace', fontSize: 13 }}
        />
      </div>

      <Space wrap>
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={loading}
          onClick={handleTextSubmit}
          style={{ fontWeight: 600 }}
        >
          Submit
        </Button>
        <Upload
          accept=".csv,.txt"
          showUploadList={false}
          beforeUpload={file => {
            const reader = new FileReader();
            reader.onload = e => { setText(String(e.target?.result ?? '')); };
            reader.readAsText(file);
            return false;
          }}
        >
          <Button icon={<UploadOutlined />}>Upload CSV / TXT</Button>
        </Upload>
      </Space>

      {error && <Alert type="error" message={error} showIcon />}

      {job && (
        <div>
          <Divider style={{ borderColor: 'var(--border)' }} />
          <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Job {job.job_id}</span>
            <Tag color={job.status === 'complete' ? 'green' : job.status === 'failed' ? 'red' : 'blue'}>
              {job.status}
            </Tag>
          </div>
          <Progress
            percent={job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0}
            status={job.status === 'failed' ? 'exception' : job.status === 'complete' ? 'success' : 'active'}
          />
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
            {job.processed} / {job.total} processed
          </div>
          {job.status === 'complete' && (
            <Button
              icon={<DownloadOutlined />}
              href={`/api/v1/lookup/jobs/${job.job_id}/result`}
              style={{ marginTop: 12 }}
            >
              Download CSV
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
