'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HiArrowRight, HiOutlineBell, HiRefresh, HiSearch } from 'react-icons/hi';
import { useTRPCClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { RENTAL_SCHOOLS, areaName } from '@/lib/rental-schools';
import { validPreviewRow } from '@/lib/rental-preview';
import {
  demoFilters,
  demoFilterError,
  demoErrorMessage,
  demoFilterSummary,
  demoParams,
  demoSearchHref,
  demoSearchInput,
  sydneyDateTime,
  type DemoFilters,
} from '@/lib/home-demo';
import HomeDemoPropertyCard from './HomeDemoPropertyCard';
import HomeDemoSubscription from './HomeDemoSubscription';
import styles from '@/styles/home-demo.module.css';

export default function HomeDemoListings() {
  const locale = useLocale();
  const zh = locale === 'zh';
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const applied = useMemo(() => demoFilters(params), [params]);
  const [form, setForm] = useState(applied);
  const [formError, setFormError] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subscriptionFilters, setSubscriptionFilters] = useState(applied);
  useEffect(() => {
    setForm(applied);
    setSubscriptionFilters(applied);
    setFormError(false);
  }, [applied]);
  const set = (key: keyof DemoFilters, value: string) => setForm(old => ({ ...old, [key]: value }));
  const invalid = !!demoFilterError(applied);
  const input = useMemo(() => (invalid ? null : demoSearchInput(applied)), [applied, invalid]);
  const client = useTRPCClient();
  const { user, isLoading } = useAuth();
  const { data, isPending, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['properties.search', 'home-demo', input, user?.id, locale],
    queryFn: () => client.properties.search.query(input!),
    enabled: !isLoading && !!input,
    staleTime: 300000,
    retry: 1,
  });
  const rows =
    data?.properties.filter(row =>
      validPreviewRow({
        id: row.id,
        address: row.address,
        region: row.region ?? '',
        price: row.price,
        url: row.url,
      })
    ) ?? [];
  const latest = rows
    .map(row => Date.parse(row.publishedAt))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  const school = RENTAL_SCHOOLS.find(item => item.code === applied.university);
  const formSchool = RENTAL_SCHOOLS.find(item => item.code === form.university);
  const bedrooms =
    form.bedroomsMin === form.bedroomsMax || (!form.bedroomsMax && Number(form.bedroomsMin) >= 5)
      ? form.bedroomsMin
      : !form.bedroomsMin && !form.bedroomsMax
        ? ''
        : 'range';
  const reset = () => {
    const next = demoFilters(new URLSearchParams());
    setForm(next);
    setFormError(false);
    router.replace(pathname, { scroll: false });
  };
  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demoFilterError(form)) {
      setFormError(true);
      return;
    }
    setFormError(false);
    const alerts =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'subscription';
    if (alerts) {
      setSubscriptionFilters({ ...form });
      setSubscriptionOpen(true);
    }
    const next = demoParams(form);
    if (next.toString() !== demoParams(applied).toString())
      router.replace(`${pathname}?${next}`, { scroll: false });
    else if (!alerts) void refetch();
  }
  const numericField = (key: keyof DemoFilters, label: string, max = 1000000) => (
    <label className={styles.field} key={key}>
      <span>{label}</span>
      <input
        name={key}
        type="number"
        min="0"
        max={max}
        step={key === 'rating' ? '0.1' : '1'}
        value={form[key]}
        placeholder={zh ? '不限' : 'Any'}
        onChange={e => set(key, e.target.value)}
      />
    </label>
  );

  return (
    <section className={styles.listings} aria-labelledby="demo-listings-heading">
      <form
        className={styles.filterForm}
        onSubmit={apply}
        aria-label={zh ? '筛选悉尼房源' : 'Filter Sydney rentals'}
      >
        <div className={styles.primaryFilters}>
          <label className={styles.field}>
            <span>{zh ? '目标学校' : 'University'}</span>
            <select
              name="university"
              value={form.university}
              onChange={e => setForm(old => ({ ...old, university: e.target.value, areas: '' }))}
            >
              {RENTAL_SCHOOLS.map(item => (
                <option key={item.code} value={item.code}>
                  {item.code}
                </option>
              ))}
            </select>
          </label>
          {numericField('priceMax', zh ? '最高周租（AUD）' : 'Max rent (AUD/week)')}
          {numericField('commuteMax', zh ? '最长通勤（分钟）' : 'Max commute (min)', 1440)}
          <label className={styles.field}>
            <span>{zh ? '卧室数量' : 'Bedrooms'}</span>
            <select
              name="bedrooms"
              value={bedrooms}
              onChange={e =>
                setForm(old => ({
                  ...old,
                  bedroomsMin: e.target.value,
                  bedroomsMax: e.target.value && Number(e.target.value) < 5 ? e.target.value : '',
                }))
              }
            >
              <option value="">{zh ? '不限' : 'Any'}</option>
              {[1, 2, 3, 4, 5].map(n => (
                <option value={n} key={n}>
                  {n}
                  {n === 5 ? '+' : ''}
                  {zh ? '卧' : ' bed'}
                </option>
              ))}
              {bedrooms === 'range' && (
                <option value="range">{zh ? '自定义范围' : 'Custom range'}</option>
              )}
            </select>
          </label>
          <button className={styles.primaryButton} type="submit" value="search">
            <HiSearch aria-hidden="true" />
            {zh ? '查找房源' : 'Find rentals'}
          </button>
          <button
            className={styles.secondaryButton}
            type="submit"
            value="subscription"
            aria-expanded={subscriptionOpen}
            aria-controls="demo-alert-region"
          >
            <HiOutlineBell aria-hidden="true" />
            {zh ? '订阅此筛选' : 'Create an alert'}
          </button>
        </div>
        <details className={styles.moreFilters}>
          <summary>
            {zh
              ? '更多条件：房型、区域、入住日期与评分'
              : 'More filters: type, areas, move-in date and score'}
          </summary>
          <div className={styles.additionalFilters}>
            <label className={styles.field}>
              <span>{zh ? '房屋类型' : 'Property type'}</span>
              <select
                name="propertyType"
                value={form.propertyType}
                onChange={e => set('propertyType', e.target.value)}
              >
                <option value="">{zh ? '不限' : 'Any'}</option>
                <option value="2">{zh ? '公寓' : 'Apartment'}</option>
                <option value="1">{zh ? '独栋' : 'House'}</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>{zh ? '希望入住日期' : 'Available by'}</span>
              <input
                type="date"
                name="moveInDate"
                value={form.moveInDate}
                onChange={e => set('moveInDate', e.target.value)}
              />
            </label>
            {numericField('priceMin', zh ? '最低周租（AUD）' : 'Min rent (AUD/week)')}
            {numericField('rating', zh ? '最低AI评分（满分20）' : 'Min AI score (out of 20)', 20)}
            {numericField('bedroomsMin', zh ? '最少卧室' : 'Min bedrooms', 255)}
            {numericField('bedroomsMax', zh ? '最多卧室' : 'Max bedrooms', 255)}
            {numericField('bathroomsMin', zh ? '最少浴室' : 'Min bathrooms', 255)}
            {numericField('bathroomsMax', zh ? '最多浴室' : 'Max bathrooms', 255)}
            {numericField('commuteMin', zh ? '最短通勤（分钟）' : 'Min commute (min)', 1440)}
          </div>
          <fieldset className={styles.areaOptions}>
            <legend>
              {zh ? '关注区域（不选则不限）' : 'Preferred areas (leave empty for any)'}
            </legend>
            {(formSchool?.areas ?? []).map(area => (
              <label key={area}>
                <input
                  type="checkbox"
                  checked={form.areas.split(',').includes(area)}
                  onChange={e =>
                    set(
                      'areas',
                      e.target.checked
                        ? [...new Set([...form.areas.split(',').filter(Boolean), area])].join(',')
                        : form.areas
                            .split(',')
                            .filter(a => a !== area)
                            .join(',')
                    )
                  }
                />
                {areaName(area)}
              </label>
            ))}
          </fieldset>
        </details>
        {(formError || invalid) && (
          <p className={styles.formError} role="alert">
            {demoErrorMessage(demoFilterError(formError ? form : applied), locale)}
          </p>
        )}
      </form>
      <div id="demo-alert-region">
        <HomeDemoSubscription
          filters={subscriptionFilters}
          locale={locale}
          open={subscriptionOpen && !invalid}
          onClose={() => setSubscriptionOpen(false)}
        />
      </div>
      <div className={styles.currentFilters}>
        <span>{zh ? '当前筛选' : 'Applied filters'}</span>
        {!invalid && (
          <ul className={styles.filterChips}>
            {demoFilterSummary(applied, locale).map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        <button type="button" onClick={reset}>
          {zh ? '重置' : 'Reset'}
        </button>
      </div>
      <div className={styles.sectionHeading}>
        <div>
          <h2 id="demo-listings-heading">
            {zh ? '每日更新的悉尼房源' : 'Sydney rentals, updated daily'}
          </h2>
          <p className={styles.resultsSummary}>
            {school ? `${school.code} · ${school.campus}` : ''}
            {data && !invalid
              ? zh
                ? ` · 匹配 ${data.filteredCount.toLocaleString()} 条，本页预览 ${rows.length} 条`
                : ` · ${data.filteredCount.toLocaleString()} matches, showing ${rows.length}`
              : ''}
          </p>
        </div>
        {!invalid && (
          <Link href={demoSearchHref(locale, applied)}>
            {zh ? '查看完整结果' : 'All matching rentals'}
            <HiArrowRight aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className={styles.dataStatus}>
        {data && !invalid && (
          <p>
            {zh ? '本页最新房源日期：' : 'Newest record on this page: '}
            {sydneyDateTime(latest, locale) ?? (zh ? '未提供' : 'not provided')}
            <span>
              {' '}
              · {zh ? '本页读取：' : 'Read at: '}
              {sydneyDateTime(dataUpdatedAt, locale)}
              {zh ? '（悉尼时间）' : ' (Sydney time)'}
            </span>
          </p>
        )}
        <details>
          <summary>
            {zh ? '日期、评分和可入住状态说明' : 'About dates, scores and availability'}
          </summary>
          <p>
            {zh
              ? '悉尼三校既有选区的两平台房源每日采集、逐批入库。房源日期沿用网站现有记录时间，可能来自平台日期或收录时间，不能当作源站首次发布时间或本轮爬取完成时间。读取时间只表示本页何时取得数据。历史库存未全部重新核验。'
              : 'Both platforms are collected daily in the established areas for three Sydney universities. Record dates retain the existing website date, which may be a source date or ingestion fallback. They do not establish first publication or completion of a crawl. Read time only timestamps this page’s query. Older inventory is not all freshly verified.'}
          </p>
          <p>
            {zh
              ? 'AI评分满分20，基于房源描述，供比较参考。可入住日期是广告提供的日期；日期已到不代表仍可承租，请核对源站及中介。收藏保存单套房，筛选订阅用于未来的新房摘要。'
              : 'AI scores are out of 20 and based on the description. An advertised available date does not confirm the home is still offered; check the source and agent. Favorites save individual homes; search alerts are for future new-listing digests.'}
          </p>
        </details>
      </div>
      <div className={styles.resultToolbar}>
        <label>
          {zh ? '排序' : 'Sort'}
          <select
            value={applied.sort}
            disabled={invalid}
            onChange={e => {
              const next = { ...applied, sort: e.target.value };
              router.replace(`${pathname}?${demoParams(next)}`, { scroll: false });
            }}
          >
            <option value="recent">{zh ? '房源日期最新' : 'Newest record date'}</option>
            <option value="score">{zh ? 'AI评分最高' : 'Highest AI score'}</option>
            <option value="price">{zh ? '周租最低' : 'Lowest weekly rent'}</option>
          </select>
        </label>
        <button type="button" onClick={() => void refetch()} disabled={isFetching || invalid}>
          <HiRefresh aria-hidden="true" />
          {isFetching ? (zh ? '读取中…' : 'Refreshing…') : zh ? '刷新房源' : 'Refresh listings'}
        </button>
      </div>
      <div aria-live="polite" aria-busy={!invalid && isPending}>
        {invalid ? (
          <div className={styles.empty}>
            <p>{zh ? '修正筛选条件后即可查看房源。' : 'Correct the filters to load rentals.'}</p>
            <button type="button" onClick={reset}>
              {zh ? '重置筛选' : 'Reset filters'}
            </button>
          </div>
        ) : isPending ? (
          <div className={styles.cardGrid} aria-label={zh ? '房源加载中' : 'Loading rentals'}>
            {Array.from({ length: 6 }, (_, i) => (
              <div className={styles.skeletonCard} key={i}>
                <div />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className={styles.empty}>
            <p>
              {zh
                ? '暂时无法读取房源，已保留你的筛选条件。'
                : 'We could not load rentals. Your filters are still here.'}
            </p>
            <button type="button" onClick={() => void refetch()}>
              {zh ? '重新加载' : 'Try again'}
            </button>
          </div>
        ) : !rows.length ? (
          <div className={styles.empty}>
            <p>
              {zh
                ? '暂无可展示的匹配房源，可以放宽预算、区域或入住日期。'
                : 'No matching listings can be shown. Try a wider budget, area or available date.'}
            </p>
            <button type="button" onClick={reset}>
              {zh ? '清除筛选再看看' : 'Clear filters'}
            </button>
          </div>
        ) : (
          <div className={styles.cardGrid}>
            {rows.map(row => (
              <HomeDemoPropertyCard
                key={`${user?.id ?? 'guest'}:${row.id}`}
                row={row}
                locale={locale}
                school={applied.university}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
