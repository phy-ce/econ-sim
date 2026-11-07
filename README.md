# Kingdom of Estera (econ-sim)

**English** | [한국어](README.ko.md)

**Play in the browser: https://phy-ce.github.io/econ-sim/** (built from `main` on every push)
· Rules encyclopedia: https://phy-ce.github.io/econ-sim/encyclopedia/
· Experiment reports: https://phy-ce.github.io/econ-sim/reports/

A management game about the market economy of an early-modern continent. Three kingdoms (Estera, Belonia and Karten) share seven regions. You play the crown of Estera. Each kingdom has two companies: the crown (a state company whose cash is the treasury) and one private company that runs private buildings and decides what to build with the savings held by manors and financial districts. About five million simulated people work, eat, save, migrate and change jobs. The economic loop is inspired by Victoria 3, but the rules and numbers are this game's own. The currency is the florin (ƒ).

The UI is a dashboard in a parchment and pixel-art style, in Korean and English. It shows labels, numbers and bars only. This README explains the rules.

## Highlights

- **Living economy:** about five million simulated people work, eat, save, migrate and change jobs across three kingdoms and seven regions.
- **Same command path:** AI crowns and companies act through the same validated commands as the player.
- **Tested simulation:** tests check money conservation, determinism (including save and load) and value ranges, and 20-year runs exercise long-term play.
- **Open rules and data:** a rules encyclopedia reads its values from the code, and experiment reports compare rule variants across seeds.

## Running

```bash
npm install
npm run dev          # play locally (Vite, http://localhost:5173)
npm run build        # production build of the client
npm run typecheck    # simulation, client and encyclopedia
npm run test:core    # money conservation, determinism (incl. save/load), value ranges (~1 min)
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

## Experiment reports

Comparison runs of the simulation (yearly values for every metric, several rule variants and seeds) are published as a small viewer in `tools/reports`: pick a report, pick metrics, hover a chart for the year's values, or switch to yearly tables. Seeds can be averaged or shown one by one.

```bash
cd packages/sim
bash cli/sweep.sh out.jsonl '{}' '{"aristStart":0.1}'                       # 20 years x seeds 1 2
TITLE="High nobles 1/10" L="main,1/10" python cli/report.py 2026-10-22-arist10 out.jsonl   # adds tools/reports/public/data/<id>.json
cd ../.. && npm run reports                                                # http://localhost:5201
```

`report.py` also reads per-year diagnostic files (one JSON line per year with `y` and `seed`; nested objects become `stock.gov` style keys); pass `name=file` to name runs. Report files (`format: 2`) list metric names once in `keys` and store one row `[year, value, ...]` per run, seed and year (3 significant digits); `python cli/report.py --convert` rewrites older reports. Every metric has a Korean name, group and unit; hovering a metric name shows its definition when it has one. On GitHub Pages the viewer is served at `/econ-sim/reports/`, deep links use the hash (`/reports/#2026-10-22-arist10`).

Controls: `Space` pauses and resumes, `1`–`5` set the speed (1× = about one game day per real second, then 2×, 3×, 4× and 10× for debugging).

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
  src/economy.ts    shared rules: capacity, ownership, wages paid, money identity
  src/finance.ts    taxes, policy levels, reserves, dividends, crown bonds, minting
  src/policy.ts     laws: conditions and the 180-day change
  src/welfare.ts    welfare law payments and the daily cap
  src/budget.ts     budget preview for the UI
  src/interestGroups.ts  read-only interest groups (no effect on the simulation yet)
  src/ai.ts         weekly AI decisions (src/outlook.ts values investments)
  src/commands.ts   the single validated path for every action, player and AI alike
  cli/              headless runs, sweeps and diagnostics
packages/client   React + Vite. The simulation runs in a Web Worker; the UI only sends commands.
```

## World

- One tick is one day. A week is 7 days, a year 360.
- **Seven regions**, each with one market. The seed decides which kingdom holds which regions (at least two each, connected). Regions come in four tiers that set population, classes, education and farmland; forests, veins and building plots belong to the region itself and barely change with the seed. In total about 5 million people (4.9 to 5.1 million in seeds 1–4).
- **Land.** One building level uses one cell of farmland, forest, ore veins or building plots. Administration and schools use no land. Each region has a perk, for example +10% output for mines in the Northern Mining District.
- **Goods.** Raw goods (grain, fibre, timber, iron ore, coal), processed goods (groceries, liquor, clothing, iron), finished goods (tools, furniture, precision instruments), luxuries (meat, fine clothes, luxury furniture) and **transport**, a service that cannot be stored.
- **Trade.** Trading posts buy where goods are cheap and sell in a neighbouring region the next day. A region buys at most what its posts' vaults (× utilisation × crew) hold that day; a region without a post cannot export but can still import. A post keeps up to level × reserve in its vault (the reserve doubles with each method step); money above that goes to its owner company as revenue. Building a post also locks half a base reserve per level, which becomes its starting vault. Shipping costs 6% of the cargo value where transport bought in the origin market covers it; the rest goes by porters at 30%, paid to local labourers. Crossing a border adds the destination kingdom's tariff (10%). There is no foreign trade.
- **Unsold output is lost.** Buildings keep no stock. Trading post cargo decays 2% a day until sold.
- **Prices** move 3% a day towards a target set by demand against supply, between 0.25× and 1.75× the base price.
- **Harvest conditions.** Each season (90 days), each region has a 5% chance of a drought, flood or wildfire. It cuts output and inputs on its land (farmland; also ore veins for floods and forest for wildfires) by 10–30% for one or two seasons. It spreads to each neighbour with a 50% chance.
- **Prospecting.** Mines need discovered veins, counted separately for iron and coal. A region knows 30% of its veins at the start. Each season, each region has a 10% chance per resource to find another 10% of its potential.

## Technology

Technology belongs to the kingdom. The crown researches, and the private company uses the crown's techs. At the start the crown knows the spinning wheel and craft guilds. There are 17 techs in four tiers, costing 4,500, 9,000, 15,000 and 26,250 research points. Tier 1 opens processing (milling, bloomery), printing (paper mills, public schools, professional bureaucrats) and wagon roads (carters). Later tiers bring ironworking, timber scaffolding, coke smelting, improved implements and the steam engine, then steam pumps, power looms, food machinery, farm machinery, steam railways and iron frames.

Research costs no money. Each week the crown earns 50 + 3 × the kingdom's literacy (%) research points, so a kingdom at 30% literacy makes 140 points a week and a tier-1 tech takes about 32 weeks. Points build up on the chosen tech and stay there if you switch; with no tech chosen they are lost. Literacy comes from schools and wealth, so schools are how you speed up research. Each crown starts with one school level (noble tutors) in its most populous region.

## Construction and buildings

- **Production methods climb a ladder.** Every basic method makes a 20% margin at base prices and base wages, but industries differ in how they get there. Each building has an industry type: **primary** (farms, lumber camps, mines) employs 500 people per level and buys almost nothing but tools (inputs at most 5% of sales); **processing** (groceries, liquor, clothing, furniture, paper, tools, transport, ranches) employs 300 and spends about half its sales on inputs; **heavy industry** (ironworks, instrument works) employs 300, 30% of them skilled, and spends about 60% on inputs; **skilled crafts** (luxury clothes and furniture) employ 300, 40% skilled, and spend about 20% of their luxury sales on inputs, or about 28-37% of all sales once the normal goods they also make are counted. This follows Victoria 3, where every basic method employs the same number of people but inputs range from nothing (farms) to three quarters of sales (steel). Because the margin is fixed, input-heavy industries need fewer workers, so a processing or heavy level sells more and costs more construction points (points = basic daily profit × 0.15). Luxury methods are mixed: they make normal and luxury goods together, moving from 4 normal goods per luxury at the first step to 1:1 at the upper step, and instead of the 20% margin and doubling rule they earn at base prices about what the normal method of the same technology earns, so a workshop moves toward luxuries when luxury prices are high. Each step up doubles profit per level (×2, ×4): it employs fewer people, a larger share of skilled workers and experts, and uses more tools, coal, iron or precision instruments. Even basic methods use a few tools. Wooden tools need none, and each kingdom starts with a three-level private wooden-tool workshop in its construction-office region, so tools exist from day one (tenants make none). Experts appear only in steam-age and luxury methods, at most 20 per level.
- **The crown's construction offices build everything,** for both companies. Each crown starts with 20 office levels. Offices make construction points; better methods (timber scaffolding, iron frames) make more. Each day an office makes only the points its projects can take (each project up to `MAX_POINTS_PER_LEVEL_DAY` points per level, only what is left to build, and private projects only while their payer has cash), and uses and buys only the materials for those points. Its jobs and wages stay the same, so spare capacity raises the cost per point. Half of each day's points go to crown projects and half to private ones, and either side can use what the other leaves. Every project (crown ones too) pays the office points used × its cost per point ÷ (1 − margin), with a margin of 20% / 30% / 40% for timber / scaffolding / iron frames; the fee is the office's sales, and private projects only get the points they can pay for. A company can run 40 projects at once, each of 1 to 100 levels. An office with no project rests, and lets its workers go after 10 days.
- **One building per type, region and company.** Building again adds levels, and an existing building only grows in its own method. The whole building uses one method.
- **Efficiency** = (0.4 + 0.6 × experience) × (1 + 1% per level, up to +20%) × (1 + regional perk). Experience grows 3.5% a day, halves on a method switch and is diluted by new levels.
- **Ownership buildings.** Every region has a manor and a financial district that grow by themselves. Each keeps a treasury. Every building level has exactly one owner: the state, or the manor or district that paid for it. Dividends of owned levels (by level count) and tenant rent go there and are split by units among unit holders (see Manor shares below; with manor shares off, a manor splits among seated nobles: a high noble 1 share, a gentry member 0.25). Manors keep 20% and districts 30% in their treasury.
- **Cash reserves.** Every building that sells goods, and every construction office, keeps up to 35% of its weekly profit as a reserve (less as it fills), up to **level × weekly output value at base price × 0.5 weeks**. Losses are paid from the reserve first. Only when it is empty does the AI cut utilisation or demolish, unless the building has been starved of inputs (under half filled) for 8 weeks. Profit beyond a full reserve is paid out as dividends.
- **Manor shares (on by default since 2026-11-02).** A manor is a share company like a financial district (switch it off to get the old seat shares). Only high nobles and gentry hold manor units; they buy them at unit value from the manor and sell them back to it. A manor's unit value is its treasury, the build cost of its levels and a year of its rent, per unit; the rent part is value, not cash, so a manor pays out only what its treasury holds. Manor income (dividends and rent) is split by units, wherever the holder works, so a gentry member in the hereditary administration keeps his dividends. Nobles pick the manor with the best yield, in any region or kingdom; a manor sells new units only up to its treasury target and at most half a day of its income a day. The AI judges yield as the expected return on new money: treasury and construction in progress earn what new levels of the owner's favoured kind earn in that kingdom, and a manor's rent counts as the same year of value as in its unit value, and a financial district with nothing yet is valued at the return of new levels. Every owner treasury may raise at least the cost of one level. Units of someone who stops being noble are bought back by the manor. Gentry no longer sit in manors and never take labourer, farmer or tenant jobs; without a gentry job they live on dividends. An optional absentee rule sends part of the dividend from a building outside its owner's region to the manor of the building's region.
- **Who pays for construction.** The crown pays for its own projects and owns those levels. Private projects are paid from manor and district treasuries: the same region and the favoured kind first (manors like farms, forests and mines; districts like the rest), whole levels each, pooling money if needed. Finished levels are split by money paid. When levels do not divide evenly, the larger payer takes the extra level and refunds the difference.
- **Privatisation.** Switch it on for a crown production building and manors and districts may buy one level a week at max(construction cost × 0.5, construction cost + one year of that level's profit). They buy when their treasury holds twice the price and the price pays back within 10 years. The money goes to the treasury; the level moves to the private building in the same region.
- **Demolition proceeds** go to the owner of the demolished level.
- **Demolition** removes one level a week. Half the materials are sold back over 28 days.

## Classes

| Class | Stratum | Base wage (× labourer) | Income |
|---|---|---|---|
| Tenant farmers | lower | – | the region's free farmland (see below) |
| Labourers | lower | 1 | wages |
| Farmers | lower | 1 | wages on grain farms, fibre farms and ranches (open to anyone, like labourer jobs) |
| Skilled workers | middle | 1.5 | wages |
| Experts | middle | 4 | wages |
| Gentry | middle | 3 | wages in hereditary administration and tutor schools, plus dividends of manor units (with manor shares off: a 0.25 seat share in the manor) |
| Capitalists | upper | 4 | none: this class has no seats and starts empty; district units are sold by the investment law, not by class |
| High nobility | upper | 4 | manor units: dividends of the manor's levels and tenant rent |

- **Needs.** Each consumption basket grows with wealth. The total of each basket is fixed by wealth (`needsAt` in `data.ts`): food follows its own curve and the other needs, liquor among them, share what is left. Liquor comes from distilleries (grain into liquor, like a grocery plant) and from tenant farms. Travel (transport) starts at the same wealth as standard clothing, precision instruments at the same wealth as luxuries, and paper can replace part of household furniture. Residents buy transport, paper and precision instruments only once their kingdom has the tech to make them; until then the rest of the basket takes that share. Residents never buy tools.
- **Tenant farms.** All free farmland is tenant land, 500 tenants per cell. Each tenant worker grows a little more grain than the household eats at wealth 5, plus small amounts of liquor, clothing and timber (`SUBSISTENCE.output` in `data.ts`). Tenants make no furniture, tools or fibre. **Rent: 5% of the harvest is taken first and sold straight away; the money goes to the regional manor** (half as much from very poor tenants, wealth below 2). Of the rest, tenants keep what they use and sell the remainder for themselves. Under the land-tax law they pay a fixed land tax per head.
- **High nobles = manor seats.** Each manor's seats = its weekly economy (output value of owned levels + tenant harvest, at base prices) ÷ 16,000, approached 1% a day. Nobles beyond the seats become gentry; empty seats are filled by gentry. Starting nobles are a fifth of the tier value.
- **Wealth** is a standard of living from 1 to 99. It rises when income covers the next consumption basket and falls when it does not cover the current one. For tenants, labourers and farmers, savings above 8 weeks of living costs also count as income, spread over 52 weeks. Living standard (wealth × fulfilment) sets births and deaths, as in Victoria 3. Hunger raises deaths sharply.
- **Cheap grain.** When grain is below its base price, households that have bought their whole basket spend leftover money on extra grain: the grain that would cover their food need × (base ÷ price − 1), at most half of that. Needs do not change, and the extra grain only gets what is left after everyone's needed food is sold. The extra share eaten × 5% is added to that pop's yearly growth, so cheap grain slowly raises population and with it grain demand.
- **Qualifications.** Literacy (from schools and wealth) and wealth let people qualify for skilled, expert, gentry and noble seats. Anyone except capitalists, high nobility and (with manor shares, the default) gentry can take labourer and tenant seats.
- **Best-paying job.** People move to the best-paying seat they qualify for. The unemployed move at once. The employed move only for more than 1.1× their current income: 0.5% a day at 1.1×, up to 5% a day at 2×. Income per person is the wage, the tenant harvest value, or, for an ownership seat, the building's dividends × own shares ÷ all seated shares (a manor seat pays nothing while manor shares are on). A building hires at most max(3, 1% of its seats) a day.
- **Migration.** A region's pull is the income an unemployed person can expect there times its food fulfilment. People move when a neighbour pulls more than 1.3× harder, fastest (0.1% a day) at 2×. Employed people move at a quarter of that speed; employed upper classes stay.
- **Spare cash.** People hold 10 days of living costs and taxes. Each day 5% of anything above that buys units: classes the investment law allows buy their regional financial district; high nobles and gentry also buy manor units (Manor shares above). Tenants' savings above 8 weeks go to the manor.

## Money

- **Taxes.** One tax law at a time, and a change takes 180 days. *Land tax* (the start): ƒ0.02 a day per tenant. *Poll tax*: a flat daily amount per non-tenant (`TUNE.pollTax`), available with ironworking once financial districts hold 10% of owner assets. *Income tax*: 30% of non-tenant wages and dividends (subsistence exempt), available with steam railways at 30%. Owner assets are the weekly output value of owned levels, plus tenant harvests for manors.
- **Investment law and the fund.** Financial districts are funds. Pops of the allowed classes buy units of their regional district with spare cash at the unit value (treasury + build cost of owned levels, per unit) and receive dividends by units. At first only nobles may buy; at a financial share of 5% / 10% / 15% the law can widen to experts / skilled / labourers and farmers. Other classes keep their spare cash; tenants' savings above 8 weeks go to the manor. Districts employ one expert per owned level at ƒ20 a day plus 10% of the dividends received. There is no capitalist class.
- **Policy levels** (1–5, start 3). **Tax level** multiplies every tax rate by 0.6 / 0.8 / 1 / 1.2 / 1.4. **State wages**: crown government buildings (administration, builder's office, school) pay the regional market wage × 0.7 / 0.85 / 1 / 1.15 / 1.3 (AI crowns may add a regional premium, see Wages). Crown production buildings (farms, workshops, trade) pay the regional market wage like a private company; the player crown cannot change it. **Welfare** sets the target standard of living 2 / 2.5 / 3 / 3.5 / 4 for those the welfare law covers. Each day it may spend at most step × 40% of last week's revenue ÷ 7 (step 5 = 200%); above that everyone's payment is cut by the same fraction. Research has no level: it costs no money. The budget preview shows the weekly balance at each level before you change it.
- **Government buildings** (administration, offices, schools) always run at full capacity. The treasury pays the wages and inputs of administration and schools; construction offices pay their way from construction fees, and their profit or loss goes to the treasury like a state enterprise. Only the crown builds schools and administration.
- **Schools.** Noble tutors (100 gentry, 20,000 places) or, with printing, public schools (1,000 workers, 100,000 places). Education moves towards 0.1 + 0.8 × places ÷ population and raises literacy.
- **Treasury income**: taxes, tariffs, minting (ƒ1,000 + 3% of weekly output each week) and the profit of crown enterprises, including construction offices, which earn fees from every project. The crown starts with 26 weeks of running costs.
- **Debt.** Only the crown borrows. When the treasury runs short it automatically issues bonds (new money) up to ƒ300,000 + 25% of yearly output, and repays them when it has spare cash. Interest is 0.025% a day. There is no bank: private companies never borrow. Short of cash, they buy fewer inputs, pay wages in proportion to what they have, and build only with manor and district treasuries.
- **Working cash.** The private company keeps two weeks of wages and inputs before paying dividends. When it has less, the owners of its levels top it up from their treasuries, by level count.
- **No investment pool.** Kept dividends and people's spare cash stay in manor and district treasuries, which pay for private construction and buy privatised levels. Ownerless money goes to the regional financial districts.
- **Money is conserved.** Total money changes only by minting, bond issues, repayments and bond interest. The tests check this to floating-point precision (within 1e-12 of total money).

## AI

The other two crowns and all three private companies are run by AI, through the same command path as the player. Each week:

- **Investment.** Producers grow and shrink by their reserves, not by forecasts. Each week a producer whose reserve is above half its cap may add one level, with a chance that rises to 100% when the reserve is full, unless the projected supply ÷ demand of its output in that region (two outputs are averaged by base-price value) is above 1.5; the level goes to the kingdom region where that output is scarcest and workers are available. A producer that has had an empty reserve and a weekly loss for 26 weeks loses one level, except the kingdom's last producer of a good another building there needs. Once any AI orders a producer demolished in a region, no AI builds or expands that building type there for 52 weeks. New industries start as one-level trials: a good whose regional price has stayed at 1.25× its base price for four weeks with no producer there, or the scarcest input of a building starved for four weeks with no producer in the kingdom. Administrations are valued by the extra tax their capacity collects, schools by the public value of their seats, and trading posts by the trade they can carry, each minus wages and inputs. Inputs, and producers in research choices, are priced at a long-run price: for every good the AI forms a long-run price from continent-wide demand (current demand, inputs of projects under construction, households that would switch back from raw goods, and the harvest of tenants the new jobs pull off the land) against supply, and a candidate earns that price on only the share of its output this demand buys (demand ÷ (supply + its output)), with transport and the best utilisation (100/75/50/25%). Those are built where yearly profit ÷ construction cost is above 0.2 and at least half the workers can be found, up to three projects a week. While an AI kingdom's financial districts hold less than the share the next investment law needs, its districts pay for private projects first (manors fill the rest), so the law can widen and workers' savings can flow into investment.
- **Wages.** Each region has one market wage per job, paid by every building there. An AI private house may pay a premium on top of it in a region where it makes a profit but is losing workers: up to the tenant income (or, for higher jobs, the wage of the job below) × 1.1, moving 10% a week and capped at +100%. An AI crown does the same for its government buildings (administration, offices, schools): in a region where a job is under 90% staffed it raises the state wage at once to the outside income (tenant income for labourers and farmers, a gentry's manor seat share for gentry, which is 0 with manor shares on; at least the market wage) × 1.25. Once the job is staffed it lowers the premium by 10% a week toward the outside income, capped at +100%. The player crown has no such premium. Each day the market wage moves 10% of the way toward the wage at which the people willing to take the job match the seats. That wage is never below the starting wage (the job below, or tenants for labourers and farmers, × 1.1) and never above twice the outside income. With surplus people it sinks to the starting wage, and it stops rising once raising it would bring no one more. With no seats, a job's wage is the job below (tenants for labourers and farmers) × 1.1. There is no minimum wage, so labourers can earn less than tenants for a while. The base wage (labourer = a tenant's daily income at base prices × 1.2) is only the yardstick for building numbers.
- **Methods, utilisation, demolition.** Switches to a method that earns 5% more per level each day. Cuts utilisation after four weeks of heavy loss, but not while the reserve still covers the loss, unless the building has been starved of inputs for 8 weeks. Producers lose levels by the reserve rule above. Schools are demolished after 26 weeks of a losing last level, trading posts after 52. A crown's administration is demolished after 26 weeks in which its average level loses money (tax the whole administration collects ÷ tax capacity × one level's capacity, minus one level's wages and inputs); the kingdom's last administration level is always kept.
- **Crown.** Picks the tax law with the higher expected revenue. Moves the policy levels by how many weeks of spending the treasury holds (tightens below 26 weeks, loosens above 52). Always has a research target, picked by value ÷ cost. Adds office levels when the queue is longer than 30 days. Builds schools until regions can reach 60% literacy.

## Art

All pixel art (16×16 and 64×64) is original to this project. See `packages/client/public/ASSETS.md`.

## License

Copyright 2026 phy-ce. Licensed under the [Apache License 2.0](LICENSE).

You may use, modify and redistribute this project, including commercially, as long as you keep the copyright notice, the license and the [NOTICE](NOTICE) file, which credits the original author, in your distribution, and state the changes you made.
