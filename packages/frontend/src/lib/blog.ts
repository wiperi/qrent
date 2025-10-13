import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import type { BlogPost } from '@/types/blog';

const postsDirectory = path.join(process.cwd(), 'public/blog-posts');

export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const fileNames = await fs.readdir(postsDirectory);
    const markdownFiles = fileNames.filter(name => name.endsWith('.md'));

    const posts = await Promise.all(
      markdownFiles.map(async fileName => {
        const slug = fileName.replace(/\.md$/, '');
        const post = await getBlogPost(slug);
        return post;
      })
    );

    // Filter out null values and sort by date (newest first)
    return posts
      .filter((post): post is BlogPost => post !== null)
      .sort((a, b) => {
        return new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime();
      });
  } catch (error) {
    console.error('Error reading blog posts:', error);
    return [];
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const filePath = path.join(postsDirectory, `${slug}.md`);
    const fileContents = await fs.readFile(filePath, 'utf8');

    const { data, content } = matter(fileContents);

    // Generate excerpt from first 150 characters of content
    const excerpt =
      content
        .replace(/^#.*$/gm, '') // Remove headings
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .trim()
        .substring(0, 150)
        .trim() + '...';

    return {
      slug,
      title: data.title,
      titleEn: data.titleEn,
      datePublished: data.datePublished,
      keywords: data.keywords || [],
      schema: data.schema || {},
      content,
      excerpt,
    };
  } catch (error) {
    console.error(`Error reading blog post ${slug}:`, error);
    return null;
  }
}
