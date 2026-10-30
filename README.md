# CampusConnect — Firebase Edition

This version connects the Campus Lost & Found application to your Firebase project `lostsearch-e0ce6`.

## Included
- Firebase Web SDK (modular CDN imports)
- Firebase Anonymous Authentication
- Cloud Firestore live reports (`reports` collection)
- Create, live-read, mark-reunited and delete reports
- Search, filters, dashboard counters and responsive Bootstrap UI

## Firebase setup (one-time)
1. Open https://console.firebase.google.com/ and select **lostsearch-e0ce6**.
2. In **Authentication → Sign-in method**, enable **Anonymous**.
3. In **Firestore Database**, create a database.
4. Open Firestore **Rules**, replace the rules with the contents of `firestore.rules`, and publish.
5. Run the site using VS Code **Live Server** (do not open the HTML as a `file://` page).

## Run locally
1. Extract the ZIP.
2. Open the extracted `Campus_Lost_Found` folder in VS Code.
3. Install/enable the Live Server extension if needed.
4. Right-click `index.html` → **Open with Live Server**.

## Important security behavior
- Everyone who opens the app signs in anonymously.
- All signed-in visitors can read reports.
- Only the anonymous account that created a report can update or delete it.
- Anonymous account identity is browser/device-specific. Clearing browser data can lose that anonymous identity, so the owner may no longer be able to edit/delete their old reports.
- For a real campus launch, add verified student sign-in, moderation, abuse reporting, and stricter data validation.

## Firebase configuration
Your provided Firebase web app configuration is in `js/firebase-config.js`. Firebase web API keys are identifiers for the project, not server secrets. Security must be enforced through Authentication and Firestore Security Rules. Never put service-account private keys in frontend code.

## Project structure
```
Campus_Lost_Found/
├── index.html
├── README.md
├── firestore.rules
├── css/style.css
└── js/
    ├── app.js
    └── firebase-config.js
```
