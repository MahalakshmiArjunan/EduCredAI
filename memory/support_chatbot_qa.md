# Project Vidya — Customer Support Q&A

A ready-to-use knowledge base for the support chatbot on the Project Vidya website. Grouped by category. Questions are phrased in natural language a real user would type.

---

## 1. Account & Authentication

**Q: How do I create a Project Vidya account?**
A: Click **Sign Up** on the login page. Choose your role (Student, Teacher, or Parent), enter your name, email, and password, and complete role-specific details:
- **Students**: pick your grade (8–10), enter your school name, and optionally your parent's email.
- **Teachers**: enter your class (e.g., 10-A) and the subject you teach.
- **Parents**: enter your child's registered email so we can link the account.
You'll be signed in immediately after registration.

**Q: I forgot my password. How do I reset it?**
A: Password reset by email is on our roadmap. In the meantime, please contact your school admin or write to support to have your password reset manually.

**Q: I'm getting "Invalid email or password" but I'm sure it's right.**
A: Passwords are case-sensitive. Also make sure your email has no leading/trailing spaces. If it still fails, try the **Sign up** flow to confirm no typo in the email — if the system says "Email already registered", the account exists and you may need a reset via support.

**Q: What are the demo accounts I can try?**
A: On the login page click a demo button to auto-fill credentials:
- **Student · G10**: `student@vidya.in` / `student123`
- **Student · G8**: `student8@vidya.in` / `student123`
- **Teacher**: `teacher@vidya.in` / `teacher123`
- **Parent · G10**: `parent@vidya.in` / `parent123`
- **Parent · G8**: `parent8@vidya.in` / `parent123`
- **Admin**: `admin@vidya.in` / `admin123`

**Q: Can I change my role after signing up?**
A: Roles are fixed at signup to keep dashboards and data scoped correctly. If you need a role change, contact support and we'll migrate your account.

**Q: How do I log out?**
A: Click **Logout** at the bottom of the left sidebar. Your session token is cleared and you'll be redirected to the login page.

**Q: Is my data secure?**
A: Passwords are salted-and-hashed with bcrypt. Session tokens use JWT with 7-day expiry. We never share your data with third parties. For enterprise-grade security (httpOnly cookies, SSO), see our upcoming roadmap.

---

## 2. Student — Learning & Practice

**Q: I'm a student. Where do I start?**
A: Your **Dashboard** shows the next chapter to review, your streak, and today's study tasks. Click **Continue** or **Take Quiz Now** in the sidebar to jump straight into practice. **My Courses** lists every chapter for your grade.

**Q: What is an adaptive quiz?**
A: The quiz adjusts difficulty in real time based on your performance. If you answer correctly, the next question gets harder; if you struggle, it gets easier. This gives a more accurate mastery estimate than a fixed test.

**Q: How many questions are in a quiz?**
A: Up to 15 questions per session, drawn from the chapter's question bank. It ends when you've answered all available questions or hit the cap.

**Q: I answered a question and got it wrong. Can I retry?**
A: Not within the same session (adaptive testing needs one answer per question). But you can start a fresh quiz anytime from **Practice Zone** or **My Courses** — the AI will re-select questions based on your current ability.

**Q: What do the badges mean?**
A: Badges reward consistency and progress:
- 🎯 **First Step** — completed your first quiz
- 🔥 **On Fire** — 3-day streak
- ⚔️ **Week Warrior** — 7-day streak
- 🎖️ **Fortnight Focus** — 14-day streak
- 👑 **Monthly Master** — 30-day streak
- 💡 **Curious Mind** — 10 questions answered
- 📚 **Half Century** — 50 questions
- 🏆 **Century Club** — 100 questions
- ⭐ **Perfect Score** — 100% on any quiz
- 🧠 **Topic Master** — 3+ topics mastered
They're visible on your dashboard.

**Q: What is a "streak"?**
A: The number of consecutive days you've completed at least one quiz. If you skip a day, the streak resets to 0. Your **longest streak** is preserved forever.

**Q: How is my "mastery" calculated?**
A: For each subject, we track your average score across recent completed sessions. Levels: **Novice** (<40%), **Level 2 Mastery** (40-59%), **Level 3 Mastery** (60-74%), **Expert Level** (75-89%), **Distinction** (≥90%). Per-topic mastery uses a similar scale but is computed from every quiz response tagged to that topic.

**Q: How does the study plan work?**
A: Click **Generate 7-day plan** on the Study Plan page. Our algorithm ranks every topic by `Weight × (1 − Mastery)` and spreads the top items across 7 days as alternating revision + practice tasks. You can mark tasks done to keep your streak.

**Q: The plan generator gave me the same topics twice. Why?**
A: Because you have more slots than distinct topics. Regenerate after taking a few quizzes so we have more data, or increase the number of chapters uploaded.

**Q: Can I add my own study tasks?**
A: Yes — manual tasks are preserved when you regenerate the plan. The regenerator only deletes AI-generated tasks.

**Q: What are "Notes" for on a chapter?**
A: While reading a chapter, click the **My Notes** tab to jot down explanations, mnemonics, or paste passages you want to remember. Tag each note to a specific topic and pick a highlighter color (yellow / blue / green / pink). Notes are private to you.

**Q: How does the "Reference" button in a quiz work?**
A: It opens a side drawer with the chapter's source PDF (if uploaded) or topic summaries. You can peek at reference material without losing your quiz progress.

**Q: I can't see any chapters for my grade.**
A: Ask your teacher to upload chapters for your grade via **Upload Chapter**, or try the seeded chapters (Grades 8 and 10 have sample content).

**Q: What's the leaderboard about?**
A: It ranks students in your class by weekly and all-time points. Points come from: **10 per quiz + 2 per correct answer + score bonus + streak bonus**. Weekly resets every Monday; All-Time is season-long.

**Q: I climbed the leaderboard — will I be notified?**
A: Yes! When you finish a quiz that moves you up, you'll see a celebration toast: "🎉 You climbed N spots — now ranked #X!"

**Q: What are "reminders" in the bell icon?**
A: Assignments due within 3 days, overdue assignments, and today's study-plan tasks. Click any reminder to jump to it. Mark as read (or Mark all read) to dismiss.

---

## 3. Teacher — Managing a Class

**Q: How do I upload a chapter PDF?**
A: **Upload Chapter** → pick grade & subject → drop the PDF → click "Extract & Generate Questions". Gemini AI extracts topics automatically and creates 5 questions per topic. This takes 30–60 seconds for a typical 20-page chapter.

**Q: Can I upload scanned/handwritten PDFs?**
A: Yes, Gemini can OCR most scanned PDFs. Quality varies — very poor scans may produce fewer topics. For best results use text-based PDFs.

**Q: How do I create a custom quiz?**
A: **Assignments** → **New Assignment**. Four steps:
1. Basics — title, subject, chapter, due date
2. Questions — hand-pick from the AI-generated question bank
3. Students — select who gets it
4. Review & publish

**Q: What if a question is wrong or of poor quality?**
A: Currently teachers can preview questions before adding to an assignment. In-place editing/flagging by teachers is on the roadmap; admins can flag and resolve via the admin console.

**Q: What's the "critical gap" card on my dashboard?**
A: The topic where your class as a whole is weakest — based on aggregated mastery scores. Use it to plan the next remedial session.

**Q: What does the classroom heatmap show?**
A: Rows are student groups (Alpha/Beta/Gamma) and columns are recent topics. Green = mastery, amber = developing, red = critical. Hover a cell to see the exact score.

**Q: How does the parent-teacher meeting reminder work?**
A: It's currently a static placeholder for demo purposes. Full PTM scheduling is on the roadmap.

**Q: I don't see any students in my class.**
A: Students must sign up with your class name (e.g., 10-A) in their profile. If they signed up without a class, they can update their profile — or ask an admin to link them to your class.

---

## 4. Parent — Monitoring Your Child

**Q: How does the parent account see my child's progress?**
A: When you sign up, enter your child's registered email — we link the accounts automatically. Your dashboard shows their weekly hours, subject mastery, radar chart, predicted board-exam range, and recent activity.

**Q: What is the "predicted exam score range"?**
A: An estimate of your child's board exam performance derived from their current mastery scores across all subjects. It uses `avg_mastery ± 5%`. It's directional, not a guarantee.

**Q: What does the radar chart show?**
A: Your child's mastery across five main subjects vs. the class average. Click any subject label or chip to open the **Topic Drilldown** — a detailed view of every topic in that subject with attempts, correct answers, and mastery status.

**Q: How does the weekly digest email work?**
A: Every Monday 08:00 UTC we email you a beautifully formatted digest of your child's progress. You can also trigger it manually with the "Email me the weekly digest" button on your dashboard. Emails come from `onboarding@resend.dev` (add to your contacts to avoid spam).

**Q: I'm not receiving the digest emails.**
A: Check spam. Ensure the platform's `RESEND_API_KEY` is configured (admin/support). In Resend's sandbox mode, the platform can only send to a verified inbox — production use requires domain verification.

**Q: How can I motivate my child from the dashboard?**
A: Watch the "Priority Action" card — it flags the child's weakest topic. Encourage them to add it to their study plan. The Rank on the class leaderboard is also a great motivator!

**Q: Can I message the teacher directly through the app?**
A: In-app messaging is on the roadmap. For now, use your school's regular channels.

---

## 5. Admin

**Q: What does the admin do?**
A: Reviews AI-flagged questions, resolves quality issues, and monitors platform usage stats (users, sessions, chapters, questions, flagged content).

**Q: How do I flag a question for admin review?**
A: (Coming soon in the student UI.) Currently done via the API `POST /api/questions/flag` with a reason. Once flagged, it appears in the admin's Flagged Content panel.

---

## 6. Common Issues

**Q: The AI question extraction failed on my PDF.**
A: This usually means the PDF is corrupt, empty, or exceeds size limits. Try:
- Re-saving the PDF from your source
- Reducing to under 25 MB
- Splitting a very large book into single-chapter PDFs

**Q: The page is loading forever.**
A: Refresh once (Ctrl+R / ⌘+R). If it persists, check your internet connection or log out and log back in. If it's a specific page, please describe which one to support.

**Q: I completed a quiz but my streak didn't update.**
A: Streaks update only when a session reaches **COMPLETED** status (all 15 questions answered or the question pool exhausted). Partial sessions don't count. Also, the same day only counts once — check your streak tomorrow morning.

**Q: A student is missing from the leaderboard.**
A: The leaderboard is class-scoped. If the student isn't in your class (or has no class set), they won't appear. Also, they must have at least one activity this week for the weekly board.

**Q: My badges show as "locked" but I qualify.**
A: Badges refresh only when you load the dashboard. Reload the page — if it still doesn't show, contact support with the badge name and your account email.

**Q: The Notes drawer inside a quiz shows "No linked chapter".**
A: The assignment was created without linking a chapter (rare edge case). Notes still work but the reference PDF/topics won't populate. Ask your teacher to link a chapter next time.

**Q: Can I use Project Vidya on my phone?**
A: The dashboards are responsive on tablets. Mobile is functional but the analytical views (heatmap, radar) work best on a screen ≥ 900 px wide. A dedicated mobile app is on the roadmap.

**Q: Is Project Vidya free?**
A: The current version is a demo/pilot. Pricing tiers for schools and individual families are being finalised. Contact us for institutional pilots.

---

## 7. Integrations & Data

**Q: What AI model powers the question generation?**
A: **Gemini 3 Flash Preview** via Google, integrated through Emergent's universal LLM key. All prompts are NCERT/CBSE aligned.

**Q: Where is my data stored?**
A: MongoDB on our secure infrastructure. Uploaded PDFs live on the app server's local disk (no third-party cloud). Nothing goes to public buckets.

**Q: Can I export my data?**
A: Data-export endpoints (as CSV/JSON) are on the roadmap. Contact support for a manual export today.

**Q: Do you share data with third parties?**
A: No. The only external calls are to Google Gemini (for AI features), Resend (for parent digest emails), and MongoDB (our own database). Question payloads sent to Gemini contain no PII.

---

## 8. Contact & Escalation

**Q: I need to speak to a human.**
A: For urgent issues, email `support@vidya.in`. Include:
- Your registered email
- The exact error message (copy-paste or screenshot)
- The page URL and what you were doing
Response SLA: 24 business hours.

**Q: I want to give feedback or suggest a feature.**
A: We love feedback! Send it to `feedback@vidya.in` or click **Help Center → Suggest a feature** (coming soon in the sidebar).

**Q: I want to demo Project Vidya at my school.**
A: Great! Email `schools@vidya.in` with your school name, city, and expected number of students/teachers. We'll set up a pilot.

---

## Chatbot Configuration Tips

When configuring this Q&A in your chatbot platform:

1. **Intents / Categories** — Use the 8 sections above as top-level intents.
2. **Fallback** — If nothing matches with high confidence (>75%), respond: *"I'm not sure yet — can you rephrase, or ask me about your dashboard, quizzes, study plan, badges, or account?"*
3. **Escalation** — If a user types "human", "agent", "support", "help me", "urgent" → immediately show the Contact & Escalation card.
4. **Personalisation** — When the user is logged in, prefix answers with their first name and their role (Student/Teacher/Parent/Admin) so replies feel tailored.
5. **Deep-links** — Where an answer references a page, provide a clickable button (e.g., "Open Study Plan" → `/plan`, "Open Assignments" → `/assignments`).
6. **Multi-turn** — For "How do I create an assignment?" walk the teacher through the wizard step-by-step, waiting for confirmation between steps.
