import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Users, ArrowRight, Calendar } from "lucide-react";
import Leaderboard from "@/components/Leaderboard";

const STATUS_COLOR = {
  MASTERY: "bg-emerald-600",
  DEVELOPING: "bg-amber-500",
  CRITICAL: "bg-red-500",
};
const STATUS_TXT = { MASTERY: "text-emerald-700 bg-emerald-100", DEVELOPING: "text-amber-800 bg-amber-100", CRITICAL: "text-red-700 bg-red-100" };

export default function TeacherDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/dashboard/teacher").then(r => setD(r.data)); }, []);
  if (!d) return <div>Loading…</div>;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6" data-testid="teacher-dashboard">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {d.user.name.split(" ")[0]}</h1>
          <p className="text-slate-500 mt-1">Here's an overview of Class {d.className}'s performance today.</p>
        </div>
        <Card className="v-card p-4 flex items-center gap-4 min-w-[260px]">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-[color:var(--v-primary)]"><Users size={22}/></div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Students</div>
            <div className="text-2xl font-bold">{d.activeCount} / {d.studentsCount} <span className="text-sm text-emerald-600 font-medium">Active</span></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="v-card p-6 border-red-200 bg-red-50/50" data-testid="critical-gap-card">
          <div className="flex items-center gap-2 text-red-700 font-bold uppercase text-sm mb-3">
            <AlertTriangle size={18}/> Critical Learning Gaps
          </div>
          <h3 className="text-xl font-bold text-red-800 leading-tight">
            {d.criticalGap.pct}% of Class {d.className} struggles with <u>{d.criticalGap.topic}</u>
          </h3>
          <p className="text-sm text-slate-600 mt-3">Average score fell by {Math.abs(d.criticalGap.delta)}% compared to the previous assessment. Conceptual clarity needed for '{d.criticalGap.concept}'.</p>
          <button className="text-[color:var(--v-primary)] font-semibold text-sm mt-4 flex items-center gap-1">Schedule Remedial Session <ArrowRight size={14}/></button>
        </Card>

        <Card className="v-card p-6 lg:col-span-2" data-testid="heatmap-card">
          <div className="flex justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold">Classroom Performance Heatmap</h3>
              <p className="text-xs text-slate-500 mt-1">Topic Mastery by Student Group</p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs items-center">
              {[["MASTERY","emerald-600"],["DEVELOPING","amber-500"],["CRITICAL","red-500"]].map(([k])=>(
                <div key={k} className="flex items-center gap-1"><span className={`w-3 h-3 rounded ${STATUS_COLOR[k]}`} /><span className="font-semibold">{k}</span></div>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th></th>
                  {d.heatmap[0]?.cells.map((c,i)=>(
                    <th key={i} className="font-semibold text-slate-600 pb-2 text-xs">{c.topic}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.heatmap.map((row) => (
                  <tr key={row.group}>
                    <td className="pr-3 py-1 font-semibold text-slate-700 whitespace-nowrap">{row.group}</td>
                    {row.cells.map((c, i) => (
                      <td key={i} className="p-1">
                        <div className={`h-8 rounded-md ${STATUS_COLOR[c.status]} opacity-90`} title={`${c.topic}: ${c.score}%`}></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="v-card p-6 lg:col-span-2" data-testid="recent-assignments-card">
          <div className="flex justify-between mb-4">
            <h3 className="text-xl font-bold">Recent Assignments</h3>
            <a className="text-sm text-[color:var(--v-primary)] font-medium">View All</a>
          </div>
          <div className="space-y-4">
            {d.recentAssignments.map((a,i)=> (
              <div key={i} className="flex items-center gap-4 py-2 border-b last:border-0">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold">{a.subject.charAt(0)}</div>
                <div className="flex-1">
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-xs text-slate-500">Due {a.dueDate} • {a.subject}</div>
                </div>
                <div className="w-48">
                  <Progress value={a.completion} className="h-2 bg-slate-100 [&>div]:bg-[color:var(--v-secondary)]" />
                  <div className="flex justify-between text-xs mt-1"><span className="font-semibold">{a.completion}%</span><span className="text-slate-500 uppercase text-xs">{a.submitted}/{a.total} submitted</span></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="v-primary-gradient text-white p-6" data-testid="today-schedule-card">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Calendar size={20}/> Today's Schedule</h3>
          <div className="space-y-4">
            {d.todaySchedule.map((s,i)=>(
              <div key={i} className={`pl-3 border-l-2 ${s.highlight ? "border-emerald-300" : "border-white/30"}`}>
                <div className="text-xs opacity-80">{s.time}</div>
                <div className="font-semibold">{s.title}</div>
                <div className="text-xs opacity-90">{s.note}</div>
              </div>
            ))}
            <div className="bg-white/10 rounded-lg p-3 mt-4">
              <div className="text-xs uppercase tracking-wider opacity-80 font-semibold">Reminder</div>
              <div className="text-sm mt-1">Parent-Teacher Meeting for Roll No 12, 18, 24 at 3:00 PM.</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Class leaderboard for the teacher */}
      <Leaderboard limit={10} />
    </div>
  );
}
