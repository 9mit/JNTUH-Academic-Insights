# JNTUH Academic Insights 🎓

A powerful web application for JNTUH students to **track, analyze, and predict** their academic performance. Built with React + TypeScript frontend and a Python (FastAPI + Scikit-learn) backend.

---

## 🌟 What is This?

**JNTUH Academic Insights** is an academic companion designed for JNTUH university students. It aggregates results from multiple sources, calculates CGPA using the official formula, visualizes performance trends, and provides smart academic guidance.

### The Problem It Solves
- **Scattered Results** — JNTUH results are spread across multiple PDFs and web pages
- **Manual Calculations** — Students manually calculate CGPA using spreadsheets
- **No Insights** — Traditional methods don't reveal performance patterns
- **Future Planning** — Hard to know what grades you need for your target CGPA

### The Solution
1. **Aggregates** all your results in one place
2. **Calculates** SGPA/CGPA automatically using the official JNTUH formula: `Percentage = (CGPA − 0.5) × 10`
3. **Visualizes** your performance with interactive charts and trends
4. **Predicts** your next semester performance using ML (Linear Regression)
5. **Planning Tools** — Target CGPA calculator, What-If simulator, Eligibility checker

> ⚠️ **JNTUH Affiliated Colleges Only**
>
> Auto-Fetch works **only for JNTUH and its affiliated colleges**. Autonomous college students can still use **PDF Upload** or **Manual Entry**.

---

## ✨ Features

### 📥 Import Your Results
| Method | Description |
|--------|-------------|
| **Auto-Fetch** | Enter hall ticket number → all results fetched automatically |
| **PDF Upload** | Upload JNTUH result memo PDFs for instant parsing |
| **Manual Entry** | Enter SGPA for any semester manually |

### 📊 Dashboard Analytics
- **CGPA & Percentage** — Real-time calculation using official JNTUH formula
- **SGPA Trend Line** — Visual performance trajectory over semesters
- **Grade Distribution** — O/A+/A/B+/B/C/D breakdown pie chart
- **Credits Progress** — Track credits earned vs total required
- **Backlogs List** — Active backlogs with deduplication (cleared subjects excluded)

### 🧠 Smart Insights
- **Next SGPA Prediction** — ML predicts your likely next semester SGPA
- **Performance Consistency Score** — How stable is your academic performance
- **Trend Analysis** — Improving, declining, or stable
- **Strength & Weakness Detection** — Best and worst subjects

### 🧮 Planning Tools
| Tool | What It Does |
|------|-------------|
| **Target CGPA Calculator** | Enter target CGPA → Get required SGPA for remaining semesters |
| **What-If Calculator** | Simulate: "If I get O in Math, what's my new CGPA?" |
| **Eligibility Checker** | Check CGPA against company placement cutoffs |
| **Semester Goals** | Set target SGPA per semester and track progress |

### 📜 Transcript & Export
- **Printable Transcript** — JNTUH-style table format
- **Export to Excel** — Download all data as `.xlsx`
- **Shareable Link** — Generate a URL to share your results

### 📚 Notes Hub
- R18 and R22 CSE notes with subject-wise organization
- Download PDF notes directly
- Contribute your own notes (pending admin approval)

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **Python** 3.9+

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd JNTUH-Academic-Insights

# Install frontend dependencies
npm install

# Install backend dependencies
pip install -r requirements.txt

# Install Playwright browsers (for auto-fetch)
playwright install chromium
```

### Run

```bash
# Terminal 1 — Backend API
uvicorn server:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📁 Project Structure

```
JNTUH-Academic-Insights/
├── backend/                 # Python API modules
│   ├── analyzer.py          # ML predictions (Scikit-learn)
│   └── data_processor.py    # PDF parsing & SGPA/CGPA calculations
├── src/                     # React + TypeScript Frontend
│   ├── api/client.ts        # API client with timeout handling
│   ├── components/
│   │   ├── charts/          # Recharts visualization components
│   │   ├── motion/          # Framer Motion animation wrappers
│   │   ├── Dashboard.tsx    # Main analytics dashboard
│   │   ├── Predictions.tsx  # ML predictions & planning tools
│   │   └── ...
│   ├── constants/grading.ts # JNTUH grade points, credits per regulation
│   ├── context/             # React context (AcademicProvider)
│   ├── types/index.ts       # TypeScript types (Grade, Subject, Semester)
│   └── utils/
│       ├── calculations.ts  # SGPA/CGPA/backlog logic
│       └── exportUtils.ts   # Excel export
├── server.py                # FastAPI entry point (all endpoints)
├── requirements.txt         # Python dependencies
├── package.json             # Node dependencies
├── vite.config.ts           # Vite build configuration
└── index.html               # SPA entry point
```

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check / Serve React app |
| `POST` | `/fetch/htno` | Auto-fetch results by hall ticket number |
| `POST` | `/analyze/pdf` | Parse uploaded PDF files |
| `POST` | `/predict/sgpa` | ML prediction for next SGPA |
| `POST` | `/analyze/advanced` | Consistency score & insights |
| `GET` | `/notes/catalog` | Notes catalog |
| `GET` | `/notes/download` | Download note PDF |
| `POST` | `/notes/upload` | Upload notes |

---

## 📚 Tech Stack

### Frontend
| Library | Purpose |
|---------|---------|
| React 19 | UI framework |
| TypeScript 5.9 | Type safety |
| Tailwind CSS 4.1 | Utility-first styling |
| Vite 7.2 | Build tool & dev server |
| Recharts 3.6 | Data visualization |
| Framer Motion 12 | Animations |
| Lucide React | Icons |
| react-hot-toast | Toast notifications |
| xlsx | Excel export |

### Backend
| Library | Purpose |
|---------|---------|
| FastAPI | Async REST API framework |
| Pandas + NumPy | Data processing |
| Scikit-learn | ML predictions (LinearRegression) |
| PDFPlumber | PDF text extraction |
| Playwright + Selenium | Web scraping for auto-fetch |
| BeautifulSoup4 | HTML parsing |
| SSE-Starlette | Server-Sent Events streaming |

---

## 🔒 Privacy

- All data is processed **locally** — your browser and your backend
- No data stored on any external server
- No external API calls for predictions or analysis
- Shareable links encode data in the URL (no server storage)

---

## 📄 License

MIT License — Feel free to use, modify, and distribute.

---

Built with ❤️ for JNTUH students 🎓
