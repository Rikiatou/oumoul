import * as SecureStore from 'expo-secure-store';

const BOOKMARKS_KEY = 'oumoul_quran_bookmarks';
const LAST_READ_KEY = 'oumoul_quran_last_read';

export interface QuranBookmark {
  id: string;
  surahId: number;
  surahName: string;
  ayahNumber: number;
  text: string;
  note?: string;
  createdAt: string;
}

export interface LastReadPosition {
  surahId: number;
  surahName: string;
  ayahNumber: number;
  timestamp: string;
}

export async function getBookmarks(): Promise<QuranBookmark[]> {
  try {
    const raw = await SecureStore.getItemAsync(BOOKMARKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QuranBookmark[];
  } catch {
    return [];
  }
}

export async function addBookmark(bookmark: Omit<QuranBookmark, 'id' | 'createdAt'>): Promise<QuranBookmark> {
  const bookmarks = await getBookmarks();
  const newBookmark: QuranBookmark = {
    ...bookmark,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  bookmarks.unshift(newBookmark);
  await SecureStore.setItemAsync(BOOKMARKS_KEY, JSON.stringify(bookmarks.slice(0, 200)));
  return newBookmark;
}

export async function removeBookmark(id: string): Promise<void> {
  const bookmarks = await getBookmarks();
  const filtered = bookmarks.filter((b) => b.id !== id);
  await SecureStore.setItemAsync(BOOKMARKS_KEY, JSON.stringify(filtered));
}

export async function isBookmarked(surahId: number, ayahNumber: number): Promise<boolean> {
  const bookmarks = await getBookmarks();
  return bookmarks.some((b) => b.surahId === surahId && b.ayahNumber === ayahNumber);
}

export async function getLastRead(): Promise<LastReadPosition | null> {
  try {
    const raw = await SecureStore.getItemAsync(LAST_READ_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastReadPosition;
  } catch {
    return null;
  }
}

export async function setLastRead(position: Omit<LastReadPosition, 'timestamp'>): Promise<void> {
  const entry: LastReadPosition = {
    ...position,
    timestamp: new Date().toISOString(),
  };
  await SecureStore.setItemAsync(LAST_READ_KEY, JSON.stringify(entry));
}
