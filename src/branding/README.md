# Branding module

Everything that makes this build say **BlueCloud RMM** instead of Tactical RMM lives
here. Nothing else should hardcode a product name, a brand colour or a logo path.

## Why a module and not edits in place

The first version of this change edited `quasar.variables.sass`, `MainLayout.vue`,
`LoginView.vue` and overwrote three upstream asset files. That works and it is the
wrong shape: every one of those files belongs to amidaware, so every upstream release
becomes a merge conflict over our logo, and an overwritten `src/assets/logo.png` is a
change git cannot even show meaningfully.

So the brand is a module that upstream files *reference*. The footprint in upstream
files is now four one-line imports and two element swaps, which is about as small as
this can get without a fork-wide theming system.

## Contents

| File | Purpose |
|---|---|
| `index.ts` | the single source of truth: product name, logos, palette |
| `brand.sass` | Quasar palette variables, imported by `quasar.variables.sass` |
| `assets/logo.png` | standard logo, for LIGHT backgrounds |
| `assets/logo-reverse.png` | white logo, for DARK backgrounds (the toolbar) |
| `assets/logo-square.png` | 256x256, for PDFs and the script manager |
| `assets/favicon.ico` | multi-size ICO, master copy |

Two logos on purpose: the toolbar is dark, so the standard dark-text logo is invisible
there, and the login card and generated PDFs are light, so the white one is invisible
on those. One logo everywhere disappears somewhere.

## Where upstream files touch this

    quasar.variables.sass      @import "../branding/brand.sass"
    src/layouts/MainLayout.vue BRAND.name + BRAND.logoReverse
    src/views/LoginView.vue    BRAND.name + BRAND.logoSquare
    package.json               productName (drives <title> via index.html)
    public/favicon.ico         copy of assets/favicon.ico -- Quasar serves public/ verbatim

`public/favicon.ico` is a copy rather than a reference because Quasar copies `public/`
verbatim into the build and does not resolve imports there. `npm run brand:sync`
refreshes it, so the master stays in this directory.

## Changing the brand

Edit `index.ts` and `brand.sass`. Colours came from the compiled stylesheet on
www.blueuc.com (`--primary: #00C4FF`, `--o-color-5: #1B1319`), not from a screenshot,
so they match the website exactly rather than approximately.

## IMPORTANT: the deployed frontend is NOT built from this source

The bundle serving `rmm.blueuc.com` is the official one that Tactical RMM's updater
downloads with the sponsorship token:

    python manage.py get_webtar_url

That bundle is what carries the Tier 2 EE features. **Reporting only exists there** --
the public source ships `src/boot/integrations.ts` with empty arrays, so a source build
has no Reporting Manager at all. Deploying a source build silently removes Reporting,
which is exactly what happened on 2026-08-12.

So branding is applied to the official bundle after download:

    python3 src/branding/apply-to-dist.py /var/www/rmm/dist
    sudo chown -R www-data:www-data /var/www/rmm/dist

**Re-run it after every `update.sh`**, because the updater replaces `dist` wholesale.
It is idempotent, it refuses nothing, and it warns loudly if the bundle it was pointed at
has no Reporting UI -- because that means a source build got deployed and branding would
otherwise hide the real problem behind a cosmetic success.

The source-level integration below is still correct and still maintained, for anyone who
builds from source deliberately. It just is not what is deployed.

## What this does NOT do

It does not add, unlock or re-enable any EE feature, and it does not touch integration
registration or licensing code. If a feature is absent from the bundle Amidaware served,
this tooling leaves it absent. The EE licence forbids working around that, and doing so
would misrepresent what has been paid for.

## WHICH BUNDLE IS DEPLOYED (decided 2026-08-12)

**A source build from this repo.** Chosen deliberately, with the trade-off understood.

There are two possible bundles and neither has everything:

| | source build (deployed) | official webtar |
|---|---|---|
| Network Devices, PiChat, AI Ticket Console, AI Procedures | yes | **no** |
| EE Reporting Manager UI | **no** | yes |

The official webtar is Amidaware's build. It carries the Tier 2 EE Reporting UI, and it
knows nothing about our custom views, because those exist only in this repo. A source
build is the reverse.

The custom views are used daily; Reporting was not in the Aug 4 build either, so nothing
was lost by choosing this side. Reporting was requested and then withdrawn once the cost
was clear.

If Reporting is ever wanted back, the honest options are: ask Amidaware how a sponsor
builds from source with EE included, or run the official webtar and lose the custom views.
Registering EE features by hand in src/boot/integrations.ts is NOT one of the options --
the EE licence prohibits working around that mechanism, whatever the sponsorship tier.

Note that report DATA is untouched by any of this: 20 report templates and the six AI
report schedules live in the database and the schedules run server-side, so they keep
working whichever bundle is deployed.

## Deploying a source build

    npx quasar build
    sudo rm -rf /var/www/rmm/dist && sudo mkdir -p /var/www/rmm/dist
    sudo cp -a dist/. /var/www/rmm/dist/
    echo 'window._env_ = {PROD_URL: "https://api.blueuc.com"}' \
      | sudo tee /var/www/rmm/dist/env-config.js >/dev/null
    sudo chown -R www-data:www-data /var/www/rmm/dist && sudo systemctl reload nginx

`env-config.js` is written by update.sh, NOT by the build. Forgetting it leaves the
frontend with no API URL. Do not skip that line.

`apply-to-dist.py` is only for the official webtar. A source build already contains the
brand, since it imports this module.
