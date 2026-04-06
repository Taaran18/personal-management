"use client";

import { useEffect, useState } from "react";
import { salaryApi, LedgerRow, LedgerSummary } from "@/lib/api";
import { formatCurrency, formatDate, getCurrentMonth, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, BookOpen } from "lucide-react";

export default function LedgerPage() {
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [month, setMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    salaryApi.getLedger(month)
      .then((r) => { setLedger(r.data.ledger); setSummary(r.data.summary); })
      .finally(() => setLoading(false));
  }, [month]);

  const isAboveGoal = summary?.status === "Above Goal";
  const monthLabel = new Date(month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ledger</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{ledger.length} records</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      {/* Top 3 Gradient Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownLeft size={14} className="text-white/70" />
              <p className="text-sm font-medium text-white/70">Total Credits (IN)</p>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(summary.total_credits)}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight size={14} className="text-white/70" />
              <p className="text-sm font-medium text-white/70">Total Debits (OUT)</p>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(summary.total_debits)}</p>
          </div>
          <div className={`rounded-2xl p-5 relative overflow-hidden bg-gradient-to-br ${
            summary.net_flow >= summary.saving_goal ? "from-violet-500 to-purple-600" : "from-amber-500 to-orange-500"
          }`}>
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
            <p className="text-sm font-medium text-white/60 mb-2">Saving Rate</p>
            <p className="text-2xl font-bold text-white">
              {summary.total_credits > 0 ? `${((summary.net_flow / summary.total_credits) * 100).toFixed(1)}%` : "—"}
            </p>
            <p className="text-xs text-white/50 mt-1">of income saved</p>
          </div>
        </div>
      )}

      {/* Net Flow / Goal / Status */}
      {summary && (
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 text-center">
            <div className="px-4 py-1">
              <p className="text-xs text-gray-400 mb-1.5">Net Flow</p>
              <p className={`text-2xl font-bold ${summary.net_flow >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatCurrency(summary.net_flow)}
              </p>
            </div>
            <div className="px-4 py-1">
              <p className="text-xs text-gray-400 mb-1.5">Saving Goal</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.saving_goal)}</p>
            </div>
            <div className="px-4 py-1 flex flex-col items-center">
              <p className="text-xs text-gray-400 mb-1.5">Status</p>
              <span className={cn(
                "inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full",
                isAboveGoal
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
              )}>
                {isAboveGoal ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {summary.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Accountant Book Table */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">

        {/* Book header */}
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-emerald-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Account Statement
            </span>
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            {monthLabel}
          </span>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-28" />
              <col />
              <col className="w-36" />
              <col className="w-36" />
              <col className="w-36" />
              <col className="w-36" />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80">
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Particulars</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-red-400 uppercase tracking-wider">Debit (OUT)</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">Credit (IN)</th>
                <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                    No transactions this month
                  </td>
                </tr>
              ) : (
                ledger.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-900/40",
                      idx % 2 === 0
                        ? "bg-white dark:bg-gray-950"
                        : "bg-gray-50/40 dark:bg-gray-900/20"
                    )}
                  >
                    {/* Colored left strip */}
                    <td className={cn(
                      "px-5 py-3.5 font-mono text-xs text-gray-400 whitespace-nowrap relative",
                      "before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full",
                      row.type === "IN" ? "before:bg-emerald-400" : "before:bg-red-400"
                    )}>
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-white truncate">{row.description}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                        {row.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-red-500">
                      {row.debit ? formatCurrency(row.debit) : <span className="text-gray-200 dark:text-gray-800">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-emerald-500">
                      {row.credit ? formatCurrency(row.credit) : <span className="text-gray-200 dark:text-gray-800">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-900 dark:text-white">
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Closing balance footer */}
        {summary && ledger.length > 0 && (
          <div className="flex items-center px-5 py-3.5 border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <span className="w-28" />
            <span className="flex-1 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Closing Balance</span>
            <span className="w-36" />
            <div className="w-36 text-right pr-1">
              <span className="text-xs font-semibold text-red-400 border-t-2 border-red-300 dark:border-red-700 pt-0.5 inline-block min-w-[80px]">
                {formatCurrency(summary.total_debits)}
              </span>
            </div>
            <div className="w-36 text-right pr-1">
              <span className="text-xs font-semibold text-emerald-500 border-t-2 border-emerald-300 dark:border-emerald-700 pt-0.5 inline-block min-w-[80px]">
                {formatCurrency(summary.total_credits)}
              </span>
            </div>
            <div className="w-36 text-right pr-0">
              <span className="text-base font-bold text-gray-900 dark:text-white border-t-2 border-b-2 border-gray-400 dark:border-gray-500 py-0.5 inline-block min-w-[100px] text-right">
                {formatCurrency(summary.closing_balance)}
              </span>
            </div>
          </div>
        )}

        {/* Mobile */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
          {ledger.map((row) => (
            <div key={row.id} className={cn(
              "p-4 border-l-4",
              row.type === "IN" ? "border-emerald-400" : "border-red-400"
            )}>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-gray-900 dark:text-white text-sm">{row.description}</span>
                <span className={cn("font-bold text-sm", row.type === "IN" ? "text-emerald-500" : "text-red-500")}>
                  {row.type === "IN" ? "+" : "-"}{formatCurrency(row.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">{formatDate(row.date)} · {row.category}</span>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Bal: {formatCurrency(row.balance)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
