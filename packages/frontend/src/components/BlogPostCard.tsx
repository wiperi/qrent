'use client';

import { useLocale } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

interface BlogPostCardProps {
  title: string;
  author: string;
  date: string;
  preview: string;
  imageUrl: string;
  slug: string;
}

export default function BlogPostCard({
  title,
  author,
  date,
  preview,
  imageUrl,
  slug
}: BlogPostCardProps) {
  const locale = useLocale();

  return (
    <Link href={`/${locale}${slug}`} className="group">
      <article className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="aspect-[16/9] relative overflow-hidden">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
            {title}
          </h2>
          <p className="text-slate-600 mb-4 line-clamp-3">
            {preview}
          </p>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{author}</span>
            <span>{date}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
