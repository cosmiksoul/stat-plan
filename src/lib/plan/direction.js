// Derive MDE.direction from the hypothesis verb.
// 'increase' for "вырастет"/"повысится"/"увеличится"/..., 'decrease' for
// "упадёт"/"снизится"/"уменьшится"/..., 'any' for "изменится"/no verb/empty.
//
// First verb wins. Case-insensitive. Verb must be a whole word.

const INCREASE_VERBS = [
  'вырастет', 'вырастут', 'вырос', 'выросло', 'выросла',
  'повысится', 'повысятся',
  'увеличится', 'увеличатся',
  'растёт', 'растет', 'растут',
]

const DECREASE_VERBS = [
  'упадёт', 'упадет', 'упадут', 'упало', 'упала', 'упал',
  'снизится', 'снизятся',
  'уменьшится', 'уменьшатся',
  'падает', 'падают',
]

const ANY_VERBS = ['изменится', 'изменятся']

const ALL_VERBS = [
  ...INCREASE_VERBS.map((v) => [v, 'increase']),
  ...DECREASE_VERBS.map((v) => [v, 'decrease']),
  ...ANY_VERBS.map((v) => [v, 'any']),
]

const NOT_LETTER_BEFORE = '(?<![\\p{L}])'
const NOT_LETTER_AFTER = '(?![\\p{L}])'

const VERB_RE = new RegExp(
  NOT_LETTER_BEFORE +
    '(' +
    ALL_VERBS.map(([v]) => v).join('|') +
    ')' +
    NOT_LETTER_AFTER,
  'iu',
)

const VERB_TO_DIRECTION = new Map(
  ALL_VERBS.map(([verb, dir]) => [verb.toLowerCase(), dir]),
)

export function deriveDirection(input) {
  const text = (input ?? '').toString()
  if (!text.trim()) return 'any'

  const match = VERB_RE.exec(text)
  if (!match) return 'any'

  return VERB_TO_DIRECTION.get(match[1].toLowerCase()) ?? 'any'
}
