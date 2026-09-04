import pytest
from pydantic import ValidationError
from backend.ai_investigator import RootCauseHypothesis, MockProvider

def test_valid_category():
    hypothesis = RootCauseHypothesis(
        exception_id="EX-123",
        root_cause_hypothesis="Test hypothesis",
        root_cause_category="FX_ANOMALY",
        confidence=0.9,
        explanation="Test explanation",
        affected_records=[],
        recommended_action="Test action",
        proposed_adjustment_amount=0.0,
        evidence=[],
        uncertainty="None"
    )
    assert hypothesis.root_cause_category == "FX_ANOMALY"

def test_invalid_category():
    with pytest.raises(ValidationError):
        RootCauseHypothesis(
            exception_id="EX-123",
            root_cause_hypothesis="Test hypothesis",
            root_cause_category="DATA_INCONSISTENCY",
            confidence=0.9,
            explanation="Test explanation",
            affected_records=[],
            recommended_action="Test action",
            proposed_adjustment_amount=0.0,
            evidence=[],
            uncertainty="None"
        )

def test_mock_provider_categories():
    provider = MockProvider()
    
    # 1. REFUND_TIMING
    context = {"order": {"order_id": "O-1", "status": "REFUNDED"}, "settlements": [], "gateway": []}
    res = provider.investigate("E-1", context)
    assert res.root_cause_category == "REFUND_TIMING"
    
    # 3. CHARGEBACK
    context = {"status": "COMPLETED", "order": {"order_id": "O-1"}, "gateway": [], "settlements": [{"settlement_id": "CB-1"}]}
    res = provider.investigate("E-3", context)
    assert res.root_cause_category == "CHARGEBACK"
    
    # 4. FEE_SCHEDULE_DRIFT
    context = {"status": "COMPLETED", "order": {"order_id": "O-1"}, "gateway": [{"gross_amount": 100}], "settlements": [{"settlement_id": "S1", "rate_version": "v1"}]}
    res = provider.investigate("E-4", context)
    assert res.root_cause_category == "FEE_SCHEDULE_DRIFT"

