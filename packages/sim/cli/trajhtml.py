# 보고서 한 장짜리 HTML: python cli/trajhtml.py out.html a.jsonl ...  (= python cli/report.py --html out.html ...)
import os, subprocess, sys
sys.exit(subprocess.call([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'report.py'), '--html', *sys.argv[1:]]))
