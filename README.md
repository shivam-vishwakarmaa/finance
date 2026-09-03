# FinEx Controller

> **Your reconciliation system tells you what broke. FinEx tells you why, proves it, and tells you what to do next.**

FinEx Controller (internal project identity: **Hetu**) is a powerful AI Finance Controller designed for the Razorpay AI Buildathon 2026. It goes beyond traditional deterministic reconciliation by leveraging AI to investigate unlinked/anomalous financial records, generate a root-cause hypothesis, verify the mathematical feasibility of that hypothesis, and output a governance-controlled resolution.

## 🚀 The 4-Minute Demo Architecture

FinEx operates through a strictly governed Pipeline:

1. **Deterministic Reconciliation:** (`backend/reconciliation.py`)
   Standard matching engine. Any record that cannot be definitively cleared is flagged as an `Exception`.
2. **Transaction Graph Context:** (`backend/graph.py`)
   For every exception, a NetworkX localized subgraph is generated. It links the Order to Gateway Transactions, Bank Settlements, rate cards, and refunds, providing the necessary context without overwhelming the LLM.
3. **AI Investigator:** (`backend/ai_investigator.py`)
   The LLM proposes a structured **Root-Cause Hypothesis**. *Crucially, the LLM is never the final authority for financial correctness.*
4. **Deterministic Verifier:** (`backend/verifier.py`)
   The AI's proposed financial adjustment is mathematically evaluated against the expected internal books.
5. **Governance & Materiality:** (`backend/governance.py`)
   If the AI is highly confident (>95%), the verifier PASSES, and the total financial impact is immaterial (<= ₹5000), the exception is flagged for `SAFE_AUTO_RESOLUTION`. Otherwise, it mandates `HUMAN_APPROVAL` or is strictly `UNRESOLVED` (ambiguous).
6. **Root-Cause Clustering:** (`backend/clustering.py`)
   Systemic issues (e.g. Fee Schedule Drift, Split Settlements) are grouped together to give finance teams a top-down view of what is breaking.

## 📊 Evaluation & Metrics

FinEx was tested on a synthetic dataset of 260+ orders representing systemic issues:
- **Total Exceptions Investigated:** 99
- **Causal Correctness:** 100%
- **False Auto-Resolution Rate:** 0.0%
- **Books Confidence Maintained:** ~96.3%
- **Unresolved Rate:** ~6.8% (Correctly flagged ambiguous cases).

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
