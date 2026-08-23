# EduGestão — Colégio Presbiteriano da Penha

Reconstrução fiel do sistema de gestão escolar originalmente criado no Lovable
(`hello-world-helper-360`), agora como um projeto Vite + React + TypeScript + Tailwind v4
padrão — roda em qualquer ambiente Node, sem depender do framework proprietário do Lovable
(TanStack Start).

## Como rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## Como gerar build de produção

```bash
npm run build
npm run preview
```

## O que foi adaptado em relação ao original

- **Roteamento:** o app original usava TanStack Start (`createFileRoute`). Como é uma
  aplicação de página única, a rota foi removida e o componente principal (`EduGestaoApp`)
  virou o componente raiz renderizado direto pelo `App.tsx` — nenhum comportamento foi perdido.
- **Assets:** as imagens `school-logo.jpeg` e `school-shield.png` do colégio não estavam
  disponíveis para download automático (ficam hospedadas no CDN interno do Lovable). Foram
  substituídas por placeholders simples (brasão estilizado nas cores da marca). **Troque os
  arquivos em `src/assets/` pelos originais quando tiver acesso a eles** — o resto do app não
  precisa de nenhuma alteração.
- **`.asset.json`:** o Lovable usa um formato próprio de referência a assets
  (`import img from "./foo.png.asset.json"` + `img.url`). Isso foi convertido para import de
  imagem padrão do Vite (`import img from "./foo.png"` + uso direto de `img` como string).

## Funcionalidades (idênticas ao original)

- Persistência local via `localStorage` (alunos, funcionários, reuniões)
- Geração de PDF (relatório de frequência) via `jspdf` + `jspdf-autotable`
- Calendário interativo via `react-calendar`
- Notificações toast via `sonner`
- 8 módulos: Dashboard, Alunos, Matrículas, Financeiro, Desenvolvimento Acadêmico,
  Frequência, Reunião de Pais, Materiais, Funcionários, Ocorrências

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · lucide-react · sonner · jspdf · react-calendar
