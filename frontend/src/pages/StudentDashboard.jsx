import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import StreakBadges from "@/components/StreakBadges";
import Leaderboard from "@/components/Leaderboard";
import { Flame, Calendar, Sparkles, AlertCircle, Sun, Sigma, Info, ArrowRight } from "lucide-react";

function subjectIcon(subject) {
  if (subject?.toLowerCase().includes("math")) return <Sigma className="text-amber-700" />;
  if (subject?.toLowerCase().includes("science")) return <Sun className="text-blue-600" />;
  return <Sparkles className="text-emerald-600" />;
}

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const nav = useNavigate();
  useEffect(() => { api.get("/dashboard/student").then((r) => setData(r.data)); }, []);
  if (!data) return <div className="text-sm text-slate-500">Loading…</div>;

  const upcomingCh = data.chapters?.[0];
  const days = ["MON","TUE","WED","THU","FRI"];
  const today = new Date();

  const startQuiz = async (chapterId) => {
    try {
      const r = await api.post(`/assessments/start?chapterId=${chapterId}`);
      nav(`/quiz/${r.data.sessionId}`, { state: r.data });
    } catch(e) {
      alert(e.response?.data?.detail || "Could not start quiz");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6" data-testid="student-dashboard">
      {/* Hero */}
      <Card className="v-primary-gradient text-white p-8 border-0 overflow-hidden relative" data-testid="welcome-hero">
        <div className="absolute right-6 top-6 opacity-15 text-9xl"><Flame /></div>
        <h2 className="text-4xl font-extrabold">Welcome back, {data.user.name.split(" ")[0]}!</h2>
        <p className="mt-2 text-lg opacity-90 flex items-center gap-2">
          You're on a {data.streak}-day streak <Flame size={20} className="text-amber-300" />
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button data-testid="continue-btn" className="bg-white text-[color:var(--v-primary-deep)] hover:bg-white/90 font-semibold"
            onClick={()=> data.chapters[0] && startQuiz(data.chapters[0].id)}>Continue {data.chapters[0]?.subject || "Learning"}</Button>
          <Button data-testid="view-plan-btn" variant="outline" className="border-white text-white bg-white/10 hover:bg-white/20"
            onClick={()=>nav("/plan")}>View Study Plan</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Active Study Plan */}
          <Card className="v-card p-6" data-testid="active-plan-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Active Study Plan</h3>
              <button onClick={()=>nav("/plan")} className="text-sm font-medium text-[color:var(--v-primary)] hover:underline">Full Calendar</button>
            </div>
            <div className="flex gap-2 mb-4">
              {days.map((d, i) => {
                const date = new Date(today); date.setDate(today.getDate() + i);
                const active = i === 0;
                return (
                  <div key={d} className={`flex-1 rounded-xl border p-3 text-center ${active ? "bg-[color:var(--v-primary)] text-white border-transparent" : "bg-white border-slate-200"}`}>
                    <div className="text-xs opacity-70 font-semibold">{d}</div>
                    <div className={`text-2xl font-bold ${active ? "text-white" : "text-slate-900"}`}>{date.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-3">
              {(data.studyPlan || []).slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-center gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50/50" data-testid={`plan-task-${t.id}`}>
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">{subjectIcon(t.subject)}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{t.title}</div>
                    <div className="text-xs text-slate-500">{t.subject} • {t.durationMin}m duration</div>
                  </div>
                  <Badge className="bg-blue-50 text-[color:var(--v-primary)] border-0 hover:bg-blue-50">Upcoming</Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Mastery */}
          <div>
            <h3 className="text-xl font-bold mb-3">Mastery Progress</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="mastery-grid">
              {(data.masteryProgress || []).slice(0,3).map((m) => (
                <Card key={m.subject} className="v-card p-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold">{m.subject}</span>
                    <span className="font-bold text-lg">{m.score}%</span>
                  </div>
                  <Progress value={m.score} className="mt-2 h-2 bg-slate-100 [&>div]:bg-[color:var(--v-secondary)]" />
                  <div className="text-xs text-slate-500 mt-2">{m.level}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {upcomingCh && (
            <Card className="v-card p-6 bg-gradient-to-br from-blue-50 to-indigo-50" data-testid="upcoming-assess">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2 font-bold"><Calendar size={16}/> Upcoming Assessment</div>
                <Badge className="bg-pink-100 text-pink-700 border-0 uppercase text-xs">Grade {upcomingCh.grade}</Badge>
              </div>
              <div className="bg-white rounded-xl p-4 border border-white shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-red-100 text-red-700 border-0 uppercase text-xs">URGENT</Badge>
                  <span className="text-xs text-slate-500">Due Tomorrow</span>
                </div>
                <div className="font-semibold text-slate-900">{upcomingCh.title} Adaptive Quiz</div>
                <div className="text-xs text-slate-500 mt-1">Covers: {upcomingCh.extractedTopics?.slice(0,2).map(t=>t.title).join(" & ") || "core topics"}</div>
                <Button onClick={()=>startQuiz(upcomingCh.id)} data-testid="take-quiz-now-btn" className="w-full mt-4 v-primary-gradient text-white">
                  Take Quiz Now <ArrowRight size={16}/>
                </Button>
              </div>
            </Card>
          )}

          {/* Activity heatmap */}
          <Card className="v-card p-6" data-testid="activity-heatmap-card">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold">Study Activity</span>
              <Info size={14} className="text-slate-400"/>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({length: 14}).map((_, i) => {
                const intensity = [0,10,25,40,60,80,100][Math.floor(Math.random()*7)];
                return <div key={i} className="aspect-square rounded"
                  style={{background: `hsl(221, 83%, ${95 - intensity*0.45}%)`}} />;
              })}
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-3">
              <span>Less</span>
              <div className="flex gap-1 items-center">
                {[95,80,65,50].map(l => <span key={l} className="w-3 h-3 rounded" style={{background:`hsl(221, 83%, ${l}%)`}} />)}
              </div>
              <span>More</span>
            </div>
          </Card>

          <Card className="v-card p-4 flex items-center gap-3" data-testid="recommendations-card">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><Sparkles size={18} className="text-emerald-700"/></div>
            <div>
              <div className="font-semibold text-sm">Smart Recommendations</div>
              <div className="text-xs text-slate-500">3 new study materials added</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Streak + Badges — full width */}
      <StreakBadges />
    </div>
  );
}
