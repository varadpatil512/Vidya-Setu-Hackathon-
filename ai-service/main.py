import os
import json
import urllib.request
import urllib.error
import re
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = int(os.environ.get("PYTHON_AI_PORT", 8000))
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

STOP_WORDS = set([
    'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'is', 'are', 'was', 'it', 'i', 
    'you', 'my', 'your', 'this', 'that', 'with', 'as', 'at', 'be', 'have', 'has', 'do', 'does', 
    'would', 'will', 'can', 'could', 'should', 'if', 'then', 'else', 'not', 'but', 'from', 'by', 'so', 'we', 'they'
])

def extract_words(text):
    return re.findall(r'[a-zA-Z0-9_$]+', str(text or '').lower())

def extract_code_facts(code):
    fns = re.findall(r'function\s+([A-Za-z_$][\w$]*)', str(code))
    arrow_fns = re.findall(r'(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[\w$]+)\s*=>', str(code))
    names = list(set(fns + arrow_fns))
    has_loops = bool(re.search(r'(for|while)\s*\(', str(code)))
    has_map = '.map(' in str(code)
    has_cond = bool(re.search(r'(if|switch|\?)', str(code)))
    return {
        "names": names,
        "loops": has_loops,
        "usesMap": has_map,
        "usesCond": has_cond,
        "lines": len(str(code).split('\n'))
    }

def generate_mock_questions(course, submission):
    qs = []
    sub_type = submission.get('type', 'code')
    source = submission.get('code', '') if sub_type == 'code' else submission.get('text', '')
    
    if sub_type == 'code':
        facts = extract_code_facts(source)
        names = facts['names']
        if names:
            qs.append(f"Walk me through what your function `{names[0]}` does, step by step from input to return value.")
            if len(names) > 1:
                qs.append(f"Why did you separate the logic into `{names[0]}` and `{names[1]}` instead of combining them?")
        else:
            qs.append("Explain the overall architectural design of your code submission.")
        
        if facts['loops']:
            qs.append("You used iteration/loops in your code. What invariant holds true on each loop iteration?")
        if facts['usesMap']:
            qs.append("Where is `.map()` utilized in your submission, and how would array mutation differ if you used a standard loop?")
        if facts['usesCond']:
            qs.append("Describe a edge case input where your conditional branching handles an exception.")
        qs.append("If performance constraints required O(1) space complexity, what changes would you make?")
    else:
        first_sentence = str(source).split('.')[0].strip() if source else "your thesis"
        qs.append(f"Your submission states: '{first_sentence[:100]}...' — defend this premise with specific examples.")
        qs.append("What alternative approach did you evaluate and discard during this assignment?")
        qs.append("Which core principle from the course modules directly influenced your solution design?")
        qs.append("If an auditor challenged the weakest assertion in your text, how would you defend it?")
    
    qs.append("Finally: in one sentence, what is the single biggest limitation of your current submission?")
    question_count = course.get('assignment', {}).get('questionCount', 5)
    return qs[:question_count]

def score_mock_interview(course, submission, answers):
    sub_type = submission.get('type', 'code')
    source = submission.get('code', '') if sub_type == 'code' else submission.get('text', '')
    paste_events = submission.get('pasteEvents', 0)
    
    source_words = set(extract_words(source))
    
    answer_scores = []
    for qa in answers:
        ans_text = qa.get('answer', '')
        words = [w for w in extract_words(ans_text) if w not in STOP_WORDS]
        if not words:
            answer_scores.append(0.0)
            continue
        
        length_score = min(1.0, len(words) / 20.0)
        overlap_count = sum(1 for w in words if w in source_words)
        overlap_score = overlap_count / len(words)
        
        score = (0.4 * length_score) + (0.6 * overlap_score)
        answer_scores.append(min(1.0, score))
    
    avg_score = sum(answer_scores) / len(answer_scores) if answer_scores else 0.0
    paste_penalty = min(0.3, paste_events * 0.1)
    
    consistency = max(0.0, min(1.0, avg_score - paste_penalty))
    question_count = course.get('assignment', {}).get('questionCount', 5)
    confidence = max(0.0, min(1.0, consistency * 0.9 + (0.1 if len(answers) >= question_count else 0.0)))
    verdict = "VERIFY" if (consistency >= 0.40 and confidence >= 0.35) else "FLAG"
    quality_score = int(consistency * 100)
    
    if verdict == "VERIFY":
        reasoning = f"Python AI Service: Student demonstrated strong consistency ({int(consistency*100)}%) with their submission. Paste events: {paste_events}."
        feedback = "Your viva answers confirm genuine understanding and authorship of the submitted work."
    else:
        reasoning = f"Python AI Service: Low consistency score ({int(consistency*100)}%) between interview responses and submission code/text. Flagged for teacher review."
        feedback = "Your answers lacked specific alignment with your submitted code/text. Sent to teacher review queue."
        
    return {
        "consistency": round(consistency, 2),
        "confidence": round(confidence, 2),
        "verdict": verdict,
        "qualityScore": quality_score,
        "reasoning": reasoning,
        "feedback": feedback,
        "scoredBy": "python-ai-service"
    }

def call_openai_json(system_prompt, user_prompt):
    if not OPENAI_API_KEY:
        return None
    url = f"{OPENAI_BASE_URL}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY}"
    }
    payload = {
        "model": OPENAI_MODEL,
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            content = data['choices'][0]['message']['content']
            return json.loads(content)
    except Exception as e:
        print(f"[Python AI Service] OpenAI API error: {e}")
        return None

class AIServiceHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_GET(self):
        if self.path in ['/health', '/api/health']:
            self.send_json(200, {
                "status": "ok",
                "service": "python-ai-orchestration-service",
                "version": "1.0.0",
                "port": PORT
            })
        else:
            self.send_json(404, {"error": "Not Found"})

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        if self.path == '/api/generate-questions':
            course = payload.get('course', {})
            submission = payload.get('submission', {})
            question_count = payload.get('questionCount') or course.get('assignment', {}).get('questionCount') or 5
            
            # Try OpenAI if available
            ai_res = call_openai_json(
                f"You are an AI examiner generating {question_count} dynamic viva questions based on a student's submission to verify genuine understanding and authorship. Return JSON: {{\"questions\": [\"...\"]}}",
                f"Course: {course.get('title')}\nAssignment: {course.get('assignment', {}).get('title')}\nSubmission:\n{submission.get('code') or submission.get('text')}"
            )
            if ai_res and isinstance(ai_res.get('questions'), list):
                self.send_json(200, {
                    "questions": ai_res['questions'][:question_count],
                    "generatedBy": "python-ai-service (openai)"
                })
            else:
                qs = generate_mock_questions(course, submission)
                self.send_json(200, {
                    "questions": qs,
                    "generatedBy": "python-ai-service"
                })

        elif self.path == '/api/score-interview':
            course = payload.get('course', {})
            submission = payload.get('submission', {})
            answers = payload.get('answers', [])
            
            ai_res = call_openai_json(
                "You are an AI grader. Compare student interview answers against their code/text submission. Return JSON: {\"consistency\": 0.0-1.0, \"confidence\": 0.0-1.0, \"verdict\": \"VERIFY\" or \"FLAG\", \"qualityScore\": 0-100, \"reasoning\": \"...\", \"feedback\": \"...\"}",
                f"Submission: {submission.get('code') or submission.get('text')}\nAnswers: {json.dumps(answers)}"
            )
            if ai_res and 'verdict' in ai_res:
                self.send_json(200, {
                    "consistency": float(ai_res.get('consistency', 0.8)),
                    "confidence": float(ai_res.get('confidence', 0.8)),
                    "verdict": "VERIFY" if ai_res.get('verdict') == "VERIFY" else "FLAG",
                    "qualityScore": int(ai_res.get('qualityScore', 80)),
                    "reasoning": str(ai_res.get('reasoning', '')),
                    "feedback": str(ai_res.get('feedback', '')),
                    "scoredBy": "python-ai-service (openai)"
                })
            else:
                score_res = score_mock_interview(course, submission, answers)
                self.send_json(200, score_res)
        else:
            self.send_json(404, {"error": "Endpoint not found"})

def run():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, AIServiceHandler)
    print(f"[Python AI Service] Listening on http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Python AI Service] Shutting down...")
        httpd.server_close()

if __name__ == '__main__':
    run()
