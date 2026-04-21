import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'
import { auth, db, hasFirebaseEnv } from './lib/firebase'
import { getOrCreateAnonId, hashAnonId } from './utils/anonId'

type Language = 'ja' | 'en'
type CategoryKey =
  | 'career'
  | 'relationships'
  | 'money'
  | 'whereToLive'
  | 'learning'
  | 'life'

type Post = {
  id: string
  content: string
  categories: CategoryKey[]
  language: Language
  createdAt: string
  authorUid: string
}

type FirestorePost = {
  content: string
  categories?: string[]
  language: Language
  createdAt?: Timestamp
  authorUid: string
}

const categoryLabels: Record<Language, Record<CategoryKey, string>> = {
  ja: {
    career: '仕事',
    relationships: '恋愛',
    money: 'お金',
    whereToLive: '住む場所',
    learning: '学ぶこと',
    life: '人生',
  },
  en: {
    career: 'Career',
    relationships: 'Relationships',
    money: 'Money',
    whereToLive: 'Where to live',
    learning: 'Learning',
    life: 'Life',
  },
}

const copy = {
  ja: {
    brand: 'NOT YET',
    tagline: 'まだ決めていない時間も、人生の一部。',
    myPosts: '自分の投稿',
    addPost: '＋',
    createPlaceholder: 'まだ決めていないことを、1行だけ',
    helper: '説明も、理由もいりません',
    submit: 'NOT YET',
    close: '閉じる',
    back: '戻る',
    manageTitle: '自分の投稿',
    manageNote: 'この端末で作成した投稿だけが表示されます',
    delete: '削除',
    deleteTitle: 'この投稿を削除しますか',
    deleteBody: '削除すると、元には戻せません',
    cancel: 'キャンセル',
    noPosts: 'この端末では、まだ投稿していません',
    emptyTimeline: 'まだ、誰の保留も置かれていません',
    postedOn: '投稿日',
    demoMode: 'デモ表示中',
    timelineModeLive: '匿名の保留を表示しています',
    timelineModeDemo: 'Firebase未接続のため、サンプルを表示しています',
    createNote: '今は、まだ決めなくて大丈夫です',
  },
  en: {
    brand: 'NOT YET',
    tagline: 'Time you haven’t decided yet is still your life.',
    myPosts: 'My posts',
    addPost: '+',
    createPlaceholder: 'One line of what is not yet decided',
    helper: 'No explanation, no reason needed',
    submit: 'NOT YET',
    close: 'Close',
    back: 'Back',
    manageTitle: 'My posts',
    manageNote: 'Only posts created on this device are shown here',
    delete: 'Delete',
    deleteTitle: 'Delete this post?',
    deleteBody: 'Once deleted, it cannot be restored',
    cancel: 'Cancel',
    noPosts: 'Nothing has been posted from this device yet',
    emptyTimeline: 'Nothing has been left on hold here yet',
    postedOn: 'Posted',
    demoMode: 'Demo mode',
    timelineModeLive: 'Showing anonymous posts on hold',
    timelineModeDemo: 'Firebase is not connected, so sample posts are shown',
    createNote: 'You do not have to decide now',
  },
} as const

const samplePosts: Post[] = [
  {
    id: '1',
    content: '東京に住み続けるか決めていない',
    categories: ['whereToLive', 'life'],
    language: 'ja',
    createdAt: '2023-12-01T00:00:00.000Z',
    authorUid: 'me',
  },
  {
    id: '2',
    content: 'I still have not decided whether to leave my job',
    categories: ['career', 'life'],
    language: 'en',
    createdAt: '2022-08-19T00:00:00.000Z',
    authorUid: 'other',
  },
  {
    id: '3',
    content: '結婚するかどうかを、まだ決めていない',
    categories: ['relationships', 'life'],
    language: 'ja',
    createdAt: '2024-03-12T00:00:00.000Z',
    authorUid: 'me',
  },
]

const allCategories = Object.keys(categoryLabels.en) as CategoryKey[]

function formatHoldDuration(dateString: string, language: Language) {
  const now = new Date()
  const created = new Date(dateString)

  let years = now.getFullYear() - created.getFullYear()
  let months = now.getMonth() - created.getMonth()
  let days = now.getDate() - created.getDate()

  if (days < 0) {
    const previousMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
    days += previousMonthLastDay
    months -= 1
  }

  if (months < 0) {
    months += 12
    years -= 1
  }

  if (years < 0) {
    years = 0
    months = 0
    days = 0
  }

  if (language === 'ja') {
    const parts = []
    if (years > 0) parts.push(`${years}年`)
    if (months > 0) parts.push(`${months}ヶ月`)
    if (days > 0 || parts.length === 0) parts.push(`${days}日`)
    return `保留 ${parts.join(' ')}`
  }

  const parts = []
  if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`)
  if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`)
  if (days > 0 || parts.length === 0) parts.push(`${days} day${days > 1 ? 's' : ''}`)

  return `On hold for ${parts.join(' ')}`
}

function formatDate(dateString: string, language: Language) {
  return new Intl.DateTimeFormat(language === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString))
}

function App() {
  const [language, setLanguage] = useState<Language>('ja')
  const [posts, setPosts] = useState<Post[]>([])
  const [draft, setDraft] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<CategoryKey[]>([])
  const [postToDelete, setPostToDelete] = useState<Post | null>(null)
  const [anonIdHash, setAnonIdHash] = useState<string | null>(null)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [isUsingFirebase, setIsUsingFirebase] = useState(false)
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)

  useEffect(() => {
    const prepareAnonId = async () => {
      const anonId = getOrCreateAnonId()
      const hashed = await hashAnonId(anonId)
      setAnonIdHash(hashed)
    }

    void prepareAnonId()
  }, [])

  useEffect(() => {
    if (!auth || !hasFirebaseEnv) {
      return
    }

    const currentAuth = auth

    const unsubscribe = onAuthStateChanged(currentAuth, async (user) => {
      if (user) {
        setAuthUser(user)
        return
      }

      try {
        const credential = await signInAnonymously(currentAuth)
        setAuthUser(credential.user)
      } catch (error) {
        console.error('Failed to sign in anonymously.', error)
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const loadPosts = async () => {
      setIsLoadingPosts(true)

      if (!db || !hasFirebaseEnv) {
        setPosts(samplePosts)
        setIsUsingFirebase(false)
        setIsLoadingPosts(false)
        return
      }

      try {
        const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(postsQuery)
        const nextPosts: Post[] = snapshot.docs.map((item) => {
          const data = item.data() as FirestorePost

          return {
            id: item.id,
            content: data.content,
            categories: (data.categories ?? []).filter((category): category is CategoryKey =>
              allCategories.includes(category as CategoryKey),
            ),
            language: data.language,
            createdAt: data.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
            authorUid: data.authorUid,
          }
        })

        setPosts(nextPosts)
        setIsUsingFirebase(true)
      } catch (error) {
        console.error('Failed to load posts from Firestore.', error)
        setPosts(samplePosts)
        setIsUsingFirebase(false)
      } finally {
        setIsLoadingPosts(false)
      }
    }

    void loadPosts()
  }, [])

  const t = copy[language]
  const myPosts = useMemo(() => {
    if (isUsingFirebase) {
      if (!authUser) return []
      return posts.filter((post) => post.authorUid === authUser.uid)
    }

    if (!anonIdHash) return []
    return posts.filter((post) => post.authorUid === anonIdHash)
  }, [anonIdHash, authUser, isUsingFirebase, posts])

  const timelinePosts = useMemo(() => {
    const shuffled = [...posts]

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1))
      ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
    }

    return shuffled
  }, [posts])

  const toggleCategory = (category: CategoryKey) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    )
  }

  const handleSubmit = async () => {
    const content = draft.trim()
    if (!content || !anonIdHash) return false

    const nextPost: Post = {
      id: crypto.randomUUID(),
      content,
      categories: selectedCategories,
      language,
      createdAt: new Date().toISOString(),
      authorUid: authUser?.uid ?? anonIdHash,
    }

    if (db && hasFirebaseEnv && authUser) {
      try {
        const docRef = await addDoc(collection(db, 'posts'), {
          content: nextPost.content,
          categories: nextPost.categories,
          language: nextPost.language,
          createdAt: Timestamp.fromDate(new Date(nextPost.createdAt)),
          authorUid: nextPost.authorUid,
        })

        nextPost.id = docRef.id
        setIsUsingFirebase(true)
      } catch (error) {
        console.error('Failed to create post in Firestore.', error)
        setIsUsingFirebase(false)
      }
    }

    setPosts((current) => [nextPost, ...current])
    setDraft('')
    setSelectedCategories([])
    return true
  }

  const handleDelete = async () => {
    if (!postToDelete) return

    if (db && hasFirebaseEnv && isUsingFirebase) {
      try {
        await deleteDoc(doc(db, 'posts', postToDelete.id))
      } catch (error) {
        console.error('Failed to delete post in Firestore.', error)
      }
    }

    setPosts((current) => current.filter((post) => post.id !== postToDelete.id))
    setPostToDelete(null)
  }

  return (
    <div className="app-shell">
      <Routes>
        <Route
          element={
            <HomePage
              isLoadingPosts={isLoadingPosts}
              isUsingFirebase={isUsingFirebase}
              language={language}
              posts={timelinePosts}
              setLanguage={setLanguage}
              t={t}
            />
          }
          path="/"
        />
        <Route
          element={
            <CreatePage
              draft={draft}
              language={language}
              selectedCategories={selectedCategories}
              setDraft={setDraft}
              t={t}
              toggleCategory={toggleCategory}
              onSubmit={handleSubmit}
            />
          }
          path="/create"
        />
        <Route
          element={
            <MyPostsPage
              isUsingFirebase={isUsingFirebase}
              language={language}
              posts={myPosts}
              setPostToDelete={setPostToDelete}
              t={t}
            />
          }
          path="/my-posts"
        />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>

      {postToDelete && (
        <div className="dialog-backdrop" role="presentation">
          <div
            aria-describedby="delete-dialog-description"
            aria-labelledby="delete-dialog-title"
            aria-modal="true"
            className="dialog"
            role="dialog"
          >
            <h2 id="delete-dialog-title">{t.deleteTitle}</h2>
            <p className="dialog-post-preview">{postToDelete.content}</p>
            <p id="delete-dialog-description">{t.deleteBody}</p>
            <div className="dialog-actions">
              <button className="ghost-button" onClick={() => setPostToDelete(null)} type="button">
                {t.cancel}
              </button>
              <button className="danger-button" onClick={handleDelete} type="button">
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type PageProps = {
  language: Language
  t: (typeof copy)[Language]
}

function HomePage({
  isLoadingPosts,
  isUsingFirebase,
  language,
  posts,
  setLanguage,
  t,
}: PageProps & {
  isLoadingPosts: boolean
  isUsingFirebase: boolean
  posts: Post[]
  setLanguage: (language: Language) => void
}) {
  return (
    <main className="page page-home">
      <header className="topbar">
        <div>
          <p className="brand">{t.brand}</p>
        </div>
        <div className="topbar-actions">
          <div className="language-switch" aria-label="Language switch">
            <button
              className={language === 'ja' ? 'is-active' : ''}
              onClick={() => setLanguage('ja')}
              type="button"
            >
              JP
            </button>
            <span>|</span>
            <button
              className={language === 'en' ? 'is-active' : ''}
              onClick={() => setLanguage('en')}
              type="button"
            >
              EN
            </button>
          </div>
          <Link className="ghost-link" to="/my-posts">
            {t.myPosts}
          </Link>
        </div>
      </header>

      <section className="hero">
        <h1>{t.tagline}</h1>
        <p className="hero-note">{isUsingFirebase ? t.timelineModeLive : t.timelineModeDemo}</p>
      </section>

      <section className="timeline" aria-label="Timeline">
        {isLoadingPosts ? null : posts.length === 0 ? (
          <p className="empty-state">{t.emptyTimeline}</p>
        ) : (
          posts.map((post) => (
            <article className="post-card" key={post.id}>
              <p className="post-content">{post.content}</p>
              <p className="post-hold">{formatHoldDuration(post.createdAt, language)}</p>
              {post.categories.length > 0 && (
                <div className="post-categories">
                  {post.categories.map((category) => (
                    <span className="category-chip" key={category}>
                      {categoryLabels[language][category]}
                    </span>
                  ))}
                </div>
              )}
              <p className="post-date">
                {t.postedOn} {formatDate(post.createdAt, language)}
              </p>
            </article>
          ))
        )}
      </section>

      <Link aria-label="Create post" className="fab fab-link" to="/create">
        <span aria-hidden="true" className="fab-icon" />
      </Link>
    </main>
  )
}

function CreatePage({
  draft,
  language,
  selectedCategories,
  setDraft,
  t,
  toggleCategory,
  onSubmit,
}: PageProps & {
  draft: string
  selectedCategories: CategoryKey[]
  setDraft: (value: string) => void
  toggleCategory: (category: CategoryKey) => void
  onSubmit: () => Promise<boolean>
}) {
  const navigate = useNavigate()

  const handleSubmitClick = async () => {
    const succeeded = await onSubmit()
    if (succeeded) {
      navigate('/')
    }
  }

  return (
    <main className="page page-create">
      <header className="subpage-topbar">
        <Link className="ghost-link" to="/">
          {t.close}
        </Link>
      </header>

      <section className="composer">
        <input
          className="composer-input"
          maxLength={120}
          onChange={(event) => setDraft(event.target.value.replace(/\n/g, ''))}
          placeholder={t.createPlaceholder}
          type="text"
          value={draft}
        />

        <div className="category-list">
          {allCategories.map((category) => (
            <button
              className={`category-select ${selectedCategories.includes(category) ? 'is-selected' : ''}`}
              key={category}
              onClick={() => toggleCategory(category)}
              type="button"
            >
              {categoryLabels[language][category]}
            </button>
          ))}
        </div>

        <p className="helper-text">{t.helper}</p>
        <p className="create-note">{t.createNote}</p>
      </section>

      <div className="submit-bar">
        <button
          className="primary-button"
          disabled={!draft.trim()}
          onClick={() => void handleSubmitClick()}
          type="button"
        >
          {t.submit}
        </button>
      </div>
    </main>
  )
}

function MyPostsPage({
  isUsingFirebase,
  language,
  posts,
  setPostToDelete,
  t,
}: PageProps & {
  isUsingFirebase: boolean
  posts: Post[]
  setPostToDelete: (post: Post) => void
}) {
  return (
    <main className="page page-manage">
      <header className="subpage-topbar manage-topbar">
        <Link className="ghost-link" to="/">
          {t.back}
        </Link>
        <h1>{t.manageTitle}</h1>
      </header>

      <p className="manage-note">
        {t.manageNote}
        {!isUsingFirebase && ` / ${t.demoMode}`}
      </p>

      <section className="timeline" aria-label="My posts">
        {posts.length === 0 ? (
          <p className="empty-state">{t.noPosts}</p>
        ) : (
          posts.map((post) => (
            <article className="post-card managed-post-card" key={post.id}>
              <p className="post-content">{post.content}</p>
              <p className="post-hold">{formatHoldDuration(post.createdAt, language)}</p>
              {post.categories.length > 0 && (
                <div className="post-categories">
                  {post.categories.map((category) => (
                    <span className="category-chip" key={category}>
                      {categoryLabels[language][category]}
                    </span>
                  ))}
                </div>
              )}
              <div className="post-footer">
                <p className="post-date">
                  {t.postedOn} {formatDate(post.createdAt, language)}
                </p>
                <button
                  className="delete-button"
                  onClick={() => setPostToDelete(post)}
                  type="button"
                >
                  {t.delete}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  )
}

export default App
