# Torn Crime Unique Watcher

A lightweight userscript for Torn that alerts when the **Shoplifting** or **Pickpocketing** crime page shows a **Unique Outcome** as available.

## Install

**Tampermonkey:**  
[Install the userscript](https://raw.githubusercontent.com/PurpleZyn/torn-crime-unique-watcher/main/torn-crime-unique-watcher.user.js)

Open the link with Tampermonkey installed and confirm the installation.

For Torn PDA, import the same raw userscript URL into its userscript manager.

## How it works

The script watches Torn's own crime-page UI for the **Unique Outcome** marker while you are actively viewing:

- Shoplifting
- Pickpocketing

When a unique marker appears, it:

- flashes the screen
- plays a two-tone alert
- shows a `★ UNIQUE AVAILABLE` popup
- includes the nearby target / crime-option text when available
- suppresses repeat alerts for the same visible opportunity

The script does **not** try to recreate Torn's unique requirements. It reacts to the unique indicator Torn already displays.

## Controls

A small watcher pill appears in the lower-right corner on supported crime pages.

- **Click:** toggle alert sound
- **Shift + Click:** test the flash, sound, and popup

The pill will show either:

- `★ Shoplifting watcher armed 🔊`
- `★ Pickpocketing watcher armed 🔊`
- `★ Unique watcher paused 🔊`

## Intended behavior

This script is deliberately simple:

- no API key
- no hosting
- no external server
- no automatic crime actions
- no extra Torn requests
- no monitoring from a hidden or unfocused Torn tab

It only reads the crime page that you opened and are actively viewing.

## Updates

The userscript includes `@updateURL` and `@downloadURL` metadata pointing at this repository. When the version number is increased, Tampermonkey can detect future updates from GitHub.

## Current version

**v0.1.0**

This is the first test release. Torn's frontend markup can change, so real-world testing on both crime pages is important.

## Disclaimer

Unofficial community userscript. Not affiliated with or endorsed by Torn.
