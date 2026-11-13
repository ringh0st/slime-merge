# Slime Merge

A squishy physics merge puzzle built with React and Matter.js.

**Drop. Match. Merge. Don't overflow.**

- Two matching slimes merge into the next, bigger slime. There are 10 tiers, from Drip to King 👑.
- Merge again within about a second to chain a **combo**, worth ×1.5, ×2 and more.
- After a while **rocks** start dropping. They can't merge and only crack when a merge happens beside them.
- If anything stays above the dashed line for too long, the jar overflows and the game ends.

## Play on your phone

Open the GitHub Pages link on your phone, then:

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
| Pause | ⏸ button | Esc or P |

## Develop

```bash
npm install
npm run dev
```

`npm run build` outputs a static site to `dist/`. Every push to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.

## Design

The look follows current UI trends: soft, toy-like 3D forms, frosted-glass panels, depth and light on a minimal base, and small interactive touches. The slimes are drawn on canvas with gradient shading, specular highlights, a spring-based squash and stretch, and faces that blink and follow your aim. The jar is a CSS 3D glass panel that tilts slightly toward the pointer.
