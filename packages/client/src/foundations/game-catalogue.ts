import type {ComponentId} from './game-copy';
export const dependencies:Record<ComponentId,ComponentId[]>={
 color:[],type:[],density:['type'],quantity:['type'],button:['color','type'],selection:['button'],state:['color','type'],metric:['quantity'],meter:['quantity'],ledger:['quantity','selection'],ownership:['quantity','button'],flow:['quantity'],operation:['metric','meter','state'],trace:['metric','quantity'],pin:['metric','button'],chart:['quantity','selection'],map:['selection','color'],technology:['state','button'],time:['selection','state','button'],construction:['ownership','flow','operation','button'],market:['ledger','metric','chart','meter'],
};
export const componentSpecs:Partial<Record<ComponentId,{props:string[][];snippet:string}>>={
 quantity:{props:[['value','number | null'],['unit','string'],['signed / compact','boolean']],snippet:'<Figure value={12480.5} unit="ƒ" />\n<Figure value={null} />'},
 button:{props:[['kind','primary | secondary | navigation | danger | quiet'],['disabled','boolean'],['onClick','MouseEventHandler']],snippet:'<ActionButton kind="primary" onClick={build}>\n  <Plus size={16} />{t.build}\n</ActionButton>'},
 selection:{props:[['options','{ id, label }[]'],['value','string'],['onChange','(id: string) => void']],snippet:'<Segmented label={t.ownership}\n  options={owners} value={owner} onChange={setOwner} />'},
 state:{props:[['state','active | stopped | locked | pending | complete']],snippet:'<StateLabel state={stopped ? "stopped" : "active"} />'},
 metric:{props:[['label / scope / period','string'],['value','number | null'],['unit / signed','string / boolean']],snippet:'<Metric label={t.profit} value={profit}\n  unit="ƒ" period={t.perWeek} scope={region} signed />'},
 meter:{props:[['label','string'],['value','number | null'],['figure','ReactNode'],['height','number']],snippet:'<FillBar label={t.staffing} value={0.82}\n  figure={<>410 / 500</>} />'},
 ownership:{props:[['shares','Record<Owner, number>'],['selected','crown | manor | finance'],['onSelect','(owner: Owner) => void']],snippet:'<OwnershipStrip shares={shares}\n  selected={owner} onSelect={setOwner} />'},
 flow:{props:[['type','building definition id'],['methodId','method definition id'],['iconSize','number']],snippet:'<ProductionFlow type="lumber" methodId={methodId} />'},
 operation:{props:[['utilization / crew / efficiency / inputFill','number'],['harvest','number | undefined'],['stopped','boolean'],['onStop','callbacks']],snippet:'<OperationBreakdown utilization={utilization}\n  crew={crew} efficiency={efficiency} inputFill={inputFill} stopped={stopped}\n  onStop={toggleStop} />'},
 ledger:{props:[['selected','GoodId'],['onSelect','(id: GoodId) => void'],['compact / query','boolean / string'],['iconSize / rowPadding / textSize','number'],['entries','{ id: GoodId, price: number, ratio: number | null }[]']],snippet:'<MarketLedger selected={good} onSelect={setGood}\n  compact={compact} query={query} />'},
 trace:{props:[['rows','Contribution[]'],['total','number | undefined'],['unit','string']],snippet:'<ContributionTree rows={contributions} total={profit} />'},
 technology:{props:[['nodes','{ id, label, state }[]'],['onResearch','(id: string) => void']],snippet:'<TechnologyPath nodes={technologies} onResearch={research} />'},
 pin:{props:[['value','number']],snippet:'<PinnedComparison value={currentProfit} />'},
 chart:{props:[['entries','readonly number[]'],['label / period','string'],['height / offset','number']],snippet:'<HistoryChart entries={weeklyProfit} />'},
 construction:{props:[['initialType','lumber | farm | workshop']],snippet:'<ConstructionWorkspace />'},
 market:{props:[],snippet:'<MarketWorkspace />'},
};
