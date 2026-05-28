// Generate the two demo csv files served from public/demo/.
// One-shot script: re-run only when the demo schema changes.
// No npm deps — pure Math.random with a fixed seed via a small LCG so the
// output is reproducible across runs.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'demo')

// ---- Seeded RNG --------------------------------------------------------

function makeRng(seed) {
  let s = seed >>> 0
  // mulberry32
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Box–Muller transform for standard normals.
function normalPair(rng) {
  let u1 = rng()
  let u2 = rng()
  if (u1 < 1e-12) u1 = 1e-12
  const r = Math.sqrt(-2 * Math.log(u1))
  return [r * Math.cos(2 * Math.PI * u2), r * Math.sin(2 * Math.PI * u2)]
}

// Knuth–Poisson — fine for small λ (we use λ=3 for sessions).
function poisson(rng, lambda) {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > L)
  return k - 1
}

const GEOS = ['US', 'EU', 'APAC', 'LATAM']
function pickGeo(rng) {
  return GEOS[Math.floor(rng() * GEOS.length)]
}

// ---- Generators --------------------------------------------------------

function generateProportion({ nRows = 75000, days = 7, seed = 42 } = {}) {
  const rng = makeRng(seed)
  const rows = ['user_id,variant,converted,bounce_rate,time_on_site,geo,day']
  for (let i = 0; i < nRows; i++) {
    const userId = 100000 + i
    const variantIdx = rng() < 0.5 ? 0 : 1
    const variant = variantIdx === 0 ? 'control' : 'treatment'
    const day = 1 + Math.floor(rng() * days)
    // Control CR ~3.1%. Treatment CR: 3.8% on days 1-2 (novelty), 3.4% from day 3.
    let cr
    if (variant === 'control') {
      cr = 0.031
    } else if (day <= 2) {
      cr = 0.038
    } else {
      cr = 0.034
    }
    const converted = rng() < cr ? 1 : 0
    // bounce_rate ~0.5 with small noise; very similar between groups.
    const bounce = clamp01(0.5 + 0.05 * (rng() - 0.5))
    // time_on_site (seconds) ~ N(120, 40), no real treatment effect.
    const [z] = normalPair(rng)
    const time = Math.max(0, 120 + 40 * z)
    rows.push(
      `${userId},${variant},${converted},${bounce.toFixed(3)},${time.toFixed(1)},${pickGeo(rng)},${day}`,
    )
  }
  return rows.join('\n') + '\n'
}

function generateContinuous({ nRows = 75000, days = 7, seed = 43 } = {}) {
  const rng = makeRng(seed)
  const rows = ['user_id,variant,arpu,sessions,bounce_rate,time_on_site,geo,day']
  for (let i = 0; i < nRows; i++) {
    const userId = 200000 + i
    const variantIdx = rng() < 0.5 ? 0 : 1
    const variant = variantIdx === 0 ? 'control' : 'treatment'
    const day = 1 + Math.floor(rng() * days)
    const mu = variant === 'control' ? 100 : 106
    const [z] = normalPair(rng)
    const arpu = Math.max(0, mu + 80 * z)
    const sessions = poisson(rng, 3)
    const bounce = clamp01(0.5 + 0.05 * (rng() - 0.5))
    const [z2] = normalPair(rng)
    const time = Math.max(0, 120 + 40 * z2)
    rows.push(
      `${userId},${variant},${arpu.toFixed(2)},${sessions},${bounce.toFixed(3)},${time.toFixed(1)},${pickGeo(rng)},${day}`,
    )
  }
  return rows.join('\n') + '\n'
}

function clamp01(x) {
  return Math.min(1, Math.max(0, x))
}

// ---- Run ---------------------------------------------------------------

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const t0 = Date.now()
  const propCsv = generateProportion()
  const propPath = path.join(OUT_DIR, 'demo_proportion.csv')
  fs.writeFileSync(propPath, propCsv)
  const t1 = Date.now()
  console.log(
    `wrote ${propPath} (${(propCsv.length / 1024).toFixed(1)} KB, ${t1 - t0} ms)`,
  )

  const contCsv = generateContinuous()
  const contPath = path.join(OUT_DIR, 'demo_continuous.csv')
  fs.writeFileSync(contPath, contCsv)
  const t2 = Date.now()
  console.log(
    `wrote ${contPath} (${(contCsv.length / 1024).toFixed(1)} KB, ${t2 - t1} ms)`,
  )
}

main()
