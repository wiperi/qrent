import Link from 'next/link';
import { breadcrumbs, jsonLd } from '@/lib/seo';

export default function Breadcrumbs({
  locale,
  items,
}: {
  locale: string;
  items: { name: string; path: string }[];
}) {
  return (
    <>
      <nav
        aria-label={locale === 'zh' ? '面包屑导航' : 'Breadcrumb'}
        className="mb-6 text-sm text-slate-600"
      >
        <ol className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <li key={item.path} className="flex gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {index === items.length - 1 ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <Link href={`/${locale}${item.path}`} className="underline">
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbs(locale, items)) }}
      />
    </>
  );
}
