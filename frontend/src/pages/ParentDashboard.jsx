import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertTriangle, TrendingUp, CheckCircle2, ChevronRight, Mail, ChevronDown, Zap, Clock } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";

const STATUS_COLOR = {
  MASTERED: "bg-emerald-500",
  DEVELOPING: "bg-amber-500",
  CRITICAL: "bg-red-500",
  PENDING: "bg-slate-300",
};
const STATUS_LABEL = {
  MASTERED: "text-emerald-700 bg-emerald-100",
  DEVELOPING: "text-amber-800 bg-amber-100",
  CRITICAL: "text-red-700 bg-red-100",
  PENDING: "text-slate-600 bg-slate-100",
};

export default function ParentDashboard() {
  const [d, setD] = useState(null);
  const [drillSubject, setDrillSubject] = useState(null);
  const [drillData, setDrillData] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => { api.get("/dashboard/parent").then(r => setD(r.data)); }, []);

  const openDrill = async (subject) => {
    if (!d?.child?.id) return;
    setDrillSubject(subject);
    setDrillData(null);
    try {
      const r = await api.get(`/students/${d.child.id}/topic-mastery`, { params: { subject } });
      setDrillData(r.data);
    } catch (e) {
      toast.error("Could not load topics");
    }
  };

  const sendDigest = async () => {
    setSending(true);
    try {
      const r = await api.post("/parent/send-digest");
      toast.success(`Digest sent to ${r.data.to}!`);
    } catch (e) {
      const msg = e.response?.data?.detail || "Send failed";
      if (msg.includes("RESEND_API_KEY")) {
        toast.error("Email not configured. Add RESEND_API_KEY to backend .env");
      } else toast.error(msg);
    } finally { setSending(false); }
  };

  if (!d) return <div>Loading…</div>;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6" data-testid="parent-dashboard">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Parent Portal</h1>
          <p className="text-slate-500 mt-1">{d.user.name} / {d.child.name}</p>
        </div>
        <Button onClick={sendDigest} disabled={sending} className="v-primary-gradient text-white" data-testid="send-digest-btn">
          <Mail size={14} className="mr-2"/> {sending ? "Sending…" : "Email me the weekly digest"}
        </Button>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Strengths vs. Weaknesses</h3>
            <span className="text-xs text-slate-500">Click a subject to drill down</span>
          </div>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={d.radar}>
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis dataKey="subject" tick={(props) => (
                  <RadarLabel {...props} onClick={openDrill} />
                )} />
                <PolarRadiusAxis angle={90} domain={[0,100]} tick={{fill:"#94a3b8", fontSize:10}} />
                <Radar name={d.child.name.split(" ")[0]} dataKey="aarav" stroke="#2563eb" fill="#2563eb" fillOpacity={0.4} />
                <Radar name="Class Avg" dataKey="classAvg" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.2} strokeDasharray="4 4" />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* Subject chips for quick drilldown */}
          <div className="flex flex-wrap gap-2 mt-4" data-testid="subject-chips">
            {d.radar.map(s => (
              <button key={s.subject} onClick={()=>openDrill(s.subject === "Math" ? "Mathematics" : s.subject)}
                className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-full px-3 py-1.5 text-sm font-medium text-[color:var(--v-primary-deep)] transition"
                data-testid={`drill-${s.subject}`}>
                {s.subject} · {s.aarav}% <ChevronRight size={14}/>
              </button>
            ))}
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

      {/* Topic Drilldown Drawer */}
      <Sheet open={!!drillSubject} onOpenChange={(o)=>{ if (!o) { setDrillSubject(null); setDrillData(null); } }}>
        <SheetContent side="right" className="!max-w-none w-[min(640px,92vw)] sm:!max-w-none p-0 flex flex-col" data-testid="drill-drawer">
          <SheetHeader className="p-5 border-b bg-slate-50">
            <SheetTitle className="flex items-center gap-2">
              <Zap size={18} className="text-[color:var(--v-primary)]"/>
              {drillSubject} · Topic Mastery
            </SheetTitle>
            {drillData && (
              <p className="text-xs text-slate-500 mt-1">
                {drillData.attemptedTopics} of {drillData.totalTopics} topics attempted
              </p>
            )}
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3">
            {!drillData ? (
              <div className="text-slate-400 text-sm text-center py-8">Loading topic mastery…</div>
            ) : drillData.topics.length === 0 ? (
              <div className="text-slate-400 text-sm text-center py-8">No topics available for {drillSubject} yet.</div>
            ) : (
              drillData.topics.map((t) => (
                <div key={t.topicId} className="border border-slate-200 rounded-xl p-4 bg-white" data-testid={`drill-topic-${t.topicId}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{t.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{t.chapter}</div>
                    </div>
                    <Badge className={`${STATUS_LABEL[t.status]} border-0 uppercase text-xs`}>{t.status}</Badge>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs font-semibold text-slate-600">Mastery</span>
                      <span className="text-lg font-bold text-[color:var(--v-primary-deep)]">{t.mastery}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded overflow-hidden">
                      <div className={`h-full ${STATUS_COLOR[t.status]}`} style={{width: `${t.mastery}%`}}/>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <span>{t.attempts} attempts</span>
                    <span>·</span>
                    <span>{t.correct} correct</span>
                    {t.avgTimeSec > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock size={11}/> avg {t.avgTimeSec}s / q</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** Custom clickable radar tick label */
function RadarLabel({ x, y, payload, onClick, textAnchor }) {
  const subject = payload.value;
  return (
    <text x={x} y={y} textAnchor={textAnchor} dy={4}
      className="cursor-pointer"
      style={{fill:"#334155", fontSize:12, fontWeight:600}}
      onClick={() => onClick(subject === "Math" ? "Mathematics" : subject)}
    >
      {subject}
    </text>
  );
}
