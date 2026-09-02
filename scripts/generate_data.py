import os
import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
import json
import uuid

def generate_dataset():
    random.seed(42)
    np.random.seed(42)

    num_orders = 260
    
    # 1. Rate Reference
    rates_data = [
        {
            "rate_version": "v1",
            "marketplace": "RAZORPAY",
            "effective_from": "2025-01-01",
            "effective_to": "2026-06-30",
            "category": "DEFAULT",
            "referral_fee_rate": 0.02,
            "shipping_fee": 50,
            "closing_fee": 10,
            "tax_rate": 0.18
        },
        {
            "rate_version": "v2",
            "marketplace": "RAZORPAY",
            "effective_from": "2026-07-01",
            "effective_to": "2029-12-31",
            "category": "DEFAULT",
            "referral_fee_rate": 0.025,
            "shipping_fee": 60,
            "closing_fee": 15,
            "tax_rate": 0.18
        }
    ]
    rates_df = pd.DataFrame(rates_data)

    orders = []
    gateway_txns = []
    settlements = []
    ground_truth = []

    # Distribution
    # Normal: ~150
    # Fee schedule drift: 35
    # Split settlement: 25
    # Refund timing: 20
    # Ambiguous: 1
    # Isolated (ref mismatch, missing gateway, delayed settlement, etc.): 9
    
    types = (
        ['NORMAL'] * 170 +
        ['FEE_DRIFT'] * 35 +
        ['SPLIT_SETTLEMENT'] * 25 +
        ['REFUND_TIMING'] * 20 +
        ['AMBIGUOUS'] * 1 +
        ['REF_MISMATCH'] * 3 +
        ['MISSING_GATEWAY'] * 3 +
        ['DELAYED_SETTLEMENT'] * 3
    )
    random.shuffle(types)

    start_date = datetime(2026, 7, 1)

    def calc_fees(gross, version="v2"):
        r = [x for x in rates_data if x["rate_version"] == version][0]
        fee = round(gross * r["referral_fee_rate"]) + r["shipping_fee"] + r["closing_fee"]
        tax = round(fee * r["tax_rate"])
        return fee, tax

    for i in range(num_orders):
        t = types[i]
        
        # Order
        order_id = f"ORD-{1000 + i}"
        days_offset = random.randint(0, 25)
        order_date = start_date + timedelta(days=days_offset)
        gross_amount = random.randint(500, 15000)
        
        orders.append({
            "order_id": order_id,
            "order_date": order_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "customer_id": f"CUST-{random.randint(100, 999)}",
            "gross_amount": gross_amount,
            "currency": "INR",
            "status": "COMPLETED" if t != 'REFUND_TIMING' else "REFUNDED"
        })

        # Gateway
        gtw_id = f"GTW-{10000 + i}"
        ref = f"REF-{order_id}"
        if t == 'REF_MISMATCH':
            ref = f"REFF-{order_id}-X" # typo
            
        if t != 'MISSING_GATEWAY':
            gateway_txns.append({
                "gateway_txn_id": gtw_id,
                "order_id": order_id,
                "transaction_date": (order_date + timedelta(hours=random.randint(1, 12))).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "captured_amount": gross_amount,
                "gateway": "RAZORPAY",
                "status": "SUCCESS",
                "reference": ref
            })

        # Settlement
        settlement_date = order_date + timedelta(days=2)
        if t == 'DELAYED_SETTLEMENT':
            settlement_date = order_date + timedelta(days=15)
            
        fee_v2, tax_v2 = calc_fees(gross_amount, "v2")
        fee_v1, tax_v1 = calc_fees(gross_amount, "v1")
        
        if t == 'NORMAL' or t == 'REF_MISMATCH' or t == 'MISSING_GATEWAY' or t == 'DELAYED_SETTLEMENT':
            net = gross_amount - fee_v2 - tax_v2
            settlements.append({
                "settlement_id": f"SET-{20000 + i}",
                "order_id": order_id,
                "settlement_date": settlement_date.strftime("%Y-%m-%d"),
                "gross_amount": gross_amount,
                "fee": fee_v2,
                "tax": tax_v2,
                "refund": 0,
                "net_amount": net,
                "marketplace": "RAZORPAY",
                "reference": ref,
                "rate_version": "v2"
            })
            if t != 'NORMAL':
                ground_truth.append({
                    "exception_id": None, # assigned later
                    "order_id": order_id,
                    "true_root_cause": t,
                    "true_category": "ISOLATED_ANOMALY",
                    "expected_difference": 0
                })
                
        elif t == 'FEE_DRIFT':
            # Settlement applied v1 fees incorrectly in July 2026
            net_v1 = gross_amount - fee_v1 - tax_v1
            settlements.append({
                "settlement_id": f"SET-{20000 + i}",
                "order_id": order_id,
                "settlement_date": settlement_date.strftime("%Y-%m-%d"),
                "gross_amount": gross_amount,
                "fee": fee_v1,
                "tax": tax_v1,
                "refund": 0,
                "net_amount": net_v1,
                "marketplace": "RAZORPAY",
                "reference": ref,
                "rate_version": "v1"
            })
            expected_net_v2 = gross_amount - fee_v2 - tax_v2
            ground_truth.append({
                "exception_id": None,
                "order_id": order_id,
                "true_root_cause": "STALE_FEE_RATE",
                "true_category": "FEE_SCHEDULE_DRIFT",
                "expected_difference": net_v1 - expected_net_v2, # how much off it is from expectation
                "affected_records": [order_id, f"SET-{20000 + i}"]
            })
            
        elif t == 'SPLIT_SETTLEMENT':
            split_ratio = random.choice([0.5, 0.6, 0.7])
            gross_1 = int(gross_amount * split_ratio)
            gross_2 = gross_amount - gross_1
            
            fee1, tax1 = calc_fees(gross_1, "v2")
            fee2, tax2 = calc_fees(gross_2, "v2")
            
            set1_id = f"SET-{20000 + i}-A"
            set2_id = f"SET-{20000 + i}-B"
            
            settlements.append({
                "settlement_id": set1_id,
                "order_id": order_id,
                "settlement_date": settlement_date.strftime("%Y-%m-%d"),
                "gross_amount": gross_1,
                "fee": fee1,
                "tax": tax1,
                "refund": 0,
                "net_amount": gross_1 - fee1 - tax1,
                "marketplace": "RAZORPAY",
                "reference": ref,
                "rate_version": "v2"
            })
            settlements.append({
                "settlement_id": set2_id,
                "order_id": order_id,
                "settlement_date": (settlement_date + timedelta(days=2)).strftime("%Y-%m-%d"),
                "gross_amount": gross_2,
                "fee": fee2,
                "tax": tax2,
                "refund": 0,
                "net_amount": gross_2 - fee2 - tax2,
                "marketplace": "RAZORPAY",
                "reference": ref,
                "rate_version": "v2"
            })
            ground_truth.append({
                "exception_id": None,
                "order_id": order_id,
                "true_root_cause": "SPLIT_PAYMENT",
                "true_category": "SPLIT_SETTLEMENT_TIMING",
                "expected_difference": 0, 
                "affected_records": [order_id, set1_id, set2_id]
            })

        elif t == 'REFUND_TIMING':
            # Order was refunded, but settlement doesn't show deduction
            refund_amount = gross_amount
            net = gross_amount - fee_v2 - tax_v2
            settlements.append({
                "settlement_id": f"SET-{20000 + i}",
                "order_id": order_id,
                "settlement_date": settlement_date.strftime("%Y-%m-%d"),
                "gross_amount": gross_amount,
                "fee": fee_v2,
                "tax": tax_v2,
                "refund": 0, # Missing refund!
                "net_amount": net,
                "marketplace": "RAZORPAY",
                "reference": ref,
                "rate_version": "v2"
            })
            # The refund txn will be captured in a refund file/table (optional in prompt, but let's represent it via order status = REFUNDED)
            # Expected net should have been: gross - fee - tax - refund
            expected_net = gross_amount - fee_v2 - tax_v2 - refund_amount
            ground_truth.append({
                "exception_id": None,
                "order_id": order_id,
                "true_root_cause": "MISSING_REFUND_DEDUCTION",
                "true_category": "REFUND_TIMING",
                "expected_difference": net - expected_net, # e.g. +refund_amount
                "affected_records": [order_id, f"SET-{20000 + i}"]
            })
            
        elif t == 'AMBIGUOUS':
            # Settlement amount makes no sense
            random_amount = random.randint(50000, 90000)
            settlements.append({
                "settlement_id": f"SET-{20000 + i}",
                "order_id": order_id,
                "settlement_date": settlement_date.strftime("%Y-%m-%d"),
                "gross_amount": random_amount,
                "fee": 100,
                "tax": 18,
                "refund": 0,
                "net_amount": random_amount - 118,
                "marketplace": "RAZORPAY",
                "reference": ref,
                "rate_version": "v2"
            })
            expected_net = gross_amount - fee_v2 - tax_v2
            ground_truth.append({
                "exception_id": None,
                "order_id": order_id,
                "true_root_cause": "UNKNOWN",
                "true_category": "AMBIGUOUS",
                "expected_difference": (random_amount - 118) - expected_net,
                "affected_records": [order_id, f"SET-{20000 + i}"]
            })

    # Bank credits: Sum up settlement net_amount by settlement_date
    bank_credits = []
    settlement_df = pd.DataFrame(settlements)
    if not settlement_df.empty:
        daily_settlements = settlement_df.groupby("settlement_date")["net_amount"].sum().reset_index()
        for idx, row in daily_settlements.iterrows():
            bank_credits.append({
                "bank_txn_id": f"BTXN-{30000 + idx}",
                "credit_date": (datetime.strptime(row["settlement_date"], "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d"),
                "amount": row["net_amount"],
                "reference": f"BANK-REF-{idx}",
                "bank_account": "HDFC-8821"
            })

    # Ensure directories exist
    os.makedirs("data/generated", exist_ok=True)
    os.makedirs("data/ground_truth", exist_ok=True)

    # Save to CSV
    pd.DataFrame(orders).to_csv("data/generated/orders.csv", index=False)
    pd.DataFrame(gateway_txns).to_csv("data/generated/gateway_transactions.csv", index=False)
    settlement_df.to_csv("data/generated/settlements.csv", index=False)
    pd.DataFrame(bank_credits).to_csv("data/generated/bank_credits.csv", index=False)
    rates_df.to_csv("data/generated/rate_reference.csv", index=False)
    
    # Save ground truth
    with open("data/ground_truth/ground_truth.json", "w") as f:
        json.dump(ground_truth, f, indent=2)

    print(f"Generated {len(orders)} orders, {len(gateway_txns)} gateway txns, {len(settlements)} settlements, {len(bank_credits)} bank credits.")

if __name__ == "__main__":
    generate_dataset()
