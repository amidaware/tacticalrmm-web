# Contributing translations

The application uses gettext with one source language and any configured target
locales. This project currently writes its source messages in English; that is
independent of the user's interface language. No target locale has priority or a
required translation coverage. Missing messages, empty forms and unreviewed
`fuzzy` suggestions fall back to the source language and do not block releases.

To enable another language, follow [Adding a new language](#adding-a-new-language).

## Files and tools

- `src/gettext/locales/messages.pot`: the template extracted from production code.
- `src/gettext/locales/<locale>.po`: editable translations for a configured locale.
- `src/gettext/generated/translations.json`: generated browser data; never edit
  or commit it. It is recreated automatically before `serve` and `build`.
- `gettext.config.cjs`: source globs, catalogue paths and target locale IDs.
- `src/gettext/locale.ts`: locale labels, aliases, selection policy and Quasar packs.
- `src/gettext/index.ts`: the single application gettext instance and source language.

Commit POT/PO with the corresponding source changes. The supported shared
CI/devcontainer environment is pinned in `.devcontainer/Dockerfile`: Node
20.20.2, npm 10.8.2, Alpine 3.23.4 and GNU gettext 0.24.1. Install JavaScript
packages with `npm ci`. For local tooling, provide GNU `msgfmt`, `msgmerge` and
`msginit`; use the container when host versions differ. The runtime is pinned
to vue3-gettext 4.0.1. AST tooling uses explicit Vue compiler dependencies that
match the application's Vue version.

## Writing source messages

Use complete, natural messages with named parameters. Translate before inserting
the values, so a translator can reorder them. Do not concatenate translated
sentence fragments, embed dynamic values in msgids or introduce artificial keys.

```vue
<template>
  <q-btn :label="$gettext('Save')" />
  <span>{{ $gettext("Download %{filename}", { filename }) }}</span>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { useGettext } from "vue3-gettext";
const { $gettext } = useGettext();
const title = computed(() => $gettext("Downloads"));
</script>
```

Outside `setup`, import the existing instance:

```ts
import { gettext } from "@/gettext";
notifySuccess(gettext.$gettext("Schedule was added successfully."));
```

Options API uses `this.$gettext(...)`. Persistent captions/options must react to
locale changes: use `computed` or render-time calls, not translated values frozen
at module import. Translate asynchronous notifications when they are displayed.

The project extractor accepts literal msgid/context/plural arguments and standard
`$gettext`, `$pgettext`, `$ngettext`, `$npgettext` names. Do not alias/bind methods,
use computed method access or pass `$gettext(variable)`. Use explicit literal
branches for finite status sets; preserve unknown server values as raw data.
These extraction restrictions are project policy, not limitations of every
gettext implementation.

## Meaning, context and terminology

Use `msgctxt` only when identical source wording has different meanings:

```ts
gettext.$pgettext("file action", "Open");
gettext.$pgettext("connection state", "Open");
```

Contexts describe meaning, not filenames, component paths or old translation
keys. Moving a component should preserve its message identity. Add translator
comments (`# ...`) to PO entries when their meaning needs explanation; source
comment extraction is not currently implemented. Each translation team may keep
its own glossary without making that glossary a rule for other locales.

Translate captions, not internal IDs, API enums, statuses or route names.
Usernames, filenames, paths, commands, scripts, editor contents and raw server
output remain data. Never use translated text to make business decisions.

## Quantities and formatting

```ts
gettext.$ngettext("%{count} file", "%{count} files", count, { count });
gettext.$npgettext("selection", "%{count} item", "%{count} items", count, {
  count,
});
```

Source singular/plural forms do not determine the number or order of translated
forms. A target PO's `Plural-Forms` header defines its `nplurals` and index
expression; `msginit` supplies defaults when it knows the locale. Supply the
forms required by that header, indexed from 0. Never assume that every language
has two forms or selects its first form only for 1.

The pinned browser runtime selects forms using its built-in locale rules rather
than reading PO headers. The checker compares each configured catalogue's rule
with the actual runtime over boundary samples. A syntactically valid GNU rule
can still be incompatible with this runtime/version. Resolve that compatibility
before enabling the locale; do not force another language's formula to pass.
This is a compatibility check, not a proof over every possible integer.

Pass the raw integer quantity as the plural selector. A displayed parameter may
be separately formatted (for example, with grouping separators), but must
represent the same quantity. For fractional measurements, prefer a translated
invariant unit, such as `%{value} s`, while preserving the original precision.
Use full sentences when adjectives or verbs also depend on the quantity.
Headings such as `Total: %{count}` need no plural when their wording is invariant.

Project checks require the same named parameters in both source forms and in
each approved nonempty translated form. Translations may reorder parameters;
form texts may legitimately be identical. Literal braces/pipes in documentation,
commands and user data are not plural syntax. Gettext does not format dates,
units or numerals automatically; preserve existing user formatting preferences.

## Updating a catalogue

1. Add or edit the source-language message.
2. Run `npm run gettext:extract` to update POT and merge every configured PO.
3. Inspect new entries, obsolete entries and `fuzzy` suggestions. A changed
   source message may invalidate the old wording, parameters or plural forms.
4. Translate when a maintainer is available. Review the complete entry before
   clearing its `fuzzy` flag. Never bulk-clear flags merely to include suggestions.
5. Run checks, tests and build. Translation coverage is informational for every
   target locale, including an entirely untranslated one.

Empty forms, whitespace-only forms and fuzzy/obsolete entries are omitted or
use source-language fallback. Existing available plural forms may be used while
missing forms fall back using the source language's singular/plural rules.
Fuzzy suggestions are excluded from runtime, so their old interpolation values
do not have to match a newly changed source message until reviewed.

Catalogue syntax, headers, duplicate identities, merge conflicts, runtime plural
compatibility and parameters in approved translations remain blocking checks.
These protect correct execution; they do not require translation maintenance
for each release. Functional locale tests use small test dictionaries; catalogue
tests discover all configured target locales and allow partial coverage.

## Adding a new language

Only two configuration files need editing. The language picker and generated
browser catalogue are derived from them; do not edit individual components or
add a handwritten JSON dictionary.

### 1. Choose the locale and Quasar pack

Choose a canonical ID supported by the pinned vue3-gettext runtime and GNU
`msginit`. Find the matching pack under `node_modules/quasar/lang/`. The PO
filename, its `Language` header, the compiler locale ID and the registry key must
use the same canonical ID. Browser aliases and the pack filename may differ,
especially for regional locales; map them explicitly.

The following example uses `de` with the existing `quasar/lang/de.js` pack.
This is an example, not a default or privileged target language. Substitute your
chosen ID, native display name, aliases and pack in the steps below.

### 2. Register the target catalogue

In `gettext.config.cjs`, append the chosen ID to the **existing**
`output.locales` array. For the example, add `"de"`; keep all existing entries.
Do not change source globs, paths or the source language.

### 3. Register the interface language

In `src/gettext/locale.ts`, add the pack import:

```ts
import de from "quasar/lang/de.js";
```

Add this entry inside the existing `registry` object, before `} as const`:

```ts
de: {
  label: "Deutsch",
  pack: de,
  aliases: ["de", "de-de", "de_de"],
},
```

Use lowercase aliases: incoming browser/profile values are normalized to
lowercase before matching. Include regional aliases intentionally; do not map
regional variants to a different translation without reviewing that choice.
Keep `fallbackLocale` and `sourceCodeLanguage` unchanged when adding a target.
The entry automatically appears in user preferences through `locales`.

### 4. Generate and translate the PO

With project dependencies and GNU gettext installed, run:

```sh
npm run gettext:extract
```

This creates `src/gettext/locales/<locale>.po` for every newly configured locale;
for the example, `src/gettext/locales/de.po`. There is no need to run `msginit`
manually. Check its `Language`, UTF-8 and `Plural-Forms` headers.

Edit `msgstr` in that PO, leaving extracted msgid/context/plural and parameter
names intact. For example, the existing entry can be translated as:

```po
msgid "Save"
msgstr "Speichern"
```

An empty or partial initial catalogue is valid and uses source fallback.
Review fuzzy suggestions before accepting them. Do not create a source-language
PO or modify generated JSON simply to add an interface language.

### 5. Validate and try the language

```sh
npm run gettext:check
npm run gettext:check-extraction
npm run gettext:test
npm run format:check
npm run lint -- --max-warnings=0
npm run build
npm run serve
```

`build` and `serve` compile browser translations automatically. Restart an
already running development server after changing locale configuration.
In the user menu, open preferences and select the new native language label.
Verify translated text, source fallback, Quasar controls, switching in both
directions, reload and saved/system preferences. Test long text, special
characters, zero and locale-specific plural boundaries. Adding a locale needs
no new language-specific branch in the checker or catalogue tests.

Commit the two configuration changes and the extracted POT/PO diff, including
the new PO. Generated JSON, build output and caches stay excluded from Git.

### Layout and integration requirements

Before enabling a locale that needs RTL, different fonts or script-specific
layout, validate that support separately. This project's RTL CSS generation
is not enabled; a language pack alone does not establish RTL support.
Quasar packs translate built-in controls independently of application messages;
keep both synchronized. Preserve the existing saved/system selection policy and
conditional backend payload fields. Live backend, agent and identity-provider
operations require their corresponding integration environment.

## Retiring a locale

A lack of maintainers does not require deleting a locale: it may remain partial.
To retire it, remove its `output.locales` entry, registry entry and unused pack
import together, then remove its PO if it is no longer retained. Verify that
previously saved choices follow the existing system/source fallback policy and
rebuild the browser catalogue. Do not leave a selectable locale without its configuration.

## Text safety and verification

Render translations as text through Vue interpolation or ordinary text props.
Do not pre-escape placeholders or insert translations/user data through `v-html`
without a separate, reviewed HTML policy. Online library examples may describe
older API signatures; use the pinned distribution and escaping regression tests
as evidence. Some Quasar APIs accept HTML; review those call sites explicitly.

Before a release, inspect long labels, dialogs, tables and notifications; test
available translations and source fallback without changing API values or raw
data. A green static check/build does not prove a live backend, identity provider
or agent operation. Local integration tests use mocked HTTP.

## Commands

| Command                            | Purpose                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `npm run gettext:extract`          | Update POT/PO; inspect the resulting diff.                                     |
| `npm run gettext:compile`          | Generate deterministic browser JSON from eligible translations.                |
| `npm run gettext:check`            | Validate catalogue correctness and source usage; report optional coverage.     |
| `npm run gettext:check-extraction` | Compare temporary extraction with POT/PO without modifying them.               |
| `npm run gettext:test`             | Run extraction, negative fixtures, locale/runtime, UI and service regressions. |
| `npm run format:check`             | Check formatting without rewriting files.                                      |
| `npm run lint -- --max-warnings=0` | Lint source and tooling with no warnings.                                      |
| `npm run build`                    | Compile gettext automatically and build production assets.                     |

CI uses the shared image and `scripts/gettext/ci.sh`: clean dependency install,
format/lint/catalogue/extraction checks, tests, deletion of the generated
catalogue and production build. Triggers are defined in
`.github/workflows/frontend-linting.yml`. CI never formats with write mode.

The AST source check rejects unreviewed visible strings and old translation APIs.
`scripts/gettext/source-exceptions.json` stores exact `file + kind + text`
exceptions with reasons for technical tokens, user content and similar data.
Review changes to those exceptions; do not use whole-file wildcards or regenerate
the list simply to silence a failure. Console diagnostics are classified separately.

Legal files (`LICENSE`, `LICENCE`, `NOTICE`, `COPYING`, `COPYRIGHT`, `PATENTS`,
`THIRD-PARTY` and variants) are excluded from formatting at any depth. Preserve
embedded legal headers too. Source updates, merge completion, commits and pushes
remain separate Git actions; gettext commands never perform them.

## References

- [GNU gettext: preparing strings](https://www.gnu.org/software/gettext/manual/html_node/Preparing-Strings.html)
- [GNU gettext: plural forms](https://www.gnu.org/software/gettext/manual/html_node/Plural-forms.html)
- [GNU gettext: fuzzy workflow](https://www.gnu.org/software/gettext/manual/html_node/Workflow-flags.html)
- [vue3-gettext: functions](https://jshmrtn.github.io/vue3-gettext/functions.html)
- [vue3-gettext: extraction and compilation](https://jshmrtn.github.io/vue3-gettext/extraction.html)
- [Quasar language packs](https://quasar.dev/options/quasar-language-packs/)
- [Quasar RTL support](https://quasar.dev/options/rtl-support/)
