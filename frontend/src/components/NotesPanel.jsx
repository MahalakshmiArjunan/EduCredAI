import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Highlighter, Trash2, Save, X, Sparkles, StickyNote } from "lucide-react";
import { toast } from "sonner";

const COLORS = {
  yellow: { bg: "bg-yellow-100", border: "border-yellow-300", swatch: "bg-yellow-300" },
  blue:   { bg: "bg-blue-100",   border: "border-blue-300",   swatch: "bg-blue-300" },
  green:  { bg: "bg-emerald-100",border: "border-emerald-300",swatch: "bg-emerald-300" },
  pink:   { bg: "bg-pink-100",   border: "border-pink-300",   swatch: "bg-pink-300" },
};

/** Notes & Highlights side panel for a chapter — optionally filtered to a topic. */
export default function NotesPanel({ chapterId, topics = [], defaultTopicId = null }) {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState("");
  const [color, setColor] = useState("yellow");
  const [topicFilter, setTopicFilter] = useState(defaultTopicId || "all");
  const [selectedTopic, setSelectedTopic] = useState(defaultTopicId || (topics[0]?.topicId ?? ""));
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!chapterId) return;
    setLoading(true);
    try {
      const params = { chapterId };
      if (topicFilter !== "all") params.topicId = topicFilter;
      const r = await api.get("/notes", { params });
      setNotes(r.data);
    } catch (err) { console.error("Failed to load notes:", err); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [chapterId, topicFilter]); // eslint-disable-line

  const add = async () => {
    if (!text.trim()) { toast.error("Type something first"); return; }
    try {
      const r = await api.post("/notes", { chapterId, topicId: selectedTopic || null, text, color, kind: "note" });
      setNotes([r.data, ...notes]);
      setText("");
      toast.success("Note saved");
    } catch(e) { toast.error("Failed to save"); }
  };

  const del = async (id) => {
    await api.delete(`/notes/${id}`);
    setNotes(notes.filter(n => n.id !== id));
  };

  const startEdit = (n) => { setEditingId(n.id); setEditText(n.text); };
  const saveEdit = async (id) => {
    await api.put(`/notes/${id}`, { text: editText });
    setNotes(notes.map(n => n.id === id ? { ...n, text: editText } : n));
    setEditingId(null); setEditText("");
    toast.success("Updated");
  };

  const topicTitle = (tid) => topics.find(t => t.topicId === tid)?.title || "General";

  return (
    <div className="flex flex-col h-full" data-testid="notes-panel">
      {/* Composer */}
      <div className="p-4 border-b bg-slate-50 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><StickyNote size={16}/> Add a note or highlight</div>
        <div className="flex gap-2">
          <Select value={selectedTopic || "general"} onValueChange={(v)=>setSelectedTopic(v === "general" ? "" : v)}>
            <SelectTrigger className="h-9 text-xs" data-testid="note-topic-select"><SelectValue placeholder="Topic"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General (whole chapter)</SelectItem>
              {topics.map(t => <SelectItem key={t.topicId} value={t.topicId}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            {Object.entries(COLORS).map(([k, c]) => (
              <button key={k} onClick={()=>setColor(k)}
                className={`w-6 h-6 rounded-full ${c.swatch} border-2 ${color === k ? "border-slate-900" : "border-white"} shadow-sm`}
                aria-label={k} data-testid={`color-${k}`} />
            ))}
          </div>
        </div>
        <textarea value={text} onChange={(e)=>setText(e.target.value)}
          data-testid="note-text"
          placeholder="Write a note or paste a passage to highlight…"
          className={`w-full border-2 rounded-lg p-3 text-sm outline-none focus:border-[color:var(--v-primary)] ${COLORS[color].bg} ${COLORS[color].border}`}
          rows={3}/>
        <Button size="sm" onClick={add} className="v-primary-gradient text-white w-full" data-testid="save-note-btn">
          <Sparkles size={14} className="mr-1"/> Save
        </Button>
      </div>

      {/* Filter + list */}
      <div className="px-4 py-2 border-b bg-white flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter</span>
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="h-8 text-xs flex-1" data-testid="notes-filter"><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All topics</SelectItem>
            {topics.map(t => <SelectItem key={t.topicId} value={t.topicId}>{t.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-slate-400">{notes.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && <div className="text-center text-slate-400 text-sm py-4">Loading…</div>}
        {!loading && notes.length === 0 && (
          <div className="text-center py-12 text-slate-400" data-testid="notes-empty">
            <Highlighter size={28} className="mx-auto mb-2"/>
            <div className="text-sm">No notes yet. Add your first one above.</div>
          </div>
        )}
        {notes.map(n => {
          const c = COLORS[n.color] || COLORS.yellow;
          const isEditing = editingId === n.id;
          return (
            <div key={n.id} className={`border-2 ${c.border} ${c.bg} rounded-xl p-3`} data-testid={`note-${n.id}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{topicTitle(n.topicId)}</span>
                <div className="flex gap-1 shrink-0">
                  {!isEditing && (
                    <button onClick={()=>startEdit(n)} className="text-xs text-slate-500 hover:text-slate-900" data-testid={`edit-note-${n.id}`}>Edit</button>
                  )}
                  <button onClick={()=>del(n.id)} className="text-xs text-red-600 hover:text-red-800" data-testid={`del-note-${n.id}`}><Trash2 size={12}/></button>
                </div>
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <textarea value={editText} onChange={(e)=>setEditText(e.target.value)}
                    className="w-full border rounded p-2 text-sm bg-white" rows={3} data-testid={`edit-textarea-${n.id}`}/>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={()=>saveEdit(n.id)} className="bg-emerald-600 text-white h-7 text-xs"><Save size={12} className="mr-1"/>Save</Button>
                    <Button size="sm" variant="outline" onClick={()=>{setEditingId(null); setEditText("");}} className="h-7 text-xs"><X size={12}/></Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{n.text}</p>
              )}
              <div className="text-[10px] text-slate-500 mt-2">{n.createdAt?.slice(0,10)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
