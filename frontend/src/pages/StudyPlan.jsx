import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function StudyPlan() {
  const [tasks, setTasks] = useState([]);
  const load = () => api.get("/study-plan/me").then(r => setTasks(r.data));
  useEffect(() => { load(); }, []);
  const complete = async (id) => {
    await api.post(`/study-plan/${id}/complete`);
    toast.success("Task marked complete");
    load();
  };
  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="study-plan-page">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Calendar/> Study Plan</h1>
        <p className="text-slate-500 mt-1">Priority-based tasks generated from your mastery gaps</p>
      </div>
      <div className="space-y-3">
        {tasks.map(t => (
          <Card key={t.id} className="v-card p-4 flex items-center gap-4" data-testid={`plan-item-${t.id}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${t.status==="COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-[color:var(--v-primary)]"}`}>
              {t.status==="COMPLETED" ? <CheckCircle2/> : t.subject.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{t.title}</div>
              <div className="text-xs text-slate-500">{t.subject} • {t.durationMin}m • {t.date}</div>
            </div>
            {t.status !== "COMPLETED" ? (
              <Button size="sm" onClick={()=>complete(t.id)} className="v-primary-gradient text-white" data-testid={`complete-${t.id}`}>Mark done</Button>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-700 border-0">Completed</Badge>
            )}
          </Card>
        ))}
        {!tasks.length && <div className="text-slate-400">No tasks yet.</div>}
      </div>
    </div>
  );
}
