"""Gemini 3 Flash AI service for PDF extraction and question generation."""
import os
import json
import uuid
import re
from typing import List, Dict, Any
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
MODEL_PROVIDER = "gemini"
MODEL_NAME = "gemini-3-flash-preview"


def _extract_json(text: str) -> Any:
    """Extract JSON from LLM response - handles markdown code fences."""
    # Try direct parse
    try:
        return json.loads(text)
    except Exception:
        pass
    # Strip markdown fences
    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    # Try to find first { or [
    for start_char, end_char in [("[", "]"), ("{", "}")]:
        s = text.find(start_char)
        e = text.rfind(end_char)
        if s != -1 and e != -1 and e > s:
            try:
                return json.loads(text[s : e + 1])
            except Exception:
                continue
    raise ValueError(f"Could not parse JSON from LLM response: {text[:200]}")


async def extract_chapter_from_pdf(pdf_path: str, grade: int, subject: str) -> Dict[str, Any]:
    """Use Gemini to read PDF and return structured topics."""
    system = (
        "You are an expert CBSE curriculum analyst. Given a chapter PDF, extract a structured "
        "outline aligned with NCERT. Return STRICT JSON only."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"extract-{uuid.uuid4()}",
        system_message=system,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)

    pdf_file = FileContentWithMimeType(file_path=pdf_path, mime_type="application/pdf")
    prompt = (
        f"Analyze this Grade {grade} {subject} CBSE chapter PDF. "
        "Return JSON with keys: chapterTitle (string), chapterNumber (int, best guess or 1), "
        "topics (array of 3-6 objects each with: topicId (kebab-case slug), title (string), "
        "contentChunk (2-4 sentence summary of the topic's key concepts)). "
        "Return ONLY the JSON object, no prose."
    )
    resp = await chat.send_message(UserMessage(text=prompt, file_contents=[pdf_file]))
    data = _extract_json(resp)
    # Normalize
    if not isinstance(data, dict):
        raise ValueError("Extraction did not return an object")
    data.setdefault("chapterTitle", "Untitled Chapter")
    data.setdefault("chapterNumber", 1)
    data.setdefault("topics", [])
    return data


async def generate_questions_for_topic(
    chapter_title: str, subject: str, grade: int, topic: Dict[str, Any], count: int = 6
) -> List[Dict[str, Any]]:
    """Generate MCQ/SA/LA questions for a topic. Returns list of question dicts."""
    system = (
        "You are an expert CBSE question paper setter. Generate NCERT-aligned questions with "
        "high pedagogical quality. Return STRICT JSON only, no prose."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"qgen-{uuid.uuid4()}",
        system_message=system,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)

    prompt = f"""Generate {count} exam questions for Grade {grade} {subject}, Chapter: "{chapter_title}", Topic: "{topic.get('title')}".
Topic summary: {topic.get('contentChunk', '')}

Mix of question types: {max(3, count-3)} MCQs, 2 SA (short answer, 2-3 marks), 1 LA (long answer, 5 marks).
Tag each with Bloom's Taxonomy level (Remembering, Understanding, Applying, or Analyzing).
Assign difficultyLevel between 0.2 (easy) and 0.9 (hard).

Return JSON array. Each item MUST have:
- type: "MCQ" | "SA" | "LA"
- questionText: string
- bloomsTaxonomy: one of the 4 levels
- difficultyLevel: float 0-1
- explanation: string (step-by-step solution or rationale)
For MCQ only: options (array of 4 objects with optionId 1-4 and text), correctOptionId (1-4).
For SA/LA: sampleAnswer (string, the model answer aligned with CBSE marking scheme).

Return ONLY the JSON array."""
    resp = await chat.send_message(UserMessage(text=prompt))
    data = _extract_json(resp)
    if not isinstance(data, list):
        raise ValueError("Questions response was not a list")
    return data


async def generate_key_points_for_chapter(chapter: Dict[str, Any]) -> Dict[str, List[str]]:
    """For each topic in the chapter, return 5-7 concise bullet key points via Gemini.

    Returns: {topicId: [bullet1, bullet2, ...]}
    """
    topics = chapter.get("extractedTopics", []) or []
    if not topics:
        return {}

    topics_block = "\n".join(
        f"- topicId: {t['topicId']}\n  title: {t['title']}\n  summary: {t.get('contentChunk', '')}"
        for t in topics
    )
    system = (
        "You are an expert CBSE tutor creating concise revision notes. "
        "Produce clear, NCERT-aligned bullet points that a student can skim before a quiz. "
        "Return STRICT JSON only."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"keypoints-{uuid.uuid4()}",
        system_message=system,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)

    prompt = (
        f"Grade {chapter.get('grade')} {chapter.get('subject')} · Chapter: \"{chapter.get('title')}\".\n\n"
        f"For every topic below, produce 5-7 short, self-contained bullet points that capture the "
        f"most important facts, formulas, definitions and examples. Each bullet should be 1 sentence, "
        f"<= 22 words, NCERT-aligned, and standalone (no 'this' / 'that' references).\n\n"
        f"Topics:\n{topics_block}\n\n"
        f"Return JSON of the exact shape: "
        f'{{ "topics": [ {{ "topicId": "<id>", "keyPoints": ["...","..."] }} ] }} '
        f"Return ONLY the JSON, no prose."
    )
    resp = await chat.send_message(UserMessage(text=prompt))
    data = _extract_json(resp)
    result: Dict[str, List[str]] = {}
    if isinstance(data, dict) and isinstance(data.get("topics"), list):
        for item in data["topics"]:
            tid = item.get("topicId")
            pts = item.get("keyPoints") or []
            if tid and isinstance(pts, list):
                result[tid] = [str(p).strip() for p in pts if str(p).strip()]
    return result
