import { ArrowUpRight, BookOpen, MapPin } from 'lucide-react';
import type { AssistantEvidence } from '@/lib/rental-assistant/contracts';
import styles from '@/styles/rental-tools.module.css';

export default function RentalAssistantSources({
  sources,
  anchor,
  locale,
}: {
  sources: AssistantEvidence[];
  anchor: string;
  locale: 'zh' | 'en';
}) {
  const zh = locale === 'zh';
  const date = new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-AU', {
    timeZone: 'Australia/Sydney',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const number = new Intl.NumberFormat(zh ? 'zh-CN' : 'en-AU');
  return (
    <section
      className={styles.sources}
      aria-label={zh ? '本次查询的来源' : 'Sources for this reply'}
    >
      <h3>{zh ? '查询结果与出处' : 'Results and sources'}</h3>
      {sources.map(source => (
        <div className={styles.source} key={source.id} id={anchor + source.id}>
          <span className={styles.sourceId}>{source.id}</span>
          {source.kind === 'guide' ? (
            <div className={styles.sourceBody}>
              <a className={styles.sourceTitle} href={source.path} target="_blank" rel="noreferrer">
                <BookOpen size={15} aria-hidden="true" />
                {source.heading}
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
              <p>
                {source.article} · {source.publishedAt.slice(0, 10)}
                {source.jurisdictions?.length ? ' · ' + source.jurisdictions.join(' / ') : ''}
              </p>
            </div>
          ) : (
            <div className={styles.sourceBody}>
              <h4 className={styles.sourceTitle}>
                <MapPin size={15} aria-hidden="true" />
                <span className={styles.suburb}>
                  {source.suburb || (zh ? '全部区域' : 'All areas')}
                </span>
                <span className={styles.sourceCampus}>{source.school}</span>
              </h4>
              <p>
                {source.matches === null
                  ? zh
                    ? '匹配数量暂不可用'
                    : 'Match count is unavailable'
                  : zh
                    ? number.format(source.matches) + ' 条 QRent 记录'
                    : number.format(source.matches) + ' QRent records'}
                {source.averageWeeklyRent !== null
                  ? ' · ' +
                    (zh ? '平均 ' : 'Average ') +
                    'A$' +
                    number.format(source.averageWeeklyRent) +
                    (zh ? '/周' : '/wk')
                  : ''}
              </p>
              {!!source.examples.length && (
                <ul className={styles.examples}>
                  {source.examples.map(row => (
                    <li key={row.id}>
                      <a href={row.url} target="_blank" rel="noreferrer">
                        <span>
                          {row.address}
                          <ArrowUpRight size={13} aria-hidden="true" />
                        </span>
                        <small>
                          {row.bedrooms}
                          {zh ? ' 卧' : ' bed'}
                          {row.commuteMinutes !== null
                            ? ' · ' + row.commuteMinutes + (zh ? ' 分钟通勤' : ' min to campus')
                            : ''}
                          {' · ' + date.format(new Date(row.publishedAt))}
                        </small>
                      </a>
                      <strong>
                        {'A$' + number.format(row.weeklyRent)}
                        <small>{zh ? '/周' : '/wk'}</small>
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
