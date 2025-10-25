import type { Components } from 'react-markdown';

export const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-4xl font-bold mt-8 mb-4 text-slate-900">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-3xl font-semibold mt-6 mb-3 text-slate-800">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-2xl font-semibold mt-5 mb-2 text-slate-800">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-xl font-semibold mt-4 mb-2 text-slate-700">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-base leading-7 mb-4 text-slate-700">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-slate-700 leading-7">{children}</li>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-blue-600 hover:text-blue-800 underline"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-700">{children}</em>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4 text-slate-600">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">
          {children}
        </code>
      );
    }
    return (
      <code className="block bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm font-mono my-4">
        {children}
      </code>
    );
  },
  hr: () => <hr className="my-8 border-slate-300" />,
};
