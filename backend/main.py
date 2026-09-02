from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import pandas as pd
import json

app = FastAPI(title="FinEx Controller API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "finex.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/api/dashboard")
def get_dashboard():
    conn = get_db_connection()
    exceptions_df = pd.read_sql("SELECT * FROM exceptions", conn)
    clusters_df = pd.read_sql("SELECT * FROM exception_clusters", conn)
    orders_df = pd.read_sql("SELECT SUM(gross_amount) as total FROM orders", conn)
    
    total_value = float(orders_df.iloc[0]['total']) if not orders_df.empty else 0.0
    unresolved_value = float(exceptions_df[exceptions_df['status'] == 'UNRESOLVED']['financial_impact'].sum()) if not exceptions_df.empty else 0.0
    proven_value = total_value - unresolved_value
    
    conn.close()
    
    return {
        "books_confidence": (proven_value / total_value) if total_value > 0 else 1.0,
        "proven_value": proven_value,
        "unresolved_value": unresolved_value,
        "total_exceptions": len(exceptions_df),
        "total_clusters": len(clusters_df)
    }

@app.get("/api/clusters")
def get_clusters():
    conn = get_db_connection()
    clusters = [dict(row) for row in conn.execute("SELECT * FROM exception_clusters ORDER BY total_impact DESC").fetchall()]
    conn.close()
    return clusters

@app.get("/api/clusters/{cluster_id}")
def get_cluster(cluster_id: str):
    conn = get_db_connection()
    cluster = conn.execute("SELECT * FROM exception_clusters WHERE cluster_id = ?", (cluster_id,)).fetchone()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
        
    exceptions = [dict(row) for row in conn.execute("SELECT exception_id, order_id, financial_impact, status, confidence FROM exceptions WHERE cluster_id = ?", (cluster_id,)).fetchall()]
    conn.close()
    
    result = dict(cluster)
    result["exceptions"] = exceptions
    return result

@app.get("/api/exceptions")
def get_exceptions():
    conn = get_db_connection()
    exceptions = [dict(row) for row in conn.execute("SELECT exception_id, order_id, financial_impact, status, confidence, root_cause_category FROM exceptions ORDER BY financial_impact DESC").fetchall()]
    conn.close()
    return exceptions

@app.get("/api/exceptions/{exception_id}")
def get_exception(exception_id: str):
    conn = get_db_connection()
    exc = conn.execute("SELECT * FROM exceptions WHERE exception_id = ?", (exception_id,)).fetchone()
    conn.close()
    
    if not exc:
        raise HTTPException(status_code=404, detail="Exception not found")
        
    result = dict(exc)
    if result.get('evidence_package'):
        try:
            result['evidence_package'] = json.loads(result['evidence_package'])
        except:
            pass
            
    return result

@app.post("/api/exceptions/{exception_id}/approve")
def approve_exception(exception_id: str):
    conn = get_db_connection()
    conn.execute("UPDATE exceptions SET status = 'HUMAN_APPROVED' WHERE exception_id = ?", (exception_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Exception {exception_id} approved."}

@app.get("/api/evaluation")
def get_evaluation():
    from .evaluation import evaluate_batch
    return evaluate_batch()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
