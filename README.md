# KLIGHTTEN Portfolio

### Jaru Iori N. Jardeleza

Learning in public. Building with purpose.

My personal portfolio and growing library of cloud, Linux, web, mobile, database, and AI projects. Built with plain HTML, CSS, and JavaScript, Klightten brings together my work, learning progress, and direction as a BSIT student and aspiring cloud engineer.

[View the portfolio](https://jardeleza0921.github.io/KLIGHTTEN-PORTFOLIO/) · [GitHub profile](https://github.com/Jardeleza0921)

## Features

- Home page with my role, technical focus, current direction, and selected projects.
- Searchable work library with category and status filters, sorting, pagination, and project details.
- About page with my background, skills, and learning roadmap.
- Contact page with how to reach me, what I am open to, and what helps me answer.
- Five mascot themes: Bunny (Dark Mint), Cat (Neon Arcade), Wolf (Black & White), Fox (Crimson Red), and Dog (Cream Coffee).
- A theme selector built from the five mascots, one theme-matched anime background per theme, and a profile portrait.
- Gentle entrance and scroll-reveal motion that stays behind the content and yields to reduced-motion settings.
- Responsive layouts, visible keyboard focus, and reduced-motion support.
- Structured JSON content, local assets, and no runtime framework or external font dependency.
- Cloud-published content with a repository snapshot available as a fallback.

## Technology

HTML5 · CSS3 · JavaScript ES modules · JSON · Firebase · GitHub Pages

## Project structure

| Path                              | Purpose                                      |
| --------------------------------- | -------------------------------------------- |
| `docs/index.html`                 | Home and featured work                       |
| `docs/work.html`                  | Searchable project library                   |
| `docs/about.html`                 | Profile, skills, and learning journey        |
| `docs/contact.html`               | Contact details and availability             |
| `docs/404.html`                   | Missing-page response                        |
| `docs/assets/css/`                | Themes and responsive layouts                |
| `docs/assets/js/`                 | Data model, interface helpers, and rendering |
| `docs/assets/data/portfolio.json` | Repository content snapshot                  |
| `docs/assets/images/`             | Site artwork and favicon                     |
| `tests/`                          | Content and project-structure checks         |

## Artwork

Each Klightten theme loads one background and one mascot, so replacing artwork needs no code change.

| Artwork          | Location                          |
| ---------------- | --------------------------------- |
| Theme background | `docs/assets/images/backgrounds/` |
| Theme mascot     | `docs/assets/images/mascots/`     |
| Profile portrait | `docs/assets/images/profile.png`  |

### Which artwork belongs in which slot

One image per theme, plus the portrait. The theme name in the file is what ties the artwork to its palette.

| Slot                                | Theme         | Artwork                                     | Shape     |
| ----------------------------------- | ------------- | ------------------------------------------- | --------- |
| `backgrounds/cat-neon-arcade.webp`  | Neon Arcade   | White cat in headphones over a neon city    | 1920×1080 |
| `backgrounds/bunny-dark-mint.webp`  | Dark Mint     | Mint cloud city, bunny pointing at a laptop | 1920×1080 |
| `backgrounds/wolf-black-white.webp` | Black & White | Moonlit monochrome city, wolf               | 1920×1080 |
| `backgrounds/fox-crimson-red.webp`  | Crimson Red   | Crimson cloud city, fox                     | 1920×1080 |
| `backgrounds/dog-cream-coffee.webp` | Cream Coffee  | Amber coffee-cloud city, dog at a laptop    | 1920×1080 |
| `mascots/cat.png`                   | Neon Arcade   | Cat sticker holding a glowing data cloud    | square    |
| `mascots/bunny.png`                 | Dark Mint     | Bunny sticker with a glowing mint cloud     | square    |
| `mascots/wolf.png`                  | Black & White | Wolf sticker in a monochrome hoodie         | square    |
| `mascots/fox.png`                   | Crimson Red   | Fox sticker holding a book                  | square    |
| `mascots/dog.png`                   | Cream Coffee  | Dog sticker with a cap, laptop, and coffee  | square    |
| `profile.png`                       | —             | Portrait photo                              | portrait  |

- Backgrounds are 1920×1080 and named after their theme: `cat-neon-arcade`, `bunny-dark-mint`, `wolf-black-white`, `fox-crimson-red`, `dog-cream-coffee`.
- Mascots are square and named after the animal: `cat`, `bunny`, `wolf`, `fox`, `dog`.
- Every slot keeps `.webp`, `.png`, and `.jpg` siblings of the same image. The pages load the `.webp`, which keeps the backgrounds light; the other formats stay as full-quality sources.
- The `.webp` is the file each slot loads first, so replacing that file is all it takes to change the artwork. If the `.webp` is absent, the same slot falls back through `.png`, `.jpg`, and `.jpeg`, which means a single file in any of those formats is enough.
- Backgrounds sit behind a scrim, so artwork stays atmospheric and text keeps its contrast.
- To swap in new artwork, replace the file at its slot path and keep the file name. No CSS, HTML, or JavaScript change is needed.

## Deployment

The website is published with GitHub Pages from the `docs/` directory, with no build step required. Firebase supplies published portfolio content; the bundled JSON snapshot keeps the site readable when cloud content is unavailable. The site contains project descriptions and links, not hosted project files.

## Author

Created and maintained by **Jaru Iori N. Jardeleza** under the **Klightten** name.

This project records my learning and work in progress. Individual project descriptions identify personal practice, academic work, and team contributions.

© 2026 Jaru Iori N. Jardeleza. No open-source license has been selected for this repository. Third-party projects and linked materials remain the property of their respective owners.
