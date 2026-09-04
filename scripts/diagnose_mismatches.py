import sqlite3
import json
import pandas as pd
from typing import get_args
import os
import sys

# Import the Literal type to get the 9 valid categories
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from backend.ai_investigator import RootCauseCategory

VALID_CATEGORIES = set(get_args(RootCauseCategory))

def run_diagnostics(db_path="finex.db", ground_truth_path="data/ground_truth/ground_truth.json"):
    try:
        conn = sqlite3.connect(db_path)
        exceptions = pd.read_sql("SELECT * FROM exceptions WHERE status != 'UNRESOLVED'", conn)
        conn.close()
    except Exception as e:
        print(f"Failed to read database: {e}")
        return

    try:
        with open(ground_truth_path, 'r') as f:
            gt_list = json.load(f)
        gt = {item['order_id']: item for item in gt_list}
    except Exception as e:
        print(f"Failed to read ground truth: {e}")
        return

    mismatches = 0
    for _, row in exceptions.iterrows():
        exc_id = row['exception_id']
        order_id = row['order_id']
        predicted_cat = row.get('root_cause_category')
        confidence = row.get('confidence', 0.0)
        
        # Parse evidence package for financial impact
        impact = 0.0
        try:
            if row.get('evidence_package'):
                ep = json.loads(row['evidence_package'])
                impact = abs(ep.get('hypothesis', {}).get('proposed_adjustment_amount', 0.0))
        except:
            pass

        # Filter out AI_FAILURE and 0 confidence
        if predicted_cat == 'AI_FAILURE' or confidence == 0.0:
            continue

        true_data = gt.get(order_id)
        if not true_data:
            continue
            
        true_cat = true_data.get('true_category')
        
        if predicted_cat != true_cat:
            invented_flag = ""
            if predicted_cat not in VALID_CATEGORIES:
                invented_flag = " [INVENTED CATEGORY]"
                
            print(f"MISMATCH{invented_flag}: {exc_id} {order_id} predicted={predicted_cat} true={true_cat} confidence={confidence} impact={impact}")
            mismatches += 1

    print(f"\nTotal mismatches found: {mismatches}")

if __name__ == "__main__":
    run_diagnostics()
