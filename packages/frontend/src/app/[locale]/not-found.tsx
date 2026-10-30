import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function NotFound() {
  const locale = useLocale();
  const zh = locale === 'zh';
  return (
    <main className="max-w-3xl mx-auto px-5 py-16">
      <h1 className="text-3xl font-bold mb-4">{zh ? '找不到这个页面' : 'Page not found'}</h1>
      <p className="text-slate-600 mb-6">
        {zh
          ? '这篇内容可能未发布，或没有当前语言的版本。你可以继续浏览租房指南或按学校找房。'
          : 'This page may be unpublished or unavailable in this language. Continue with the rental guides or explore homes by university.'}
      </p>
      <nav className="flex flex-wrap gap-5">
        <Link className="text-blue-700 underline" href={`/${locale}`}>
          {zh ? '回到首页' : 'Home'}
        </Link>
        <Link className="text-blue-700 underline" href={`/${locale}/blog`}>
          {zh ? '租房指南' : 'Rental guides'}
        </Link>
        <Link className="text-blue-700 underline" href={`/${locale}/rentals`}>
          {zh ? '学校租房目录' : 'University rental directory'}
        </Link>
      </nav>
    </main>
  );
}
