import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Award, Lock } from "lucide-react";

export default function StreakBadges({ compact = false }) {
  const [g, setG] = useState(null);
  useEffect(() => { api.get("/gamification/me").then(r => setG(r.data)).catch(()=>{}); }, []);
  if (!g) return null;

  return (
    <div className="space-y-4" data-testid="streak-badges">
      {/* Streak card */}
      <Card className="v-card p-5 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-amber-100" data-testid="streak-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">Current Streak</div>
            <div className="text-5xl font-extrabold text-amber-700 flex items-center gap-2 mt-1">
              {g.streak} <Flame className="text-orange-500" size={40}/>
            </div>
            <div className="text-xs text-amber-800/80 mt-1">
              Longest: <strong>{g.longestStreak}</strong> {g.longestStreak === 1 ? "day" : "days"}
            </div>
          </div>
          <div className="text-right">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Trophy className="text-white" size={28}/>
            </div>
            <div className="text-xs text-slate-600 mt-2 font-semibold">{g.earnedCount}/{g.totalBadges} badges</div>
          </div>
        </div>
      </Card>

      {/* Badges */}
      <Card className="v-card p-5" data-testid="badges-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-bold text-lg"><Award className="text-[color:var(--v-primary)]"/> Badges</div>
          <span className="text-xs text-slate-500">{g.totalQuestions} questions answered</span>
        </div>
        <div className={`grid ${compact ? "grid-cols-3" : "grid-cols-2 md:grid-cols-5"} gap-3`}>
          {g.badges.map(b => (
            <div key={b.id} data-testid={`badge-${b.id}`}
              className={`relative rounded-xl border-2 p-3 text-center transition ${
                b.earned
                  ? "border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-sm"
                  : "border-slate-200 bg-slate-50/50 opacity-60"
              }`}>
              <div className={`text-3xl ${b.earned ? "" : "grayscale"}`}>{b.icon}</div>
              <div className="text-xs font-bold mt-1 text-slate-900">{b.name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{b.desc}</div>
              {!b.earned && (
                <div className="absolute top-1.5 right-1.5">
                  <Lock size={10} className="text-slate-400"/>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
