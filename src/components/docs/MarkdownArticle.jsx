import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Sprint 9 K-4 — renders Cowork-authored markdown (docs/content/*.md) with a
// dark-theme element map. No @tailwindcss/typography plugin in the project, so
// each element is mapped to Tailwind classes explicitly. Headings get slug ids
// so in-page anchor links (#section) work in the long methodology article.

function slugify(children) {
  const text = String(
    Array.isArray(children) ? children.join('') : (children ?? ''),
  )
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\wа-яё\s-]/gi, '')
    .replace(/\s+/g, '-')
}

function Anchor({ href = '', children }) {
  const external = /^https?:\/\//.test(href)
  return (
    <a
      href={href}
      className="text-accent hover:underline underline-offset-2"
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  )
}

const COMPONENTS = {
  h1: ({ children }) => (
    <h1
      id={slugify(children)}
      className="font-serif text-3xl font-medium tracking-tight text-fg mt-0 mb-3 scroll-mt-24"
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      id={slugify(children)}
      className="font-serif text-2xl font-medium tracking-tight text-fg mt-10 mb-3 scroll-mt-24"
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      id={slugify(children)}
      className="font-serif text-lg font-medium text-fg mt-6 mb-2 scroll-mt-24"
    >
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-fg mt-4 mb-1.5">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-sm text-fg-dim leading-relaxed my-3">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 my-3 space-y-1 text-sm text-fg-dim marker:text-fg-faint">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-3 space-y-1 text-sm text-fg-dim marker:text-fg-faint">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: Anchor,
  strong: ({ children }) => (
    <strong className="font-semibold text-fg">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border-soft pl-4 my-4 text-sm text-fg-faint italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-0 border-t border-border-soft my-8" />,
  code: ({ inline, children }) =>
    inline ? (
      <code className="font-mono text-[12px] bg-bg-elev-2 text-accent rounded px-1.5 py-0.5">
        {children}
      </code>
    ) : (
      <code className="font-mono text-[12px] text-fg-dim">{children}</code>
    ),
  pre: ({ children }) => (
    <pre className="md-preview bg-bg-elev-2 border border-border-soft rounded-md p-4 my-4 overflow-x-auto text-[12px] leading-relaxed">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  th: ({ children }) => (
    <th className="text-left font-semibold text-fg border-b border-border px-3 py-2 align-top">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="text-fg-dim border-b border-border-soft px-3 py-2 align-top leading-relaxed">
      {children}
    </td>
  ),
}

export default function MarkdownArticle({ source }) {
  return (
    <article>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {source}
      </ReactMarkdown>
    </article>
  )
}
