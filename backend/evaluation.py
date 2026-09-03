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
                
            # Parse evidence package for verification status
            ev = exc['evidence_package']
            math_pass = False
            if ev:
                try:
                    ev_data = json.loads(ev)
                    if ev_data.get('verification', {}).get('status') == 'PASS':
                        verified_count += 1
                        math_pass = True
                except:
                    pass

            # Resolution correctness
            is_ambiguous = true_cat in ['AMBIGUOUS', 'ISOLATED_ANOMALY']
            if is_ambiguous and status == 'UNRESOLVED':
                correct_resolutions += 1
            elif not is_ambiguous and status in ['SAFE_AUTO_RESOLUTION', 'HUMAN_APPROVED'] and pred_cat == true_cat and math_pass:
                correct_resolutions += 1

            # False auto-resolution
            if status == 'SAFE_AUTO_RESOLUTION' and (pred_cat != true_cat or not math_pass):
                false_autos += 1
                

    if total_exceptions > 0:
        metrics["causal_correctness"] = correct_causes / total_exceptions
        metrics["resolution_correctness"] = correct_resolutions / total_exceptions
        metrics["false_auto_resolution_rate"] = false_autos / total_exceptions
        metrics["unresolved_rate"] = unresolved_count / total_exceptions
        metrics["mathematical_correctness"] = verified_count / total_exceptions
        
    # Books Confidence = (Value of exact matches + Value of safely resolved exceptions) / Total Gross
    # 1. Total Gross
    orders = pd.read_sql("SELECT order_id, gross_amount FROM orders", conn)
    total_value = orders['gross_amount'].sum() if not orders.empty else 0
    
    # 2. Matches Value
    matches = pd.read_sql("SELECT order_id FROM matches", conn)
    matched_orders = orders[orders['order_id'].isin(matches['order_id'])]
    matched_value = matched_orders['gross_amount'].sum() if not matched_orders.empty else 0
    
    # 3. Resolved Exceptions Value
    resolved_exceptions = exceptions[exceptions['status'].isin(['SAFE_AUTO_RESOLUTION', 'HUMAN_APPROVED'])]
    resolved_value = resolved_exceptions['financial_impact'].sum() if not resolved_exceptions.empty else 0
    
    proven_value = matched_value + resolved_value
    unresolved_value = exceptions[exceptions['status'] == 'UNRESOLVED']['financial_impact'].sum() if not exceptions.empty else 0
    
    metrics["books_confidence"] = proven_value / total_value if total_value else 1.0
    metrics["proven_value"] = float(proven_value)
    metrics["unresolved_value"] = float(unresolved_value)
    
    conn.close()
    return metrics

if __name__ == "__main__":
    m = evaluate_batch()
    print(json.dumps(m, indent=2))
