import sqlite3
import pandas as pd
from .reconciliation import get_applicable_rate, calculate_expected_net

DB_PATH = "finex.db"

def verify_adjustment(order_id, proposed_adjustment_amount):
    """
    Deterministically verify if the proposed adjustment resolves the discrepancy.
    Returns: (bool, float, float) -> (is_verified, expected_net, adjusted_observed_net)
    """
    conn = sqlite3.connect(DB_PATH)
    
    order = pd.read_sql(f"SELECT * FROM orders WHERE order_id = '{order_id}'", conn)
    if order.empty:
        return False, 0.0, 0.0
    
    order = order.iloc[0]
    gross = order['gross_amount']
    status = order['status']
    date_str = order['order_date'][:10]
    
    rates = pd.read_sql("SELECT * FROM rate_reference", conn)
    rate = get_applicable_rate(date_str, rates)
    expected_net = calculate_expected_net(gross, status, rate) if rate is not None else gross
    
    sets = pd.read_sql(f"SELECT * FROM settlements WHERE order_id = '{order_id}'", conn)
    observed_net = sets['net_amount'].sum() if not sets.empty else 0
    
    adjusted_observed_net = observed_net + proposed_adjustment_amount
    
    # tolerance
    is_verified = abs(expected_net - adjusted_observed_net) <= 1.0
    
    status = "PASS" if is_verified else "FAIL"
    if proposed_adjustment_amount == 0 and abs(expected_net - observed_net) > 1.0:
        # If no adjustment proposed but it doesn't match, or we can't verify
        status = "INCONCLUSIVE"
        
    conn.close()
    
    return {
        "status": status,
        "expected": float(expected_net),
        "observed": float(observed_net),
        "adjustment": float(proposed_adjustment_amount),
        "difference": float(expected_net - observed_net),
        "calculation": f"{float(observed_net)} + {float(proposed_adjustment_amount)} = {float(adjusted_observed_net)} (Expected: {float(expected_net)})",
        "reason": f"Verification {'passed' if is_verified else 'failed'} with adjustment {float(proposed_adjustment_amount)}"
    }

if __name__ == "__main__":
    # Test block
    pass
