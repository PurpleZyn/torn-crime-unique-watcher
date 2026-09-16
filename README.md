# Torn Crime Unique Watcher

A Torn userscript focused on time-sensitive Crimes 2.0 unique outcomes.

## What it watches

### Search for Cash — API watcher

Uses Torn's official `/torn/searchforcash` API endpoint to monitor the changing global percentages for Search for Cash locations from anywhere on Torn.

The watcher currently covers documented time-sensitive unique windows for:

- Search the Subway
  - rush-hour / high-ridership uniques
  - on-peak uniques
  - off-peak / low-ridership uniques
- Search the Junkyard
  - crushing-rating windows
- Search the Beach
  - tide-rating windows
- Search the Cemetery
  - groundskeeping active / inactive windows
- Search the Fountain
  - collections-rating windows

It also reads your Search for Cash skill and completed uniques so it can avoid alerting for outcomes you already have.

If Torn reports that you have all **34 / 34** Search for Cash uniques, real SFC API alerts are disabled automatically.

### Shoplifting — API watcher

Uses Torn's official `/torn/shoplifting` API endpoint to monitor changing shop security from anywhere on Torn.

Background Shoplifting alerts focus on genuinely time-sensitive states where at least one relevant security system is disabled or off duty.

The watcher also reads your Shoplifting skill and completed uniques to filter opportunities.

### Pickpocketing — live page watcher

Pickpocketing targets are handled differently. The script only watches Torn's real `unique-outcome-star` while the Pickpocketing page is actively visible and focused.

This live-page watcher also works on Search for Cash and Shoplifting when those pages are actively viewed, which helps catch unique conditions that cannot be proven from the global API alone.

## Install

### Tampermonkey

[Install v0.3.2](https://raw.githubusercontent.com/PurpleZyn/torn-crime-unique-watcher/main/torn-crime-unique-watcher-v0.3.2.user.js)

The versioned installer avoids stale GitHub raw-file caching. Future update metadata still points at the normal stable userscript path.

## API setup

The personalized API watchers require a **Minimal Access** Torn API key.

1. Install the script.
2. Open any Torn page.
3. Click the watcher pill if API setup is not already complete.
4. Create or use a Minimal Access key in Torn's API settings.
5. Paste it into the watcher.
6. Choose a 15, 30, or 60 second API polling interval.
7. Click **Save & Test API**.

The key is stored only in Torn's browser localStorage and is sent only to Torn's official `api.torn.com` API.

## Controls

The watcher pill is draggable and remembers its screen position.

- **Drag:** move the pill
- **Click:** mute/unmute alerts
- **Shift + Click:** test the normal alert sound
- **Ctrl + Click:** cycle volume through 25%, 50%, 75%, and 100%
- **Alt + Click:** open API settings

The settings window also includes:

- **Test SFC Alert** — simulates a Search for Cash notification even if you have all SFC uniques
- **Reset Pill Position** — returns the pill to the bottom-right

## Search for Cash test behavior

A player with all Search for Cash uniques should see something like:

`SFC 0 missing`

and should receive no real SFC unique-window alerts.

A player missing a time-sensitive unique may receive an alert such as:

`SEARCH FOR CASH UNIQUE WINDOW`

`Search the Beach`
`Silver Bead — 40% or lower tide rating`

The API endpoint returns the current subcrime ID, status title, and percentage. The script maps that subcrime ID to Torn's current subcrime metadata before evaluating the documented unique thresholds.

## Privacy / behavior

The script:

- has no external server
- does not upload your API key
- does not perform crimes automatically
- does not click crime actions
- uses Torn's official API for background Search for Cash and Shoplifting checks
- only reads live crime-page DOM data while that page is actively viewed

## Current version

**v0.3.2**

v0.3.2 adds Search for Cash API monitoring, personalized SFC completion filtering, Search for Cash live-star detection, and a dedicated SFC test-alert button. It preserves the draggable pill, Shoplifting API watcher, and Pickpocketing live watcher from v0.2.x.

v0.3.2 fixes live unique row identification for Shoplifting, Pickpocketing, and Search for Cash. Alerts now lock the unique star to the nearest actual crime action row, which prevents post-click result text or entire crime lists from being mistaken for a new unique.

v0.3.2 prevents post-action duplicate alerts by preserving the active row identity while Torn renders the crime result. Shoplifting rows now use stable visual row indexes, avoiding neighboring-shop mislabels such as Cyber Force vs Jewelry Store. The watcher pill can also be minimized to a small `★`, and that state is remembered.

## Disclaimer

Unofficial community userscript. Not affiliated with or endorsed by Torn.
