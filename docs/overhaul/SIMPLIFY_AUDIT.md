# 단순화 감사 (TUNE 키·겹치는 규칙·정리 순서, 2026-11-02)

조건: main 81494a1 (wt-simplify) 코드를 읽기만 했다. 시뮬레이션·전체 시험은 돌리지 않았다 (사용자: 계산을 아낀다).
아래 "비트 동일"은 코드 읽기로 본 판단이고, 실제로 지울 때 `cli/samecheck.ts`·`cli/golden.ts`로 확인해야 한다.
CLAUDE.md 규칙 1 ("규칙을 더하기 전에 빼거나 합칠 수 있는지 먼저 본다")에 따라 만든 목록이다.
저택 쪽(`nobleSeats` 'econ'·`gentryShare`·`manorGentrySeats`·`manorTargetMult`)은 wt-manor (`docs/overhaul/MANOR_SHARES.md`)가 맡는다. 여기서는 겹침만 적고 손대지 않는다.

## 0. 요약

| 분류 | 뜻 | 키 수 |
|---|---|---|
| (a) | 기본 끔, 사용자 결정 대기 없음 → 지울 후보 | 20 (그중 8은 오버홀 0b′ 비교 명세가 남음) |
| (a′) | 기본 끔이지만 사용자 결정·비교 대기 → 남김 | 11 |
| (b1) | 지금 기본값에서 읽히지 않는 값 (옛 방식에서만 쓰임) | 14 |
| (b2) | 기본으로 정해진 방식 스위치: 다른 갈래가 옛 규칙 | 17 |
| (c) | 지금 쓰는 조정값 | 95 |
| 합 | `data.ts` TUNE (531~766줄) | 157 |
| (d) | DESIGN 11장 근거 칸에 "근거 없음"이 들어 있거나 행이 없음 (위 분류와 겹침) | 65 (그중 (c) 37) |

- 골든 해시는 세계 상태 해시이고 `config.rulesHash`·`rulesRev`를 뺀다 (`cli/golden.ts:8`, `test/fixtures/a0.ts:72`). 그래서 **기본에서 꺼진 갈래와 그 TUNE 키를 지워도 골든 해시와 samecheck 해시는 그대로다.** 바뀌는 것은 `rulesHash()` 라벨뿐이다 (TUNE 전 키를 해시함, `src/save/rulesHash.ts:43`).
- 예외: 지금 기본값에서도 **써지기만 하고 옛 갈래에서만 읽히는 상태 칸**이 있다. 이것을 같이 지우면 동작은 같아도 세계 상태가 달라져 골든이 한 칸 늘어난다 (3장 1-D).
  - `Company.startCost`·`devCost`: `ai.ts:958-959`, `:968-969`에서 매주 쓰고, `:978-979` (`!aiReserveRule`)에서만 읽는다.
  - `Building.richWeeks`: `ai.ts:1340`에서 쓰고, `:1349`의 `reserveGrowMax` 0 갈래에서만 읽는다.
- 낡은 설명: `production.ts:46`와 DECISIONS 7-17은 `nobleSeats` 기본값을 'fit'이라고 적었지만 지금 값은 'econ'이다 (`data.ts:593`). `data.ts:442-443`은 `wageOutside`·`wageCeil`을 "AI 임금 바닥·천장"이라고 적었지만, 이 뜻은 `wageMarket` 0에서만 맞다.

## 1. TUNE 키 분류

줄 번호는 `packages/sim/src/` 기준이다. "§11"은 `docs/DESIGN.md` 줄 번호이고, "DEC"는 `docs/DECISIONS.md` 절이다.

### 1-1. (a) 기본 끔, 사용자 결정 대기 없음

| 키 | 값 | data.ts | 코드 갈래 | §11 | DEC | 지우기 |
|---|---|---|---|---|---|---|
| `lossBuildsPerWeek` | 0 | 557 | `ai.ts:993` allowLoss → `pickProject` 손해 후보 `ai.ts:1816`, `startsMonth[...|loss]` `:997-1000` | 839 (근거 없음) | 4-2 "특례, 정리 대상" | 가능, 비트 동일 |
| `lossTolerance` | ∞ | 558 | `ai.ts:1816` (allowLoss일 때만) | 839 | 4-2 | 위와 함께 |
| `crownPrivatize` | 'off' | 567 | `ai.ts:105` | 762 | 7-16 (끔으로 결정됨) | 가능, 비트 동일 |
| `subReturn` | 0 | 654 | `outlook.ts:196`, `returnableDemand` `outlook.ts:286~` | 848 | 7-12 | 가능, 비트 동일 |
| `laborNet` | 0 | 655 | `staffing.ts:95-96`, `openJobs` `staffing.ts:51~` | 848 | 7-12 | 가능 (`laborStrict`와 같이) |
| `laborPoach` | 0 | 728 | `staffing.ts:84`, `:96`, `poachable` `staffing.ts:34~` | 850 | 7-12 | 가능, 비트 동일 |
| `laborStrict` | 0 | 750 | `ai.ts:45`, `staffing.ts:27`, `:95-96` | 735 | - (HANDOFF 0-aifix: 나빠서 끔) | 가능, 비트 동일 |
| `officeSelfPay` | 0 | 727 | `ai.ts:917-924` | 850 | 7-12 | 가능, 비트 동일 |
| `officeSchoolFirst` | 0 | 729 | `ai.ts:920-923` (`officeSelfPay` > 0일 때만 뜻이 있음) | 851 | 7-4 (추정) | 가능, 비트 동일 |
| `aiSwitchV2` | 0 | 667 | `ai.ts:92` `switchSpare` `:576-610`, 방식 비교 `:690-700` | 828 | - (40년 비교로 0) | 가능, 비트 동일 |
| `financeIdle` | 0 | 744 | `commands.ts:93-94`, `finance.ts:474`, `:533-538`, `Building.fundedTick` `types.ts:281` | 735 | - (나빠서 끔) | 가능, 비트 동일 |
| `welfareCutOff` | 0 | 752 | `ai.ts:425-431`, `:448-449` | 731 | - (복지법 껐다 켰다 반복으로 끔) | 가능, 비트 동일 |
| `aiCutSD` | 0 | 688 | `ai.ts:86`, `sdHold` `:1436-1450`, `sdExit` `:1457-1500`, `economy.ts:617`, `types.ts:516`, 시험 `test/gate/sdexit.test.ts` | 810 | 7-38 (끈 채 둠) | 비트 동일. 0b′ 5-2 명세(`0BP_5-2_SPECS.json`)를 닫는다는 결정이 먼저 필요 |
| `aiDemoSD` | 0 | 689 | `ai.ts:86`, `:1458` | 811 | 7-38 | 위와 함께 |
| `aiExitWeeks` | 26 | 690 | `ai.ts:1458` (`sdExit` 안에서만) | 812 | - | 위와 함께 |
| `aiGlutIdle` | 0 | 693 | `glutSD` `ai.ts:1512-1528`, `weatherShortfall` `:1530-1557` | 813 | 7-38 | 비트 동일. 0b′ A1 (`0BP_GRAIN_SPECS.json`) |
| `aiSellDemoSD` | 0 | 696 | `ai.ts:87`, `sellDemo` `:1559-1588`, `types.ts:521` | 814 | 7-38 | 비트 동일. 0b′ A2 |
| `aiSellDemoWeeks` | 26 | 697 | `ai.ts:1560`, `:1664` | 815 | - | 위와 함께 |
| `aiMarginal` | 0 | 699 | `ai.ts:88`, `:1328-1335`, `:1590-1690` (`boundedPrice`·`ownSales`·`ownMarket`·`growGain`·`shrinkGain`·`marginExit`), `types.ts:523` | 816 | 7-38 | 비트 동일. 0b′ A3 |
| `aiAdminFloor` | 0 | 711 | `belowAdminFloor` `ai.ts:49-51`, `reviewLevels` `:1142-1147`, `aiAdminWage` 1 갈래 `:392` | 820 | 7-38 | 비트 동일. 0b′ A4. 목적(이슈 #4 행정청 충원)은 `aiStatePremium`·`wageTarget` 2가 맡았다 (7-42·7-43) |

### 1-2. (a′) 기본 끔, 결정·비교 대기 → 남김

| 키 | 값 | data.ts | 코드 | §11 | DEC | 남기는 이유 |
|---|---|---|---|---|---|---|
| `manorTargetMult` | 0 | 577 | `market.ts:867`, `manorNeed` `:908-917` | 859 | 7-36 | wt-manor 2단계에서 뜻이 바뀜 (MANOR_SHARES 3.7) |
| `manorGentrySeats` | 0 | 578 | `economy.ts:339-344`, `production.ts:113-114` | 860 | 7-36 | wt-manor: 지분 켬에서 없앰 (MANOR_SHARES 3.6) |
| `tenantSlack` | 0 | 647 | `market.ts:192-200`, `:224-225`, `types.ts:525` | 863 | 7-38 "메모만" | 사용자 메모 |
| `quakeChance` | 0 | 648 | `economy.ts:201-235`, `lab/metrics.ts:173` | 861 | 7-34 | 비교 전 시제품 |
| `quakeLoss` | 0.25 | 649 | `economy.ts:220` | 862 | 7-34 | 위와 함께 |
| `quakeYears` | 3 | 650 | `economy.ts:220`, `:229` | 862 | 7-34 | 위와 함께 |
| `aiMixedMethods` | 0 | 725 | `ai.ts:720-721`, `:1778-1782`, `economy.ts:861-864` | 838 | 7-21 | 세계 규칙 결정 대기 |
| `crownGdpReserve` | 0 | 742 | `ai.ts:349-363`, `:1082` | 732 | §11 "사용자 결정 대기" | 결정 대기 |
| `startPopScale` | 1 | 739 | `world.ts:125-145`, `lab/micro.ts:57` | 779 | 7-35 | 비교 중 |
| `startPopLand` | 0 | 740 | `world.ts:152` | 780 | 7-35 | 비교 중 |
| `needMul` | {} | 730 | `data.ts:984`, `lab/micro.ts` 여러 곳 | 777 | 7-12 | 마이크로 실험 손잡이 (도구) |

### 1-3. (b1) 지금 기본값에서 읽히지 않는 값

| 키 | 값 | data.ts | 어디서만 읽히나 | 대신하는 것 | §11 | DEC |
|---|---|---|---|---|---|---|
| `wageMarketRate` | 0.0025 | 548 | `labor.ts:496` (`wageTarget` 0) | `wageTarget` 2 | 792 | 7-38, 7-43 |
| `wageMarketRateUp` | 0 | 551 | `labor.ts:487`, `:496` (`wageTarget` 0) | `wageTarget` 2 | 824 | 7-41 (7-43이 대신) |
| `wageCeil` | 0.85 | 539 | `adjustWages` `ai.ts:193` (`wageMarket` 0), `lab/metrics.ts:648` | 지역 시장 임금 | 788 | - |
| `wageLossCut` | true | 639 | `adjustWages` `ai.ts:214` (`wageMarket` 0) | 지역 시장 임금 | 789 | - |
| `nobleSeatsPerLevel`·`nobleSeatsPerCell` | 10, 2 | 595-596 | `production.ts:58` ('owned') | `nobleSeats` 'econ' | 756 | 7-17 |
| `nobleIncome` | 100 | 597 | `production.ts:79` ('income') | 'econ' | 756 | 7-17 |
| `nobleSeatsLand` | 2 | 598 | `production.ts:59` ('land') | 'econ' | 756 | 7-17 |
| `noblePerMille` | 2 | 599 | `production.ts:75` ('pop') | 'econ' | 756 | 7-17 |
| `priceExp` | 0 | 732 | `economy.ts:639`, `:645-650`, `market.ts:1047` 주석 | 빅토리아3 가격 공식 | 행 없음 | - |
| `priceRange` | [0.01, 10] | 733 | `economy.ts:639`, `:646` (`priceExp` > 0) | `PRICE_MIN`·`PRICE_MAX` | 행 없음 | - |
| `devShare` | 0.2 | 664 | `ai.ts:978-979` (`!aiReserveRule`) | `aiReserveRule` 1 | 835 | 7-24 |
| `devLoss` | 0.25 | 665 | `pickProject` dev 갈래 `ai.ts:1811-1813` (`devShare` 호출에서만) | `aiReserveRule` 1 | 836 | 7-24 |
| `expandUtilMin` | 0.5 | 666 | `glutOf` `ai.ts:1698-1726`: 정부 건물·무역소에는 늘 false (`:1709`)이고, `aiReserveRule` 1에서 `pickProject`는 정부 건물·무역소만 본다 (`:1767`) | `aiReserveRule` 1 | 837 | 7-22 |

### 1-4. (b2) 기본으로 정해진 방식 스위치 (지금 갈래만 남기고 키를 지울 수 있음)

| 키 | 값 | data.ts | 옛 갈래 위치 | §11 | DEC |
|---|---|---|---|---|---|
| `wageMarket` | 1 | 546 | 34곳: `adjustWages` `ai.ts:183-227`, `ai.ts:101`·`:154`, `tick.ts:84-90` (`applyWagePolicy`), `finance.ts:121-133`·`:145-157`, `world.ts:326-333`, `budget.ts:90`·`:401`, `economy.ts:366`, `staffing.ts:40`, `outlook.ts:345` | 791 (근거 없음 포함) | 7-32, 7-38 |
| `wageTarget` | 2 | 553 | 0·1 갈래 `labor.ts:475-497`, `WAGE_TILT` `labor.ts:~480` | 825 | 7-43 (확인 대기) |
| `nobleSeats` | 'econ' | 593 | 'fit'·'owned'·'income'·'land'·'pop' `production.ts:53-80`, `pops.ts:289` | 752 | 7-17 |
| `aiReserveRule` | 1 | 670 | 18곳. 옛 전망 AI의 생산 건물 짓기: `pickProject` 생산 갈래, 발전 투자 `ai.ts:978`, `reviewLevels` 생산 건물 `:1137` | 807 | 7-27 |
| `aiBuildNow` | 1 | 663 | `outlook.ts:90`, `:144`, `:362-364`, `:430`, `ai.ts:978` | 832 | 7-24 |
| `latentFeasible` | 1 | 661 | `outlook.ts:167` | 806 | 7-22 |
| `aiInputFill` | 1 | 757 | `ai.ts:538-541`, `outlook.ts:456` | 829 | - |
| `needFixedTotal` | 1 | 674 | `data.ts:975` | **행 없음** | - |
| `firmCallPlan` | 1 | 564 | `finance.ts:607` | 760 | 7-40 |
| `crownDebtNoBuild` | 1 | 761 | `ai.ts:1252`, `:1306`, `:1752` | 831 | - |
| `taxCurve` | 'hyp' | 568 | `economy.ts:550` ('exp') | 717 (근거 없음) | - |
| `aiAdminWage` | 2 | 715 | 0·1 갈래 `ai.ts:391-395` | 821 | 7-41 |
| `aiKeepLastSupplier` | 1 | 702 | `ai.ts:1409` | 817 | 7-37, 7-38 |
| `aiGrowWhere` | 1 | 705 | `ai.ts:1350` | 818 | 7-37, 7-38 |
| `aiReserveFund` | 1 | 708 | `ai.ts:1353` | 819 | 7-37, 7-38 |
| `aiWagePremium` | 1 | 719 | `ai.ts:102` | 822 | 7-41 |
| `wealthSavLower` | 1 | 576 | `market.ts:1019` (0 = 모든 pop) | 864 | 7-38 |

(c) 중에도 "0 = 끔" 갈래가 있는 값이 있다: `reserveGrowMax` (`RESERVE_STREAK` 갈래 `ai.ts:1320`, `:1349`), `wealthSavWeeks`, `aiStatePremium` (`ai.ts:98`), `ratioGate` (`labor.ts:260`), `treasuryKeepWeeks`, `pollTaxIncomeCap`, `starveWeeks`, `aiGlutSD`. 값은 남기고 0 갈래만 지울 수 있다 (비트 동일).

### 1-5. (c) 지금 쓰는 조정값 (95)

d = §11 근거 칸에 "근거 없음"이 있음.

| 키 | 값 | data.ts | 주요 코드 | §11 | d |
|---|---|---|---|---|---|
| `gentryShare` | 0.25 | 533 | economy.ts:482 | 751 | |
| `rentShare` | 0.05 | 534 | data.ts:101 market.ts:253 | 749 | |
| `patronWealth` | 2 | 535 | market.ts:254 | 750 | d |
| `patronShare` | 0.5 | 536 | market.ts:254 | 750 | d |
| `growthEq` | 1 / 5 / 5 | 537 | pops.ts:363 | 771 | d |
| `wageOutside` | 1.2 | 538 | data.ts:105 (기본 임금 규칙), ai.ts:209 (옛 갈래), lab/metrics.ts:418 | 787 | d |
| `switchRate` | 0.005 | 540 | labor.ts:140 outlook.ts:73 staffing.ts:17 | 793 | d |
| `switchPremium` | 1.1 | 541 | labor.ts:137 finance.ts:127 ai.ts:269 | 793 | d |
| `switchMax` | 0.05 | 542 | labor.ts:139-140 :424 | 793 | d |
| `wageTargetSpeed` | 0.1 | 555 | labor.ts:497 | 826 | |
| `adminScale` | 0.3 | 556 | economy.ts:564 finance.ts:217 | 715 | d |
| `adminStart` | 1 | 559 | world.ts:206 | 716 | d |
| `investWage` | 0.75 | 560 | outlook.ts:354 | 790 | d |
| `localBias` | 0.5 | 561 | ai.ts:1829 finance.ts:682 | 757 | d |
| `ownerTilt` | 0.5 | 562 | ai.ts:1750 finance.ts:682 | 758 | |
| `firmBufferWeeks` | 2 | 563 | finance.ts:572 | 759 | |
| `privatizeMargin`·`privatizePayback` | 2, 10 | 565-566 | ai.ts:134-136 | 761 | |
| `cashBufferDays` | 10 | 569 | market.ts:875 | 772 | d |
| `peasantKeepWeeks` | 8 | 570 | market.ts:864 | 714 | |
| `wealthSavWeeks`·`wealthSavBuffer` | 52, 8 | 574-575 | market.ts:1019-1020 | 864 | |
| `pollTax`·`incomeTax` | 0.6, 0.3 | 579-580 | finance.ts:106 budget.ts:470 | 709 | |
| `officeTargetDays` | 30 | 581 | ai.ts:924-931 | 840 | d |
| `officeUseFull` | 0.9 | 582 | ai.ts:916 | 841 | d |
| `startsPerWeek` | 3 | 583 | ai.ts:986 :1277 | 801 | d |
| `luxuryLinear`·`luxuryQuad` | 0.5, 0.03 | 584-585 | data.ts:969-970 | 774 | d |
| `meatLinear`·`meatQuad` | 0.3, 0.01 | 586-587 | data.ts:971 | 775 | d |
| `intoxLinear` | 0.1 | 588 | data.ts:961 | 776 | |
| `qualSkilledL`·`qualExpertL`·`qualRate` | 0.4, 0.6, 0.25 | 589-591 | pops.ts:242-272 | 795 | |
| `nobleEconPer` | 16000 | 594 | production.ts:70 | 753 | |
| `nobleAdjust` | 0.01 | 600 | production.ts:70 pops.ts:288 | 754 | |
| `aristStart` | 0.2 | 601 | world.ts:147 :152 | 755 | |
| `schoolValue`·`schoolTarget`·`schoolTaxMax` | 0.3, 0.6, 4 | 602-604 | ai.ts:804-856 :1076 | 741-743 | |
| `taxLaw`·`landTax` | 'land', 0.02 | 605-606 | world.ts:180 finance.ts:106 data.ts:101 | 707-708 | |
| `lawDays`·`lawPoll`·`lawIncome` | 180, 0.1, 0.3 | 607-609 | policy.ts:21 :135 | 711-712 | |
| `investUpper`·`investMiddle`·`investLower` | 0.05, 0.1, 0.15 | 610-612 | policy.ts:24 | 713 | |
| `financeWage`·`financeBonus` | 20, 0.1 | 613-614 | finance.ts:440 :468 economy.ts:488 | 764 | |
| `financeStaff` | 1 | 615 | production.ts:108 | 765 | d |
| `rawFullWealth`·`rawCapWealth` | 5, 10 | 616-617 | data.ts:945 | 773 | d |
| `taxLevels` | 0.6~1.4 | 618 | finance.ts:99 budget.ts:218 | 710 | |
| `govWageLevels` | 0.7~1.3 | 619 | finance.ts:99 :146 | 724 | |
| `researchBase`·`researchPerLiteracy` | 50, 3 | 620-621 | finance.ts:62 | 725 | |
| `welfareLevels` | 2~4 | 622 | welfare.ts:31 finance.ts:99 | 729 | |
| `welfareWeeks` | 40 | 623 | ai.ts:411 :452 | 730 | |
| `treasuryLowWeeks`·`treasuryHighWeeks` | 26, 52 | 624-625 | ai.ts:352-372 | 726 | |
| `doneWageMax` | 4 | 628 | ai.ts:373-408 | 728 | |
| `startTreasuryWeeks` | 26 | 629 | world.ts:361 | 727 | d |
| `shrinkWeeks` | 26 | 630 | ai.ts:1160 (정부 건물·무역소만) | 845 | d |
| `reserveWeeks` | 0.5 | 631 | finance.ts:381 | 763 | |
| `officeShrinkWeeks` | 52 | 632 | ai.ts:1169 | 843 | |
| `adminFillRetry` | 0.02 | 633 | ai.ts:681 | 718 | |
| `officeIdleDays` | 10 | 634 | economy.ts:328 | 844 | |
| `salvageShare`·`salvageDays` | 0.5, 28 | 635-636 | production.ts:432-433 | 846 | d |
| `swapMult` | 3 | 637 | ai.ts:1200 (무역소가 부지를 찾을 때 살아 있음) | 847 | |
| `employedMigrate` | 0.25 | 638 | labor.ts:694 | 794 | d |
| `harvestChance`·`harvestIntensity` | 0.05, [2, 6] | 640-641 | economy.ts:104-127 | 857-858 | |
| `prospectStart`·`prospectFind` | 0.3, 0.1 | 651, 653 | economy.ts:263 :282 | 866 | d |
| `prospectChance` | 0.1 | 652 | economy.ts:274-281 | 865 | |
| `ratioGate` | 0.9 | 656 | labor.ts:262 | 849 | d |
| `minRoi`·`minStaffing` | 0.2, 0.5 | 657-658 | ai.ts:28 :45 | 804-805 | d |
| `reserveShrinkWeeks` | 26 | 672 | ai.ts:1343-1344 | 808 | |
| `reserveGrowMax`·`reserveGrowFrom` | 1, 0.5 | 677-678 | ai.ts:1319-1320 | 827 | d |
| `aiGlutSD` | 1.5 | 682 | ai.ts:1323-1326 :1440 | 809 | |
| `aiStatePremium` | 1 | 724 | ai.ts:98 :324-325 | 823 | |
| `officeRichWeeks` | 52 | 726 | ai.ts:924 (사전에 안 나옴: `TUNE_EXPERIMENTAL`) | 850 | |
| `startLumber`·`startFiber`·`startWorkshop` | 1.2, 0.4, 3 | 734-736 | world.ts:226-234 | 778, 781 | |
| `treasuryKeepWeeks` | 26 | 746 | finance.ts:494-517 | 733 | d |
| `pollTaxIncomeCap` | 0.3 | 748 | ai.ts:511 | 734 | d |
| `buildCostMult` | 1 | 754 | data.ts:790 | 802 | |
| `starveWeeks` | 8 | 759 | ai.ts:555 :755 :783 | 830 | d |
| `tradeReserve` | 5,000 | 765 | data.ts:777 :781 | 803 | |

### 1-6. (d) 근거 없음 (65)

- §11 행이 아예 없음 (3): `needFixedTotal`, `priceExp`, `priceRange`.
- 지금 쓰는 값 중 근거 없음 (37, 위 표의 d). 그중 플레이어가 보는 세계 규칙: `patronWealth`·`patronShare`·`growthEq`·`switchRate`·`switchPremium`·`switchMax`·`wageOutside`·`cashBufferDays`·`luxury*`·`meat*`·`rawFullWealth`·`rawCapWealth`·`financeStaff`·`salvage*`·`employedMigrate`·`prospectStart`·`prospectFind`·`ratioGate`·`treasuryKeepWeeks`·`adminScale`·`adminStart`·`startTreasuryWeeks`. 나머지는 AI 판단이다.
- 나머지 25는 (a)·(a′)·(b) 키다. 지우면 근거 문제도 같이 없어진다.

## 2. 겹치는 규칙과 한 줄로 합칠 후보

### 2-1. 임금 웃돈 길 넷

| 길 | 누가 | 식 | 코드 |
|---|---|---|---|
| 플레이어 웃돈 `wageOffset` | 플레이어 민간 상회 | 시장 임금 × (1 + 웃돈), −50%~+100% | `commands.ts:156-160`, `economy.ts:370`, `offsetWages` `:380-385` |
| AI 상회 웃돈 `aiPremium` | AI 민간 상회 | 위에 × (1 + 웃돈), 0~`PREMIUM_MAX` 1 | `adjustPremium` `ai.ts:229-280`, `economy.ts:371-373` |
| AI 국영 웃돈 `statePremium` | AI 왕실 정부 건물 | 시장 임금 × 단계 배율 × (1 + 웃돈), 0~`aiStatePremium` | `adjustStatePremium` `ai.ts:285-330`, `finance.ts:150` |
| 국영 임금 단계 `govWageLevels` | 왕실 (플레이어 손잡이, AI는 `adjustBudget`) | 시장 임금 × 0.7~1.3 | `finance.ts:97-99`, `:146-150`. AI가 단계를 올리는 길이 셋: 국고 사다리, `aiAdminWage` 2 (`ai.ts:391-395`), `doneWageMax` (`ai.ts:373-408`, `wageIndex` `finance.ts:113-133`만 봄) |

- 한 줄 후보: **"모든 고용주는 지역 시장 임금 × (1 + 웃돈)을 준다. 웃돈은 고용주·지역·직종마다 하나다."** 국영 단계는 왕국 전체 웃돈(−30%~+30%)이 되고, AI 왕실은 그 위에 지역 웃돈 하나만 움직인다.
- 겹침: 정부 건물 충원이 모자랄 때 `aiAdminWage` 2 (왕국 단계 +1)와 `aiStatePremium` (지역 웃돈)이 같은 목표를 쫓는다. `aiStatePremium`은 행정청·건축사무소·학교를 다 덮는다 (`ai.ts:285`).
- 위험:
  - `aiAdminWage` 2를 끄거나 `doneWageMax`·`wageIndex`를 없애면 동작이 바뀐다 (비교 필요).
  - 국영 단계는 국고 긴축 사다리의 손잡이이기도 하다 (`ai.ts:395-399`). 웃돈으로 합치면 긴축 길을 다시 설계해야 한다.
  - 플레이어 왕실 국영 웃돈은 7-42 결정 대기 1이고, 왕실 생산 건물 웃돈은 7-39에서 닫혔다. 합치면 사용자 결정이 필요하다.
- 확인 필요: `setWage` (`commands.ts:148-154`)는 `wageMarket` 1에서 웃돈을 지우는 일만 하는 것으로 보인다. 그 회사의 `wages`는 `syncCompanyWages` (`labor.ts:549`)가 덮는다. 화면이 이 명령을 쓰면 UI_CHANGES에 넘긴다.

### 2-2. 저택 자리 규칙 대 저택 지분 회사 (wt-manor 몫, 손대지 않음)

| 지금 | 지분 회사 뒤 (MANOR_SHARES) |
|---|---|
| 상급 귀족 자리 `nobleSeats` 'econ' (`production.ts:60-71`, `nobleEconPer`, `nobleAdjust`) | 그대로 둔다 (3.6, 결정 7) |
| 하급 귀족 몫 `gentryShare` (`economy.ts:480-482`, `labor.ts:101`) | 시작 지분 비율로만 쓴다 (3.4) |
| `manorGentrySeats` (시제품) | 지분 켬에서 쓰지 않는다 → 2단계에서 정리 (3.6, 7장) |
| `manorTargetMult` (시제품) | "지분 수 × 1지분 목표"로 바꿔야 함, 1단계에서는 끈 채 (3.7) |

- 여기서 지금 할 수 있는 것: `nobleSeats`의 옛 다섯 방식과 키 다섯 (1-3)만. 'econ' 갈래는 건드리지 않아 wt-manor와 겹치지 않는다. 다만 `production.ts` 같은 함수를 고치므로 **wt-manor가 합쳐진 뒤** 하는 것이 충돌이 적다.
- 위험: 없음 (비트 동일). 사전 `TUNE_EXPERIMENTAL`에서 키 여섯을 뺀다.

### 2-3. 소작·지대·저축 손잡이

| 손잡이 | 하는 일 | 코드 |
|---|---|---|
| `rentShare` 0.05 | 수확의 5%를 지대로 | `market.ts:253` |
| `patronWealth` 2·`patronShare` 0.5 | 부가 2 아래인 소작농은 지대 절반 (실제 2.5%) | `market.ts:254` |
| `peasantKeepWeeks` 8 | 현금 생활비+세금 8주치를 넘는 소작 저축은 그날 저택으로 | `market.ts:862-870` |
| `wealthSavBuffer` 8·`wealthSavWeeks` 52·`wealthSavLower` 1 | 하층은 생활비(묶음 전체) 8주치를 넘는 저축 ÷ 52주를 부 소득에 더한다 | `market.ts:1018-1020` |
| `cashBufferDays` 10 | 소작농이 아닌 pop의 투자 여유 | `market.ts:875` |
| `tenantSlack`, `quake*`, `manorTargetMult` | 시제품 (끔) | 1-2 |

- 겹침 1: 기본 임금 규칙은 지대를 5%로 센다 (`data.ts:101` `tenantIncomeAtBase`). 그런데 부 2 아래 소작농이 실제로 내는 지대는 2.5%다. 한 줄 후보: **"지대는 수확의 X%다"** (가난한 소작농 감면을 없애고 X를 하나로). 위험: 동작이 바뀐다. X를 바꾸면 `ruleBaseWage` → 건물 숫자가 바뀐다 (`methods_audit`). 소작농 부가 2 근처에 얼마나 있는지는 실행하지 않아 **확인 못 함**.
- 겹침 2: 소작농 저축은 현금 생활비 8주치에서 잘린다. `wealthSav`는 묶음 전체 비용 8주치를 넘는 몫만 센다. 소작농은 현물을 먹어 현금 비용이 묶음 비용보다 작으므로, **소작농에게는 `wealthSav` 몫이 거의 0일 것으로 보인다** (코드 읽기 추정, 실행 확인 못 함). 그렇다면 한 줄은 "노동자·농부의 남는 저축이 부를 올린다"가 실제 동작이다. 후보: 두 8주를 키 하나로 합친다 (값이 같아 비트 동일). 비용 기준까지 하나로 맞추면 동작이 바뀐다.
- 저택이 무엇을 거두는가(`peasantKeepWeeks`·`manorTargetMult`)는 wt-manor 3.7과 겹친다. 저택 쪽 정리는 wt-manor 2단계 뒤에 한다.

### 2-4. 그 밖에 합칠 수 있는 것

| 후보 | 한 줄 | 동작 | 위험 |
|---|---|---|---|
| `officeRichWeeks` → `treasuryRich` | "국고가 넉넉하면 사무소를 늘린다" | 비트 동일 (`ai.ts:924` `weeks > 52`와 `treasuryRich` `ai.ts:356-358`이 `crownGdpReserve` 0에서 같은 식) | `crownGdpReserve`를 켜면 갈라진다 (a′ 결정 대기) |
| `shrinkWeeks` + `reserveShrinkWeeks` | "N주(26) 적자면 1단계 헌다" | 비트 동일 (둘 다 26) | 정부 건물 철거(`ai.ts:1160`)와 생산 건물 철거(`:1343`)의 뜻이 조금 다르다 (적자 판정 기준) |
| `wageOutside` 1.2 → `switchPremium` 1.1 | "바깥 소득 대비 웃돈은 하나" | 동작 바뀜: 기본 임금 3.54 → 3.25 (0.5 단위로 3.5 → 3.0), 모든 건물 숫자 재계산 | 큼. 사용자 결정. 우선 `data.ts:442` 설명만 "기본 임금 규칙의 배율"로 고친다 |
| `priceBounds` (`economy.ts:638-640`)와 `PRICE_MIN`·`PRICE_MAX` (`market.ts:1047`) | 가격 범위는 한 곳 | `priceExp` 제거 뒤 비트 동일 | 없음 |
| `nobleAdjust` | 자리 수렴과 승급 속도를 같이 정함 (`production.ts:70`, `pops.ts:284`) | 그대로 | 이미 하나 |

## 3. 정리 순서

준비 (한 번): 기준 main 81494a1에서 `cd packages/sim && bash cli/fast.sh samecheck.ts > ../../.tmp/samecheck-base.txt`, `npx tsx cli/golden.ts`로 골든을 적어 둔다.
단계마다: `npm run typecheck`, `npm run test:core`, `bash cli/fast.sh samecheck.ts ../../.tmp/samecheck-base.txt` (다르면 종료 1), `npx tsx cli/golden.ts` (이력 마지막과 같아야 함), `npx tsx cli/methods_audit.ts`.

### 3-1. 1단계: 동작이 같은 정리 (samecheck·골든 그대로)

| 묶음 | 지울 것 | 키 | 비고 |
|---|---|---|---|
| 1-A | (a) 실험 스위치 12: `lossBuildsPerWeek`·`lossTolerance`·`crownPrivatize`·`subReturn`·`laborNet`·`laborPoach`·`laborStrict`·`officeSelfPay`·`officeSchoolFirst`·`aiSwitchV2`·`financeIdle`·`welfareCutOff` | −12 | 시험 참조 0. `Building.fundedTick` 타입도 지움 |
| 1-B | (b1) `priceExp`·`priceRange` (+ `priceBounds` 정리), `nobleSeats` 옛 방식 + 키 다섯 | −8 (`nobleSeats` 키 포함) | `test`에 `priceExp` 1곳, `nobleSeats` 1곳. wt-manor 합친 뒤 |
| 1-C | (b2) 켬 스위치 키: `latentFeasible`·`aiInputFill`·`needFixedTotal`·`firmCallPlan`·`crownDebtNoBuild`·`taxCurve`·`aiKeepLastSupplier`·`aiGrowWhere`·`aiReserveFund`·`aiWagePremium`·`wealthSavLower`·`aiBuildNow`, `aiAdminWage` 0·1 갈래 | −12 (`aiAdminWage` 키는 1-E에서) | 시험 참조: `firmCallPlan`·`taxCurve`·`aiKeepLastSupplier`·`aiGrowWhere`·`aiWagePremium` 1곳씩, `aiReserveFund` 2곳 |
| 1-D | `aiReserveRule` 0 갈래 (옛 전망 AI의 생산 건물 짓기·철거), `devShare`·`devLoss`·`expandUtilMin`, `reserveGrowMax` 0 갈래 | −4 | 상태 칸 `Company.startCost`·`devCost`·`Building.richWeeks`는 **이 묶음에서는 남긴다** (써지기는 해서 지우면 해시가 바뀐다). `cli/` 2곳 (`aiReserveRule`) |
| 1-D′ | 위 상태 칸 셋을 지운다 | 0 | 동작은 같지만 세계 해시가 바뀐다 → 골든 한 칸 늘어남 (`RULES_REV` +1). `.tmp` 스크립트로 `HASH_EXCLUDE`에 세 칸을 더해 samecheck가 같음을 먼저 보인다. 옛 저장의 남은 칸은 `compat.ts`에서 지운다 |
| 1-E | `wageMarket` 0 갈래 전부 (`adjustWages`, `applyWagePolicy` 반복, 옛 국영 임금 `marketWages`), `wageCeil`·`wageLossCut`, `wageTarget` 0·1 갈래 (`wageMarketRate`·`wageMarketRateUp`·`WAGE_TILT`), `aiAdminWage` 키 | −7 | 7-43 확인 뒤에 한다 (확인 질문은 위 끝·속도이지 옛 규칙 복귀는 아니다). `lab/metrics.ts:648`, wageLag 시험(`wageTarget` 0 사용)과 `wageMarket` 시험 4곳을 고친다 |
| 1-F | 키 합치기: `officeRichWeeks` → `treasuryHighWeeks`, `shrinkWeeks` + `reserveShrinkWeeks` | −2 | 비트 동일 (값이 같음) |
| 1-G | (a) 0b′ 스위치 8: `aiCutSD`·`aiDemoSD`·`aiExitWeeks`·`aiGlutIdle`·`aiSellDemoSD`·`aiSellDemoWeeks`·`aiMarginal`·`aiAdminFloor` | −8 | 코드로는 비트 동일. 0b′ 비교 명세(5-2·A1~A4)를 닫는다는 코디네이터 결정이 먼저. 시험 `test/gate/sdexit.test.ts`, `test/gate/grainbal.test.ts`, `test/core/readonly.test.ts`의 참조를 지운다 |

1단계를 다 하면 TUNE 157 → 104 키 (−53).

### 3-2. 2단계: 동작이 바뀌는 것 (나중에 비교 실행. 이번에는 돌리지 않음)

| 후보 | 바뀌는 것 | 비교 | 결정 |
|---|---|---|---|
| `aiAdminWage` 2를 끄고 `aiStatePremium`만 둠 | AI 왕실 국영 단계 | 20년 × 시드 1·2, 1년차 행정청 충원·징수율·세전 총생산 | AI 판단이라 데이터로 |
| `doneWageMax`·`wageIndex` 없앰 | 기술을 다 연 왕국의 국영 단계 | 40년 (기술 완료 뒤 구간) | AI 판단 |
| 국영 단계 → 웃돈 하나 (2-1) | 플레이어가 보는 임금 규칙 | 위와 같음 | 사용자 결정 (7-42 결정 대기 1과 같이) |
| 지대 감면 없앰 (2-3 겹침 1) | 소작 소득·지대 | 20년 × 시드 1·2, 소작 생활수준·저택 수입 | 사용자 결정 (착취 구조) |
| 저축 기준 하나로 (2-3 겹침 2) | 하층 부 | 위와 같음 | 사용자 결정 |
| `wageOutside` → `switchPremium` | 기본 임금·건물 숫자 | `methods_audit` + 20년 | 사용자 결정 |

### 3-3. 사전 시험과 저장 호환

- 사전 (`encyclopedia.ts`):
  - 'every TUNE key is documented' (`test/core/encyclopedia.test.ts:94-97`)는 키를 지우면 그대로 통과한다.
  - 다만 지운 키의 `tune('키', …)` 줄은 타입(`TuneKey`)이 없어져 컴파일이 깨진다. 같이 지운다.
  - 지운 줄 뒤의 `{n}` 자리 번호가 밀리므로 규칙 문장의 번호를 다시 맞춘다. 사전 시험이 모든 값·예시를 확인한다.
  - `TUNE_EXPERIMENTAL` (`encyclopedia.ts:101-107`)에서 지운 키를 뺀다. 이것도 `TuneKey[]` 타입이라 빼지 않으면 컴파일 오류다.
  - "조정값 수" (`encyclopedia.ts:1410`)는 지금 157 − 18 = 139이고 1단계 뒤 줄어든다. 화면 숫자만 바뀐다.
  - 'every numbered DESIGN.md section is mapped' (`:80-92`)는 DESIGN의 `##`·`###` 번호 절을 없애지 않으면 그대로다. 1-E도 7.3 "임금" 절 안의 문단만 고친다. 절을 없애면 `DESIGN_SECTIONS` (`encyclopedia.ts:191`)를 같이 고친다.
- DESIGN 11장: 지운 키의 행을 지우거나 "없앰 (날짜, 커밋)"으로 남긴다 (`tenantOutput` 행과 같은 꼴, DESIGN 11장). DECISIONS 4-1에 "지워도 동작이 안 바뀌는 것"으로 적는다.
- 저장 호환:
  - TUNE은 저장에 들어가지 않는다.
  - `config.rulesHash`는 라벨이다. `compat.ts:106`은 빈 값만 채우고, 화면은 읽지 않는다 (`packages/client/src` 검색 0건).
  - 그래서 키를 지워도 옛 저장은 불러와진다. migrate는 필요 없다.
  - 1-D′처럼 상태 칸을 지우면, 옛 저장의 남은 칸을 `migrateWorld`에서 지우는 한 줄을 둔다. 고정 저장 `save-v18-8y`에 그 칸이 있으면 samecheck (3)과 골든 B가 달라진다.
- 비교 도구 주의: `sweep`·`*diag`는 `Object.assign(TUNE, …)`로 모르는 키도 조용히 받는다 (`cli/builddiag.ts:19` 등). 지운 키를 쓰는 옛 명세(`docs/overhaul/0BP_5-2_SPECS.json`, `0BP_A4_SPECS.json`, `COMBO_SPECS.json`, `LABOR_SPECS.json`, `WAGELAG_SPECS.json` 등)는 오류 없이 기본값으로 돈다.
  - 제안: 정리와 같이 sweep 입구에 "TUNE에 없는 키면 멈춤" 검사를 둔다.
  - 했음 (2026-11-02 wt-simplify): `data.ts checkTuneKeys`·`overrideTune` 한 곳에 두고 `cli/sweep.ts`, `src/lab/run.ts runSpec`, `cli/microcheck.ts` (`--tune`, 충격 `tune`), 진단 CLI 전부(`Object.assign(TUNE, …)` 하던 곳)가 그것을 쓴다. 시험 `test/core/tuneGuard.test.ts`.

## 4. 1단계 결과 (2026-11-02 wt-simplify, 이 문서의 줄 번호는 정리 전 81494a1 기준이다)

- TUNE 키 158 → 111 (−47, main 93bc0b0 이 `wageTargetSpan` 을 더해 시작이 158). 커밋: 1-A 7df16c4 (−12), 1-B b4cb7c5 (−2), 1-C b2486fa (−12), 1-D e99d349 (−4), 1-E 57fa584 (−7), 1-F 9ac8ad7 (−2), 1-G 95f3637 (−8). 골든 c7fb7c00ef46d24c 와 samecheck 5개가 묶음마다 같았다.
- 하지 않은 것: `nobleSeats` 옛 방식 다섯과 키 (wt-manor 가 같은 함수를 고친다, 1-B), 1-D′ 상태 칸 `Company.startCost`·`devCost`·`Building.richWeeks` (지우면 세계 해시가 바뀐다: `RULES_REV` +1·`compat.ts` 정리·골든 새 항목이 필요해 다음 일), (c) 값의 "0 = 끔" 갈래 (`ratioGate` 등, 값 손잡이라 남김).
- 1-C 의 `aiAdminWage` 0·1 갈래는 키와 함께 1-E 에서 지웠다.
- 지운 키를 쓰는 비교 명세 (기록으로 남김, 그대로 돌리면 가드가 멈춘다): `0BP_5-2_SPECS.json` (`aiCutSD`·`aiDemoSD`·`aiExitWeeks`), `0BP_A4_SPECS.json` (`aiAdminFloor`·`aiAdminWage`), `0BP_GRAIN_SPECS.json` (`aiGlutIdle`·`aiMarginal`·`aiSellDemoSD`·`aiSellDemoWeeks`), `0B_SPECS.json` (`wageCeil`), `ADMIN_SPECS.json` (`aiAdminWage`), `COMBO_SPECS.json` (`aiGrowWhere`·`aiKeepLastSupplier`·`aiReserveFund`·`wageMarket`·`wageMarketRate`), `LABOR_SPECS.json`·`MANOR_SPECS.json`·`POP_SPECS.json`·`QUAKE_SPECS.json` (`wageMarket`·`wageMarketRate`), `WAGELAG_SPECS.json` (`aiAdminWage`·`aiWagePremium`·`wageMarketRateUp`), `WAGESPEED_SPECS.json` (`wageTarget`). `MANOR_SPECS`·`POP_SPECS`·`QUAKE_SPECS` 를 다시 돌리려면 `wageMarket`·`wageMarketRate` 를 빼야 한다 (`wageMarketRate` 0.005 는 지운 옛 임금 규칙이라 같은 조건이 아니다).
