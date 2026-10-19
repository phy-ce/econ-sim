# Kingdom of Estera (econ-sim)

A management game prototype about the market economy of Estera, a fictional early-modern kingdom. You run one trading house and compete with three AI houses across seven regional markets, while millions of simulated people work, eat, save, migrate and climb (or fall) between social classes. The economic loop is inspired by Victoria 3, but the rules and numbers are this game's own. The currency is the florin (ƒ).

The UI is a single-screen dashboard drawn in a parchment and pixel-art style. It is available in Korean and English.

## Running

```bash
npm install
npm run dev                                  # play in the browser (http://localhost:5173)
npm test                                     # simulation invariants, class structure, long-run stability
npm run build                                # production build of the client
npm run typecheck

# headless tools (packages/sim/cli)
npx tsx packages/sim/cli/run.ts --years 30 --seed 1   # long run, CSV output in packages/sim/out
npx tsx packages/sim/cli/sweep.ts --seeds 10 --years 10  # stability sweep across seeds
npx tsx packages/sim/cli/curve.ts --seeds 1,2         # wealth by class over 15 years
npx tsx packages/sim/cli/calib.ts 1,2                 # price vs base price and supply/demand per good
npx tsx packages/sim/cli/scale.ts 1                   # per good: sales, building supply, imports, price vs base, one level vs sales
npx tsx packages/sim/cli/methods.ts                   # every production method per level: inputs, outputs, wages, margin
npx tsx packages/sim/cli/diag.ts 1 5 10 15            # levels per method, efficiency, owner seats, class movements
```

Controls: `Space` pauses and resumes, `1`–`4` set the speed (1× = one game hour per real second, then 10×, 100×, 500×).

## Layout

```
packages/sim      Pure TypeScript simulation core: no IO, seeded RNG, fully serializable state
  src/data.ts       goods, buildings, production methods, techs, regions, classes, needs
  src/tick.ts       one day: interest, research, labour market, wages, grants, tenant farming,
                    orders, market clearing, production and construction, prices, population
  src/ai.ts         weekly decisions of AI houses: wages, methods, research, construction, dividends
  src/outlook.ts    market outlook used by the AI to value investments
  src/commands.ts   the single validated path for every action (player and AI alike)
  src/alerts.ts     weekly checks that raise notifications
  cli/              headless runs, sweeps and calibration tools
packages/client   React + Vite. The simulation runs in a Web Worker; the UI only sends commands.
```

## World

- **Seven regions**, each with a fixed number of land cells (arable, forest, ore, building plots). Each building level occupies one cell, except government administration and schools, which use no land (as government buildings do in Victoria 3); construction offices use building plots. Regions have hundreds to thousands of cells. Each region has its own market. Each region also has a perk, for example +10% output for mines in the northern mining district.
- **About 2.9 million people** at the start, almost all of them tenant farmers.
- **Tenant farms** grow only grain and liquor. Everyone drinks liquor, so it is what tenants sell; fibre and timber come only from fibre farms and lumber camps (each region starts with a few), and distilleries turn grain into liquor.
- **Twelve goods** in a production chain: raw goods (grain, fibre, timber, ore), processed goods (food, fuel, clothing, metal), finished goods (tools, furniture, precision instruments), plus **transport**, a service produced by railways.
- **Trade and transport.** Moving goods out of a region (traders, buying inputs from a neighbour, port imports and exports) requires transport bought in the origin market. Rail transport costs about 6% of the cargo value. Whatever cannot go by rail is carried by porters and carts at 30%, paid to local labourers. Only the port city trades abroad, and foreign buyers only pay low prices, so exporting is a loss-making outlet for surplus.
- **Harvest conditions.** Each season (90 days) each region has a 5% chance of a drought, flood or wildfire. It cuts the output and inputs of its land (farms, and mines or logging camps for floods and wildfires) by 10–30% in 5% steps for one or two seasons, and can spread to neighbouring regions.
- **Prospecting.** Mines need discovered ore veins, counted separately for iron and coal. Each region knows 30% of its veins at the start; every season each region has a 10% chance per resource to find another 10% of its potential, until its veins are all found.
- **Storage.** Unsold goods go to a regional warehouse that slowly decays and is capped at three times the target stock (about a month of trade).

## Technology

Each house researches on its own. At the start only primary industry is open: farms, lumber camps, mines and construction offices. Sixteen techs in five tiers unlock processing industries (milling, charcoal, spinning, bloomeries, printing for schools, wagonways for railways), then guild workshops, improved farming, water-powered saws and looms, coal fuel, pumped mines, food preservation, steel frames, steam railways and finally precision engineering. Research speed is capped by a daily budget, so even at full budget a first-tier tech takes about a month.

Some better methods need no tech at all: iron tools raise the output of farms, lumber camps and mines from day one, if tools can be bought.

## Construction and buildings

- **Small levels, big markets.** A building level is small compared with a regional market: every method makes fewer than 100 units a day per level (a basic farm level: 300 labourers and 12 skilled workers making 72 grain), while a region trades thousands to tens of thousands of units a day. Regional industries are built from tens to hundreds of levels, as in Victoria 3. Population is scaled by `POP_SCALE` (100) and building levels by `BUILDING_SCALE` (3) in `data.ts`.
- **Construction offices build everything.** Every house starts with a 33-level office. Projects advance with construction points produced daily by offices; better office methods (timber scaffolding, steel frames) are faster. A project builds 1 to 50 levels at once, and up to 40 projects run at once.
- **One building per type per region and house.** Building the same type again adds levels to the existing building, and the whole building shares one production method. The UI shows a level count with −, + and +10 buttons.
- **Owners.** Each level has owner seats (3 per level): capitalists for buildings on plots, landed aristocrats for farms, lumber camps and mines. The region's existing owners are seated in its buildings first, all buildings at the same fill ratio. Dividends go to the owner class of the building's region.
- **Efficiency** = experience × owners × scale × regional perk.
  - Experience: new staff start at 40% and reach 100% in about a month. Switching methods halves experience.
  - Owners: 0.7 + 0.3 × owner fill, so a building with no seated owners makes 30% less. The fill follows seat changes at 8% a day, like the work crew. The AI values new levels with the owner fill it can expect in that region.
  - Economies of scale: +10% output per 333 levels of the same building, up to +50%.
- **Technology changes the labour mix.** Tech methods replace labourers with skilled workers and experts: improved farming, water-powered sawing, pumped mining, power looms, food preservation, steam railways and the better office methods need 40–60% fewer labourers and about twice the skilled workers of the method they replace (experts where the work is technical), and produce each unit more cheaply. The no-tech iron tools methods keep the basic workforce and add tools.

## Classes

| Class | Stratum | Income |
|---|---|---|
| Tenant farmers | lower | farm a landlord's empty land; after rent and land tax they keep what they use that day and sell the rest |
| Labourers | lower | wages |
| Skilled workers, experts | middle | wages and research spending |
| Capitalists | upper | dividends from plot buildings |
| Landed aristocrats | upper | dividends from land buildings and tenant rent |

- **Wealth** is a standard of living from 1 to 99. It rises when spendable income exceeds the cost of the next consumption basket and falls when it cannot cover the current one.
- **Starvation** is based on food fulfilment, not wealth. Below 90% people die faster, and they migrate to better-fed neighbouring regions.
- **Tenants become labourers** when factories have vacancies, but slowly: new factories take weeks to months to staff. Education also caps how far this goes: labourers can be at most 25% + 2 × education (up to 95%) of the lower class. Laid-off labourers return to the land if there is room.
- **Promotion** to skilled worker or expert needs wealth, savings and vacancies, and is limited by the region's education level, which schools raise.
- **Upper classes are the hardest to enter.** Owner seats are filled first by conversion between capitalists and aristocrats, then by rich experts and skilled workers in well-educated regions only.
- **Migration.** A region's pull is the daily income an unemployed person can expect there, times its food fulfilment. Open jobs (and, for tenants and labourers, free tenant land) are shared out best-paid first among the region's unemployed; whoever gets no seat counts as earning nothing. People start moving when a neighbour pulls more than 30% harder, fastest at twice as hard.

### Population movement

All rates are per day and per region.

| Movement | Rate | Conditions |
|---|---|---|
| Tenant → labourer | ≤ 0.2% of tenants × (0.25 + 1.5 × education) | labourer vacancies above unemployed labourers (at most half the gap); labourers ≤ 25% + 2 × education of the lower class |
| Labourer → tenant | 0.1% of labourers × unemployment | unemployment ≥ 10%, free land |
| Labourer → skilled | ≈ 0.04% × education × wage pull (0.5–4) | wealth ≥ 6, savings ≥ ƒ8 a head, skilled vacancies, skilled share below 4% + 40% × education |
| Skilled → expert | ≈ 0.04% × 2 × (education − 25%) × wage pull | wealth ≥ 9, savings ≥ ƒ30 a head, expert vacancies |
| Expert → skilled, skilled → labourer | 0.05% × unemployment | unemployment ≥ 15% |
| Aristocrat → capitalist | ≤ 0.05% of aristocrats | aristocrats exceed their seats, capitalist seats vacant |
| Capitalist → aristocrat | ≤ 0.01% of capitalists | aristocrat seats vacant, wealth ≥ 18, savings ≥ ƒ150 a head, education ≥ 50% |
| Expert/skilled → capitalist | ≤ 0.01% of the source class (experts first) | vacant seats, education ≥ 40%, wealth ≥ 12, savings ≥ ƒ80 a head |
| Expert/skilled → aristocrat | ≤ 0.005% of the source class (experts first) | vacant seats, education ≥ 50%, wealth ≥ 12, savings ≥ ƒ100 a head |
| Surplus owners → skilled | 0.05% of the surplus | more owners than seats |
| Hiring | ≤ 2% of a building's slots | unemployed people of that skill in the region |
| Job switching | ≤ 1% of the lower-paying building's staff | wage ≥ 15% higher |
| Migration | ≤ 0.1% of the unemployed, ≤ 0.025% of the employed (full at a 2× gap) | neighbour pull > 1.3× here (the unemployed compare pulls, the employed their own pay × food); employed upper classes stay |

People carry their savings with them in every move. Migration notifications appear only when at least 0.5% of the source population has left within four weeks.
- Goods are substitutable within a need (food or grain, fuel or timber, clothing or fibre). Processed goods are preferred at equal price.

## Money

- Running costs are borrowed automatically from the bank when cash runs short. The credit limit grows with the book value of buildings.
- If debt exceeds 90% of the limit and cash cannot cover a day of wages, the bank steps in. For the player, a building is auctioned every four weeks. AI houses go bankrupt after twelve weeks.
- Household savings are partly deposited and partly invested in AI houses. The player raises capital only through loans.
- **Money is conserved**: money inside the kingdom plus the foreign account is constant, and the tests check it.

## AI

AI houses use the same command path as the player. Each week they build a market outlook: for every good, kingdom-wide demand (including inputs of projects under construction and latent demand from better methods they could switch to) against supply capacity (including projects under construction), turned into an expected long-run price. Every candidate building is valued the same way. Outputs are valued at the price after entry, minus transport. Inputs are valued at the price after purchase, plus transport. Utilisation is chosen to maximise profit. Houses with spare cash occasionally invest in an industry that does not pay yet, preferring scarce goods, which is how new production chains get started. Research is chosen by the value of the methods a tech unlocks, divided by its cost; printing (schools) also gets the value of the kingdom's skilled-worker shortage.

Each week a house can start up to three projects while its spare cash, the 40-project limit and a four-month office backlog allow. For each candidate it picks the largest chunk (20, 10, 5, 2 or 1 levels) whose expected annual return is still comfortably above the 40% hurdle. Labour is counted realistically: idle people in the region, tenants that can arrive within about 60 days at the tenant → labourer rate, a little from neighbours, and middle-class promotion if education allows. Schools are valued by their grant plus the regional skilled-worker shortage they relieve.

## Art

All pixel art (16×16 and 64×64) is original to this project. See `packages/client/public/ASSETS.md`.

## License

Copyright 2026 phy-ce. Licensed under the [Apache License 2.0](LICENSE).

You may use, modify and redistribute this project, including commercially, as long as you keep the copyright notice, the license and the [NOTICE](NOTICE) file, which credits the original author, in your distribution, and state the changes you made.
