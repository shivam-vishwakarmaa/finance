import sqlite3
import pandas as pd
import json
import os

DB_PATH = "finex.db"

def evaluate_batch():
    conn = sqlite3.connect(DB_PATH)
    exceptions = pd.read_sql("SELECT * FROM exceptions", conn)
    
    gt_path = os.path.join(os.path.dirname(__file__), "../data/ground_truth/ground_truth.json")
    with open(gt_path, "r") as f:
        ground_truth_list = json.load(f)
        
    gt_map = {item['order_id']: item for item in ground_truth_list}
    
    total_exceptions = len(exceptions)
    
    metrics = {
        "total_exceptions": total_exceptions,
        "causal_correctness": 0,
        "resolution_correctness": 0,
        "false_auto_resolution_rate": 0,
        "unresolved_rate": 0,
        "total_financial_impact": exceptions['financial_impact'].sum() if not exceptions.empty else 0,
        "mathematical_correctness": 0,
        "books_confidence": 0
    }
    
    correct_causes = 0
    correct_resolutions = 0
    false_autos = 0
    unresolved_count = 0
    verified_count = 0
    
    for _, exc in exceptions.iterrows():
        order_id = exc['order_id']
        pred_cat = exc['root_cause_category']
        status = exc['status']
        
        if status == 'UNRESOLVED':
            unresolved_count += 1
            
        gt = gt_map.get(order_id)
        if gt:
            true_cat = gt['true_category']
            
            # Causal correctness
            if pred_cat == true_cat:
                correct_causes += 1
                
            # False auto-resolution (if status is SAFE_AUTO_RESOLUTION but it was actually ambiguous or wrong)
            if status == 'SAFE_AUTO_RESOLUTION' and pred_cat != true_cat:
                false_autos += 1
                
            # Resolution correctness (status is resolved and it's correct)
            if status in ['SAFE_AUTO_RESOLUTION', 'HUMAN_APPROVAL'] and pred_cat == true_cat:
                correct_resolutions += 1
                
        # Parse evidence package for verification status
        ev = exc['evidence_package']
        if ev:
            try:
                ev_data = json.loads(ev)
                if ev_data.get('verification', {}).get('status') == 'PASS':
                    verified_count += 1
            except:
                pass
                
    if total_exceptions > 0:
        metrics["causal_correctness"] = correct_causes / total_exceptions
        metrics["resolution_correctness"] = correct_resolutions / total_exceptions
        metrics["false_auto_resolution_rate"] = false_autos / total_exceptions
        metrics["unresolved_rate"] = unresolved_count / total_exceptions
        metrics["mathematical_correctness"] = verified_count / total_exceptions
        
    # Books confidence = value of (matched + accurately resolved) / total value
    # We can approximate for now as matched value / total gross + verified exception value
    orders = pd.read_sql("SELECT SUM(gross_amount) as total FROM orders", conn)
    total_value = orders.iloc[0]['total']
    
    # Value under investigation/unresolved
    unresolved_value = exceptions[exceptions['status'] == 'UNRESOLVED']['financial_impact'].sum() if not exceptions.empty else 0
    
    proven_value = total_value - unresolved_value
    metrics["books_confidence"] = proven_value / total_value if total_value else 1.0
    metrics["proven_value"] = proven_value
    metrics["unresolved_value"] = unresolved_value

    conn.close()
    return metrics

if __name__ == "__main__":
    m = evaluate_batch()
    print(json.dumps(m, indent=2))
