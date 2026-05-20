# Ctrl+Custo

Aplicativo de finanças pessoais com versão web (React), mobile (Expo) e desktop (Tauri), conectados a uma API REST própria com autenticação JWT. Toda a lógica compartilhada e os tipos TypeScript vivem em pacotes internos do monorepo.

## Estrutura

```
ctrl-custo/
├── apps/
│   ├── api/          # Hono + Drizzle ORM + PostgreSQL + JWT
│   ├── web/          # React 19 + Vite + TailwindCSS (+ src-tauri para desktop)
│   └── mobile/       # Expo SDK 54 + Expo Router v5
├── packages/
│   ├── core/         # Tipos compartilhados e schema Drizzle
│   ├── ui/           # Design system (React Native primitives + Victory Native)
│   └── config/       # tsconfig e eslint base
```

## Stack

- **Monorepo:** Turborepo + pnpm workspaces
- **Linguagem:** TypeScript strict
- **Backend:** Hono · Drizzle ORM · PostgreSQL · JWT + refresh tokens · verificação de e-mail
- **Frontend:** React 19 · Zustand · TailwindCSS
- **Mobile:** Expo SDK 54 · Expo Router v5 · expo-secure-store
- **Desktop:** Tauri (empacota o app web como executável Windows .exe)
- **Gráficos:** Victory Native
- **Testes:** Vitest (unitários, packages/core) · Maestro (E2E mobile, emulador Android)
- **Deploy:** Oracle Cloud A1.Flex · GitHub Actions CI/CD

## Comandos

```bash
# Instalar dependências
pnpm install

# Desenvolvimento
pnpm dev:api       # API REST (porta 3000)
pnpm dev:web       # App web (porta 5173)
pnpm dev:mobile    # App mobile (Expo)

# Testes e qualidade
pnpm test          # Testes unitários (packages/core)
pnpm typecheck     # Type-check em todos os pacotes
pnpm lint          # Lint em todos os pacotes
pnpm format        # Formatar código (Prettier)
```

## Fases do projeto

- [x] Fase 0 — Monorepo & estrutura base
- [x] Fase 1 — packages/core (lógica de negócio, banco, testes)
- [x] Fase 2 — packages/ui (design system compartilhado)
- [x] Fase 3 — apps/web (versão browser)
- [x] Fase 4 — apps/mobile (versão mobile)
- [x] Fase 5 — apps/api (backend REST com autenticação JWT)
- [x] Fase 6 — Migrations PostgreSQL (Drizzle Kit)
- [x] Fase 7 — Web consome a API (remove sql.js)
- [x] Fase 8 — Mobile consome a API (remove expo-sqlite)
- [x] Fase 9 — Oracle Cloud: infra, deploy e hardening
- [x] Fase 10 — CI/CD (GitHub Actions)
- [x] Fase 11 — Desktop Windows (Tauri)
- [x] Fase 12 — Security fixes + verificação de e-mail
- [x] Fase 13 — Reorganização do banco em schemas de domínio
- [x] Fase 14 — Testes automatizados mobile (Maestro E2E)
