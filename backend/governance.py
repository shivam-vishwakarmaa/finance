def calculate_materiality(financial_impact, confidence):
    # Materiality is primarily driven by the financial impact,
    # modified slightly by confidence risk.
    # Returns score from 0 to 100, where higher is more material.
    # For a hackathon, we can simply return the financial impact.
    return financial_impact

def apply_governance(ai_hypothesis, verification_result):
    confidence = ai_hypothesis.get('confidence', 0.0)
    impact = abs(ai_hypothesis.get('proposed_adjustment_amount', 0.0))
    status = verification_result.get('status', 'INCONCLUSIVE')
    
    if status == 'PASS' and confidence >= 0.95 and impact <= 5000:
        return "SAFE_AUTO_RESOLUTION"
        
    if status == 'INCONCLUSIVE' or confidence < 0.70 or ai_hypothesis.get('root_cause_category') == 'AMBIGUOUS':
        return "UNRESOLVED"
        
    return "HUMAN_APPROVAL"
