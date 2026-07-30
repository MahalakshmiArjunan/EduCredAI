import { useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function UploadChapter() {
  const [file, setFile] = useState(null);
  const [grade, setGrade] = useState("10");
  const [subject, setSubject] = useState("Science");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error("Please choose a PDF"); return; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("grade", grade);
    fd.append("subject", subject);
    setBusy(true);
    try {
      const r = await api.post("/chapters/upload", fd, { headers: {"Content-Type":"multipart/form-data"}, timeout: 120000 });
      setResult(r.data);
      toast.success(`Extracted ${r.data.topics} topics, generated ${r.data.questionsGenerated} questions`);
    } catch(e) {
      toast.error(e.response?.data?.detail || "Upload failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="upload-page">
      <div>
        <h1 className="text-3xl font-bold">Upload Chapter</h1>
        <p className="text-slate-500 mt-1">Upload a PDF; Gemini extracts topics & auto-generates NCERT-aligned questions.</p>
      </div>
      <Card className="v-card p-8">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger data-testid="upload-grade"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">Grade 8</SelectItem>
                  <SelectItem value="9">Grade 9</SelectItem>
                  <SelectItem value="10">Grade 10</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger data-testid="upload-subject"><SelectValue/></SelectTrigger>
                <SelectContent>
                  {["Science","Mathematics","Social Studies","English","Hindi"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="block border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-[color:var(--v-primary)] transition" data-testid="file-drop">
            <input type="file" data-testid="file-input" accept=".pdf,.png,.jpg,.jpeg" onChange={(e)=>setFile(e.target.files[0])} className="hidden" />
            <Upload className="mx-auto text-slate-400 mb-3" size={40}/>
            {file ? (
              <div>
                <FileText className="inline mr-2 text-[color:var(--v-primary)]"/> <span className="font-semibold">{file.name}</span>
                <div className="text-xs text-slate-500 mt-1">{(file.size/1024/1024).toFixed(2)} MB</div>
              </div>
            ) : (
              <div>
                <div className="font-semibold">Drop your PDF or click to browse</div>
                <div className="text-xs text-slate-500 mt-1">PDF, PNG, JPG • max 25 MB</div>
              </div>
            )}
          </label>

          <Button type="submit" data-testid="upload-submit" disabled={busy} className="w-full v-primary-gradient text-white h-11">
            {busy ? "Processing with Gemini…" : (<><Sparkles size={16} className="mr-2"/> Extract & Generate Questions</>)}
          </Button>
          {busy && <p className="text-xs text-center text-slate-500">This may take 30-60 seconds for a 20-page PDF.</p>}
        </form>
      </Card>

      {result && (
        <Card className="v-card p-6 border-emerald-200 bg-emerald-50/40" data-testid="upload-result">
          <div className="flex items-center gap-2 text-emerald-700 font-bold mb-3"><CheckCircle2/> Upload processed</div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <Stat label="Chapter" value={result.chapter.title} />
            <Stat label="Topics" value={result.topics} />
            <Stat label="Questions" value={result.questionsGenerated} />
          </div>
          <div className="mt-4 space-y-2">
            {result.chapter.extractedTopics.map((t) => (
              <div key={t.topicId} className="text-sm p-2 bg-white rounded">
                <div className="font-semibold">{t.title}</div>
                <div className="text-xs text-slate-500">{t.contentChunk}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="bg-white p-3 rounded-lg">
    <div className="text-xs uppercase font-semibold text-slate-500">{label}</div>
    <div className="font-bold text-slate-900 truncate mt-1">{value}</div>
  </div>
);
