# FinEx Controller

> **Your reconciliation system tells you what broke. FinEx tells you why, proves it, and tells you what to do next.**

## 📊 Evaluation & Metrics

FinEx was tested on a synthetic dataset of 260+ orders. The following are the **measured synthetic-data results under Mock/LLM-provider conditions**:
- **Total Exceptions Investigated:** 99
- **Total Financial Impact:** ₹416,803
- **Causal Correctness:** 85.8586%
- **Mathematical Correctness:** 94.9495%
- **Resolution Correctness:** 53.5354%
- **False Auto-Resolution Rate:** 0%
- **Unresolved Rate:** 8.0808%
- **Books Confidence:** 62.9155%
- **Proven Value:** ₹1,243,909
- **Unresolved Value:** ₹115,630

## 🖥️ The UI

The FinEx frontend is built with React + Vite + Tailwind CSS.

- **Batch Dashboard:** High-level metrics, Books Confidence, and aggregated Root Cause clusters.
- **Exception Investigation:** Deep dive into a single exception showcasing the exact variance, AI hypothesis, strict deterministic mathematical verification, the contextual transaction graph, and the required governance action.
- **Root-Cause Cluster:** A grouped view of all transactions suffering from the same systemic failure.

## 🛠️ How to Run Locally

### Prerequisites
- Python 3.10+
- Node.js & npm

### 1. Backend Setup
```bash
# Install dependencies
pip install fastapi uvicorn pandas pydantic networkx google-genai

# IMPORTANT: To use the real LLM logic, you must create a .env file with your API key
echo "GEMINI_API_KEY=your_key_here" > .env

# Generate the data and run the deterministic reconciliation
python -m scripts.generate_data
python -m backend.ingest
python -m backend.reconciliation

# Run the AI Investigation loop and Evaluation pipeline
python -m backend.investigation_loop
python -m backend.clustering
python -m backend.evaluation

# Start the FastAPI Server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to view the Controller dashboard.

---
*Built for Razorpay AI Buildathon 2026 — Track 04: AI Finance Controller*
