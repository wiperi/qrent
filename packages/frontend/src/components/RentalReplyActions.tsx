'use client';

import { useState } from 'react';
import { Copy, Flag } from 'lucide-react';
import type { ChatReply } from '@/lib/rental-assistant/contracts';
import styles from '@/styles/rental-tools.module.css';

export default function RentalReplyActions({ reply, zh }: { reply: ChatReply; zh: boolean }) {
  const [copied, setCopied] = useState(false);
  const [report, setReport] = useState<'idle' | 'pending' | 'reported'>('idle');
  const [notice, setNotice] = useState('');

  async function copy() {
    try {
      await navigator.clipboard.writeText(reply.answer);
      setCopied(true);
      setNotice('');
    } catch {
      setNotice(zh ? '复制失败，请选中回答文字后复制。' : 'Select the answer text to copy it.');
    }
  }

  async function flag() {
    setReport('pending');
    setNotice('');
    try {
      const response = await fetch('/api/rental-assistant/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: reply.reviewId }),
        signal: AbortSignal.timeout(5000),
      });
      if (response.status !== 204) throw new Error('Feedback not saved');
      setReport('reported');
    } catch {
      setReport('idle');
      setNotice(zh ? '反馈未保存，请稍后再试。' : 'Feedback could not be saved. Try again later.');
    }
  }

  return (
    <div className={styles.replyActions}>
      {reply.answer && (
        <button type="button" onClick={() => void copy()}>
          <Copy size={14} aria-hidden="true" />
          {copied ? (zh ? '已复制' : 'Copied') : zh ? '复制回答' : 'Copy answer'}
        </button>
      )}
      {reply.reviewId && (
        <button type="button" onClick={() => void flag()} disabled={report !== 'idle'}>
          <Flag size={14} aria-hidden="true" />
          {report === 'reported'
            ? zh
              ? '已记录反馈'
              : 'Reported'
            : zh
              ? '答错了'
              : 'Report an issue'}
        </button>
      )}
      <span role="status">{notice}</span>
    </div>
  );
}
