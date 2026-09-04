import pytest
import sqlite3
import json
import os
from scripts.sample_investigation import generate_sample
from backend.investigation_loop import run_investigations

def test_generate_sample(tmp_path):
    # Setup mock ground truth
    gt_data = [
        {"order_id": "O-1", "true_category": "CAT_A"},
        {"order_id": "O-2", "true_category": "CAT_A"},
        {"order_id": "O-3", "true_category": "CAT_B"},
    ]
    gt_file = tmp_path / "ground_truth.json"
    with open(gt_file, "w") as f:
        json.dump(gt_data, f)
        
    # Setup mock database
    db_file = tmp_path / "test.db"
    conn = sqlite3.connect(db_file)
    conn.execute("CREATE TABLE exceptions (exception_id TEXT, order_id TEXT, status TEXT)")
    conn.executemany(
        "INSERT INTO exceptions VALUES (?, ?, ?)",
        [
            ("E-1", "O-1", "UNRESOLVED"),
            ("E-2", "O-2", "UNRESOLVED"),
            ("E-3", "O-3", "UNRESOLVED"),
            ("E-4", "O-4", "UNRESOLVED"), # No GT
            ("E-5", "O-1", "RESOLVED"),   # Wrong status
        ]
    )
    conn.commit()
    conn.close()
    
    out_file = tmp_path / "sample.json"
    
    # Run sampler
    result = generate_sample(n_per_category=1, ground_truth_path=str(gt_file), db_path=str(db_file), output_path=str(out_file))
    
    # Check it picked exactly 1 of each category
    assert len(result) == 2
    assert "E-1" in result # Since E-1 and E-2 are CAT_A, E-1 is first
    assert "E-3" in result
    
    # Check output file
    with open(out_file, "r") as f:
        saved = json.load(f)
    assert saved == result

def test_investigation_loop_filtering(tmp_path, monkeypatch):
    # Setup DB
    db_file = tmp_path / "finex.db"
    conn = sqlite3.connect(db_file)
    conn.execute("CREATE TABLE exceptions (exception_id TEXT, order_id TEXT, status TEXT, confidence REAL, root_cause_hypothesis TEXT, root_cause_category TEXT, evidence_package TEXT)")
    conn.executemany(
        "INSERT INTO exceptions (exception_id, order_id, status) VALUES (?, ?, ?)",
        [
            ("E-1", "O-1", "UNRESOLVED"),
            ("E-2", "O-2", "UNRESOLVED"),
        ]
    )
    conn.commit()
    conn.close()
    
    # Patch DB_PATH in investigation_loop
    monkeypatch.setattr("backend.investigation_loop.DB_PATH", str(db_file))
    # Patch investigate_exception to mock the network
    from backend.ai_investigator import RootCauseHypothesis
    
    def fake_investigate(*args, **kwargs):
        return {
            "exception_id": args[0],
            "root_cause_hypothesis": "Test",
            "root_cause_category": "ISOLATED_ANOMALY",
            "confidence": 0.9,
            "explanation": "Test",
            "affected_records": [],
            "recommended_action": "Test",
            "proposed_adjustment_amount": 0.0,
            "evidence": [],
            "uncertainty": "Test"
        }
        
    monkeypatch.setattr("backend.investigation_loop.investigate_exception", fake_investigate)
    
    def fake_verify(*args, **kwargs):
        return {"status": "PASS", "expected": 0.0, "observed": 0.0, "adjustment": 0.0, "difference": 0.0, "calculation": "", "reason": ""}
        
    monkeypatch.setattr("backend.investigation_loop.verify_adjustment", fake_verify)

    def fake_build_graph(*args, **kwargs):
        import networkx as nx
        return nx.DiGraph(), {}
        
    monkeypatch.setattr("backend.investigation_loop.build_transaction_subgraph", fake_build_graph)
    
    # Provide filter file
    filter_file = tmp_path / "filter.json"
    with open(filter_file, "w") as f:
        json.dump(["E-1"], f)
        
    run_investigations(str(filter_file))
    
    # Verify DB
    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT exception_id, status FROM exceptions").fetchall()
    
    # E-1 should be resolved (or HUMAN_APPROVAL depending on governance, but status changes from UNRESOLVED)
    # E-2 should remain UNRESOLVED
    for r in rows:
        if r['exception_id'] == 'E-1':
            assert r['status'] != 'UNRESOLVED'
        if r['exception_id'] == 'E-2':
            assert r['status'] == 'UNRESOLVED'
