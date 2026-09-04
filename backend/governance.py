def calculate_materiality(financial_impact, confidence):
    # Materiality is primarily driven by the financial impact,
    # modified slightly by confidence risk.
    # Returns score from 0 to 100, where higher is more material.
    # For a hackathon, we can simply return the financial impact.
    return financial_impact

def apply_governance(ai_hypothesis, verification_result):
    import sqlite3
    confidence = ai_hypothesis.get('confidence', 0.0)
    impact = abs(ai_hypothesis.get('proposed_adjustment_amount', 0.0))
    status = verification_result.get('status', 'INCONCLUSIVE')
    category = ai_hypothesis.get('root_cause_category')
    
    GLOBAL_MATERIALITY_LIMIT = 5000
    
    if status == 'PASS' and confidence >= 0.95 and impact <= GLOBAL_MATERIALITY_LIMIT:
        return "SAFE_AUTO_RESOLUTION"
        
    # Tier 3: Apply Rule Learning
    if status == 'PASS' and category and confidence >= 0.80:
        try:
            conn = sqlite3.connect("finex.db")
            conn.row_factory = sqlite3.Row
            rule = conn.execute("SELECT * FROM resolution_rules WHERE category = ?", (category,)).fetchone()
            conn.close()
            if rule:
                effective_threshold = min(rule['max_impact'], GLOBAL_MATERIALITY_LIMIT)
                if impact <= effective_threshold:
                    return "SAFE_AUTO_RESOLUTION"
        except Exception:
            pass
        
    if status == 'INCONCLUSIVE' or confidence < 0.70 or category == 'AMBIGUOUS':
        return "UNRESOLVED"
        
    return "HUMAN_APPROVAL"
