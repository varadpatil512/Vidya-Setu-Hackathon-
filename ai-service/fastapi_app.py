"""
FastAPI implementation of Vidya-Setu AI Service.
Run with: uvicorn fastapi_app:app --host 0.0.0.0 --port 8000
"""

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    class FastAPI:
        def __init__(self, **kwargs): pass
        def add_middleware(self, *args, **kwargs): pass
        def get(self, *args, **kwargs): return lambda fn: fn
        def post(self, *args, **kwargs): return lambda fn: fn
    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str): super().__init__(detail)
    class CORSMiddleware: pass
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items(): setattr(self, k, v)

from typing import List, Dict, Any, Optional
import os
from main import generate_mock_questions, generate_llm_questions, score_mock_interview, call_openai_json

if not FASTAPI_AVAILABLE:
    print("[Python AI Service] WARNING: 'fastapi' or 'pydantic' module is not installed in current Python environment.")
    print("[Python AI Service] TIP: Run 'python3 main.py' to use the zero-dependency built-in HTTP server, or install dependencies via 'pip install -r requirements.txt'.")

app = FastAPI(title="Vidya-Setu Python AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionGenRequest(BaseModel):
    course: Dict[str, Any]
    submission: Dict[str, Any]
    questionCount: Optional[int] = 2

class AnswerItem(BaseModel):
    question: str
    answer: str

class ScoreRequest(BaseModel):
    course: Dict[str, Any]
    submission: Dict[str, Any]
    answers: List[AnswerItem]

@app.get("/health")
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "python-ai-orchestration-service (FastAPI)",
        "version": "1.0.0"
    }

@app.post("/api/generate-questions")
def generate_questions(req: QuestionGenRequest):
    try:
        q_count = req.questionCount or 2
        questions, generated_by = generate_llm_questions(req.course, req.submission, question_count=q_count)
        return {
            "questions": questions,
            "generatedBy": generated_by
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/score-interview")
def score_interview(req: ScoreRequest):
    try:
        answers_dict = [{"question": a.question, "answer": a.answer} for a in req.answers]
        ai_res = call_openai_json(
            "You are an AI grader. Compare student interview answers against their code/text submission. Return JSON: {\"consistency\": 0.0-1.0, \"confidence\": 0.0-1.0, \"verdict\": \"VERIFY\" or \"FLAG\", \"qualityScore\": 0-100, \"reasoning\": \"...\", \"feedback\": \"...\"}",
            f"Submission: {req.submission.get('code') or req.submission.get('text')}\nAnswers: {answers_dict}"
        )
        if ai_res and 'verdict' in ai_res:
            return {
                "consistency": float(ai_res.get('consistency', 0.8)),
                "confidence": float(ai_res.get('confidence', 0.8)),
                "verdict": "VERIFY" if ai_res.get('verdict') == "VERIFY" else "FLAG",
                "qualityScore": int(ai_res.get('qualityScore', 80)),
                "reasoning": str(ai_res.get('reasoning', '')),
                "feedback": str(ai_res.get('feedback', '')),
                "scoredBy": "python-ai-service (fastapi + openai)"
            }
        
        score_res = score_mock_interview(req.course, req.submission, answers_dict)
        return score_res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
