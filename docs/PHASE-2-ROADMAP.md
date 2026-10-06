# District Mind Media — Phase 2 Expansion Roadmap

This branch is the planning/work track for the next stage. Production remains on `main`.

## Restore / disaster recovery
- Stable restore point: `backup/stable-2026-10-06`
- Production source: `main`
- Never delete the stable backup when replacing production.
- Before major architecture changes, create another dated backup branch/tag.
- Keep deployable releases identifiable by commit history.

## Phase 2 priorities

### 1. Business-grade reliability
- Production/preview separation.
- Required QA gates before production deploys.
- Health monitoring and incident alerts.
- Automated rollback path to the last known-good release.
- Regular repository backups outside the primary working branch.

### 2. Editorial intelligence
- National hip-hop/R&B/news/culture coverage first.
- Radar: breaking stories, drama, artist moves, viral moments, style, interviews and smaller culture signals.
- Local Watch: opt-in state/city discovery; never let one state dominate the national homepage.
- Human editorial approval for high-risk claims.
- Source provenance, timestamps, deduplication and stale-story controls.

### 3. Artist Intelligence Hub
- Search any artist.
- Artist identity/photo/artwork matching.
- Discography and release intelligence.
- Contextual article discovery.
- John Michell / District Mind Records pages remain first-class and correctly mapped.

### 4. Wayfinder
- Location-aware discovery.
- Upcoming shows and touring artists.
- Local culture briefs.
- Ticket/source links.
- “Born where you live” and artist discovery concepts.
- Privacy-first voluntary location entry.

### 5. District Mind Academy
- Free-first Academy 001 landing experience.
- Email/access capture.
- Training/video architecture.
- Paid products only after the audience and curriculum are ready.

### 6. Revenue infrastructure
- Sponsorship/advertising inventory.
- Artist promotion packages.
- Festival/concert/media partnerships.
- Production/photo/video services.
- Merchandise and future District Mind ecosystem integrations.
- Analytics that measure real business outcomes without compromising visitor trust.

### 7. Million-dollar-company architecture
When revenue becomes substantial:
- Separate production, editorial, business and private operations systems.
- Stronger access controls and least-privilege credentials.
- Independent backups and disaster recovery.
- Accounting/tax/legal workflows.
- Contracts, rights management and licensing records.
- Custom domain + professional email.
- CDN/WAF/bot protection and deeper observability.
- Database/content platform only when scale justifies the added complexity.

## Non-negotiable product rules
- District Mind Media is an independent editorial/media brand.
- The website must never imply ChatGPT is the operator or owner.
- No arbitrary self-modifying production bot.
- Bots may detect, test, report and apply only predefined safe repairs; risky changes go through review.
- Never intentionally take production down.
- Do not publish unverified allegations as fact.
- Preserve source links and rights/provenance for imagery and reporting.

## Current protection stack
- Cloudflare Pages.
- Security response headers via `_headers`.
- GitHub CodeQL.
- Dependabot.
- Site defense checks.
- Browser first-impression QA.
- Production health/security monitoring.
- Newsroom operator and reporting/telemetry.
- Radar + Local Watch data separation.

## Definition of “Phase 2 ready”
Production is stable, a known-good restore point exists, automated checks are passing, monitoring is active, and the next feature can be developed without risking the public site.
