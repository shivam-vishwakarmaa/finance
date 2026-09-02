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
    
    conn.close()
    return is_verified, expected_net, adjusted_observed_net

if __name__ == "__main__":
    # Test block
    pass
