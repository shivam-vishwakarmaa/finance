import pytest
import sqlite3
import os
from backend.governance import apply_governance

def test_governance_cap(tmp_path, monkeypatch):
    # Setup mock database for resolution rules
    db_file = tmp_path / "finex.db"
    conn = sqlite3.connect(db_file)
    conn.execute("CREATE TABLE resolution_rules (category TEXT, max_impact REAL)")
    # Rule with max_impact > 5000
    conn.execute("INSERT INTO resolution_rules VALUES (?, ?)", ("FX_ANOMALY", 15000.0))
    conn.commit()
    conn.close()
    
    # Patch SQLite connect in governance by changing working directory
    monkeypatch.chdir(tmp_path)
    
    # Test 1: Impact between 5000 and 15000 -> Should be HUMAN_APPROVAL (Capped at 5000)
    ai_hypothesis = {
        'root_cause_category': 'FX_ANOMALY',
        'confidence': 0.90,
        'proposed_adjustment_amount': 8000.0
    }
    verification_result = {'status': 'PASS'}
    
    result = apply_governance(ai_hypothesis, verification_result)
    assert result == "HUMAN_APPROVAL"
    
    # Test 2: Impact below 5000 -> Should be SAFE_AUTO_RESOLUTION (Allowed by capped rule)
    ai_hypothesis['proposed_adjustment_amount'] = 3000.0
    
    result = apply_governance(ai_hypothesis, verification_result)
    assert result == "SAFE_AUTO_RESOLUTION"
