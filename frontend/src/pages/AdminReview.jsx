import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Flag, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminReview() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const load = () => {
    api.get("/questions/flagged").then(r=>setItems(r.data));
    api.get("/admin/stats").then(r=>setStats(r.data));
  };
  useEffect(() => { load(); }, []);

  const resolve = async (id) => {
    await api.post(`/questions/${id}/resolve`);
    toast.success("Marked as resolved");
    load();
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6" data-testid="admin-page">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldCheck/> Admin Review</h1>
        <p className="text-slate-500 mt-1">Review AI-generated content flagged for quality concerns</p>
      </div>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3" data-testid="admin-stats">
          {[["Users","users"],["Students","students"],["Teachers","teachers"],["Chapters","chapters"],["Questions","questions"],["Flagged","flagged"]].map(([label,k])=>(
            <Card key={k} className="v-card p-4">
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">{label}</div>
              <div className="text-2xl font-bold mt-1">{stats[k]}</div>
            </Card>
          ))}
        </div>
      )}
      <div className="space-y-3">
        {items.map(q => (
          <Card key={q.id} className="v-card p-5 border-l-4 border-amber-400" data-testid={`flagged-${q.id}`}>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-amber-100 text-amber-700 border-0 uppercase text-xs"><Flag size={10} className="mr-1"/>{q.type}</Badge>
              <Badge variant="outline" className="text-xs">{q.bloomsTaxonomy}</Badge>
              {q.flagReason && <span className="text-xs text-slate-500">Reason: {q.flagReason}</span>}
            </div>
            <div className="font-semibold">{q.questionText}</div>
            {q.options && (
              <ul className="mt-2 space-y-1 text-sm">
                {q.options.map(o => (
                  <li key={o.optionId} className={o.optionId === q.correctOptionId ? "font-semibold text-emerald-700" : "text-slate-600"}>
                    {o.optionId}. {o.text} {o.optionId === q.correctOptionId && "✓"}
                  </li>
                ))}
              </ul>
            )}
            <div className="text-xs text-slate-600 mt-2"><strong>Explanation:</strong> {q.explanation}</div>
            <Button size="sm" onClick={()=>resolve(q.id)} className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white" data-testid={`resolve-${q.id}`}>
              <CheckCircle2 size={14} className="mr-1"/> Mark Resolved
            </Button>
          </Card>
        ))}
        {!items.length && <Card className="v-card p-8 text-center text-slate-400">No flagged questions. All clear!</Card>}
      </div>
    </div>
  );
}
