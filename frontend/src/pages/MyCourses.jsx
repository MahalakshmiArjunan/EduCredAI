import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Play, Eye } from "lucide-react";

export default function MyCourses() {
  const [chapters, setChapters] = useState([]);
  const nav = useNavigate();
  useEffect(() => { api.get("/chapters?grade=10").then(r=>setChapters(r.data)); }, []);

  const start = async (id) => {
    try {
      const r = await api.post(`/assessments/start?chapterId=${id}`);
      nav(`/quiz/${r.data.sessionId}`, { state: r.data });
    } catch(e) { alert(e.response?.data?.detail || "No questions yet"); }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6" data-testid="courses-page">
      <div>
        <h1 className="text-3xl font-bold">My Courses</h1>
        <p className="text-slate-500 mt-1">All chapters aligned to your grade & CBSE curriculum</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chapters.map(ch => (
          <Card key={ch.id} className="v-card p-6 group hover:shadow-lg transition" data-testid={`course-card-${ch.id}`}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-[color:var(--v-primary)] shrink-0"><BookOpen/></div>
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 items-center flex-wrap">
                  <Badge className="bg-slate-100 text-slate-700 border-0 uppercase text-xs">{ch.subject}</Badge>
                  <Badge className="bg-pink-100 text-pink-700 border-0 uppercase text-xs">Grade {ch.grade}</Badge>
                </div>
                <div className="font-bold text-lg mt-2 leading-tight">Ch {ch.chapterNumber}. {ch.title}</div>
                <div className="text-xs text-slate-500 mt-1">{ch.extractedTopics?.length || 0} topics</div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={()=>nav(`/chapters/${ch.id}`)} className="flex-1" data-testid={`view-chapter-${ch.id}`}><Eye size={14} className="mr-1"/> Read</Button>
              <Button size="sm" onClick={()=>start(ch.id)} className="v-primary-gradient text-white flex-1" data-testid={`start-quiz-${ch.id}`}><Play size={14} className="mr-1"/> Quiz</Button>
            </div>
          </Card>
        ))}
        {!chapters.length && <div className="col-span-full text-slate-400">No chapters yet.</div>}
      </div>
    </div>
  );
}
