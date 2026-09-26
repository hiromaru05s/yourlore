import json,subprocess,time,hashlib
from pathlib import Path
root=Path('.')
while True:
 log=(root/'study.log').read_text()
 if 'COMPLETE: games verified and statistics saved' in log:break
 if 'Traceback (most recent call last)' in log:raise RuntimeError('Study failed; inspect study.log')
 time.sleep(5)
for cmd in [['python3','harness/analyze-gambler.py'],['python3','harness/check-analysis.py'],['python3','harness/compare-rework.py'],['python3','harness/compare-supplement.py'],['python3','harness/peer-coverage.py'],['python3','harness/report-v52.py'],['node','harness/check-report.mjs','.']]:
 print('Running',cmd,flush=True);subprocess.run(cmd,check=True)
print('COMPLETE: validation and first report render',flush=True)
