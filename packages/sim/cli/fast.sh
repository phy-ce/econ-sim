#!/bin/bash
# tsx 없이 빠르게 실행: bash cli/fast.sh <cli 파일> [인자...]   예) bash cli/fast.sh perf.ts 2
# esbuild 로 한 파일로 묶어 node 로 돌린다. 결과는 tsx 와 같고, tsx 가 함수마다 넣는 이름 붙이기 코드(__name)가 없어 더 빠르다.
# 묶은 파일은 packages/sim/out/<이름>.mjs 에 남는다 (out/ 은 git 이 무시한다).
set -e
cd "$(dirname "$0")/.."
F=$1; shift
[[ "$F" != */* ]] && F="cli/$F"
OUTF="out/$(basename "${F%.ts}").mjs"
mkdir -p out
npx esbuild "$F" --bundle --platform=node --format=esm --target=node22 --outfile="$OUTF" --log-level=warning
exec node "$OUTF" "$@"
