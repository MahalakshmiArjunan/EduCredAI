import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft, Check, BookOpen, Users, Calendar as CalIcon } from "lucide-react";
import { toast } from "sonner";

const STEPS = ["Basics", "Questions", "Students", "Review"];

export default function AssignmentCreate() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [chapters, setChapters] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({
    title: "",
    subject: "Mathematics",
    chapterId: "",
    instructions: "",
    dueDate: new Date(Date.now() + 7*24*3600*1000).toISOString().slice(0,10),
    questionIds: [],
    studentIds: [],
  });
  const set = (k, v) => setForm(f => ({...f, [k]: v}));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.get("/chapters").then(r => setChapters(r.data)); }, []);
  useEffect(() => {
    if (form.chapterId) {
      api.get(`/questions?chapterId=${form.chapterId}`).then(r => setQuestions(r.data));
    } else { setQuestions([]); }
  }, [form.chapterId]);
  useEffect(() => {
    api.get("/dashboard/teacher").then(r => setStudents(r.data.students || []));
  }, []);

  const toggleQ = (id) => set("questionIds", form.questionIds.includes(id)
    ? form.questionIds.filter(x=>x!==id) : [...form.questionIds, id]);
  const toggleS = (id) => set("studentIds", form.studentIds.includes(id)
    ? form.studentIds.filter(x=>x!==id) : [...form.studentIds, id]);
  const toggleAllStudents = () => set("studentIds",
    form.studentIds.length === students.length ? [] : students.map(s=>s.id));

  const canNext = () => {
    if (step === 0) return form.title.trim() && form.chapterId && form.dueDate;
    if (step === 1) return form.questionIds.length > 0;
    if (step === 2) return form.studentIds.length > 0;
    return true;
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post("/assignments", form);
      toast.success("Assignment created!");
      nav("/assignments");
    } catch(e) {
      toast.error(e.response?.data?.detail || "Failed to create");
    } finally { setSubmitting(false); }
  };

  const filteredChapters = chapters.filter(c => c.subject === form.subject);

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="assignment-create">
      <div>
        <h1 className="text-3xl font-bold">New Assignment</h1>
        <p className="text-slate-500 mt-1">Build a custom quiz and assign it to your students</p>
      </div>

      {/* Stepper */}
      <Card className="v-card p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                ${i < step ? "bg-emerald-600 text-white" : i === step ? "v-primary-gradient text-white" : "bg-slate-200 text-slate-500"}`}>
                {i < step ? <Check size={16}/> : i+1}
              </div>
              <div className="ml-2 mr-4">
                <div className={`text-sm font-semibold ${i === step ? "text-[color:var(--v-primary-deep)]" : "text-slate-500"}`}>{label}</div>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-emerald-600" : "bg-slate-200"}`}/>}
            </div>
          ))}
        </div>
      </Card>

      {/* Step content */}
      <Card className="v-card p-6">
        {step === 0 && (
          <div className="space-y-4" data-testid="step-basics">
            <div>
              <Label>Assignment Title</Label>
              <Input value={form.title} onChange={(e)=>set("title", e.target.value)} placeholder="e.g. Quadratic Equations Practice Set B" data-testid="assn-title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Subject</Label>
                <Select value={form.subject} onValueChange={(v)=>{set("subject",v); set("chapterId","");}}>
                  <SelectTrigger data-testid="assn-subject"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {["Mathematics","Science","Social Studies","English","Hindi"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={(e)=>set("dueDate", e.target.value)} data-testid="assn-due"/>
              </div>
            </div>
            <div>
              <Label>Chapter</Label>
              <Select value={form.chapterId} onValueChange={(v)=>set("chapterId", v)}>
                <SelectTrigger data-testid="assn-chapter"><SelectValue placeholder="Select chapter"/></SelectTrigger>
                <SelectContent>
                  {filteredChapters.map(c => <SelectItem key={c.id} value={c.id}>Ch {c.chapterNumber}. {c.title}</SelectItem>)}
                </SelectContent>
              </Select>
              {!filteredChapters.length && <p className="text-xs text-amber-600 mt-1">No {form.subject} chapters yet — upload one from the Upload Chapter page first.</p>}
            </div>
            <div>
              <Label>Instructions (optional)</Label>
              <Textarea value={form.instructions} onChange={(e)=>set("instructions", e.target.value)} placeholder="Notes for students…" rows={3}/>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4" data-testid="step-questions">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Pick Questions from AI Bank</h3>
                <p className="text-xs text-slate-500">{questions.length} available • {form.questionIds.length} selected</p>
              </div>
              <Button variant="outline" size="sm" onClick={()=>set("questionIds", questions.map(q=>q.id))} data-testid="select-all-q">Select all</Button>
            </div>
            {!questions.length && <div className="text-slate-400 text-sm">No questions for this chapter yet.</div>}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {questions.map(q => {
                const sel = form.questionIds.includes(q.id);
                return (
                  <div key={q.id} onClick={()=>toggleQ(q.id)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition ${sel ? "border-[color:var(--v-primary)] bg-blue-50/60" : "border-slate-200 hover:border-slate-300 bg-white"}`}
                    data-testid={`q-item-${q.id}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox checked={sel} className="mt-1 pointer-events-none"/>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">{q.type}</Badge>
                          <Badge variant="outline" className="text-xs">{q.bloomsTaxonomy}</Badge>
                          <Badge variant="outline" className="text-xs">Difficulty {(q.difficultyLevel*100).toFixed(0)}%</Badge>
                        </div>
                        <p className="text-sm text-slate-800">{q.questionText}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4" data-testid="step-students">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Assign to Students</h3>
                <p className="text-xs text-slate-500">{students.length} students in your class • {form.studentIds.length} selected</p>
              </div>
              <Button variant="outline" size="sm" onClick={toggleAllStudents} data-testid="select-all-s">
                {form.studentIds.length === students.length ? "Clear all" : "Select all"}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto">
              {students.map(s => {
                const sel = form.studentIds.includes(s.id);
                return (
                  <div key={s.id} onClick={()=>toggleS(s.id)}
                    className={`p-3 border-2 rounded-xl cursor-pointer flex items-center gap-3 ${sel ? "border-[color:var(--v-primary)] bg-blue-50/60" : "border-slate-200 hover:border-slate-300"}`}
                    data-testid={`student-item-${s.id}`}>
                    <Checkbox checked={sel} className="pointer-events-none"/>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-semibold text-sm">{s.name.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{s.name}</div>
                      <div className="text-xs text-slate-500 truncate">{s.email}</div>
                    </div>
                  </div>
                );
              })}
              {!students.length && <div className="text-slate-400 text-sm col-span-2">No students in your class yet.</div>}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4" data-testid="step-review">
            <h3 className="font-bold text-lg">Review & Publish</h3>
            <ReviewRow icon={<BookOpen size={16}/>} label="Title" value={form.title}/>
            <ReviewRow icon={<BookOpen size={16}/>} label="Subject / Chapter"
              value={`${form.subject} • ${chapters.find(c=>c.id===form.chapterId)?.title || "—"}`}/>
            <ReviewRow icon={<CalIcon size={16}/>} label="Due Date" value={form.dueDate}/>
            <ReviewRow icon={<BookOpen size={16}/>} label="Questions" value={`${form.questionIds.length} questions`}/>
            <ReviewRow icon={<Users size={16}/>} label="Students" value={`${form.studentIds.length} student${form.studentIds.length===1?"":"s"}`}/>
            {form.instructions && <ReviewRow icon={<BookOpen size={16}/>} label="Instructions" value={form.instructions}/>}
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={()=>setStep(s=>s-1)} data-testid="step-back">
          <ChevronLeft size={16}/> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button disabled={!canNext()} onClick={()=>setStep(s=>s+1)} className="v-primary-gradient text-white" data-testid="step-next">
            Next <ChevronRight size={16}/>
          </Button>
        ) : (
          <Button onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8" data-testid="publish-btn">
            {submitting ? "Publishing…" : "Publish Assignment"} <Check size={16} className="ml-1"/>
          </Button>
        )}
      </div>
    </div>
  );
}

const ReviewRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-2 border-b last:border-0">
    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[color:var(--v-primary)] shrink-0">{icon}</div>
    <div className="flex-1">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="font-semibold text-slate-900">{value}</div>
    </div>
  </div>
);
