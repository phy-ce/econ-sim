import type { ConstructionActivity } from './constructionActivity';
import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import type { Command, GameEvent, HistoryPoint, World } from '@econ/sim';
import type { FromWorker, ToWorker } from './protocol';
import { EN, KO } from './strings';
import type { Dict } from './strings';

const SAVE_KEY = 'estera-save-v7';
const PREF_KEY = 'estera-prefs-v1';

/** text 는 한국어, textEn 은 영어 (없으면 한국어로 보인다) */
export interface Toast { id: number; text: string; textEn?: string; kind: 'error' | 'info' | 'warn' | 'danger'; regionId?: number }

/** 사전의 같은 문구를 두 언어로 */
const both = (k: { [K in keyof Dict]: Dict[K] extends string ? K : never }[keyof Dict]) => ({ text: KO[k] as string, textEn: EN[k] as string });

interface Prefs { pauseOnDanger: boolean }

function loadPrefs(): Prefs {
  try { return { pauseOnDanger: true, ...JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}') }; } catch { return { pauseOnDanger: true }; }
}

const eventKey = (e: GameEvent) => `${e.tick}|${e.companyId}|${e.text}`;

export function useGame() {
  const workerRef = useRef<Worker | null>(null);
  const [constructionActivity,setConstructionActivity] = useState<ConstructionActivity | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [hour, setHour] = useState(0);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [speed, setSpeedState] = useState(0);
  const speedRef = useRef(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastReadTick, setLastReadTick] = useState(-1);
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);
  const prefsRef = useRef(prefs);
  const toastId = useRef(0);
  const seenEvents = useRef<Set<string> | null>(null);

  const toast = useCallback((msg: { text: string; textEn?: string }, kind: Toast['kind'] = 'info', regionId?: number) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-4), { id, text: msg.text, textEn: msg.textEn, kind, regionId }]);
    const ttl = kind === 'danger' ? 12000 : kind === 'warn' ? 8000 : 4000;
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }, []);

  const send = useCallback((msg: ToWorker) => workerRef.current?.postMessage(msg), []);

  const setSpeed = useCallback((ticksPerSecond: number) => {
    speedRef.current = ticksPerSecond;
    setSpeedState(ticksPerSecond);
    send({ type: 'speed', ticksPerSecond });
  }, [send]);

  useEffect(() => {
    const worker = new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onerror = (event) => console.error('Simulation worker failed:', event.message, event.filename, event.lineno);
    worker.onmessage = (e: MessageEvent<FromWorker>) => {
      const msg = e.data;
      if (msg.type === 'state') {
        setWorld(msg.world);
        setConstructionActivity(msg.constructionActivity);
        setHour(msg.hour);
        if (import.meta.env.DEV) (globalThis as { __world?: World }).__world = msg.world;
        setHistory((h) => (msg.resetHistory ? msg.history : msg.history.length ? [...h, ...msg.history] : h));
        for (const err of msg.errors) toast(err, 'error');

        // 내 상회·왕국 전체에 생긴 새 소식: 주의 이상은 알림으로 띄우고, 위험은 게임을 멈춘다
        const keys = new Set(msg.world.events.map(eventKey));
        if (seenEvents.current) {
          let pause = false;
          for (const ev of msg.world.events) {
            if (seenEvents.current.has(eventKey(ev))) continue;
            // 내 상회 소식은 모두, 왕국 전체 소식은 위험만 알림으로 띄운다 (나머지는 알림 목록에만)
            if (ev.companyId === 100 || (ev.companyId === null && ev.kind === 'danger')) toast(ev, ev.kind, ev.regionId);
            else continue;
            if (ev.kind === 'danger' && ev.companyId === 100) pause = true;
          }
          if (pause && prefsRef.current.pauseOnDanger && speedRef.current > 0) {
            speedRef.current = 0;
            setSpeedState(0);
            worker.postMessage({ type: 'speed', ticksPerSecond: 0 } satisfies ToWorker);
          }
        }
        seenEvents.current = keys;
      } else if (msg.type === 'hour') {
        setHour(msg.hour);
      } else if (msg.type === 'saved') {
        try {
          localStorage.setItem(SAVE_KEY, msg.json);
          toast(both('saved'));
        } catch {
          toast(both('saveFailed'), 'error');
        }
      }
    };
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) worker.postMessage({ type: 'load', world: JSON.parse(saved) } satisfies ToWorker);
    } catch { /* 저장소를 못 읽으면 새 게임 */ }
    return () => worker.terminate();
  }, [toast]);

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    const next = { ...prefsRef.current, ...p };
    prefsRef.current = next;
    setPrefsState(next);
    try { localStorage.setItem(PREF_KEY, JSON.stringify(next)); } catch { /* 선택 사항 */ }
  }, []);

  return useMemo(() => ({
    world,
    constructionActivity,
    hour,
    history,
    speed,
    toasts,
    prefs,
    setPrefs,
    lastReadTick,
    markRead: () => { if (world) setLastReadTick(world.tick); },
    dismissToast: (id: number) => setToasts((t) => t.filter((x) => x.id !== id)),
    setSpeed,
    command: (cmd: Command) => send({ type: 'command', cmd }),
    stepOnce: () => send({ type: 'stepOnce' }),
    save: () => send({ type: 'save' }),
    load: () => {
      try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (!saved) { toast(both('noSave'), 'error'); return; }
        seenEvents.current = null;
        send({ type: 'load', world: JSON.parse(saved) });
        toast(both('loaded'));
      } catch {
        toast(both('loadFailed'), 'error');
      }
    },
    newGame: () => {
      seenEvents.current = null;
      setLastReadTick(-1);
      send({ type: 'new', seed: Math.floor(Math.random() * 1e6) });
      toast(both('started'));
    },
  }), [world, constructionActivity, hour, history, speed, toasts, prefs, setPrefs, lastReadTick, setSpeed, send, toast]);
}

export type Game = ReturnType<typeof useGame>;
