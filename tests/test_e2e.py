import unittest
import subprocess
import sys
import json
import sqlite3

class TestFinExE2E(unittest.TestCase):
    def test_pipeline_execution(self):
        # Run full pipeline
        result = subprocess.run([sys.executable, "scripts/run_pipeline.py"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, f"Pipeline failed: {result.stderr}")
        
        # Verify AMBIGUOUS is unresolved
        conn = sqlite3.connect("finex.db")
        conn.row_factory = sqlite3.Row
        ambiguous_exc = conn.execute("SELECT * FROM exceptions WHERE root_cause_category = 'AMBIGUOUS'").fetchall()
        for exc in ambiguous_exc:
            self.assertEqual(exc['status'], 'UNRESOLVED', "Ambiguous case should be unresolved")
            
        # Verify evaluation doesn't crash and returns metrics
        import backend.evaluation as eval_module
        metrics = eval_module.evaluate_batch()
        self.assertIn('causal_correctness', metrics)
        self.assertIn('resolution_correctness', metrics)
        self.assertIn('mathematical_correctness', metrics)
        
        conn.close()

if __name__ == '__main__':
    unittest.main()
