import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/stat-plan/',
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // Не триггерим full reload при изменении документации, мокапов и тестов.
      // Sprint 2 QA — пользователь редактирует docs/project/test-cases-*.md
      // параллельно с тестированием, и это сбрасывало state приложения.
      ignored: ['**/docs/**', '**/mockups/**', '**/tests/**'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
