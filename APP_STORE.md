# Publishing Slime Merge to the App Store

The iOS app is already in this repo (`ios/`), and GitHub builds, signs and uploads it for you, so you don't need a Mac. The steps below are the parts only you can do in your Apple account. Each one takes a few minutes.

## 1. Join the Apple Developer Program

- Go to [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll/) and enroll as an **Individual** ($99/year).
- Approval takes from a few hours to a couple of days. Wait for the confirmation email before step 2.

## 2. Find your Team ID

[developer.apple.com/account](https://developer.apple.com/account) → **Membership details** → **Team ID**. It's a 10-character code like `A1B2C3D4E5`.

## 3. Register the app's Bundle ID

[Certificates, IDs & Profiles → Identifiers](https://developer.apple.com/account/resources/identifiers/list) → **+** → **App IDs** → **App**:

- Description: `Slime Merge`
- Bundle ID: **Explicit** → `com.ringh0st.slimemerge`
- Leave every capability unchecked → Continue → Register.

## 4. Create the app in App Store Connect

[appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Apps** → **+** → **New App**:

- Platform: **iOS**
- Name: `Slime Merge`. Names must be unique on the store; if it's taken, try something like `Slime Merge: Jelly Drop`.
- Primary language: English
- Bundle ID: `com.ringh0st.slimemerge`
- SKU: `slimemerge`
- User access: Full Access

## 5. Create an App Store Connect API key

This key lets GitHub sign and upload builds for you.

App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API** → **Team Keys** → **+**:

- Name: `GitHub`
- Access: **Admin**. Admin is required so GitHub can create the signing certificate automatically.
- Click **Download API Key**. You get a file named `AuthKey_XXXXXXXXXX.p8`. **You can only download it once**, so keep it safe.
- Note the **Key ID** shown next to the key and the **Issuer ID** shown above the list.

## 6. Add 4 secrets to GitHub

[Repo → Settings → Secrets and variables → Actions](https://github.com/ringh0st/slime-merge/settings/secrets/actions) → **New repository secret**, four times:

| Name | Value |
| --- | --- |
| `APPLE_TEAM_ID` | Team ID from step 2 |
| `ASC_KEY_ID` | Key ID from step 5 |
| `ASC_ISSUER_ID` | Issuer ID from step 5 |
| `ASC_KEY_P8` | The **entire contents** of the `.p8` file, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines. Open it in a text editor and copy everything. |

Never paste these into a chat, an issue or a commit. GitHub secrets are encrypted and hidden from logs.

## 7. Build and upload

[Actions → iOS](https://github.com/ringh0st/slime-merge/actions/workflows/ios.yml) → **Run workflow** → **Run workflow**.

It takes about 10 minutes. Apple then processes the build for another 5–30 minutes before it shows up under **TestFlight** in App Store Connect.

## 8. Try it on your iPhone with TestFlight

- App Store Connect → your app → **TestFlight** → **Internal Testing** → **+** → create a group and add yourself.
- Install the **TestFlight** app from the App Store on your iPhone, then accept the invite.
- You can also invite up to 10,000 friends with a public link under **External Testing**. Their first build goes through a quick beta review.

## 9. Submit to the App Store

In App Store Connect → your app → the **iOS App 1.0** page, fill in:

- **Screenshots**: at least one set for 6.9" iPhone (1320 × 2868). Ask Claude to generate them.
- **Description**, **Keywords** (e.g. `merge,slime,puzzle,physics,casual,drop`), **Support URL**: `https://github.com/ringh0st/slime-merge`
- **Privacy Policy URL**: `https://ringh0st.github.io/slime-merge/privacy.html`
- **App Privacy** (left sidebar) → Get Started → **"No, we do not collect data from this app"**
- **Age rating** questionnaire: answer "None" to everything, which gives 4+
- **Category**: Games → Puzzle. **Price**: Free.
- **Build**: pick the build you uploaded in step 7.

Then click **Add for Review** → **Submit**. Review usually takes 1–3 days.

## Shipping updates

Push changes to `main`, then run the iOS workflow again. Each run gets a new build number automatically. For a new App Store version, also bump `MARKETING_VERSION` in `ios/App/App.xcodeproj/project.pbxproj` (e.g. `1.0` → `1.1`).

## Android

Every push builds a test APK: [Actions → Android](https://github.com/ringh0st/slime-merge/actions/workflows/android.yml) → latest run → **Artifacts** → `slime-merge-apk`. Unzip it, copy it to an Android phone and open it to install. You may need to allow "Install unknown apps". Publishing on Google Play ($25 one-time) needs a signed release build, which can be added later.
