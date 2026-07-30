"""Project Vidya - AI adaptive learning platform (CBSE Grades 8-10)."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import shutil
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone

from auth import hash_password, verify_password, create_token, get_current_user
from ai_service import extract_chapter_from_pdf, generate_questions_for_topic
from email_service import send_parent_digest, send_all_parent_digests
from seed import seed_all

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", ROOT_DIR / "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Project Vidya API")
api = APIRouter(prefix="/api")

logger = logging.getLogger("vidya")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def _now():
    return datetime.now(timezone.utc).isoformat()


# ─────────────────────────── Models ───────────────────────────
class SignupIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str  # STUDENT | TEACHER | PARENT | ADMIN
    grade: Optional[int] = None
    school: Optional[str] = None
    parentEmail: Optional[str] = None
    className: Optional[str] = None
    subject: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class QuizAnswerIn(BaseModel):
    questionId: str
    userResponse: Any
    timeTakenSeconds: int = 0


class FlagQuestionIn(BaseModel):
    questionId: str
    reason: str


class NoteIn(BaseModel):
    chapterId: str
    topicId: Optional[str] = None
    text: str
    color: Optional[str] = "yellow"  # yellow | blue | green | pink
    kind: Optional[str] = "note"  # note | highlight
    quotedText: Optional[str] = None  # for highlights


class NoteUpdateIn(BaseModel):
    text: Optional[str] = None
    color: Optional[str] = None


class AssignmentCreateIn(BaseModel):
    title: str
    subject: str
    chapterId: Optional[str] = None
    questionIds: List[str]
    studentIds: List[str]
    dueDate: str  # ISO date
    instructions: Optional[str] = ""


class AssignmentSubmitIn(BaseModel):
    responses: List[Dict[str, Any]]  # [{questionId, userResponse}]


# ─────────────────────────── Auth ───────────────────────────
@api.post("/auth/signup")
async def signup(payload: SignupIn):
    if await db.users.find_one({"email": payload.email}):
        raise HTTPException(400, "Email already registered")
    role = payload.role.upper()
    if role not in {"STUDENT", "TEACHER", "PARENT", "ADMIN"}:
        raise HTTPException(400, "Invalid role")
    user_id = str(uuid.uuid4())
    profile: Dict[str, Any] = {}
    if role == "STUDENT":
        profile = {
            "grade": payload.grade or 10,
            "school": payload.school or "",
            "parentEmail": payload.parentEmail or "",
            "teacherIds": [],
            "className": payload.className or "",
            "streak": 0,
        }
    elif role == "TEACHER":
        profile = {"school": payload.school or "", "subject": payload.subject or "", "className": payload.className or ""}
    elif role == "PARENT":
        profile = {"childEmail": payload.parentEmail or ""}
    doc = {
        "id": user_id, "role": role, "name": payload.name, "email": payload.email,
        "passwordHash": hash_password(payload.password), "profile": profile, "createdAt": _now(),
    }
    await db.users.insert_one(doc)
    token = create_token(user_id, role)
    return {"token": token, "user": _public_user(doc)}


@api.post("/auth/login")
async def login(payload: LoginIn):
    user = await db.users.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["passwordHash"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": _public_user(user)}


@api.get("/auth/me")
async def me(cu=Depends(get_current_user)):
    user = await db.users.find_one({"id": cu["id"]})
    if not user:
        raise HTTPException(404, "User not found")
    return _public_user(user)


def _public_user(u: dict) -> dict:
    return {"id": u["id"], "role": u["role"], "name": u["name"], "email": u["email"], "profile": u.get("profile", {})}


# ─────────────────────────── Chapters & Upload ───────────────────────────
@api.get("/chapters")
async def list_chapters(grade: Optional[int] = None, subject: Optional[str] = None, cu=Depends(get_current_user)):
    q: Dict[str, Any] = {}
    if grade: q["grade"] = grade
    if subject: q["subject"] = subject
    chapters = await db.chapters.find(q, {"_id": 0}).to_list(500)
    return chapters


@api.get("/chapters/{chapter_id}")
async def get_chapter(chapter_id: str, cu=Depends(get_current_user)):
    ch = await db.chapters.find_one({"id": chapter_id}, {"_id": 0})
    if not ch:
        raise HTTPException(404, "Chapter not found")
    return ch


@api.post("/chapters/upload")
async def upload_chapter(
    file: UploadFile = File(...),
    grade: int = Form(...),
    subject: str = Form(...),
    cu=Depends(get_current_user),
):
    """Upload a PDF, extract topics via Gemini, generate questions per topic."""
    if cu["role"] not in ("TEACHER", "ADMIN", "STUDENT"):
        raise HTTPException(403, "Not allowed")
    if not file.filename.lower().endswith((".pdf", ".png", ".jpg", ".jpeg")):
        raise HTTPException(400, "Only PDF/PNG/JPG allowed")
    # Save to local disk
    chapter_id = str(uuid.uuid4())
    safe_name = f"{chapter_id}_{file.filename}"
    save_path = UPLOAD_DIR / safe_name
    with save_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    # Extract via Gemini (only PDFs for now)
    try:
        if save_path.suffix.lower() == ".pdf":
            extracted = await extract_chapter_from_pdf(str(save_path), grade, subject)
        else:
            # Fallback for images: minimal structure
            extracted = {"chapterTitle": file.filename, "chapterNumber": 1, "topics": []}
    except Exception as e:
        logger.exception("extraction failed")
        raise HTTPException(500, f"AI extraction failed: {e}")

    topics = extracted.get("topics", [])
    # normalise weights
    n = max(len(topics), 1)
    for t in topics:
        t.setdefault("weight", round(1.0 / n, 2))

    chapter_doc = {
        "id": chapter_id,
        "grade": grade,
        "subject": subject,
        "chapterNumber": extracted.get("chapterNumber", 1),
        "title": extracted.get("chapterTitle", file.filename),
        "sourceFileUrl": f"/api/files/{safe_name}",
        "extractedTopics": topics,
        "uploadedBy": cu["id"],
        "createdAt": _now(),
    }
    await db.chapters.insert_one(chapter_doc)
    chapter_doc.pop("_id", None)

    # Generate questions per topic (best effort)
    total_qs = 0
    for topic in topics[:6]:  # cap topics
        try:
            qs = await generate_questions_for_topic(
                extracted.get("chapterTitle", ""), subject, grade, topic, count=5
            )
            docs = []
            for q in qs:
                docs.append({
                    "id": str(uuid.uuid4()),
                    "chapterId": chapter_id,
                    "topicId": topic["topicId"],
                    "type": q.get("type", "MCQ"),
                    "difficultyLevel": float(q.get("difficultyLevel", 0.5)),
                    "bloomsTaxonomy": q.get("bloomsTaxonomy", "Understanding"),
                    "questionText": q.get("questionText", ""),
                    "options": q.get("options"),
                    "correctOptionId": q.get("correctOptionId"),
                    "sampleAnswer": q.get("sampleAnswer"),
                    "explanation": q.get("explanation", ""),
                    "createdAt": _now(),
                    "flagged": False,
                })
            if docs:
                await db.questions.insert_many(docs)
                total_qs += len(docs)
        except Exception as e:
            logger.warning(f"Question gen failed for topic {topic.get('topicId')}: {e}")

    return {"chapterId": chapter_id, "topics": len(topics), "questionsGenerated": total_qs, "chapter": chapter_doc}


@api.get("/files/{filename}")
async def get_file(filename: str):
    from fastapi.responses import FileResponse
    p = UPLOAD_DIR / filename
    if not p.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(p)


# ─────────────────────────── Questions ───────────────────────────
@api.get("/questions")
async def list_questions(chapterId: Optional[str] = None, topicId: Optional[str] = None, cu=Depends(get_current_user)):
    q: Dict[str, Any] = {}
    if chapterId: q["chapterId"] = chapterId
    if topicId: q["topicId"] = topicId
    return await db.questions.find(q, {"_id": 0}).to_list(500)


@api.post("/questions/flag")
async def flag_q(payload: FlagQuestionIn, cu=Depends(get_current_user)):
    r = await db.questions.update_one(
        {"id": payload.questionId},
        {"$set": {"flagged": True, "flagReason": payload.reason, "flaggedBy": cu["id"], "flaggedAt": _now()}},
    )
    if not r.matched_count:
        raise HTTPException(404, "Question not found")
    return {"ok": True}


@api.get("/questions/flagged")
async def flagged_qs(cu=Depends(get_current_user)):
    if cu["role"] != "ADMIN":
        raise HTTPException(403, "Admin only")
    return await db.questions.find({"flagged": True}, {"_id": 0}).to_list(200)


@api.post("/questions/{qid}/resolve")
async def resolve_q(qid: str, cu=Depends(get_current_user)):
    if cu["role"] != "ADMIN":
        raise HTTPException(403, "Admin only")
    await db.questions.update_one({"id": qid}, {"$set": {"flagged": False}})
    return {"ok": True}


# ─────────────────────────── Assessment (adaptive) ───────────────────────────
@api.post("/assessments/start")
async def start_assessment(chapterId: str, cu=Depends(get_current_user)):
    ch = await db.chapters.find_one({"id": chapterId}, {"_id": 0})
    if not ch:
        raise HTTPException(404, "Chapter not found")
    all_qs = await db.questions.find({"chapterId": chapterId}, {"_id": 0}).to_list(500)
    if not all_qs:
        raise HTTPException(400, "No questions available for this chapter yet")
    # Sort by difficulty, pick a starting question near 0.5
    all_qs.sort(key=lambda x: x["difficultyLevel"])
    session_id = str(uuid.uuid4())
    doc = {
        "id": session_id,
        "studentId": cu["id"],
        "chapterId": chapterId,
        "chapterTitle": ch["title"],
        "subject": ch["subject"],
        "status": "IN_PROGRESS",
        "currentAbilityEstimate": 0.5,
        "responses": [],
        "questionPool": [q["id"] for q in all_qs],
        "startedAt": _now(),
        "topicsCovered": [],
    }
    await db.assessment_sessions.insert_one(doc)
    first_q = _pick_next_question(all_qs, 0.5, set())
    return {"sessionId": session_id, "chapterId": chapterId, "chapterTitle": ch["title"], "question": _sanitize_q(first_q), "progress": {"current": 1, "total": min(len(all_qs), 15)}}


def _sanitize_q(q):
    if not q: return None
    # Do not send correct answer to client
    out = {k: v for k, v in q.items() if k not in ("correctOptionId", "sampleAnswer", "explanation")}
    return out


def _pick_next_question(pool, ability, asked_ids):
    remaining = [q for q in pool if q["id"] not in asked_ids]
    if not remaining:
        return None
    # Choose question with difficulty closest to ability
    remaining.sort(key=lambda q: abs(q["difficultyLevel"] - ability))
    return remaining[0]


@api.post("/assessments/{session_id}/answer")
async def submit_answer(session_id: str, payload: QuizAnswerIn, cu=Depends(get_current_user)):
    session = await db.assessment_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(404, "Session not found")
    q = await db.questions.find_one({"id": payload.questionId}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Question not found")

    is_correct = False
    if q["type"] == "MCQ":
        try:
            is_correct = int(payload.userResponse) == int(q["correctOptionId"])
        except Exception:
            is_correct = False
    else:
        # For SA/LA in MVP, self-graded: any non-empty answer marked correct=None
        is_correct = bool(payload.userResponse)

    # Update ability (simple Elo-like update)
    ability = session.get("currentAbilityEstimate", 0.5)
    diff = q["difficultyLevel"]
    delta = 0.08 if is_correct else -0.08
    # Adjust more if answer was contra-expectation
    if is_correct and diff > ability:
        delta = 0.12
    if not is_correct and diff < ability:
        delta = -0.12
    ability = max(0.1, min(0.95, ability + delta))

    response_entry = {
        "questionId": q["id"], "userResponse": payload.userResponse,
        "isCorrect": is_correct, "timeTakenSeconds": payload.timeTakenSeconds,
        "topicId": q.get("topicId"), "difficultyLevel": diff, "type": q["type"],
    }
    responses = session["responses"] + [response_entry]
    asked_ids = {r["questionId"] for r in responses}

    # Get pool
    pool = await db.questions.find({"id": {"$in": session["questionPool"]}}, {"_id": 0}).to_list(500)
    max_q = min(len(pool), 15)
    next_q = None if len(responses) >= max_q else _pick_next_question(pool, ability, asked_ids)

    status = "COMPLETED" if next_q is None else "IN_PROGRESS"
    correct_count = sum(1 for r in responses if r["isCorrect"])
    score = round((correct_count / len(responses)) * 100, 1) if responses else 0

    update = {
        "$set": {
            "currentAbilityEstimate": ability, "responses": responses,
            "status": status, "score": score,
        }
    }
    if status == "COMPLETED":
        update["$set"]["completedAt"] = _now()
        # Update mastery per topic
        await _update_mastery_from_session(session["studentId"], session["subject"], responses)

    await db.assessment_sessions.update_one({"id": session_id}, update)

    return {
        "isCorrect": is_correct if q["type"] == "MCQ" else None,
        "explanation": q.get("explanation", ""),
        "correctOptionId": q.get("correctOptionId"),
        "sampleAnswer": q.get("sampleAnswer"),
        "nextQuestion": _sanitize_q(next_q),
        "progress": {"current": len(responses) + (0 if next_q is None else 1), "total": max_q},
        "status": status,
        "score": score,
        "ability": round(ability, 2),
    }


async def _update_mastery_from_session(student_id, subject, responses):
    if not responses:
        return
    correct = sum(1 for r in responses if r["isCorrect"])
    score = round((correct / len(responses)) * 100, 1)
    level = "Novice"
    if score >= 90: level = "Distinction"
    elif score >= 75: level = "Expert Level"
    elif score >= 60: level = "Level 3 Mastery"
    elif score >= 40: level = "Level 2 Mastery"
    else: level = "Level 1 Mastery"
    await db.mastery.update_one(
        {"studentId": student_id, "subject": subject},
        {"$set": {"score": score, "level": level, "updatedAt": _now()}},
        upsert=True,
    )
    # Update streak
    await _update_streak(student_id)


async def _update_streak(student_id: str):
    """Increment streak if last active was yesterday; reset to 1 if gap > 1 day."""
    from datetime import date, timedelta as td
    user = await db.users.find_one({"id": student_id})
    if not user:
        return
    profile = user.get("profile", {})
    today = datetime.now(timezone.utc).date()
    last_str = profile.get("lastActiveDate")
    streak = profile.get("streak", 0)
    longest = profile.get("longestStreak", 0)

    if last_str:
        try:
            last = date.fromisoformat(last_str)
        except Exception:
            last = None
    else:
        last = None

    if last == today:
        return  # already updated today
    if last == today - td(days=1):
        streak += 1
    else:
        streak = 1
    longest = max(longest, streak)
    await db.users.update_one(
        {"id": student_id},
        {"$set": {
            "profile.lastActiveDate": today.isoformat(),
            "profile.streak": streak,
            "profile.longestStreak": longest,
        }},
    )


@api.get("/assessments/{session_id}")
async def get_session(session_id: str, cu=Depends(get_current_user)):
    s = await db.assessment_sessions.find_one({"id": session_id}, {"_id": 0})
    if not s: raise HTTPException(404, "Not found")
    return s


@api.get("/assessments/history/me")
async def my_assessments(cu=Depends(get_current_user)):
    return await db.assessment_sessions.find({"studentId": cu["id"]}, {"_id": 0}).sort("startedAt", -1).to_list(50)


# ─────────────────────────── Assignments (Custom Quiz Builder) ───────────────────────────
@api.post("/assignments")
async def create_assignment(payload: AssignmentCreateIn, cu=Depends(get_current_user)):
    if cu["role"] != "TEACHER":
        raise HTTPException(403, "Teachers only")
    if not payload.questionIds:
        raise HTTPException(400, "Pick at least one question")
    if not payload.studentIds:
        raise HTTPException(400, "Assign to at least one student")
    aid = str(uuid.uuid4())
    doc = {
        "id": aid,
        "title": payload.title,
        "subject": payload.subject,
        "chapterId": payload.chapterId,
        "questionIds": payload.questionIds,
        "studentIds": payload.studentIds,
        "dueDate": payload.dueDate,
        "instructions": payload.instructions,
        "createdBy": cu["id"],
        "createdAt": _now(),
    }
    await db.assignments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/assignments/teacher")
async def teacher_assignments(cu=Depends(get_current_user)):
    if cu["role"] != "TEACHER":
        raise HTTPException(403)
    items = await db.assignments.find({"createdBy": cu["id"]}, {"_id": 0}).sort("createdAt", -1).to_list(200)
    # Attach submission counts
    for a in items:
        subs = await db.assignment_submissions.count_documents({"assignmentId": a["id"], "status": "COMPLETED"})
        a["submittedCount"] = subs
        a["totalStudents"] = len(a.get("studentIds", []))
    return items


@api.get("/assignments/student")
async def student_assignments(cu=Depends(get_current_user)):
    if cu["role"] != "STUDENT":
        raise HTTPException(403)
    items = await db.assignments.find({"studentIds": cu["id"]}, {"_id": 0}).sort("dueDate", 1).to_list(200)
    # Attach my submission status
    for a in items:
        sub = await db.assignment_submissions.find_one(
            {"assignmentId": a["id"], "studentId": cu["id"]}, {"_id": 0}
        )
        a["mySubmission"] = sub
    return items


@api.get("/assignments/{aid}")
async def get_assignment(aid: str, cu=Depends(get_current_user)):
    a = await db.assignments.find_one({"id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Not found")
    # Access control
    if cu["role"] == "STUDENT" and cu["id"] not in a["studentIds"]:
        raise HTTPException(403, "Not assigned to you")
    if cu["role"] == "TEACHER" and a["createdBy"] != cu["id"]:
        raise HTTPException(403, "Not your assignment")
    questions = await db.questions.find({"id": {"$in": a["questionIds"]}}, {"_id": 0}).to_list(500)
    # For students who haven't submitted, sanitize
    my_sub = None
    if cu["role"] == "STUDENT":
        my_sub = await db.assignment_submissions.find_one(
            {"assignmentId": aid, "studentId": cu["id"]}, {"_id": 0}
        )
        if not my_sub or my_sub.get("status") != "COMPLETED":
            questions = [_sanitize_q(q) for q in questions]
    a["questions"] = questions
    a["mySubmission"] = my_sub
    return a


@api.post("/assignments/{aid}/submit")
async def submit_assignment(aid: str, payload: AssignmentSubmitIn, cu=Depends(get_current_user)):
    if cu["role"] != "STUDENT":
        raise HTTPException(403)
    a = await db.assignments.find_one({"id": aid}, {"_id": 0})
    if not a: raise HTTPException(404, "Not found")
    if cu["id"] not in a["studentIds"]:
        raise HTTPException(403, "Not assigned")

    # Grade
    graded = []
    correct_count = 0
    for r in payload.responses:
        q = await db.questions.find_one({"id": r["questionId"]}, {"_id": 0})
        if not q:
            continue
        is_correct = False
        if q["type"] == "MCQ":
            try:
                is_correct = int(r.get("userResponse")) == int(q["correctOptionId"])
            except Exception:
                is_correct = False
        else:
            is_correct = bool(r.get("userResponse"))
        if is_correct:
            correct_count += 1
        graded.append({
            "questionId": q["id"], "userResponse": r.get("userResponse"),
            "isCorrect": is_correct, "type": q["type"],
        })

    total = len(graded) or 1
    score = round((correct_count / total) * 100, 1)
    sub_id = str(uuid.uuid4())
    doc = {
        "id": sub_id, "assignmentId": aid, "studentId": cu["id"],
        "responses": graded, "score": score,
        "status": "COMPLETED", "submittedAt": _now(),
    }
    # Upsert (allow one submission per student per assignment)
    await db.assignment_submissions.update_one(
        {"assignmentId": aid, "studentId": cu["id"]},
        {"$set": doc},
        upsert=True,
    )
    return {"score": score, "correct": correct_count, "total": total, "submissionId": sub_id}


@api.get("/assignments/{aid}/submissions")
async def assignment_submissions(aid: str, cu=Depends(get_current_user)):
    a = await db.assignments.find_one({"id": aid}, {"_id": 0})
    if not a: raise HTTPException(404)
    if cu["role"] == "TEACHER" and a["createdBy"] != cu["id"]:
        raise HTTPException(403)
    if cu["role"] not in ("TEACHER", "ADMIN"):
        raise HTTPException(403)
    subs = await db.assignment_submissions.find({"assignmentId": aid}, {"_id": 0}).to_list(500)
    # Attach student names
    student_ids = list({s["studentId"] for s in subs})
    students = await db.users.find({"id": {"$in": student_ids}}, {"_id": 0}).to_list(500)
    by_id = {s["id"]: s for s in students}
    for s in subs:
        u = by_id.get(s["studentId"])
        s["studentName"] = u["name"] if u else "Unknown"
    return {"assignment": a, "submissions": subs}


# ─────────────────────────── Notes / Highlights ───────────────────────────
@api.get("/notes")
async def list_notes(chapterId: str, topicId: Optional[str] = None, cu=Depends(get_current_user)):
    q: Dict[str, Any] = {"userId": cu["id"], "chapterId": chapterId}
    if topicId: q["topicId"] = topicId
    notes = await db.notes.find(q, {"_id": 0}).sort("createdAt", -1).to_list(500)
    return notes


@api.post("/notes")
async def create_note(payload: NoteIn, cu=Depends(get_current_user)):
    if not payload.text.strip() and not payload.quotedText:
        raise HTTPException(400, "Note text required")
    doc = {
        "id": str(uuid.uuid4()), "userId": cu["id"],
        "chapterId": payload.chapterId, "topicId": payload.topicId,
        "text": payload.text.strip(), "color": payload.color or "yellow",
        "kind": payload.kind or "note", "quotedText": payload.quotedText,
        "createdAt": _now(), "updatedAt": _now(),
    }
    await db.notes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/notes/{nid}")
async def update_note(nid: str, payload: NoteUpdateIn, cu=Depends(get_current_user)):
    updates = {"updatedAt": _now()}
    if payload.text is not None: updates["text"] = payload.text.strip()
    if payload.color: updates["color"] = payload.color
    r = await db.notes.update_one({"id": nid, "userId": cu["id"]}, {"$set": updates})
    if not r.matched_count:
        raise HTTPException(404, "Note not found")
    return {"ok": True}


@api.delete("/notes/{nid}")
async def delete_note(nid: str, cu=Depends(get_current_user)):
    r = await db.notes.delete_one({"id": nid, "userId": cu["id"]})
    if not r.deleted_count:
        raise HTTPException(404, "Note not found")
    return {"ok": True}


# ─────────────────────────── Gamification (Streaks & Badges) ───────────────────────────
BADGES = [
    {"id": "first-step", "name": "First Step", "desc": "Completed your first quiz", "icon": "🎯"},
    {"id": "on-fire-3", "name": "On Fire", "desc": "3-day streak", "icon": "🔥"},
    {"id": "week-warrior", "name": "Week Warrior", "desc": "7-day streak", "icon": "⚔️"},
    {"id": "fortnight-focus", "name": "Fortnight Focus", "desc": "14-day streak", "icon": "🎖️"},
    {"id": "monthly-master", "name": "Monthly Master", "desc": "30-day streak", "icon": "👑"},
    {"id": "curious-10", "name": "Curious Mind", "desc": "10 questions answered", "icon": "💡"},
    {"id": "half-century", "name": "Half Century", "desc": "50 questions answered", "icon": "📚"},
    {"id": "century-club", "name": "Century Club", "desc": "100 questions answered", "icon": "🏆"},
    {"id": "perfect-score", "name": "Perfect Score", "desc": "Scored 100% on any quiz", "icon": "⭐"},
    {"id": "topic-master", "name": "Topic Master", "desc": "Mastered 3+ topics", "icon": "🧠"},
]


@api.get("/gamification/me")
async def gamification(cu=Depends(get_current_user)):
    if cu["role"] != "STUDENT":
        raise HTTPException(403, "Students only")
    user = await db.users.find_one({"id": cu["id"]})
    profile = user.get("profile", {})
    streak = profile.get("streak", 0)
    longest = profile.get("longestStreak", streak)

    sessions = await db.assessment_sessions.find(
        {"studentId": cu["id"]}, {"_id": 0}
    ).to_list(500)
    completed = [s for s in sessions if s.get("status") == "COMPLETED"]
    total_qs = sum(len(s.get("responses", [])) for s in completed)
    has_perfect = any(s.get("score", 0) == 100 for s in completed)

    # Count mastered topics from topic-mastery computation
    topic_correct: Dict[str, Dict[str, int]] = {}
    for s in completed:
        for r in s.get("responses", []):
            tid = r.get("topicId")
            if not tid: continue
            a = topic_correct.setdefault(tid, {"c": 0, "n": 0})
            a["n"] += 1
            if r.get("isCorrect"): a["c"] += 1
    mastered_topics = sum(1 for v in topic_correct.values() if v["n"] > 0 and v["c"] / v["n"] >= 0.8)

    earned_ids = set()
    if len(completed) >= 1: earned_ids.add("first-step")
    if longest >= 3: earned_ids.add("on-fire-3")
    if longest >= 7: earned_ids.add("week-warrior")
    if longest >= 14: earned_ids.add("fortnight-focus")
    if longest >= 30: earned_ids.add("monthly-master")
    if total_qs >= 10: earned_ids.add("curious-10")
    if total_qs >= 50: earned_ids.add("half-century")
    if total_qs >= 100: earned_ids.add("century-club")
    if has_perfect: earned_ids.add("perfect-score")
    if mastered_topics >= 3: earned_ids.add("topic-master")

    badges = []
    for b in BADGES:
        badges.append({**b, "earned": b["id"] in earned_ids})

    return {
        "streak": streak, "longestStreak": longest,
        "totalSessions": len(completed), "totalQuestions": total_qs,
        "masteredTopics": mastered_topics,
        "badges": badges,
        "earnedCount": len(earned_ids), "totalBadges": len(BADGES),
    }


# ─────────────────────────── Parent Digest & Topic Drilldown ───────────────────────────
@api.post("/parent/send-digest")
async def send_digest_now(cu=Depends(get_current_user)):
    if cu["role"] not in ("PARENT", "ADMIN"):
        raise HTTPException(403, "Parents only")
    result = await send_parent_digest(db, cu["id"])
    if result.get("status") == "error":
        raise HTTPException(500, result.get("error", "Send failed"))
    if result.get("status") == "skipped":
        raise HTTPException(400, result.get("reason", "Unable to send"))
    return result


@api.get("/parent/digest-history")
async def digest_history(cu=Depends(get_current_user)):
    if cu["role"] != "PARENT":
        raise HTTPException(403)
    logs = await db.digest_logs.find({"parentId": cu["id"]}, {"_id": 0}).sort("sentAt", -1).to_list(20)
    return logs


@api.get("/students/{student_id}/topic-mastery")
async def student_topic_mastery(student_id: str, subject: Optional[str] = None, cu=Depends(get_current_user)):
    """Per-topic mastery drilldown: aggregates responses from assessment_sessions by topicId."""
    if cu["role"] not in ("STUDENT", "PARENT", "TEACHER", "ADMIN"):
        raise HTTPException(403)
    # Fetch all completed session responses
    sessions = await db.assessment_sessions.find(
        {"studentId": student_id}, {"_id": 0}
    ).to_list(500)
    # Fetch chapters (for topic titles + weights)
    ch_query: Dict[str, Any] = {}
    if subject: ch_query["subject"] = subject
    chapters = await db.chapters.find(ch_query, {"_id": 0}).to_list(200)

    # Build topic dictionary: topicId -> {title, subject, chapter}
    topic_meta: Dict[str, Dict[str, Any]] = {}
    for ch in chapters:
        for t in ch.get("extractedTopics", []):
            topic_meta[t["topicId"]] = {
                "topicId": t["topicId"], "title": t["title"],
                "subject": ch["subject"], "chapter": ch["title"],
                "chapterId": ch["id"], "weight": t.get("weight", 0.25),
            }

    # Aggregate by topic
    agg: Dict[str, Dict[str, Any]] = {}
    for s in sessions:
        if subject and s.get("subject") != subject:
            continue
        for r in s.get("responses", []):
            tid = r.get("topicId")
            if not tid:
                continue
            a = agg.setdefault(tid, {"attempts": 0, "correct": 0, "totalTime": 0})
            a["attempts"] += 1
            if r.get("isCorrect"):
                a["correct"] += 1
            a["totalTime"] += r.get("timeTakenSeconds", 0)

    # Combine
    out = []
    for tid, meta in topic_meta.items():
        stats = agg.get(tid, {"attempts": 0, "correct": 0, "totalTime": 0})
        mastery_pct = round((stats["correct"] / stats["attempts"]) * 100, 1) if stats["attempts"] else 0
        status = "PENDING"
        if stats["attempts"] > 0:
            status = "MASTERED" if mastery_pct >= 80 else "DEVELOPING" if mastery_pct >= 50 else "CRITICAL"
        out.append({
            **meta,
            "attempts": stats["attempts"],
            "correct": stats["correct"],
            "mastery": mastery_pct,
            "avgTimeSec": round(stats["totalTime"] / stats["attempts"], 1) if stats["attempts"] else 0,
            "status": status,
        })

    # Sort: pending last, then by mastery ascending (weak first)
    out.sort(key=lambda x: (x["status"] == "PENDING", x["mastery"]))
    return {"topics": out, "totalTopics": len(out), "attemptedTopics": sum(1 for t in out if t["attempts"] > 0)}


# ─────────────────────────── Notifications / Reminders ───────────────────────────
@api.get("/leaderboard/weekly")
async def weekly_leaderboard(cu=Depends(get_current_user)):
    """Compute this week's points per student. Scope: user's class (or grade fallback)."""
    from datetime import date, timedelta as td
    today = date.today()
    monday = today - td(days=today.weekday())
    monday_iso = monday.isoformat()

    # Find peer group: same class if set, else same grade
    user = await db.users.find_one({"id": cu["id"]})
    if not user:
        raise HTTPException(404)

    peer_query: Dict[str, Any] = {"role": "STUDENT"}
    class_name = None
    grade = None
    if user["role"] == "STUDENT":
        class_name = user.get("profile", {}).get("className")
        grade = user.get("profile", {}).get("grade")
    elif user["role"] == "TEACHER":
        class_name = user.get("profile", {}).get("className")
    elif user["role"] == "PARENT":
        child_id = user.get("profile", {}).get("childId")
        if child_id:
            child = await db.users.find_one({"id": child_id})
            if child:
                class_name = child.get("profile", {}).get("className")
                grade = child.get("profile", {}).get("grade")

    if class_name:
        peer_query["profile.className"] = class_name
    elif grade:
        peer_query["profile.grade"] = grade

    peers = await db.users.find(peer_query, {"_id": 0}).to_list(500)
    if not peers:
        return {"scope": class_name or f"Grade {grade}" or "All", "weekOf": monday_iso, "leaderboard": []}
    peer_ids = [p["id"] for p in peers]

    # Fetch this week's completed sessions
    sessions = await db.assessment_sessions.find(
        {"studentId": {"$in": peer_ids}, "status": "COMPLETED"}, {"_id": 0}
    ).to_list(2000)
    week_sessions = [s for s in sessions if (s.get("completedAt") or "")[:10] >= monday_iso]

    # Aggregate points
    board: Dict[str, Dict[str, Any]] = {p["id"]: {"studentId": p["id"], "name": p["name"], "sessions": 0, "correct": 0, "questions": 0, "totalScore": 0.0, "streak": p.get("profile", {}).get("streak", 0)} for p in peers}
    for s in week_sessions:
        e = board.get(s["studentId"])
        if not e: continue
        e["sessions"] += 1
        responses = s.get("responses", [])
        e["questions"] += len(responses)
        e["correct"] += sum(1 for r in responses if r.get("isCorrect"))
        e["totalScore"] += float(s.get("score", 0))

    for e in board.values():
        # Points: 10/session + 2/correct + score bonus + streak bonus
        avg_score = (e["totalScore"] / e["sessions"]) if e["sessions"] else 0
        e["points"] = int(e["sessions"] * 10 + e["correct"] * 2 + avg_score / 5 + e["streak"])
        e["avgScore"] = round(avg_score, 1)

    ranked = sorted(board.values(), key=lambda x: (-x["points"], -x["correct"], x["name"]))
    for i, e in enumerate(ranked):
        e["rank"] = i + 1
        e["isMe"] = e["studentId"] == cu["id"]

    return {
        "scope": class_name or (f"Grade {grade}" if grade else "All students"),
        "weekOf": monday_iso,
        "myRank": next((e["rank"] for e in ranked if e["isMe"]), None),
        "leaderboard": ranked,
    }


# ─────────────────────────── Notifications / Reminders ───────────────────────────
@api.get("/notifications/me")
async def my_notifications(cu=Depends(get_current_user)):
    """Compute in-app reminders on the fly for the current user."""
    from datetime import date, timedelta as td
    today = datetime.now(timezone.utc).date()
    reminders: List[Dict[str, Any]] = []

    if cu["role"] == "STUDENT":
        # Assignments assigned to me
        assignments = await db.assignments.find({"studentIds": cu["id"]}, {"_id": 0}).to_list(200)
        for a in assignments:
            sub = await db.assignment_submissions.find_one(
                {"assignmentId": a["id"], "studentId": cu["id"]}, {"_id": 0}
            )
            if sub and sub.get("status") == "COMPLETED":
                continue
            try:
                due = date.fromisoformat(a["dueDate"])
            except Exception:
                continue
            days_left = (due - today).days
            severity = "info"
            message = ""
            if days_left < 0:
                severity = "danger"
                message = f"Overdue by {abs(days_left)} day{'s' if abs(days_left)!=1 else ''}"
            elif days_left == 0:
                severity = "danger"
                message = "Due today"
            elif days_left == 1:
                severity = "warning"
                message = "Due tomorrow"
            elif days_left <= 3:
                severity = "info"
                message = f"Due in {days_left} days"
            else:
                continue  # not close enough to remind
            reminders.append({
                "id": f"assn:{a['id']}",
                "kind": "assignment",
                "title": a["title"],
                "message": message,
                "when": a["dueDate"],
                "severity": severity,
                "link": f"/assignments/{a['id']}/take",
            })

        # Study plan tasks scheduled today or overdue
        tasks = await db.study_plans.find(
            {"studentId": cu["id"], "status": {"$ne": "COMPLETED"}}, {"_id": 0}
        ).to_list(200)
        for t in tasks:
            try:
                d = date.fromisoformat(t["date"])
            except Exception:
                continue
            if d == today:
                reminders.append({
                    "id": f"task:{t['id']}",
                    "kind": "study-task",
                    "title": t["title"],
                    "message": f"Scheduled today • {t.get('subject', '')} • {t.get('durationMin', 0)}m",
                    "when": t["date"],
                    "severity": "info",
                    "link": "/plan",
                })
            elif d < today:
                reminders.append({
                    "id": f"task:{t['id']}",
                    "kind": "study-task",
                    "title": t["title"],
                    "message": f"Missed on {t['date']} — reschedule?",
                    "when": t["date"],
                    "severity": "warning",
                    "link": "/plan",
                })

    elif cu["role"] == "TEACHER":
        assignments = await db.assignments.find({"createdBy": cu["id"]}, {"_id": 0}).to_list(200)
        for a in assignments:
            try:
                due = date.fromisoformat(a["dueDate"])
            except Exception:
                continue
            days_left = (due - today).days
            submitted = await db.assignment_submissions.count_documents(
                {"assignmentId": a["id"], "status": "COMPLETED"}
            )
            total = len(a.get("studentIds", []))
            pct = int((submitted / total) * 100) if total else 0
            if 0 <= days_left <= 1 and pct < 60:
                reminders.append({
                    "id": f"tassn:{a['id']}",
                    "kind": "low-submission",
                    "title": a["title"],
                    "message": f"{pct}% submitted • Due {'today' if days_left == 0 else 'tomorrow'}",
                    "when": a["dueDate"],
                    "severity": "warning",
                    "link": f"/assignments/{a['id']}",
                })

    elif cu["role"] == "PARENT":
        # Child's upcoming assignments not yet submitted
        user = await db.users.find_one({"id": cu["id"]})
        child_id = user.get("profile", {}).get("childId")
        if not child_id:
            child_email = user.get("profile", {}).get("childEmail")
            child = await db.users.find_one({"email": child_email})
            child_id = child["id"] if child else None
        if child_id:
            assignments = await db.assignments.find({"studentIds": child_id}, {"_id": 0}).to_list(200)
            for a in assignments:
                sub = await db.assignment_submissions.find_one(
                    {"assignmentId": a["id"], "studentId": child_id}, {"_id": 0}
                )
                if sub and sub.get("status") == "COMPLETED":
                    continue
                try:
                    due = date.fromisoformat(a["dueDate"])
                except Exception:
                    continue
                days_left = (due - today).days
                if 0 <= days_left <= 2:
                    reminders.append({
                        "id": f"passn:{a['id']}",
                        "kind": "child-assignment",
                        "title": a["title"],
                        "message": f"Your child's assignment • Due {'today' if days_left == 0 else 'tomorrow' if days_left == 1 else 'in 2 days'}",
                        "when": a["dueDate"],
                        "severity": "info" if days_left > 0 else "warning",
                        "link": "/",
                    })

    # Sort: danger > warning > info; then by soonest when
    order = {"danger": 0, "warning": 1, "info": 2}
    reminders.sort(key=lambda r: (order.get(r["severity"], 3), r["when"]))
    return {"reminders": reminders, "count": len(reminders)}


# ─────────────────────────── Study Plan ───────────────────────────
@api.post("/study-plan/generate")
async def generate_study_plan(days: int = 7, minutes_per_day: int = 45, cu=Depends(get_current_user)):
    """Rule-based AI plan: priority = weight × (1 − mastery). Spreads top weak topics across N days."""
    if cu["role"] != "STUDENT":
        raise HTTPException(403, "Students only")
    user = await db.users.find_one({"id": cu["id"]})
    grade = user.get("profile", {}).get("grade", 10)

    # Compute per-topic mastery for this student
    sessions = await db.assessment_sessions.find({"studentId": cu["id"]}, {"_id": 0}).to_list(500)
    topic_stats: Dict[str, Dict[str, int]] = {}
    for s in sessions:
        for r in s.get("responses", []):
            tid = r.get("topicId")
            if not tid: continue
            a = topic_stats.setdefault(tid, {"c": 0, "n": 0})
            a["n"] += 1
            if r.get("isCorrect"): a["c"] += 1

    # Gather all topics for this grade with priority score
    chapters = await db.chapters.find({"grade": grade}, {"_id": 0}).to_list(200)
    candidates = []
    for ch in chapters:
        for t in ch.get("extractedTopics", []):
            tid = t["topicId"]
            stats = topic_stats.get(tid, {"c": 0, "n": 0})
            mastery = (stats["c"] / stats["n"]) if stats["n"] else 0.0
            weight = float(t.get("weight", 0.25))
            priority = weight * (1 - mastery)
            # Bonus for unattempted topics
            if stats["n"] == 0:
                priority += 0.15
            candidates.append({
                "topicId": tid, "topicTitle": t["title"],
                "chapterId": ch["id"], "chapterTitle": ch["title"],
                "subject": ch["subject"], "mastery": round(mastery * 100, 1),
                "attempts": stats["n"], "priority": round(priority, 3),
            })

    if not candidates:
        raise HTTPException(400, "No chapters found for your grade. Ask your teacher to upload some.")

    # Sort by priority descending
    candidates.sort(key=lambda x: -x["priority"])
    # Pick top items — enough to fill roughly 2-3 tasks per day
    tasks_per_day = max(1, minutes_per_day // 20)
    n_pick = min(len(candidates), days * tasks_per_day)
    picks = candidates[:n_pick]

    # Delete existing AUTO tasks (keep manual ones intact)
    await db.study_plans.delete_many({"studentId": cu["id"], "source": "AUTO"})

    # Round-robin picks across days
    from datetime import timedelta as td, date as _date
    today = _date.today()
    new_tasks = []
    for i, p in enumerate(picks):
        day = i % days
        # Alternate revision + practice
        kind = "practice" if (i // days) % 2 else "revision"
        duration = 20 if kind == "revision" else 25
        title = f"{'Practice' if kind == 'practice' else 'Review'}: {p['topicTitle']}"
        task = {
            "id": str(uuid.uuid4()), "studentId": cu["id"],
            "title": title, "subject": p["subject"],
            "durationMin": duration, "topicId": p["topicId"],
            "chapterId": p["chapterId"],
            "date": (today + td(days=day)).isoformat(),
            "status": "UPCOMING", "kind": kind,
            "source": "AUTO", "priority": p["priority"],
            "reason": f"Mastery {p['mastery']}% • Weight {int(candidates[picks.index(p)]['priority']*100)}%",
            "createdAt": _now(),
        }
        new_tasks.append(task)

    if new_tasks:
        await db.study_plans.insert_many(new_tasks)

    return {
        "generated": len(new_tasks), "days": days,
        "topFocusAreas": [{"title": p["topicTitle"], "subject": p["subject"], "mastery": p["mastery"]} for p in picks[:5]],
        "generatedAt": _now(),
    }


@api.get("/study-plan/me")
async def my_plan(cu=Depends(get_current_user)):
    tasks = await db.study_plans.find({"studentId": cu["id"]}, {"_id": 0}).sort("date", 1).to_list(200)
    return tasks


@api.post("/study-plan/{task_id}/complete")
async def complete_task(task_id: str, cu=Depends(get_current_user)):
    await db.study_plans.update_one({"id": task_id, "studentId": cu["id"]}, {"$set": {"status": "COMPLETED", "completedAt": _now()}})
    return {"ok": True}


# ─────────────────────────── Student Dashboard ───────────────────────────
@api.get("/dashboard/student")
async def student_dashboard(cu=Depends(get_current_user)):
    if cu["role"] != "STUDENT":
        raise HTTPException(403, "Students only")
    user = await db.users.find_one({"id": cu["id"]})
    mastery = await db.mastery.find({"studentId": cu["id"]}, {"_id": 0}).to_list(20)
    tasks = await db.study_plans.find({"studentId": cu["id"]}, {"_id": 0}).sort("date", 1).to_list(50)
    upcoming = await db.chapters.find({"grade": user.get("profile", {}).get("grade", 10)}, {"_id": 0}).to_list(20)
    sessions = await db.assessment_sessions.find({"studentId": cu["id"]}, {"_id": 0}).sort("startedAt", -1).to_list(20)
    # Study heatmap: last 14 days count of completed
    from collections import defaultdict
    heat = defaultdict(int)
    for s in sessions:
        if s.get("completedAt"):
            d = s["completedAt"][:10]
            heat[d] += 1
    return {
        "user": _public_user(user),
        "streak": user.get("profile", {}).get("streak", 0),
        "masteryProgress": mastery,
        "studyPlan": tasks[:10],
        "chapters": upcoming,
        "recentSessions": sessions[:5],
        "activityHeatmap": dict(heat),
    }


# ─────────────────────────── Teacher Dashboard ───────────────────────────
@api.get("/dashboard/teacher")
async def teacher_dashboard(cu=Depends(get_current_user)):
    if cu["role"] != "TEACHER":
        raise HTTPException(403, "Teachers only")
    user = await db.users.find_one({"id": cu["id"]})
    class_name = user.get("profile", {}).get("className", "")
    students = await db.users.find({"role": "STUDENT", "profile.className": class_name}, {"_id": 0}).to_list(200)
    student_ids = [s["id"] for s in students]
    # Heatmap: group students into 3 groups, aggregate mastery per topic
    all_mastery = await db.mastery.find({"studentId": {"$in": student_ids}}, {"_id": 0}).to_list(500)
    chapters = await db.chapters.find({"grade": 10}, {"_id": 0}).to_list(20)
    topics = []
    for ch in chapters[:2]:
        for t in ch.get("extractedTopics", [])[:3]:
            topics.append({"topicId": t["topicId"], "title": t["title"], "chapter": ch["title"]})
    # Fake grouping for demo
    heatmap = []
    import random
    random.seed(42)
    for gi, group in enumerate(["Group Alpha", "Group Beta", "Group Gamma"]):
        row = {"group": group, "cells": []}
        for t in topics[:6]:
            score = random.randint(35, 95)
            status = "MASTERY" if score >= 75 else "DEVELOPING" if score >= 50 else "CRITICAL"
            row["cells"].append({"topic": t["title"], "score": score, "status": status})
        heatmap.append(row)
    # Recent assignments
    recent_sessions = await db.assessment_sessions.find({"studentId": {"$in": student_ids}}, {"_id": 0}).sort("startedAt", -1).to_list(20)
    return {
        "user": _public_user(user),
        "className": class_name,
        "studentsCount": len(students),
        "activeCount": max(1, int(len(students) * 0.93)),
        "criticalGap": {"topic": "Quadratic Equations", "pct": 65, "delta": -14, "concept": "Discriminant Theory"},
        "heatmap": heatmap,
        "recentAssignments": [
            {"title": "Quadratic Problems Set B", "subject": "Mathematics", "dueDate": "Oct 24", "completion": 92, "total": 42, "submitted": 39},
            {"title": "Genetics and Heredity Quiz", "subject": "Biology", "dueDate": "Oct 22", "completion": 45, "total": 45, "submitted": 20},
            {"title": "Optics: Lens Formula Lab", "subject": "Physics", "dueDate": "Oct 20", "completion": 100, "total": 45, "submitted": 45},
        ],
        "todaySchedule": [
            {"time": "10:30 AM - 11:20 AM", "title": "10-A Mathematics", "note": "Lab: Geometric Proofs", "highlight": True},
            {"time": "12:30 PM - 01:20 PM", "title": "10-B Mathematics", "note": "Quadratic Equations Review", "highlight": False},
        ],
        "students": [{"id": s["id"], "name": s["name"], "email": s["email"]} for s in students],
    }


@api.get("/students/{student_id}/report")
async def student_report(student_id: str, cu=Depends(get_current_user)):
    if cu["role"] not in ("TEACHER", "PARENT", "ADMIN", "STUDENT"):
        raise HTTPException(403)
    student = await db.users.find_one({"id": student_id}, {"_id": 0})
    if not student: raise HTTPException(404, "Not found")
    mastery = await db.mastery.find({"studentId": student_id}, {"_id": 0}).to_list(20)
    sessions = await db.assessment_sessions.find({"studentId": student_id}, {"_id": 0}).sort("startedAt", -1).to_list(20)
    return {"student": _public_user(student), "mastery": mastery, "sessions": sessions}


# ─────────────────────────── Parent Dashboard ───────────────────────────
@api.get("/dashboard/parent")
async def parent_dashboard(cu=Depends(get_current_user)):
    if cu["role"] != "PARENT":
        raise HTTPException(403, "Parents only")
    user = await db.users.find_one({"id": cu["id"]})
    child_id = user.get("profile", {}).get("childId")
    if not child_id:
        child_email = user.get("profile", {}).get("childEmail")
        child = await db.users.find_one({"email": child_email})
        child_id = child["id"] if child else None
    if not child_id:
        raise HTTPException(400, "No child linked")
    child = await db.users.find_one({"id": child_id}, {"_id": 0})
    mastery = await db.mastery.find({"studentId": child_id}, {"_id": 0}).to_list(20)
    sessions = await db.assessment_sessions.find({"studentId": child_id}, {"_id": 0}).sort("startedAt", -1).to_list(20)
    # Weekly digest
    total_hours = 8
    retention = 84
    predicted_low = 88
    predicted_high = 94
    # Compute predicted from mastery avg
    if mastery:
        avg = sum(m["score"] for m in mastery) / len(mastery)
        predicted_low = int(max(0, avg - 5))
        predicted_high = int(min(100, avg + 5))
    # Radar chart
    subjects = ["Math", "Science", "Social Studies", "English", "Hindi"]
    radar = []
    for s in subjects:
        subj_key = s if s != "Math" else "Mathematics"
        m = next((mm for mm in mastery if mm["subject"] == subj_key), None)
        radar.append({"subject": s, "aarav": m["score"] if m else 60, "classAvg": max(40, (m["score"] if m else 60) - 10)})
    # Priority topic
    lowest = min(mastery, key=lambda x: x["score"]) if mastery else None
    return {
        "user": _public_user(user),
        "child": _public_user(child),
        "week": 42,
        "activeHours": total_hours,
        "masteryDeltaSubject": "Science",
        "masteryDelta": 12,
        "knowledgeRetention": retention,
        "predictedRange": [predicted_low, predicted_high],
        "radar": radar,
        "priorityAction": {"topic": "Reflection of Light", "reason": "Needs support"} if lowest else None,
        "topicFocus": [
            {"title": "Quadratic Equations", "subject": "Mathematics", "meta": "Next Quiz Tomorrow", "kind": "next"},
            {"title": "Rise of Nationalism", "subject": "Social Studies", "meta": "Mastered", "kind": "done"},
        ],
        "recentActivity": [
            {"title": f"Completed session on {s.get('chapterTitle','chapter')}", "meta": f"Scored {s.get('score', 0)}%", "when": s.get("completedAt", s.get("startedAt", ""))[:10]}
            for s in sessions[:4] if s.get("status") == "COMPLETED"
        ],
        "masteryProgress": mastery,
    }


# ─────────────────────────── Admin ───────────────────────────
@api.get("/admin/stats")
async def admin_stats(cu=Depends(get_current_user)):
    if cu["role"] != "ADMIN":
        raise HTTPException(403)
    return {
        "users": await db.users.count_documents({}),
        "students": await db.users.count_documents({"role": "STUDENT"}),
        "teachers": await db.users.count_documents({"role": "TEACHER"}),
        "chapters": await db.chapters.count_documents({}),
        "questions": await db.questions.count_documents({}),
        "flagged": await db.questions.count_documents({"flagged": True}),
        "sessions": await db.assessment_sessions.count_documents({}),
    }


# ─────────────────────────── Root ───────────────────────────
@api.get("/")
async def root():
    return {"service": "Project Vidya", "status": "ok"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware, allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"], allow_headers=["*"],
)


@app.on_event("startup")
async def _seed():
    try:
        await seed_all(db)
    except Exception as e:
        logger.warning(f"Seed skipped: {e}")
    # Weekly parent digest scheduler (Mon 08:00 UTC)
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
        scheduler = AsyncIOScheduler(timezone="UTC")

        async def _weekly_job():
            try:
                if not os.environ.get("RESEND_API_KEY"):
                    logger.info("[digest] Skipping weekly run — RESEND_API_KEY not set")
                    return
                await send_all_parent_digests(db)
            except Exception as e:
                logger.exception(f"weekly digest failed: {e}")

        scheduler.add_job(_weekly_job, CronTrigger(day_of_week="mon", hour=8, minute=0))
        scheduler.start()
        app.state.scheduler = scheduler
        logger.info("Weekly parent digest scheduler started (Mon 08:00 UTC)")
    except Exception as e:
        logger.warning(f"Scheduler init failed: {e}")


@app.on_event("shutdown")
async def _shutdown():
    try:
        sch = getattr(app.state, "scheduler", None)
        if sch: sch.shutdown(wait=False)
    except Exception: pass
    client.close()
