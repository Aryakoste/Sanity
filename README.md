# Mend

**A little repair goes a long way.** Mend helps people repair adult clothing, fabric bags, and household textiles before replacing them.

## What works

- Search six sourced repair plans and filter by category or time.
- Match repairs to available minutes and your existing tools; see what is missing.
- Save plans, check off steps, and resume after reloading the browser.
- Complete repairs and optionally record the measured item weight.
- View your repair journal, export it as JSON, or print an individual plan.
- Edit reusable tools and repair guides in Sanity Studio with a review process.
- Use the responsive interface on desktop and mobile, with keyboard-accessible dialogs and reduced-motion support.

The planner uses explicit content relationships and deterministic matching. It does not generate repair advice at runtime. The library contains original preparation checklists, each credited and linked to its full illustrated source. It is intentionally small; the seed library is a starting point for further review, not a claim of professional verification.

## Run locally

Use Node **22.20 or newer** and npm. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

```sh
npm ci
npm run dev
```

Open the Local URL printed by Astro, normally **http://127.0.0.1:4321/**.

The project already defaults to your public Sanity project `5zzpp9q6`, dataset `production`. The six repair guides and five reusable tools have been imported. A local `.env` is optional; `.env.example` documents all supported settings.

```sh
npm run sanity:verify
```

This checks that approved repair guides are publicly readable and that tool references resolve. If Sanity cannot be reached during a build, Mend uses its clearly labeled sample library. The About view can refresh the live public library after a connection returns.

## Sanity Studio

```sh
npm exec -- sanity login
npm run studio
```

Open the Studio URL printed by the CLI, normally http://localhost:3333. Sign in with an account that can edit this project.

The `repairGuide` schema models the exact symptom, duration, difficulty, tools, materials, preparation checklist, caution, source credit, and review state. Tools are document references, rather than repeated strings.

Custom Studio document actions implement this process:

1. Fill in a guide and choose **Send for review**.
2. Check the source, tools, scope, and checklist. Choose **Approve repair**.
3. **Publish** makes the approved content visible to the public frontend.

Approval stores an exact snapshot of the reviewed fields. A later content edit disables the Studio Publish action until the changed version is reviewed again. Revision guards prevent the approval action from silently overwriting a concurrent edit. The previously published guide stays available while its next draft is being reviewed.

These are custom Studio actions and a content model. They do not use Sanity's separate hosted Workflows service or App SDK. The Studio guard coordinates editors; project administrators with direct API access can bypass a UI guard, so it is not an API authorization boundary.

To populate another public project, change the public project ID and dataset in configuration and run:

```sh
npm run sanity:seed
npm exec -- sanity dataset import sanity/seed.ndjson production --missing
```

The seed script generates an import file; `--missing` preserves existing records. You can alternatively set `SANITY_API_TOKEN` locally in an ignored `.env` and run `sanity:seed`. The token is used only by that script. Never put a write token into a `PUBLIC_` environment variable or commit `.env`.


## Privacy and limits

Personal progress is stored in `localStorage` on this browser. It is not synchronized to Sanity or shared with other users. Export the journal before switching devices or clearing browser data. There is no analytics integration.

Impact figures count completed repairs and optional self-reported item weights. Mend does not infer money saved, waste prevented, or carbon emissions avoided. Source links provide the detailed illustrated technique. Stop when the damage is outside a plan's stated scope and seek an experienced repairer.


The source code is MIT licensed. The original workbench image was generated with AI and is disclosed in the app and credits.
