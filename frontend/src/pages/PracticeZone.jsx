import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ChevronRight } from "lucide-react";

export default function PracticeZone() {
  const [chapters, setChapters] = useState([]);
  const nav = useNavigate();
  useEffect(() => { api.get("/chapters").then(r=>setChapters(r.data)); }, []);

  const start = async (id) => {
    try {
      const r = await api.post(`/assessments/start?chapterId=${id}`);
      nav(`/quiz/${r.data.sessionId}`, { state: r.data });
    } catch(e) { alert(e.response?.data?.detail || "No questions"); }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6" data-testid="practice-page">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Sparkles className="text-[color:var(--v-primary)]"/> Practice Zone</h1>
        <p className="text-slate-500 mt-1">Adaptive quizzes tuned to your ability. Difficulty adjusts as you go.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {chapters.map(ch => (
          <Card key={ch.id} className="v-card p-6" data-testid={`practice-${ch.id}`}>
            <Badge className="bg-blue-50 text-[color:var(--v-primary-deep)] border-0 uppercase text-xs mb-3">{ch.subject}</Badge>
            <div className="text-lg font-bold">Ch {ch.chapterNumber}. {ch.title}</div>
            <div className="text-sm text-slate-500 mt-1">{ch.extractedTopics?.length || 0} topics • Grade {ch.grade}</div>
            <Button onClick={()=>start(ch.id)} className="v-primary-gradient text-white mt-4 w-full" data-testid={`practice-start-${ch.id}`}>Start Adaptive Practice <ChevronRight size={16}/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
