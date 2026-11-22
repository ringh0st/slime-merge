# Slime Merge

A squishy physics merge puzzle built with React and Matter.js.

**Drop. Match. Merge. Don't overflow.**

- Two matching slimes merge into the next, bigger slime. There are 10 tiers, from Drip to King 👑.
- Merge again within about a second to chain a **combo**, worth ×1.5, ×2 and more.
- After a while **rocks** start dropping. They can't merge and only crack when a merge happens beside them.
- If anything stays above the dashed line for too long, the jar overflows and the game ends.

## What's in the game

- **Nicknames and Top players** (`Nickname`, `Records`): a player picks a nickname once (on the home page or on Top players); after that every game's score saves by itself under it. The home page shows the top three of all time, and Top players lists all time, the month and the week.
- **Sound** (`src/game/audio.js`): everything is made in the browser, no sound files. Soft, squishy effects with a little echo (merges sound deeper for bigger slimes and a chime climbs with each combo), and quiet, bouncy background music that is put together as it plays, so it never loops the same way twice, and picks up a little when the jar gets full. The speaker button opens two switches: Music and Sound effects.
- **Fight a friend** (`src/fight.js`, `useFight`, `Fight`, `GhostJar`): a live three-minute fight between two players who share a five-digit code. The screen shows two short jars, the friend's on top and yours under it (`FIGHT_SHAPE`: shorter, slimes at 62% size, and fierce faces with lowered brows and a grin). You watch the other jar live: each game sends where its pieces are five times a second and `GhostJar` draws them, gliding between positions. Both get the same pieces, and a combo drops rocks into the other jar. Whoever overflows first loses the round; if both last, the higher score takes it. A match is the first to two rounds. Players can send four quick reactions (emoji) that pop up on the other screen. Nothing is stored and there are no accounts: the two games talk through a Supabase Realtime channel named after the code (about 10 messages a second per fight). While developing, `?localfight` links two tabs of one browser without the server. Random matching with strangers is an idea for later, once enough people play.
- **Add to Home Screen** (`src/install.js`, `InstallHelp`): a small button at the bottom of the home page (hidden once the game runs from the home screen or as a store app) opens the steps for iPhone, Android or a computer, with an Install now button where the browser allows a one-tap install.
- **Continue a game** (`Game.serialize` / `restore`, `slime.run`): a game in progress is kept on the device every few seconds and when the game goes to the background, so a closed tab or locked phone doesn't lose it. The home page then offers Continue (and Start a new game). A daily jar can be continued only on its own day; fights can't be continued.
- **First game** (`COACH_TIPS`, `gentle`): a new player's first game shows one tip at a time in the jar (aim and drop, merge two of a kind, stay under the line, the helpers), each staying until the player has done it, and holds back special pieces and rocks a little longer.
- **Too high!** (`.overflow-warn`, `sfx.warn`): when slimes sit over the line, a ring empties and shows the seconds left, with a tick that rises, so an overflow never comes as a surprise.
- **Daily streak** (`dailyStreak`): days in a row of the daily jar. Three in a row unlock the Beanie and seven the Halo, hats nothing else gives.
- **Hiding a name** (`slime_hidden_names`): the owner can hide a name from every board by adding it to this table (the SQL file says how). There is no report button in the game.
- **Club extras**: last week's club winner wears a small crown on the club board (`slime_club_winner`), and the home page shows the club member to beat next.
- **Home page** (`Home`): the game opens on its own page, not on a card over the jar: Play, today's daily jar with its week, and four doors (Jars, Jar club, Slime book, Records) that show where you stand. A Home button sits in the top bar on every other screen, also mid-game: leaving a game keeps what was scored (best score, goals and the boards).

- **Special pieces** (`src/game/tiers.js`, `engine.js`): now and then a **Rainbow** drops (it becomes whatever slime it touches and merges with it), a **Bomb** (pops everything close a moment after it lands) or a **Frozen** slime (can't merge until a merge happens beside it). Rocks are still there.
- **Jars** (`src/game/jars.js`, `JarPicker`): Classic, Honey (thick and sticky), Space (floaty) and the Fish bowl (round bottom, bubbles lift small slimes). A jar opens once you've scored enough points in total, over all games.
- **Helpers** (`HelperBar`): **Shake** makes everything jump, **Pop** removes the piece you tap, **Hold** puts the waiting piece aside. You start with one Shake and one Pop and earn more by scoring (the bar under the buttons fills).
- **Daily jar** (`src/daily.js`, `DailyCard`): one jar a day (UTC) with the same pieces for everyone and one try, its own board and a share button.
- **Jar club** (`src/club.js`, `Club`): a private board for family and friends, joined with a short code like `JELLY-4821`. No accounts. The menu tells you when someone in the club passes you.
- **Slime book and hats** (`src/game/goals.js`, `SlimeBook`): every slime you've made, the special pieces, and six goals that each unlock a hat. Tap an unlocked hat to put it on the bigger slimes in the jar (and on your slime on the boards).

Everything a player earns is kept on their device; only saved scores go to the server.

## Play on your phone

The game lives at **https://slime.lumipals.app** (GitHub Pages with a custom domain: a `CNAME` record `slime` → `ringh0st.github.io` at Cloudflare, DNS only, and the same name under the repository's Settings → Pages → Custom domain; `public/CNAME` holds it too). Open it on your phone, then:

- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** ⋮ menu → **Install app** / **Add to Home screen**

It installs with its own icon, runs full-screen and works offline.

## Native apps (iOS and Android)

The game is wrapped as a native app with [Capacitor](https://capacitorjs.com), in `ios/` and `android/`, with native haptics, a splash screen and offline play.

- **iOS / App Store:** GitHub Actions builds, signs and uploads it to TestFlight. See **[APP_STORE.md](APP_STORE.md)** for the one-time setup.
- **Android:** every push builds a test APK under *Actions → Android → Artifacts*.

After changing the web code locally, run `npm run build && npx cap sync` to copy it into the native projects.

## Controls

| Action | Touch / mouse | Keyboard |
| --- | --- | --- |
| Aim | drag / move | ← → or A D |
| Drop | release / click | Space or ↓ |
| Hold | Hold button | H |
| Pause | ⏸ button | Esc or P |

## Develop

```bash
npm install
npm run dev
```

`npm run build` outputs a static site to `dist/`. Every push to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.

## Design

The look follows current UI trends: soft, toy-like 3D forms, frosted-glass panels, depth and light on a minimal base, and small interactive touches. The slimes are drawn on canvas with gradient shading, specular highlights, a spring-based squash and stretch, and faces that blink and follow your aim. The jar is a CSS 3D glass panel that tilts slightly toward the pointer.

## Records

After a game, players can save their score under a name and see the best of the week, the month and all time (`src/records.js`, `Records`, `SaveScore`). No accounts. The scores live in a Supabase table reached only through a few functions (world, club and daily boards); run `supabase/slime_records.sql` in the Supabase SQL Editor to set it up, and run it again whenever that file changes. Until it has been run again, the world records keep working and the club and daily boards say they aren't ready yet.
