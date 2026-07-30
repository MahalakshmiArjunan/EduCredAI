import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, ClipboardList, Users, Calendar, ChevronRight } from "lucide-react";

export default function TeacherAssignments() {
  const [items, setItems] = useState([]);
  const nav = useNavigate();
  useEffect(() => { api.get("/assignments/teacher").then(r => setItems(r.data)); }, []);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6" data-testid="teacher-assignments">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ClipboardList/> Assignments</h1>
          <p className="text-slate-500 mt-1">Custom quizzes you've created and their completion status</p>
        </div>
        <Button onClick={()=>nav("/assignments/new")} className="v-primary-gradient text-white" data-testid="new-assignment-btn">
          <Plus size={16} className="mr-1"/> New Assignment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(a => {
          const pct = a.totalStudents ? Math.round((a.submittedCount/a.totalStudents)*100) : 0;
          return (
            <Card key={a.id} className="v-card p-5 hover:shadow-lg transition" data-testid={`assignment-${a.id}`}>
              <div className="flex items-start justify-between gap-2">
                <Badge className="bg-blue-50 text-[color:var(--v-primary-deep)] border-0 uppercase text-xs">{a.subject}</Badge>
                <Badge variant="outline" className="text-xs flex items-center gap-1"><Calendar size={10}/>{a.dueDate}</Badge>
              </div>
              <div className="font-bold text-lg mt-3 leading-tight">{a.title}</div>
              <div className="text-xs text-slate-500 mt-1">{a.questionIds.length} questions</div>
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1"><Users size={12}/> {a.submittedCount}/{a.totalStudents} submitted</span>
                  <span className="text-[color:var(--v-primary)] font-bold">{pct}%</span>
                </div>
                <Progress value={pct} className="h-2 bg-slate-100 [&>div]:bg-[color:var(--v-secondary)]" />
              </div>
              <Link to={`/assignments/${a.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--v-primary)] hover:underline" data-testid={`view-assignment-${a.id}`}>
                View submissions <ChevronRight size={14}/>
              </Link>
            </Card>
          );
        })}
        {!items.length && (
          <Card className="v-card p-8 col-span-full text-center">
            <ClipboardList className="mx-auto text-slate-300 mb-2" size={40}/>
            <div className="text-slate-500 mb-3">No assignments yet</div>
            <Button onClick={()=>nav("/assignments/new")} className="v-primary-gradient text-white" data-testid="new-assignment-empty-btn">
              <Plus size={16} className="mr-1"/> Create your first
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
