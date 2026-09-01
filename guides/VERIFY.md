# Verification checklist

[Back to README](../README.md)

## Automated checks

The test suite uses Node’s built-in test runner and does not contact GitHub. Use Node.js 22.7+ for native ES-module detection:

```bash
node --test tests/*.test.mjs
```

It checks schema migration, public-draft separation, URL validation, GitHub token lifecycle, Unicode encoding, conflict handling, content consistency, and the public folder boundary.

## Real-browser checks before deployment

Serve the repository locally and open `/docs/` and `/admin/`. Check at both desktop and narrow mobile widths. These checks are separate from unit tests; passing code tests is not proof of visual quality.

- Home displays project totals and three selected works.
- Work search, category/status filters, sorting, clear button, and pagination work together.
- Project dialogs open/close with the keyboard and return focus appropriately.
- Four themes switch without losing readability; the public preference survives refresh.
- About displays profile text, skills, and every roadmap entry.
- No horizontal overflow at 360px width; long text and missing image URLs are handled.
- Reduced-motion preferences disable transitions and smooth scrolling.
- Every admin section is reachable without exposing all forms at once.
- Add a **temporary local draft**, save it, refresh, and confirm it is restored.
- Preview excludes that unpublished draft. Public export excludes it; workspace backup includes it.
- Profile and Appearance require Save; Learning changes save on leaving the changed field.
- No GitHub publishing is possible while disconnected. Do not use a real token for routine UI tests.
- Export a backup before testing import/reset/delete behavior.
- Browser console shows no uncaught errors or failed local asset requests.

## Pages boundary check

For a local approximation of Pages, serve only `docs/` on a second port:

```bash
python3 -m http.server 8001 --bind 127.0.0.1 --directory docs
```

Visit `http://127.0.0.1:8001/` and confirm `/admin/` and `/manage.html` return 404. The root server used for local editing intentionally has a different document root.

After a real Pages deployment, repeat the public checks at the repository’s Pages address and verify the deployed commit in Actions. Direct GitHub publishing needs a separate owner-authorized end-to-end check; the automated publisher tests use mock responses only.
