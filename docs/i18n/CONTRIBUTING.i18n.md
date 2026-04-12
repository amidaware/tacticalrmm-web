# Contributing Translations (i18n)

## Golden Rule

**Every new UI string must be added through i18n.** No hardcoded strings in templates, components, or composables.

---

## Adding a New Translation String

### 1. Replace the hardcoded string with an i18n key

In a Vue template:

```vue
<!-- bad -->
<q-btn label="Delete Agent" />

<!-- good -->
<q-btn :label="$t('agents.actions.delete')" />
```

In a script / composable:

```ts
// bad
Notify.create({ message: "Agent deleted" });

// good — via useI18n
import { useI18n } from "vue-i18n";
const { t } = useI18n();
Notify.create({ message: t("agents.actions.deleted") });
```

In boot files (no `setup` context):

```ts
import { i18n } from "@/i18n";
Notify.create({ message: i18n.global.t("common.saved") });
```

### 2. Add the key to the source locale (`en`)

`en` is the source of truth. Add the key there first:

```json
// src/i18n/en/agents.json
{
  "actions": {
    "delete": "Delete Agent",
    "deleted": "Agent deleted successfully"
  }
}
```

Then add translations in any locale that you are working on (for example `ru`).
If a key is missing in a locale, fallback to `en` is used.

### 3. Run the integrity check

```bash
npm run i18n:check
```

This reports:

- **Key parity** — missing/extra keys in each locale vs `en`.
- **Placeholder consistency** — `{var}`, `%s`, `%d` etc. match for shared keys.

### 4. Commit

Follow the conventional commit format:

```
i18n: localize <module> for <locale> and align key parity
```

---

## Key Naming Conventions

| Pattern                         | Example               |
| ------------------------------- | --------------------- |
| `module.section.action`         | `agents.tabs.summary` |
| Verbs for actions               | `agents.actions.run`  |
| Nouns for titles                | `agents.metaTitle`    |
| `shared.*` for reusable strings | `shared.areYouSure`   |

## Locale Namespaces (Domains)

| File              | Area                                              |
| ----------------- | ------------------------------------------------- |
| `agents.json`     | Agents, remote background, file browser, services |
| `alerts.json`     | Alerts, alert templates                           |
| `auth.json`       | Authentication, SSO                               |
| `checks.json`     | Monitoring checks                                 |
| `common.json`     | Shared strings, buttons, statuses                 |
| `dashboard.json`  | Dashboard                                         |
| `navigation.json` | Navigation menu, routes                           |
| `reporting.json`  | Reports (EE)                                      |
| `scripts.json`    | Scripts, snippets                                 |
| `settings.json`   | Server and core settings                          |
| `software.json`   | Software install/uninstall                        |
| `tasks.json`      | Automated tasks                                   |

---

## Placeholders

Preserve placeholders **exactly as they appear** in the English source:

| Type           | Examples                   |
| -------------- | -------------------------- |
| ICU / vue-i18n | `{name}`, `{count}`, `{n}` |
| printf         | `%s`, `%d`, `%f`           |

```json
// en
"greeting": "Hello, {name}! You have %d messages."

// target locale (example: ru) — same placeholders, translated text
"greeting": "Привет, {name}! У вас %d сообщений."
```

---

## Pluralization

Use `vue-i18n` pipe syntax for plural forms:

```json
{
  "agents": {
    "selected": "No agents selected | {count} agent selected | {count} agents selected"
  }
}
```

For locales with complex plural rules (example: Russian), use full form sets (0, 1, 2-4, 5+):

```json
{
  "agents": {
    "selected": "Нет выбранных агентов | Выбран {count} агент | Выбрано {count} агента | Выбрано {count} агентов"
  }
}
```

---

## Translation Rules

### Must

- Translate the **meaning**, not the literal word form.
- Keep functional accuracy — translation must not change the action or status meaning.
- Keep strings short and clear for an admin interface.
- Preserve all placeholders, HTML/Markdown, and special tokens.
- Use neutral business tone, avoid colloquialisms.

### Never

- Translate technical identifiers: `agent_id`, `site_id`, `SMTP`, `SSH`, `RDP`, `URL`, `DNS`.
- Translate product names, brands, URLs, API endpoints, variable names, JSON keys, terminal commands.
- Change logic through translation (e.g. `Disable` → `Включить`).
- Lose negation (`not`, `failed`, `denied`).
- Split or merge strings if it breaks interpolation.
- Add new information not present in the source string.

### Do Not Translate

- `Tactical RMM`, product names, brands.
- Protocol names: `SSH`, `RDP`, `SMTP`, `DNS`, `HTTP`, `WebSocket`.
- Technical IDs: `agent_id`, `site_id`, `client_id`.
- File paths, URLs, API endpoints.
- Code blocks, commands, JSON keys.

---

## Glossary (Example: RU)

Use consistent terminology across all modules.

| English Term | Russian Translation | Note                                |
| ------------ | ------------------- | ----------------------------------- |
| Agent        | Агент               | Not "клиент"                        |
| Client       | Клиент              | Organization/customer               |
| Site         | Сайт                | Client location                     |
| Check        | Проверка            | Monitoring check                    |
| Alert        | Оповещение          | Not "тревога"                       |
| Policy       | Политика            | Set of rules                        |
| Task         | Задача              | Scheduled or manual action          |
| Script       | Скрипт              | Not "сценарий" in UI                |
| Dashboard    | Панель мониторинга  | Short: "Панель" if space is limited |
| Service      | Служба              | Windows service                     |
| Event Log    | Журнал событий      |                                     |
| Run          | Запустить           | For action buttons                  |
| Retry        | Повторить           |                                     |
| Success      | Успешно             | Execution status                    |
| Failed       | Ошибка              | For status/notification             |
| Pending      | В ожидании          |                                     |

---

## Quality Checklist Before Merge

1. [ ] New key exists in `en`.
2. [ ] If locale key exists, placeholders/tokens match `en`.
3. [ ] No accidental edits/removals in `en`.
4. [ ] Terms follow the glossary above.
5. [ ] UI is visually readable for the target locale (no text overflow in buttons, dialogs, tooltips).
6. [ ] `npm run i18n:check` passes.
7. [ ] `npm run lint` and `npm run build` pass.

---

## CI Checks

Every push / PR to `develop` automatically runs:

1. **Lint + Build** — `frontend-linting.yml`
2. **i18n parity + placeholders (informational)** — `npm run i18n:check`

`i18n:check` is non-blocking by design (coverage/progress signal).

---

## Available npm Scripts

| Script                      | Purpose                                            |
| --------------------------- | -------------------------------------------------- |
| `npm run i18n:check`        | Run all i18n integrity checks                      |
| `npm run i18n:parity`       | Check key parity between `en` and non-`en` locales |
| `npm run i18n:placeholders` | Check placeholder consistency                      |

---

## What If a String Seems "Technical"?

When in doubt — leave it in English and add a comment in the PR explaining why.

---

## Adding a New Language

Locales are discovered automatically from `src/i18n/<code>/index.ts`.
Each locale controls what it imports — **partial translations are fully supported**.
Missing domains fall back to `en` automatically via `fallbackLocale`.

### Step 1: Create the locale directory and JSON domains

```
src/i18n/de/common.json
```

You can add only the domains you have translated.

### Step 2: Register locale in app runtime

Edit `src/i18n/index.ts` and add locale to:

- `supportedLocales`
- `localeAliases`
- `messages`
- `quasarLanguagePacks`

### Step 3: Add translation files

```
src/i18n/de/auth.json
src/i18n/de/common.json
```

### That's it

- Add language label to the locale picker options (if shown in UI).
- `npm run i18n:check` will report coverage for the new locale.
- Missing keys automatically fall back to `en`.
