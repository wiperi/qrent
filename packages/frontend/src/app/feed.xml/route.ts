import { getNotionBlogPosts } from '@/lib/notion-blog';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 600;
function xml(value: string) {
  return value.replace(
    /[<>&"']/g,
    char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!
  );
}
export async function GET() {
  const posts = await getNotionBlogPosts();
  const items = posts
    .filter(post => !/[/\\?#]|^\./.test(post.slug))
    .map(post => {
      const url = `${SITE_URL}/${post.language}/blog/${encodeURIComponent(post.slug)}`;
      return `<item><title>${xml(post.language === 'zh' ? post.title : post.title_en)}</title><link>${xml(url)}</link><guid isPermaLink="true">${xml(url)}</guid><description>${xml(post.language === 'zh' ? post.excerpt_zh : post.excerpt_en)}</description>${Number.isFinite(Date.parse(post.published_at)) ? `<pubDate>${new Date(post.published_at).toUTCString()}</pubDate>` : ''}</item>`;
    })
    .join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>QRent rental guides</title><link>${SITE_URL}/en/blog</link><description>Practical Australian rental guides in English and Chinese.</description>${items}</channel></rss>`,
    {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
      },
    }
  );
}
