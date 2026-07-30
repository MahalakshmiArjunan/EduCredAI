import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

const DEMO = [
  { role: "STUDENT · G10", email: "student@vidya.in", password: "student123" },
  { role: "STUDENT · G8", email: "student8@vidya.in", password: "student123" },
  { role: "TEACHER", email: "teacher@vidya.in", password: "teacher123" },
  { role: "PARENT", email: "parent@vidya.in", password: "parent123" },
  { role: "ADMIN", email: "admin@vidya.in", password: "admin123" },
];

export default function Login() {
  const [email, setEmail] = useState("student@vidya.in");
  const [password, setPassword] = useState("student123");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      nav("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[color:var(--v-surface)]">
      <div className="hidden lg:flex flex-col justify-between p-12 v-primary-gradient text-white">
        <div>
          <div className="flex items-center gap-2 text-xl font-bold">
            <GraduationCap /> Project Vidya
          </div>
          <p className="opacity-80 text-sm mt-2">AI-powered adaptive learning for CBSE</p>
        </div>
        <div className="space-y-4">
          <h2 className="text-5xl font-extrabold leading-tight">Learn smarter.<br/>Master faster.</h2>
          <p className="opacity-90 text-lg max-w-md">Personalized study plans, adaptive quizzes, and NCERT-aligned questions — powered by Gemini AI.</p>
          <div className="grid grid-cols-3 gap-4 pt-6">
            <Stat label="Chapters" value="200+" />
            <Stat label="Adaptive Qs" value="10k+" />
            <Stat label="Grades" value="8-10" />
          </div>
        </div>
        <p className="text-xs opacity-70">© Project Vidya · NCERT-aligned</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-md space-y-6 v-card p-8" data-testid="login-form">
          <div>
            <h1 className="text-3xl font-bold text-[color:var(--v-on-surface)]">Welcome back</h1>
            <p className="text-sm text-[color:var(--v-on-surface-variant)] mt-1">Sign in to continue your learning journey</p>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input data-testid="login-email" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label>Password</Label>
              <Input data-testid="login-password" type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <Button type="submit" data-testid="login-submit-btn" disabled={loading}
            className="w-full v-primary-gradient text-white h-11">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <div className="text-xs text-[color:var(--v-on-surface-variant)] text-center">
            No account? <Link to="/signup" className="text-[color:var(--v-primary)] font-medium">Sign up</Link>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--v-on-surface-variant)] mb-2">Demo accounts</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button type="button" key={d.role} data-testid={`demo-${d.role.toLowerCase()}`}
                  onClick={() => { setEmail(d.email); setPassword(d.password); }}
                  className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-left">
                  <div className="font-semibold text-[color:var(--v-primary-deep)]">{d.role}</div>
                  <div className="text-slate-500 truncate">{d.email}</div>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div>
    <div className="text-3xl font-bold">{value}</div>
    <div className="text-xs uppercase tracking-wider opacity-70">{label}</div>
  </div>
);
