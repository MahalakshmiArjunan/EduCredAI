import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";

export default function Results() {
  const [sessions, setSessions] = useState([]);
  useEffect(() => { api.get("/assessments/history/me").then(r=>setSessions(r.data)); }, []);
  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="results-page">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><BarChart3/> Results</h1>
        <p className="text-slate-500 mt-1">Your assessment history</p>
      </div>
      <div className="space-y-3">
        {sessions.map(s => (
          <Card key={s.id} className="v-card p-4 flex items-center justify-between" data-testid={`result-${s.id}`}>
            <div>
              <div className="font-semibold">{s.chapterTitle}</div>
              <div className="text-xs text-slate-500">{s.subject} • {s.responses?.length || 0} questions • {s.status}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[color:var(--v-primary)]">{s.score ?? "—"}%</div>
              <Badge className={`${s.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"} border-0 text-xs`}>{s.status}</Badge>
            </div>
          </Card>
        ))}
        {!sessions.length && <div className="text-slate-400">No sessions yet.</div>}
      </div>
    </div>
  );
}
