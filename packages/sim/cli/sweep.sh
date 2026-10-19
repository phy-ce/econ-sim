#!/bin/bash
# 조정값 비교: ./cli/sweep.sh out.jsonl '<TUNE JSON>' '<TUNE JSON>' ...  (기본 20년 × 시드 1·2)
# 환경 변수: SEEDS (기본 "1 2"), YEARS (기본 20), PAR 동시 실행 수 (기본: CPU 코어 수 − 2),
#            TIMING=1 이면 실행마다 걸린 시간을 stderr 에 찍고 결과 줄에 time 을 넣는다.
#            TSX=1 이면 tsx 로 돌린다 (기본은 sweep.ts 를 esbuild 로 한 번 묶어 node 로 돌린다: 같은 결과, 더 빠름).
# 결과 줄은 입력 순서(조정값 → 시드)대로 쓴다. 임시 파일은 지우지 않고 남긴다 (경로를 stderr 에 찍는다).
OUT=$1; shift; TMP=$(mktemp -d); i=0
PAR=${PAR:-$(( $(nproc) - 2 ))}; SEEDS=${SEEDS:-"1 2"}; YEARS=${YEARS:-20}
(( PAR < 1 )) && PAR=1
echo "sweep: $# 조정값 × 시드 [$SEEDS] × ${YEARS}년, 동시 $PAR, 임시 $TMP" >&2
T0=$(date +%s)
RUN=(node "$TMP/sweep.mjs")
if [[ -n "$TSX" ]] || ! npx esbuild cli/sweep.ts --bundle --platform=node --format=esm --target=node22 --outfile="$TMP/sweep.mjs" --log-level=warning; then
  RUN=(npx tsx cli/sweep.ts)
fi
for c in "$@"; do for s in $SEEDS; do
  # 빈 자리가 날 때까지 기다린다 (한 묶음이 다 끝날 때까지 기다리지 않는다)
  while (( $(jobs -rp | wc -l) >= PAR )); do wait -n; done
  (
    a=$(date +%s%N)
    "${RUN[@]}" "$c" "$s" "$YEARS" > "$TMP/$i.json" 2> "$TMP/$i.err" || echo "FAIL $c $s: $(tail -3 "$TMP/$i.err")" >&2
    [[ -n "$TIMING" ]] && echo "run $i seed $s: $(( ($(date +%s%N) - a) / 1000000 ))ms $c" >&2
  ) &
  i=$((i+1))
done; done
wait
for (( j = 0; j < i; j++ )); do cat "$TMP/$j.json"; done > "$OUT"
[[ -n "$TIMING" ]] && echo "sweep: $i 실행, 전체 $(( $(date +%s) - T0 ))s" >&2
exit 0
