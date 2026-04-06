"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Search, BookOpen, CheckCircle, Clock, PauseCircle,
  Trash2, Star, ExternalLink, X, Edit2, Save,
} from "lucide-react";
import { booksApi, Book, BookStatus, BookType, GENRES } from "@/lib/books-api";
import { cn } from "@/lib/utils";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

const STATUS_OPTIONS: BookStatus[] = ["Not Started", "Reading", "Completed", "On Hold"];
const STATUS_COLORS: Record<BookStatus, string> = {
  "Not Started": "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  "Reading": "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400",
  "Completed": "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400",
  "On Hold": "bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400",
};
const STATUS_ICONS: Record<BookStatus, React.ElementType> = {
  "Not Started": Clock,
  "Reading": BookOpen,
  "Completed": CheckCircle,
  "On Hold": PauseCircle,
};

function LibraryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "");
  const [genreFilter, setGenreFilter] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editForm, setEditForm] = useState<Partial<Book>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", author: "", genre: "Self Help", type: "Physical" as BookType,
    total_pages: "", published_year: "", ebook_link: "",
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    booksApi.getBooks()
      .then((r) => setBooks(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = books.filter((b) => {
    const matchSearch = !search ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || b.status === statusFilter;
    const matchGenre = !genreFilter || b.genre === genreFilter;
    return matchSearch && matchStatus && matchGenre;
  });

  const handleAdd = async () => {
    if (!form.title || !form.author || !form.total_pages) return;
    setSaving(true);
    try {
      await booksApi.createBook({
        title: form.title,
        author: form.author,
        genre: form.genre,
        type: form.type,
        total_pages: Number(form.total_pages),
        published_year: form.published_year ? Number(form.published_year) : undefined,
        ebook_link: form.ebook_link || undefined,
      });
      setForm({ title: "", author: "", genre: "Self Help", type: "Physical", total_pages: "", published_year: "", ebook_link: "" });
      setShowAddForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await booksApi.deleteBook(id);
    setDeleteId(null);
    load();
  };

  const openEdit = (book: Book) => {
    setEditingBook(book);
    setEditForm({
      title: book.title,
      author: book.author,
      genre: book.genre,
      type: book.type,
      total_pages: book.total_pages,
      published_year: book.published_year,
      ebook_link: book.ebook_link,
      status: book.status,
      rating: book.rating,
    });
  };

  const handleEditSave = async () => {
    if (!editingBook) return;
    setEditSaving(true);
    try {
      await booksApi.updateBook(editingBook.id, editForm);
      setEditingBook(null);
      load();
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Library</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{books.length} books total</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} /> Add Book
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Add New Book</h2>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className={inputCls}
              placeholder="Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Author *"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />
            <select className={inputCls} value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}>
              {GENRES.map((g) => <option key={g}>{g}</option>)}
            </select>
            <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as BookType })}>
              <option>Physical</option>
              <option>Ebook</option>
            </select>
            <input
              className={inputCls}
              placeholder="Total Pages *"
              type="number"
              value={form.total_pages}
              onChange={(e) => setForm({ ...form, total_pages: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Published Year"
              type="number"
              value={form.published_year}
              onChange={(e) => setForm({ ...form, published_year: e.target.value })}
            />
            {form.type === "Ebook" && (
              <input
                className={cn(inputCls, "sm:col-span-2")}
                placeholder="Ebook link (optional)"
                value={form.ebook_link}
                onChange={(e) => setForm({ ...form, ebook_link: e.target.value })}
              />
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAdd}
              disabled={saving || !form.title || !form.author || !form.total_pages}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors"
            >
              {saving ? "Saving…" : "Add Book"}
            </button>
            <button onClick={() => setShowAddForm(false)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setEditingBook(null)}>
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 dark:text-white">Edit Book</h2>
              <button onClick={() => setEditingBook(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className={inputCls}
                placeholder="Title"
                value={editForm.title || ""}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Author"
                value={editForm.author || ""}
                onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
              />
              <select className={inputCls} value={editForm.genre || ""} onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}>
                {GENRES.map((g) => <option key={g}>{g}</option>)}
              </select>
              <select className={inputCls} value={editForm.type || "Physical"} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as BookType })}>
                <option>Physical</option>
                <option>Ebook</option>
              </select>
              <input
                className={inputCls}
                placeholder="Total Pages"
                type="number"
                value={editForm.total_pages ?? ""}
                onChange={(e) => setEditForm({ ...editForm, total_pages: Number(e.target.value) })}
              />
              <input
                className={inputCls}
                placeholder="Published Year"
                type="number"
                value={editForm.published_year ?? ""}
                onChange={(e) => setEditForm({ ...editForm, published_year: Number(e.target.value) })}
              />
              <select className={inputCls} value={editForm.status || "Not Started"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as BookStatus })}>
                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select className={inputCls} value={editForm.rating ?? ""} onChange={(e) => setEditForm({ ...editForm, rating: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">No Rating</option>
                {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r} Star{r > 1 ? "s" : ""}</option>)}
              </select>
              <input
                className={cn(inputCls, "sm:col-span-2")}
                placeholder="Ebook link (optional)"
                value={editForm.ebook_link || ""}
                onChange={(e) => setEditForm({ ...editForm, ebook_link: e.target.value })}
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleEditSave}
                disabled={editSaving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
              >
                <Save size={14} />
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditingBook(null)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Search books…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select
          className="text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
        >
          <option value="">All Genres</option>
          {GENRES.map((g) => <option key={g}>{g}</option>)}
        </select>
        {(search || statusFilter || genreFilter) && (
          <button
            onClick={() => { setSearch(""); setStatusFilter(""); setGenreFilter(""); }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            {books.length === 0 ? "No books yet — add your first one!" : "No books match your filters"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Author</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">Genre</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Pages</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">Rating</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((book, i) => {
                  const StatusIcon = STATUS_ICONS[book.status];
                  return (
                    <tr key={book.id} className="border-b border-gray-50 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/books/${book.id}`} className="font-medium text-gray-900 dark:text-white hover:text-blue-500 transition-colors line-clamp-1">
                          {book.title}
                        </Link>
                        <p className="text-xs text-gray-400 md:hidden">{book.author}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{book.author}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{book.genre}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{book.total_pages}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[book.status])}>
                          <StatusIcon size={11} />
                          {book.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {book.rating ? (
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, r) => (
                              <Star key={r} size={11} className={r < book.rating! ? "text-amber-400 fill-amber-400" : "text-gray-300 dark:text-gray-700"} />
                            ))}
                          </div>
                        ) : <span className="text-gray-300 dark:text-gray-700 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {book.ebook_link && (
                            <a href={book.ebook_link} target="_blank" rel="noreferrer"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors">
                              <ExternalLink size={13} />
                            </a>
                          )}
                          <button
                            onClick={() => openEdit(book)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                            title="Edit book"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => setDeleteId(book.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        open={deleteId !== null}
        title="Delete this book?"
        message="All reading sessions for this book will also be deleted. This cannot be undone."
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400";

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Loading…</div>}>
      <LibraryContent />
    </Suspense>
  );
}
