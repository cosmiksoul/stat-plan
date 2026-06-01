import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/stat-plan/',
  plugins: [react(), tailwindcss()],
  // Sprint 6 FIX iter 2 BUG-Q5: recharts 3.x несовместим с Vite 8 esbuild
  // pre-bundle. Recharts 3.x использует es-toolkit (lodash-replacement), и
  // esbuild создаёт сломанный shadow `var require_isUnsafeProperty =
  // require_isUnsafeProperty()` (TypeError при hoisting). Попытки решить:
  //   1. `optimizeDeps.include: ['recharts']` → build OK, dev crash.
  //   2. upgrade recharts → уже на 3.8.1 latest.
  //   3. `optimizeDeps.exclude: ['recharts']` → es-toolkit subpath default
  //      export missing.
  //   3.5. include `['recharts','es-toolkit']` → не помогло, es-toolkit
  //      inlined в recharts ESM, esbuild ломает обоих.
  //   ✅ Решение: downgrade recharts → 2.15.4 (последний 2.x). API
  //      `BarChart`/`Bar`/`XAxis`/`YAxis`/`Tooltip`/`ResponsiveContainer`
  //      идентичен. 2.x использует lodash напрямую, не es-toolkit, и Vite
  //      pre-bundle работает без issue. Deprecation warning ожидаемая,
  //      функциональность не пострадала. ADR-014 без изменений (recharts).
  server: {
    watch: {
      // Не триггерим full reload при изменении документации, мокапов и тестов.
      // Sprint 2 QA — пользователь редактирует docs/project/sprints/test-cases-*.md
      // параллельно с тестированием, и это сбрасывало state приложения.
      ignored: ['**/docs/**', '**/mockups/**', '**/tests/**'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
