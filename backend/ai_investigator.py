import json
import os
import random
from pydantic import BaseModel, ValidationError
from typing import List, Optional

class RootCauseHypothesis(BaseModel):
    exception_id: str
    root_cause_hypothesis: str
    root_cause_category: str
    confidence: float
    explanation: str
    affected_records: List[str]
    recommended_action: str
    proposed_adjustment_amount: float
    evidence: List[str]
    uncertainty: str

class AIProvider:
    def investigate(self, exception_id: str, context: dict) -> RootCauseHypothesis:
        raise NotImplementedError

class MockProvider(AIProvider):
    def investigate(self, exception_id: str, context: dict) -> RootCauseHypothesis:
        # Simple mock logic based on context
        order = context.get('order', {})
        sets = context.get('settlements', [])
        
        gross = order.get('gross_amount', 0)
        status = order.get('status', 'COMPLETED')
        observed_net = sum(s.get('net_amount', 0) for s in sets)
        
        if status == 'REFUNDED':
            return RootCauseHypothesis(
                exception_id=exception_id,
                root_cause_hypothesis="Missing refund deduction in settlement.",
                root_cause_category="REFUND_TIMING",
                confidence=0.95,
                explanation="The order was refunded, but the settlement does not show the deduction.",
                affected_records=[order.get('order_id')],
                recommended_action="Apply refund adjustment.",
                proposed_adjustment_amount=-gross,
                evidence=[order.get('order_id')],
                uncertainty="None"
            )
            
        if len(sets) > 1:
            return RootCauseHypothesis(
                exception_id=exception_id,
                root_cause_hypothesis="Settlement split across multiple days.",
                root_cause_category="SPLIT_SETTLEMENT_TIMING",
                confidence=0.98,
                explanation="The total amount was settled in multiple batches.",
                affected_records=[s['settlement_id'] for s in sets],
                recommended_action="Accept split settlement matches.",
                proposed_adjustment_amount=0, # No adjustment needed, just verify sum
                evidence=[s['settlement_id'] for s in sets],
                uncertainty="None"
            )
            
        if sets:
            # Check for fee drift
            s = sets[0]
            if s.get('rate_version') == 'v1':
                return RootCauseHypothesis(
                    exception_id=exception_id,
                    root_cause_hypothesis="Outdated fee rate applied.",
                    root_cause_category="FEE_SCHEDULE_DRIFT",
                    confidence=0.96,
                    explanation="Marketplace applied v1 fees incorrectly in a v2 period.",
                    affected_records=[s['settlement_id']],
                    recommended_action="Marketplace fee adjustment.",
                    proposed_adjustment_amount=15.0, # Approximate for mock
                    evidence=[s['settlement_id'], "v1", "v2"],
                    uncertainty="None"
                )
                
            if s.get('gross_amount', 0) > 40000:
                # Ambiguous
                return RootCauseHypothesis(
                    exception_id=exception_id,
                    root_cause_hypothesis="Settlement amount does not match any known fee logic.",
                    root_cause_category="AMBIGUOUS",
                    confidence=0.61,
                    explanation="The settlement is unusually large and cannot be mathematically proven.",
                    affected_records=[s['settlement_id']],
                    recommended_action="Human investigation required.",
                    proposed_adjustment_amount=0.0,
                    evidence=[s['settlement_id']],
                    uncertainty="High variance, possible manual entry."
                )

        return RootCauseHypothesis(
            exception_id=exception_id,
            root_cause_hypothesis="Unknown anomaly.",
            root_cause_category="ISOLATED_ANOMALY",
            confidence=0.5,
            explanation="Could not cleanly identify the root cause.",
            affected_records=[],
            recommended_action="Human investigation required.",
            proposed_adjustment_amount=0.0,
            evidence=[],
            uncertainty="Unknown error type."
        )

def investigate_exception(exception_id: str, context: dict, provider: AIProvider = None):
    if provider is None:
        provider = MockProvider()
        
    try:
        result = provider.investigate(exception_id, context)
        return result.model_dump()
    except Exception as e:
        # Fallback safe response
        print(f"AI investigation failed for {exception_id}: {e}")
        return {
            "exception_id": exception_id,
            "root_cause_hypothesis": "AI investigation unavailable — deterministic evidence available.",
            "root_cause_category": "AI_FAILURE",
            "confidence": 0.0,
            "explanation": "The AI investigation service encountered an error or timed out.",
            "affected_records": [],
            "recommended_action": "Manual review or retry.",
            "proposed_adjustment_amount": 0.0,
            "evidence": [],
            "uncertainty": "Complete uncertainty due to service failure."
        }
