import { redirect } from 'next/navigation';

interface PageProps {
  params: {
    locale: string;
    slug: string;
  };
}

export default function BlogPostPage({ params }: PageProps) {
  redirect(`/${params.locale}/notion-blog/${params.slug}`);
}
