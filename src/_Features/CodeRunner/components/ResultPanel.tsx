// components/ResultPanel.tsx
import React from "react";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import type { SubmissionResult, GroupSummary, CaseSummary } from "../types";

function verdictColorClass(verdict: string) {
  const v = (verdict || "").toLowerCase();
  if (v === "accepted") return "bg-green-600/10 border-green-600 text-green-700";
  if (v === "partial") return "bg-yellow-600/10 border-yellow-600 text-yellow-700";
  return "bg-red-600/10 border-red-600 text-red-700";
}

function groupColorClass(pointsAwarded: number, groupMax: number) {
  if (groupMax === 0) return "border-gray-600/40 bg-gray-800 text-gray-200";
  if (pointsAwarded >= groupMax) return "border-green-500 bg-green-600/6 text-green-500";
  if (pointsAwarded > 0) return "border-yellow-500 bg-yellow-600/6 text-yellow-500";
  return "border-red-500 bg-red-600/6 text-red-500";
}

function formatScore(a: number, b: number) {
  return `${a} / ${b}`;
}

const CaseRow: React.FC<{c: CaseSummary}> = ({ c }) => {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex items-center gap-2">
        {c.passed ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <XCircle className="w-4 h-4 text-red-500" />
        )}
        <div className="text-xs text-gray-200">{c.name}</div>
      </div>
      <div className="text-xs text-gray-300">
        {c.points_awarded} pts
      </div>
    </div>
  );
};

const GroupCard: React.FC<{g: GroupSummary}> = ({ g }) => {
  const pct = g.group_max_points > 0 ? Math.round((g.group_points_awarded / g.group_max_points) * 100) : 0;
  const colorClass = groupColorClass(g.group_points_awarded, g.group_max_points);

  return (
    <div className={`p-3 rounded-2xl border ${colorClass} bg-gray-900/40`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-gray-100">{g.name}</div>
            <div className="text-xs text-gray-400">• {formatScore(g.group_points_awarded, g.group_max_points)}</div>
          </div>
          <div className="mt-2 w-full bg-gray-500 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full`}
              style={{
                width: `${pct}%`,
                background: pct >= 100 ? undefined : undefined // Tailwind via parent color; we keep style minimal
              }}
            >
              {/* using inline style width only; visual color comes from border/text */}
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-400">{pct}%</div>
      </div>

      {/* cases list */}
      {/* <div className="mt-3 space-y-1">
        {g.cases.map((c, idx) => (
          <CaseRow key={idx} c={c} />
        ))}
      </div> */}
    </div>
  );
};


const ResultPanel: React.FC<{ result: SubmissionResult | null }> = ({ result }) => {
  if (!result) return null;
  // console.log(result)

  const v = (result.verdict || "").toLowerCase();
  const icon = v === "accepted" ? <CheckCircle className="w-5 h-5 text-green-500" /> :
               v === "partial" ? <AlertTriangle className="w-5 h-5 text-yellow-500" /> :
               <XCircle className="w-5 h-5 text-red-500"/> ;

  return (
    <div className="mt-4 p-4 rounded-2xl bg-gradient-to-b from-black/20 to-black/30 border border-gray-700">
      {/* Top summary */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg border ${verdictColorClass(result.verdict)} flex items-center gap-2`}>
            {icon}
            <div className="text-sm font-semibold">{result.verdict}</div>
          </div>

          <div>
            <div className="text-xs text-gray-400">Score</div>
            <div className="text-lg font-bold text-gray-100">{result.total_score} / {result.max_score}</div>
            <div className="text-xs text-gray-400">{result.created_at ? new Date(result.created_at).toLocaleString() : ""}</div>
          </div>
        </div>

        <div className="text-sm text-gray-300">Submission ID: <span className="font-mono text-gray-200 ml-2">{result.submission_id}</span></div>
      </div>

      {/* Groups grid */}
      <div className="mt-4 grid grid-cols-1 gap-4">
        {result.groups.map((g, idx) => <GroupCard key={idx} g={g} />)}
      </div>
    </div>
  );
};

export default ResultPanel;
