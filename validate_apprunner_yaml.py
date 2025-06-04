import yaml
import sys

try:
    with open("apprunner.yaml", "r") as f:
        data = yaml.safe_load(f)
    print("✅ YAML parsed successfully. Contents:")
    print(yaml.dump(data, sort_keys=False))
except Exception as e:
    print("❌ YAML parse error:", e)
    sys.exit(1)
