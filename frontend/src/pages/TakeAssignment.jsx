import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Send } from "lucide-react";
import { toast } from "sonner";

export default function TakeAssignment() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.get(`/assignments/${id}`).then(r => setData(r.data)); }, [id]);

  const q = data?.questions?.[idx];
  const total = data?.questions?.length || 0;
  const pct = useMemo(() => total ? Math.round(((idx+1)/total)*100) : 0, [idx, total]);
  const setAns = (v) => setAnswers(a => ({...a, [q.id]: v}));

  if (!data) return <div>Loading…</div>;
  if (data.mySubmission?.status === "COMPLETED" && !result) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <CheckCircle2 className="mx-auto text-emerald-500" size={64}/>
        <h1 className="text-3xl font-bold mt-4">Already submitted</h1>
        <p className="text-slate-500 mt-2">You scored {data.mySubmission.score}% on this assignment.</p>
        <Button onClick={()=>nav("/my-assignments")} className="mt-6 v-primary-gradient text-white">Back to assignments</Button>
      </div>
    );
  }

  const submit = async () => {
    setSubmitting(true);
    try {
      const responses = data.questions.map(qq => ({ questionId: qq.id, userResponse: answers[qq.id] ?? null }));
      const r = await api.post(`/assignments/${id}/submit`, { responses });
      setResult(r.data);
      toast.success(`Submitted! Score: ${r.data.score}%`);
    } catch(e) {
      toast.error(e.response?.data?.detail || "Submit failed");
    } finally { setSubmitting(false); }
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12" data-testid="assignment-result">
        <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto"><CheckCircle2 size={48} className="text-emerald-600"/></div>
        <h1 className="text-3xl font-bold mt-4">Assignment submitted!</h1>
        <div className="text-6xl font-extrabold text-[color:var(--v-primary)] mt-4">{result.score}%</div>
        <p className="text-slate-500 mt-2">{result.correct} out of {result.total} correct</p>
        <Button onClick={()=>nav("/my-assignments")} className="mt-8 v-primary-gradient text-white px-8">Back to assignments</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4" data-testid="take-assignment">
      <div className="flex items-center justify-between">
        <div>
          <Badge className="bg-blue-50 text-[color:var(--v-primary-deep)] border-0 uppercase text-xs">{data.subject}</Badge>
          <h1 className="text-2xl font-bold mt-2">{data.title}</h1>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Progress</div>
          <div className="font-bold text-[color:var(--v-primary)]">Question {idx+1} / {total}</div>
        </div>
      </div>
      <Progress value={pct} className="h-2 bg-slate-100 [&>div]:bg-[color:var(--v-primary)]"/>

      <Card className="v-card p-8 border-l-4 border-[color:var(--v-primary)]">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
          <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">{q.type}</Badge>
          <Badge variant="outline" className="text-xs">{q.bloomsTaxonomy}</Badge>
        </div>
        <p className="text-lg text-slate-900 leading-relaxed" data-testid="assn-question">{q.questionText}</p>
        {q.type === "MCQ" && q.options && (
          <div className="grid md:grid-cols-2 gap-3 mt-6">
            {q.options.map(op => {
              const sel = answers[q.id] === op.optionId;
              return (
                <button key={op.optionId} data-testid={`assn-opt-${op.optionId}`}
                  onClick={()=>setAns(op.optionId)}
                  className={`text-left p-4 border-2 rounded-xl transition flex items-center gap-3
                    ${sel ? "border-[color:var(--v-primary)] bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${sel ? "border-[color:var(--v-primary)]" : "border-slate-300"}`}>
                    {sel && <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--v-primary)]"/>}
                  </span>
                  <span className="font-medium">{op.text}</span>
                </button>
              );
            })}
          </div>
        )}
        {q.type !== "MCQ" && (
          <textarea value={answers[q.id] || ""} onChange={(e)=>setAns(e.target.value)}
            placeholder="Write your answer here…"
            className="mt-6 w-full min-h-[140px] border-2 border-slate-200 rounded-xl p-4 focus:border-[color:var(--v-primary)] outline-none"
            data-testid="assn-sa"/>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" disabled={idx === 0} onClick={()=>setIdx(i=>i-1)} data-testid="prev-q-btn"><ChevronLeft size={16}/> Previous</Button>
        {idx < total - 1 ? (
          <Button onClick={()=>setIdx(i=>i+1)} className="v-primary-gradient text-white" data-testid="next-q-btn">Next <ChevronRight size={16}/></Button>
        ) : (
          <Button onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8" data-testid="submit-assn-btn">
            <Send size={16} className="mr-1"/> {submitting ? "Submitting…" : "Submit Assignment"}
          </Button>
        )}
      </div>
    </div>
  );
}
