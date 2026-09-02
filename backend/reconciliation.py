import sqlite3
import pandas as pd
import uuid

DB_PATH = "finex.db"

def get_applicable_rate(order_date, rates_df):
    for _, rate in rates_df.iterrows():
        if rate['effective_from'] <= order_date <= rate['effective_to']:
            return rate
    return None

def calculate_expected_net(gross, status, rate):
    if not rate.empty:
        fee = round(gross * rate["referral_fee_rate"]) + rate["shipping_fee"] + rate["closing_fee"]
        tax = round(fee * rate["tax_rate"])
        net = gross - fee - tax
        if status == "REFUNDED":
            net -= gross
        return net
    return gross

def run_reconciliation():
    conn = sqlite3.connect(DB_PATH)
    
    orders = pd.read_sql("SELECT * FROM orders", conn)
    gtws = pd.read_sql("SELECT * FROM gateway_transactions", conn)
    settlements = pd.read_sql("SELECT * FROM settlements", conn)
    rates = pd.read_sql("SELECT * FROM rate_reference", conn)
    
    matches = []
    exceptions = []
    
    for _, order in orders.iterrows():
        order_id = order['order_id']
        gross = order['gross_amount']
        status = order['status']
        date_str = order['order_date'][:10] # just date part for simplicity
        
        # 1. Match Gateway
        gtw = gtws[gtws['order_id'] == order_id]
        if gtw.empty or gtw.iloc[0]['status'] != 'SUCCESS':
            exceptions.append({
                "exception_id": f"EX-{uuid.uuid4().hex[:8].upper()}",
                "order_id": order_id,
                "financial_impact": gross,
                "status": "UNRESOLVED",
                "confidence": 0.0,
                "cluster_id": None,
                "root_cause_hypothesis": None
            })
            continue
            
        # 2. Find Settlements
        sets = settlements[settlements['order_id'] == order_id]
        observed_net = sets['net_amount'].sum() if not sets.empty else 0
        
        # 3. Calculate Expected
        rate = get_applicable_rate(date_str, rates)
        if rate is None:
            expected_net = gross
        else:
            expected_net = calculate_expected_net(gross, status, rate)
            
        diff = expected_net - observed_net
        
        if abs(diff) <= 1.0 and not sets.empty: # Exact or within tolerance
            matches.append({
                "match_id": f"MT-{uuid.uuid4().hex[:8].upper()}",
                "order_id": order_id,
                "match_type": "EXACT" if len(sets) == 1 else "SPLIT_EXACT"
            })
        else:
            exceptions.append({
                "exception_id": f"EX-{uuid.uuid4().hex[:8].upper()}",
                "order_id": order_id,
                "financial_impact": abs(diff),
                "status": "UNRESOLVED",
                "confidence": 0.0,
                "cluster_id": None,
                "root_cause_hypothesis": None
            })

    # Save to DB
    if matches:
        pd.DataFrame(matches).to_sql("matches", conn, if_exists="append", index=False)
    
    if exceptions:
        pd.DataFrame(exceptions).to_sql("exceptions", conn, if_exists="append", index=False)
        
    conn.close()
    
    print(f"Reconciliation complete. Found {len(matches)} matches and {len(exceptions)} exceptions.")

if __name__ == "__main__":
    run_reconciliation()
