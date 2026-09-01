# GitHub-only setup and migration

[Back to README](../README.md)

## 1. Protect existing work

Before migrating, export any drafts from the old manager. Keep that backup outside the repository. Do not commit tokens, passwords, Netlify environment variables, or private workspace exports.

In the local clone, run:

```bash
cd "$HOME/GITHUB REPOSITORIES/KLIGHTTEN-PORTFOLIO"
git status
```

If there are uncommitted changes, review and preserve them first. Do not overwrite them with a ZIP or patch. With a clean working tree, update using `git pull --ff-only`.

This edition replaces the old root `index.html`, `manage.html`, `assets/` scripts, and Netlify authentication configuration. Their earlier versions remain in Git history. The existing ten-project library is migrated into `docs/assets/data/portfolio.json`.

If using the migration patch, first run `git apply --check` against the downloaded file. Only apply it if that check succeeds. A failure means the local source differs; do not force it.

## 2. Preview locally

From the repository root:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/docs/` for the public preview and `http://127.0.0.1:8000/admin/` for the editor. Keep the terminal running while editing.

Use the same host and port each time. `localhost:8000` and `127.0.0.1:8000` have separate browser storage. A workspace backup lets you move drafts between them.

This local-only admin cannot be opened from a phone’s browser on another device. For occasional phone updates, edit the public JSON using GitHub’s own signed-in file editor. Do not put the admin into `docs/` to make it accessible.

## 3. Commit the migration

Inspect the changed files before staging:

```bash
git diff --stat
git diff --check
git status
```

Make sure no private exports or unrelated files are included. Commit the reviewed migration and push it to `main`. Do not force-push.

## 4. Configure Pages

Open the repository’s **Settings → Pages → Build and deployment**.

| Setting        | Value                                                  |
| -------------- | ------------------------------------------------------ |
| Source         | Deploy from a branch                                   |
| Branch         | main                                                   |
| Folder         | /docs                                                  |
| Public address | `https://jardeleza0921.github.io/KLIGHTTEN-PORTFOLIO/` |

Choose **Save**. Check **Actions** for the Pages deployment result. This setup does not need a custom workflow, build command, Netlify integration, or environment variable.

If the repository already uses a different Pages source/workflow, review it before switching; only `docs/` should be deployed. A repository-root deployment would expose additional source files and is not this project’s intended setup.

GitHub documents branch and `/docs` publishing in its [Pages configuration guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## 5. Check before retiring Netlify

- Home, Work, and About load from GitHub Pages.
- Images, styles, themes, filters, and project details work.
- The published JSON contains no unpublished projects or credentials.
- `/KLIGHTTEN-PORTFOLIO/admin/` and `/KLIGHTTEN-PORTFOLIO/manage.html` return a missing-page response.
- The README’s portfolio link opens the correct site.
- An update to public JSON creates a successful new Pages deployment.

Only then remove the old Netlify portfolio deployment if it is no longer needed. This repository does not delete any Netlify project. The EqualLearn project’s external Netlify link remains a project reference, not a dependency of this portfolio.

If Netlify was already deleted, the local site still works; complete the GitHub steps above to restore public access. Existing `netlify.app` links will not automatically redirect after deletion.

## Troubleshooting

| Symptom                                        | Check                                                           |
| ---------------------------------------------- | --------------------------------------------------------------- |
| Blank library after opening HTML               | Use the local HTTP server, not `file://`                        |
| JSON returns 404 locally                       | Start the server from the repository root                       |
| Pages returns 404                              | Push the migration; choose `main` + `/docs`; inspect Actions    |
| Only the old site appears                      | Confirm deployment commit and Pages source; refresh the browser |
| Admin is unavailable on Pages                  | Expected: the editor is local-only                              |
| Local admin draft seems missing                | Use the same host, port, and browser profile or import a backup |
| Browser publish succeeds but local JSON is old | Run `git pull --ff-only` before terminal edits                  |
| Git rejects a push                             | Review remote changes; never force-push to bypass them          |
