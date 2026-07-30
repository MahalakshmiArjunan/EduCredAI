"""Seed demo data: users, chapters, questions."""
import os
import uuid
from datetime import datetime, timezone, timedelta
from auth import hash_password


def _now():
    return datetime.now(timezone.utc).isoformat()


async def seed_all(db):
    # Users
    users_col = db["users"]
    if await users_col.count_documents({}) > 0:
        return  # Already seeded

    teacher_id = str(uuid.uuid4())
    student_id = str(uuid.uuid4())
    student8_id = str(uuid.uuid4())
    parent_id = str(uuid.uuid4())
    admin_id = str(uuid.uuid4())

    users = [
        {
            "id": teacher_id,
            "role": "TEACHER",
            "name": "Priya Sharma",
            "email": "teacher@vidya.in",
            "passwordHash": hash_password("teacher123"),
            "profile": {"school": "Delhi Public School", "subject": "Mathematics", "className": "10-A"},
            "createdAt": _now(),
        },
        {
            "id": student_id,
            "role": "STUDENT",
            "name": "Aarav Sharma",
            "email": "student@vidya.in",
            "passwordHash": hash_password("student123"),
            "profile": {
                "grade": 10,
                "school": "Delhi Public School",
                "parentEmail": "parent@vidya.in",
                "teacherIds": [teacher_id],
                "className": "10-A",
                "streak": 5,
            },
            "createdAt": _now(),
        },
        {
            "id": student8_id,
            "role": "STUDENT",
            "name": "Isha Verma",
            "email": "student8@vidya.in",
            "passwordHash": hash_password("student123"),
            "profile": {
                "grade": 8,
                "school": "Delhi Public School",
                "parentEmail": "",
                "teacherIds": [teacher_id],
                "className": "8-A",
                "streak": 2,
            },
            "createdAt": _now(),
        },
        {
            "id": parent_id,
            "role": "PARENT",
            "name": "Rajesh Sharma",
            "email": "parent@vidya.in",
            "passwordHash": hash_password("parent123"),
            "profile": {"childEmail": "student@vidya.in", "childId": student_id},
            "createdAt": _now(),
        },
        {
            "id": admin_id,
            "role": "ADMIN",
            "name": "System Admin",
            "email": "admin@vidya.in",
            "passwordHash": hash_password("admin123"),
            "profile": {},
            "createdAt": _now(),
        },
    ]
    await users_col.insert_many(users)

    # Chapters + topics
    chapters_col = db["chapters"]
    questions_col = db["questions"]

    chapters_data = [
        {
            "grade": 10,
            "subject": "Science",
            "chapterNumber": 10,
            "title": "Light – Reflection and Refraction",
            "topics": [
                {"topicId": "reflection-laws", "title": "Laws of Reflection", "contentChunk": "The angle of incidence equals the angle of reflection. Incident ray, reflected ray, and normal lie in the same plane.", "weight": 0.2},
                {"topicId": "spherical-mirrors", "title": "Spherical Mirrors", "contentChunk": "Concave and convex mirrors, principal focus, focal length, mirror formula 1/v + 1/u = 1/f.", "weight": 0.35},
                {"topicId": "refraction", "title": "Refraction of Light", "contentChunk": "Bending of light at interface, Snell's law, refractive index.", "weight": 0.25},
                {"topicId": "lenses", "title": "Spherical Lenses", "contentChunk": "Convex and concave lenses, lens formula, power of a lens in dioptres.", "weight": 0.2},
            ],
        },
        {
            "grade": 10,
            "subject": "Mathematics",
            "chapterNumber": 4,
            "title": "Quadratic Equations",
            "topics": [
                {"topicId": "std-form", "title": "Standard Form", "contentChunk": "ax² + bx + c = 0 where a ≠ 0. Identifying quadratic equations.", "weight": 0.15},
                {"topicId": "factorisation", "title": "Solving by Factorisation", "contentChunk": "Splitting the middle term to find roots.", "weight": 0.25},
                {"topicId": "quadratic-formula", "title": "Quadratic Formula", "contentChunk": "x = (-b ± √(b² − 4ac)) / 2a. Discriminant analysis.", "weight": 0.3},
                {"topicId": "discriminant", "title": "Nature of Roots", "contentChunk": "Discriminant D = b² − 4ac decides whether roots are real & distinct, equal, or complex.", "weight": 0.3},
            ],
        },
        {
            "grade": 10,
            "subject": "Social Studies",
            "chapterNumber": 1,
            "title": "The Rise of Nationalism in Europe",
            "topics": [
                {"topicId": "french-rev", "title": "French Revolution & Nationalism", "contentChunk": "Ideas of nation, la patrie, le citoyen; symbols of new France.", "weight": 0.4},
                {"topicId": "unification", "title": "Unification of Germany & Italy", "contentChunk": "Otto von Bismarck and Giuseppe Garibaldi in 19th-century Europe.", "weight": 0.35},
                {"topicId": "balkan", "title": "The Balkan Question", "contentChunk": "Nationalism in the Balkans leading up to WWI.", "weight": 0.25},
            ],
        },
        {
            "grade": 8,
            "subject": "Science",
            "chapterNumber": 9,
            "title": "Force and Laws of Motion",
            "topics": [
                {"topicId": "g8-force", "title": "Understanding Force", "contentChunk": "A push or pull on an object; balanced vs unbalanced forces.", "weight": 0.3},
                {"topicId": "g8-newton-1", "title": "Newton's First Law", "contentChunk": "An object remains at rest or in uniform motion unless acted upon by an external force (inertia).", "weight": 0.35},
                {"topicId": "g8-newton-2", "title": "Newton's Second Law", "contentChunk": "F = ma. The acceleration of an object depends on force applied and its mass.", "weight": 0.35},
            ],
        },
        {
            "grade": 8,
            "subject": "Mathematics",
            "chapterNumber": 2,
            "title": "Linear Equations in One Variable",
            "topics": [
                {"topicId": "g8-linear-basic", "title": "Solving Linear Equations", "contentChunk": "An equation of the form ax + b = 0. Isolate the variable using inverse operations.", "weight": 0.5},
                {"topicId": "g8-word-problems", "title": "Word Problems", "contentChunk": "Translate real-life situations into linear equations and solve for the unknown.", "weight": 0.5},
            ],
        },
    ]

    for chdata in chapters_data:
        chapter_id = str(uuid.uuid4())
        chapter_doc = {
            "id": chapter_id,
            "grade": chdata["grade"],
            "subject": chdata["subject"],
            "chapterNumber": chdata["chapterNumber"],
            "title": chdata["title"],
            "sourceFileUrl": None,
            "extractedTopics": chdata["topics"],
            "uploadedBy": teacher_id,
            "createdAt": _now(),
        }
        await chapters_col.insert_one(chapter_doc)

        # Seed some manual questions for each topic
        for topic in chdata["topics"]:
            sample_qs = _sample_questions(chdata["subject"], chdata["title"], topic, chapter_id)
            if sample_qs:
                await questions_col.insert_many(sample_qs)

    # Seed some assessment sessions & mastery for student
    mastery_col = db["mastery"]
    mastery_docs = [
        {"studentId": student_id, "subject": "Science", "score": 72, "level": "Level 3 Mastery", "updatedAt": _now()},
        {"studentId": student_id, "subject": "Mathematics", "score": 85, "level": "Expert Level", "updatedAt": _now()},
        {"studentId": student_id, "subject": "English", "score": 90, "level": "Distinction", "updatedAt": _now()},
        {"studentId": student_id, "subject": "Social Studies", "score": 100, "level": "Completed", "updatedAt": _now()},
        {"studentId": student_id, "subject": "Hindi", "score": 68, "level": "Level 2 Mastery", "updatedAt": _now()},
    ]
    await mastery_col.insert_many(mastery_docs)

    # Study plan
    plan_col = db["study_plans"]
    today = datetime.now(timezone.utc)
    tasks = []
    for i, (title, subject, dur, topic_id) in enumerate([
        ("Review Reflection of Light", "Science", 15, "reflection-laws"),
        ("Quadratic Equations Practice", "Mathematics", 45, "quadratic-formula"),
        ("Nationalism Timeline", "Social Studies", 20, "unification"),
        ("Lens Formula Drill", "Science", 25, "lenses"),
        ("Discriminant Word Problems", "Mathematics", 30, "discriminant"),
    ]):
        tasks.append({
            "id": str(uuid.uuid4()),
            "studentId": student_id,
            "title": title,
            "subject": subject,
            "durationMin": dur,
            "topicId": topic_id,
            "date": (today + timedelta(days=i)).date().isoformat(),
            "status": "UPCOMING",
        })
    await plan_col.insert_many(tasks)

    print(f"[seed] Created {len(users)} users, {len(chapters_data)} chapters, {len(tasks)} tasks")


def _sample_questions(subject, chapter_title, topic, chapter_id):
    """Return a small pool of seed questions per topic."""
    import uuid as _u
    now = _now()
    base = {"chapterId": chapter_id, "topicId": topic["topicId"], "createdAt": now, "flagged": False}

    if topic["topicId"] == "reflection-laws":
        return [
            {"id": str(_u.uuid4()), **base, "type": "MCQ", "difficultyLevel": 0.3, "bloomsTaxonomy": "Remembering",
             "questionText": "The angle of incidence is always equal to the:",
             "options": [{"optionId": 1, "text": "Angle of refraction"}, {"optionId": 2, "text": "Angle of reflection"},
                          {"optionId": 3, "text": "Angle of deviation"}, {"optionId": 4, "text": "Critical angle"}],
             "correctOptionId": 2, "explanation": "By the second law of reflection, angle of incidence = angle of reflection."},
            {"id": str(_u.uuid4()), **base, "type": "MCQ", "difficultyLevel": 0.5, "bloomsTaxonomy": "Understanding",
             "questionText": "Which of the following is a virtual, erect and diminished image?",
             "options": [{"optionId": 1, "text": "Image by concave mirror when object at F"}, {"optionId": 2, "text": "Image by plane mirror"},
                          {"optionId": 3, "text": "Image by convex mirror"}, {"optionId": 4, "text": "Image by concave mirror at C"}],
             "correctOptionId": 3, "explanation": "A convex mirror always forms a virtual, erect, and diminished image."},
        ]
    if topic["topicId"] == "spherical-mirrors":
        return [
            {"id": str(_u.uuid4()), **base, "type": "MCQ", "difficultyLevel": 0.65, "bloomsTaxonomy": "Applying",
             "questionText": "A concave mirror produces a real image of size equal to the object. The position of the object is:",
             "options": [{"optionId": 1, "text": "At Focus F"}, {"optionId": 2, "text": "At Center of Curvature C"},
                          {"optionId": 3, "text": "Between F and C"}, {"optionId": 4, "text": "Beyond C"}],
             "correctOptionId": 2, "explanation": "When the object is placed at C, the image is real, inverted, and of same size at C."},
            {"id": str(_u.uuid4()), **base, "type": "SA", "difficultyLevel": 0.55, "bloomsTaxonomy": "Understanding",
             "questionText": "State the mirror formula and explain each term.",
             "sampleAnswer": "1/v + 1/u = 1/f, where v is image distance, u is object distance, f is focal length.",
             "explanation": "Follows New Cartesian sign convention."},
        ]
    if topic["topicId"] == "quadratic-formula":
        return [
            {"id": str(_u.uuid4()), **base, "type": "MCQ", "difficultyLevel": 0.4, "bloomsTaxonomy": "Applying",
             "questionText": "The roots of x² − 5x + 6 = 0 are:",
             "options": [{"optionId": 1, "text": "2 and 3"}, {"optionId": 2, "text": "-2 and -3"},
                          {"optionId": 3, "text": "1 and 6"}, {"optionId": 4, "text": "-1 and -6"}],
             "correctOptionId": 1, "explanation": "Factorising: (x-2)(x-3) = 0, so x = 2 or 3."},
            {"id": str(_u.uuid4()), **base, "type": "MCQ", "difficultyLevel": 0.7, "bloomsTaxonomy": "Analyzing",
             "questionText": "For what value of k does 2x² + kx + 3 = 0 have equal roots?",
             "options": [{"optionId": 1, "text": "±√24"}, {"optionId": 2, "text": "±2√6"},
                          {"optionId": 3, "text": "Both A and B"}, {"optionId": 4, "text": "±6"}],
             "correctOptionId": 3, "explanation": "For equal roots D = 0: k² = 24, so k = ±√24 = ±2√6."},
        ]
    if topic["topicId"] == "discriminant":
        return [
            {"id": str(_u.uuid4()), **base, "type": "MCQ", "difficultyLevel": 0.5, "bloomsTaxonomy": "Understanding",
             "questionText": "If D = b² − 4ac < 0, the roots are:",
             "options": [{"optionId": 1, "text": "Real and equal"}, {"optionId": 2, "text": "Real and distinct"},
                          {"optionId": 3, "text": "Not real (complex)"}, {"optionId": 4, "text": "Rational"}],
             "correctOptionId": 3, "explanation": "D < 0 implies no real roots — the roots are complex conjugates."},
        ]
    if topic["topicId"] == "unification":
        return [
            {"id": str(_u.uuid4()), **base, "type": "MCQ", "difficultyLevel": 0.4, "bloomsTaxonomy": "Remembering",
             "questionText": "Who is known as the architect of German unification?",
             "options": [{"optionId": 1, "text": "Otto von Bismarck"}, {"optionId": 2, "text": "Giuseppe Mazzini"},
                          {"optionId": 3, "text": "Napoleon III"}, {"optionId": 4, "text": "Kaiser Wilhelm I"}],
             "correctOptionId": 1, "explanation": "Bismarck engineered unification via three wars (1864, 1866, 1870-71)."},
        ]
    if topic["topicId"] == "g8-force":
        return [
            {"id": str(_u.uuid4()), **base, "type": "MCQ", "difficultyLevel": 0.3, "bloomsTaxonomy": "Remembering",
             "questionText": "A force can:",
             "options": [{"optionId": 1, "text": "Only change the direction of motion"}, {"optionId": 2, "text": "Only change the speed"},
                          {"optionId": 3, "text": "Change the speed, direction, or shape of an object"}, {"optionId": 4, "text": "Do nothing to an object"}],
             "correctOptionId": 3, "explanation": "A force is capable of changing motion, direction, or the shape of an object."},
        ]
    if topic["topicId"] == "g8-newton-1":
        return [
            {"id": str(_u.uuid4()), **base, "type": "MCQ", "difficultyLevel": 0.45, "bloomsTaxonomy": "Understanding",
             "questionText": "Newton's first law is also known as the law of:",
             "options": [{"optionId": 1, "text": "Momentum"}, {"optionId": 2, "text": "Inertia"},
                          {"optionId": 3, "text": "Gravitation"}, {"optionId": 4, "text": "Action-reaction"}],
             "correctOptionId": 2, "explanation": "Objects resist change in their state of motion — this property is called inertia."},
        ]
    if topic["topicId"] == "g8-newton-2":
        return [
            {"id": str(_u.uuid4()), **base, "type": "MCQ", "difficultyLevel": 0.55, "bloomsTaxonomy": "Applying",
             "questionText": "A 2 kg object accelerates at 3 m/s². The net force on it is:",
             "options": [{"optionId": 1, "text": "1.5 N"}, {"optionId": 2, "text": "5 N"},
                          {"optionId": 3, "text": "6 N"}, {"optionId": 4, "text": "9 N"}],
             "correctOptionId": 3, "explanation": "F = m×a = 2 × 3 = 6 N."},
        ]
    if topic["topicId"] == "g8-linear-basic":
        return [
            {"id": str(_u.uuid4()), **base, "type": "MCQ", "difficultyLevel": 0.35, "bloomsTaxonomy": "Applying",
             "questionText": "Solve for x: 3x + 5 = 20",
             "options": [{"optionId": 1, "text": "3"}, {"optionId": 2, "text": "5"},
                          {"optionId": 3, "text": "7"}, {"optionId": 4, "text": "15"}],
             "correctOptionId": 2, "explanation": "3x = 20 − 5 = 15, so x = 5."},
        ]
    return []
