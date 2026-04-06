import { api } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────

export type BookStatus = "Not Started" | "Reading" | "Completed" | "On Hold";
export type BookType = "Physical" | "Ebook";

export const GENRES = [
  "Self Help", "Psychology", "Coding / Tech", "Business & Economics",
  "Philosophy", "Religious", "Productivity", "Investing & Trading",
  "Novels / Fiction", "Biography / Memoir", "History", "Science", "Other",
];

export const GENRE_COLORS: Record<string, string> = {
  "Self Help": "#f59e0b",
  "Psychology": "#8b5cf6",
  "Coding / Tech": "#3b82f6",
  "Business & Economics": "#10b981",
  "Philosophy": "#6366f1",
  "Religious": "#ec4899",
  "Productivity": "#f97316",
  "Investing & Trading": "#84cc16",
  "Novels / Fiction": "#ef4444",
  "Biography / Memoir": "#06b6d4",
  "History": "#a16207",
  "Science": "#0ea5e9",
  "Other": "#94a3b8",
};

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  type: BookType;
  total_pages: number;
  published_year?: number;
  ebook_link?: string;
  status: BookStatus;
  rating?: number;
  review?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

export interface BookReview extends Book {
  session_notes: ReadingSession[];
  total_pages_read: number;
  progress_pct: number;
}

export interface BookDetail extends Book {
  sessions: ReadingSession[];
  total_pages_read: number;
  progress_pct: number;
}

export interface ReadingSession {
  id: string;
  book_id: string;
  session_date: string;
  from_page: number;
  to_page: number;
  pages_read: number;
  reading_minutes?: number;
  notes?: string;
  created_at?: string;
}

export interface StatsSummary {
  total_books: number;
  completed: number;
  reading: number;
  not_started: number;
  on_hold: number;
  total_pages_read: number;
  total_minutes: number;
  avg_pages_per_day: number;
  streak_days: number;
  genre_counts: Record<string, number>;
}

export interface TrendPoint {
  label: string;
  pages: number;
  minutes: number;
}

export interface TrendsData {
  period: string;
  data: TrendPoint[];
}

// ─── API Calls ────────────────────────────────────────────────────────────

export const booksApi = {
  // Books
  getBooks: (params?: { status?: string; genre?: string }) =>
    api.get<{ data: Book[]; count: number }>("/books", { params }),

  getBook: (id: string) =>
    api.get<BookDetail>(`/books/${id}`),

  createBook: (book: Omit<Book, "id" | "status" | "created_at">) =>
    api.post<Book>("/books", book),

  updateBook: (id: string, updates: Partial<Omit<Book, "id">>) =>
    api.patch<Book>(`/books/${id}`, updates),

  deleteBook: (id: string) =>
    api.delete(`/books/${id}`),

  // Sessions
  getSessions: (params?: { book_id?: string; limit?: number }) =>
    api.get<{ data: ReadingSession[]; count: number }>("/books/sessions", { params }),

  createSession: (session: {
    book_id: string;
    session_date: string;
    from_page: number;
    to_page: number;
    reading_minutes?: number;
    notes?: string;
  }) => api.post<ReadingSession>("/books/sessions", session),

  updateSession: (id: string, updates: Partial<Omit<ReadingSession, "id" | "book_id">>) =>
    api.patch<ReadingSession>(`/books/sessions/${id}`, updates),

  deleteSession: (id: string) =>
    api.delete(`/books/sessions/${id}`),

  // Stats
  getStatsSummary: (month?: string) =>
    api.get<StatsSummary>("/books/stats/summary", month ? { params: { month } } : {}),

  getStatsTrends: (period: "daily" | "weekly" | "monthly", month?: string) =>
    api.get<TrendsData>("/books/stats/trends", { params: month ? { period, month } : { period } }),

  // Reviews
  getReviews: (status?: string) =>
    api.get<{ data: BookReview[] }>("/books/reviews", { params: status ? { status } : {} }),
};
