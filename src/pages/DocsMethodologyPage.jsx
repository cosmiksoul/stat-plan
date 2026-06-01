import { Link } from 'react-router-dom'
import MarkdownArticle from '../components/docs/MarkdownArticle.jsx'
import md from '../../docs/content/docs-methodology.md?raw'

// Sprint 9 K-4 — renders the Cowork-authored «Методология» article.
export default function DocsMethodologyPage() {
  return (
    <div className="max-w-[920px] mx-auto">
      <div className="mb-4">
        <Link to="/docs" className="text-xs text-fg-faint hover:text-fg">
          ← К документации
        </Link>
      </div>
      <MarkdownArticle source={md} />
    </div>
  )
}
