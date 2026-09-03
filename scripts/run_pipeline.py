import subprocess
import sys

def run_step(name, script):
    print(f"--- Running {name} ---")
    result = subprocess.run([sys.executable, "-m", script])
    if result.returncode != 0:
        print(f"Error: {name} failed with exit code {result.returncode}")
        sys.exit(result.returncode)
    print()

def main():
    run_step("Data Generation", "scripts.generate_data")
    run_step("Database Ingestion", "backend.ingest")
    run_step("Reconciliation", "backend.reconciliation")
    run_step("Investigation Loop", "backend.investigation_loop")
    run_step("Clustering", "backend.clustering")
    run_step("Evaluation", "backend.evaluation")
    print("Pipeline completed successfully!")

if __name__ == "__main__":
    main()
