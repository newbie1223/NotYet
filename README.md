# NOT YET

NOT YET is a minimal anonymous web app for leaving what is still on hold.

## Current MVP
- Home timeline
- Create post
- My posts
- Japanese / English switch
- Firebase Anonymous Auth
- Firestore read / create / physical delete

## Tech stack
- React
- TypeScript
- Vite
- Firebase Authentication
- Firebase Firestore
- GitHub Pages
- GitHub Actions

## Local development

Install dependencies:

```bash
npm install
```

Create environment variables:

```bash
cp .env.example .env.local
```

Fill `.env.local` with Firebase Web App values.

Start development server:

```bash
npm run dev -- --host 0.0.0.0
```

## Build

```bash
npm run build
```

## Firebase setup
See:

- `FIREBASE_SETUP.md`
- `firestore.rules`

## GitHub Pages deployment

This project is currently configured for the repository name:

```txt
NotYet
```

Vite base path:

```txt
/NotYet/
```

If your repository name changes, update `vite.config.ts`.

### Routing note
The app uses `HashRouter` for GitHub Pages compatibility.

Routes are exposed as:
- `/#/`
- `/#/create`
- `/#/my-posts`

This avoids direct-access 404 issues on GitHub Pages.

### Deployment with GitHub Actions
This repository includes:

```txt
.github/workflows/deploy.yml
```

Before the workflow can build successfully, add these GitHub repository secrets:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

GitHub path:
1. Open the repository
2. Go to **Settings**
3. Open **Secrets and variables** → **Actions**
4. Add each secret

Then enable Pages:
1. Open **Settings**
2. Open **Pages**
3. Set **Source** to **GitHub Actions**

After that, pushing to `main` will trigger deployment.

## Current Firebase environment variables

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Security note
- Firestore ownership control is now intended to rely on Firebase Anonymous Auth
- Apply the rules from `firestore.rules` before public launch
- Do not commit `.env.local`

## Next recommended tasks
- Verify anonymous auth in production
- Confirm Firestore Rules are published
- Split app logic into smaller components
