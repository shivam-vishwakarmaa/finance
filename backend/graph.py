import sqlite3
import pandas as pd
import networkx as nx

DB_PATH = "finex.db"

def build_transaction_subgraph(order_id):
    """
    Builds a lightweight NetworkX transaction graph for a specific order exception.
    Returns the graph and a structured context dict for the AI.
    """
    conn = sqlite3.connect(DB_PATH)
    
    order = pd.read_sql(f"SELECT * FROM orders WHERE order_id = '{order_id}'", conn)
    gtws = pd.read_sql(f"SELECT * FROM gateway_transactions WHERE order_id = '{order_id}'", conn)
    sets = pd.read_sql(f"SELECT * FROM settlements WHERE order_id = '{order_id}'", conn)
    
    G = nx.DiGraph()
    
    context = {
        "order": {},
        "gateway_transactions": [],
        "settlements": [],
        "bank_credits": [],
        "rates": []
    }
    
    if not order.empty:
        o = order.iloc[0].to_dict()
        G.add_node(o['order_id'], type='order', **o)
        context["order"] = o
        
        # Add rate reference
        date_str = o['order_date'][:10]
        rates = pd.read_sql("SELECT * FROM rate_reference", conn)
        applicable_rate = None
        for _, rate in rates.iterrows():
            if rate['effective_from'] <= date_str <= rate['effective_to']:
                applicable_rate = rate.to_dict()
                break
        
        if applicable_rate:
            G.add_node(applicable_rate['rate_version'], type='rate', **applicable_rate)
            G.add_edge(o['order_id'], applicable_rate['rate_version'], relation='applies_rate')
            context["rates"].append(applicable_rate)
            
    for _, gtw in gtws.iterrows():
        g = gtw.to_dict()
        G.add_node(g['gateway_txn_id'], type='gateway', **g)
        G.add_edge(order_id, g['gateway_txn_id'], relation='has_gateway_txn')
        context["gateway_transactions"].append(g)
        
    for _, s in sets.iterrows():
        st = s.to_dict()
        G.add_node(st['settlement_id'], type='settlement', **st)
        
        # Connect to gateway txn by reference if available, else by order
        matched_gtw = gtws[gtws['reference'] == st['reference']]
        if not matched_gtw.empty:
            G.add_edge(matched_gtw.iloc[0]['gateway_txn_id'], st['settlement_id'], relation='has_settlement')
        else:
            G.add_edge(order_id, st['settlement_id'], relation='has_settlement')
            
        context["settlements"].append(st)
        
        # Bank credits logic: we assume bank credits are grouped by date
        # So we look for bank credit that covers this settlement date
        date_str = st['settlement_date']
        # The generator did credit_date = settlement_date + 1
        bcs = pd.read_sql(f"SELECT * FROM bank_credits WHERE credit_date > '{date_str}' LIMIT 1", conn)
        for _, bc in bcs.iterrows():
            b = bc.to_dict()
            G.add_node(b['bank_txn_id'], type='bank_credit', **b)
            G.add_edge(st['settlement_id'], b['bank_txn_id'], relation='included_in_bank_credit')
            context["bank_credits"].append(b)
            
    conn.close()
    
    return G, context

if __name__ == "__main__":
    G, ctx = build_transaction_subgraph("ORD-1000")
    print(f"Nodes: {G.number_of_nodes()}, Edges: {G.number_of_edges()}")
    print("Context keys:", ctx.keys())
