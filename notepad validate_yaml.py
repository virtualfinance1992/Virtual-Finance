import yaml
import json

# Point this to your local apprunner.yaml
file_path = r"C:\Users\pc5\Virtual-Finance\apprunner.yaml"

try:
    with open(file_path, 'r') as f:
        data = yaml.safe_load(f)
    print("YAML loaded successfully. Parsed structure:")
    print(json.dumps(data, indent=2))
except Exception as e:
    print("Error parsing YAML:", e)
