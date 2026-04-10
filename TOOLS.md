# Tools & Skills Inventory

Track all tools, skills, and MCP servers available for this project.

## Skills (`.claude/skills/`)

| Skill | Purpose | Source | Status |
|-------|---------|--------|--------|
| `frontend-design` | Design guidelines — anti-generic-AI aesthetics, typography, color, motion, layout | Anthropic repo | ✅ Installed |
| `animation-patterns` | CSS + Framer Motion recipes — reward feedback, progress reveals, micro-interactions | Custom | ✅ Installed |
| `gamification-components` | Tailwind/React component patterns — cards, progress, currency, quest trackers | Custom | ✅ Installed |
| `theme-factory` | 10 pre-set color/font themes, custom theme generation | Anthropic repo | ✅ Installed |
| `web-artifacts-builder` | Multi-component React/Tailwind artifacts with shadcn/ui | Anthropic repo | ✅ Installed |
| `algorithmic-art` | Generative art with p5.js — flow fields, particles, patterns | Anthropic repo | ✅ Installed |
| `webapp-testing` | Playwright-based web app testing — screenshots, UI verification | Anthropic repo | ✅ Installed |
| `skill-creator` | Create new skills, modify existing ones | Anthropic repo | ✅ Installed |

## MCP Servers

| Server | Command | Purpose | Status |
|--------|---------|---------|--------|
| `supabase` | `npx -y @supabase/mcp-server-supabase` | Database, migrations, edge functions | ✅ Connected |
| `claude.ai Supabase` | Remote | Supabase via Claude.ai | ✅ Connected |
| `github` | `npx -y @modelcontextprotocol/server-github` | Repos, PRs, issues, code search | ✅ Connected |
| `pagespeed` | `npx -y pagespeed-mcp-server` | PageSpeed + SEO audits (remote, no Chrome) | ✅ Connected |
| `lighthouse` | `npx -y lighthouse-mcp` | Lighthouse performance audits (local Chrome) | ✅ Connected |

## CLI Tools

| Tool | Version | Purpose | Status |
|------|---------|---------|--------|
| `vercel` | 50.34.2 | Deploy, env vars, domains | ✅ Installed |
| `next` | 14.1.0 | Local dev/build (via node_modules) | ✅ Installed |
| `gh` | — | GitHub CLI | ✅ Available |
| `node` | — | Runtime | ✅ Available |
| `npm` | — | Package management | ✅ Available |

| `chrome-local` | `npx -y chrome-local-mcp` | Browser screenshots, navigation, automation (Puppeteer) | ✅ Connected |

## Icon Libraries

| Library | Package | Icons | Status |
|---------|---------|-------|--------|
| Lucide React | `lucide-react` | 1400+ clean stroke icons | ✅ Installed |
| React Icons | `react-icons` | 40,000+ (FA, Material, Bootstrap, etc.) | ✅ Installed |
| Heroicons | `@heroicons/react` | 300+ by Tailwind team | ✅ Installed |
| Phosphor Icons | `@phosphor-icons/react` | 7000+ with weight variants | ✅ Installed |
| Tabler Icons | `@tabler/icons-react` | 5000+ stroke-based | ✅ Installed |

## Next Up

### Image Generation (needs API key)
- **`mcp-image`** — Gemini-based. Needs `GEMINI_API_KEY`
- **`@r16t/multimodal-mcp`** — OpenAI/DALL-E + others. Needs `OPENAI_API_KEY`

## Skill Source
Anthropic skills cloned from: `https://github.com/anthropics/skills.git`
Local cache: `C:/Users/USER/AppData/Local/Temp/skills-repo/`
