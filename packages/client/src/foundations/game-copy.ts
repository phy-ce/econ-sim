import type {Locale} from '../ui/strings';
export {gameCopy} from '../ui/strings';
export type {GameCopy} from '../ui/strings';
export const groups=[
 {id:'foundations',ko:'기초 표현',en:'Foundations',description:['색·글자·밀도','Color, typography and density'],items:['color','type','density']},
 {id:'elements',ko:'기본 요소',en:'Elements',description:['수치·조작·선택·상태','Figures, actions, selection and states'],items:['quantity','button','selection','state']},
 {id:'patterns',ko:'정보 묶음',en:'Patterns',description:['값과 맥락을 함께 읽는 구조','Values with their context'],items:['metric','meter','ledger']},
 {id:'game',ko:'게임 전용',en:'Game components',description:['소유·생산·원인·시간','Ownership, production, causes and time'],items:['ownership','flow','operation','trace','pin','chart','map','technology','time']},
 {id:'screens',ko:'창 조합',en:'Compositions',description:['건설·관리와 시세','Construction, management and markets'],items:['construction','market']},
] as const;
export const componentInfo={
 color:['색의 역할','Color roles','조작, 손익, 소유, 상태가 서로 다른 뜻으로 읽히도록 나눕니다.','Separate actions, financial signs, ownership and states.','Semantic roles'],
 type:['글자와 정렬','Typography','제목, 본문, 숫자의 역할을 나누고 긴 이름과 수치를 함께 읽습니다.','Separate title, body and figure roles; keep names and values readable.','Typography'],
 density:['비교 밀도','Comparison density','같은 표를 두 밀도로 비교합니다. 글자를 줄이지 않고 행의 여백을 조절합니다.','Compare two table densities without shrinking the type.','Ledger'],
 quantity:['수치','Figures','단위와 부호를 보존하고, 결측과 0을 구분합니다. 정확값은 단일 툴팁으로 읽습니다.','Preserve units and signs. Distinguish missing from zero; expose exact values in a single tooltip.','Figure'],
 button:['조작 버튼','Action buttons','세계를 바꾸는 명령, 상세 탐색, 취소와 철거의 위계를 구분합니다.','Distinguish world-changing commands, navigation, cancellation and demolition.','ActionButton'],
 selection:['선택과 입력','Selection & input','범위와 후보를 선택합니다. 선택된 항목과 키보드 포커스는 별개입니다.','Choose scopes and candidates. Selection and keyboard focus stay distinct.','Segmented'],
 state:['상태','States','가동, 정지, 잠김, 처리 중을 색과 형태·라벨로 함께 구분합니다.','Communicate operating, stopped, locked and pending states through labels and shapes.','StateLabel'],
 metric:['맥락이 있는 지표','Contextual metrics','대상, 기간, 단위를 값과 붙여 다른 기준의 숫자를 섞지 않습니다.','Keep scope, period and units attached to the value.','Metric'],
 meter:['충족과 진행','Fill & progress','비율의 실제 숫자는 남기고 막대만 범위 안에 둡니다.','Preserve the real ratio while clamping only its visual fill.','FillBar'],
 ledger:['비교 장부','Comparison ledger','같은 열을 비교하고 선택한 상품의 상세로 이어집니다.','Compare aligned columns and follow the selected good.','MarketLedger'],
 ownership:['소유와 몫','Ownership & shares','왕실, 저택, 금융가를 비율과 기관 이름으로 읽고 선택합니다.','Read and select Crown, Manor and Financier ownership shares.','OwnershipStrip'],
 flow:['투입·산출','Input & output','생산 방식의 원료와 산출을 같은 단위와 레벨 기준으로 연결합니다.','Connect a method’s inputs and outputs on the same level and time basis.','ProductionFlow'],
 operation:['실제 가동','Actual operation','가동률, 일손, 효율, 원료 충족을 분리하고 결과를 함께 읽습니다.','Separate utilization, crew, efficiency and input fill from their combined result.','OperationBreakdown'],
 trace:['수치 분해','Value breakdown','합계를 구성하는 첫 줄과 그 안의 세부 항목을 명시적으로 펼칩니다.','Explicitly expand the contributions and details behind a total.','ContributionTree'],
 pin:['비교 고정','Pinned comparison','기준을 고정한 뒤 현재 값이 달라져도 같은 대상을 비교합니다.','Freeze a reference and compare the same target as the current value changes.','PinnedComparison'],
 chart:['시간 추이','Time series','기간과 단위를 붙여 변화를 읽고 수치 표로도 확인합니다.','Read change with its period and unit, with an equivalent table.','HistoryChart'],
 map:['지도 레이어와 범례','Map layer & legend','범주색과 연속값의 범례를 구분합니다.','Distinguish categorical territory colors from quantitative legends.','MapLegend'],
 technology:['기술 관계','Technology relationships','선행, 연구 가능, 완료 상태를 관계선과 라벨로 읽습니다.','Read prerequisites, availability and completion through connections and labels.','TechnologyPath'],
 time:['시간과 정지 사유','Time & stop reasons','배속과 시간 상태, 목표 도달 사유를 같은 위치에서 확인합니다.','Keep speed, clock state and the reason for stopping together.','TimeControls'],
 construction:['건설·건물 관리','Construction & management','선택한 건물의 방식, 가동과 공사를 같은 맥락에서 다룹니다.','Keep method, operation and construction in the selected building’s context.','ConstructionWorkspace'],
 market:['시세와 상품 상세','Market & good detail','상품 목록의 선택이 같은 상품의 상세와 추이로 이어집니다.','Connect the selected good to its details and history.','MarketWorkspace'],
} as const;
export type ComponentId=keyof typeof componentInfo;
export const componentTitle=(id:ComponentId,lang:Locale)=>componentInfo[id][lang==='ko'?0:1];
