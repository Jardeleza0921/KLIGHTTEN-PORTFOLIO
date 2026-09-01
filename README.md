# Klightten Portfolio

### Jaru Iori N. Jardeleza

Learning in public. Building with purpose.

I’m a BSIT student at Pateros Technological College and an aspiring cloud engineer. Klightten is my growing collection of cloud, Linux, web, mobile, database, and AI projects. This repository is both my portfolio and a place to understand how a website works—from its page structure to the content it publishes.

**HTML · CSS · JavaScript · JSON · GitHub Pages**

[Portfolio address](https://jardeleza0921.github.io/KLIGHTTEN-PORTFOLIO/) · [My GitHub](https://github.com/Jardeleza0921) · [Setup guide](guides/SETUP.md) · [Code walkthrough](guides/LEARNING.md)

> The portfolio address becomes available after GitHub Pages is configured to publish `main` → `/docs`. There is no Netlify dependency, npm build, framework, database, or application server.

## Why I keep this project simple

I want to be able to open a file, understand its purpose, and recreate it as I learn. The public portfolio is separate from the editing workspace. Content lives in one JSON file, visual decisions live in CSS, and behavior lives in JavaScript modules.

The work library records progress honestly: experiments, academic work, prototypes, and releases can exist together without pretending every project is finished.

## The public portfolio

- **Home:** introduction, current focus, project totals, and three selected works.
- **Work:** searchable library with category/status filters, sorting, pagination, and project details.
- **About:** profile, learning tools, and a progress roadmap.
- Four Klightten themes: Neon Arcade, Classic Green, Black & White, and Red Hat.
- Responsive layouts, keyboard focus styles, native dialogs, and reduced-motion support.
- No advertising, analytics scripts, external fonts, or runtime framework.

## The separate editing workspace

The admin has six sections: Overview, Work library, Profile, Learning, Appearance, and Publish & backup. It supports adding, editing, duplicating, ordering, and removing projects; local unpublished drafts; public previews; JSON backups; and optional direct publishing to GitHub.

**The admin runs locally, not on GitHub Pages.** Only `docs/` is deployed. There is no public admin link and no JavaScript username/password screen pretending to protect a static website.

The admin source is still readable in this public repository. GitHub authorization—not a hidden URL—controls who can update the published content. See the [security model](guides/SECURITY.md).

## Repository map

| Path                              | Responsibility                               | Published on Pages? |
| --------------------------------- | -------------------------------------------- | ------------------- |
| `docs/index.html`                 | Home page                                    | Yes                 |
| `docs/work.html`                  | Work library                                 | Yes                 |
| `docs/about.html`                 | Profile and learning journey                 | Yes                 |
| `docs/404.html`                   | Missing-page response                        | Yes                 |
| `docs/assets/css/`                | Shared themes and public layouts             | Yes                 |
| `docs/assets/js/`                 | Content schema and public rendering          | Yes                 |
| `docs/assets/data/portfolio.json` | Public portfolio content                     | Yes                 |
| `docs/assets/images/`             | Site imagery and favicon                     | Yes                 |
| `admin/`                          | Local editor and GitHub publishing client    | **No**              |
| `guides/`                         | Setup, editing, security, and learning notes | No                  |
| `tests/`                          | Optional developer checks                    | No                  |

Everything under `docs/` should be safe for anyone to download. Never put tokens, passwords, workspace backups, or private notes there.

## Run on my computer

From a clone of this repository:

```bash
cd "$HOME/GITHUB REPOSITORIES/KLIGHTTEN-PORTFOLIO"
python3 -m http.server 8000 --bind 127.0.0.1
```

Open these addresses in the same computer’s browser:

- Public preview: `http://127.0.0.1:8000/docs/`
- Local editor: `http://127.0.0.1:8000/admin/`

Press `Ctrl+C` in the terminal to stop the server. Python only serves existing static files for local development; it is not part of the deployed website. Opening an HTML file directly with `file://` will not load JSON and modules correctly.

## Publish on GitHub Pages

In the repository, open **Settings → Pages**:

1. Set **Source** to **Deploy from a branch**.
2. Choose **main**, then **/docs**. Do not choose the repository root.
3. Save and wait for the Pages deployment in **Actions** to succeed.
4. Visit the portfolio address and verify that `/admin/` and `/manage.html` are unavailable.

The [setup and migration guide](guides/SETUP.md) covers moving from the previous Netlify version and checking the finished deployment.

## Update content

I can choose either workflow:

| Workflow                     | Steps                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Git, without a browser token | Edit locally → export **public JSON** → replace `docs/assets/data/portfolio.json` → inspect `git diff` → commit and push |
| Browser editor with GitHub   | Edit locally → preview → connect an owner-only fine-grained token → check/load GitHub’s current version → publish        |

The browser publisher commits only the public JSON file on `main`. It does not upload admin or backup files. It checks the current file SHA before updating and refuses to overwrite a newer GitHub version.

After publishing through the browser, run `git pull --ff-only` in the local repository before editing files with Git. Browser publishing updates GitHub, not files on my disk.

[Complete editing instructions →](guides/EDITING.md)

## Learn and maintain

Start with [LEARNING.md](guides/LEARNING.md) for the reading order and small exercises. Use [CONTENT.md](guides/CONTENT.md) for the JSON fields and limits.

Optional automated checks require Node.js 22.7+; Node is **not** required to run the website or editor:

```bash
node --test tests/*.test.mjs
```

Read the [verification checklist](guides/VERIFY.md) before publishing layout or editor changes.

## Boundaries I want to keep clear

- This is a single-owner static portfolio, not a multi-user CMS.
- A local draft is not published until I explicitly commit it.
- Browser storage can be cleared; important drafts need an exported backup outside this repository.
- Removing a published project does not remove it from Git history or previous deployments.
- GitHub commits and Pages deployments are separate events; a successful commit does not prove deployment succeeded.
- Search-engine previews may use the static metadata in each HTML file; I update that metadata when changing the site’s identity.

## Next improvements

- Add project screenshots and more detailed case studies.
- Record my own contribution clearly for each team project.
- Expand cloud project notes as the infrastructure develops.
- Improve the interface based on keyboard, mobile, and real-device testing.

---

Maintained by **Jaru Iori N. Jardeleza** · **Klightten**

This repository documents my work and my learning process. Project descriptions distinguish personal practice, academic work, and team projects where those details are known.
