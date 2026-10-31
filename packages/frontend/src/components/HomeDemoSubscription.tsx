'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HiOutlineBell, HiX } from 'react-icons/hi';
import { useAuth } from '@/hooks/use-auth';
import { showLoginModal } from '@/lib/auth-events';
import {
  DEMO_DRAFT_KEY,
  demoFilterSummary,
  demoSearchHref,
  readDemoDraft,
  type DemoDraft,
  type DemoFilters,
} from '@/lib/home-demo';
import styles from '@/styles/home-demo.module.css';

export default function HomeDemoSubscription({
  filters,
  locale,
  open,
  onClose,
}: {
  filters: DemoFilters;
  locale: string;
  open: boolean;
  onClose: () => void;
}) {
  const zh = locale === 'zh';
  const { user, isLoading } = useAuth();
  const [draft, setDraft] = useState<DemoDraft | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    try {
      setDraft(readDemoDraft(localStorage.getItem(DEMO_DRAFT_KEY)));
    } catch {
      /* Storage can be unavailable; saving reports that explicitly. */
    }
  }, []);
  function save() {
    const next: DemoDraft = {
      version: 1,
      filters,
      frequency: 'daily',
      durationDays: 30,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(DEMO_DRAFT_KEY, JSON.stringify(next));
      setDraft(next);
      setMessage(
        zh
          ? '已保存到本浏览器，尚未开通邮件提醒。'
          : 'Saved in this browser. Email alerts have not been activated.'
      );
    } catch {
      setMessage(
        zh
          ? '浏览器无法保存，请先保留当前筛选链接。'
          : 'This browser could not save the draft. Keep the current search link instead.'
      );
    }
  }
  if (!open && !draft) return null;
  if (!open && draft)
    return (
      <details className={styles.savedDraftDisclosure}>
        <summary>
          <HiOutlineBell aria-hidden="true" />
          <strong>{zh ? '已保存一份订阅草稿' : 'One alert draft saved'}</strong>
          <span>{zh ? '邮件未启用' : 'Email not activated'}</span>
        </summary>
        <p>{demoFilterSummary(draft.filters, locale).join(' · ')}</p>
        <Link href={demoSearchHref(locale, draft.filters)}>
          {zh ? '按草稿条件查房' : 'Search with this draft'}
        </Link>
        <p>
          {zh
            ? '仅保存在本浏览器；可用上方订阅入口保存新的方案。'
            : 'Saved in this browser only. Use Create an alert above to update the plan.'}
        </p>
      </details>
    );
  return (
    <section className={styles.subscription} aria-labelledby="demo-subscription-title">
      <div className={styles.subscriptionHeading}>
        <HiOutlineBell aria-hidden="true" />
        <div>
          <h2 id="demo-subscription-title">
            {zh ? '按筛选条件订阅每日新房' : 'Daily new rentals for your search'}
          </h2>
          <p>
            {zh
              ? '功能预览 · 当前只保存方案，不发送邮件'
              : 'Feature preview · saves a draft; sends no email'}
          </p>
        </div>
        {open && (
          <button
            type="button"
            onClick={onClose}
            aria-label={zh ? '收起订阅方案' : 'Collapse alert plan'}
          >
            <HiX aria-hidden="true" />
          </button>
        )}
      </div>
      {
        <>
          <p className={styles.conditionLabel}>
            {zh ? '这次订阅的条件' : 'Conditions for this alert'}
          </p>
          <ul className={styles.filterChips}>
            {demoFilterSummary(filters, locale).map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className={styles.subscriptionTerms}>
            <div>
              <strong>{zh ? '每天一封摘要' : 'One daily digest'}</strong>
              <span>
                {zh
                  ? '正式开通后，只汇总符合条件的新房源；相同房源不重复提醒。'
                  : 'Once activated, summarise new matches without repeating the same home.'}
              </span>
            </div>
            <div>
              <strong>{zh ? '每次30天' : '30 days per subscription'}</strong>
              <span>
                {zh
                  ? '正式开通后开始计时，到期自动结束，可修改或取消。'
                  : 'The term starts on activation and ends automatically; edit or cancel it.'}
              </span>
            </div>
            <div>
              <strong>{zh ? '使用已验证的账户邮箱' : 'Use your verified account email'}</strong>
              <span>
                {isLoading
                  ? zh
                    ? '正在读取账户…'
                    : 'Checking your account…'
                  : user
                    ? `${user.email} · ${user.emailVerified ? (zh ? '已验证' : 'verified') : zh ? '还需验证邮箱' : 'verification needed'}`
                    : zh
                      ? '正式订阅需先登录并验证邮箱。'
                      : 'Sign in and verify your email before activation.'}
              </span>
            </div>
          </div>
          <div className={styles.subscriptionActions}>
            <button type="button" className={styles.primaryButton} onClick={save}>
              {draft
                ? zh
                  ? '更新订阅草稿'
                  : 'Update alert draft'
                : zh
                  ? '保存订阅草稿'
                  : 'Save alert draft'}
            </button>
            {!user && !isLoading && (
              <button type="button" className={styles.secondaryButton} onClick={showLoginModal}>
                {zh ? '登录账户' : 'Sign in'}
              </button>
            )}
          </div>
        </>
      }
      <p className={styles.subscriptionNote}>
        {zh
          ? '草稿仅保存在本浏览器，不会关联到账户或扣费。正式邮件推送尚未开通。'
          : 'Drafts stay in this browser, without account sync or charges. Email delivery is not enabled.'}
      </p>
      <p role="status" className={styles.subscriptionStatus}>
        {message}
      </p>
    </section>
  );
}
