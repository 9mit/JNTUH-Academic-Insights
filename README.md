# JNTUH Academic Insights

**JNTUH Academic Insights** is an all-in-one academic intelligence, study resource, and career workstation built specifically for engineering and professional degree students under Jawaharlal Nehru Technological University Hyderabad (JNTUH).

> **Disclaimer:** This platform is an independent student utility built to simplify academic tracking, syllabus preparation, and career readiness. It is not officially affiliated with or endorsed by JNTUH.

---

## 🌟 What We Built

### 1. Multi-Mode Results Intake & Synchronization
- **Hall Ticket Sync**: Instant academic history query across all 8 semesters with automatic multi-attempt deduplication (always takes the best-cleared grade).
- **PDF Memo Scanner**: Drag-and-drop scanner that extracts grades, credits, internal/external marks, and SGPA directly from official university result memos.
- **Manual Grade Entry**: Granular semester-by-semester entry for custom simulations and offline record building.

### 2. Comprehensive Academic Progress Dashboard
- **Cumulative GPA Gauge**: High-contrast circular progress ring reflecting exact university academic standing.
- **Score Conversion**: Transparent JNTUH percentage calculation using official formula `(CGPA - 0.5) × 10`.
- **Credit Progress Tracker**: Real-time earned credit tracking against official degree promotion thresholds.
- **8-Semester Matrix**: Visual matrix (`1-1` to `4-2`) indicating cleared semesters, active backlogs, and pending terms.

### 3. Time-to-Time Important Questions Hub
- **Repeated Exam Questions**: Curated question banks featuring high-frequency 10-mark questions analyzed across multiple examination cycles.
- **Evaluator Scoring Blueprints**: Mark allocation guides, mandatory technical diagrams, and essential derivation points to maximize rubric scores.
- **Last-Night Cram Sheets**: High-yield revision summaries and unit-wise priority filters for rapid pre-exam preparation.
- **Course Coverage**: Core engineering subjects including Matrices and Calculus, Data Structures, Operating Systems, Computer Networks, DBMS, and Design & Analysis of Algorithms.

### 4. Study Library & Notes Hub
- **1,200+ Curated Materials**: Regulation-mapped lecture notes, unit packs, and lab manuals for **R22**, **R18**, **R16**, and **R15** schemes.
- **PYQ Question Packs**: Curated semester examination papers with unit-level topic mapping.
- **Instant Fallback Dataset**: Built-in bundled catalog ensuring offline capability even during network interruptions.

### 5. Class & Batch Leaderboard
- **Section Performance Scanner**: Batch analysis engine to benchmark student cohorts (up to 70 candidates per run).
- **Branch Topper Podiums**: Instant detection of class toppers, distinction counts, and section pass percentages.
- **Grade Register CSV Export**: 1-click export of complete section marks registers for academic counseling and faculty reports.

### 6. Career Opportunities & Campus Drives Portal
- **Continuous Opportunities Feed**: Verified entry-level software, data, and campus hiring openings.
- **Student Career Matcher**: Connected evaluation banner comparing student CGPA and backlog standing against recruitment cutoffs.
- **Direct Application Support**: Native on-platform profile submission for partner campus hiring drives.

### 7. Backlog Recovery & Grace Marks Checker
- **0.15% Grace Marks Simulation**: Automated calculation of rule-verified grace mark concessions to assist degree conferment.
- **Recovery Roadmaps**: Subject-by-subject recovery strategy tailored to upcoming supplementary examination schedules.

### 8. 4-Year Academic Journey & Wrapped
- **Degree Trajectory**: Visual comeback milestones, peak SGPA semesters, and academic progression curves.
- **Shareable Wrapped Card**: Summary cards celebrating engineering milestones and graduation readiness.

---

## 🚀 How to Use It

### Quickstart Workflow

1. **Import Records**:
   - Open the **Import Results** tab (`#/input`).
   - Enter your 10-character JNTUH hall ticket number (e.g., `21071A0501`) and select your regulation scheme, then click **Analyze**.
   - Alternatively, drag and drop one or more result memo PDFs onto the scanner.
2. **Review Academic Signal**:
   - Navigate to **Progress** (`#/dashboard`) to inspect your CGPA gauge, credit completion progress, and semester status matrix.
3. **Prepare for Upcoming Examinations**:
   - Switch to **Study Library** (`#/notes`) to access unit notes, PYQs, and syllabus packs.
   - Explore the **Time-to-Time Important Questions Hub** for high-frequency repeated questions and cram sheets.
4. **Benchmark Your Section**:
   - Open **Class Leaderboard** (`#/class`), enter your college and branch prefix (e.g., `21071A05`), and run batch analytics.
5. **Explore Career Openings**:
   - Visit **Opportunities** (`#/jobs`) to browse verified entry-level roles and evaluate placement readiness.

---

## 💻 Local Development Setup

### Prerequisites
- Node.js (v18 or higher)
- Python (3.10 or higher)

### Installation & Launch

```bash
# 1. Clone the repository
git clone https://github.com/9mit/JNTUH-Academic-Insights.git
cd JNTUH-Academic-Insights

# 2. Frontend Setup
npm install
npm run dev

# 3. Backend Setup (in a separate terminal)
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
python server.py
```

- **Frontend Application:** [http://localhost:5173/](http://localhost:5173/)
- **Backend API & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file in the project root if custom configuration is required:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL for API endpoints | `""` (proxied locally via Vite) |
| `VITE_SUPABASE_URL` | Optional Supabase project URL for community notes | `""` |
| `VITE_SUPABASE_ANON_KEY` | Optional Supabase anonymous API key | `""` |
| `SHARE_TOKEN_SECRET` | Secret key used to sign confidential share links | Generated dynamically |
| `CORS_ORIGINS` | Permitted origins for production API | `http://localhost:5173` |
| `ENVIRONMENT` | Deployment environment (`development` / `production`) | `development` |

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons, Recharts
- **Backend**: Python, FastAPI, Uvicorn, Pandas, SQLite
- **Security**: Content Security Policy (CSP), strict CORS isolation, client-side encrypted vault, rate limiting

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
