import type { World } from '@econ/sim';

export type LiveToWorker = { type: 'reset'; seed: number } | { type: 'goto'; tick: number };
export type LiveFromWorker = { type: 'world'; world: World } | { type: 'progress'; tick: number; target: number };
