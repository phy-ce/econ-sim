// 도트 그림: 16×16, 먹 테두리에 3~4 단계 음영을 넣은 이 프로젝트의 원작 그림 (출처는 public/ASSETS.md).
// 팔레트 글자마다 1×1 칸들을 하나의 <path> 로 묶어 SVG 로 그린다. 벡터라서 어느 크기에서도 칸 모서리가 또렷하다.
import type { CSSProperties } from 'react';
import type { GoodId, PopClass } from '@econ/sim';
import { SPRITES } from './spriteData';
import BIG from './sprites64.json';

export type SpriteName = keyof typeof SPRITES;

/** 팔레트 (h·l 은 아래 칸 위에 얹는 그늘·빛) */
const PALETTE: Record<string, { fill: string; opacity?: number }> = {
  k: { fill: '#2b2118' }, s: { fill: '#e2b48c' }, S: { fill: '#c08e66' }, y: { fill: '#e0b54a' }, Y: { fill: '#a67c2e' },
  w: { fill: '#fbf6ea' }, g: { fill: '#7fae55' }, G: { fill: '#3f6b33' }, b: { fill: '#8a5a33' }, B: { fill: '#4f3520' },
  o: { fill: '#9a938a' }, O: { fill: '#5c5650' }, u: { fill: '#6f98a6' }, U: { fill: '#3d5f6a' }, r: { fill: '#c0603f' }, R: { fill: '#7e3424' },
  h: { fill: '#000', opacity: 0.28 }, l: { fill: '#fff', opacity: 0.55 },
};
const ORDER = ['k', 'R', 'r', 'B', 'b', 'O', 'o', 'U', 'u', 'G', 'g', 'Y', 'y', 'S', 's', 'w', 'a', 'h', 'l'];

function Paths({ name, accent }: { name: SpriteName; accent?: string }) {
  const def = SPRITES[name] as { a: string | null; p: Record<string, string> };
  return (
    <>
      {ORDER.map((key) => {
        const d = def.p[key];
        if (!d) return null;
        const pal = key === 'a' ? { fill: accent ?? def.a ?? '#8a3b1f' } : PALETTE[key];
        return <path key={key} d={d} fill={pal.fill} fillOpacity={pal.opacity} />;
      })}
    </>
  );
}

/** HTML 안의 도트 그림. size 는 16의 배수를 권한다 (16·32·48) */
export function Sprite({ name, size = 16, label, accent, className = '', style }: {
  name: SpriteName; size?: number; label?: string; accent?: string; className?: string; style?: CSSProperties;
}) {
  return (
    <svg className={`spr ${className}`} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges"
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={style}>
      <Paths name={name} accent={accent} />
    </svg>
  );
}

/** SVG 안(지도·도넛)에 찍는 도트 그림 */
export function SvgSprite({ name, x, y, size, accent }: { name: SpriteName; x: number; y: number; size: number; accent?: string }) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      <Paths name={name} accent={accent} />
    </svg>
  );
}

const BUILDING_SPRITE: Record<string, SpriteName> = {
  farm: 'b-farm', lumber: 'b-lumber', mine: 'b-mine', foodplant: 'b-foodplant', fuelworks: 'b-fuelworks', textile: 'b-textile',
  smelter: 'b-smelter', workshop: 'b-workshop', fab: 'b-fab', school: 'b-school', builder: 'b-builder', railway: 'b-railway',
};

export const GoodSprite = ({ g, size = 16 }: { g: GoodId; size?: number }) =>
  <Sprite name={(g in SPRITES ? g : 'coin') as SpriteName} size={size} />;
export const BuildingSprite = ({ typeId, size = 32 }: { typeId: string; size?: number }) =>
  <Sprite name={BUILDING_SPRITE[typeId] ?? 'b-builder'} size={size} />;
export const ClassSprite = ({ c, size = 16 }: { c: PopClass; size?: number }) =>
  <Sprite name={`c-${c}` as SpriteName} size={size} />;

// ---------------------------------------------------------------- 64×64 큰 그림 (.tmp/px64/gen.py 로 생성)

type Big = { id: string; name: string; layers: { fill: string; d: string }[] };
const BIG_BY_ID = Object.fromEntries((BIG as Big[]).map((s) => [s.id, s])) as Record<string, Big>;
/** 게임 id → 64×64 그림 id */
const BIG_ALIAS: Record<string, string> = {
  unskilled: 'laborer', foodplant: 'factory', railway: 'locomotive',
};
export const hasBig = (id: string) => !!BIG_BY_ID[BIG_ALIAS[id] ?? id];

function BigPaths({ id }: { id: string }) {
  const s = BIG_BY_ID[BIG_ALIAS[id] ?? id];
  if (!s) return null;
  return <>{s.layers.map((l, i) => <path key={i} d={l.d} fill={l.fill} />)}</>;
}

/** 64×64 도트 그림. size 는 64의 배수 또는 32 (반 크기) */
export function Sprite64({ id, size = 64, label }: { id: string; size?: number; label?: string }) {
  return (
    <svg className="spr spr64" width={size} height={size} viewBox="0 0 64 64" shapeRendering="crispEdges"
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <BigPaths id={id} />
    </svg>
  );
}

/** SVG 안에 찍는 64×64 그림 */
export function SvgSprite64({ id, x, y, size }: { id: string; x: number; y: number; size: number }) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 64 64" shapeRendering="crispEdges" aria-hidden="true">
      <BigPaths id={id} />
    </svg>
  );
}
