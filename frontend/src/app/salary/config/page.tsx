"use client";

import { useEffect, useState } from "react";
import { salaryApi, SalaryConfig } from "@/lib/api";
import { Save, Plus, X, Target, Tag, TrendingUp, Wallet, Calendar, CalendarDays, Sparkles, CheckCircle2 } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

const DEFAULT_CATEGORIES = [
  "Food & Dining", "Rent", "Transport", "Utilities", "Entertainment",
  "Shopping", "Healthcare", "Education", "Investment / SIP", "EMI",
  "Salary Credit", "Other Income", "Miscellaneous"
];
const DEFAULT_INCOME_CATEGORIES = ["Salary Credit", "Other Income"];

export default function ConfigPage() {
  const [config, setConfig] = useState<SalaryConfig>({
    opening_balance: 0,
    saving_goal: 7200,
    categories: DEFAULT_CATEGORIES,
    income_categories: DEFAULT_INCOME_CATEGORIES,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newCatType, setNewCatType] = useState<"expense" | "income">("expense");

  useEffect(() => {
    salaryApi.getConfig()
      .then((r) => setConfig({
        ...r.data,
        income_categories: r.data.income_categories ?? DEFAULT_INCOME_CATEGORIES,
      }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await salaryApi.updateConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    const cat = newCategory.trim();
    if (!cat || config.categories.includes(cat)) return;
    const newCats = [...config.categories, cat];
    const newIncomeCats = newCatType === "income"
      ? [...config.income_categories, cat]
      : config.income_categories;
    setConfig({ ...config, categories: newCats, income_categories: newIncomeCats });
    setNewCategory("");
  };

  const removeCategory = (cat: string) => {
    setConfig({
      ...config,
      categories: config.categories.filter((c) => c !== cat),
      income_categories: config.income_categories.filter((c) => c !== cat),
    });
  };

  const incomeCategories = config.categories.filter((c) => config.income_categories.includes(c));
  const expenseCategories = config.categories.filter((c) => !config.income_categories.includes(c));
  const dailyGoal = Math.round(config.saving_goal / 30);
  const weeklyGoal = Math.round(config.saving_goal / 4.33);
  const yearlyGoal = config.saving_goal * 12;
  const incomeRatio = config.categories.length > 0
    ? Math.round((incomeCategories.length / config.categories.length) * 100)
    : 0;

  if (loading) return (
    <div className="space-y-4 animate-pulse max-w-5xl mx-auto">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuration</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your salary settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
            saved
              ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
              : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
          }`}
        >
          {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">

        {/* LEFT — Saving Goal */}
        <div className="flex flex-col gap-4">

          {/* Hero Goal Card */}
          <div className="bg-gradient-to-br from-emerald-500 via-emerald-500 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute -right-2 bottom-0 w-28 h-28 rounded-full bg-white/5" />
            <div className="absolute left-1/2 -bottom-6 w-16 h-16 rounded-full bg-teal-400/20" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-white/20">
                  <Target size={14} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">Monthly Saving Goal</span>
              </div>

              <div className="flex items-end gap-2 mb-1">
                <span className="text-2xl font-light text-white/70">₹</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={config.saving_goal}
                  onChange={(e) => setConfig({ ...config, saving_goal: parseFloat(e.target.value) || 0 })}
                  className="text-5xl font-bold text-white bg-transparent border-b-2 border-white/30 focus:border-white/80 outline-none w-40 pb-1 transition-colors leading-tight"
                />
              </div>
              <p className="text-sm text-white/60 mb-5 ml-7">per month</p>

              {/* Breakdown grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <CalendarDays size={10} className="text-white/60" />
                    <p className="text-[10px] text-white/60 uppercase tracking-wider">Daily</p>
                  </div>
                  <p className="text-base font-bold text-white">₹{dailyGoal.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Calendar size={10} className="text-white/60" />
                    <p className="text-[10px] text-white/60 uppercase tracking-wider">Weekly</p>
                  </div>
                  <p className="text-base font-bold text-white">₹{weeklyGoal.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Sparkles size={10} className="text-white/60" />
                    <p className="text-[10px] text-white/60 uppercase tracking-wider">Yearly</p>
                  </div>
                  <p className="text-sm font-bold text-white">{formatCurrency(yearlyGoal)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Stats */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <Tag size={14} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category Overview</span>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>{incomeCategories.length} income</span>
                <span>{expenseCategories.length} expense</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${incomeRatio}%` }}
                />
                <div
                  className="h-full bg-red-400 rounded-full transition-all duration-500"
                  style={{ width: `${100 - incomeRatio}%` }}
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{config.categories.length}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Total</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{incomeCategories.length}</p>
                <p className="text-[11px] text-emerald-500/70 mt-0.5">Income</p>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-xl">
                <p className="text-2xl font-bold text-red-500">{expenseCategories.length}</p>
                <p className="text-[11px] text-red-400/70 mt-0.5">Expense</p>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT — Category Manager */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col">

          {/* Card Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-emerald-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Transaction Categories</span>
            </div>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
              {config.categories.length} total
            </span>
          </div>

          <div className="p-5 flex flex-col gap-4 flex-1">

            {/* Type Toggle */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewCatType(t)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                    newCatType === t
                      ? t === "income"
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-red-500 text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                >
                  {t === "income" ? "＋ Add Income" : "＋ Add Expense"}
                </button>
              ))}
            </div>

            {/* Add Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={`New ${newCatType} category name…`}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm placeholder:text-gray-400"
              />
              <button
                onClick={addCategory}
                disabled={!newCategory.trim()}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-white transition-all font-medium disabled:opacity-40",
                  newCatType === "income"
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-red-500 hover:bg-red-600"
                )}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Categories — both visible, no scroll */}
            <div className="space-y-4">

              {/* Income Section */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <TrendingUp size={12} className="text-emerald-500" />
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Income</span>
                  <span className="text-[11px] text-gray-400 font-medium">{incomeCategories.length}</span>
                </div>
                {incomeCategories.length === 0 ? (
                  <p className="text-xs text-gray-400 italic pl-1">No income categories yet</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {incomeCategories.map((cat) => (
                      <span key={cat} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400 transition-colors">
                        {cat}
                        <button
                          onClick={() => removeCategory(cat)}
                          className="hover:text-red-500 transition-colors opacity-60 hover:opacity-100 ml-0.5"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-gray-200 dark:border-gray-700/60" />

              {/* Expense Section */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Wallet size={12} className="text-red-400" />
                  <span className="text-[11px] font-bold text-red-500 dark:text-red-400 uppercase tracking-widest">Expenses</span>
                  <span className="text-[11px] text-gray-400 font-medium">{expenseCategories.length}</span>
                </div>
                {expenseCategories.length === 0 ? (
                  <p className="text-xs text-gray-400 italic pl-1">No expense categories yet</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {expenseCategories.map((cat) => (
                      <span key={cat} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 text-xs font-medium border border-gray-200 dark:border-gray-700/60 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                        {cat}
                        <button
                          onClick={() => removeCategory(cat)}
                          className="hover:text-red-500 transition-colors opacity-60 hover:opacity-100 ml-0.5"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
