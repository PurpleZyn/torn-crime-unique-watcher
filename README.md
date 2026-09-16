# Torn Crime Unique Watcher

A lightweight Torn userscript with two different unique watchers:

- **Pickpocketing:** watches Torn's real Unique Outcome star while you are actively viewing the Pickpocketing page.
- **Shoplifting:** uses Torn's official API to watch security states from anywhere on Torn and alerts when a security-dependent unique you may still need becomes available.

## Install

### Tampermonkey

[Install v0.2.1](https://raw.githubusercontent.com/PurpleZyn/torn-crime-unique-watcher/main/torn-crime-unique-watcher-v0.2.0.user.js)

The versioned installer is provided to avoid stale GitHub raw-file caching. Future updates still point at the normal stable userscript path.

## Shoplifting API setup

v0.2.0 requires a **Minimal Access** Torn API key for personalized Shoplifting alerts.

1. Install the script.
2. Open any Torn page.
3. Click the watcher pill in the lower-right when it says `SL API setup`.
4. Use **Open Torn API settings** if needed and create a Minimal Access key.
5. Paste the key into the watcher.
6. Choose a 15, 30, or 60 second polling interval.
7. Click **Save & Test API**.

The key is stored in your browser's Torn localStorage and is sent only to Torn's official `api.torn.com` API.

The API setup reads:

- your Shoplifting skill
- your completed Shoplifting unique outcomes
- current Shoplifting shop security states
- Torn item names used to identify completed unique rewards

The watcher refreshes your personal Shoplifting data periodically and polls current shop security at the interval you selected.

## What Shoplifting API alerts mean

The API can see shop security states, so the script monitors uniques whose availability depends on cameras, checkpoints, or guards.

It filters using your Shoplifting skill and the completed unique rewards it can recognize. When a qualifying security window opens, it alerts from whatever Torn page you are currently using.

Some uniques have conditions that cannot be fully established from the Shoplifting security API. For example, the Cluster Ring also requires zero notoriety. In those cases the alert explicitly mentions the additional condition.

Security-independent uniques and conditions such as notoriety-only outcomes are still handled by Torn's own unique star when you actively visit the Shoplifting page.

## Pickpocketing

Pickpocketing remains page-based. The script only watches it while the Pickpocketing page is actively visible and focused.

When Torn displays its real Unique Outcome star, the script:

- flashes the screen
- plays the alert sound
- displays a Unique Available popup
- suppresses duplicate alerts for the same visible opportunity

The page watcher automatically pauses when the Torn tab/window is not active.

## Controls

The watcher pill is available throughout Torn in v0.2.0.

- **Click:** mute/unmute
- **Shift + Click:** test the flash and alert sound
- **Ctrl + Click:** cycle volume through 25%, 50%, 75%, and 100%
- **Alt + Click:** open Shoplifting API settings
- **Drag:** move the watcher pill anywhere on screen

The API settings window also includes **Reset Pill Position** to return it to the bottom-right.

Before an API key is configured, normal click opens API setup.

## Privacy / behavior

The script:

- does not host or send data to an external server
- never performs a crime automatically
- never clicks a crime for you
- uses Torn's official API for background Shoplifting checks
- only performs DOM-based unique detection on Shoplifting/Pickpocketing while that page is actively viewed

## Current version

**v0.2.1**

v0.2.0 adds the hybrid Shoplifting API watcher while preserving the v0.1.2 live-page Pickpocketing watcher, sound controls, and strict `unique-outcome-star` detection.

## Disclaimer

Unofficial community userscript. Not affiliated with or endorsed by Torn.
