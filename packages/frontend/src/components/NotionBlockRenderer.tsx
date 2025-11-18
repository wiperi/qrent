/* eslint-disable @typescript-eslint/no-explicit-any */
import { richTextToHtml } from '@/lib/notion';
import type { NotionBlock } from '@/types/blog';
import Image from 'next/image';
import React from 'react';

interface NotionBlockRendererProps {
  block: NotionBlock;
  locale?: string;
}

/**
 * Notion 块渲染器
 * 将 Notion API 返回的块数据转换为 React 组件
 */
const NotionBlockRenderer: React.FC<NotionBlockRendererProps> = ({ block, locale = 'zh' }) => {
  const { type } = block;
  const value = (block as any)[type] || {};


  // 渲染子块（递归）
  const renderChildren = (children?: NotionBlock[]) => {
    if (!children || children.length === 0) return null;

    return (
      <div className="ml-4">
        {children.map((childBlock) => (
          <NotionBlockRenderer key={childBlock.id} block={childBlock} locale={locale} />
        ))}
      </div>
    );
  };

  // 根据块类型渲染不同的组件
  switch (type) {
    case 'paragraph':
      const paragraphText = richTextToHtml(value.rich_text || []);
      if (!paragraphText.trim()) {
        return <div className="h-4" />; // 空段落显示为空白行
      }
      return (
        <p
          className="text-slate-700 leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: paragraphText }}
        />
      );

    case 'heading_1':
      return (
        <h1
          className="text-3xl font-bold text-slate-900 mb-6 mt-8"
          dangerouslySetInnerHTML={{ __html: richTextToHtml(value.rich_text || []) }}
        />
      );

    case 'heading_2':
      return (
        <h2
          className="text-2xl font-semibold text-slate-800 mb-4 mt-6"
          dangerouslySetInnerHTML={{ __html: richTextToHtml(value.rich_text || []) }}
        />
      );

    case 'heading_3':
      return (
        <h3
          className="text-xl font-semibold text-slate-800 mb-3 mt-4"
          dangerouslySetInnerHTML={{ __html: richTextToHtml(value.rich_text || []) }}
        />
      );

    case 'bulleted_list_item':
      return (
        <div className="mb-2">
          <ul className="list-disc list-inside">
            <li
              className="text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: richTextToHtml(value.rich_text || []) }}
            />
          </ul>
          {renderChildren((block as any).children)}
        </div>
      );

    case 'numbered_list_item':
      return (
        <div className="mb-2">
          <ol className="list-decimal list-inside">
            <li
              className="text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: richTextToHtml(value.rich_text || []) }}
            />
          </ol>
          {renderChildren((block as any).children)}
        </div>
      );

    case 'to_do':
      return (
        <div className="flex items-start mb-2">
          <input
            type="checkbox"
            checked={value.checked || false}
            readOnly
            className="mt-1 mr-2"
          />
          <span
            className={`text-slate-700 leading-relaxed ${value.checked ? 'line-through text-slate-500' : ''}`}
            dangerouslySetInnerHTML={{ __html: richTextToHtml(value.rich_text || []) }}
          />
        </div>
      );

    case 'toggle':
      return (
        <details className="mb-4">
          <summary
            className="cursor-pointer text-slate-700 font-medium mb-2"
            dangerouslySetInnerHTML={{ __html: richTextToHtml(value.rich_text || []) }}
          />
          <div className="ml-4">
            {renderChildren((block as any).children)}
          </div>
        </details>
      );

    case 'code':
      const language = value.language || 'text';
      return (
        <div className="mb-4">
          <pre className="bg-slate-100 rounded-lg p-4 overflow-x-auto">
            <code
              className={`language-${language} text-sm`}
              dangerouslySetInnerHTML={{ __html: richTextToHtml(value.rich_text || []) }}
            />
          </pre>
          {value.caption && value.caption.length > 0 && (
            <p
              className="text-sm text-slate-500 mt-2 text-center italic"
              dangerouslySetInnerHTML={{ __html: richTextToHtml(value.caption) }}
            />
          )}
        </div>
      );

    case 'quote':
      return (
        <blockquote className="border-l-4 border-blue-400 bg-blue-50 p-4 my-4 rounded-r-lg">
          <p
            className="text-slate-700 leading-relaxed italic"
            dangerouslySetInnerHTML={{ __html: richTextToHtml(value.rich_text || []) }}
          />
        </blockquote>
      );

    case 'callout':
      const emoji = value.icon?.emoji || '💡';
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
          <div className="flex items-start">
            <span className="text-2xl mr-3 flex-shrink-0">{emoji}</span>
            <div
              className="text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: richTextToHtml(value.rich_text || []) }}
            />
          </div>
        </div>
      );

    case 'divider':
      return <hr className="border-slate-200 my-8" />;

    case 'image':
      const imageUrl = value.type === 'external' ? value.external?.url : value.file?.url;
      const caption = value.caption ? richTextToHtml(value.caption) : '';

      if (!imageUrl) return null;

      return (
        <figure className="my-6">
          <div className="relative w-full h-64">
            <Image
              src={imageUrl as string}
              alt={caption || '图片'}
              fill
              className="object-cover rounded-lg shadow-sm"
            />
          </div>
          {caption && (
            <figcaption
              className="text-sm text-slate-500 mt-2 text-center italic"
              dangerouslySetInnerHTML={{ __html: caption }}
            />
          )}
        </figure>
      );

    case 'video':
      const videoUrl = value.type === 'external' ? value.external?.url : value.file?.url;
      if (!videoUrl) return null;

      return (
        <div className="my-6">
          <video
            controls
            className="w-full rounded-lg shadow-sm"
            preload="metadata"
          >
            <source src={videoUrl} />
            您的浏览器不支持视频播放。
          </video>
          {value.caption && value.caption.length > 0 && (
            <p
              className="text-sm text-slate-500 mt-2 text-center italic"
              dangerouslySetInnerHTML={{ __html: richTextToHtml(value.caption) }}
            />
          )}
        </div>
      );

    case 'file':
      const fileUrl = value.type === 'external' ? value.external?.url : value.file?.url;
      const fileName = value.name || '下载文件';

      if (!fileUrl) return null;

      return (
        <div className="my-4">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            {fileName}
          </a>
        </div>
      );

    case 'bookmark':
      const bookmarkUrl = value.url;
      if (!bookmarkUrl) return null;

      return (
        <div className="my-4 border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
          <a
            href={bookmarkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <div className="text-blue-600 font-medium mb-1">
              {bookmarkUrl}
            </div>
            {value.caption && value.caption.length > 0 && (
              <p
                className="text-sm text-slate-500"
                dangerouslySetInnerHTML={{ __html: richTextToHtml(value.caption) }}
              />
            )}
          </a>
        </div>
      );

    case 'table':
      return (
        <div className="my-6 overflow-x-auto">
          <table className="min-w-full border border-slate-200 rounded-lg">
            <tbody>
              {renderChildren((block as any).children)}
            </tbody>
          </table>
        </div>
      );

    case 'table_row':
      const cells = value.cells || [];
      return (
        <tr className="border-b border-slate-200">
          {cells.map((cell: any[], index: number) => (
            <td
              key={index}
              className="px-4 py-2 border-r border-slate-200 last:border-r-0"
              dangerouslySetInnerHTML={{ __html: richTextToHtml(cell) }}
            />
          ))}
        </tr>
      );

    case 'column_list':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          {renderChildren((block as any).children)}
        </div>
      );

    case 'column':
      return (
        <div className="space-y-2">
          {renderChildren((block as any).children)}
        </div>
      );

    // 不支持的块类型
    default:
      console.warn(`不支持的块类型: ${type}`);
      return (
        <div className="my-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
          不支持的内容类型: {type}
        </div>
      );
  }
};

export default NotionBlockRenderer;
