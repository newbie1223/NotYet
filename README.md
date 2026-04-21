# NOT YET

NOT YET is a minimal anonymous web app for leaving what is still on hold.

## Current MVP
- Home timeline
- Create post
- My posts
- Japanese / English switch
- Local anonymous ID
- Firestore read / create / physical delete

## Tech stack
- React
- TypeScript
- Vite
- Firebase Firestore
- GitHub Pages

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

### Recommended deployment flow
1. Push this project to GitHub repository `NotYet`
2. Run production build
3. Publish the `dist` directory with GitHub Pages or GitHub Actions

### Routing note
The app uses `HashRouter` for GitHub Pages compatibility.

Routes are exposed as:
- `/#/`
- `/#/create`
- `/#/my-posts`

This avoids direct-access 404 issues on GitHub Pages.

## Current Firebase environment variables

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Next recommended tasks
- Tighten Firestore security rules
- Improve empty states and final copy
- Split app logic into smaller components
