import csv
import json
import re
from datetime import datetime, timedelta

with open(r'warmup_domains_report.csv', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        print(row)
        if i > 5:
            break
