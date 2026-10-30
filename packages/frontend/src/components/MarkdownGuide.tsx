import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Reviewed, paired guide content. Raw HTML stays disabled. */
export default function MarkdownGuide({ content }: { content: string }) {
  return (
    <div className="qrent-guide-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2>{children}</h2>,
          table: ({ children }) => (
            <div className="my-4 max-w-full overflow-x-auto" tabIndex={0}>
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
