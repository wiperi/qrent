'use client';

import { useId } from 'react';
import { HiSearch } from 'react-icons/hi';
import { useCategory } from '@/components/CategoryContext';
import styles from '@/styles/blog-browser.module.css';

export default function CategoryFilter({
  categories,
  locale,
  total,
}: {
  categories: { name: string; count: number }[];
  locale: string;
  total: number;
}) {
  const { query, setQuery, selectedCategories, setSelectedCategories } = useCategory();
  const id = useId();
  const zh = locale === 'zh';
  const topics = [{ name: '', count: total }, ...categories];
  return (
    <div className={styles.controls}>
      <div className={styles.search}>
        <label htmlFor={id}>{zh ? '搜索攻略' : 'Search the guides'}</label>
        <div className={styles.searchField}>
          <HiSearch aria-hidden="true" />
          <input
            id={id}
            type="search"
            value={query}
            maxLength={160}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Escape') setQuery('');
            }}
            placeholder={zh ? '搜索标题、摘要或主题' : 'Search titles, summaries or topics'}
            aria-controls="blog-results"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')}>
              {zh ? '清除' : 'Clear'}
            </button>
          )}
        </div>
      </div>
      <fieldset className={styles.topics}>
        <legend>{zh ? '按主题浏览' : 'Browse by topic'}</legend>
        <div className={styles.topicList}>
          {topics.map(topic => (
            <button
              key={topic.name}
              type="button"
              aria-pressed={
                topic.name
                  ? selectedCategories.includes(topic.name)
                  : selectedCategories.length === 0
              }
              aria-controls="blog-results"
              onClick={() => setSelectedCategories(topic.name ? [topic.name] : [])}
              className={styles.topic}
            >
              {topic.name || (zh ? '全部主题' : 'All topics')}
              <span className={styles.count}>{topic.count}</span>
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
