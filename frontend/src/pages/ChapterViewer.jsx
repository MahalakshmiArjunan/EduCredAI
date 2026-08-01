import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, API } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import NotesPanel from "@/components/NotesPanel";
import { FileText, ArrowLeft, Play, BookOpen, ExternalLink, Download, StickyNote, FileDown, Sparkles } from "lucide-react";

export default function ChapterViewer() {
  const { id } = useParams();
  const nav = useNavigate();
  const [chapter, setChapter] = useState(null);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    api.get(`/chapters/${id}`).then(r => setChapter(r.data));
    api.get(`/questions?chapterId=${id}`).then(r => setQuestions(r.data));
  }, [id]);

  const start = async () => {
    try {
      const r = await api.post(`/assessments/start?chapterId=${id}`);
      nav(`/quiz/${r.data.sessionId}`, { state: r.data });
    } catch(e) { alert(e.response?.data?.detail || "No questions available yet"); }
  };

  if (!chapter) return <div>Loading…</div>;
  const pdfUrl = chapter.sourceFileUrl ? `${API.replace(/\/api$/, "")}${chapter.sourceFileUrl}` : null;
  const byTopic = (tid) => questions.filter(q => q.topicId === tid);

  const download = async (kind) => {
    const path = kind === "key-points" ? "key-points.docx" : "question-paper.docx";
    try {
      const r = await api.get(`/chapters/${id}/${path}`, { responseType: "blob" });
      const blob = new Blob([r.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kind === "key-points" ? "key-points" : "practice-paper"}-${(chapter.title||"chapter").replace(/[^a-z0-9]+/gi,"-").toLowerCase()}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err.response?.status === 400
        ? "No questions available yet for this chapter."
        : "Download failed. Please try again.";
      alert(msg);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-4" data-testid="chapter-viewer">
      <Link to="/courses" className="text-sm text-[color:var(--v-primary)] hover:underline inline-flex items-center gap-1">
        <ArrowLeft size={14}/> Back to courses
      </Link>

      <div className="flex flex-col md:flex-row justify-between md:items-end gap-3">
        <div>
          <div className="flex gap-2 mb-2 flex-wrap">
            <Badge className="bg-blue-50 text-[color:var(--v-primary-deep)] border-0 uppercase text-xs">{chapter.subject}</Badge>
            <Badge className="bg-pink-100 text-pink-700 border-0 uppercase text-xs">Grade {chapter.grade}</Badge>
            <Badge variant="outline" className="text-xs">Chapter {chapter.chapterNumber}</Badge>
          </div>
          <h1 className="text-3xl font-bold">{chapter.title}</h1>
          <p className="text-slate-500 mt-1">{chapter.extractedTopics?.length || 0} topics • {questions.length} practice questions</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" data-testid="open-pdf-btn"><ExternalLink size={14} className="mr-1"/> Open PDF</Button>
            </a>
          )}
          <Button variant="outline" onClick={() => download("key-points")} data-testid="download-key-points-btn">
            <Sparkles size={14} className="mr-1"/> Key Points .docx
          </Button>
          <Button variant="outline" onClick={() => download("question-paper")} data-testid="download-question-paper-btn">
            <FileDown size={14} className="mr-1"/> Practice Paper .docx
          </Button>
          <Button onClick={start} className="v-primary-gradient text-white" data-testid="start-practice-btn"><Play size={14} className="mr-1"/> Start Practice</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[70vh]">
        {/* PDF viewer */}
        <Card className="v-card p-0 lg:col-span-3 overflow-hidden" data-testid="pdf-panel">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b">
            <div className="flex items-center gap-2 font-semibold text-sm text-slate-700"><FileText size={16}/> Source Material</div>
            {pdfUrl && <a href={pdfUrl} download className="text-xs text-[color:var(--v-primary)] hover:underline inline-flex items-center gap-1"><Download size={12}/> Download</a>}
          </div>
          {pdfUrl ? (
            <iframe title="Chapter PDF" src={pdfUrl} className="w-full h-[70vh]" data-testid="pdf-iframe"/>
          ) : (
            <div className="p-8 text-center h-[70vh] flex flex-col items-center justify-center" data-testid="no-pdf-placeholder">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <BookOpen className="text-[color:var(--v-primary)]" size={36}/>
              </div>
              <h3 className="text-xl font-bold">Curated Chapter</h3>
              <p className="text-slate-500 mt-2 max-w-md">This is one of our seed CBSE chapters and doesn't have a source PDF. Read the topic summaries on the right, then jump into practice.</p>
              <Button onClick={start} className="v-primary-gradient text-white mt-6" data-testid="start-practice-alt-btn"><Play size={14} className="mr-1"/> Start Practice</Button>
            </div>
          )}
        </Card>

        {/* Topics + Notes panel */}
        <Card className="v-card p-0 lg:col-span-2 overflow-hidden max-h-[75vh] flex flex-col" data-testid="topics-panel">
          <Tabs defaultValue="topics" className="flex flex-col h-full">
            <TabsList className="mx-3 mt-3 grid grid-cols-2">
              <TabsTrigger value="topics" data-testid="tab-topics"><BookOpen size={14} className="mr-1"/>Topics</TabsTrigger>
              <TabsTrigger value="notes" data-testid="tab-notes"><StickyNote size={14} className="mr-1"/>My Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="topics" className="flex-1 min-h-0 overflow-y-auto p-4 mt-0">
              <div className="space-y-3">
                {(chapter.extractedTopics || []).map((t, i) => {
                  const qs = byTopic(t.topicId);
                  return (
                    <div key={t.topicId} className="border border-slate-200 rounded-xl p-3 bg-slate-50/60" data-testid={`topic-${t.topicId}`}>
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-[color:var(--v-primary)] text-white flex items-center justify-center font-bold text-xs shrink-0">{i+1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900">{t.title}</div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t.contentChunk}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{qs.length} questions</Badge>
                            {t.weight && <Badge variant="outline" className="text-xs">Weight {Math.round(t.weight*100)}%</Badge>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
            <TabsContent value="notes" className="flex-1 min-h-0 mt-0">
              <NotesPanel chapterId={id} topics={chapter.extractedTopics || []} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
