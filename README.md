# JNTUH Academic Insights 🎓

A powerful web application for JNTUH students to **track, analyze, and predict** their academic performance. Built with a modern React frontend and Python-powered AI backend.

---

## 🌟 What is This?

**JNTUH Academic Insights** is a comprehensive academic companion designed specifically for JNTUH university students. Whether you're a first-year student or about to graduate, this tool helps you understand your academic journey, identify areas for improvement, and plan for your target CGPA.

### The Problem It Solves
- **Scattered Results**: JNTUH results are spread across multiple PDFs and web pages
- **Manual Calculations**: Students manually calculate CGPA using spreadsheets
- **No Insights**: Traditional methods don't reveal performance patterns
- **Future Planning**: Hard to know what grades you need for your target CGPA

### The Solution
This application:
1. **Aggregates** all your results in one place
2. **Calculates** SGPA/CGPA automatically using official JNTUH formula
3. **Visualizes** your performance with charts and trends
4. **Predicts** your next semester performance using AI
5. **Plans** what grades you need to achieve your goals

> ⚠️ **Important: JNTUH Affiliated Colleges Only**
> 
> Auto-Fetch and all features work properly **only for JNTUH and its affiliated colleges**. Students from **autonomous colleges** may not be able to use the Auto-Fetch feature as their results are hosted on different portals. Autonomous college students can still use **PDF Upload** or **Manual Entry** features.

---

## ✨ Features

### 📥 Import Your Results
| Method | Description |
|--------|-------------|
| **Auto-Fetch** | Enter your hall ticket number to automatically fetch all results |
| **PDF Upload** | Upload your JNTUH result memo PDFs for instant parsing |
| **Manual Entry** | Manually enter SGPA for any semester |

### 📊 Dashboard Analytics
- **CGPA & Percentage** — Real-time calculation using JNTUH formula
- **SGPA Trend Line** — Visual performance trajectory over semesters
- **Grade Distribution Pie Chart** — See your O/A+/A/B grades breakdown
- **Credits Progress** — Track credits earned vs total required (160/200)
- **Backlogs List** — View all failed subjects with credits at risk

### 🧠 AI-Powered Insights
- **Next SGPA Prediction** — Machine learning predicts your likely next semester SGPA
- **Performance Consistency Score** — How stable is your academic performance?
- **Trend Analysis** — Are you improving, declining, or stable?
- **Strength & Weakness Detection** — Identifies your best and worst subjects

### 🧮 Planning Tools
| Tool | What It Does |
|------|--------------|
| **Target CGPA Calculator** | Enter your target CGPA → Get required SGPA for remaining semesters |
| **What-If Calculator** | Simulate: "If I get O in Math, what's my new CGPA?" |
| **Eligibility Checker** | Check if your CGPA meets company placement cutoffs (TCS, Infosys, Amazon, etc.) |
| **Semester Goals** | Set target SGPA per semester and track your progress |

### 📤 Export & Share
- **Export to Excel** — Download all data as .xlsx with multiple sheets
- **Shareable Link** — Generate a URL to share your results with others
- **Print Transcript** — Generate a clean, printable academic report

### 📜 Transcript Generation
- JNTUH-style table format with Subject Code, Name, Internal, External, Total, Grade, Credits
- Clean white design optimized for printing
- Summary section with CGPA and Percentage

### 📚 Notes Hub
- **Chatbot Interface** — Interactive conversational UI to find notes easily
- **Regulation Support** — Browse notes for **R18** and **R22** CSE regulations
- **Dual Access for R18** — Choose between **Local Files** or **Google Drive** links
- **Subject-wise Organization** — Navigate by Year → Semester → Subject → Files
- **Direct Downloads** — Download PDF notes instantly from the chat
- **Contribute Notes** — Upload your own notes to help other students (pending admin approval)

---

## 🚀 How to Use

### Step 1: Start the Application

Open two terminals in the project folder:

```bash
# Terminal 1 - Backend API
uvicorn server:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 - Frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

### Step 2: Import Your Results

**Option A - Auto-Fetch (Recommended)**
1. Go to "Academic Walkthrough" tab
2. Enter your Hall Ticket Number (e.g., 20B91A0501)
3. Click "Fetch Results" — All semesters will be imported automatically

**Option B - PDF Upload**
1. Click "Upload PDF Files"
2. Select your JNTUH result memo PDFs
3. Data will be extracted automatically

**Option C - Manual Entry**
1. Expand any semester card
2. Switch to "Manual Mode"
3. Enter your SGPA directly

### Step 3: Explore Your Dashboard

- View your **CGPA** and **Percentage** at a glance
- Check **SGPA Trend** to see your progress over time
- Review **Backlogs** (if any) with credits at risk
- See **Strengths** (O/A+ subjects) and **Focus Areas** (B/C/F subjects)

### Step 4: Use AI Predictions

- Go to "Insights" tab
- View predicted **Next SGPA** (for current students)
- Use **Target CGPA Calculator** to plan your goals
- Try **What-If Calculator** to simulate grade changes

### Step 5: Export Your Data

- Click **Export Excel** to download a spreadsheet
- Click **Share Link** to copy a shareable URL
- Go to **Transcript** tab and click "Print" for a clean report

---

## 🎯 Who Is This For?

| User Type | How It Helps |
|-----------|--------------|
| **1st Year Students** | Track your performance from the start, build good habits |
| **Mid-University Students** | Identify weak subjects, plan improvement strategies |
| **Final Year Students** | Calculate required grades for placement CGPA targets |
| **Graduates** | Generate transcripts, export data for applications |
| **Parents/Mentors** | Get a clear view of student's academic standing |

---

## 📚 Libraries Used

### Frontend (JavaScript/TypeScript)

| Library | Version | Why Used | Where Used |
|---------|---------|----------|------------|
| **React** | 19.2 | Core UI framework for building interactive components | All `.tsx` files in `src/components/` |
| **TypeScript** | 5.9 | Type safety and better developer experience | All `.ts` and `.tsx` files |
| **Tailwind CSS** | 4.1 | Utility-first CSS framework for rapid styling | `src/index.css` and all component classNames |
| **Vite** | 7.2 | Fast build tool and development server | `vite.config.ts`, runs `npm run dev` |
| **Recharts** | 3.6 | React charting library for data visualization | `SGPATrendLine.tsx`, `YearlyBarChart.tsx`, `GradeDistribution.tsx`, `CreditsChart.tsx` |
| **Framer Motion** | 12.23 | Smooth animations and page transitions | `PageTransition.tsx`, most components for entrance animations |
| **Lucide React** | 0.562 | Beautiful, consistent icon library | All components for icons (Award, Brain, TrendingUp, etc.) |
| **react-hot-toast** | 2.6 | Toast notifications for user feedback | `ActionButtons.tsx` for export/share success messages |
| **xlsx** | 0.18 | Excel file generation for data export | `exportUtils.ts` for "Export to Excel" feature |
| **Lenis** | 1.3 | Smooth scroll library for better UX | `SmoothScroll.tsx` wrapper component |

### Backend (Python)

| Library | Version | Why Used | Where Used |
|---------|---------|----------|------------|
| **FastAPI** | 0.109+ | Modern async web framework for REST APIs | `server.py` - all API endpoints |
| **Uvicorn** | 0.27+ | ASGI server to run FastAPI | Command `uvicorn server:app --reload` |
| **Pandas** | 2.2+ | Data manipulation and analysis | `analyzer.py`, `data_processor.py` for DataFrames |
| **NumPy** | 1.26+ | Numerical computations for ML | `analyzer.py` for array operations in predictions |
| **Scikit-learn** | 1.4+ | Machine learning (Linear Regression) | `analyzer.py` for SGPA prediction model |
| **PDFPlumber** | 0.11+ | PDF text extraction and parsing | `data_processor.py` for parsing JNTUH result PDFs |
| **Playwright** | 1.40+ | Browser automation for web scraping | `server.py` `/fetch/htno` endpoint for auto-fetch |
| **BeautifulSoup4** | 4.12+ | HTML parsing after Playwright renders page | `server.py` for parsing scraped result tables |
| **python-multipart** | 0.0.9+ | File upload handling in FastAPI | `server.py` for PDF upload endpoint |

### Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | JavaScript/TypeScript linting |
| **TypeScript ESLint** | TypeScript-specific lint rules |
| **@vitejs/plugin-react** | React Fast Refresh for Vite |

---


## 📦 Installation

### Prerequisites
- Node.js 18+
- Python 3.9+

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd RESULT_ANALYZER

# Install Frontend dependencies
npm install

# Install Backend dependencies
pip install -r requirements.txt

# Install Playwright browsers (for auto-fetch)
playwright install chromium
```

---

## 📁 Project Structure

```
RESULT_ANALYZER/
├── backend/               # Python API modules
│   ├── analyzer.py        # ML predictions (Scikit-learn)
│   └── data_processor.py  # PDF parsing & calculations
├── src/                   # React Frontend
│   ├── api/               # API client
│   ├── components/        # UI components
│   │   ├── charts/        # Visualization components
│   │   ├── motion/        # Animation wrappers
│   │   ├── Dashboard.tsx
│   │   ├── Predictions.tsx
│   │   ├── WhatIfCalculator.tsx
│   │   └── PrintableTranscript.tsx
│   ├── context/           # State management
│   ├── constants/         # JNTUH grading rules
│   ├── utils/             # Helper functions
│   │   ├── calculations.ts
│   │   ├── exportUtils.ts
│   │   └── heuristicInsights.ts
│   └── types/             # TypeScript types
├── server.py              # FastAPI entry point
├── requirements.txt       # Python dependencies
└── package.json           # Node dependencies
```

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/fetch/htno` | Auto-fetch results by hall ticket |
| POST | `/analyze/pdf` | Parse PDF files |
| POST | `/predict/sgpa` | ML prediction for next SGPA |
| POST | `/analyze/advanced` | Get consistency score & insights |
| GET | `/notes/catalog` | Get available notes catalog |
| GET | `/notes/download` | Download a specific note PDF |
| POST | `/notes/upload` | Upload notes for contribution |

---

## 💡 Tips for Best Results

1. **Use Auto-Fetch** for the most accurate data extraction
2. **Import all semesters** to get better AI predictions
3. **Check the What-If Calculator** before important exams
4. **Export to Excel** regularly as a backup of your records
5. **Use Target Calculator** to set realistic CGPA goals

---

## 🔒 Privacy

- All data is processed **locally** in your browser and backend
- No data is sent to third-party servers
- Shareable links encode data in the URL (no server storage)

---

## 📄 License

MIT License - Feel free to use, modify, and distribute.

---

## 🙏 Credits

Built with ❤️ for JNTUH students to make academic tracking easier and smarter.

**Happy Learning! 🎓**
