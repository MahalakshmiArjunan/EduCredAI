import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, CheckCircle2, ChevronRight } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";

export default function ParentDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/dashboard/parent").then(r => setD(r.data)); }, []);
  if (!d) return <div>Loading…</div>;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6" data-testid="parent-dashboard">
      <div>
        <h1 className="text-3xl font-bold">Parent Portal</h1>
        <p className="text-slate-500 mt-1">{d.user.name} / {d.child.name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="v-card p-6 lg:col-span-2" data-testid="weekly-digest">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Weekly Summary Digest</h3>
            <Badge className="bg-blue-50 text-[color:var(--v-primary)] border-0">Week {d.week}</Badge>
          </div>
          <p className="text-lg text-slate-800">
            <strong className="text-[color:var(--v-primary)]">{d.child.name.split(" ")[0]} spent {d.activeHours} hours studying this week.</strong>{" "}
            Mastery in {d.masteryDeltaSubject} increased by <strong className="text-emerald-600">{d.masteryDelta}%</strong> through focused practice.
          </p>
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Active Learning Time</div>
              <div className="flex gap-1">
                {[100,80,60,90,40,70,55].map((v,i)=>(
                  <div key={i} className="flex-1 h-3 rounded" style={{background:`hsl(221, 83%, ${100 - v*0.5}%)`}} />
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Knowledge Retention</div>
              <div className="text-3xl font-bold text-emerald-600 flex items-center gap-2">{d.knowledgeRetention}% <TrendingUp size={20}/></div>
            </div>
          </div>
        </Card>

        <Card className="v-primary-gradient text-white p-6" data-testid="predicted-scores">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80 flex items-center gap-1"><TrendingUp size={14}/> PROJECTED PERFORMANCE</div>
          <h3 className="text-2xl font-bold mt-1">Predicted Board Exam Score Range</h3>
          <div className="text-6xl font-extrabold mt-6 text-center">{d.predictedRange[0]}% - {d.predictedRange[1]}%</div>
          <div className="text-center text-sm opacity-80 mt-3">based on current mastery levels</div>
          <button className="mt-6 bg-white text-[color:var(--v-primary-deep)] font-semibold py-2.5 rounded-lg w-full">View detailed breakdown</button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="v-card p-6 lg:col-span-2" data-testid="radar-card">
          <h3 className="text-xl font-bold mb-4">Strengths vs. Weaknesses</h3>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={d.radar}>
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis dataKey="subject" tick={{fill:"#334155", fontSize:12, fontWeight:600}} />
                <PolarRadiusAxis angle={90} domain={[0,100]} tick={{fill:"#94a3b8", fontSize:10}} />
                <Radar name={d.child.name.split(" ")[0]} dataKey="aarav" stroke="#2563eb" fill="#2563eb" fillOpacity={0.4} />
                <Radar name="Class Avg" dataKey="classAvg" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.2} strokeDasharray="4 4" />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="v-card p-5" data-testid="topic-focus">
            <h3 className="text-lg font-bold mb-3">Topic Focus</h3>
            {d.priorityAction && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-xl mb-3">
                <div className="flex gap-2 items-center text-red-700 text-sm font-bold"><AlertTriangle size={16}/> Priority Action</div>
                <p className="text-sm text-slate-700 mt-1">{d.child.name.split(" ")[0]} needs support in <strong>{d.priorityAction.topic}</strong></p>
              </div>
            )}
            {d.topicFocus.map((t,i)=>(
              <div key={i} className={`flex items-center justify-between p-3 rounded-xl mb-2 border ${t.kind==="done" ? "border-emerald-100 bg-emerald-50/50" : "border-amber-100 bg-amber-50/40"}`}>
                <div>
                  <div className="font-semibold">{t.title}</div>
                  <div className="text-xs text-slate-500">{t.subject} • {t.meta}</div>
                </div>
                {t.kind === "done" ? <CheckCircle2 className="text-emerald-500" size={20}/> : <ChevronRight className="text-slate-400" size={18}/>}
              </div>
            ))}
          </Card>

          <Card className="v-card p-5" data-testid="recent-activity">
            <h3 className="text-lg font-bold mb-3">Recent Activity</h3>
            <div className="space-y-3">
              {(d.recentActivity || []).slice(0,5).map((a,i)=>(
                <div key={i} className="flex gap-3 items-start">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <div>
                    <div className="text-sm">{a.title}</div>
                    <div className="text-xs text-slate-500">{a.when} • {a.meta}</div>
                  </div>
                </div>
              ))}
              {!d.recentActivity?.length && <div className="text-sm text-slate-400">No recent activity yet.</div>}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="subject-summary">
        {(d.masteryProgress || []).slice(0,4).map((m) => (
          <Card key={m.subject} className="v-card p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="font-bold">{m.subject}</div>
              <Badge className="bg-pink-100 text-pink-700 border-0 uppercase text-xs">Grade 10</Badge>
            </div>
            <div className="flex gap-1 mb-2">
              {[0,1,2,3].map(i=><span key={i} className={`h-2 flex-1 rounded ${i < Math.floor(m.score/25) ? "bg-[color:var(--v-primary)]" : "bg-slate-200"}`}/>)}
            </div>
            <div className="text-xs text-slate-500">{m.score}% Mastery • {m.level}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
