import sqlite3
import pandas as pd
import uuid

DB_PATH = "finex.db"

def cluster_exceptions():
    conn = sqlite3.connect(DB_PATH)
    
    # Read exceptions
    exceptions = pd.read_sql("SELECT * FROM exceptions WHERE root_cause_hypothesis IS NOT NULL", conn)
    
    if exceptions.empty:
        conn.close()
        return

    # Group by category (we stored this in a new column or in hypothesis string? We need to add category column or extract it)
    # Wait, the DB exceptions table currently has: exception_id, order_id, financial_impact, status, confidence, cluster_id, root_cause_hypothesis
    # We should add a root_cause_category column to exceptions table to make clustering easy.
    # For now, let's assume we can fetch it, or we alter the table. Let's alter table if it doesn't exist.
    
    try:
        conn.execute("ALTER TABLE exceptions ADD COLUMN root_cause_category TEXT")
    except sqlite3.OperationalError:
        pass # Column exists
        
    exceptions = pd.read_sql("SELECT * FROM exceptions WHERE root_cause_category IS NOT NULL", conn)
    
    if exceptions.empty:
        conn.close()
        return
        
    clusters = exceptions.groupby('root_cause_category').agg(
        total_impact=('financial_impact', 'sum'),
        exception_count=('exception_id', 'count')
    ).reset_index()
    
    cluster_records = []
    
    for _, row in clusters.iterrows():
        cat = row['root_cause_category']
        # Find existing cluster or create
        existing = pd.read_sql(f"SELECT cluster_id FROM exception_clusters WHERE name = '{cat}'", conn)
        if not existing.empty:
            cid = existing.iloc[0]['cluster_id']
            # update
            conn.execute(f"UPDATE exception_clusters SET total_impact = {row['total_impact']}, exception_count = {row['exception_count']} WHERE cluster_id = '{cid}'")
        else:
            cid = f"CLU-{uuid.uuid4().hex[:8].upper()}"
            cluster_records.append({
                "cluster_id": cid,
                "name": cat,
                "total_impact": row['total_impact'],
                "exception_count": row['exception_count']
            })
            
        # Update exceptions with cluster_id
        conn.execute(f"UPDATE exceptions SET cluster_id = '{cid}' WHERE root_cause_category = '{cat}'")
        
    if cluster_records:
        pd.DataFrame(cluster_records).to_sql("exception_clusters", conn, if_exists="append", index=False)
        
    conn.commit()
    conn.close()
    
if __name__ == "__main__":
    cluster_exceptions()
