// Heuristic parser for the hypothesis text from Q02.
// Detects which of the 4 structural slots are present:
//   change   — text between "если" and "то" (or a comma)
//   metric   — non-empty text after "то"
//   direction_magnitude — a direction verb + a number somewhere after it
//   mechanism — non-empty text after "потому что"
//
// Per ADR-003 we only check structural presence, not "quality".

const DIRECTION_VERBS = [
  'вырастет', 'вырастут', 'вырос', 'выросло', 'выросла',
  'упадёт', 'упадет', 'упадут', 'упало', 'упала', 'упал',
  'снизится', 'снизятся',
  'повысится', 'повысятся',
  'увеличится', 'увеличатся',
  'уменьшится', 'уменьшатся',
  'изменится', 'изменятся',
  'растёт', 'растет', 'растут',
  'падает', 'падают',
]

// JS \b only counts ASCII word chars, so /\bто\b/ also matches "то" inside
// "потому". Use Unicode letter boundaries instead.
const NOT_LETTER_BEFORE = '(?<![\\p{L}])'
const NOT_LETTER_AFTER = '(?![\\p{L}])'

const DIRECTION_VERB_RE = new RegExp(
  NOT_LETTER_BEFORE + '(' + DIRECTION_VERBS.join('|') + ')' + NOT_LETTER_AFTER,
  'iu',
)

const NUMBER_RE = /\d+(?:[.,]\d+)?/
const MECHANISM_MARKER_RE = new RegExp(
  NOT_LETTER_BEFORE + 'потому\\s+что' + NOT_LETTER_AFTER,
  'iu',
)
const IF_MARKER_RE = new RegExp(
  NOT_LETTER_BEFORE + 'если' + NOT_LETTER_AFTER,
  'iu',
)
const THEN_MARKER_RE = new RegExp(
  NOT_LETTER_BEFORE + 'то' + NOT_LETTER_AFTER,
  'iu',
)

function findFirst(text, regex) {
  const match = regex.exec(text)
  if (!match) return null
  return { index: match.index, length: match[0].length, text: match[0] }
}

export function parseHypothesis(input) {
  const text = (input ?? '').toString()
  const slots = {
    change: false,
    metric: false,
    direction_magnitude: false,
    mechanism: false,
  }

  if (!text.trim()) return slots

  // Mechanism: anything after "потому что".
  const mechanismMarker = findFirst(text, MECHANISM_MARKER_RE)
  if (mechanismMarker) {
    const after = text.slice(mechanismMarker.index + mechanismMarker.length)
    if (after.trim().length > 0) slots.mechanism = true
  }

  // The "if/then" portion only counts up to the mechanism marker if it exists.
  const head = mechanismMarker
    ? text.slice(0, mechanismMarker.index)
    : text

  const ifMarker = findFirst(head, IF_MARKER_RE)
  const thenMarker = findFirst(head, THEN_MARKER_RE)

  // Change: text between "если" and ("то" or first comma), non-empty.
  if (ifMarker) {
    const afterIf = head.slice(ifMarker.index + ifMarker.length)
    const stopAt = []
    const thenInTail = THEN_MARKER_RE.exec(afterIf)
    if (thenInTail) stopAt.push(thenInTail.index)
    const commaInTail = afterIf.indexOf(',')
    if (commaInTail !== -1) stopAt.push(commaInTail)
    const cut = stopAt.length ? Math.min(...stopAt) : afterIf.length
    if (afterIf.slice(0, cut).trim().length > 0) slots.change = true
  }

  // Metric: text after "то", up to the direction verb or comma/end.
  // If a direction verb exists, "метрика" is what's between "то" and the verb.
  // If no verb, we still accept any non-empty text after "то" as a metric mention.
  if (thenMarker && thenMarker.index >= (ifMarker?.index ?? -1)) {
    const afterThen = head.slice(thenMarker.index + thenMarker.length)
    const verbInTail = DIRECTION_VERB_RE.exec(afterThen)
    const cut = verbInTail ? verbInTail.index : afterThen.length
    if (afterThen.slice(0, cut).trim().length > 0) slots.metric = true
  }

  // Direction + magnitude: a direction verb in the "then" portion AND a
  // number somewhere after it (still inside the "then" portion).
  if (thenMarker) {
    const afterThen = head.slice(thenMarker.index + thenMarker.length)
    const verbInTail = DIRECTION_VERB_RE.exec(afterThen)
    if (verbInTail) {
      const afterVerb = afterThen.slice(verbInTail.index + verbInTail[0].length)
      if (NUMBER_RE.test(afterVerb)) slots.direction_magnitude = true
    }
  }

  return slots
}

export function extractMetricName(input) {
  const text = (input ?? '').toString()
  if (!text.trim()) return null

  // Work only inside the "then" portion (before "потому что" if present).
  const mechanismMarker = findFirst(text, MECHANISM_MARKER_RE)
  const head = mechanismMarker
    ? text.slice(0, mechanismMarker.index)
    : text

  const thenMarker = findFirst(head, THEN_MARKER_RE)
  if (!thenMarker) return null

  const afterThen = head.slice(thenMarker.index + thenMarker.length)
  const verbInTail = DIRECTION_VERB_RE.exec(afterThen)
  if (!verbInTail) return null

  const between = afterThen.slice(0, verbInTail.index).trim()
  if (!between) return null
  return between
}
