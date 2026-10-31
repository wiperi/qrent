import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import Breadcrumbs from '@/components/Breadcrumbs';
import MarkdownGuide from '@/components/MarkdownGuide';
import {
  getModuleExperiences,
  officialReferences,
  references,
  rentalGuideModules,
  RENTAL_LIBRARY_PUBLISHED_AT,
} from '@/lib/rental-library';
import { getNotionBlogPosts } from '@/lib/notion-blog';
import { jsonLd, pageMetadata, SITE_IMAGE, SITE_URL } from '@/lib/seo';
import styles from '@/styles/rental-library.module.css';

type Props = { params: Promise<{ locale: string; module: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return rentalGuideModules.map(module => ({ module: module.slug }));
}
export async function generateMetadata({ params }: Props) {
  const { locale, module: slug } = await params;
  const module = rentalGuideModules.find(item => item.slug === slug);
  if (!module) return { title: 'Guide not found | QRent', robots: { index: false } };
  const lang = locale === 'zh' ? 'zh' : 'en';
  return pageMetadata(
    locale,
    `/guides/${slug}`,
    `${module.title[lang]}${lang === 'zh' ? '：澳洲租房攻略' : ': Australian Rental Guide'} | QRent`,
    module.summary[lang]
  );
}

export default async function GuideModulePage({ params }: Props) {
  const { locale: rawLocale, module: slug } = await params;
  const locale = rawLocale === 'zh' ? 'zh' : 'en';
  setRequestLocale(locale);
  const module = rentalGuideModules.find(item => item.slug === slug);
  if (!module) notFound();
  const zh = locale === 'zh';
  const experiences = getModuleExperiences(module.slug);
  const posts = (await getNotionBlogPosts(locale)).filter(post =>
    module.relatedPosts.includes(post.slug)
  );
  const officialIds = new Set(module.sections.flatMap(section => section.officialRefs ?? []));
  const official = officialReferences.filter(item => officialIds.has(item.id));
  const index = rentalGuideModules.indexOf(module);
  return (
    <main className={styles.page}>
      <Breadcrumbs
        locale={locale}
        items={[
          { name: zh ? '首页' : 'Home', path: '' },
          { name: zh ? '租房攻略' : 'Rental guides', path: '/blog' },
          { name: module.title[locale], path: `/guides/${slug}` },
        ]}
      />
      <h1>{module.title[locale]}</h1>
      <p className={styles.lead}>{module.summary[locale]}</p>
      <div className={styles.articleLayout}>
        <nav className={styles.outline} aria-label={zh ? '本页目录' : 'On this page'}>
          <p>{zh ? '本页目录' : 'On this page'}</p>
          {module.sections.map(section => (
            <a key={section.id} href={`#${section.id}`}>
              {section.title[locale]}
            </a>
          ))}
          <a href="#source-notes">{zh ? '资料出处' : 'Sources'}</a>
        </nav>
        <article className={styles.article}>
          {module.sections.map(section => (
            <section className={styles.section} id={section.id} key={section.id}>
              <h2>{section.title[locale]}</h2>
              <MarkdownGuide content={section.body[locale]} />
              {!!section.officialRefs?.length && (
                <p className={styles.citation}>
                  {zh ? '官方核对：' : 'Official references: '}
                  {section.officialRefs.map((id, i) => {
                    const ref = officialReferences.find(item => item.id === id)!;
                    return (
                      <span key={id}>
                        {i > 0 ? ' · ' : ''}
                        <a href={ref.url} target="_blank" rel="noopener noreferrer">
                          {ref.title}
                        </a>
                      </span>
                    );
                  })}
                </p>
              )}
            </section>
          ))}
          <section className={styles.sourceNotes} id="source-notes">
            <h2>{zh ? '资料出处与补充经验' : 'Sources and additional experiences'}</h2>
            <p>
              {references.sources[0].title[locale]}
              {zh
                ? '，按相关章节整理。收藏资料的日期为整理日期，具体帖子保留下列原始日期。'
                : ' supplies the relevant handbook sections. The collection date is its compilation date; original post dates appear below.'}
            </p>
            {experiences.map(item => (
              <div className={styles.experience} key={item.id}>
                <h3>
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {item.title[locale]}
                  </a>
                </h3>
                <p className={styles.sourceMeta}>
                  {item.author} ·{' '}
                  {zh
                    ? item.displayDate
                    : item.displayDate
                        .replace('编辑于', 'Edited ')
                        .replace('（年份未显示）', ' (year not shown)')}
                </p>
                <p>{item.note[locale]}</p>
              </div>
            ))}
            {!!official.length && (
              <>
                <h3>{zh ? '官方规则核对' : 'Official guidance checked'}</h3>
                <p>
                  {zh
                    ? '核对日期：2026-10-31。适用州与住宿类型分别看各页面说明。'
                    : 'Checked on 31 October 2026. Read the jurisdiction and accommodation scope of each page.'}
                </p>
                <ul>
                  {official.map(item => (
                    <li key={item.id}>
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
          {!!posts.length && (
            <section className={styles.related}>
              <h2>{zh ? '相关经验帖' : 'Related experience articles'}</h2>
              {posts.map(post => (
                <Link key={post.id} href={`/${locale}/blog/${post.slug}`}>
                  {locale === 'en' && post.title_en ? post.title_en : post.title}
                </Link>
              ))}
            </section>
          )}
          <nav className={styles.nextPrevious} aria-label={zh ? '攻略章节' : 'Handbook chapters'}>
            {index > 0 ? (
              <Link href={`/${locale}/guides/${rentalGuideModules[index - 1].slug}`}>
                ← {rentalGuideModules[index - 1].title[locale]}
              </Link>
            ) : (
              <Link href={`/${locale}/blog`}>{zh ? '全部攻略' : 'All rental guides'}</Link>
            )}
            {index < rentalGuideModules.length - 1 ? (
              <Link href={`/${locale}/guides/${rentalGuideModules[index + 1].slug}`}>
                {rentalGuideModules[index + 1].title[locale]} →
              </Link>
            ) : (
              <Link href={`/${locale}/rentals`}>
                {zh ? '查看悉尼房源' : 'Explore Sydney rentals'} →
              </Link>
            )}
          </nav>
        </article>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: module.title[locale],
            description: module.summary[locale],
            inLanguage: zh ? 'zh-CN' : 'en-AU',
            datePublished: RENTAL_LIBRARY_PUBLISHED_AT,
            dateModified: RENTAL_LIBRARY_PUBLISHED_AT,
            author: { '@type': 'Organization', name: 'QRent' },
            publisher: { '@type': 'Organization', name: 'QRent' },
            image: SITE_IMAGE,
            mainEntityOfPage: `${SITE_URL}/${locale}/guides/${slug}`,
            citation: [
              ...experiences.map(item => item.sourceUrl),
              ...official.map(item => item.url),
            ],
          }),
        }}
      />
    </main>
  );
}
