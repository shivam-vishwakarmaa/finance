import pytest
from unittest.mock import patch
from backend.ai_investigator import investigate_exception, AIProvider, RootCauseHypothesis

class FakeRateLimitProvider(AIProvider):
    def __init__(self):
        self.calls = 0

    def investigate(self, exception_id: str, context: dict) -> RootCauseHypothesis:
        self.calls += 1
        if self.calls <= 2:
            raise Exception("429 RESOURCE_EXHAUSTED: quota exceeded")
        return RootCauseHypothesis(
            exception_id=exception_id,
            root_cause_hypothesis="Success on 3rd try",
            root_cause_category="AMBIGUOUS",
            confidence=0.9,
            explanation="Worked",
            affected_records=[],
            recommended_action="None",
            proposed_adjustment_amount=0.0,
            evidence=[],
            uncertainty="None"
        )

class FakeGenericErrorProvider(AIProvider):
    def __init__(self):
        self.calls = 0
        
    def investigate(self, exception_id: str, context: dict) -> RootCauseHypothesis:
        self.calls += 1
        raise ValueError("Generic ValueError")

@patch("time.sleep")
def test_rate_limit_retry(mock_sleep):
    provider = FakeRateLimitProvider()
    result = investigate_exception("E-1", {}, provider=provider, max_retries=4, base_delay=15.0)
    
    assert provider.calls == 3
    assert result['root_cause_category'] == "AMBIGUOUS"
    assert result['root_cause_hypothesis'] == "Success on 3rd try"
    
    # Check sleep was called twice with increasing delays: base_delay * 1, then base_delay * 2
    assert mock_sleep.call_count == 2
    mock_sleep.assert_any_call(15.0)
    mock_sleep.assert_any_call(30.0)

@patch("time.sleep")
def test_generic_error_no_retry(mock_sleep):
    provider = FakeGenericErrorProvider()
    result = investigate_exception("E-2", {}, provider=provider, max_retries=4, base_delay=15.0)
    
    assert provider.calls == 1
    assert result['root_cause_category'] == "AI_FAILURE"
    assert result['confidence'] == 0.0
    mock_sleep.assert_not_called()
