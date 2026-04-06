"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Copy } from "lucide-react";
import { Transaction, salaryApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  transaction?: Transaction | null;
  categories: string[];
  incomeCategories?: string[];
}

type TxType = "IN" | "OUT";

type RowForm = {
  date: string;
  description: string;
  category: string;
  amount: string;
  type: TxType;
};

const DEFAULT_INCOME_CATEGORIES = ["Salary Credit", "Other Income"];

const today = () => new Date().toISOString().split("T")[0];

const emptyRow = (type: TxType = "OUT"): RowForm => ({
  date: today(),
  description: "",
  category: "",
  amount: "",
  type,
});

function getCategoriesForType(all: string[], type: TxType, incomeCats: string[]) {
  if (type === "IN") return all.filter((c) => incomeCats.includes(c));
  return all.filter((c) => !incomeCats.includes(c));
}

export default function TransactionModal({ open, onClose, onSave, transaction, categories, incomeCategories = DEFAULT_INCOME_CATEGORIES }: Props) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [form, setForm] = useState<RowForm>(emptyRow());
  const [rows, setRows] = useState<RowForm[]>([emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    setError("");
    setSavedCount(0);
    if (transaction) {
      setMode("single");
      setForm({
        date: transaction.date,
        description: transaction.description,
        category: transaction.category,
        amount: String(transaction.amount),
        type: transaction.type,
      });
    } else {
      setForm(emptyRow());
      setRows([emptyRow()]);
    }
  }, [transaction, open]);

  if (!open) return null;

  // ── Single mode handlers ──────────────────────────────────────────────────

  const handleSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.description || !form.category || !form.amount) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (transaction) {
        await salaryApi.updateTransaction(transaction.id, payload);
      } else {
        await salaryApi.createTransaction(payload);
      }
      onSave();
      onClose();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Bulk mode handlers ────────────────────────────────────────────────────

  const updateRow = (i: number, patch: Partial<RowForm>) => {
    setRows((prev) => {
      const next = [...prev];
      const updated = { ...next[i], ...patch };
      // Reset category if type changed and current category no longer valid
      if (patch.type && patch.type !== next[i].type) {
        const validCats = getCategoriesForType(categories, patch.type, incomeCategories);
        if (!validCats.includes(updated.category)) updated.category = "";
      }
      next[i] = updated;
      return next;
    });
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow(prev[prev.length - 1].type)]);

  const duplicateRow = (i: number) =>
    setRows((prev) => {
      const next = [...prev];
      next.splice(i + 1, 0, { ...prev[i], description: "", amount: "" });
      return next;
    });

  const removeRow = (i: number) =>
    setRows((prev) => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));

  const handleBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = rows.findIndex((r) => !r.date || !r.description || !r.category || !r.amount);
    if (invalid !== -1) {
      setError(`Row ${invalid + 1} is incomplete.`);
      return;
    }
    setLoading(true);
    setError("");
    let saved = 0;
    try {
      for (const row of rows) {
        await salaryApi.createTransaction({ ...row, amount: parseFloat(row.amount) });
        saved++;
      }
      setSavedCount(saved);
      onSave();
      setTimeout(() => {
        onClose();
        setSavedCount(0);
      }, 1000);
    } catch {
      setError(`Saved ${saved}/${rows.length}. Some entries failed.`);
    } finally {
      setLoading(false);
    }
  };

  // ── Shared type pill ──────────────────────────────────────────────────────

  const TypeToggle = ({ value, onChange }: { value: TxType; onChange: (v: TxType) => void }) => (
    <div className="flex justify-center">
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-64">
        {(["OUT", "IN"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
              value === t
                ? t === "IN"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-red-500 text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            )}
          >
            {t === "IN" ? "Income" : "Expense"}
          </button>
        ))}
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl animate-fade-in w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="relative flex items-center justify-center px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          {/* Left: title */}
          <h2 className="absolute left-5 font-semibold text-gray-900 dark:text-white text-sm">
            {transaction ? "Edit Transaction" : "Add Transaction"}
          </h2>

          {/* Center: mode switcher */}
          {!transaction && (
            <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {(["single", "bulk"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(""); }}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    mode === m
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400"
                  )}
                >
                  {m === "single" ? "Single" : "Bulk Entry"}
                </button>
              ))}
            </div>
          )}

          {/* Right: close */}
          <button onClick={onClose} className="absolute right-5 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* ── SINGLE MODE ─────────────────────────────────────────────────── */}
        {mode === "single" && (
          <form onSubmit={handleSingle} className="p-5 space-y-4 overflow-y-auto">
            <TypeToggle
              value={form.type}
              onChange={(t) => setForm((f) => {
                const validCats = getCategoriesForType(categories, t, incomeCategories);
                return { ...f, type: t, category: validCats.includes(f.category) ? f.category : "" };
              })}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
              <input
                type="text"
                placeholder="e.g. Dinner at McD"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Category
                <span className={cn("ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-normal",
                  form.type === "IN"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-50 dark:bg-red-950/40 text-red-500"
                )}>
                  {form.type === "IN" ? "Income categories" : "Expense categories"}
                </span>
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Select category</option>
                {getCategoriesForType(categories, form.type, incomeCategories).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
              >
                {loading ? "Saving..." : transaction ? "Update" : "Add"}
              </button>
            </div>
          </form>
        )}

        {/* ── BULK MODE ───────────────────────────────────────────────────── */}
        {mode === "bulk" && (
          <form onSubmit={handleBulk} className="flex flex-col flex-1 min-h-0">
            {/* Scrollable cards */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {rows.map((row, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-2xl border p-4 space-y-3 transition-colors",
                    row.type === "IN"
                      ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10"
                      : "border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10"
                  )}
                >
                  {/* Card header: number + type toggle + actions */}
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <TypeToggle value={row.type} onChange={(t) => updateRow(i, { type: t })} />
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => duplicateRow(i)}
                        title="Duplicate"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        title="Remove"
                        disabled={rows.length === 1}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Fields: row 1 — date + amount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateRow(i, { date: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={row.amount}
                        onChange={(e) => updateRow(i, { amount: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  </div>

                  {/* Fields: row 2 — description + category */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Dinner at McD"
                        value={row.description}
                        onChange={(e) => updateRow(i, { description: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                      <select
                        value={row.category}
                        onChange={(e) => updateRow(i, { category: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="">Select category</option>
                        {getCategoriesForType(categories, row.type, incomeCategories).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add row */}
              <button
                type="button"
                onClick={addRow}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 hover:text-emerald-500 hover:border-emerald-400 dark:hover:border-emerald-700 flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={15} /> Add another entry
              </button>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 space-y-3">
              {/* Summary */}
              <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>{rows.length} entr{rows.length === 1 ? "y" : "ies"}</span>
                <span className="text-emerald-500">
                  IN: ₹{rows.filter(r => r.type === "IN").reduce((s, r) => s + (parseFloat(r.amount) || 0), 0).toFixed(2)}
                </span>
                <span className="text-red-500">
                  OUT: ₹{rows.filter(r => r.type === "OUT").reduce((s, r) => s + (parseFloat(r.amount) || 0), 0).toFixed(2)}
                </span>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
              {savedCount > 0 && <p className="text-xs text-emerald-500">✓ Saved {savedCount} transactions</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
                >
                  {loading ? `Saving ${savedCount + 1}/${rows.length}...` : `Save ${rows.length} Entr${rows.length === 1 ? "y" : "ies"}`}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
