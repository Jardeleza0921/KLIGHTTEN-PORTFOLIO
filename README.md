# Klightten Portfolio

The professional, editable work library of **Jaru Iori N. Jardeleza**. It is built with plain HTML, CSS, and JavaScript, so it stays fast, portable, and easy to host on GitHub Pages or Netlify.

## Public links

- Live portfolio: https://jardeleza0921.netlify.app/
- GitHub repository: https://github.com/Jardeleza0921/KLIGHTTEN-PORTFOLIO
- GitHub Pages (after enabling Pages): https://jardeleza0921.github.io/KLIGHTTEN-PORTFOLIO/

## Edit and publish inside the website

Open `manage.html` from the hosted site. The manager supports:

- adding, editing, duplicating, deleting, featuring, hiding, and reordering projects;
- local draft saving and JSON backups;
- loading the latest published library from GitHub; and
- publishing the edited library directly to GitHub with a real commit.

### One-time GitHub token setup

Create a **fine-grained personal access token** at https://github.com/settings/personal-access-tokens/new with these settings:

1. Repository access: **Only select repositories** → `KLIGHTTEN-PORTFOLIO`.
2. Repository permission: **Contents** → **Read and write**.
3. Choose a reasonable expiration date and generate the token.
4. Paste it only into the GitHub Publishing panel on `manage.html`.

The token is never included in this repository or in exported portfolio data. The manager keeps it in browser `sessionStorage`, which is scoped to the current site and browser tab session. Use **Forget token** when editing on a shared device.

## GitHub Pages

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder, then save.

Every library update published from `manage.html` commits `assets/portfolio-data.js`. GitHub Pages redeploys the branch automatically. Because the Netlify site is connected to the same repository, Netlify can redeploy from the same update as well.

## Open locally

From the repository folder:

```bash
python3 -m http.server 8000
```

Then open:

- Portfolio: http://127.0.0.1:8000/
- Manager: http://127.0.0.1:8000/manage.html

The direct GitHub publisher requires internet access. Local project editing and data export continue to work offline.

## Main files

- `index.html` — public portfolio
- `manage.html` — private editing workspace
- `assets/portfolio-data.js` — published portfolio content
- `assets/portfolio-app.js` — themes, filters, project rendering, and local draft storage
- `assets/portfolio-manager.js` — project editor
- `assets/github-publisher.js` — direct GitHub loading and publishing
- `assets/portfolio.css` — public and manager design system
- `assets/manager-pro.css` — publishing workspace styles

## Security notes

- Never write a GitHub token into an HTML or JavaScript file.
- Use a fine-grained token restricted to this repository only.
- Give it only **Contents: Read and write** permission.
- Revoke the token immediately from GitHub settings if it is ever exposed.
- The manager page includes `noindex` metadata, but its real protection is the repository-limited token—not secrecy of the URL.
