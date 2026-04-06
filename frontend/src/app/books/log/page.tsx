"use client";

import { useEffect, useState } from "react";
import { BookOpen, Plus, Trash2, RefreshCw, Clock, FileText, BookMarked } from "lucide-react";
import { booksApi, Book, ReadingSession } from "@/lib/books-api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

const inputCls = "w-full px-4 py-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 transition-colors";
const labelCls = "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2";

export default function LogPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    book_id: "",
    session_date: today,
    from_page: "",
    to_page: "",
    reading_minutes: "",
    notes: "",
  });

  const selectedBook = books.find((b) => b.id === form.book_id);
  const pagesRead = form.from_page && form.to_page && Number(form.to_page) >= Number(form.from_page)
    ? Number(form.to_page) - Number(form.from_page) : 0;
  const progressPct = pagesRead && selectedBook?.total_pages
    ? ((Number(form.to_page) / selectedBook.total_pages) * 100).toFixed(1) : null;

  const loadBooks = () => {
    setLoadingBooks(true);
    booksApi.getBooks()
      .then((r) => {
        const order: Record<string, number> = { "Reading": 0, "Not Started": 1, "On Hold": 2, "Completed": 3 };
        const sorted = r.data.data.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
        setBooks(sorted);
        if (sorted.length > 0 && !form.book_id) {
          setForm((f) => ({ ...f, book_id: sorted[0].id }));
        }
      })
      .finally(() => setLoadingBooks(false));
  };

  const loadSessions = () => {
    setLoadingSessions(true);
    booksApi.getSessions({ limit: 30 })
      .then((r) => setSessions(r.data.data))
      .finally(() => setLoadingSessions(false));
  };

  useEffect(() => { loadBooks(); loadSessions(); }, []);

  const handleSubmit = async () => {
    if (!form.book_id || !form.session_date || !form.from_page || !form.to_page) {
      setError("Book, date, from page and to page are required.");
      return;
    }
    if (Number(form.to_page) < Number(form.from_page)) {
      setError("To page must be ≥ from page.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await booksApi.createSession({
        book_id: form.book_id,
        session_date: form.session_date,
        from_page: Number(form.from_page),
        to_page: Number(form.to_page),
        reading_minutes: form.reading_minutes ? Number(form.reading_minutes) : undefined,
        notes: form.notes || undefined,
      });
      setSuccess(`+${pagesRead} pages logged!`);
      setForm((f) => ({ ...f, from_page: form.to_page, to_page: "", reading_minutes: "", notes: "" }));
      loadSessions();
      loadBooks();
      setTimeout(() => setSuccess(""), 4000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to log session.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await booksApi.deleteSession(id);
    setDeleteId(null);
    loadSessions();
  };

  const STATUS_COLOR: Record<string, string> = {
    "Reading": "text-amber-500",
    "Completed": "text-emerald-500",
    "Not Started": "text-gray-400",
    "On Hold": "text-red-400",
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Log Reading Session</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track your daily reading progress</p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Left — Form (3 cols wide) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-5">
            {/* Book selector */}
            <div>
              <label className={labelCls}>Book</label>
              {loadingBooks ? (
                <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ) : books.length === 0 ? (
                <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl">
                  <p className="text-sm text-amber-700 dark:text-amber-400">No books in library.</p>
                  <Link href="/books/library" className="text-sm font-semibold text-blue-500 hover:underline">Add a book →</Link>
                </div>
              ) : (
                <select
                  className={inputCls}
                  value={form.book_id}
                  onChange={(e) => setForm({ ...form, book_id: e.target.value, from_page: "", to_page: "" })}
                >
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.status === "Reading" ? "▶ " : b.status === "Completed" ? "✓ " : "○ "}
                      {b.title} — {b.author}
                    </option>
                  ))}
                </select>
              )}
              {selectedBook && (
                <div className="flex items-center gap-3 mt-2.5 px-1">
                  <span className="text-xs text-gray-400">{selectedBook.total_pages > 0 ? `${selectedBook.total_pages} pages` : "pages unknown"}</span>
                  <span className="text-gray-300 dark:text-gray-700">·</span>
                  <span className="text-xs text-gray-400">{selectedBook.genre}</span>
                  <span className="text-gray-300 dark:text-gray-700">·</span>
                  <span className={cn("text-xs font-semibold", STATUS_COLOR[selectedBook.status])}>{selectedBook.status}</span>
                </div>
              )}
            </div>

            {/* Date + Pages row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" className={inputCls} value={form.session_date} max={today}
                  onChange={(e) => setForm({ ...form, session_date: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>From Page</label>
                <input type="number" className={inputCls} placeholder="e.g. 1" min={1} max={selectedBook?.total_pages}
                  value={form.from_page} onChange={(e) => setForm({ ...form, from_page: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>
                  To Page{selectedBook?.total_pages ? <span className="font-normal normal-case tracking-normal text-gray-400 ml-1">(max {selectedBook.total_pages})</span> : ""}
                </label>
                <input type="number" className={inputCls} placeholder="e.g. 30" min={form.from_page || 1} max={selectedBook?.total_pages}
                  value={form.to_page} onChange={(e) => setForm({ ...form, to_page: e.target.value })} />
              </div>
            </div>

            {/* Pages read preview */}
            {pagesRead > 0 && (
              <div className="flex items-center gap-4 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl">
                <div className="flex items-center gap-2">
                  <BookMarked size={15} className="text-blue-500" />
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">+{pagesRead} pages</span>
                </div>
                {progressPct && selectedBook?.total_pages && (
                  <>
                    <span className="text-blue-300 dark:text-blue-700">·</span>
                    <span className="text-sm text-blue-600 dark:text-blue-400">{progressPct}% of book</span>
                    <div className="flex-1 h-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progressPct}%` }} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Reading time + Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  Reading Time (min) <span className="font-normal normal-case tracking-normal text-gray-400">optional</span>
                </label>
                <div className="relative">
                  <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" className={cn(inputCls, "pl-9")} placeholder="e.g. 45" min={1}
                    value={form.reading_minutes} onChange={(e) => setForm({ ...form, reading_minutes: e.target.value })} />
                </div>
              </div>
              <div className="sm:row-span-1">
                <label className={labelCls}>
                  Notes / Summary <span className="font-normal normal-case tracking-normal text-gray-400">optional</span>
                </label>
                <div className="relative">
                  <FileText size={15} className="absolute left-3 top-3.5 text-gray-400" />
                  <textarea className={cn(inputCls, "resize-none pl-9")} rows={1}
                    placeholder="Key insights, takeaways…"
                    value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
            {success && <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">{success}</p>}

            <button
              onClick={handleSubmit}
              disabled={saving || books.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm tracking-wide"
            >
              <Plus size={16} />
              {saving ? "Logging…" : "Log Session"}
            </button>
          </div>

          {/* Quick book stats if selected */}
          {selectedBook && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Total Pages", value: selectedBook.total_pages > 0 ? selectedBook.total_pages.toLocaleString() : "—", color: "text-blue-500" },
                { label: "Status", value: selectedBook.status, color: STATUS_COLOR[selectedBook.status] },
                { label: "Genre", value: selectedBook.genre.split(" ")[0], color: "text-gray-700 dark:text-gray-300" },
              ].map((s) => (
                <div key={s.label} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className={cn("text-sm font-bold truncate", s.color)}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — Recent Sessions (2 cols wide) */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-sm">Recent Sessions</h2>
                {!loadingSessions && sessions.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">{sessions.length} sessions logged</p>
                )}
              </div>
              <button onClick={loadSessions} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>

            {loadingSessions ? (
              <div className="p-5 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <BookOpen size={36} className="text-gray-200 dark:text-gray-800 mb-3" />
                <p className="text-sm text-gray-400">No sessions logged yet</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Log your first reading session on the left</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-900 overflow-y-auto max-h-[600px]">
                {sessions.map((s) => {
                  const book = books.find((b) => b.id === s.book_id);
                  return (
                    <div key={s.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group">
                      {/* Color dot */}
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
                          {book?.title || "Unknown Book"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs font-bold text-blue-500">+{s.pages_read}p</span>
                          <span className="text-gray-300 dark:text-gray-700 text-xs">·</span>
                          <span className="text-xs text-gray-400">pp {s.from_page}–{s.to_page}</span>
                          {s.reading_minutes && (
                            <>
                              <span className="text-gray-300 dark:text-gray-700 text-xs">·</span>
                              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                <Clock size={10} />{s.reading_minutes}m
                              </span>
                            </>
                          )}
                        </div>
                        {s.notes && (
                          <p className="text-xs text-gray-400 italic mt-1 line-clamp-1">"{s.notes}"</p>
                        )}
                        <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">{s.session_date}</p>
                      </div>
                      <button
                        onClick={() => setDeleteId(s.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 dark:text-gray-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        open={deleteId !== null}
        title="Delete this session?"
        message="This reading session entry will be permanently removed."
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
