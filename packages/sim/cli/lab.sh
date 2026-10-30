#!/bin/bash
# 0b 측정 묶음: bash cli/lab.sh out.jsonl <명세.json> [이름 필터 정규식]   (packages/sim 에서)
#   예) bash cli/lab.sh .tmp/0b.jsonl ../../docs/overhaul/0B_SPECS.json        (optional 명세 빼고 전부)
#       bash cli/lab.sh .tmp/base.jsonl ../../docs/overhaul/0B_SPECS.json '^base$'
# 환경 변수: KEY 명세 파일 안 배열 키 (기본 specs, 예: KEY=specs20), PAR 동시 실행 수 (기본: CPU 코어 수 − 2), OPTIONAL=1 이면 optional 명세도 돈다, TSX=1 이면 tsx 로 (기본은 esbuild 로 한 번 묶어 node).
# 결과는 명세 순서대로 한 파일에 붙인다. 실행마다 걸린 시간은 끝 줄("log" 줄)의 ms 에 있다. 임시 폴더는 지우지 않고 경로를 stderr 에 찍는다.
OUT=$1; SPECS=$2; FILTER=${3:-.}; TMP=$(mktemp -d)
PAR=${PAR:-$(( $(nproc) - 2 ))}; (( PAR < 1 )) && PAR=1
RUN=(node "$TMP/lab.mjs")
KEYARG=(); [[ -n "$KEY" ]] && KEYARG=(--key "$KEY")
if [[ -n "$TSX" ]] || ! npx esbuild cli/lab.ts --bundle --platform=node --format=esm --target=node22 --outfile="$TMP/lab.mjs" --log-level=warning; then
  RUN=(npx tsx cli/lab.ts)
fi
mapfile -t LIST < <("${RUN[@]}" "$SPECS" "${KEYARG[@]}" --list)
T0=$(date +%s); n=0; idx=()
for line in "${LIST[@]}"; do
  read -r i name seed salt years opt <<< "$line"
  [[ "$opt" == 1 && -z "$OPTIONAL" ]] && continue
  [[ "$name" =~ $FILTER ]] || continue
  idx+=("$i")
done
echo "lab: ${#idx[@]} 실행 / 명세 ${#LIST[@]}, 동시 $PAR, 임시 $TMP" >&2
for i in "${idx[@]}"; do
  while (( $(jobs -rp | wc -l) >= PAR )); do wait -n; done
  ( "${RUN[@]}" "$SPECS" "${KEYARG[@]}" --index "$i" > "$TMP/$i.jsonl" 2> "$TMP/$i.err" || echo "FAIL $i: $(tail -3 "$TMP/$i.err")" >&2 ) &
  n=$((n+1))
done
wait
for i in "${idx[@]}"; do cat "$TMP/$i.jsonl"; done > "$OUT"
echo "lab: $n 실행, 전체 $(( $(date +%s) - T0 ))s → $OUT" >&2
exit 0
