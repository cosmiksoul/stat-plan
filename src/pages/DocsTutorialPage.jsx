import { Link } from 'react-router-dom'
import MarkdownArticle from '../components/docs/MarkdownArticle.jsx'
import md from '../../docs/content/docs-tutorial.md?raw'

// Sprint 9 K-4 — renders the Cowork-authored «Туториалы» content plus a fixed
// block of demo CSV download links (the same files used by the scenarios).
const DEMO_FILES = [
  { id: 'demo_proportion', note: 'Сценарий 1 · proportion' },
  { id: 'demo_continuous', note: 'Сценарий 2 · continuous' },
  { id: 'demo_ratio', note: 'Сценарий 3 · ratio' },
]

function demoHref(id) {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}demo/${id}.csv`
}

export default function DocsTutorialPage() {
  return (
    <div className="max-w-[920px] mx-auto">
      <div className="mb-4">
        <Link to="/docs" className="text-xs text-fg-faint hover:text-fg">
          ← К документации
        </Link>
      </div>
      <MarkdownArticle source={md} />

      <section className="mt-8 pt-6 border-t border-border-soft">
        <h2 className="mono-label text-fg-faint mb-3">↓ DEMO CSV</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {DEMO_FILES.map((f) => (
            <a
              key={f.id}
              href={demoHref(f.id)}
              download={`${f.id}.csv`}
              className="block border border-border-soft rounded-md px-4 py-3 hover:border-accent hover:bg-bg-elev-2 transition-colors"
            >
              <div className="text-sm font-mono text-fg">{f.id}.csv</div>
              <div className="text-xs text-fg-faint mt-0.5">{f.note}</div>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
