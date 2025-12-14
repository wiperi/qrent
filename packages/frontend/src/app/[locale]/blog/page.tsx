import BlogPostCard from '@/components/BlogPostCard';
import TodoProgressBar from '@/components/TodoProgressBar';
import FilteredBlogList from '@/components/FilteredBlogList';
import CategoryFilter from '@/components/CategoryFilter';
import { CategoryProvider } from '@/components/CategoryContext';
import { getNotionBlogPosts } from '@/lib/notion-blog';
import { LOCALE } from '@qrent/shared/enum';
import { Metadata } from 'next';

const BLOG_IMAGE_URLS = ['/banner.jpg', '/qrent.jpg'];

function getImageForSlug(slug: string): string {
  const index =
    slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % BLOG_IMAGE_URLS.length;
  return BLOG_IMAGE_URLS[index];
}

export const metadata: Metadata = {
  title: 'Blog - QRent',
  description: 'Latest rental insights and tips powered by Notion',
};

export const revalidate = 600; // Cache for 10 minutes

// 主页面组件（服务器组件）
export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const posts = await getNotionBlogPosts(locale);

  // 提取所有关键词并去重
  const allKeywords = Array.from(new Set(posts.flatMap(post => post.keywords))).sort();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CategoryProvider>
          <div className="">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              {locale === LOCALE.ZH ? 'Qrent 经验贴' : 'Qrent Blog'}
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
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
              </div>
            </div>
          </div>
        </CategoryProvider>
      </div>
    </div>
  );
}
