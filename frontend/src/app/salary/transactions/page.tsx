"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { salaryApi, Transaction } from "@/lib/api";
import { formatCurrency, formatDate, getCurrentMonth, cn } from "@/lib/utils";
import TransactionModal from "@/components/salary/TransactionModal";

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<string[]>(["Salary Credit", "Other Income"]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(getCurrentMonth());
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Always fetch full month — filtering done client-side so totals stay accurate
      const [txRes, catRes] = await Promise.all([
        salaryApi.getTransactions({ month }),
        salaryApi.getCategories(),
      ]);
      setTransactions(txRes.data.data);
      setCategories(catRes.data.categories);
      setIncomeCategories(catRes.data.income_categories ?? ["Salary Credit", "Other Income"]);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); setPage(1); }, [load]);

  const handleDelete = async (id: string) => {
    await salaryApi.deleteTransaction(id);
    setDeleteId(null);
    load();
  };

  const filtered = transactions
    .filter((t) => !search || t.description.toLowerCase().includes(search.toLowerCase()))
    .filter((t) => !filterCategory || t.category === filterCategory)
    .filter((t) => !filterType || t.type === filterType)
    .sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortDir === "asc" ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Totals always reflect the full month, regardless of active filters
  const totalIn = transactions.filter((t) => t.type === "IN").reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter((t) => t.type === "OUT").reduce((s, t) => s + t.amount, 0);

  // Filtered totals — only what's visible in the table
  const filteredIn = filtered.filter((t) => t.type === "IN").reduce((s, t) => s + t.amount, 0);
  const filteredOut = filtered.filter((t) => t.type === "OUT").reduce((s, t) => s + t.amount, 0);
  const isFiltered = !!(search || filterCategory || filterType);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{filtered.length} records</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors flex-shrink-0 shadow-sm"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-center relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/10" />
          <p className="text-sm text-white/70 mb-1 font-medium">Total IN</p>
          <p className="font-bold text-white text-xl">{formatCurrency(totalIn)}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-4 text-center relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/10" />
          <p className="text-sm text-white/70 mb-1 font-medium">Total OUT</p>
          <p className="font-bold text-white text-xl">{formatCurrency(totalOut)}</p>
        </div>
        <div className={cn(
          "rounded-2xl p-4 text-center relative overflow-hidden bg-gradient-to-br",
          totalIn - totalOut >= 0 ? "from-violet-500 to-purple-600" : "from-amber-500 to-orange-500"
        )}>
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/10" />
          <p className="text-sm text-white/70 mb-1 font-medium">Net</p>
          <p className="font-bold text-white text-xl">{formatCurrency(totalIn - totalOut)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">All Types</option>
            <option value="IN">Income (IN)</option>
            <option value="OUT">Expense (OUT)</option>
          </select>
        </div>
      </div>

      {/* Filtered summary — only shown when a filter is active */}
      {isFiltered && (
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 px-5 py-3 flex items-center">
          {/* Left: count */}
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-28 flex-shrink-0">
            {filtered.length} records
          </span>

          {/* Center: IN / OUT / Net */}
          <div className="flex-1 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">IN</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(filteredIn)}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
              <span className="text-xs text-red-500 dark:text-red-400 font-semibold">OUT</span>
              <span className="text-sm font-bold text-red-500 dark:text-red-400">{formatCurrency(filteredOut)}</span>
            </div>
            <div className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-full border",
              filteredIn - filteredOut >= 0
                ? "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800"
                : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
            )}>
              <span className={cn("text-xs font-semibold", filteredIn - filteredOut >= 0 ? "text-violet-600 dark:text-violet-400" : "text-amber-600 dark:text-amber-400")}>Net</span>
              <span className={cn("text-sm font-bold", filteredIn - filteredOut >= 0 ? "text-violet-600 dark:text-violet-400" : "text-amber-600 dark:text-amber-400")}>
                {formatCurrency(filteredIn - filteredOut)}
              </span>
            </div>
          </div>

          {/* Right: clear */}
          <button
            onClick={() => { setSearch(""); setFilterCategory(""); setFilterType(""); }}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium w-28 text-right flex-shrink-0"
          >
            Clear filters ×
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-28" />
              <col />
              <col className="w-36" />
              <col className="w-32" />
              <col className="w-20" />
              <col className="w-20" />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}>
                    Date <ArrowUpDown size={11} />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-gray-400">No transactions found</td>
                </tr>
              ) : (
                paged.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    className={cn(
                      "group border-b border-gray-50 dark:border-gray-800/40 transition-colors",
                      "hover:bg-gray-50/80 dark:hover:bg-gray-900/40",
                      idx % 2 !== 0 && "bg-gray-50/40 dark:bg-gray-900/20"
                    )}
                  >
                    {/* Colored left strip via box-shadow trick on first cell */}
                    <td className={cn(
                      "px-5 py-3.5 font-mono text-xs text-gray-400 whitespace-nowrap relative",
                      "before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full",
                      tx.type === "IN"
                        ? "before:bg-emerald-400"
                        : "before:bg-red-400"
                    )}>
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-white truncate">{tx.description}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                        {tx.category}
                      </span>
                    </td>
                    <td className={cn(
                      "px-4 py-3.5 text-right font-mono font-bold text-sm",
                      tx.type === "IN" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                    )}>
                      {tx.type === "IN" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={cn(
                        "inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full tracking-wide",
                        tx.type === "IN"
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                      )}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(tx); setModalOpen(true); }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-gray-300 dark:text-gray-600 hover:text-blue-500 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteId(tx.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
          {paged.map((tx) => (
            <div key={tx.id} className={cn(
              "p-4 flex items-center justify-between border-l-4",
              tx.type === "IN" ? "border-emerald-400" : "border-red-400"
            )}>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{tx.description}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.date)} · {tx.category}</p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span className={cn("font-bold text-sm", tx.type === "IN" ? "text-emerald-500" : "text-red-500")}>
                  {tx.type === "IN" ? "+" : "-"}{formatCurrency(tx.amount)}
                </span>
                <button onClick={() => { setEditing(tx); setModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-500">
                  <Pencil size={13} />
                </button>
                <button onClick={() => setDeleteId(tx.id)} className="p-1.5 text-gray-400 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-900/20">
            <span className="text-xs text-gray-400">Page {page} of {totalPages} · {filtered.length} records</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Delete Transaction?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={load}
        transaction={editing}
        categories={categories}
        incomeCategories={incomeCategories}
      />
    </div>
  );
}
