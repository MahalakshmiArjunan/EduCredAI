import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Lightbulb, ChevronRight, ChevronLeft, Flame, Info, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdaptiveQuiz() {
  const { sessionId } = useParams();
  const location = useLocation();
  const nav = useNavigate();
  const [state, setState] = useState(location.state || null);
  const [selected, setSelected] = useState(null);
  const [saAnswer, setSaAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!state) api.get(`/assessments/${sessionId}`).then(r => setState({ ...r.data, question: null }));
  }, [sessionId]); // eslint-disable-line

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e+1), 1000);
    return () => clearInterval(t);
  }, [state?.question?.id]);

  const q = state?.question;
  const progress = state?.progress;
  const timeStr = useMemo(() => {
    const m = Math.floor(elapsed/60).toString().padStart(2,"0");
    const s = (elapsed%60).toString().padStart(2,"0");
    return `${m}:${s}`;
  }, [elapsed]);

  const submit = async () => {
    if (!q) return;
    let userResponse = selected;
    if (q.type !== "MCQ") userResponse = saAnswer;
    if (userResponse === null || userResponse === "" || userResponse === undefined) {
      toast.error("Please select or enter an answer");
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.post(`/assessments/${sessionId}/answer`, {
        questionId: q.id, userResponse, timeTakenSeconds: elapsed,
      });
      setFeedback(r.data);
    } catch(e) {
      toast.error(e.response?.data?.detail || "Failed to submit");
    } finally { setSubmitting(false); }
  };

  const next = () => {
    if (!feedback) return;
    if (feedback.status === "COMPLETED") {
      toast.success(`Quiz complete! Score: ${feedback.score}%`);
      nav("/");
      return;
    }
    setState({ ...state, question: feedback.nextQuestion, progress: feedback.progress });
    setSelected(null);
    setSaAnswer("");
    setFeedback(null);
    setElapsed(0);
  };

  if (!q) return <div className="p-8 text-slate-500">Loading question…</div>;

  return (
    <div className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6" data-testid="adaptive-quiz">
      <div className="space-y-4">
        <Card className="v-card p-6" data-testid="quiz-header">
          <div className="flex items-center gap-3">
            <Badge className="bg-pink-100 text-pink-700 border-0 uppercase text-xs">Grade 10</Badge>
            <div className="font-bold text-lg">Adaptive Practice</div>
          </div>
          <div className="text-sm text-slate-500 mt-1">Session • Question {progress.current}/{progress.total}</div>
          <div className="flex items-center gap-6 mt-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Progress</div>
              <div className="text-[color:var(--v-primary)] font-bold">Question {progress.current}/{progress.total}</div>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
              <Timer size={16} className="text-[color:var(--v-primary)]" />
              <span className="font-mono text-[color:var(--v-primary-deep)] font-semibold">{timeStr}</span>
            </div>
          </div>
        </Card>

        <Card className="v-card p-8 border-l-4 border-[color:var(--v-primary)]" data-testid="quiz-question-card">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Question {progress.current}</div>
            <Badge variant="outline" className="text-xs"><Lightbulb size={12} className="mr-1"/>{q.bloomsTaxonomy}</Badge>
          </div>
          <p className="text-lg text-slate-900 leading-relaxed" data-testid="question-text">{q.questionText}</p>
          {q.type === "MCQ" && q.options && (
            <div className="grid md:grid-cols-2 gap-3 mt-6">
              {q.options.map((op) => {
                const isSel = selected === op.optionId;
                const isCorrect = feedback && feedback.correctOptionId === op.optionId;
                const isWrong = feedback && isSel && !feedback.isCorrect;
                return (
                  <button key={op.optionId} data-testid={`option-${op.optionId}`}
                    disabled={!!feedback}
                    onClick={()=>setSelected(op.optionId)}
                    className={`text-left p-4 border-2 rounded-xl transition-all flex items-center gap-3
                      ${isCorrect ? "border-emerald-500 bg-emerald-50" : isWrong ? "border-red-500 bg-red-50" : isSel ? "border-[color:var(--v-primary)] bg-blue-50" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSel || isCorrect ? "border-[color:var(--v-primary)]" : "border-slate-300"}`}>
                      {(isSel || isCorrect) && <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--v-primary)]" />}
                    </span>
                    <span className="font-medium">{op.text}</span>
                    {isCorrect && <CheckCircle2 size={18} className="text-emerald-600 ml-auto"/>}
                    {isWrong && <XCircle size={18} className="text-red-600 ml-auto"/>}
                  </button>
                );
              })}
            </div>
          )}
          {q.type !== "MCQ" && (
            <textarea data-testid="sa-answer" value={saAnswer} onChange={(e)=>setSaAnswer(e.target.value)}
              disabled={!!feedback}
              placeholder="Write your answer here…"
              className="mt-6 w-full min-h-[140px] border-2 border-slate-200 rounded-xl p-4 focus:border-[color:var(--v-primary)] outline-none" />
          )}
          {feedback && (
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200" data-testid="feedback-panel">
              <div className="flex items-center gap-2 font-semibold mb-2">
                {feedback.isCorrect === true && <><CheckCircle2 className="text-emerald-600"/> Correct!</>}
                {feedback.isCorrect === false && <><XCircle className="text-red-600"/> Not quite</>}
                {feedback.isCorrect === null && <><Info className="text-blue-600"/> Sample Answer</>}
              </div>
              <p className="text-sm text-slate-700">{feedback.explanation}</p>
              {feedback.sampleAnswer && <p className="text-sm text-slate-700 mt-2"><strong>Sample answer:</strong> {feedback.sampleAnswer}</p>}
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="ghost" disabled className="text-slate-500"><ChevronLeft size={16}/> Previous</Button>
          {!feedback ? (
            <Button data-testid="confirm-answer-btn" onClick={submit} disabled={submitting}
              className="bg-[color:var(--v-secondary)] hover:bg-emerald-700 text-white px-8">
              Confirm Answer <ChevronRight size={16}/>
            </Button>
          ) : (
            <Button data-testid="next-question-btn" onClick={next} className="v-primary-gradient text-white px-8">
              {feedback.status === "COMPLETED" ? "Finish" : "Next Question"} <ChevronRight size={16}/>
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Card className="v-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3"><Lightbulb size={16}/> Topics Covered</div>
          <div className="space-y-3">
            {["Reflection Laws","Concave Mirrors","Convex Mirrors"].map((t,i) => (
              <div key={t} className="p-3 rounded-lg bg-slate-50 border">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t}</span>
                  <Badge className={`text-xs ${i===0?"bg-emerald-100 text-emerald-700":i===1?"bg-blue-100 text-blue-700":"bg-slate-200 text-slate-600"} border-0 uppercase`}>{i===0?"Mastered":i===1?"Active":"Pending"}</Badge>
                </div>
                <div className="flex gap-1 mt-2">
                  {[0,1,2,3,4].map(k=><span key={k} className={`h-1.5 flex-1 rounded ${k <= i*2 ? (i===0?"bg-emerald-500":"bg-[color:var(--v-primary)]") : "bg-slate-200"}`}/>)}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="v-card p-5 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="text-sm font-semibold text-slate-600">Study Streak</div>
          <div className="text-5xl font-extrabold text-[color:var(--v-primary-deep)] flex items-center gap-2">7 <Flame className="text-orange-500" /></div>
          <div className="text-sm text-slate-600 mt-2">Keep going! You're in the top 5% of Grade 10 students today.</div>
        </Card>
        <Card className="v-card p-4 text-sm text-slate-600 flex gap-2 items-start">
          <Info size={16} className="shrink-0 text-[color:var(--v-primary)] mt-0.5" />
          Adaptive testing adjusts difficulty based on your performance. Speed counts!
        </Card>
      </div>
    </div>
  );
}
