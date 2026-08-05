import csv
from datetime import datetime

dates = []
with open(r'warmup_domains_report.csv', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        last_active_str = row.get('Last Active Time', '').strip('" ')
        if last_active_str:
            dt = datetime.strptime(last_active_str, '%m/%d/%Y, %I:%M:%S %p')
            dates.append((dt, row.get('Server'), row.get('Domain')))

dates.sort(key=lambda x: x[0])
print("Earliest date in CSV:", dates[0][0])
print("Latest date in CSV:", dates[-1][0])
print("\nSample records between 24/07/2026 and 27/07/2026:")
count = 0
for dt, s, d in dates:
    if datetime(2026, 6, 24) <= dt <= datetime(2026, 6, 28):
        print(dt, s, d)
        count += 1
print(f"Total matching in late June 2026: {count}")
