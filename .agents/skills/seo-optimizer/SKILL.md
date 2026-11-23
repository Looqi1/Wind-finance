---
name: seo-optimizer
description: Audit and improve crawlability, search snippets, and share previews for public Wind Finance pages on GitHub Pages. Use for metadata, indexing, canonical URLs, sitemap, robots, or Open Graph work.
---

# Wind Finance SEO

- Start with the intended public URL `https://looqi1.github.io/Wind-finance/` and the deployed HTML response. Confirm status, redirects, title, description, language, canonical, indexing directives, and share metadata in the raw response. Compare with rendered public content where relevant. Check the root wrapper and `.github/workflows/deploy-pages.yml` to identify the shipped source. Edit `sitefinance/` for Pages content.
- The frontend uses hash-based navigation for in-app tabs. Do not list tab fragments as independent sitemap URLs or claim they are individually indexed. Keep account, payment, and personal views out of public SEO content. Present Wind Finance accurately as an educational simulator wherever demo content is described.
- Use the actual canonical HTTPS project base path in canonical URLs, sitemaps, and absolute share asset URLs. Verify responses for any referenced files after publication. A robots file under `/Wind-finance/` does not control crawlers for the origin; check the origin-root policy and available hosting controls before proposing a change. Never use robots or indexing metadata as access control.
- Prioritize issues with evidence. Validate changed metadata against the shipped HTML and actual asset paths. Separate technical indexability from actual indexing or ranking, and only report Search Console data if available.
