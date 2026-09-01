# Editing the portfolio

[Back to README](../README.md)

## A deliberate editing flow

Start the local HTTP server from the repository root and open `http://127.0.0.1:8000/admin/`.

| Admin section    | What changes here                                              |
| ---------------- | -------------------------------------------------------------- |
| Overview         | Workspace counts and shortcuts                                 |
| Work library     | Add, edit, duplicate, order, or remove projects                |
| Profile          | Name, role, focus, school, introduction, and about text        |
| Learning         | Skill groups and roadmap entries                               |
| Appearance       | Site title, description, default theme, pagination, and motion |
| Publish & backup | GitHub connection, commit, export/import, and recovery         |

Project, profile, and appearance forms have explicit **Save draft** buttons. Learning fields save when a changed field loses focus. **Preview draft** displays the introduction and public project cards with detail dialogs; it is not a preview of every page. Use `/docs/` to check the complete site after exporting public JSON into the local repository.

The editor saves its workspace in browser storage. That is convenient, not a durable backup. Export important work before clearing browser data or changing computers.

## Projects and visibility

- A new project starts as a **local draft**. Check **Include on the public website** when ready.
- Public projects may be marked **Featured**. Home shows the first three featured projects in library order, or the first three public projects when none are featured.
- Move arrows change the curated order. Duplicates get a new ID and start unpublished.
- Project title and full description are required. IDs must be unique.
- Live, repository, documentation, and cover URLs are optional. Use full HTTPS addresses.
- Use the role field to describe your actual contribution, especially for team projects.

Only unpublished **projects** have draft-only visibility. Profile, skills, settings, and roadmap fields are part of public content whenever published.

Do not treat unpublishing as erasing history: a previously committed project may remain visible in Git history, earlier deployments, or copies.

## Option A: publish with Git, without a browser token

1. Update the local repository with `git pull --ff-only` before starting file edits. Preserve uncommitted work first.
2. Edit and save the workspace. Export a workspace backup if it contains important drafts.
3. In **Publish & backup**, choose **Export public JSON**.
4. Replace `docs/assets/data/portfolio.json` with that downloaded `portfolio.json` file. Do **not** use the workspace backup as public JSON.
5. Open `/docs/` locally and review the result.
6. Inspect `git diff -- docs/assets/data/portfolio.json`, then commit and push only the reviewed file:

```bash
git add docs/assets/data/portfolio.json
git commit -m "Update portfolio library"
git push origin main
```

Wait for GitHub Pages to deploy. Exporting a file alone does not publish anything.

## Option B: publish from the local editor

Create a GitHub **fine-grained personal access token** in your own GitHub settings. Restrict it to `Jardeleza0921/KLIGHTTEN-PORTFOLIO` with **Contents: Read and write**; required Metadata read access is automatic. Set a short expiration. No Actions or Workflows write permission is needed for this JSON-only publisher.

Do not paste the token into chat, source files, screenshots, or backups.

1. Open **Publish & backup**, enter the token, then select **Connect GitHub**.
2. The editor verifies the owner account and compares GitHub’s public JSON with the workspace’s starting version.
3. If they differ, export your current workspace before choosing **Load GitHub version**. That action replaces public draft edits while retaining unpublished local projects with noncolliding IDs. It is not an automatic merge.
4. Edit, save, and preview. Select **Publish public JSON** and confirm the project count and repository.
5. Check the repository’s **Actions** tab for deployment success.
6. Select **Disconnect** when finished. Refreshing also forgets the token.

Publishing uses GitHub’s [Contents API](https://docs.github.com/en/rest/repos/contents). A SHA check prevents overwriting newer remote changes, including a change between the final check and upload. If GitHub changes, keep a backup, load the new version, and reapply the intended edits. Do not bypass a permission or branch-protection failure.

After browser publishing, run `git pull --ff-only` before making further terminal edits. The browser cannot write to your local clone. If the network drops during publishing, check GitHub before retrying: a commit may have succeeded even if its response did not reach the editor.

## Backups and recovery

**Download workspace backup** exports profile, settings, skills, roadmap, and all projects, including unpublished ones. Keep it outside the repository. The supplied `.gitignore` ignores the default backup filename, but renamed backups could still be committed accidentally.

**Import backup** accepts version-4 JSON and the old JSON-based `window.KLIGHTTEN_PORTFOLIO = {...};` export. It parses data only; it never executes uploaded JavaScript. Importing older data may restore old project URLs and default some new fields—review them before publishing.

**Discard local draft** restores the public JSON in your local clone and removes unpublished drafts from the workspace. Export a backup before using it. This does not revert GitHub.

## Limits

This is a single-owner editor. Use one editing tab at a time. Browser storage is isolated by host/port, is not encrypted by this app, and is not a substitute for backups. See [SECURITY.md](SECURITY.md) for the complete boundary.
