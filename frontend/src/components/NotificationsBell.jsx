import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Bell, AlertTriangle, Clock, ClipboardList, Calendar, Check } from "lucide-react";

const READ_KEY = "vidya_read_reminders_v1";

function readSet() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); } catch { return new Set(); }
}
function saveRead(set) {
  localStorage.setItem(READ_KEY, JSON.stringify([...set]));
}

const KIND_ICON = {
  "assignment": ClipboardList,
  "study-task": Calendar,
  "low-submission": AlertTriangle,
  "child-assignment": ClipboardList,
};

const SEVERITY_STYLE = {
  danger: "bg-red-50 border-red-200 text-red-700",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  info: "bg-blue-50 border-blue-200 text-blue-700",
};

export default function NotificationsBell() {
  const [items, setItems] = useState([]);
  const [readIds, setReadIds] = useState(readSet());
  const [open, setOpen] = useState(false);

  const load = () => api.get("/notifications/me").then(r => setItems(r.data.reminders || [])).catch(()=>{});
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const unread = useMemo(() => items.filter(i => !readIds.has(i.id)), [items, readIds]);

  const markRead = (id) => {
    const s = new Set(readIds); s.add(id); saveRead(s); setReadIds(s);
  };
  const markAllRead = () => {
    const s = new Set(items.map(i => i.id)); saveRead(s); setReadIds(s);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-slate-100" data-testid="notifications-btn">
          <Bell size={18} className="text-[color:var(--v-on-surface-variant)]" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center" data-testid="notif-count">
              {unread.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0" data-testid="notifications-panel">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-bold flex items-center gap-2"><Bell size={16}/> Reminders</div>
          {items.length > 0 && (
            <button onClick={markAllRead} className="text-xs text-[color:var(--v-primary)] font-semibold hover:underline" data-testid="mark-all-read-btn">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm" data-testid="notif-empty">
              <Check className="mx-auto text-emerald-500 mb-2" size={28}/>
              You're all caught up.
            </div>
          ) : items.map((r) => {
            const Icon = KIND_ICON[r.kind] || Clock;
            const isRead = readIds.has(r.id);
            return (
              <Link key={r.id} to={r.link} onClick={() => { markRead(r.id); setOpen(false); }}
                className={`block px-4 py-3 border-b last:border-0 hover:bg-slate-50 transition ${isRead ? "opacity-60" : ""}`}
                data-testid={`notif-${r.id}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${SEVERITY_STYLE[r.severity] || SEVERITY_STYLE.info}`}>
                    <Icon size={16}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm truncate">{r.title}</div>
                      {!isRead && <span className="w-2 h-2 rounded-full bg-[color:var(--v-primary)] shrink-0 mt-1.5"/>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{r.message}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
