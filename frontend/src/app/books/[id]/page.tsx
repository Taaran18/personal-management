"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, CheckCircle, Clock, PauseCircle, Star,
  Trash2, Edit2, Plus, X, ExternalLink, Save,
} from "lucide-react";
import { booksApi, BookDetail, BookStatus, GENRES } from "@/lib/books-api";
import ProgressBar from "@/components/books/ProgressBar";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { cn } from "@/lib/utils";

const inputCls = "w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400";

const STATUS_OPTIONS: BookStatus[] = ["Not Started", "Reading", "Completed", "On Hold"];
const STATUS_COLORS: Record<BookStatus, string> = {
  "Not Started": "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  "Reading": "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400",
  "Completed": "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400",
  "On Hold": "bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400",
};

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<BookDetail>>({});
  const [saving, setSaving] = useState(false);
  const [deleteBookOpen, setDeleteBookOpen] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({
    session_date: new Date().toISOString().split("T")[0],
    from_page: "",
    to_page: "",
    reading_minutes: "",
    notes: "",
  });
  const [logSaving, setLogSaving] = useState(false);
  const [logError, setLogError] = useState("");
  const [logSuccess, setLogSuccess] = useState("");

  const load = () => {
    setLoading(true);
    booksApi.getBook(id)
      .then((r) => {
        setBook(r.data);
        setEditForm(r.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleSave = async () => {
    if (!book) return;
    setSaving(true);
    try {
      await booksApi.updateBook(book.id, {
        title: editForm.title,
        author: editForm.author,
        genre: editForm.genre,
        type: editForm.type,
        total_pages: editForm.total_pages,
        published_year: editForm.published_year,
        ebook_link: editForm.ebook_link,
        status: editForm.status,
        rating: editForm.rating,
      });
      setEditing(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!book) return;
    await booksApi.deleteBook(book.id);
    router.push("/books/library");
  };

  const handleDeleteSession = async (sessionId: string) => {
    await booksApi.deleteSession(sessionId);
    setDeleteSessionId(null);
    load();
  };

  const handleLogSession = async () => {
    if (!book || !logForm.from_page || !logForm.to_page) {
      setLogError("From page and to page are required.");
      return;
    }
    setLogError("");
    setLogSaving(true);
    try {
      await booksApi.createSession({
        book_id: book.id,
        session_date: logForm.session_date,
        from_page: Number(logForm.from_page),
        to_page: Number(logForm.to_page),
        reading_minutes: logForm.reading_minutes ? Number(logForm.reading_minutes) : undefined,
        notes: logForm.notes || undefined,
      });
      setLogSuccess(`+${Number(logForm.to_page) - Number(logForm.from_page)} pages logged!`);
      setLogForm((f) => ({ ...f, from_page: logForm.to_page, to_page: "", notes: "", reading_minutes: "" }));
      load();
      setTimeout(() => setLogSuccess(""), 3000);
    } catch (e: any) {
      setLogError(e?.response?.data?.detail || "Failed to log session.");
    } finally {
      setLogSaving(false);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (!book) return <div className="text-center text-gray-400 py-20">Book not found</div>;

  const progressColor =
    book.status === "Completed" ? "bg-emerald-500" :
    book.status === "On Hold" ? "bg-gray-400" : "bg-blue-500";

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/books/library" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft size={15} /> Back to Library
      </Link>

      {/* Book Header */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <input className={inputCls} value={editForm.title || ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title" />
                <input className={inputCls} value={editForm.author || ""} onChange={(e) => setEditForm({ ...editForm, author: e.target.value })} placeholder="Author" />
                <div className="grid grid-cols-2 gap-3">
                  <select className={inputCls} value={editForm.genre || ""} onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}>
                    {GENRES.map((g) => <option key={g}>{g}</option>)}
                  </select>
                  <select className={inputCls} value={editForm.type || "Physical"} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}>
                    <option>Physical</option><option>Ebook</option>
                  </select>
                  <input className={inputCls} type="number" value={editForm.total_pages || ""} onChange={(e) => setEditForm({ ...editForm, total_pages: Number(e.target.value) })} placeholder="Total Pages" />
                  <input className={inputCls} type="number" value={editForm.published_year || ""} onChange={(e) => setEditForm({ ...editForm, published_year: Number(e.target.value) })} placeholder="Published Year" />
                  <select className={inputCls} value={editForm.status || "Not Started"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as BookStatus })}>
                    {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <select className={inputCls} value={editForm.rating ?? ""} onChange={(e) => setEditForm({ ...editForm, rating: e.target.value ? Number(e.target.value) : undefined })}>
                    <option value="">No Rating</option>
                    {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r} Star{r > 1 ? "s" : ""}</option>)}
                  </select>
                </div>
                <input className={inputCls} value={editForm.ebook_link || ""} onChange={(e) => setEditForm({ ...editForm, ebook_link: e.target.value })} placeholder="Ebook link (optional)" />
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{book.title}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5">{book.author}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[book.status])}>
                    {book.status}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{book.genre}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{book.type}</span>
                  {book.published_year && <span className="text-xs text-gray-400">{book.published_year}</span>}
                  {book.rating && (
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, r) => (
                        <Star key={r} size={11} className={r < book.rating! ? "text-amber-400 fill-amber-400" : "text-gray-300 dark:text-gray-700"} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                  <Save size={13} /> {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setEditing(false)} className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                {book.ebook_link && (
                  <a href={book.ebook_link} target="_blank" rel="noreferrer"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors">
                    <ExternalLink size={15} />
                  </a>
                )}
                <button onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <Edit2 size={15} />
                </button>
                <button onClick={() => setDeleteBookOpen(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors">
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{book.total_pages_read} of {book.total_pages} pages</span>
            <span>{book.total_pages - book.total_pages_read} remaining</span>
          </div>
          <ProgressBar pct={book.progress_pct} color={progressColor} showPct />
        </div>

        {/* Dates */}
        {(book.started_at || book.completed_at) && (
          <div className="flex gap-4 mt-3 text-xs text-gray-400">
            {book.started_at && <span>Started: {book.started_at}</span>}
            {book.completed_at && <span>Completed: {book.completed_at}</span>}
          </div>
        )}
      </div>

      {/* Log session inline */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowLogForm(!showLogForm)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
        >
          <span className="flex items-center gap-2"><Plus size={15} className="text-blue-500" /> Log a Session</span>
          <span className="text-gray-400 text-xs">{showLogForm ? "Hide" : "Show"}</span>
        </button>

        {showLogForm && (
          <div className="px-5 pb-5 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
                <input type="date" className={inputCls} value={logForm.session_date} max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setLogForm({ ...logForm, session_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From Page</label>
                <input type="number" className={inputCls} placeholder="e.g. 1" min={1} max={book.total_pages}
                  value={logForm.from_page} onChange={(e) => setLogForm({ ...logForm, from_page: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To Page</label>
                <input type="number" className={inputCls} placeholder="e.g. 30" min={1} max={book.total_pages}
                  value={logForm.to_page} onChange={(e) => setLogForm({ ...logForm, to_page: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Minutes <span className="font-normal text-gray-400">(optional)</span></label>
                <input type="number" className={inputCls} placeholder="e.g. 30" value={logForm.reading_minutes}
                  onChange={(e) => setLogForm({ ...logForm, reading_minutes: e.target.value })} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes <span className="font-normal text-gray-400">(optional)</span></label>
                <input className={inputCls} placeholder="Key insight or reflection…" value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} />
              </div>
            </div>
            {logError && <p className="text-xs text-red-500">{logError}</p>}
            {logSuccess && <p className="text-xs text-emerald-500 font-medium">{logSuccess}</p>}
            <button onClick={handleLogSession} disabled={logSaving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors">
              {logSaving ? "Logging…" : "Log Session"}
            </button>
          </div>
        )}
      </div>

      {/* Sessions History */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
            Reading History <span className="text-gray-400 font-normal">({book.sessions.length} sessions)</span>
          </h2>
        </div>

        {book.sessions.length === 0 ? (
          <p className="p-5 text-sm text-gray-400 text-center">No sessions logged yet</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-900">
            {book.sessions.map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-blue-500">+{s.pages_read}p</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">pp {s.from_page}–{s.to_page}</span>
                    {s.reading_minutes && (
                      <span className="text-xs text-gray-400">{s.reading_minutes}min</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{s.session_date}</span>
                  </div>
                  {s.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1 line-clamp-2">"{s.notes}"</p>
                  )}
                </div>
                {deleteSessionId === s.id ? (
                  <div className="flex items-center gap-1 shrink-0" />
                ) : (
                  <button onClick={() => setDeleteSessionId(s.id)}
                    className="p-1.5 rounded-lg text-gray-300 dark:text-gray-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors shrink-0">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Book Modal */}
      <ConfirmDeleteModal
        open={deleteBookOpen}
        title="Delete this book?"
        message="All reading sessions for this book will also be deleted. This cannot be undone."
        onConfirm={handleDeleteBook}
        onCancel={() => setDeleteBookOpen(false)}
      />

      {/* Delete Session Modal */}
      <ConfirmDeleteModal
        open={deleteSessionId !== null}
        title="Delete this session?"
        message="This reading session entry will be permanently removed."
        onConfirm={() => deleteSessionId && handleDeleteSession(deleteSessionId)}
        onCancel={() => setDeleteSessionId(null)}
      />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5 max-w-3xl mx-auto animate-pulse">
      <div className="h-5 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
      <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
    </div>
  );
}
