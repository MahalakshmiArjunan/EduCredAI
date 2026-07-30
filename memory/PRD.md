# Project Vidya — PRD & Progress

## Problem Statement
Build an AI-powered adaptive learning platform for CBSE students (Grades 8-10) based on
the provided `Project_Vidya_PRD.docx` and the Stitch UI mockups zip. Use MongoDB, no AWS.

## User Choices
- **LLM**: Gemini 3 Flash (via Emergent Universal Key)
- **Storage**: Local disk (`/app/backend/uploads`)
- **Auth**: JWT email/password
- **PDF processing**: LLM-based (Gemini reads PDFs natively)
- **Seed data**: Yes (demo accounts + 3 chapters)

## Personas
- **Student (Grades 8-10)** — take adaptive quizzes, follow study plan, upload chapters
- **Teacher** — view class analytics, heatmap, assignments
- **Parent** — weekly digest, radar chart, predicted score range
- **Admin** — review AI-flagged questions

## Tech Stack
- React 19 + Tailwind + shadcn/ui + Recharts + Sonner
- FastAPI + Motor (MongoDB) + JWT (PyJWT) + bcrypt
- Gemini 3 Flash via `emergentintegrations` library (`gemini-3-flash-preview`)

## Implemented (Iter 1 — Feb 2026)
### Backend (`/api/*`)
- Auth: `/auth/signup`, `/auth/login`, `/auth/me` (JWT + bcrypt)
- Chapters: list, get, upload (Gemini extracts topics from PDF + auto-generates questions)
- Questions: list, flag, list flagged (admin), resolve (admin)
- Adaptive Assessment: start, answer (Elo-like ability update), history, session detail
- Study plan: list, mark task complete
- Dashboards: student, teacher (with heatmap + critical gap), parent (radar, predicted range)
- Admin: stats, flagged content queue
- Seed on startup: 4 demo users + 3 chapters (Light, Quadratic, Nationalism) + questions + mastery + tasks

### Frontend
- Auth pages: `/login` (with demo buttons), `/signup`
- Layout with role-based sidebar (Student / Teacher / Parent / Admin nav)
- `/` — Home routes based on role
- `/courses`, `/practice`, `/plan`, `/results`, `/upload` (Student)
- `/quiz/:sessionId` — Adaptive Quiz with timer, options, feedback panel, next-question flow
- Teacher dashboard: performance heatmap, critical-gap card, recent assignments, today schedule
- Parent dashboard: weekly digest, predicted-score card, radar chart (Recharts), topic focus, activity feed, subject summary
- Admin: stats + flagged content review UI

## Verified
- All 4 roles login → correct dashboard renders
- Student → Take Quiz Now → answer question → feedback → next question flow
- Backend endpoints tested via curl and testing agent (7/8 passed; 1 false-positive was tester's ID extraction)

## Backlog (P1/P2)
- Streaming responses for AI question gen (progress bar)
- Teacher: create custom quiz UI (currently only via upload)
- Parent: notification digest emails (would need Resend/SendGrid integration)
- Student: PDF viewer for uploaded chapters
- Fine-grained learning-gap analytics per topic (sub-topic drilldown)
- Better SA/LA auto-grading (currently self-graded)
- Real-time collaboration (assignments)
