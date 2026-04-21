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

## 4. Enable Firestore
1. Open **Firestore Database**
2. Click **Create database**
3. Start in production mode or test mode for initial setup
4. Select a region close to your audience

## 5. Create the posts collection
Collection name:

```txt
posts
```

Document fields for MVP:

- `content` : string
- `categories` : string[]
- `language` : `"ja"` or `"en"`
- `createdAt` : timestamp
- `authorAnonIdHash` : string

## 6. Firestore security rules for MVP draft
Use this only as a starting point and review before production.

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if true;
      allow create: if true;
      allow delete: if true;
      allow update: if false;
    }
  }
}
```

## 7. Current security limitation
The current app design uses:
- anonymous local identifier in LocalStorage
- physical delete
- owner matching by `authorAnonIdHash`

This is enough for MVP behavior, but it is not enough for strong server-side ownership proof.

A Firestore rule cannot safely trust a client-provided hash from LocalStorage by itself.
That means the current delete model is convenient, but not truly secure against malicious clients.

## 8. Recommended security roadmap

### Option A: keep current MVP rules temporarily
Use the open MVP rules only while validating the product quickly.

Pros:
- fastest implementation
- no login UI
- simplest operation

Cons:
- anyone can delete any document if they know the document path
- not suitable for production traffic

### Option B: anonymous Firebase Authentication
Add Firebase Anonymous Auth and store `request.auth.uid` on each post.

Recommended rule shape:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null
        && request.resource.data.authorUid == request.auth.uid;
      allow delete: if request.auth != null
        && resource.data.authorUid == request.auth.uid;
      allow update: if false;
    }
  }
}
```

Pros:
- still feels anonymous to users
- ownership can be enforced in Firestore Rules
- minimal UI impact

Cons:
- adds auth integration work
- anonymous accounts need device/session handling considerations

### Option C: server-side delete endpoint
Move deletion to a trusted backend or serverless function.

Possible flow:
1. client sends post id
2. backend verifies ownership token or signed secret
3. backend deletes the Firestore document

Pros:
- strongest control
- flexible abuse prevention
- easier future moderation extensions

Cons:
- more infrastructure
- slower MVP development

## 9. Recommendation for NOT YET
For the current stage:

1. keep the existing MVP rules only for short-term testing
2. do not treat them as production-safe
3. when moving beyond MVP, prefer Firebase Anonymous Auth first
4. if abuse or moderation needs increase, move deletion to backend logic

This keeps the product anonymous while making ownership enforcement realistic.

## 10. Next implementation steps
After `.env.local` is prepared:
1. verify Firebase config loads correctly
2. connect timeline reads to Firestore
3. connect create post
4. connect delete post
5. replace mock data fully