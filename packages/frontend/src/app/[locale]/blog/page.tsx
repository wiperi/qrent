import { redirect } from 'next/navigation';

interface PageProps {
  params: {
    locale: string;
  };
}

export default function BlogPage({ params }: PageProps) {
  redirect(`/${params.locale}/notion-blog`);
}
