import os
import time
import sqlite3
import pandas as pd
import json
import argparse
import numpy as np
from .graph import build_transaction_subgraph
from .ai_investigator import investigate_exception, MockProvider
from .verifier import verify_adjustment
from .governance import apply_governance

class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)

DB_PATH = "finex.db"

def run_investigations(exception_ids_file: str = None):
    conn = sqlite3.connect(DB_PATH)
    
    # Add root_cause_category column if it doesn't exist
    try:
        conn.execute("ALTER TABLE exceptions ADD COLUMN root_cause_category TEXT")
        conn.execute("ALTER TABLE exceptions ADD COLUMN evidence_package TEXT")
        conn.commit()
    except sqlite3.OperationalError:
        pass
        
    query = "SELECT * FROM exceptions WHERE status = 'UNRESOLVED'"
    exceptions = pd.read_sql(query, conn)
    
    if exception_ids_file and os.path.exists(exception_ids_file):
        with open(exception_ids_file, 'r') as f:
            allowed_ids = json.load(f)
        exceptions = exceptions[exceptions['exception_id'].isin(allowed_ids)]
        print(f"Filtering to {len(exceptions)} exceptions specified in {exception_ids_file}")
    
    provider = None
    use_real_ai = bool(os.environ.get("GEMINI_API_KEY"))
    
    for _, exc in exceptions.iterrows():
        exc_id = exc['exception_id']
        order_id = exc['order_id']
        
        # 1. Graph Context
        G, context = build_transaction_subgraph(order_id)
        
        # 2. AI Hypothesis
        ai_result = investigate_exception(exc_id, context, provider)
        
        # 3. Deterministic Verifier
        verification = verify_adjustment(order_id, ai_result.get('proposed_adjustment_amount', 0.0))
        
        # 4. Governance
        decision = apply_governance(ai_result, verification)
        
        # 5. Evidence Package
        evidence = {
            "hypothesis": ai_result,
            "verification": verification,
            "governance": decision,
            "nodes": list(G.nodes()),
            "edges": list(G.edges(data=True))
        }
        
        # Update DB
        conn.execute(
            "UPDATE exceptions SET status = ?, confidence = ?, root_cause_hypothesis = ?, root_cause_category = ?, evidence_package = ? WHERE exception_id = ?",
            (decision, ai_result.get('confidence', 0.0), ai_result.get('root_cause_hypothesis'), ai_result.get('root_cause_category'), json.dumps(evidence, cls=NpEncoder), exc_id)
        )
        
        if use_real_ai:
            time.sleep(4.5)
            
    conn.commit()
    conn.close()
    
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--exception-ids-file", type=str, help="Path to JSON file containing exception IDs to process", default=None)
    args = parser.parse_args()
    run_investigations(args.exception_ids_file)
