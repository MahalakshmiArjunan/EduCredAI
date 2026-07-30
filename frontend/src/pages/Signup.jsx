import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STUDENT", grade: 10, school: "", parentEmail: "", className: "10-A", subject: "" });
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const nav = useNavigate();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup({ ...form, grade: Number(form.grade) });
      toast.success("Account created!");
      nav("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Signup failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--v-surface)] p-6">
      <form onSubmit={submit} className="w-full max-w-lg v-card p-8 space-y-5" data-testid="signup-form">
        <div>
          <h1 className="text-3xl font-bold">Create your account</h1>
          <p className="text-sm text-[color:var(--v-on-surface-variant)] mt-1">Join Project Vidya today</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Full name</Label>
            <Input data-testid="signup-name" required value={form.name} onChange={(e)=>set("name",e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input data-testid="signup-email" type="email" required value={form.email} onChange={(e)=>set("email",e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input data-testid="signup-password" type="password" required value={form.password} onChange={(e)=>set("password",e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v)=>set("role",v)}>
              <SelectTrigger data-testid="signup-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="STUDENT">Student</SelectItem>
                <SelectItem value="TEACHER">Teacher</SelectItem>
                <SelectItem value="PARENT">Parent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.role === "STUDENT" && (
            <>
              <div>
                <Label>Grade</Label>
                <Select value={String(form.grade)} onValueChange={(v)=>set("grade",v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">Grade 8</SelectItem>
                    <SelectItem value="9">Grade 9</SelectItem>
                    <SelectItem value="10">Grade 10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>School</Label>
                <Input value={form.school} onChange={(e)=>set("school",e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Parent email (optional)</Label>
                <Input value={form.parentEmail} onChange={(e)=>set("parentEmail",e.target.value)} />
              </div>
            </>
          )}
          {form.role === "TEACHER" && (
            <>
              <div>
                <Label>Class</Label>
                <Input value={form.className} onChange={(e)=>set("className",e.target.value)} />
              </div>
              <div>
                <Label>Subject</Label>
                <Input value={form.subject} onChange={(e)=>set("subject",e.target.value)} />
              </div>
            </>
          )}
          {form.role === "PARENT" && (
            <div className="col-span-2">
              <Label>Child's email</Label>
              <Input value={form.parentEmail} onChange={(e)=>set("parentEmail",e.target.value)} />
            </div>
          )}
        </div>
        <Button type="submit" data-testid="signup-submit-btn" disabled={loading} className="w-full v-primary-gradient text-white h-11">
          {loading ? "Creating…" : "Create account"}
        </Button>
        <div className="text-xs text-center text-[color:var(--v-on-surface-variant)]">
          Already have an account? <Link className="text-[color:var(--v-primary)] font-medium" to="/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
