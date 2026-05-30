import { useState } from 'react'

// Sprint 7 S4 — thumbnails grid + click-to-lightbox. Embeds PNGs as data URLs
// — they come from the ipynb parser.

export default function ImagesGallery({ images }) {
  const [lightbox, setLightbox] = useState(null)
  if (!Array.isArray(images) || images.length === 0) return null

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {images.map((img, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setLightbox(img.base64_png)}
            className="bg-bg-elev-2 border border-border rounded p-1 cursor-pointer hover:border-accent transition-colors"
          >
            <img
              src={`data:image/png;base64,${img.base64_png}`}
              alt={`График ${idx + 1} из ноутбука`}
              loading="lazy"
              className="block w-full h-auto rounded"
            />
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 cursor-zoom-out"
        >
          <img
            src={`data:image/png;base64,${lightbox}`}
            alt="График полного размера"
            className="max-w-full max-h-full rounded shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}
