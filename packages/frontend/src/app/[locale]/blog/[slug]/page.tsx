import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export default async function BlogPostPage({ params }: PageProps) {
  const { locale, slug } = await params;
  redirect(`/${locale}/notion-blog/${slug}`);
}
