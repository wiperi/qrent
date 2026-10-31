import TodoProgressBar from '@/components/TodoProgressBar';
import FilteredBlogList from '@/components/FilteredBlogList';
import CategoryFilter from '@/components/CategoryFilter';
import { CategoryProvider } from '@/components/CategoryContext';
import { getNotionBlogPosts } from '@/lib/notion-blog';
import { pageMetadata } from '@/lib/seo';
import RentalLinks from '@/components/RentalLinks';
import styles from '@/styles/discovery.module.css';
import Link from 'next/link';
import libraryStyles from '@/styles/rental-library.module.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata(
    locale,
    '/blog',
    locale === 'zh'
      ? '澳洲留学生租房指南与经验 | QRent'
      : 'Australian Student Rental Guides & Tips | QRent',
    locale === 'zh'
      ? '阅读澳洲租房准备、选区、申请、看房与入住的实用经验，并按大学浏览悉尼房源。'
      : 'Read practical guides to preparing, choosing an area, applying, inspecting and moving into an Australian rental. Explore Sydney homes by university.'
  );
}

export const revalidate = 600; // Cache for 10 minutes

// 主页面组件（服务器组件）
export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const posts = await getNotionBlogPosts(locale);

  // 提取所有关键词并去重
  const allKeywords = Array.from(new Set(posts.flatMap(post => post.keywords))).sort();

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{locale === 'zh' ? '租房攻略' : 'Rental guides'}</h1>
      <p className={styles.note}>
        {locale === 'zh'
          ? `${posts.length} 篇实用经验，从选区到入住。`
          : `${posts.length} practical guides, from choosing an area to moving in.`}
      </p>
      <div className={libraryStyles.blogEntry}>
        <Link href={`/${locale}/guides`}>
          {locale === 'zh' ? '按阶段查全流程攻略 →' : 'Browse the rental handbook →'}
        </Link>
        <p>
          {locale === 'zh'
            ? '预算、选区、申请、看房、签约与入住'
            : 'Budget, areas, applications, inspections and moving in'}
        </p>
      </div>
      <CategoryProvider>
        <div className={styles.blogLayout}>
          <div>
            <TodoProgressBar />
          </div>
          <div className="min-w-0">
            <CategoryFilter categories={allKeywords} locale={locale} />
            <FilteredBlogList posts={posts} locale={locale} />
          </div>
        </div>
      </CategoryProvider>
      <RentalLinks locale={locale} compact />
    </main>
  );
}
