# Content reference

[Back to README](../README.md)

`docs/assets/data/portfolio.json` is the only public content source. `docs/assets/js/model.js` validates imports and applies defaults. The editor uses the same schema.

| Top-level field | Purpose                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------- |
| `version`       | Schema version; this edition uses `4`                                                              |
| `updated`       | Human-readable date of the public update                                                           |
| `profile`       | Name, role, school, stage, current focus, headline, introduction, about text, location, GitHub URL |
| `settings`      | Site title/description, default theme, projects per page, motion preference                        |
| `skills`        | Groups of tool/skill names                                                                         |
| `journey`       | Roadmap entries with phase, status, title, description                                             |
| `works`         | Ordered project records                                                                            |

## Example project

```json
{
  "id": "my-next-project",
  "title": "My next project",
  "category": "Web Development",
  "status": "In progress",
  "year": "2026",
  "featured": false,
  "published": true,
  "summary": "A short explanation for the project card.",
  "description": "What I built, what I learned, and what is still unfinished.",
  "role": "My actual contribution to the project",
  "tech": ["HTML", "CSS", "JavaScript"],
  "liveUrl": "",
  "repoUrl": "",
  "notesUrl": "",
  "coverUrl": "",
  "coverAlt": ""
}
```

Only use `published: false` inside a private workspace backup. Public export removes those projects entirely; merely hiding them in the public JSON would not make their contents private.

## Settings

- `defaultTheme`: `neon-arcade`, `classic-green`, `black-white`, or `red-hat`.
- `projectsPerPage`: `6`, `9`, `12`, or `24`.
- `motion`: `true` or `false`; the visitor’s reduced-motion preference takes priority.
- `siteTitle`: browser title text. `description`: browser-updated page metadata.

Some crawlers do not execute JavaScript. When changing the site identity, update the static titles, descriptions, Open Graph fields, and canonical URLs in the HTML too.

## Validation and limits

- At most 500 projects, 12 skill groups, and 20 roadmap entries.
- Each project requires a title and description; IDs must be unique.
- Project summaries: up to 260 characters. Descriptions: up to 12,000 characters.
- Project links accept full HTTP(S) URLs only; HTTPS is preferred. Invalid URLs are removed on normalization.
- Text exceeding field limits is trimmed. Unknown fields are not preserved.
- Browser publishing requires public JSON under 1 MB; backup imports must be under 2 MB.
- Images are referenced by URL, never embedded as base64 in JSON.

Use blank URL fields when a project has no published demo or repository. Avoid placeholder destinations. For team projects, describe personal contributions accurately rather than claiming the whole system.

## Data movement

The editor reads the public JSON, creates a local workspace, and produces either a full backup or a filtered public export. The publisher uploads only the filtered JSON. `restorePublished()` retains unpublished local projects when loading remote content unless an ID is already used by a remote project.

The version-3 importer recognizes the old JSON assignment wrapper without evaluating JavaScript. Links to GitHub migrate to `repoUrl`; other web links migrate to `liveUrl`. New fields receive defaults.
