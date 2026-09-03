import sqlite3
import pandas as pd
import os

DB_PATH = "finex.db"

def init_db():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        
    conn = sqlite3.connect(DB_PATH)
    
    # Load CSVs
    orders = pd.read_csv("data/generated/orders.csv")
    gtw = pd.read_csv("data/generated/gateway_transactions.csv")
    settlements = pd.read_csv("data/generated/settlements.csv")
    bank_credits = pd.read_csv("data/generated/bank_credits.csv")
    rates = pd.read_csv("data/generated/rate_reference.csv")
    
    orders.to_sql("orders", conn, index=False)
    gtw.to_sql("gateway_transactions", conn, index=False)
    settlements.to_sql("settlements", conn, index=False)
    bank_credits.to_sql("bank_credits", conn, index=False)
    rates.to_sql("rate_reference", conn, index=False)
    
    # Create tables for Exceptions, Matches, Clusters, Investigations
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE exceptions (
        exception_id TEXT PRIMARY KEY,
        order_id TEXT,
        financial_impact REAL,
        status TEXT,
        confidence REAL,
        cluster_id TEXT,
        root_cause_hypothesis TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE matches (
        match_id TEXT PRIMARY KEY,
        order_id TEXT,
        match_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE exception_clusters (
        cluster_id TEXT PRIMARY KEY,
        name TEXT,
        total_impact REAL,
        exception_count INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE resolution_rules (
        rule_id TEXT PRIMARY KEY,
        category TEXT,
        max_impact REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE audit_events (
        event_id TEXT PRIMARY KEY,
        record_id TEXT,
        stage TEXT,
        action TEXT,
        reason TEXT,
        confidence REAL,
        verification_result TEXT,
        approval_status TEXT,
        record_hash TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    conn.commit()
    conn.close()
    print("Database initialized successfully.")

if __name__ == "__main__":
    init_db()
