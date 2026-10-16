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

- **Seven regions**, each with a fixed number of land cells (arable, forest, ore, building plots). Buildings occupy cells. Each region has its own market. Each region also has a perk, for example +10% output for mines in the northern mining district.
- **About 2.9 million people** at the start, almost all of them tenant farmers.
- **Twelve goods** in a production chain: raw goods (grain, fibre, timber, ore), processed goods (food, fuel, clothing, metal), finished goods (tools, furniture, precision instruments), plus **transport**, a service produced by railways.
- **Trade and transport.** Moving goods out of a region (traders, buying inputs from a neighbour, port imports and exports) requires transport bought in the origin market. Rail transport costs about 6% of the cargo value. Whatever cannot go by rail is carried by porters and carts at 30%, paid to local labourers. Only the port city trades abroad, and foreign buyers only pay low prices, so exporting is a loss-making outlet for surplus.
- **Storage.** Unsold goods go to a regional warehouse that slowly decays and is capped at three times the target stock (about a month of trade).

## Technology

Each house researches on its own. At the start only primary industry is open: farms, lumber camps, mines and construction offices. Sixteen techs in five tiers unlock processing industries (milling, charcoal, spinning, bloomeries, printing for schools, wagonways for railways), then guild workshops, improved farming, water-powered saws and looms, coal fuel, pumped mines, food preservation, steel frames, steam railways and finally precision engineering. Research speed is capped by a daily budget, so even at full budget a first-tier tech takes about a month.

Some better methods need no tech at all: iron tools raise the output of farms, lumber camps and mines from day one, if tools can be bought.

## Construction and buildings

- **Construction offices build everything.** Every house starts with one office. Projects advance with construction points produced daily by offices; better office methods (timber scaffolding, steel frames) are faster. Up to ten projects run at once.
- **One building per type per region and house.** Building the same type again adds a unit to the existing building, and the whole building shares one production method. The UI shows a count with +/− buttons.
- **Owners.** Each unit employs owners as well as workers: capitalists for buildings on plots, landed aristocrats for farms, lumber camps and mines. Dividends go to the owners seated there.
- **Experience.** New staff start at 40% efficiency and reach 100% in about a month. Switching methods halves experience.
- **Economies of scale.** +10% output per 10 units of the same building, up to +50%.

## Classes

| Class | Stratum | Income |
|---|---|---|
| Tenant farmers | lower | farm a landlord's empty land, keep part of the harvest in kind, half of what they sell goes to rent |
| Labourers | lower | wages |
| Skilled workers, experts | middle | wages and research spending |
| Capitalists | upper | dividends from plot buildings |
| Landed aristocrats | upper | dividends from land buildings and tenant rent |

- **Wealth** is a standard of living from 1 to 99. It rises when spendable income exceeds the cost of the next consumption basket and falls when it cannot cover the current one.
- **Starvation** is based on food fulfilment, not wealth. Below 90% people die faster, and they migrate to better-fed neighbouring regions.
- **Tenants become labourers** whenever factories have vacancies. Laid-off labourers return to the land if there is room.
- **Promotion** to skilled worker or expert needs wealth, savings and vacancies, and is limited by the region's education level, which schools raise.
- Goods are substitutable within a need (food or grain, fuel or timber, clothing or fibre). Processed goods are preferred at equal price.

## Money

- Running costs are borrowed automatically from the bank when cash runs short. The credit limit grows with the book value of buildings.
- If debt exceeds 90% of the limit and cash cannot cover a day of wages, the bank steps in. For the player, a building is auctioned every four weeks. AI houses go bankrupt after twelve weeks.
- Household savings are partly deposited and partly invested in AI houses. The player raises capital only through loans.
- **Money is conserved**: money inside the kingdom plus the foreign account is constant, and the tests check it.

## AI

AI houses use the same command path as the player. Each week they build a market outlook: for every good, kingdom-wide demand (including inputs of projects under construction and latent demand from better methods they could switch to) against supply capacity (including projects under construction), turned into an expected long-run price. Every candidate building is valued the same way. Outputs are valued at the price after entry, minus transport. Inputs are valued at the price after purchase, plus transport. Utilisation is chosen to maximise profit. Houses with spare cash occasionally invest in an industry that does not pay yet, preferring scarce goods, which is how new production chains get started. Research is chosen by the value of the methods a tech unlocks, divided by its cost.

## Art

All pixel art (16×16 and 64×64) is original to this project. See `packages/client/public/ASSETS.md`.

## License

Copyright 2026 phy-ce. Licensed under the [Apache License 2.0](LICENSE).

You may use, modify and redistribute this project, including commercially, as long as you keep the copyright notice, the license and the [NOTICE](NOTICE) file, which credits the original author, in your distribution, and state the changes you made.
