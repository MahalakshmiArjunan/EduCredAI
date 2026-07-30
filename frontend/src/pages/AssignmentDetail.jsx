import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Users, Calendar, ClipboardList } from "lucide-react";

export default function AssignmentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/assignments/${id}/submissions`).then(r => setData(r.data)); }, [id]);
  if (!data) return <div>Loading…</div>;
  const { assignment: a, submissions } = data;
  const total = a.studentIds.length;
  const submitted = submissions.filter(s => s.status === "COMPLETED").length;
  const avgScore = submissions.length ? Math.round(submissions.reduce((s, x)=>s + (x.score||0),0) / submissions.length) : 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6" data-testid="assignment-detail">
      <Link to="/assignments" className="text-sm text-[color:var(--v-primary)] hover:underline inline-flex items-center gap-1">
        <ArrowLeft size={14}/> Back to assignments
      </Link>
      <div>
        <div className="flex gap-2 mb-2">
          <Badge className="bg-blue-50 text-[color:var(--v-primary-deep)] border-0 uppercase text-xs">{a.subject}</Badge>
          <Badge variant="outline" className="text-xs flex items-center gap-1"><Calendar size={10}/>Due {a.dueDate}</Badge>
        </div>
        <h1 className="text-3xl font-bold">{a.title}</h1>
        <p className="text-slate-500 mt-1">{a.questionIds.length} questions • {total} students</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat icon={<Users/>} label="Submitted" value={`${submitted} / ${total}`}/>
        <Stat icon={<ClipboardList/>} label="Completion" value={`${total ? Math.round(submitted/total*100) : 0}%`}/>
        <Stat icon={<ClipboardList/>} label="Avg Score" value={`${avgScore}%`}/>
      </div>

      <Card className="v-card p-6">
        <h3 className="font-bold text-lg mb-3">Student Submissions</h3>
        <div className="space-y-2">
          {submissions.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50" data-testid={`submission-${s.id}`}>
              <div>
                <div className="font-semibold">{s.studentName}</div>
                <div className="text-xs text-slate-500">Submitted {s.submittedAt?.slice(0,10)}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[color:var(--v-primary)]">{s.score}%</div>
                <Progress value={s.score} className="h-1.5 w-24 bg-slate-200 [&>div]:bg-[color:var(--v-secondary)]"/>
              </div>
            </div>
          ))}
          {!submissions.length && <div className="text-slate-400 text-sm text-center py-4">No submissions yet</div>}
        </div>
      </Card>
    </div>
  );
}

const Stat = ({ icon, label, value }) => (
  <Card className="v-card p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[color:var(--v-primary)]">{icon}</div>
    <div>
      <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  </Card>
);
