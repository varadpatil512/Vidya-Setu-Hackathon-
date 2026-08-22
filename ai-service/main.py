import os
import json
import urllib.request
import urllib.error
import re
from http.server import HTTPServer, BaseHTTPRequestHandler

try:
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
except ImportError:
    pass

PORT = int(os.environ.get("PYTHON_AI_PORT", 8000))
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash")

STOP_WORDS = set([
    'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'is', 'are', 'was', 'it', 'i', 
    'you', 'my', 'your', 'this', 'that', 'with', 'as', 'at', 'be', 'have', 'has', 'do', 'does', 
    'would', 'will', 'can', 'could', 'should', 'if', 'then', 'else', 'not', 'but', 'from', 'by', 'so', 'we', 'they'
])

def get_api_key():
    return os.environ.get("OPENAI_API_KEY", "") or OPENAI_API_KEY

def get_gemini_key():
    return os.environ.get("GEMINI_API_KEY", "") or GEMINI_API_KEY

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
    source = str(submission.get('code', '') or submission.get('text', '') or '')
    skill = course.get('skill', '') or course.get('title', '')

    # Auto-detect if source is code (SQL, HTML, CSS, Python, JS, etc.)
    has_sql = bool(re.search(r'\b(select|from|where|insert|update|delete|group\s+by|order\s+by|join)\b', source, re.IGNORECASE))
    is_code = (sub_type == 'code') or has_sql or bool(re.search(r'</?[a-z1-6]+|[\.\#][A-Za-z0-9_-]+\s*\{|def\s+|function|var\s+|const\s+|let\s+|if\s*\(|if\s+|else|return', source, re.IGNORECASE))
    
    if has_sql:
        table_match = re.search(r'\bfrom\s+([A-Za-z0-9_]+)', source, re.IGNORECASE)
        where_match = re.search(r'\bwhere\s+([^;\n]+)', source, re.IGNORECASE)
        select_match = re.search(r'\bselect\s+([^;\n]+?)\s+from\b', source, re.IGNORECASE)
        
        table_name = table_match.group(1) if table_match else "the table"
        where_clause = where_match.group(1).strip() if where_match else ""
        select_cols = select_match.group(1).strip() if select_match else "*"
        
        if where_clause:
            qs.append(f"Why did you filter by `WHERE {where_clause}` in your SQL query, and what index on `{table_name}` would optimize this query?")
        else:
            qs.append(f"Walk me through how your query retrieves records from `{table_name}`.")
            
        if "*" in select_cols:
            qs.append(f"You used `SELECT *` for `{table_name}` — why might listing explicit column names be better in production?")
        else:
            qs.append(f"Why did you select `{select_cols}` columns specifically instead of retrieving all fields?")

    elif is_code:
        facts = extract_code_facts(source)
        names = facts['names']
        
        has_id = '#' in source or 'id=' in source or 'id =' in source
        has_class = '.' in source or 'class=' in source or 'class =' in source
        has_style = 'style' in source or 'color' in source or 'background' in source or 'font' in source
        has_heading = bool(re.search(r'<h[1-6]', source, re.IGNORECASE))
        has_py_if = bool(re.search(r'\bif\s+.*:', source))
        
        if has_id and has_class:
            class_matches = re.findall(r'class=["\']([^"\']+)["\']|\.([A-Za-z0-9_-]+)', source)
            id_matches = re.findall(r'id=["\']([^"\']+)["\']|#([A-Za-z0-9_-]+)', source)
            c_name = class_matches[0][0] or class_matches[0][1] if class_matches else "class"
            i_name = id_matches[0][0] or id_matches[0][1] if id_matches else "id"
            qs.append(f"Why did you use the `{i_name}` ID selector for unique elements while using the `.{c_name}` class selector for reusable styling in your code?")
        elif has_class:
            class_matches = re.findall(r'class=["\']([^"\']+)["\']|\.([A-Za-z0-9_-]+)', source)
            c_name = f".{class_matches[0][0] or class_matches[0][1]}" if class_matches else "class"
            qs.append(f"Why did you choose to define the `{c_name}` class selector for your styling instead of applying inline styles?")
        elif has_id:
            id_matches = re.findall(r'id=["\']([^"\']+)["\']|#([A-Za-z0-9_-]+)', source)
            i_name = f"#{id_matches[0][0] or id_matches[0][1]}" if id_matches else "ID"
            qs.append(f"Why did you use the `{i_name}` ID selector here, and in what scenario would a class selector be more appropriate?")
        elif has_heading:
            tag_match = re.findall(r'<(h[1-6])', source, re.IGNORECASE)
            tag = tag_match[0] if tag_match else "h1"
            qs.append(f"Why did you choose the `<{tag}>` heading tag for this content, and how does it affect document accessibility?")
        elif has_py_if:
            cond_match = re.search(r'\bif\s+([^:\n]+):', source)
            cond_str = cond_match.group(1).strip() if cond_match else "condition"
            qs.append(f"Why did you use the conditional check `if {cond_str}:` in your Python code, and what happens if the input is unexpected?")
        elif names:
            qs.append(f"Walk me through what your function `{names[0]}` does, step by step from input to return value.")
        else:
            qs.append(f"Explain why you selected this specific structural approach for your {skill} solution.")
        
        if has_style:
            color_matches = re.findall(r'(color|background-color|background|font-size)\s*:\s*([^;}\n]+)', source)
            if color_matches:
                prop, val = color_matches[0]
                qs.append(f"Why did you choose `{val.strip()}` for the `{prop.strip()}` property in your submission?")
            else:
                qs.append(f"How do the CSS styling rules in your submission establish visual hierarchy for the user?")
        elif facts['loops']:
            qs.append("You used iteration/loops in your code. What invariant holds true on each loop iteration?")
        elif facts['usesCond']:
            qs.append("Describe an edge case input where your conditional branching handles an exception.")
        else:
            qs.append("What alternative implementation or property did you evaluate before finalizing this submission?")
    else:
        first_sentence = str(source).split('.')[0].strip() if source else "your thesis"
        qs.append(f"Your submission states: '{first_sentence[:100]}...' — defend this premise with specific examples.")
        qs.append("What alternative approach did you evaluate and discard during this assignment?")
    
    return qs[:2]

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
    question_count = course.get('assignment', {}).get('questionCount', 2)
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

def _parse_json_response(content):
    """Strip markdown fences and parse JSON from LLM response."""
    cleaned = re.sub(r'^```(?:json)?\s*', '', str(content).strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r'\s*```$', '', cleaned).strip()
    return json.loads(cleaned)

def call_gemini_json(system_prompt, user_prompt):
    """Call Google Gemini API (free tier: 60 req/min for gemini-1.5-flash)."""
    key = get_gemini_key()
    if not key:
        return None
    model = os.environ.get("GEMINI_MODEL", GEMINI_MODEL)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    headers = {"Content-Type": "application/json"}
    full_prompt = f"{system_prompt}\n\n{user_prompt}"
    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "responseMimeType": "application/json"
        }
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            content = data['candidates'][0]['content']['parts'][0]['text']
            return _parse_json_response(content)
    except Exception as e:
        print(f"[Python AI Service] Gemini API error: {e}")
        return None

def call_openai_json(system_prompt, user_prompt):
    key = get_api_key()
    if not key:
        return None
    url = f"{OPENAI_BASE_URL}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}"
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
            return _parse_json_response(content)
    except Exception as e:
        print(f"[Python AI Service] OpenAI API error: {e}")
        return None

def call_llm_json(system_prompt, user_prompt):
    """Try Gemini first (free), then OpenAI fallback."""
    if get_gemini_key():
        result = call_gemini_json(system_prompt, user_prompt)
        if result:
            return result, "gemini"
    if get_api_key():
        result = call_openai_json(system_prompt, user_prompt)
        if result:
            return result, "openai"
    return None, None

def generate_llm_questions(course, submission, question_count=2):
    sub_type = submission.get('type', 'code')
    student_code = str(submission.get('code', '') if sub_type == 'code' else submission.get('text', ''))

    assignment_info = course.get('assignment', {}) if isinstance(course.get('assignment'), dict) else {}
    assignment_description = assignment_info.get('prompt') or assignment_info.get('title') or course.get('description', '') or course.get('title', '')
    skill_tag = course.get('skill') or course.get('title', '')

    system_prompt = (
        "You are an AI examiner reviewing a student submission to generate interview questions. "
        "Return ONLY a JSON object containing a 'questions' key with an array of short question strings, "
        "e.g. {\"questions\": [\"Question 1\", \"Question 2\"]}. Do not include markdown code block markers or extra text."
    )

    user_prompt = f"""You are reviewing a student's submission for the assignment:
'{assignment_description}'. Skill being verified:
'{skill_tag}'. Here is their submission:
---
{student_code}
---
Generate exactly 2 short interview questions that test whether
the student understands their own submission — ask about
specific choices they made (e.g. why a particular selector,
property, or approach was used), not generic definitions.
Return ONLY a JSON array of 2 question strings, no other text."""

    # Try Gemini first (free), then OpenAI — both attempt up to 2 times total
    for attempt in range(2):
        ai_res, provider = call_llm_json(system_prompt, user_prompt)
        if ai_res:
            questions_list = []
            if isinstance(ai_res, list):
                questions_list = [str(q).strip() for q in ai_res if q]
            elif isinstance(ai_res, dict):
                if isinstance(ai_res.get('questions'), list):
                    questions_list = [str(q).strip() for q in ai_res['questions'] if q]
                elif isinstance(ai_res.get('result'), list):
                    questions_list = [str(q).strip() for q in ai_res['result'] if q]

            if len(questions_list) >= 2:
                return questions_list[:2], f"python-ai-service ({provider})"
            elif len(questions_list) == 1:
                fallback_qs = generate_mock_questions(course, submission)
                return [questions_list[0], fallback_qs[0]], f"python-ai-service ({provider}+fallback)"

    # Fallback: rule-based grounded questions
    fallback_qs = generate_mock_questions(course, submission)
    return fallback_qs[:2], "python-ai-service (fallback)"

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
            question_count = payload.get('questionCount') or 2
            
            questions, generated_by = generate_llm_questions(course, submission, question_count=question_count)
            self.send_json(200, {
                "questions": questions,
                "generatedBy": generated_by
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
