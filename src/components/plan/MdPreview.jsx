// Raw markdown preview. No rendering library — we ship the actual text the
// user will download, monospaced. Per Sprint 3 task 11.
export default function MdPreview({ content }) {
  return (
    <div className="bg-bg border border-border rounded-md overflow-hidden">
      <div className="border-b border-border-soft px-4 py-2 mono-label text-fg-faint flex items-center justify-between">
        <span>test_plan.md</span>
        <span className="text-fg-faint">PREVIEW</span>
      </div>
      <pre className="font-mono text-xs leading-relaxed text-fg-dim whitespace-pre-wrap break-words m-0 p-4 max-h-[640px] overflow-auto">
        {content}
      </pre>
    </div>
  )
}
