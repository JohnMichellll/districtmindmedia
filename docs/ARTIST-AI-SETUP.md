# Artist Intelligence: AI and privacy setup

The Artist Hub uses catalog results as the source of truth and AI only to summarize verified catalog data and current source-linked headlines. AI must not invent an artist, track, release date, or news item.

## Enable Cloudflare Workers AI for Pages Functions

1. Open the Cloudflare dashboard and select the Pages project `district-mind-media`.
2. Open **Settings → Functions → Workers AI bindings** (the exact section label can vary).
3. Add a binding named **AI** and save it for the production environment. Add it to Preview too if preview builds should use AI.
4. Redeploy the latest `main` commit, then test:
   - `/api/artist-intel?q=Ray%20Charles`
   - `/api/artist-intel?q=Drake`
5. Confirm the JSON contains `"aiEnabled": true` and `"aiSource": "Cloudflare Workers AI"` (or `"xAI"` if the configured xAI key is used).

The code supports an existing `XAI_API_KEY` as a fallback. If neither AI provider is configured or available, catalog search still works, but the response explicitly marks AI analysis unavailable instead of pretending that generated analysis ran.

## Viewer privacy

- The Artist Hub does not require an account.
- Search results are not written to a site profile or database by this feature.
- API responses use `Cache-Control: no-store`; the browser-side query cache was removed.
- Queries are sent to Apple/iTunes catalog search and Google News RSS; an enabled AI provider receives the artist name, a limited catalog sample, and source-linked headlines to create the summary. External providers may process requests under their own terms.
