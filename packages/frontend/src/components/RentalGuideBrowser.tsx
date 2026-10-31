'use client';

import Link from 'next/link';
import { useState } from 'react';
import { HiArrowRight, HiSearch } from 'react-icons/hi';
import { searchRentalLibrary, type RentalSearchItem } from '@/lib/rental-library-search';
import styles from '@/styles/rental-library.module.css';

type ModuleRow = {
  slug: string;
  title: string;
  summary: string;
  sections: { id: string; title: string }[];
};
export default function RentalGuideBrowser({
  locale,
  modules,
  searchItems,
}: {
  locale: 'zh' | 'en';
  modules: ModuleRow[];
  searchItems: RentalSearchItem[];
}) {
  const [query, setQuery] = useState('');
  const zh = locale === 'zh';
  const hasQuery = query.trim().length > 0;
  const results = searchRentalLibrary(searchItems, query);
  const examples = zh
    ? ['申请要准备什么材料', '代看看房清单', 'NSW 押金', '冷水收费']
    : ['application documents', 'inspection checklist', 'NSW bond', 'water bills'];
  return (
    <>
      <div className={styles.searchBlock}>
        <label htmlFor="guide-search">{zh ? '搜索攻略' : 'Search the guides'}</label>
        <div className={styles.searchInput}>
          <HiSearch aria-hidden="true" />
          <input
            id="guide-search"
            type="search"
            maxLength={160}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Escape') setQuery('');
            }}
            placeholder={zh ? '输入问题或关键词' : 'Enter a question or keyword'}
          />
          {hasQuery && (
            <button type="button" onClick={() => setQuery('')}>
              {zh ? '清除' : 'Clear'}
            </button>
          )}
        </div>
        <div className={styles.examples}>
          {examples.map(example => (
            <button key={example} type="button" onClick={() => setQuery(example)}>
              {example}
            </button>
          ))}
        </div>
      </div>
      {hasQuery && (
        <section
          className={styles.results}
          aria-label={zh ? '攻略搜索结果' : 'Guide search results'}
        >
          <p role="status">
            {zh
              ? `显示 ${results.length} 个相关章节`
              : `Showing ${results.length} matching sections`}
          </p>
          {results.length ? (
            <ul>
              {results.map(item => (
                <li key={item.id}>
                  <Link href={item.path}>
                    <strong>{item.title}</strong>
                    <span>{item.moduleTitle}</span>
                  </Link>
                  <p>{item.excerpt}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {zh
                ? '暂未找到匹配内容，可以换个词，或按下面的租房阶段浏览。'
                : 'No matching section yet. Try another term or browse the stages below.'}
            </p>
          )}
        </section>
      )}
      <ol
        className={styles.moduleList}
        aria-label={zh ? '按租房阶段浏览' : 'Browse by rental stage'}
      >
        {modules.map((module, index) => (
          <li key={module.slug}>
            <Link href={`/${locale}/guides/${module.slug}`} className={styles.moduleTitle}>
              <span className={styles.stageNumber}>{String(index + 1).padStart(2, '0')}</span>
              <h2>{module.title}</h2>
              <HiArrowRight aria-hidden="true" />
            </Link>
            <p>{module.summary}</p>
            <div className={styles.chapterLinks}>
              {module.sections.map(section => (
                <Link key={section.id} href={`/${locale}/guides/${module.slug}#${section.id}`}>
                  {section.title}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
