# Firebase setup for NOT YET

## 1. Create a Firebase project
1. Open Firebase Console
2. Click **Add project**
3. Project name example: `not-yet`
4. Google Analytics is optional for MVP

## 2. Add a Web App
1. Open **Project settings**
2. In **Your apps**, choose **Web**
3. App nickname example: `not-yet-web`
4. You will receive a Firebase config object

## 3. Required environment variables
Create a `.env.local` file in the project root.

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

If Firebase gives `storageBucket` in the `appspot.com` format, use that exact value.

## 4. Enable Authentication
1. Open **Authentication**
2. Click **Get started**
3. Open the **Sign-in method** tab
4. Enable **Anonymous**
5. Save

## 5. Enable Firestore
1. Open **Firestore Database**
2. Click **Create database**
3. Start in production mode or test mode for initial setup
4. Select a region close to your audience

## 6. Create the posts collection
Collection name:

```txt
posts
```

Document fields:

- `content` : string
- `categories` : string[]
- `language` : `"ja"` or `"en"`
- `createdAt` : timestamp
- `authorUid` : string

## 7. Firestore security rules
Use the repository root `firestore.rules` file as the current source of truth.

Recommended production rule:

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if true;

      allow create: if request.auth != null
        && request.resource.data.keys().hasOnly([
          'content',
          'categories',
          'language',
          'createdAt',
          'authorUid'
        ])
        && request.resource.data.content is string
        && request.resource.data.content.size() > 0
        && request.resource.data.content.size() <= 120
        && request.resource.data.categories is list
        && request.resource.data.categories.size() <= 6
        && request.resource.data.language in ['ja', 'en']
        && request.resource.data.createdAt is timestamp
        && request.resource.data.authorUid == request.auth.uid;

      allow delete: if request.auth != null
        && resource.data.authorUid == request.auth.uid;

      allow update: if false;
    }
  }
}
```

## 8. Why this is safer
The app now relies on Firebase Anonymous Authentication instead of trusting a LocalStorage-only owner marker.

Benefits:
- users still do not need visible login UI
- Firestore Rules can verify ownership using `request.auth.uid`
- delete permission is restricted to the creator of the post

## 9. Apply rules in Firebase Console
1. Open **Firestore Database**
2. Open the **Rules** tab
3. Replace the current rules with the contents of `firestore.rules`
4. Click **Publish**

## 10. GitHub Actions deployment secrets
If you deploy with GitHub Pages Actions, add these repository secrets in GitHub:

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

## 11. Notes
- `.env.local` must stay local and must not be committed
- old documents using `authorAnonIdHash` will not satisfy the new rules and data shape
- for a clean launch, use new posts with the `authorUid` field

## 12. Next implementation checks
After setup:
1. confirm anonymous auth signs in successfully
2. confirm create works with the new rules
3. confirm only the owner can delete
4. confirm timeline read still works
5. confirm GitHub Actions build receives repository secrets