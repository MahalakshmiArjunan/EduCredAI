import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Flame, TrendingUp } from "lucide-react";

const RANK_STYLE = [
  { bg: "bg-gradient-to-br from-amber-300 to-yellow-500", text: "text-amber-950", ring: "ring-amber-300" },
  { bg: "bg-gradient-to-br from-slate-300 to-slate-400", text: "text-slate-900", ring: "ring-slate-300" },
  { bg: "bg-gradient-to-br from-orange-400 to-amber-700", text: "text-white", ring: "ring-orange-300" },
];

export default function Leaderboard({ limit = 5, compact = false }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/leaderboard/weekly").then(r => setData(r.data)).catch(()=>{}); }, []);
  if (!data) return null;
  const top = data.leaderboard.slice(0, limit);

  return (
    <Card className="v-card p-5" data-testid="leaderboard">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Trophy size={18} className="text-amber-500"/> Weekly Leaderboard
        </div>
        <Badge className="bg-blue-50 text-[color:var(--v-primary)] border-0 text-xs">{data.scope}</Badge>
      </div>
      <div className="text-xs text-slate-500 mb-3">Week of {data.weekOf} · Reset every Monday</div>

      <div className="space-y-2">
        {top.map((e) => {
          const podium = e.rank <= 3 ? RANK_STYLE[e.rank - 1] : null;
          return (
            <div key={e.studentId} data-testid={`rank-${e.rank}`}
              className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                e.isMe ? "border-[color:var(--v-primary)] bg-blue-50/60 ring-2 ring-blue-200" : "border-slate-200 bg-white"
              }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                podium ? `${podium.bg} ${podium.text} shadow-md` : "bg-slate-100 text-slate-600"
              }`}>
                {e.rank <= 3 ? <Medal size={18}/> : `#${e.rank}`}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold truncate ${e.isMe ? "text-[color:var(--v-primary-deep)]" : ""}`}>{e.name}</span>
                  {e.isMe && <Badge className="bg-[color:var(--v-primary)] text-white border-0 text-[10px]">YOU</Badge>}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                  <span>{e.sessions} quiz{e.sessions === 1 ? "" : "zes"}</span>
                  {e.correct > 0 && <><span>·</span><span>{e.correct}/{e.questions} correct</span></>}
                  {e.streak > 0 && <><span>·</span><span className="flex items-center gap-0.5"><Flame size={11} className="text-orange-500"/>{e.streak}d</span></>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-extrabold text-[color:var(--v-primary-deep)]">{e.points}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">points</div>
              </div>
            </div>
          );
        })}
        {!top.length && (
          <div className="text-center text-slate-400 text-sm py-6">
            <TrendingUp size={24} className="mx-auto mb-2"/>
            No activity this week yet. Be the first!
          </div>
        )}
      </div>

      {data.myRank && data.myRank > limit && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-center text-xs text-slate-600">
          You're currently ranked <strong className="text-[color:var(--v-primary)]">#{data.myRank}</strong> — keep going!
        </div>
      )}
    </Card>
  );
}
