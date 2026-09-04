import pytest
import sqlite3
import json
import os
from scripts.diagnose_mismatches import run_diagnostics

def test_diagnostics(tmp_path, capfd):
    # Setup mock ground truth
    gt_data = [
        {"order_id": "O-1", "true_category": "FEE_SCHEDULE_DRIFT"},
        {"order_id": "O-2", "true_category": "FEE_SCHEDULE_DRIFT"},
        {"order_id": "O-3", "true_category": "REFUND_TIMING"},
        {"order_id": "O-4", "true_category": "PARTIAL_PAYMENT"},
    ]
    gt_file = tmp_path / "ground_truth.json"
    with open(gt_file, "w") as f:
        json.dump(gt_data, f)
        
    # Setup mock database
    db_file = tmp_path / "test.db"
    conn = sqlite3.connect(db_file)
    conn.execute("CREATE TABLE exceptions (exception_id TEXT, order_id TEXT, status TEXT, root_cause_category TEXT, confidence REAL, evidence_package TEXT)")
    
    # 1. Match
    ep_1 = json.dumps({"hypothesis": {"proposed_adjustment_amount": 100.0}})
    # 2. Mismatch (Valid Category)
    ep_2 = json.dumps({"hypothesis": {"proposed_adjustment_amount": 200.0}})
    # 3. Mismatch (Invented Category)
    ep_3 = json.dumps({"hypothesis": {"proposed_adjustment_amount": 300.0}})
    # 4. Ignore (AI_FAILURE)
    ep_4 = json.dumps({"hypothesis": {"proposed_adjustment_amount": 400.0}})
    
    conn.executemany(
        "INSERT INTO exceptions VALUES (?, ?, ?, ?, ?, ?)",
        [
            ("E-1", "O-1", "RESOLVED", "FEE_SCHEDULE_DRIFT", 0.95, ep_1),
            ("E-2", "O-2", "RESOLVED", "FX_ANOMALY", 0.95, ep_2),
            ("E-3", "O-3", "RESOLVED", "MADE_UP_ERROR", 0.95, ep_3),
            ("E-4", "O-4", "RESOLVED", "AI_FAILURE", 0.0, ep_4),
        ]
    )
    conn.commit()
    conn.close()
    
    # Run diagnostics
    run_diagnostics(str(db_file), str(gt_file))
    
    out, err = capfd.readouterr()
    
    # E-1 shouldn't be printed (Match)
    assert "E-1" not in out
    # E-4 shouldn't be printed (AI_FAILURE)
    assert "E-4" not in out
    
    # E-2 should be printed as a normal mismatch
    assert "MISMATCH: E-2 O-2 predicted=FX_ANOMALY true=FEE_SCHEDULE_DRIFT confidence=0.95 impact=200.0" in out
    assert "[INVENTED CATEGORY]" not in out.split("E-2")[0] # Check it doesn't have the flag
    
    # E-3 should be printed as an invented mismatch
    assert "MISMATCH [INVENTED CATEGORY]: E-3 O-3 predicted=MADE_UP_ERROR true=REFUND_TIMING confidence=0.95 impact=300.0" in out
    
    assert "Total mismatches found: 2" in out
