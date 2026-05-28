// Slugify a string for use in filenames / YAML test_id. Used by
// notebook-builder (filename + statplan.test_id) and render (YAML test_id).
// Behaviour locked by NB-BUG-3 (Sprint 4 FIX iter 1): Cyrillic 'ё' must be
// preserved as a distinct character (not folded to 'е'). The character
// class `[а-яё]` keeps it; the `u` flag ensures correct Unicode width.
//
// Fallbacks: empty/null/undefined → 'test'. Final empty string after the
// transforms (e.g. only punctuation in input) → 'test'.

export function slugify(s) {
  if (!s) return 'test'
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9а-яё_\s-]/giu, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40) || 'test'
  )
}
