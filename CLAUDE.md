# Marketing Tracker — Project Context

A personal task tracker for a solo marketing executive running two companies.
Built as a single static HTML file, deployed on GitHub Pages, synced via GitHub.

## What this is
- One file: `index.html`. No build step, no framework, no package install.
- Vanilla JS + CSS only. The single external dependency is Google Fonts
  (Space Grotesk + JetBrains Mono). Keep it that way unless asked.
- Runs entirely client-side so it works live on GitHub Pages.

## How it deploys
- Hosted on GitHub Pages from this repo's root, `index.html`.
- To ship a change: edit `index.html`, commit, push to the default branch.
  Pages rebuilds automatically; the live site updates in ~30–60 seconds.
- The repo owner account is `jorvix-marketing`.

## Data model
- State lives in `localStorage` (keys: `mt_tasks_v3`, `mt_meet_v3`, `mt_sync_v3`)
  and optionally syncs to a JSON file in this repo (default `tasks.json`).
- Synced JSON shape: `{ "tasks": [...], "meetings": [...] }`.
  The pull logic is back-compatible with an older array-only format.
- Task: `{id, title, cat, status, due, collab[], links[{label,url}], remarks, completedAt}`
- Meeting: `{id, title, date, time, attendees[], link}`
- `status` ∈ `todo | progress | blocked | done`. Moving to `done` sets
  `completedAt` to today's date (drives the daily progress bar).

## Categories (peer categories — a task is exactly one)
- `codetrace`  → CODETRACE, brand yellow `#FFE000`
- `jorvix`     → JORVIX, brand blue `#154BA1`
- `director`   → Director / MD approval items, red `#C92A2A`
Categories are auto-assigned by a client-side keyword engine (the `KW` object
in the script) and overridable in the task modal. Keep it keyword-based — do
NOT introduce an AI/API call for categorization; it must run on static hosting.

## Design system
- Pastel shell: soft lilac canvas, tinted dashboard stats, pastel board columns
  (To do = lavender, In progress = sky, Blocked = peach, Done = light green).
- IMPORTANT brand rule: the three category colors above are brand IDENTITY, not
  decoration. Keep them fully saturated on rails, dots and the category picker.
  Do not pastel-wash them. Everything else can be soft.
- Type: Space Grotesk (display), JetBrains Mono (labels/data/dates).

## Features
- Dashboard: daily progress bar (resets each day off today's date), pulse stats
  (overdue / due today / due this week / in progress), category-mix bar,
  meetings-today strip, "needs attention" list (overdue + blocked, sorted by due).
- Board: kanban with drag-and-drop between columns, category filter.
- Calendar: month grid plotting tasks by due date + meetings; click a day to add
  a meeting.
- Outlook: "↧ Outlook" button exports an .ics of all dated tasks + meetings.

## Hard constraints (do not "fix" these without checking first)
- Live two-way Microsoft/Outlook sync is intentionally NOT implemented. A static
  site has no backend for OAuth, and Graph access needs an Azure app registration
  + admin consent the user does not have. The .ics export is the deliberate
  no-admin workaround. Don't add an MS Graph integration unless the user confirms
  admin access exists.
- No fabricated data anywhere (no fake metrics, testimonials, or sample numbers
  presented as real). Seed/sample tasks are clearly placeholder and meant to be
  deleted.

## Working style for this project
- Make one focused change at a time and confirm before moving on.
- Plain-language explanations; the user is a marketer, not an engineer.
- Preserve the single-file structure and the data shape above, or write a
  migration if a key/version must change.
