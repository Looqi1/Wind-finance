---
name: performance-optimizer
description: Measure and improve Wind Finance loading, rendering, asset weight, and responsiveness. Use for frontend performance audits, slow interactions, or before-and-after comparisons.
---

# Wind Finance performance

- Establish a baseline before editing. Use the same build, device profile, cache state, network conditions, and data mode for comparisons. Measure the initial auth screen, entry to demo, or the exact slow tab separately. Record cold loads and warm navigation when both matter. Use a browser trace, network waterfall, or resource timing and report actual metric definitions and units. Keep single-run lab results distinct from real-user data.
- Inspect `sitefinance/index.html`, `style.css`, `script.js`, and `assets/` for the bottleneck. Check if the delay is HTML/CSS/JS, external scripts, asset decoding, layout or animation work, or API latency. Review view-gated fetching in `onAppView` when off-screen requests are involved. Inspect the Pages workflow for asset versioning and snapshot generation before changing cache behavior.
- Prefer one change tied to the measured cause. Defer optional work until its tab or interaction needs it, keep required auth initialization ordered, and avoid preloading decorative assets without evidence. Preserve first-render content, accessible interactions, reduced-motion behavior, and the local market snapshot used in Pages demo mode. Measure actual transfer size separately from on-disk file size.
- Retest the same conditions and impacted flows. Run `python3 -m pytest -q frontend/tests` from the root for frontend changes. Report baseline, result, measurement limits, and any quality or behavior tradeoff. Treat unmeasured gains as hypotheses.
