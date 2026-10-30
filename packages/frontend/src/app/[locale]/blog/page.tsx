import Link from 'next/link';
import BlogPostCard from '@/components/BlogPostCard';
import TodoProgressBar from '@/components/TodoProgressBar';
import FilteredBlogList from '@/components/FilteredBlogList';
import CategoryFilter from '@/components/CategoryFilter';
import { CategoryProvider } from '@/components/CategoryContext';
import { getNotionBlogPosts } from '@/lib/notion-blog';
import { LOCALE } from '@qrent/shared/enum';
import { pageMetadata } from '@/lib/seo';
import RentalLinks from '@/components/RentalLinks';
import styles from '@/styles/discovery.module.css';

const BLOG_IMAGE_URLS = ['/banner.jpg', '/qrent.jpg'];

function getImageForSlug(slug: string): string {
  const index =
    slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % BLOG_IMAGE_URLS.length;
  return BLOG_IMAGE_URLS[index];
}

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
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className={styles.page}>
        <CategoryProvider>
          <div className="">
            <h1 className={styles.title}>{locale === LOCALE.ZH ? 'Qrent 经验贴' : 'Qrent Blog'}</h1>
            <p className={styles.lead}>
              {locale === LOCALE.ZH
                ? '每一篇经验贴，都是从困惑到安心的故事'
                : 'Every experience post is a story from confusion to peace of mind'}
            </p>
            <div className="flex flex-col md:flex-row flex-wrap gap-10 py-6">
              {/* 引入待办进度条组件，这个空div不能删否则会导致折叠时边框高度错误 */}
              <div>
                <TodoProgressBar />
              </div>

              {/* 使用过滤后的博客列表组件 */}
              <div className="flex-3 min-w-[280px]">
                {/* 分类筛选组件 */}
                <CategoryFilter categories={allKeywords} locale={locale} />

                <FilteredBlogList posts={posts} locale={locale} />
                {posts.length > 0 && (
                  <nav
                    aria-label={locale === 'zh' ? '全部租房指南目录' : 'All rental guides'}
                    className="mt-10 border-t border-slate-200 pt-6"
                  >
                    <h2 className={styles.sectionTitle}>
                      {locale === 'zh' ? '全部指南' : 'All guides'}
                    </h2>
                    <ul className={styles.guideList}>
                      {posts.map(post => (
                        <li key={post.id}>
                          <Link href={`/${locale}/blog/${encodeURIComponent(post.slug)}`}>
                            {locale === 'zh' ? post.title : post.title_en}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
              </div>
            </div>
          </div>
        </CategoryProvider>
        <RentalLinks locale={locale} compact />
      </div>
    </div>
  );
}
