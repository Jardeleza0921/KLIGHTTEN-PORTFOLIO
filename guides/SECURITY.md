# Security model

[Back to README](../README.md)

## What is protected, and how

| Concern                                  | Actual boundary                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| Opening the editor on the portfolio site | Pages deploys only `docs/`; `admin/` is outside that folder                      |
| Changing published content               | GitHub requires repository write authorization                                   |
| Token persistence                        | The publisher keeps the token only in a private JavaScript field in the open tab |
| Unpublished projects                     | The public export/publisher removes projects marked `published: false`           |
| Accidental overwrite                     | Publishing supplies the loaded file SHA and checks it again before updating      |
| Untrusted imported text                  | JSON parsing, text-only DOM insertion, and HTTP(S)-only URL validation           |

## What this does not provide

GitHub Pages is static hosting. A client-side password, a hidden route, a minified script, or a hostname check cannot enforce private user authentication.

The admin’s localhost guard is a usability precaution, not authentication. Anyone can read or copy its source from this public repository. That does not give them permission to commit to the owner’s GitHub account.

Anyone with legitimate write access to the repository can still change it outside this editor. Review collaborators, authorized applications, token permissions, and branch protections in GitHub itself.

Drafts are saved in local browser storage, not encrypted by this app. Other people using the same browser profile, malicious browser extensions, or compromised local software may access them. Use a trusted computer and browser profile. The editor is not a secrets vault.

## Rules for tokens and passwords

- Never hardcode a username/password gate into public JavaScript.
- Never commit a GitHub token, password, private export, or environment file.
- Restrict publishing tokens to this repository and minimum Contents permissions.
- Prefer the token-free export + Git workflow when practical.
- Disconnect after use; the token is also forgotten on refresh/tab close.
- Revoke a token if it was exposed in a file, screenshot, chat, or shared browser.
- Replace any password previously shared in chat before reusing it for an account.

The old Netlify username/password environment variables are not used by this edition. Removing them from a retired deployment is an account-management step, not a feature of this repository.

## Local and public hosting

Bind the development server to `127.0.0.1`. Do not expose the repository-root server with `0.0.0.0`, a public tunnel, or port forwarding. It contains admin source and may contain other local files.

Keep Pages configured to publish `main` → `/docs`. Do not copy `admin/` into that folder or publish the whole repository as a website. A raw GitHub repository URL is not a private admin deployment.

All public JSON and images are downloadable. Unpublishing removes a project from the next public file; it does not delete previous commits or cached copies. Private workspace backups must never be used as the public JSON file.

## Defensive implementation

The website uses native browser modules, no external JavaScript, safe DOM text creation, a Content Security Policy, and a fixed GitHub destination. External links reject executable URL schemes and embedded URL credentials. Tokens are sent only to the GitHub API by the publisher.

An allowed external cover image still contacts its image host when viewed. Do not embed sensitive URLs. Prefer trusted HTTPS images or place public images in `docs/assets/images/` and use their published HTTPS address.

These measures reduce avoidable risks; they are not a security audit or a guarantee against compromised devices, browser extensions, repository dependencies added later, or GitHub account compromise.
