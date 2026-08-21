"""
FastAPI implementation of Vidya-Setu AI Service.
Run with: uvicorn fastapi_app:app --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from main import generate_mock_questions, score_mock_interview, call_openai_json

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
    ai_res = call_openai_json(
        "You are an AI examiner generating 5 dynamic viva questions based on a student's submission to verify genuine understanding and authorship. Return JSON: {\"questions\": [\"...\"]}",
        f"Course: {req.course.get('title')}\nSubmission:\n{req.submission.get('code') or req.submission.get('text')}"
    )
    if ai_res and isinstance(ai_res.get('questions'), list):
        return {
            "questions": ai_res['questions'][:5],
            "generatedBy": "python-ai-service (fastapi + openai)"
        }
    
    qs = generate_mock_questions(req.course, req.submission)
    return {
        "questions": qs,
        "generatedBy": "python-ai-service (fastapi)"
    }

@app.post("/api/score-interview")
def score_interview(req: ScoreRequest):
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
