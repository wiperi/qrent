'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FaBath, FaBed, FaCar, FaRegStar, FaStar } from 'react-icons/fa';
import { HiExternalLink, HiPhotograph } from 'react-icons/hi';
import { useAuth } from '@/hooks/use-auth';
import { showLoginModal } from '@/lib/auth-events';
import { readAuthToken } from '@/lib/auth-storage';
import { availabilityLabel, displayRentalAddress, sydneyDateTime } from '@/lib/home-demo';
import { displayKeywords } from '@/lib/property-keywords';
import { useTRPCClient } from '@/lib/trpc';
import styles from '@/styles/home-demo.module.css';

export type DemoProperty = {
  id: number;
  price: number;
  address: string;
  region: string | null;
  url: string;
  bedroomCount: number;
  bathroomCount: number;
  parkingCount: number;
  propertyType: number;
  averageScore: number;
  availableDate: string | null;
  publishedAt: string;
  thumbnailUrl: string;
  availableArea: string;
  commuteTime: number | null;
  subscribed: boolean;
  keywords: string;
  description?: string | null;
};

export default function HomeDemoPropertyCard({
  row,
  locale,
  school,
}: {
  row: DemoProperty;
  locale: string;
  school: string;
}) {
  const zh = locale === 'zh';
  const { user, token, isLoading, hasSessionError, refreshUser } = useAuth();
  const client = useTRPCClient();
  const queries = useQueryClient();
  const [photoFailed, setPhotoFailed] = useState(false);
  const [override, setOverride] = useState<{ session: string | null; value: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const request = useRef<AbortController | null>(null);
  const [message, setMessage] = useState('');
  const favorited = override?.session === token ? override.value : row.subscribed;
  useEffect(() => setOverride(null), [row.subscribed]);
  useEffect(() => () => request.current?.abort(), []);

  async function toggleFavorite() {
    if (isLoading || busy.current) return;
    if (hasSessionError) {
      void refreshUser();
      return;
    }
    const session = readAuthToken();
    if (!user || !session) {
      showLoginModal();
      return;
    }
    if (session !== token) {
      setMessage(
        zh
          ? '账户状态正在同步，请稍后重试。'
          : 'Your account is updating. Please try again shortly.'
      );
      return;
    }
    busy.current = true;
    setPending(true);
    setMessage('');
    const value = !favorited;
    setOverride({ session, value });
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      await (value
        ? client.properties.subscribe.mutate({ propertyId: row.id }, { signal: controller.signal })
        : client.properties.unsubscribe.mutate(
            { propertyId: row.id },
            { signal: controller.signal }
          ));
      if (readAuthToken() !== session) return;
      setMessage(
        zh
          ? value
            ? '已加入我的收藏'
            : '已取消收藏'
          : value
            ? 'Saved to Favorites'
            : 'Removed from Favorites'
      );
    } catch {
      if (readAuthToken() !== session) return;
      setOverride(null);
      setMessage(
        zh
          ? '收藏操作未确认，请刷新核对后再试。'
          : 'The favorite change was not confirmed. Refresh to check before trying again.'
      );
    } finally {
      clearTimeout(timeout);
      busy.current = false;
      setPending(false);
      if (readAuthToken() === session) {
        void queries.invalidateQueries({ queryKey: ['properties.search'] });
        void queries.invalidateQueries({ queryKey: ['properties.subscriptions'] });
        void queries.invalidateQueries({ queryKey: ['properties'] });
      }
    }
  }

  const address = displayRentalAddress(row.address);
  const source = new URL(row.url).hostname.includes('realestate') ? 'Real Estate' : 'Domain';
  const availability = availabilityLabel(row.availableDate, locale);
  const score =
    Number.isFinite(row.averageScore) && row.averageScore > 0 && row.averageScore <= 20
      ? row.averageScore
      : null;
  const keywords = displayKeywords(locale, row.keywords, row.description ?? '').slice(0, 3);
  const type =
    row.propertyType === 1
      ? zh
        ? '独栋'
        : 'House'
      : row.propertyType === 2
        ? zh
          ? '公寓'
          : 'Apartment'
        : zh
          ? '房型待确认'
          : 'Type unconfirmed';
  const roomType =
    row.availableArea === 'entire_home'
      ? zh
        ? '整租'
        : 'Entire home'
      : row.availableArea === 'private_room'
        ? zh
          ? '独立房间'
          : 'Private room'
        : row.availableArea === 'shared_room'
          ? zh
            ? '合住房间'
            : 'Shared room'
          : null;
  const date = sydneyDateTime(row.publishedAt, locale);
  return (
    <article className={styles.card} aria-label={`${address}, ${row.region}`}>
      <div className={styles.cardPhoto}>
        <a
          href={row.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${zh ? '查看源站房源' : 'View source listing'}: ${address}`}
        >
          {row.thumbnailUrl && !photoFailed ? (
            <Image
              src={row.thumbnailUrl}
              alt={`${address}, ${row.region}`}
              fill
              sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1150px) 46vw, (max-width: 1279px) 30vw, 390px"
              className={styles.propertyPhoto}
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <span className={styles.photoFallback}>
              <HiPhotograph aria-hidden="true" />
              {zh ? '图片暂不可用' : 'Photo unavailable'}
            </span>
          )}
        </a>
        <span className={styles.sourceBadge}>{source}</span>
        <button
          type="button"
          className={styles.favoriteButton}
          onClick={() => void toggleFavorite()}
          disabled={isLoading || pending}
          aria-pressed={favorited}
          aria-label={`${zh ? (favorited ? '取消收藏' : '收藏') : favorited ? 'Remove favorite' : 'Save favorite'}: ${address}`}
          title={
            zh
              ? '保存到我的收藏；每日提醒请使用筛选旁的订阅入口'
              : 'Save to Favorites. Daily alerts use the filter subscription entry.'
          }
        >
          {favorited ? <FaStar aria-hidden="true" /> : <FaRegStar aria-hidden="true" />}
        </button>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.priceRow}>
          <p>
            <strong>${row.price.toLocaleString('en-AU')}</strong>
            <span>{zh ? ' / 周' : ' / week'}</span>
          </p>
          <span
            className={styles.score}
            aria-label={
              zh
                ? `AI评分 ${score ?? '待补充'}，满分20`
                : `AI score ${score ?? 'unavailable'} out of 20`
            }
          >
            {score != null ? `AI ${score.toFixed(1)}` : zh ? '评分待补充' : 'Not rated'}
            <small>{score != null ? '/20' : ''}</small>
          </span>
        </div>
        <h3>
          <a href={row.url} target="_blank" rel="noopener noreferrer">
            {address}
          </a>
        </h3>
        <p className={styles.region}>{displayRentalAddress(row.region ?? '')}</p>
        <div className={styles.propertyFacts}>
          <span>
            {type}
            {roomType ? ` · ${roomType}` : ''}
          </span>
          <span>
            <FaBed aria-hidden="true" />
            {row.bedroomCount === 0 ? 'Studio' : `${row.bedroomCount}${zh ? '卧' : ' bed'}`}
          </span>
          <span>
            <FaBath aria-hidden="true" />
            {row.bathroomCount}
            {zh ? '浴' : ' bath'}
          </span>
          <span>
            <FaCar aria-hidden="true" />
            {row.parkingCount}
            {zh ? '车位' : ' parking'}
          </span>
        </div>
        <p className={styles.availability} data-available={availability.available}>
          {availability.label}
        </p>
        <p className={styles.commute}>
          {row.commuteTime != null && row.commuteTime > 0 && Number.isFinite(row.commuteTime)
            ? zh
              ? `公共交通约 ${row.commuteTime} 分钟到 ${school}`
              : `About ${row.commuteTime} min by transit to ${school}`
            : zh
              ? '公共交通时间待确认'
              : 'Transit time unconfirmed'}
        </p>
        {keywords.length > 0 && (
          <ul className={styles.keywords} aria-label={zh ? '房源特点' : 'Listing highlights'}>
            {keywords.map(word => (
              <li key={word}>{word}</li>
            ))}
          </ul>
        )}
        <div className={styles.cardFooter}>
          <p>
            {zh ? '房源日期' : 'Record date'}
            <time dateTime={date ? row.publishedAt : undefined}>
              {date ?? (zh ? '未提供' : 'Not provided')}
            </time>
            <span>{zh ? '悉尼时间' : 'Sydney time'}</span>
          </p>
          <a href={row.url} target="_blank" rel="noopener noreferrer">
            {zh ? '源站详情' : 'Source details'}
            <HiExternalLink aria-hidden="true" />
          </a>
        </div>
        <p className={styles.favoriteMessage} role="status">
          {message}
        </p>
      </div>
    </article>
  );
}
