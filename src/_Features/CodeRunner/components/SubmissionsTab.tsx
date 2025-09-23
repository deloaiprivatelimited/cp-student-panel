import React, { useEffect, useState } from "react";
import { Copy, Download, ChevronDown, ChevronUp } from "lucide-react";
import { privateAxios } from "../../../utils/axios";

type Case = {
  name: string;
  passed: boolean;
  points_awarded: number;
  time?: number | null;
  memory?: number | null;
  judge_token?: string | null;
};

type Group = {
  name: string;
  group_max_points: number;
  group_points_awarded: number;
  cases: Case[];
};

type SubmissionItem = {
  submission_id: string;
  question_id: string;
  verdict: string;
  total_score: number;
  max_score: number;
  groups?: Group[];
  created_at?: string;
  source_code?: string | null;
  language?: string | null;
};

export default function SubmissionsTabs({
  collection,
  questionId,
  submissionIds = [],
}: {
  collection: string;
  questionId: string;
  submissionIds?: string[];
}) {
console.log('submis')
  console.log(submissionIds)
  // removed page/perPage states since pagination is disabled
  const [items, setItems] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showSource, setShowSource] = useState<Record<string, boolean>>({});
  const [sourceLoading, setSourceLoading] = useState<Record<string, boolean>>({});

  // Re-fetch whenever questionId, collection or submissionIds change.
  useEffect(() => {
    fetchMySubmissions();
    // stringify submissionIds so array identity changes trigger effect correctly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, questionId, JSON.stringify(submissionIds)]);

  async function fetchMySubmissions() {
    setLoading(true);
    try {
      // Per backend contract: if submissionIds not provided or empty => return empty list (do not fetch all)
      if (!submissionIds || submissionIds.length === 0) {
        setItems([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      // Build comma-separated, URL-encoded list
      const idsParam = encodeURIComponent(submissionIds.join(","));

      const resp = await privateAxios.get(
        `/coding/questions/test/submit/test_questions/${questionId}/my-test-submissions?submission_ids=${idsParam}`
      );

      const data = resp.data;
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to load submissions", err);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSource(submission: SubmissionItem) {
    if (submission.source_code) return; // already present
    const sid = submission.submission_id;
    setSourceLoading((s) => ({ ...s, [sid]: true }));
    try {
      // Adjust this backend route if your API differs
      const resp = await privateAxios.get(`/coding/questions/test/submit/submissions/${sid}/source`);
      const source = resp.data?.source_code || resp.data?.source || null;
      setItems((prev) => prev.map((it) => (it.submission_id === sid ? { ...it, source_code: source } : it)));
    } catch (err) {
      console.error("Failed to fetch source for", sid, err);
    } finally {
      setSourceLoading((s) => ({ ...s, [sid]: false }));
    }
  }

  function toggleExpanded(sid: string) {
    setExpanded((e) => ({ ...e, [sid]: !e[sid] }));
  }

  function toggleShowSource(sid: string) {
    const newVal = !showSource[sid];
    setShowSource((s) => ({ ...s, [sid]: newVal }));
    if (newVal) {
      const sub = items.find((it) => it.submission_id === sid);
      if (sub && !sub.source_code) fetchSource(sub);
    }
  }

  async function copyToClipboard(text?: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("copy failed", err);
    }
  }

  function downloadSource(filename: string, text?: string) {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const usingIds = submissionIds && submissionIds.length > 0;

  return (
    <div className="p-4 bg-[#121212] rounded-xl border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-100">My Submissions</h3>
        <div className="text-sm text-gray-400">Total: {total}</div>
      </div>

      {!usingIds ? (
        <div className="text-gray-400">No submissions selected. Provide submissionIds to view specific submissions.</div>
      ) : loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-gray-400">No submissions found for the provided IDs.</div>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <div key={s.submission_id} className="bg-[#1b1b1b] border border-gray-800 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="flex items-baseline gap-3">
                    <div className="text-sm text-gray-300 font-medium">
                      {s.created_at ? new Date(s.created_at).toLocaleString() : "—"}
                    </div>
                    <div className="text-xs px-2 py-1 rounded-md bg-gray-800 text-gray-300">{s.language ?? "-"}</div>
                    <div className="text-sm font-semibold">{s.verdict}</div>
                    <div className="text-sm text-gray-400">{s.total_score}/{s.max_score}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    title="Toggle details"
                    onClick={() => toggleExpanded(s.submission_id)}
                    className="px-2 py-1 rounded-md hover:bg-gray-800"
                  >
                    {expanded[s.submission_id] ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                  </button>
                </div>
              </div>

              {expanded[s.submission_id] && (
                <div className="px-4 pb-4">
                  {/* Score + groups summary */}
                  <div className="mb-3">
                    {s.groups?.map((g, gi) => (
                      <div key={gi} className="mb-2">
                        <div className="flex justify-between text-sm text-gray-300">
                          <div>{g.name || `Group ${gi + 1}`}</div>
                          <div>{g.group_points_awarded}/{g.group_max_points}</div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {g.cases.map((c, ci) => (
                            <div key={ci} className="flex justify-between">
                              <div>{c.name}</div>
                              <div>{c.passed ? "✔" : "✖"} · {c.points_awarded}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Source code controls */}
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => toggleShowSource(s.submission_id)}
                      className="px-3 py-1 rounded-md bg-[#222] text-sm text-gray-200 hover:bg-[#2a2a2a]"
                    >
                      {showSource[s.submission_id] ? "Hide Source" : "Show Source"}
                    </button>

                    {showSource[s.submission_id] && (
                      <>
                        <button
                          onClick={() => copyToClipboard(items.find(it => it.submission_id === s.submission_id)?.source_code || "")}
                          className="px-2 py-1 rounded-md hover:bg-gray-800"
                          title="Copy source"
                        >
                          <Copy className="w-4 h-4 text-gray-300" />
                        </button>
                        <button
                          onClick={() => downloadSource(`${s.submission_id}.${s.language || "txt"}`, items.find(it => it.submission_id === s.submission_id)?.source_code)}
                          className="px-2 py-1 rounded-md hover:bg-gray-800"
                          title="Download source"
                        >
                          <Download className="w-4 h-4 text-gray-300" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Source code panel */}
                  {showSource[s.submission_id] && (
                    <div className="rounded-md border border-gray-800 overflow-auto max-h-72">
                      {sourceLoading[s.submission_id] ? (
                        <div className="p-4 text-gray-400">Loading source...</div>
                      ) : (
                        <pre className="p-4 text-sm font-mono text-gray-100 bg-[#0f0f0f] whitespace-pre-wrap break-words">
                          {items.find(it => it.submission_id === s.submission_id)?.source_code || "(no source available)"}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Notice: pagination removed */}
          <div className="text-xs text-gray-400">Pagination disabled — showing only provided submission IDs.</div>
        </div>
      )}
    </div>
  );
}
