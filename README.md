# Klightten Portfolio

An editable, data-driven portfolio and growing library of work built with plain HTML, CSS, and JavaScript. No framework or build command is required.

## Open it locally

1. Keep every file and the `assets` folder together.
2. Open `index.html` in a modern browser.
3. Open `manage.html` to add, edit, duplicate, delete, feature, or reorder works.

The manager stores your draft in that browser's local storage. It does **not** directly edit the files on your computer, GitHub repository, or hosted site.

## Publish an edited library

1. Make your changes in `manage.html`.
2. Select **Export data file**.
3. Replace `assets/portfolio-data.js` with the downloaded file.
4. Refresh `index.html` and verify the public portfolio.
5. Upload or commit the complete website folder again.

Use **JSON backup** before large edits. You can import either a JSON backup or an exported `portfolio-data.js` file into the manager.

## Customize it directly

- Portfolio content and works: `assets/portfolio-data.js`
- Themes and layout: `assets/portfolio.css`
- Public library behavior: `assets/portfolio-app.js`
- Manager behavior: `assets/portfolio-manager.js`
- Public page structure: `index.html`
- Manager structure: `manage.html`

The included themes are **Neon Arcade** (default), **Classic Green**, **Black & White**, and **Red Hat**. The selected theme is remembered in the browser.

## GitHub Pages

1. Create a GitHub repository and place the contents of this folder at the publishing root. `index.html` must remain at the root.
2. Commit and push the files to your default branch.
3. In the repository, open **Settings → Pages** and choose the branch and root folder as the publishing source.
4. Save and wait for GitHub to show the public URL.

The included `.nojekyll` file tells GitHub Pages to serve the project as plain static files.

Official guide: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Netlify

1. Sign in and open https://app.netlify.com/drop.
2. Drag this folder or its ZIP file into Netlify Drop.
3. For updates, replace `assets/portfolio-data.js` after exporting, then drag the updated folder into the site's deploy area.

Official guide: https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/

## Important limitation

This is a static site. The manager is intentionally local and has no account system or shared database. That keeps public visitors from changing your hosted library, but publishing still requires replacing the exported data file and redeploying the site.
