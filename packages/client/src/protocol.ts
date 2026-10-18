import type { ConstructionActivity } from './constructionActivity';
import type { Command, HistoryPoint, World } from '@econ/sim';

/** 명령 오류 (영어 문장이 있으면 영어 화면에서 쓴다) */
export interface WorkerError { text: string; textEn?: string }

/** 메인 스레드 → 시뮬레이션 워커 */
export type ToWorker =
  | { type: 'new'; seed: number }
  | { type: 'load'; world: World }
  | { type: 'speed'; ticksPerSecond: number }
  | { type: 'command'; cmd: Command }
  | { type: 'stepOnce' }
  | { type: 'save' };

/** 시뮬레이션 워커 → 메인 스레드. 히스토리는 새로 생긴 점만 보낸다 */
export type FromWorker =
  | { type: 'state'; constructionActivity: ConstructionActivity | null; world: World; history: HistoryPoint[]; resetHistory: boolean; errors: WorkerError[]; hour: number }
  | { type: 'saved'; json: string };
