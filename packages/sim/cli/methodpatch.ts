// 방식 표 덮어쓰기 (비교 실행용, data.ts 를 고치지 않고 후보를 돌린다): METHOD_PATCH 환경 변수에 JSON 파일 경로.
// 내용: { "<방식 id>": { "workers": {...}, "inputs": {...}, "outputs": {...} } }. 적은 칸을 통째로 바꾼다.
// lab.ts 맨 앞에서 import 한다: data.ts 가 평가된 뒤, 방식 표로 값을 미리 세는 다른 모듈(outlook·metrics)이 평가되기 전이다
import { readFileSync } from 'node:fs';
import { BUILDING_TYPES } from '../src/data';

const path = process.env.METHOD_PATCH;
if (path) {
  const patch = JSON.parse(readFileSync(path, 'utf8')) as Record<string, Record<string, unknown>>;
  for (const [id, p] of Object.entries(patch)) {
    const m = BUILDING_TYPES.flatMap((t) => t.methods).find((x) => x.id === id);
    if (!m) throw new Error(`방식 없음: ${id}`);
    Object.assign(m, p);
  }
}
