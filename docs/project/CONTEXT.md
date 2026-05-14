# CONTEXT — история проекта `<project>`

> Журнал развития проекта. Обновляется Cowork в фазе CLOSE каждого спринта.
>
> **Назначение:** новый инстанс Cowork (или ты сам через месяц) сможет прочитать этот файл и понять историю проекта без перечитывания всех sprint-report.

---

## Development Timeline

> Записи в обратном хронологическом порядке (новые сверху).

### Pre-MVP

[Что было до первого спринта: концептуальная работа, мокапы, документация. Краткое описание.]

---

### Sprint 1 — [Название] (YYYY-MM-DD)

**Type:** Code / Content / Architecture
**Status:** Complete / Partial
**Goal:** [Цель одним предложением]

**Closed:** [user stories из JTBD, которые закрыты]

**Key decisions:** [новые ADR, project-specific правила]

**Tech debt / deferred:** [что отложено и куда]

**Notes:** [что узнали полезного, что пошло не так, что улучшить]

---

### Sprint N — ...

[аналогично]

---

## Tech Debt

> Накопленный технический долг. Каждая запись — что и из какого спринта приехало.

- [ ] **Inline rgba цвета вместо токенов @theme.** Приехало из Sprint 1 (code review concerns #1-2). Места: `src/components/Header.jsx` hover-bg кнопки тура, `src/pages/StartScreen.jsx` warn-toast bg/border. Зафиксировать как `--color-tour-hover`, `--color-warn-soft`, `--color-warn-border` в `src/styles/index.css` при ближайшем добавлении новых state-цветов (вероятно Sprint 2).
- [ ] **Нет ErrorBoundary вокруг приложения.** Приехало из Sprint 1 (code review concern #5). `useAppState` throw'ает без Provider'а — сейчас не воспроизводится, но при добавлении React Testing Library тестов рендера компонентов без обёртки сломается с непонятным сообщением. Добавить минимальный ErrorBoundary или тестовый Provider-wrapper когда появятся первые RTL-тесты.

---

## Recurring questions

> Вопросы, которые периодически всплывают и заслуживают зафиксированного ответа (или ADR'а если они архитектурные).

- **Q:** ...
  **A:** [Ответ или ссылка на ADR]
