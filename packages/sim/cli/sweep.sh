#!/bin/bash
# 조정값 비교: ./cli/sweep.sh out.jsonl '<TUNE JSON>' '<TUNE JSON>' ...  (20년 × 시드 2개)
# 동시 실행 수는 PAR (기본: CPU 코어 수 − 2). 임시 파일은 지우지 않고 남긴다.
OUT=$1; shift; TMP=$(mktemp -d); i=0; PAR=${PAR:-$(( $(nproc) - 2 ))}
for c in "$@"; do for s in 1 2; do
  ( npx tsx cli/sweep.ts "$c" "$s" 20 > "$TMP/$i.json" 2> "$TMP/$i.err" || echo "FAIL $c $s: $(tail -3 "$TMP/$i.err")" >&2 ) &
  i=$((i+1)); if (( i % PAR == 0 )); then wait; fi
done; done
wait
cat "$TMP"/*.json > "$OUT"
