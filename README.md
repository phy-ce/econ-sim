# Kingdom of Estera (econ-sim)

**Play in the browser: https://phy-ce.github.io/econ-sim/** (built from `main` on every push)

A management game about the market economy of an early-modern continent. Three kingdoms (Estera, Belonia and Karten) share seven regions. You play the crown of Estera. Each kingdom has two companies: the crown (a state company whose cash is the treasury) and one private company that runs private buildings and decides what to build with the savings held by manors and financial districts. About five million simulated people work, eat, save, migrate and change jobs. The economic loop is inspired by Victoria 3, but the rules and numbers are this game's own. The currency is the florin (ƒ).

The UI is a dashboard in a parchment and pixel-art style, in Korean and English. It shows labels, numbers and bars only. This README explains the rules.

## Running

```bash
npm install
npm run dev          # play locally (Vite, http://localhost:5173)
npm run build        # production build of the client
npm run typecheck    # simulation and client
npm run test:core    # money conservation, determinism (incl. save/load), value ranges (~10 s)
npm run test:long    # 20-year runs, seeds 1 and 2
npm test             # all simulation tests (~1 min)
```

Headless tools live in `packages/sim/cli`. Run them from `packages/sim`. Many take a tuning override as JSON (`'{}'` for none), then a seed and a number of years.

```bash
npx tsx cli/report.ts 1 10                # yearly table per kingdom: seed, years, [out.json], [TUNE JSON]
npx tsx cli/popdiag.ts '{}' 1 20          # population by class, living standard, construction starts
npx tsx cli/soldiag.ts '{}' 1 20          # lower-class income, taxes and cost of living
npx tsx cli/treasury.ts '{}' 1 20         # treasury, debt, policy levels, yearly budget per kingdom
npx tsx cli/jobdiag.ts '{}' 1 20          # unemployment, vacancies and free land per region
npx tsx cli/classdiag.ts '{}' 1 20        # employment and living standard per class
npx tsx cli/skilldiag.ts 1 20             # jobs, employment and qualified people per class
npx tsx cli/schooldiag.ts 1 20            # schools, literacy and qualified skilled workers
npx tsx cli/gentrydiag.ts 1 10            # gentry and high nobility: seats, income, living standard
npx tsx cli/regions.ts 1 5                # classes, wealth and buildings per region
npx tsx cli/methods_audit.ts              # every method at base prices and wages: wages, inputs, revenue, margin
bash cli/fast.sh perf.ts 2                # time per simulation step (fast.sh runs any CLI bundled with esbuild)
bash cli/sweep.sh out.jsonl '{}' '{"landTax":0.3}'   # compare tuning values, 20 years x seeds 1 and 2
python cli/sweepsum.py out.jsonl          # summarise a sweep
```

`sweep.sh` reads `SEEDS` (default `"1 2"`), `YEARS` (default 20), `PAR` (parallel runs) and `TIMING=1`.

## Encyclopedia

A standalone rules encyclopedia (every game rule, with live values from the code, worked examples computed by the real simulation functions, and a small live world you can advance) lives in `packages/encyclopedia`. It will later move into the game client.

```bash
npm run encyclopedia                                   # http://localhost:5200
npm run build -w @econ/encyclopedia                    # production build (packages/encyclopedia/dist)
```

Entries are data in `packages/sim/src/encyclopedia.ts`. Values are read from the code (`TUNE`, `data.ts` and other constants), never copied. Deep links use the hash: `/#price-formula`. The test `packages/sim/test/core/encyclopedia.test.ts` fails when a numbered section of `docs/DESIGN.md` or a `TUNE` key has no entry, or when an entry's function throws. On GitHub Pages it is served at `/econ-sim/encyclopedia/`.

Controls: `Space` pauses and resumes, `1`–`4` set the speed (1× = one game hour per real second, then 10×, 100×, 500×).

## Layout

```
packages/sim      Pure TypeScript simulation: no IO, seeded RNG, fully serializable state
  src/data.ts       goods, buildings, methods, techs, regions, needs, tuning values (TUNE)
  src/world.ts      starting state
  src/tick.ts       one day and one week, in order
  src/pops.ts       people: qualifications, literacy, growth
  src/labor.ts      hiring, job switching, migration
  src/market.ts     orders, tenant harvest, market clearing, prices
  src/production.ts production, construction, demolition, ownership buildings
  src/finance.ts    taxes, policy levels, reserves, dividends, crown bonds, minting
  src/budget.ts     budget preview for the UI
  src/ai.ts         weekly AI decisions (src/outlook.ts values investments)
  src/commands.ts   the single validated path for every action, player and AI alike
  cli/              headless runs, sweeps and diagnostics
packages/client   React + Vite. The simulation runs in a Web Worker; the UI only sends commands.
```

## World

- One tick is one day. A week is 7 days, a year 360.
- **Seven regions**, each with one market. The seed decides which kingdom holds which regions (at least two each, connected). Regions come in four tiers that set population, classes, education and land. In total about 5 million people (4.9 to 5.1 million in seeds 1–4).
- **Land.** One building level uses one cell of farmland, forest, ore veins or building plots. Administration and schools use no land. Each region has a perk, for example +10% output for mines in the Northern Mining District.
- **Goods.** Raw goods (grain, fibre, timber, iron ore, coal), processed goods (groceries, clothing, iron), finished goods (tools, furniture, machinery), luxuries (meat, fine clothes, luxury furniture) and **transport**, a service that cannot be stored.
- **Trade.** Merchants buy where goods are cheap and sell in a neighbouring region the next day. Shipping costs 6% of the cargo value where transport bought in the origin market covers it; the rest goes by porters at 30%, paid to local labourers. Crossing a border adds the destination kingdom's tariff (10%). There is no foreign trade.
- **Unsold output is lost.** Buildings keep no stock. Merchant cargo decays 2% a day until sold.
- **Prices** move 3% a day towards a target set by demand against supply, between 0.25× and 1.75× the base price.
- **Harvest conditions.** Each season (90 days), each region has a 5% chance of a drought, flood or wildfire. It cuts output and inputs on its land (farmland; also ore veins for floods and forest for wildfires) by 10–30% for one or two seasons. It spreads to each neighbour with a 50% chance.
- **Prospecting.** Mines need discovered veins, counted separately for iron and coal. A region knows 30% of its veins at the start. Each season, each region has a 10% chance per resource to find another 10% of its potential.

## Technology

Technology belongs to the kingdom. The crown researches, and the private company uses the crown's techs. At the start the crown knows the spinning wheel and craft guilds. There are 17 techs in four tiers, costing ƒ12, 24, 40 and 70 million. Tier 1 opens processing (milling, bloomery), printing (public schools, professional bureaucrats) and wagon roads (carters). Later tiers bring ironworking, timber scaffolding, coke smelting, improved implements and the steam engine, then steam pumps, power looms, food machinery, farm machinery, steam railways and iron frames.

Research is paid each week from the research budget (see Money). That money becomes income for skilled workers and experts.

## Construction and buildings

- **One level = 1,000 jobs.** Building numbers follow one rule: at base prices and base wages a basic method makes about 20% margin, the first improved method about 30%, the second about 40%. Inputs and outputs come in steps of 500 units a day.
- **The crown's construction offices build everything,** for both companies. Each crown starts with 10 office levels. Offices make construction points; better methods (timber scaffolding, iron frames) make more. A project gets at most 10 points per level a day. Half of each day's points go to crown projects and half to private ones, and either side can use what the other leaves. Private projects pay a fee for the points they use. A company can run 40 projects at once, each of 1 to 50 levels. An office with no project rests, and lets its workers go after 10 days.
- **One building per type, region and company.** Building again adds levels. The whole building uses one method.
- **Efficiency** = (0.4 + 0.6 × experience) × (1 + 1% per level, up to +20%) × (1 + regional perk). Experience grows 3.5% a day, halves on a method switch and is diluted by new levels.
- **Ownership buildings.** Every region has a manor and a financial district that grow by themselves. Each keeps a treasury. Every building level has exactly one owner: the state, or the manor or district that paid for it. Dividends of owned levels (by level count) and tenant rent go there and are split by shares among the seated owners: a high noble or capitalist holds 1 share, a gentry member 0.25. Owners take home 80% of what they receive (capitalists 70%); the rest stays in their treasury.
- **Cash reserves.** Every building that sells goods keeps 35% of its weekly profit as a reserve, up to **level × weekly output value at base price × 0.5 weeks**. Losses are paid from the reserve first. Only when it is empty does the AI cut utilisation or demolish. Profit beyond a full reserve is paid out as dividends.
- **Who pays for construction.** The crown pays for its own projects and owns those levels. Private projects are paid from manor and district treasuries: the same region and the favoured kind first (manors like farms, forests and mines; districts like the rest), whole levels each, pooling money if needed. Finished levels are split by money paid. When levels do not divide evenly, the larger payer takes the extra level and refunds the difference.
- **Privatisation.** Switch it on for a crown production building and manors and districts may buy one level a week at max(construction cost × 0.5, construction cost + one year of that level's profit). They buy when their treasury holds twice the price and the price pays back within 10 years. The money goes to the treasury; the level moves to the private building in the same region.
- **Demolition proceeds** go to the owner of the demolished level.
- **Demolition** removes one level a week. Half the materials are sold back over 28 days.

## Classes

| Class | Stratum | Base wage | Income |
|---|---|---|---|
| Tenant farmers | lower | – | the region's free farmland (see below) |
| Labourers | lower | 10 | wages |
| Farmers | lower | 10 | wages on grain farms, fibre farms and ranches (open to anyone, like labourer jobs; each company sets its own farmer wage) |
| Skilled workers | middle | 15 | wages, research funding |
| Experts | middle | 40 | wages, research funding |
| Gentry | middle | 30 | wages in hereditary administration and tutor schools, or a 0.25 share in the manor |
| Capitalists | upper | 40 | shares in the financial district |
| High nobility | upper | 40 | shares in the manor: dividends of the manor's levels and tenant rent |

- **Tenant farms.** All free farmland is tenant land, 1,000 tenants per cell. **Rent: 5% of the harvest is taken first and sold straight away; the money goes to the regional manor** (half as much from very poor tenants, wealth below 2). Of the rest, tenants keep what they use and sell the remainder for themselves. Under the land-tax law they pay a fixed land tax per head.
- **High nobles = manor seats.** Each manor's seats = its weekly economy (output value of owned levels + tenant harvest, at base prices) ÷ 16,000, approached 1% a day. Nobles beyond the seats become gentry; empty seats are filled by gentry. Starting nobles are a fifth of the tier value.
- **Wealth** is a standard of living from 1 to 99. It rises when income covers the next consumption basket and falls when it does not cover the current one. Living standard (wealth × fulfilment) sets births and deaths, as in Victoria 3. Hunger raises deaths sharply.
- **Qualifications.** Literacy (from schools and wealth) and wealth let people qualify for skilled, expert, gentry and noble seats. Anyone except capitalists and high nobility can take labourer and tenant seats.
- **Best-paying job.** People move to the best-paying seat they qualify for. The unemployed move at once. The employed move only for more than 1.1× their current income: 0.5% a day at 1.1×, up to 5% a day at 2×. Income per person is the wage, the tenant harvest value, or, for an ownership seat, the building's dividends × own shares ÷ all seated shares. A building hires at most max(3, 1% of its seats) a day.
- **Migration.** A region's pull is the income an unemployed person can expect there times its food fulfilment. People move when a neighbour pulls more than 1.3× harder, fastest (0.1% a day) at 2×. Employed people move at a quarter of that speed; employed upper classes stay.
- **Spare cash.** People hold 10 days of living costs and taxes. Each day 5% of anything above that goes to a treasury: their own manor or district if they sit there, otherwise the regional financial district.

## Money

- **Taxes.** One tax law at a time, and a change takes 180 days. *Land tax* (the start): ƒ0.02 a day per tenant. *Poll tax*: ƒ0.6 a day per non-tenant, available once financial districts hold 10% of owner assets. *Income tax*: 30% of non-tenant wages and dividends (subsistence exempt), available at 30%. Owner assets are the weekly output value of owned levels, plus tenant harvests for manors.
- **Investment law and the fund.** Financial districts are funds. Pops of the allowed classes buy units of their regional district with spare cash at the unit value (treasury + build cost of owned levels, per unit) and receive dividends by units. At first only nobles may buy; at a financial share of 5% / 10% / 15% the law can widen to experts / skilled / labourers and farmers. Spare cash of other classes and tenants goes to the district treasury without units. Districts employ two experts per owned level at ƒ20 a day plus 10% of the dividends received. There is no capitalist class.
- **Policy levels** (1–5, start 3). **Tax level** multiplies every tax rate by 0.6 / 0.8 / 1 / 1.2 / 1.4. **State wages**: every crown building pays base wage × wage index × 0.7 / 0.85 / 1 / 1.15 / 1.3; the wage index follows the average private labourer wage. **Research** spends 4.5% of weekly output × 0.5 / 0.75 / 1 / 1.5 / 2. The budget preview shows the weekly balance at each level before you change it.
- **Government buildings** (administration, offices, schools) always run at full capacity. The treasury pays their wages and inputs. Only the crown builds schools and administration.
- **Schools.** Noble tutors (100 gentry, 20,000 places) or, with printing, public schools (1,000 workers, 100,000 places). Education moves towards 0.1 + 0.8 × places ÷ population and raises literacy.
- **Treasury income**: taxes, tariffs, private construction fees and minting (ƒ1,000 + 3% of weekly output each week). The crown starts with 26 weeks of running costs.
- **Debt.** Only the crown borrows. When the treasury runs short it automatically issues bonds (new money) up to ƒ300,000 + 25% of yearly output, and repays them when it has spare cash. Interest is 0.025% a day. There is no bank: private companies never borrow. Short of cash, they buy fewer inputs, pay wages in proportion to what they have, and build only with manor and district treasuries.
- **Working cash.** The private company keeps two weeks of wages and inputs before paying dividends. When it has less, the owners of its levels top it up from their treasuries, by level count.
- **No investment pool.** Kept dividends and people's spare cash stay in manor and district treasuries, which pay for private construction and buy privatised levels. Ownerless money and excess trader cash go to the regional financial districts.
- **Money is conserved.** Total money changes only by minting, bond issues, repayments and bond interest. The tests check this to the cent.

## AI

The other two crowns and all three private companies are run by AI, through the same command path as the player. Each week:

- **Investment.** For every good the AI forms a long-run price from continent-wide demand (including projects under construction and better methods) against supply. Each candidate is valued at that price, with transport and the best utilisation (100/75/50/25%). It builds where yearly profit ÷ construction cost is above 0.2 and it can find at least half the workers, up to three projects a week.
- **Wages.** Raised while vacancies stay open, cut after a losing week. Kept between 1.2× what new workers earn now and 85% of value added.
- **Methods, utilisation, demolition.** Switches to a method that earns 5% more per unit. Cuts utilisation after four weeks of heavy loss and demolishes after 26 weeks of a losing last level, but not while the reserve still covers the loss.
- **Crown.** Picks the tax law with the higher expected revenue. Moves the policy levels by how many weeks of spending the treasury holds (tightens below 26 weeks, loosens above 52). Picks research by value ÷ cost. Adds office levels when the queue is longer than 30 days. Builds schools until regions can reach 60% literacy.

## Art

All pixel art (16×16 and 64×64) is original to this project. See `packages/client/public/ASSETS.md`.

## License

Copyright 2026 phy-ce. Licensed under the [Apache License 2.0](LICENSE).

You may use, modify and redistribute this project, including commercially, as long as you keep the copyright notice, the license and the [NOTICE](NOTICE) file, which credits the original author, in your distribution, and state the changes you made.
