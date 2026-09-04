import sqlite3
import json
import argparse
from collections import defaultdict
import os

def generate_sample(n_per_category: int, ground_truth_path: str = 'data/ground_truth/ground_truth.json', db_path: str = 'finex.db', output_path: str = 'data/sample_selection.json'):
    # Load ground truth
    with open(ground_truth_path, 'r') as f:
        ground_truth = json.load(f)
    
    gt_map = {g['order_id']: g['true_category'] for g in ground_truth}
    
    # Query database for UNRESOLVED exceptions
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT exception_id, order_id FROM exceptions WHERE status = 'UNRESOLVED'")
    unresolved = cursor.fetchall()
    
    # Group unresolved by category
    category_to_exceptions = defaultdict(list)
    for row in unresolved:
        cat = gt_map.get(row['order_id'])
        if cat:
            category_to_exceptions[cat].append(row['exception_id'])
            
    # Sample N per category
    selected_ids = []
    print(f"Selecting {n_per_category} exceptions per category:")
    for cat, exc_list in category_to_exceptions.items():
        sample = exc_list[:n_per_category]
        selected_ids.extend(sample)
        print(f"  {cat}: {sample}")
        
    print(f"\nTotal selected: {len(selected_ids)}")
    
    # Write to file
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(selected_ids, f, indent=2)
    print(f"Saved to {output_path}")
    
    conn.close()
    return selected_ids

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--n-per-category", type=int, default=1, help="Number of exceptions to sample per true category")
    args = parser.parse_args()
    generate_sample(args.n_per_category)
