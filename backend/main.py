from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import pandas as pd
import json
import hashlib
from datetime import datetime
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

def insert_audit_event(record_id: str, stage: str, action: str, reason: str, confidence: float, verification_result: str, approval_status: str):
    import uuid
    conn = get_db_connection()
    timestamp = datetime.utcnow().isoformat() + "Z"
    event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
    
    # Hash for basic immutability tracing
    hash_input = f"{timestamp}|{record_id}|{action}|{reason}".encode('utf-8')
    record_hash = hashlib.sha256(hash_input).hexdigest()
    
    conn.execute('''
        INSERT INTO audit_events 
        (event_id, created_at, record_id, stage, action, reason, confidence, verification_result, approval_status, record_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (event_id, timestamp, record_id, stage, action, reason, confidence, verification_result, approval_status, record_hash))
    conn.commit()
    conn.close()

@app.get("/api/dashboard")
def get_dashboard():
    conn = get_db_connection()
    exceptions_df = pd.read_sql("SELECT * FROM exceptions", conn)
    clusters_df = pd.read_sql("SELECT * FROM exception_clusters", conn)
    orders_df = pd.read_sql("SELECT SUM(gross_amount) as total FROM orders", conn)
    
    total_value = float(orders_df.iloc[0]['total']) if not orders_df.empty else 0.0
    
    matches_df = pd.read_sql("SELECT order_id FROM matches", conn)
    orders_full = pd.read_sql("SELECT order_id, gross_amount FROM orders", conn)
    matched_orders = orders_full[orders_full['order_id'].isin(matches_df['order_id'])]
    matched_value = float(matched_orders['gross_amount'].sum()) if not matched_orders.empty else 0.0
    
    resolved_exceptions = exceptions_df[exceptions_df['status'].isin(['SAFE_AUTO_RESOLUTION', 'HUMAN_APPROVED'])]
    resolved_value = float(resolved_exceptions['financial_impact'].sum()) if not resolved_exceptions.empty else 0.0
    
    proven_value = matched_value + resolved_value
    unresolved_value = float(exceptions_df[exceptions_df['status'] == 'UNRESOLVED']['financial_impact'].sum()) if not exceptions_df.empty else 0.0
    
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
    exc = conn.execute("SELECT * FROM exceptions WHERE exception_id = ?", (exception_id,)).fetchone()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception not found")
        
    conn.execute("UPDATE exceptions SET status = 'HUMAN_APPROVED' WHERE exception_id = ?", (exception_id,))
    
    # Rule Learning: Create a rule for this category to auto-resolve similar future anomalies
    cat = exc['root_cause_category']
    if cat and cat != 'AMBIGUOUS' and cat != 'UNKNOWN' and exc['confidence'] >= 0.90:
        import uuid
        rule_id = f"RUL-{uuid.uuid4().hex[:8].upper()}"
        max_impact = exc['financial_impact'] * 1.25 # 25% tolerance margin
        
        # Check if rule exists
        existing = conn.execute("SELECT * FROM resolution_rules WHERE category = ?", (cat,)).fetchone()
        if existing:
            if max_impact > existing['max_impact']:
                conn.execute("UPDATE resolution_rules SET max_impact = ? WHERE category = ?", (max_impact, cat))
        else:
            conn.execute("INSERT INTO resolution_rules (rule_id, category, max_impact) VALUES (?, ?, ?)", (rule_id, cat, max_impact))
    
    conn.commit()
    conn.close()
    
    insert_audit_event(
        record_id=exception_id,
        stage="GOVERNANCE",
        action="APPROVE_ADJUSTMENT",
        reason="Human controller explicitly approved the AI proposed adjustment.",
        confidence=exc['confidence'],
        verification_result="PASS",
        approval_status="HUMAN_APPROVED"
    )
    
    return {"status": "success", "message": f"Exception {exception_id} approved."}

@app.post("/api/exceptions/{exception_id}/reject")
def reject_exception(exception_id: str):
    conn = get_db_connection()
    exc = conn.execute("SELECT * FROM exceptions WHERE exception_id = ?", (exception_id,)).fetchone()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception not found")
        
    conn.execute("UPDATE exceptions SET status = 'UNRESOLVED' WHERE exception_id = ?", (exception_id,))
    conn.commit()
    conn.close()
    
    insert_audit_event(
        record_id=exception_id,
        stage="GOVERNANCE",
        action="REJECT_ADJUSTMENT",
        reason="Human controller flagged the exception as unresolved.",
        confidence=exc['confidence'],
        verification_result="UNKNOWN",
        approval_status="UNRESOLVED"
    )
    
    return {"status": "success", "message": f"Exception {exception_id} flagged as unresolved."}

@app.get("/api/audit")
def get_audit_trail():
    conn = get_db_connection()
    events = conn.execute("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 100").fetchall()
    conn.close()
    return [dict(e) for e in events]

@app.get("/api/evaluation")
def get_evaluation():
    from .evaluation import evaluate_batch
    return evaluate_batch()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
