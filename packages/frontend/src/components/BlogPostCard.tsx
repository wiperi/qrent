import Image from 'next/image'
import Link from 'next/link'

interface BlogPostCardProps {
  title: string
  author: string
  date: string
  preview: string
  imageUrl: string
  slug?: string
}

export default function BlogPostCard({
  title,
  author,
  date,
  preview,
  imageUrl,
  slug = '#'
}: BlogPostCardProps) {
  return (
    <Link href={slug} className="group block">
      <article className="bg-white rounded-lg overflow-hidden shadow-sm border border-slate-200 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
        {/* Background Image */}
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Author and Date */}
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <span>{author}</span>
            <span>•</span>
            <time>{date}</time>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>

          {/* Preview */}
          <p className="text-slate-600 line-clamp-3">
            {preview}
          </p>
        </div>
      </article>
    </Link>
  )
}
