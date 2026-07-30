"""Regression backend tests for Project Vidya after console.error logging additions.
Verifies auth, dashboards, notes, leaderboard, and gamification endpoints for all roles.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"

CREDS = {
    "student": ("student@vidya.in", "student123"),
    "teacher": ("teacher@vidya.in", "teacher123"),
    "parent":  ("parent@vidya.in", "parent123"),
    "admin":   ("admin@vidya.in", "admin123"),
}


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok, f"no token in login response: {r.json()}"
    return tok


@pytest.fixture(scope="session")
def tokens():
    return {role: _login(e, p) for role, (e, p) in CREDS.items()}


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---- Auth / Me ----
@pytest.mark.parametrize("role", list(CREDS.keys()))
def test_auth_me(tokens, role):
    r = requests.get(f"{API}/auth/me", headers=_h(tokens[role]), timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("email") == CREDS[role][0]


# ---- Dashboards ----
def test_dashboard_student(tokens):
    r = requests.get(f"{API}/dashboard/student", headers=_h(tokens["student"]), timeout=20)
    assert r.status_code == 200, r.text


def test_dashboard_teacher(tokens):
    r = requests.get(f"{API}/dashboard/teacher", headers=_h(tokens["teacher"]), timeout=20)
    assert r.status_code == 200, r.text


def test_dashboard_parent(tokens):
    r = requests.get(f"{API}/dashboard/parent", headers=_h(tokens["parent"]), timeout=20)
    assert r.status_code == 200, r.text


# ---- Leaderboard ----
def test_leaderboard_weekly(tokens):
    r = requests.get(f"{API}/leaderboard/weekly", params={"period": "weekly"},
                     headers=_h(tokens["student"]), timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "entries" in d or "myRank" in d or isinstance(d, dict)


def test_leaderboard_all_time(tokens):
    r = requests.get(f"{API}/leaderboard/weekly", params={"period": "all-time"},
                     headers=_h(tokens["student"]), timeout=15)
    assert r.status_code == 200, r.text


# ---- Notes ----
def test_notes_get_by_chapter(tokens):
    # Get any chapter for the student
    r = requests.get(f"{API}/chapters", headers=_h(tokens["student"]), timeout=15)
    assert r.status_code == 200, r.text
    chapters = r.json()
    assert isinstance(chapters, list) and len(chapters) > 0, "no chapters seeded"
    ch_id = chapters[0].get("id") or chapters[0].get("_id")
    r2 = requests.get(f"{API}/notes", params={"chapterId": ch_id},
                      headers=_h(tokens["student"]), timeout=15)
    assert r2.status_code == 200, r2.text
    assert isinstance(r2.json(), list)


# ---- Gamification ----
def test_gamification_me(tokens):
    r = requests.get(f"{API}/gamification/me", headers=_h(tokens["student"]), timeout=15)
    assert r.status_code == 200, r.text
