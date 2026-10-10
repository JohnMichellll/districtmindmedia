# District Mind Media — Two-System Architecture

Last updated: 2026-10-10

## System A — Baseline / Industry-Pattern Copy

This is the conventional publisher stack: CMS/content records, newsroom workflow, search, media library, scheduled site checks, security scanning, analytics, SEO, and editorial review.

### Components
- Content registry and CMS-like records for artists, releases, stories, events, and videos.
- Asset library with source, rights/license, credit, alt text, and canonical subject.
- Scheduled uptime, route, broken-link, image, security, and browser QA checks.
- Search and recommendations based on artist name, genre, release date, and reader activity.
- Editorial draft → source verification → human approval → publish workflow.
- Privacy-conscious analytics and error reporting.

### Strengths
Known pattern, easier to reason about, modular, and appropriate for a small publisher.

### Weaknesses
It can become a collection of disconnected bots; it often detects issues after publishing, depends on manual curation, and can make bad recommendations if source metadata is weak.

## System B — District Mind Media Next / Updated Copy (recommended)

This keeps the proven baseline but adds identity-first data, confidence gates, resilient fallbacks, and feedback loops designed around the failures we have actually seen: blank art, mismatched artist images, flaky third-party sources, dead links, duplicate help/navigation paths, and unverified claims.

### Core design
1. **Canonical Artist Registry:** each artist gets one stable internal key, aliases, official/catalog IDs, and approved profile/catalog URLs.
2. **Asset Provenance:** each asset records subject, source URL, rights/license, credit, identity evidence, and verification timestamp. Unknown owner-owned assets remain clearly pending rather than guessed.
3. **Fail-safe Media Resolver:** use verified local/manifest assets first; use official catalog embeds/links as a fallback; never silently substitute another artist's image.
4. **Media Integrity Sentinel:** scheduled checks validate JSON, URLs, configured image responses, required metadata, production routes, and artist/release identity consistency. Reports warnings separately from hard failures.
5. **Experience QA:** mobile browser checks test navigation, visible media, alt text, page errors, and broken images.
6. **Editorial Confidence Gate:** AI may discover and draft; identity/source/license checks gate publication. Low-confidence results go to review, not live pages.
7. **Repair Loop:** failure → report with exact asset/route → safe retry or known fallback → verify → report result. Automatic code edits/deploys are restricted to deterministic, tested repairs.
8. **Operations Telemetry:** timestamped JSON reports and workflow history provide auditable status instead of claiming "green" without evidence.
9. **Graceful degradation:** if an external catalog is down, keep a useful official link or labeled fallback rather than a blank card.
10. **Privacy and cost guardrails:** start with free scheduled GitHub Actions and public catalog APIs; do not require a paid AI key for core checks; avoid collecting sensitive visitor data.

### Operating rules
- Exact artist identity beats visual similarity.
- Rights and credits must be known before republishing third-party photography.
- Never fabricate artwork, dates, reviews, stats, or ticket availability.
- A blank owner asset is a visible remediation item, not permission to use unrelated imagery.
- A successful workflow means its tested checks passed; it does not prove every visitor device or third-party source is perfect.
- Optional LLMs advise; deterministic tests decide whether basic site checks pass.

## Rollout
- Stage 1: add the media-integrity sentinel and registry (this commit).
- Stage 2: connect every artist/release card to the registry and ensure fallback behavior.
- Stage 3: enrich video, news-source, SEO, search, and analytics checks.
- Stage 4: review metrics and tune thresholds from real failures.

## Scorecard
Track at minimum: routes healthy, configured image URLs healthy, missing owner assets, invalid/missing credits, image mismatches, broken video links, browser errors, mobile overflow, and last successful check time.
