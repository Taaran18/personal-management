"use client";

import { useEffect, useState } from "react";
import { Star, ChevronDown, ChevronUp, BookOpen, RefreshCw, Save, FileText, MessageSquare, TrendingUp } from "lucide-react";
import { booksApi, BookReview } from "@/lib/books-api";
import { cn } from "@/lib/utils";
import Link from "next/link";

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "All Books", value: "" },
  { label: "Completed", value: "Completed" },
  { label: "Reading", value: "Reading" },
  { label: "Not Started", value: "Not Started" },
];

const STATUS_COLORS: Record<string, string> = {
  "Not Started": "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
  "Reading": "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400",
  "Completed": "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400",
  "On Hold": "bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400",
};

function StarRating({ rating, onRate }: { rating?: number; onRate: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((r) => (
        <button key={r}
          onMouseEnter={() => setHover(r)} onMouseLeave={() => setHover(0)}
          onClick={() => onRate(r)} className="transition-transform hover:scale-110" title={`Rate ${r} star${r > 1 ? "s" : ""}`}>
          <Star size={17}
            className={cn("transition-colors", r <= (hover || rating || 0) ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-gray-700")} />
        </button>
      ))}
      {rating && (
        <button onClick={() => onRate(0)} className="ml-1.5 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium">
          clear
        </button>
      )}
    </div>
  );
}

function BookReviewCard({ book, onUpdate }: { book: BookReview; onUpdate: () => void }) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [review, setReview] = useState(book.review || "");
  const [reviewDirty, setReviewDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleRate = async (r: number) => {
    await booksApi.updateBook(book.id, { rating: r || undefined });
    onUpdate();
  };

  const handleSaveReview = async () => {
    setSaving(true);
    try {
      await booksApi.updateBook(book.id, { review: review || undefined });
      setReviewDirty(false);
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  const notesWithContent = book.session_notes.filter((s) => s.notes);

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 pb-4 flex-1">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <Link href={`/books/${book.id}`}
              className="font-bold text-gray-900 dark:text-white hover:text-blue-500 transition-colors text-base leading-snug line-clamp-2">
              {book.title}
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{book.author}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_COLORS[book.status])}>
              {book.status}
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {book.genre}
            </span>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest w-14">Rating</span>
          <StarRating rating={book.rating} onRate={handleRate} />
          {!book.rating && <span className="text-xs text-gray-300 dark:text-gray-700 italic">not rated</span>}
        </div>

        {/* Review */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Your Review</label>
          <textarea
            className="w-full px-3.5 py-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-700 resize-none transition-colors"
            rows={3}
            placeholder={book.status === "Completed"
              ? "Write your final thoughts, key lessons…"
              : "Jot down your thoughts so far…"}
            value={review}
            onChange={(e) => { setReview(e.target.value); setReviewDirty(true); }}
          />
          {reviewDirty && (
            <div className="flex justify-end mt-2">
              <button onClick={handleSaveReview} disabled={saving}
                className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors">
                <Save size={11} />{saving ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress (non-completed) */}
      {book.status !== "Completed" && book.total_pages > 0 && (
        <div className="px-5 py-3 border-t border-gray-50 dark:border-gray-900">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>{book.total_pages_read} / {book.total_pages} pages</span>
            <span className="font-semibold">{book.progress_pct}%</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${book.progress_pct}%` }} />
          </div>
        </div>
      )}

      {/* Session Notes collapsible */}
      {notesWithContent.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          <button onClick={() => setNotesOpen(!notesOpen)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
            <span className="flex items-center gap-2">
              <FileText size={12} className="text-blue-500" />
              Reading Notes ({notesWithContent.length})
            </span>
            {notesOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {notesOpen && (
            <div className="px-5 pb-4 space-y-3">
              {notesWithContent.map((s) => (
                <div key={s.id} className="flex gap-3">
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <div className="w-px flex-1 bg-gray-100 dark:bg-gray-800" />
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">{s.session_date}</span>
                      <span className="text-xs text-blue-500 font-semibold">pp {s.from_page}–{s.to_page}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{s.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  const [books, setBooks] = useState<BookReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");

  const load = (status = activeTab) => {
    setLoading(true);
    booksApi.getReviews(status || undefined)
      .then((r) => setBooks(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleTabChange = (val: string) => { setActiveTab(val); load(val); };

  const rated = books.filter((b) => b.rating).length;
  const reviewed = books.filter((b) => b.review).length;
  const withNotes = books.filter((b) => b.session_notes.some((s) => s.notes)).length;
  const avgRating = rated > 0 ? (books.filter(b => b.rating).reduce((s, b) => s + (b.rating || 0), 0) / rated).toFixed(1) : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reviews & Notes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {rated} rated · {reviewed} reviewed · {withNotes} with notes
          </p>
        </div>
        <button onClick={() => load()} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Summary stat strip */}
      {books.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Shown", value: String(books.length), icon: BookOpen, color: "text-blue-500" },
            { label: "Rated", value: `${rated}/${books.length}`, icon: Star, color: "text-amber-500" },
            { label: "Avg Rating", value: avgRating ? `${avgRating} ★` : "—", icon: TrendingUp, color: "text-emerald-500" },
            { label: "With Notes", value: String(withNotes), icon: MessageSquare, color: "text-purple-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 flex items-center gap-3">
              <s.icon size={16} className={s.color} />
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className={cn("text-base font-bold", s.color)}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl w-fit">
        {STATUS_TABS.map((tab) => (
          <button key={tab.value} onClick={() => handleTabChange(tab.value)}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors",
              activeTab === tab.value
                ? "bg-white dark:bg-gray-950 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards — 2-column grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-16 text-center">
          <BookOpen size={40} className="mx-auto text-gray-200 dark:text-gray-800 mb-3" />
          <p className="text-sm text-gray-400">No books found for this filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {books.map((book) => (
            <BookReviewCard key={book.id} book={book} onUpdate={() => load()} />
          ))}
        </div>
      )}
    </div>
  );
}
