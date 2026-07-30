import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Sparkles, Zap, Circle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function StudyPlan() {
  const [tasks, setTasks] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [lastGen, setLastGen] = useState(null);

  const load = () => api.get("/study-plan/me").then(r => setTasks(r.data));
  useEffect(() => { load(); }, []);

  const complete = async (id) => {
    await api.post(`/study-plan/${id}/complete`);
    toast.success("Task marked complete");
    load();
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const r = await api.post("/study-plan/generate", null, { params: { days: 7, minutes_per_day: 45 } });
      toast.success(`Generated ${r.data.generated} tasks over 7 days`);
      setLastGen(r.data);
      await load();
    } catch(e) {
      toast.error(e.response?.data?.detail || "Generation failed");
    } finally { setGenerating(false); }
  };

  // Group by date
  const grouped = useMemo(() => {
    const g = {};
    for (const t of tasks) {
      (g[t.date] = g[t.date] || []).push(t);
    }
    return Object.entries(g).sort(([a],[b]) => a.localeCompare(b));
  }, [tasks]);

  const completedCount = tasks.filter(t => t.status === "COMPLETED").length;
  const autoCount = tasks.filter(t => t.source === "AUTO").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6" data-testid="study-plan-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Calendar/> Study Plan</h1>
          <p className="text-slate-500 mt-1">Priority-based tasks • {tasks.length} total · {completedCount} done · {autoCount} AI-generated</p>
        </div>
        <Button onClick={generate} disabled={generating} className="v-primary-gradient text-white" data-testid="generate-plan-btn">
          {generating ? (<><RefreshCw size={14} className="mr-2 animate-spin"/> Generating…</>)
                      : (<><Sparkles size={14} className="mr-2"/> Generate 7-day plan</>)}
        </Button>
      </div>

      {lastGen && (
        <Card className="v-card p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200" data-testid="focus-areas">
          <div className="flex items-center gap-2 text-sm font-bold text-[color:var(--v-primary-deep)] mb-2">
            <Zap size={16}/> Top focus areas
          </div>
          <div className="flex gap-2 flex-wrap">
            {lastGen.topFocusAreas.map((f, i) => (
              <Badge key={i} className="bg-white text-[color:var(--v-primary-deep)] border border-blue-200 text-xs">
                {f.title} · {f.subject} · {f.mastery}%
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {grouped.map(([date, dayTasks]) => {
          const d = new Date(date + "T00:00");
          const today = new Date(); today.setHours(0,0,0,0);
          const isToday = d.toDateString() === today.toDateString();
          return (
            <Card key={date} className={`v-card p-5 ${isToday ? "border-l-4 border-[color:var(--v-primary)]" : ""}`} data-testid={`day-${date}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-14 rounded-xl flex flex-col items-center justify-center font-bold shrink-0
                  ${isToday ? "bg-[color:var(--v-primary)] text-white" : "bg-slate-100 text-slate-700"}`}>
                  <span className="text-[10px] font-semibold opacity-75">{DAY_NAMES[d.getDay()]}</span>
                  <span className="text-xl leading-none">{d.getDate()}</span>
                </div>
                <div>
                  <div className="font-bold">{isToday ? "Today" : d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>
                  <div className="text-xs text-slate-500">{dayTasks.reduce((s,t)=>s+(t.durationMin||0),0)} min total</div>
                </div>
              </div>
              <div className="space-y-2">
                {dayTasks.map(t => (
                  <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border ${t.status==="COMPLETED" ? "bg-emerald-50/50 border-emerald-100" : "bg-white border-slate-200"}`} data-testid={`task-${t.id}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      t.status==="COMPLETED" ? "bg-emerald-100 text-emerald-700"
                      : t.kind === "practice" ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-[color:var(--v-primary)]"}`}>
                      {t.status==="COMPLETED" ? <CheckCircle2 size={16}/>
                       : t.kind === "practice" ? <Zap size={16}/>
                       : <Circle size={16}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{t.title}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>{t.subject}</span>
                        <span>·</span>
                        <span>{t.durationMin}m</span>
                        {t.source === "AUTO" && <><span>·</span><Badge className="bg-blue-50 text-[color:var(--v-primary)] text-[10px] border-0 px-1.5 py-0"><Sparkles size={8} className="mr-0.5"/>AI</Badge></>}
                        {t.kind && <><span>·</span><span className="capitalize">{t.kind}</span></>}
                      </div>
                    </div>
                    {t.status === "COMPLETED" ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Done</Badge>
                    ) : (
                      <Button size="sm" onClick={()=>complete(t.id)} variant="outline" data-testid={`complete-${t.id}`}>Mark done</Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
        {!tasks.length && (
          <Card className="v-card p-8 text-center">
            <Sparkles className="mx-auto text-slate-300 mb-3" size={40}/>
            <div className="font-semibold text-slate-700">No tasks yet</div>
            <p className="text-sm text-slate-500 mt-1">Click "Generate 7-day plan" to build a personalised plan from your weakest topics.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
