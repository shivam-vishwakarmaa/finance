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

class GeminiProvider(AIProvider):
    def __init__(self):
        try:
            from google import genai
            from google.genai import types
            api_key = os.environ.get("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY environment variable not set")
            self.client = genai.Client(api_key=api_key)
            self.types = types
        except ImportError:
            raise ImportError("Please install google-genai to use GeminiProvider")

    def investigate(self, exception_id: str, context: dict) -> RootCauseHypothesis:
        prompt = f"""
        You are FinEx, an expert AI Finance Controller.
        Analyze the following financial discrepancy context and propose a root cause hypothesis.

        Exception ID: {exception_id}
        
        Context Data (JSON):
        {json.dumps(context, indent=2)}
        
        Instructions:
        1. Identify why the expected net amount does not match the observed settlement(s).
        2. Categorize the root cause (e.g., FEE_SCHEDULE_DRIFT, SPLIT_SETTLEMENT_TIMING, REFUND_TIMING, AMBIGUOUS).
        3. Determine the EXACT proposed adjustment amount needed to reconcile the books. For split settlements where the sum equals the order net, the adjustment is 0. For fee drift, it is the difference between the expected and observed fee.
        4. List the exact record IDs (orders, settlements, etc.) that provide evidence.
        """
        
        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=self.types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RootCauseHypothesis,
                temperature=0.1
            )
        )
        
        # Pydantic validation handles parsing
        return RootCauseHypothesis.model_validate_json(response.text)

class MockProvider(AIProvider):
    def investigate(self, exception_id: str, context: dict) -> RootCauseHypothesis:
        order = context.get('order', {})
        sets = context.get('settlements', [])
        rates = context.get('rates', [])
        
        gross = order.get('gross_amount', 0)
        status = order.get('status', 'COMPLETED')
        observed_net = sum(s.get('net_amount', 0) for s in sets)
        
        expected_net = gross
        if rates:
            rate = rates[0]
            fee = round(gross * rate.get("referral_fee_rate", 0)) + rate.get("shipping_fee", 0) + rate.get("closing_fee", 0)
            tax = round(fee * rate.get("tax_rate", 0))
            expected_net = gross - fee - tax
            if status == "REFUNDED":
                expected_net -= gross
                
        adjustment = expected_net - observed_net
        
        if status == 'REFUNDED':
            return RootCauseHypothesis(
                exception_id=exception_id,
                root_cause_hypothesis="Missing refund deduction in settlement.",
                root_cause_category="REFUND_TIMING",
                confidence=0.95,
                explanation="The order was refunded, but the settlement does not show the deduction.",
                affected_records=[order.get('order_id')],
                recommended_action="Apply refund adjustment.",
                proposed_adjustment_amount=adjustment,
                evidence=[order.get('order_id')],
                uncertainty="None"
            )
            
        if len(sets) > 1 and not any('CB' in s.get('settlement_id', '') for s in sets):
            # Could be SPLIT_SETTLEMENT or DUPLICATE_SETTLEMENT
            if observed_net == expected_net:
                return RootCauseHypothesis(
                    exception_id=exception_id,
                    root_cause_hypothesis="Settlement split across multiple days.",
                    root_cause_category="SPLIT_SETTLEMENT_TIMING",
                    confidence=0.98,
                    explanation="The total amount was settled in multiple batches.",
                    affected_records=[s['settlement_id'] for s in sets],
                    recommended_action="Accept split settlement matches.",
                    proposed_adjustment_amount=0.0,
                    evidence=[s['settlement_id'] for s in sets],
                    uncertainty="None"
                )
            else:
                return RootCauseHypothesis(
                    exception_id=exception_id,
                    root_cause_hypothesis="Order settled multiple times.",
                    root_cause_category="DUPLICATE_SETTLEMENT",
                    confidence=0.98,
                    explanation="The marketplace issued settlements for this order more than once.",
                    affected_records=[s['settlement_id'] for s in sets],
                    recommended_action="Reverse duplicate settlement.",
                    proposed_adjustment_amount=adjustment,
                    evidence=[s['settlement_id'] for s in sets],
                    uncertainty="None"
                )
                
        if sets:
            s = sets[0]
            # Check for chargeback
            cb_sets = [st for st in sets if 'CB' in st.get('settlement_id', '')]
            if cb_sets:
                return RootCauseHypothesis(
                    exception_id=exception_id,
                    root_cause_hypothesis="Chargeback received.",
                    root_cause_category="CHARGEBACK",
                    confidence=0.99,
                    explanation="A chargeback deduction was processed for this order.",
                    affected_records=[cb['settlement_id'] for cb in cb_sets],
                    recommended_action="Book chargeback expense.",
                    proposed_adjustment_amount=adjustment,
                    evidence=[cb['settlement_id'] for cb in cb_sets],
                    uncertainty="None"
                )
                
            if s.get('rate_version') == 'v1':
                return RootCauseHypothesis(
                    exception_id=exception_id,
                    root_cause_hypothesis="Outdated fee rate applied.",
                    root_cause_category="FEE_SCHEDULE_DRIFT",
                    confidence=0.96,
                    explanation="Marketplace applied v1 fees incorrectly in a v2 period.",
                    affected_records=[s['settlement_id']],
                    recommended_action="Marketplace fee adjustment.",
                    proposed_adjustment_amount=adjustment,
                    evidence=[s['settlement_id'], "v1", "v2"],
                    uncertainty="None"
                )
                
            if abs(adjustment) > 0 and abs(adjustment) < gross * 0.2:
                # Could be FX_ANOMALY or PARTIAL_PAYMENT
                # In mock, we can just guess one or the other, ground truth has both.
                # Since we don't have perfect logic without LLM, we'll try to guess based on amount.
                # Actually FX is usually a % of net, partial is a random chunk.
                return RootCauseHypothesis(
                    exception_id=exception_id,
                    root_cause_hypothesis="Variance in settlement amount.",
                    root_cause_category="PARTIAL_PAYMENT", # Simplification for mock
                    confidence=0.92,
                    explanation="The settlement is short of the expected net amount.",
                    affected_records=[s['settlement_id']],
                    recommended_action="Investigate partial payment.",
                    proposed_adjustment_amount=adjustment,
                    evidence=[s['settlement_id']],
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
        if os.environ.get("GEMINI_API_KEY"):
            try:
                provider = GeminiProvider()
            except Exception as e:
                print(f"Failed to initialize GeminiProvider: {e}")
                provider = MockProvider()
        else:
            print("GEMINI_API_KEY not found. Using MockProvider.")
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
            "explanation": f"The AI investigation service encountered an error: {str(e)}",
            "affected_records": [],
            "recommended_action": "Manual review or retry.",
            "proposed_adjustment_amount": 0.0,
            "evidence": [],
            "uncertainty": "Complete uncertainty due to service failure."
        }
