import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Calendar, CheckCircle2, ChevronRight } from "lucide-react";

export default function StudentAssignments() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/assignments/student").then(r=>setItems(r.data)); }, []);
  const pending = items.filter(a => a.mySubmission?.status !== "COMPLETED");
  const done = items.filter(a => a.mySubmission?.status === "COMPLETED");

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="student-assignments">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><ClipboardList/> My Assignments</h1>
        <p className="text-slate-500 mt-1">Custom quizzes assigned by your teachers</p>
      </div>
      <div>
        <h2 className="font-bold text-lg mb-3">Pending ({pending.length})</h2>
        <div className="space-y-3">
          {pending.map(a => (
            <Card key={a.id} className="v-card p-5 flex items-center gap-4" data-testid={`pending-${a.id}`}>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-[color:var(--v-primary)] shrink-0"><ClipboardList/></div>
              <div className="flex-1">
                <div className="flex gap-2 mb-1"><Badge className="bg-slate-100 text-slate-700 border-0 text-xs uppercase">{a.subject}</Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1"><Calendar size={10}/>Due {a.dueDate}</Badge>
                </div>
                <div className="font-semibold">{a.title}</div>
                <div className="text-xs text-slate-500">{a.questionIds.length} questions</div>
              </div>
              <Link to={`/assignments/${a.id}/take`}>
                <Button className="v-primary-gradient text-white" data-testid={`take-${a.id}`}>Start <ChevronRight size={14}/></Button>
              </Link>
            </Card>
          ))}
          {!pending.length && <div className="text-slate-400 text-sm">Nothing pending. Nice work!</div>}
        </div>
      </div>
      <div>
        <h2 className="font-bold text-lg mb-3">Completed ({done.length})</h2>
        <div className="space-y-3">
          {done.map(a => (
            <Card key={a.id} className="v-card p-5 flex items-center gap-4" data-testid={`done-${a.id}`}>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0"><CheckCircle2/></div>
              <div className="flex-1">
                <div className="font-semibold">{a.title}</div>
                <div className="text-xs text-slate-500">{a.subject} • {a.questionIds.length} questions</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[color:var(--v-primary)]">{a.mySubmission.score}%</div>
                <div className="text-xs text-slate-500">Score</div>
              </div>
            </Card>
          ))}
          {!done.length && <div className="text-slate-400 text-sm">No completions yet.</div>}
        </div>
      </div>
    </div>
  );
}
