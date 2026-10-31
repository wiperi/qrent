import TodoProgressBar from '@/components/TodoProgressBar';
import FilteredBlogList from '@/components/FilteredBlogList';
import CategoryFilter from '@/components/CategoryFilter';
import { CategoryProvider } from '@/components/CategoryContext';
import { getGuideIndexEntries, getGuideIndexTopics } from '@/lib/guide-index';
import { jsonLd, pageMetadata, SITE_URL } from '@/lib/seo';
import RentalLinks from '@/components/RentalLinks';
import styles from '@/styles/discovery.module.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata(
    locale,
    '/blog',
    locale === 'zh'
      ? '澳洲留学生租房指南与经验 | QRent'
      : 'Australian Student Rental Guides & Tips | QRent',
    locale === 'zh'
      ? '按主题阅读澳洲租房攻略与经验，搜索预算、选区、申请材料、看房、合同押金、入住与退租清单，并按大学浏览悉尼房源。'
      : 'Search Australian rental guides and experiences by topic: budgets, areas, applications, inspections, leases, bonds, moving in and moving out. Explore Sydney homes by university.'
  );
}

export const revalidate = 600; // Cache for 10 minutes

// 主页面组件（服务器组件）
export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const language = locale === 'zh' ? 'zh' : 'en';
  const entries = getGuideIndexEntries(language);
  const categories = getGuideIndexTopics(entries, language);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{locale === 'zh' ? '租房攻略' : 'Rental guides'}</h1>
      <p className={styles.note}>
        {locale === 'zh'
          ? `${entries.length} 篇攻略与经验，从预算、找房到入住和退租。`
          : `${entries.length} guides and experiences, from budgeting and finding a home to moving in and out.`}
      </p>
      <CategoryProvider>
        <div className={styles.blogLayout}>
          <div>
            <TodoProgressBar />
          </div>
          <div className="min-w-0">
            <CategoryFilter categories={categories} total={entries.length} locale={locale} />
            <FilteredBlogList entries={entries} locale={locale} />
          </div>
        </div>
      </CategoryProvider>
      <RentalLinks locale={locale} compact />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: locale === 'zh' ? '租房攻略' : 'Rental guides',
            url: `${SITE_URL}/${locale}/blog`,
            inLanguage: locale === 'zh' ? 'zh-CN' : 'en-AU',
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: entries.map((entry, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: entry.title,
                url: `${SITE_URL}${entry.path}`,
              })),
            },
          }),
        }}
      />
    </main>
  );
}
