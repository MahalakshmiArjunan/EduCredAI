import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Bell, Home, BookOpen, Pencil, Calendar, BarChart3, HelpCircle, Settings, Upload, Users, ClipboardList, FileText, ShieldCheck, LogOut, TrendingUp, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationsBell from "@/components/NotificationsBell";

const NAVS = {
  STUDENT: [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/courses", icon: BookOpen, label: "My Courses" },
    { to: "/practice", icon: Pencil, label: "Practice Zone" },
    { to: "/my-assignments", icon: ClipboardList, label: "Assignments" },
    { to: "/plan", icon: Calendar, label: "Study Plan" },
    { to: "/results", icon: BarChart3, label: "Results" },
    { to: "/upload", icon: Upload, label: "Upload Chapter" },
  ],
  TEACHER: [
    { to: "/", icon: Home, label: "Class Overview" },
    { to: "/assignments", icon: ClipboardList, label: "Assignments" },
    { to: "/assignments/new", icon: Pencil, label: "New Assignment" },
    { to: "/upload", icon: Upload, label: "Upload Chapter" },
  ],
  PARENT: [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/activity", icon: Activity, label: "Activity Feed" },
    { to: "/insights", icon: BarChart3, label: "Performance" },
    { to: "/predicted", icon: TrendingUp, label: "Predicted Scores" },
  ],
  ADMIN: [
    { to: "/", icon: Home, label: "Overview" },
    { to: "/admin/flagged", icon: ShieldCheck, label: "Flagged Content" },
    { to: "/upload", icon: Upload, label: "Upload Chapter" },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  if (!user) return null;
  const items = NAVS[user.role] || [];
  const roleLabel = user.role === "STUDENT" ? `Grade ${user.profile?.grade || 10} - CBSE`
    : user.role === "TEACHER" ? `Teacher Portal • Class ${user.profile?.className || ""}`
    : user.role === "PARENT" ? "Parent Portal"
    : "System Admin";

  return (
    <div className="min-h-screen flex bg-[color:var(--v-surface)]">
      <aside className="v-sidebar w-64 shrink-0 flex flex-col py-6 px-4">
        <Link to="/" data-testid="brand-link" className="px-3 mb-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-[color:var(--v-primary-deep)] leading-tight">Project Vidya</h1>
          <p className="text-xs text-[color:var(--v-on-surface-variant)] mt-1">{roleLabel}</p>
        </Link>
        <nav className="mt-6 flex-1 space-y-1">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end data-testid={`nav-${it.label.toLowerCase().replace(/\s+/g,'-')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white text-[color:var(--v-primary)] shadow-sm border-l-[3px] border-[color:var(--v-primary)]"
                    : "text-[color:var(--v-on-surface-variant)] hover:bg-white/50"
                }`
              }>
              <it.icon size={18} />
              {it.label}
            </NavLink>
          ))}
        </nav>
        {user.role === "STUDENT" && (
          <Button data-testid="start-daily-quiz-btn" className="v-primary-gradient text-white mt-4 h-11 rounded-lg"
            onClick={() => nav("/practice")}>Start Daily Quiz</Button>
        )}
        {user.role === "TEACHER" && (
          <Button data-testid="create-quiz-btn" className="v-primary-gradient text-white mt-4 h-11 rounded-lg"
            onClick={() => nav("/assignments/new")}>+ New Assignment</Button>
        )}
        <div className="mt-4 space-y-1 border-t border-[color:var(--v-outline-variant)] pt-4">
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[color:var(--v-on-surface-variant)] hover:bg-white/50 w-full">
            <Settings size={18} /> Settings
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[color:var(--v-on-surface-variant)] hover:bg-white/50 w-full">
            <HelpCircle size={18} /> Help Center
          </button>
          <button data-testid="logout-btn" onClick={logout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[color:var(--v-error)] hover:bg-red-50 w-full">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="bg-white/70 backdrop-blur-sm border-b border-[color:var(--v-outline-variant)] sticky top-0 z-10">
          <div className="flex items-center justify-between px-8 py-4">
            <div className="text-sm font-medium text-[color:var(--v-on-surface-variant)]">
              {location.pathname === "/" ? "Classroom" : location.pathname.slice(1).replace(/-/g," ").replace(/\b\w/g, c=>c.toUpperCase())}
            </div>
            <div className="flex items-center gap-4">
              <NotificationsBell />
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-semibold text-sm">
                  {user.name?.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-[color:var(--v-on-surface)]">{user.name}</p>
                  <p className="text-xs text-[color:var(--v-on-surface-variant)]">{user.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
