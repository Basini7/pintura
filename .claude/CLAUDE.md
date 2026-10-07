<!-- GSD:project-start source:PROJECT.md -->

## Project

**SGE — SaaS de Gestão para Lojas de Tintas**

SaaS multi-tenant de gestão especializado em lojas de tintas: vendas/PDV de balcão operado por teclado, orçamentos, estoque por filial, compras com importação de XML de NF-e, financeiro (caixa, contas a pagar/receber, crediário), fiscal (NFC-e/NF-e) e gerencial. Construído e validado primeiro numa loja piloto real (SP, Simples Nacional, <10 usuários) que hoje usa o ERP da Max Scala (telas do Control Shop como referência funcional), depois vendido por assinatura a outras lojas.

**Core Value:** Uma loja de tintas consegue operar sua rotina diária (vender no balcão, emitir fiscal, controlar estoque e caixa, receber e pagar) usando apenas este sistema — com dados de cada empresa totalmente isolados e toda operação rastreável.

### Constraints

- **Tech stack**: Backend em Go — escolha do dono técnico (performance, container leve).
- **Deploy**: Cada serviço um container; QA e PROD separados por segurança; local até lançamento, depois VPS barato (Hostinger).
- **Segurança**: Isolamento multi-tenant é inegociável (spec §4).
- **Fiscal**: Piloto em SP, Simples Nacional; NFC-e modelo 65 e NF-e modelo 55. Provedor fiscal via API vs integração direta SEFAZ — decidir na pesquisa.
- **Rastreabilidade**: Auditoria obrigatória em estoque, preços, descontos, cancelamentos, financeiro, fiscal, cadastros (spec §5).
- **Frontend**: Depois da fundação backend; desktop-first com atalhos de teclado.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## 1. Go backend

### Core Technologies

| Technology | Version (as of 2026-09-24) | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Go | 1.22+ (target latest stable, e.g. 1.25.x) | Language/runtime | LOCKED by owner. Go 1.22 is the floor because it's what gives `net/http.ServeMux` method-based routing (`GET /orders/{id}`) and `Request.PathValue` — the baseline every router below builds on. |
| chi (`go-chi/chi/v5`) | v5.3.2 (Aug 2026) | HTTP router | Zero external dependencies, built directly on `net/http.Handler` (not a competing handler signature), so every stdlib-compatible middleware and every `net/http`-based library (OTel instrumentation, pprof, etc.) drops in without adapters. `[MEDIUM]` — cross-checked across multiple 2026 comparison articles. |
| `jackc/pgx/v5` | v5.11.0 (Sep 2026) | PostgreSQL driver | Native Postgres protocol (not `database/sql` generic), first-class support for JSONB/arrays/COPY/LISTEN-NOTIFY, and the fastest Go Postgres driver in every current benchmark (30-50% over GORM). `[MEDIUM]` |
| `sqlc-dev/sqlc` | v1.31.1 (Apr 2026) | SQL → Go codegen | You write plain SQL, sqlc generates type-safe Go structs/queries against it at build time. No ORM runtime, no reflection, no N+1 surprises — every query is a `.sql` file you can `EXPLAIN` yourself. `[MEDIUM]` |
| `pressly/goose/v3` | v3.28.0 (Sep 2026) | DB migrations | Plain versioned up/down SQL files (or Go functions when SQL can't express the change). Matches the expand→migrate→contract discipline already locked in `CONTRIBUTING.md` ("migration aplicada nunca é editada — cria-se nova"). `[MEDIUM]` |
| `go-playground/validator/v10` | v10.30.4 | Struct/DTO validation | The de facto standard — largest adoption, i18n error messages, what most Go frameworks' binding layers use internally. No real competitor at this adoption level. `[MEDIUM]` |
| `log/slog` (stdlib) | Go 1.21+ | Structured logging | Stdlib since 1.21 — structured, leveled, context-aware JSON logging with zero extra dependency. `[Guessing→now Certain given stdlib]` No need for zap/zerolog/logrus at this scale; adding one duplicates what stdlib already does. |
| `testcontainers/testcontainers-go` (+ `modules/postgres`) | v0.44.0 (Aug 2026) | Integration testing | Spins up a real ephemeral PostgreSQL in Docker for tests. **Non-negotiable here**, not a nice-to-have: Row-Level Security policies (see §2) cannot be verified against a mock — you need a real Postgres engine enforcing them to prove tenant isolation actually holds. `[LOW — single official-page fetch, but version/date internally consistent]` |

### Supporting Libraries

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `alexedwards/argon2id` (wraps `golang.org/x/crypto/argon2`) | Password hashing | Use for every stored credential. Enforces the Argon2id variant per RFC 9106's recommendation ("Argon2id … RECOMMENDED as default for all environments"), safe random salt, simple `CreateHash`/`ComparePasswordAndHash` API — no parameter-tuning mistakes to make. `[MEDIUM]` |
| `caarlos0/env` | Env-var → config struct | Pure 12-factor config (env vars only, which is all a single-environment-per-container deploy needs). Struct-tag driven, tiny surface, handles durations/lists/defaults. Skip Koanf/Viper — those solve multi-source config (files + flags + env) you don't have here. `[LOW — not independently verified, but low-risk/reversible pick]` |
| `stretchr/testify` | Test assertions | Companion to stdlib `testing`, not a replacement — `assert`/`require` cut boilerplate in table-driven tests. Ubiquitous enough to count as "boring." |
| `go.opentelemetry.io/otel` | Tracing/metrics SDK | Add starting in Phase 2 (see §9), not day one — instrument HTTP handlers and DB calls once there's more than the pilot tenant to observe. |

### What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| GORM | Runtime reflection overhead, "magic" that makes tenant-scoped queries (the most security-sensitive queries in this app) harder to audit by reading the code. 30-50% slower than pgx in benchmarks. | sqlc + pgx |
| `ent` | Excellent for huge relational graphs and big teams, but steeper learning curve and slower compile times than the payoff justifies for a 3-container app with a lean team. | sqlc + pgx |
| Fiber | Built on `fasthttp`, not `net/http` — breaks compatibility with the wider net/http-based ecosystem (OTel instrumentation, most Go middleware, pgx context patterns). Raw throughput isn't the bottleneck here; a paint-store POS won't be CPU-bound at the HTTP layer. | chi |
| Atlas (migrations) | Declarative "desired state → auto-diff migration" model is powerful but is a second mental model on top of the manual expand/migrate/contract flow already decided. Extra moving part with no matching need yet. | goose |
| zap / zerolog / logrus | Solve a problem stdlib already solves (`log/slog`) since Go 1.21. Adding one is a dependency for marginal micro-benchmark gains this app will never be bottlenecked on. | `log/slog` |

## 2. Database

### PostgreSQL version

### Tenant isolation — recommendation: Row-Level Security + shared schema, `tenant_id` on every row

| Model | Verdict for this project |
|-------|---------------------------|
| **RLS + shared schema (`tenant_id` column, `USING (tenant_id = current_setting('app.tenant_id'))`)** | **Recommended.** Lowest operational overhead, one migration path for all tenants (run `goose up` once, not once per tenant), scales to hundreds/thousands of small stores before any vertical limit forces a change. This is the documented 2026 default for B2B SaaS at this scale. |
| Schema-per-tenant | Rejected for the general case. Migrations must run per schema — fine at 5 tenants, unmanageable (hours of migration time, per-tenant drift risk) once you're past a few dozen. Reserve as an *escape hatch* for one specific large/enterprise customer later, not the default. |
| Database-per-tenant | Rejected as the default. Strongest isolation and cleanest "move this tenant off" story, but highest per-tenant operational cost (connection pooling, migration fan-out, backup fan-out) — that cost only pays off for large/enterprise tenants, and this project's target is "many small stores." |

### Backup / PITR on a single VPS

## 3. Gateway

| Option | Verdict |
|--------|---------|
| **Traefik** | **Recommended.** Native Docker-label service discovery (auto-detects and routes to sibling containers — exactly the "backend, gateway, frontend each a container" shape), and both rate limiting (`ratelimit` middleware, token-bucket) and auth forwarding (`forwardauth` middleware, delegates to an internal auth-check endpoint) are **built into the official binary** — no custom build step. ~200MB RAM, acceptable on a "cheap VPS" that also runs Postgres + backend + frontend. |
| Caddy | Simpler config, smaller footprint (~20MB RAM), automatic HTTPS — genuinely great for a single static site. Rejected here specifically because rate limiting is **not** in the official binary (needs a third-party module via a custom `xcaddy` build), which directly conflicts with "keep it simple" — a custom-compiled proxy binary is more moving parts than Traefik's stock image with a couple of Docker labels. |
| Kong / KrakenD | Full API gateways (plugin pipelines, transformation, DB-less mode) sized for many-service/many-team platforms. This project has 3 containers. Reaching for a gateway framework here is "the most common mistake" the research turned up — using a gateway when a reverse proxy + middleware would do. |
| Custom Go gateway | Rejected — reinventing TLS termination, rate limiting, and forwardAuth in-house is pure yak-shaving against a solved, boring, well-documented problem. |

## 4. Orchestration on a single/few VPS

| Option | Verdict |
|--------|---------|
| **Docker Compose** | **Recommended.** Smallest possible stack: no extra platform service to run, patch, or secure beyond Docker itself and the app containers. `docker compose pull && docker compose up -d` over SSH from the GitHub Actions workflow *is* the deploy mechanism — there's nothing to add. |
| Coolify / Dokploy | Self-hosted PaaS dashboards (git-push deploy, Traefik-managed SSL, one-click services). Both ultimately just wrap `docker compose up -d` under a dashboard + their own DB. For a single/few-VPS deploy already scripted through GitHub Actions, this is an extra platform to operate for a capability (nice UI, multi-node scaling) not needed yet. Dokploy's edge (Swarm-based multi-node scaling) only matters past "a few VPS," which isn't this project's near-term shape. |
| Kamal | Legitimate minimal alternative (zero server-side daemon, SSH-based, YAML config) — closer in spirit to "boring." Not recommended over raw Compose only because CONTRIBUTING.md's CI/CD flow (build `:sha` → deploy QA → tag → retag `:vX.Y.Z` → deploy PROD) is *already* fully specified around Docker images and doesn't need Kamal's app-server conventions layered on top. If the team later wants less custom SSH-script glue, Kamal is the first thing to reach for — not Coolify/Dokploy. |
| Docker Swarm (bare) / k3s | Rejected. Both solve multi-node orchestration and self-healing — problems this project doesn't have on "a cheap VPS." k3s in particular pulls in a full Kubernetes API surface (RBAC, CRDs, controllers) for an app that has 4 containers total across both environments. |

## 5. CI/CD

| Piece | Recommendation |
|-------|-----------------|
| Registry | **GHCR** (`ghcr.io`) — already specified. Free for a private repo on GitHub Free, integrated auth via `GITHUB_TOKEN`, no separate registry account to manage. |
| Release automation | **`googleapis/release-please-action` v4.** Note: development moved from `google-github-actions/release-please-action` (now archived) to `googleapis/release-please-action` — use the new org. Matches the exact "merge → release PR → tag → PROD" flow already in CONTRIBUTING.md. |
| Image scanning | **Trivy** (`aquasecurity/trivy-action`) over Grype. Trivy covers vulnerabilities + secrets + IaC + license scanning in one tool/one Action — broader coverage for one moving part, which matters more here than Grype's ~30-40% raw scan-speed edge. Gate merge/deploy on `HIGH`/`CRITICAL` findings via SARIF upload to GitHub code scanning. |
| Deploy mechanism | **SSH + Docker Compose**, via `appleboy/ssh-action` (or equivalent): the deploy job SSHes into the target VPS, `docker login ghcr.io`, `docker compose pull`, `docker compose up -d` against that environment's compose file. No rebuild on promotion — the QA-tested image is retagged `:vX.Y.Z` and redeployed as-is to PROD, exactly as CONTRIBUTING.md requires ("nunca rebuild na promoção"). |
| Secrets | GitHub Environments (`qa`, `prod`) with environment-scoped secrets (SSH key, DB creds) and required manual approval on the `prod` environment for the tag-triggered deploy — CONTRIBUTING.md already specifies "aprovação manual no environment" for PROD. |

## 6. Brazilian fiscal (NF-e / NFC-e) — verdict: use a fiscal API provider, not direct SEFAZ

### Provider comparison

| Provider | Status / Pricing (fetched 2026-09-24) | NFC-e | Verdict |
|----------|---------|-------|---------|
| **Focus NFe** | Published pricing (focusnfe.com.br/precos): **Retail plan R$59.90/mo** — 1 CNPJ, 500 NFC-e + 100 NF-e included, R$0.05/extra NFC-e. General plans: Solo R$89.90/mo, Start R$113.90/mo, Growth R$548/mo (unlimited CNPJs), Enterprise custom (>50k notes/mo). | Dedicated retail plan, "automatic offline contingency" advertised for NFC-e. | **Recommended for the pilot.** The Retail plan is priced and scoped exactly for a single-store retail POS — cheapest entry point that still leaves a clear upgrade path (Growth/Enterprise) as more stores onboard. |
| **Nuvem Fiscal** | **Discontinued.** Official shutdown notice 2026-04-22, service ended 2026-07-31 — already dead as of today (2026-09-24), despite still appearing in older "top 5 fiscal APIs" articles. | N/A | **Disqualified.** Do not build against this provider under any circumstance; it will not exist by the time this ships. |
| PlugNotas / TecnoSpeed | REST/JSON API, NF-e + NFC-e + NFS-e + CT-e + MDF-e supported. Pricing is sales-contact only (not published), so could not be verified against Focus NFe's transparent published pricing. | Yes (dedicated NFC-e docs/module). | Credible fallback/second quote — TecnoSpeed is an established, long-running Brazilian fiscal-integration vendor (their ACBr-adjacent ecosystem is widely used), but the lack of published pricing means it can't be cost-compared here without a sales call. Worth an actual quote before committing. |
| WebmaniaBR | REST API; notably ships **official client SDKs in Go, Node, PHP, Java** (`github.com/webmaniabr`). Pricing not published/verified. | Yes. | Interesting for the Go SDK specifically (easy client-side integration), but confirmed the SDK is a thin wrapper around WebmaniaBR's *own hosted* signing/SEFAZ service — it is not a path to owning the signing/SEFAZ logic yourself, it's just a nicer-typed Focus-NFe-equivalent client. Second-tier candidate pending a price quote. |
| NFE.io | Not independently verified in this pass (search results didn't surface published pricing or NFC-e specifics) — treat as unverified `[Guessing]` until quoted directly. | Unverified | Not enough data to rank; get a quote if Focus NFe's terms don't work out. |

### Direct SEFAZ integration from Go — not recommended

### Reforma Tributária (IBS/CBS) readiness — time-sensitive, not optional

## 7. NF-e inbound XML parsing (compras) + manifestação do destinatário

- **Parsing:** Go's `encoding/xml` (stdlib, struct-tag based unmarshal) is sufficient for NF-e layout 4.00's nested/namespaced XML — this is exactly what the small community Go NFe projects found in §6 build on internally. Model the relevant subset of the NFe XSD (not the whole schema) as Go structs; a generator like `zek` can bootstrap the struct tags from a sample XML if hand-modeling gets tedious.
- **Byte-preservation caveat:** if any code path needs to re-verify or re-serialize a signed NF-e (rather than just read fields out of it), the digital signature covers the *exact original byte sequence* — a naive parse→reserialize round-trip will invalidate it. For this project's actual need (read incoming supplier NF-e to update estoque/custo/contas a pagar), treat XML as read-only and never round-trip it.
- **Manifestação do destinatário / Distribuição DF-e:** the SEFAZ-side flow is: poll the national `NFeDistribuicaoDFe` webservice using the last processed NSU (returns up to 90 days of notes if no NSU given) → for each new NF-e, submit the recipient's manifestação (Ciência da Operação, then later Confirmação/Desconhecimento/Operação não Realizada) via `NFeRecepcaoEvento` → once manifested, the full XML becomes downloadable in the same distribution query.
- **Practical recommendation:** don't hand-roll this SOAP/XML flow either. A fiscal API provider (Focus NFe and equivalents typically expose distribution + manifestação as a plain REST endpoint) is the same "buy, don't build" call as §6, applied to the inbound direction — one fewer SEFAZ integration surface to maintain in-house.

## 8. Auth — recommendation: in-house session-based auth, not JWT, not an off-the-shelf IAM

| Option | RAM footprint | Verdict |
|--------|---------------|---------|
| Keycloak | Java/Quarkus, ~2GB minimum for the container alone (4GB system RAM sensible if it shares the VPS with its own Postgres) | Heaviest of the three; rejected — the resource cost alone conflicts with "cheap VPS." |
| Zitadel | Go-native, meaningfully lighter than Keycloak, purpose-built for multi-tenant/OIDC/passkey SaaS | Best *of the IAM options*, but still a fully separate stateful service + its own database to operate, patch, and back up alongside backend/gateway/frontend/Postgres. |
| Ory (Kratos/Hydra/Keto/Oathkeeper) | Headless by default, multiple separate microservices | Most integration effort of the three — wiring several services into one cohesive login flow is real work, not a shortcut. |
| **In-house** (`net/http` handlers + `argon2id` + Postgres sessions table + RBAC tables) | One more table set in the existing Postgres — no new service | **Recommended.** None of the three IAM products natively model this project's specific authorization shape (per-company **and** per-branch scoping, plus a step-up "admin password" re-auth on specific in-app actions) — that logic has to be hand-built in the app regardless of which IAM sits underneath, so an off-the-shelf IAM buys mainly login/session plumbing while adding an entire extra service to run. Given `argon2id` + Go's stdlib `crypto/rand` + a sessions table covers that plumbing in a few hundred lines, this is the "lazy but secure" call: skip the extra service, don't skip the crypto. |

## 9. Observability on a budget — phased, not all at once

- **Logs:** `log/slog` JSON output to stdout from every container → `docker compose logs` / a lightweight log viewer like Dozzle for humans tailing logs. No log-shipping pipeline yet.
- **Uptime:** **Uptime Kuma** — single Docker container, SQLite-backed, HTTP/TCP/ping checks + a built-in status page. Right-sized for "is QA/gateway/PROD/Focus NFe up" with a handful of endpoints; its known limits (SQLite lock contention past hundreds of monitors, single check location) are irrelevant at this scale.
- **Tracing/metrics:** skip entirely for now. A single pilot store generates too little traffic for tracing to earn its operational cost.
- Instrument with the **OpenTelemetry Go SDK** (`go.opentelemetry.io/otel`) — vendor-neutral, so this doesn't lock in a backend choice early.
- For storage/visualization, avoid standing up the full Grafana LGTM stack (Loki+Grafana+Tempo+Mimir — genuinely four services to run/scale/patch) on a small VPS. Prefer **VictoriaMetrics** (single lightweight binary, explicitly designed to run fine on one small VPS) + Grafana for dashboards, or an all-in-one option like **OpenObserve** (logs+metrics+traces in one compact single-node deployment) if unifying into one service matters more than Grafana-ecosystem polish.

## 10. Frontend (later, desktop-first keyboard-heavy POS) — short recommendation

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `jackc/pgx/v5` v5.11.0 | PostgreSQL 18, `sqlc` v1.31.1 (pgx driver mode) | sqlc generates code targeting pgx's v5 API directly; keep both on `v5.x`, don't mix a v4-generated client with pgx v5. |
| `go-chi/chi/v5` v5.3.2 | Go 1.22+ | Chi's `Request.PathValue`-based routing relies on the Go 1.22 stdlib mux additions. |
| `testcontainers-go` v0.44.0 | Docker Engine on the CI runner/dev machine | GitHub Actions' `ubuntu-latest` runners have Docker preinstalled; no extra CI setup needed. |
| Traefik v3.7.13 | Docker Compose label-based discovery | v3's label syntax differs from v2 — don't copy v2-era label examples from older tutorials. |

## Sources

- pkg.go.dev — `go-chi/chi/v5`, `jackc/pgx/v5`, `pressly/goose/v3`, `testcontainers-go` — version/publish-date verification, fetched directly (2026-09-24)
- focusnfe.com.br/precos — official pricing page, fetched directly (2026-09-24)
- projetoacbr.com.br forum + multiple contabilidade/legal blogs — Nuvem Fiscal shutdown notice, cross-verified (2026-09-24)
- postgresql.org/about/news, postgresql.org/docs/release — PostgreSQL 18 release notes
- traefik.io official docs — ratelimit/forwardAuth middleware reference
- github.com/webmaniabr/NFe-Go — repo inspection (SDK vs direct-SEFAZ confirmation)
- github.com/frones/nfe — repo inspection (maintenance-status check)
- Multiple 2026 web comparison articles (chi/echo/fiber/gin, sqlc/GORM/ent, goose/atlas/golang-migrate, RLS/schema/db-per-tenant, pgBackRest/WAL-G/pg_dump, Traefik/Caddy/Kong/KrakenD, Compose/Coolify/Dokploy/Kamal, Trivy/Grype, Keycloak/Zitadel/Ory, LGTM/VictoriaMetrics/OpenObserve, React/Svelte/SolidJS) — cross-checked via multiple independent results per topic, `[MEDIUM]` confidence per this project's source-hierarchy classification
- Legal/tax blogs (mrsadvogados.com, migalhas.com.br, blog.tecnospeed.com.br) — Nota Técnica 2025.002 IBS/CBS timeline, cross-verified across independent sources

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
