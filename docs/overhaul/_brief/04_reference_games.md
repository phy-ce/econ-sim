# 오버홀 배경 자료 04: 참고 게임과 비평 (웹 조사, 2026-10-30)

오버홀 토론용 배경 자료다. 결정이 아니라 자료다. `docs/VIC3_REFERENCE.md`(위키 동작 정리, 2026-10-19~23)는 읽었고, 이 문서는 그 위에 "설계 의도, 비평, 플레이어 불만, 다른 게임"을 덧붙인다. VIC3_REFERENCE와 겹치는 규칙 수치는 다시 적지 않는다.

## 0. 읽는 법과 조사의 한계

- 표기: **[사실]** 출처에서 읽은 것. **[해석]** 내가 붙인 판단. **[확인 못 함]** 열리지 않았거나 원문을 못 읽은 것. 출처는 URL로 적는다.
- WebFetch는 작은 모델이 페이지를 요약해 돌려준다. 따옴표 안의 영어는 그 요약에 인용된 문장이다. 원문 대조는 하지 않았다.
- 열리지 않은 것: PC Gamer 빅토리아3 리뷰 본문(제목만 옴), PC Gamer 프로스트펑크 개발자 인터뷰 본문, GameSpot Anno 1800 리뷰(403), GameStar 빅토리아3 기사(403), 패러독스 포럼 개발 일지 #110 본문(검색 요약만 봄), Wube Friday Facts 본문, Anno Union 개발 블로그 본문.
- 플레이어 불만은 Steam·Reddit 글이라 일화다. 통계가 아니다. 날짜는 글마다 다르고 오래된 패치 기준일 수 있다.
- 오늘(2026-10-30) 기준으로 위키 Victoria 3 문서가 적은 "1.15 State and Revolution, 2026-11-05"는 아직 오지 않은 날짜다. 예정으로만 본다. [확인 못 함]

## 1. 빅토리아3

### 1.1 설계 의도 (개발자 자신의 말)

출처: https://www.gamedeveloper.com/design/deep-dive-modeling-the-global-economy-in-victoria-3 (Game Developer, 경제 설계자 글)

| 항목 | 사실 |
|---|---|
| 목표 | 실제 경제를 모델링하고 나머지 시스템이 거기서 나오게 한다. 700곳 넘는 지역, 최대 10만 pop 집단. 빅토리아2의 닫힌 상품-화폐 루프의 문제를 고친다 |
| 틱 순서 | 건물이 생산·소비 → pop이 부·문화·대체재에 따라 구매 → 기반시설이 시장 주문 크기를 정함 → 무역·관세 → 임금·세금·부 재계산 |
| 재고 없음 | 상품을 쌓지 않는다. "turn the taps on full blast": 상품을 한꺼번에 돈으로 바꾸고, 틱 사이에는 돈과 가치만 남는다 |
| 이유 | 순환 경제의 세 문제(분배·대체·반복 불균형)를 피한다. 작은 불균형이 반복에서 커져 캠페인을 깨뜨릴 수 있다. 스냅샷 방식이라 공장을 짓기 전 이익 여부를 미리 볼 수 있다 |
| 포기한 것 | 유통기한·계절·품질·재고 담보 신용이 없다. 설계자는 "hurts my heart a bit"라고 썼다. 계획경제(고정 가격)는 악용 구멍이 된다 |
| 성공 기준 | "understandable and feels empowering to play with" |
| 선택 | 성능과 이해 가능성을 위해 덜 세밀한 모델을 받아들였다 |

- [해석] 우리 게임의 "못 판 산출은 사라진다"(`docs/DESIGN.md:11`)는 같은 계열의 선택이다. 같은 약점(재고·계절 없음)을 같이 진다.
- 시장 가격 공식과 접근성은 VIC3_REFERENCE 「시장과 시장 접근성」에 이미 있다.

### 1.2 건설·투자 구조의 변천 (패치별)

| 패치 | 사실 | 출처 |
|---|---|---|
| 1.0 (2022-10) | 건설 부문(정부 건물)이 건설 포인트를 낸다. 대기열에서 포인트가 우선순위대로 나뉜다. 건설 부문은 임금·자재를 쓰는 국가 지출이다. "pretty elegant system that matches the way Victoria 3 is handling many of its other systems" | https://www.pcgamesn.com/victoria-3/construction , https://admin-forum.paradoxplaza.com/forum/developer-diary/dev-diary-36-construction.1513612 (검색 요약만) |
| 1.2 | 게임 규칙 "자율 투자" 추가(기본 켜짐). 대기열이 정부/민간으로 나뉘고 비율은 경제 법이 정한다. 민간 공사는 pop이 정하며 플레이어가 순서를 바꾸거나 취소할 수 없다. 공사마다 자금 수준이 보인다. 개발자가 든 이유: "the community is somewhat split on the issue of autonomous construction" | https://paradoxinteractive.com/games/victoria-3/news/dev-diary-71-autonomous-investment-in-1-2 |
| 1.2 | 투자 풀 기여율을 직종별 고정으로: 자본가 20%, 귀족 10%, 농부·상점주 5%(개발 일지 기준. VIC3_REFERENCE의 위키 1.13 표는 자본가 30% 등으로 다르다, 이후 패치로 바뀐 것으로 보이나 **[확인 못 함]**) | 위 DD71 |
| 1.2 | 투자 풀 수입에 비해 건설 용량이 모자라면 경고. 건물 임금 규칙: 큰 이익일 때만 올림, 적자이고 유보 자산 50% 미만이면 임금을 깎거나 해고. 자동 증설 조건을 바꿔 비싼 건물이 줄을 막지 않게 함. 명령경제는 풀 폐쇄 | https://vic3.paradoxwikis.com/Patch_1.2 |
| 1.2 | AI 개선: 항구 과잉 건설 자제, 철도 과잉 건설 자제, 규모의 경제 평가, 건설 효율 감점 이해 | 위 Patch_1.2 |
| 1.5 | 자동 증설은 고용이 95% 넘어야 한다. "자율 투자가 일 안 하는 건물을 늘리던 버그" 수정. 일꾼을 못 구한 건물은 4주 기다린 뒤 재시도. 임금을 올려 사람을 끌어오지 못하게 하고, 적자가 될 채용도 안 한다. 로컬 생산·소비가 지역 가격에 더 세게 반영. AI가 산업을 소수의 주(state)에 몰아 짓는 것을 줄임 | https://vic3.paradoxwikis.com/Patch_1.5 |
| 1.7 (확장 Sphere of Influence, 2024-06) | 소유가 레벨 단위로 바뀌고 저택·금융가가 소유 건물이 됨(우리 `DESIGN.md:13`과 닮은 구조, 개발 일지 #110 검색 요약). 해외 투자. "Major work done on the economic AI". "Removed the Directly Controlled Investment Game Rule from the game"(즉 자율 투자가 유일한 방식이 됨). 건설 대기열 총 시간을 월·년으로 표시. 위키 Patch_1.7 페이지에서 읽었다. 항목이 실제 1.7 것인지 1.8 것인지는 **[확인 못 함]** | https://vic3.paradoxwikis.com/Patch_1.7 , 개발 일지 #110 (검색 요약만) |
| 1.9 (Charters of Commerce) | 무역 센터가 시장 가격 차를 자율 거래하고 투자 풀로 지을 수 있음. 독점 헌장은 다른 행위자의 신규 건설을 막음. 입력 상품이 전혀 없는 건물은 최대 75% 감산. 개발 건물(건설 부문·철도·항구)에 기본 고용 레벨 부여. AI가 회사 설립을 더 잘 이해 | https://vic3.paradoxwikis.com/Patch_1.9 |
| 1.10 | 건물이 미취업 pop을 먼저 뽑고 작은 pop부터 해고. 직종당 최대 인원 제한. 명령경제에서 회사 본사는 배당 75%를 정부에 내고, 국가 회사 소유 레벨은 배당 75%를 노동자에게 준다(법 효과). 자극제(설탕·커피·차·담배) 필요 신설 | https://vic3.paradoxwikis.com/Patch_1.10 |

- [해석] 패치 흐름에서 읽히는 방향 세 가지. (1) 건설을 플레이어 전담에서 pop 자율 투자로 옮기는 쪽으로 갔고, 1.8에서 직접 통제 선택지를 없앴다. (2) 그 뒤 패치 대부분이 "자율 투자 AI가 이상한 곳에 짓는다/고용을 못 채운다"를 막는 조건 추가였다. (3) 임금·고용 규칙에 안전장치(4주 대기, 95% 고용, 적자 채용 금지)가 계속 붙었다.
- [해석] 우리 `ai.ts planConstruction`(`packages/sim/src/ai.ts:724`)과 `reserveLevels`(`ai.ts:1124`, 유보 자산 기준 증설)는 같은 문제(고용을 못 채우는 증설)에 같은 종류의 조건(`minStaffing`, `officeStaffable`)을 이미 두고 있다.

### 1.3 평단과 이용자 평가

| 항목 | 사실 | 출처 |
|---|---|---|
| Metacritic | 위키는 PC 83/100 "generally favorable"로 적는다. 다른 페이지는 Metascore 81, 이용자 6.0으로 적는다(집계 시점이 다른 듯) | https://en.wikipedia.org/wiki/Victoria_3 , 검색 요약(Notebookcheck 등) |
| 개별 점수 | Destructoid 9.5/10, PC Gamer 84/100, IGN 8/10, PCGamesN 8/10, Eurogamer "Recommended" | Wikipedia |
| Steam | 58,972개 리뷰 중 69.2% 긍정, "Mixed"(2026-01-16 집계 요약 사이트) | https://vaporlens.app/app/529340/victoria_3/stats/details |
| 판매 | 출시 한 달에 약 50만 | https://Techraptor.net/gaming/news/victoria-3-sales-cross-500k-despite-mixed-fan-reaction (검색 요약) |
| 확장 | 첫 확장 Voice of the People(2023-05-22)은 확장 리뷰 194개 중 35% 긍정. 출시 뒤 두 달 만에 일일 최고 동접이 약 7만에서 1만으로 | https://www.gamepressure.com/newsroom/victoria-3-still-awaits-rescue-new-expansion-falls-short/z156c3 |

칭찬과 비판 (평론):

| 매체 | 사실 |
|---|---|
| Eurogamer | 경제 시뮬레이션이 "utterly absorbing" (Wikipedia 인용). OpenCritic 발췌: 아주 세밀한 경제와 맞물린 시스템 |
| PC Gamer | 산업화에 필요한 상품과 원료 조달을 계획하는 도전을 칭찬(검색 요약). 본문 **[확인 못 함]** |
| Kotaku | 점수 없음. "plays like accounting software", "I also just never enjoyed how much emphasis is placed on economic management here", 초반은 좋지만 루틴이 서면 "a bit dull", 숫자가 다시 "piles of numbers"로 돌아간다. 행정 종이 비용과 염료 생산에 시간을 쓴다고 불평 (https://kotaku.com/victoria-3-review-paradox-pc-kotaku-impressions-verdict-1849669988) |
| IGN | 전쟁이 "fiddly and confusing" (Wikipedia 인용) |
| Reason | 게임이 시장을 위에서 관리하는 것으로 모델링한다는 경제 관점 비평. "Even if they institute a laissez faire economic system"라도 무역 경로와 확장 결정은 플레이어 몫. 플레이어는 중앙 계획자이고 규모가 커지면 "unwieldy", "Big government is a lot less fun" (https://reason.com/2023/04/14/victoria-3/) |
| 접근성 | OpenCritic 발췌: 초보에게 쉽게 열려 있지 않다. Common Sense Media 요약: 정치와 자원 미세관리가 입문자에게 어렵다 |

### 1.4 플레이어 불만 (Steam·Reddit, 일화)

| 유형 | 사실 (글쓴이 주장) | 출처 |
|---|---|---|
| 대기열 노동 | "every so often build more construction so you can build more stuff so that you can build more construction" (Reddit). 한 번에 여러 곳에 같은 건물을 짓는 "전부 짓기"를 요구 | https://cal1.lr.ggtyler.dev/r/paradoxplaza/comments/1i9rcpw/is_victoria_3_good_yet (검색 요약, 직접 열기는 실패) |
| 민간 대기열 | 민간 대기열이 건설의 50%를 가져가 버린다는 불만. 반대로 "플레이어가 직접 짓는 게 재미있는 부분"이라는 옹호 | Steam 검색 요약 (https://steamcommunity.com/app/529340/discussions/0/4408542785991194884 등) |
| AI 위치 선정 | 2024-06 글: AI가 잘 짓는다는 의견과 함께 "건물이 일꾼 없는 곳에 지어진다", 인구 3만 지역에 제철소 60개라는 사례. 다른 글쓴이는 민간 건설을 켜면 경제 성장이 약 20% 느리지만 대안이 없어 받아들인다고 썼다 | https://steamcommunity.com/app/529340/discussions/0/4408542785991194884 |
| 반론 | 상품·전제 조건을 손으로 다 추적하는 건 압도적이라 민간 건설이 필요하다는 의견. 자유방임(Laissez-Faire)에서 금융가·자본가가 눈덩이처럼 커지는 점을 좋아한다는 의견 | 같은 글 |
| 출시 직후 | 미완성·버그, 약한 전쟁, 지나치게 복잡한 규칙, 필수처럼 보이는 비싼 DLC | https://vaporlens.app/app/529340/victoria_3/stats/details |

- [해석] 불만이 두 갈래다. (a) 플레이어가 대기열·클릭에 묶이는 불만, (b) 자동으로 맡기면 AI가 이상하게 짓는 불만. 개발사는 (a)를 자율 투자로 풀고 (b)를 조건 추가로 계속 막았다. 한쪽을 풀면 다른 쪽이 나온다.
- [해석] Kotaku와 Reason이 말하는 문제는 같은 뿌리다. 경제 자체가 아니라 "플레이어가 모든 것을 직접 돌려야 하는 사람"이 되는 것.
- 개발 일지 #110(소유 개편)과 DD57 요약본에서 개발자가 밝힌 "이 구조의 목표"는 **[확인 못 함]**.

## 2. 다른 경제·경영 게임

각 표: 핵심 루프, 칭찬, 비판. 점수는 Wikipedia 기준이고 출처는 각 문서에 적었다.

### 2.1 Anno 1800 (Ubisoft Blue Byte, 2019)

- 핵심 루프 [사실]: 주민 계층(농부·노동자 등 5계층)마다 필요가 다르고, 필요를 채우면 집이 차며 다음 계층이 열린다. 생산 사슬이 원료를 제품으로 바꿔 필요를 채우고 무역으로 파다. 건물 배치는 청사진으로 먼저 계획한다. 공장이 늘수록 도시 매력(관광)이 준다. 브랜드 관리자의 말: 핵심은 "you have to make sure your citizens are happy". 노동자를 억압하면 파업·폭동이 따른다.
  - 출처: https://en.wikipedia.org/wiki/Anno_1800 , https://gamesbeat.com/anno-1800-hands-on-being-a-capitalist-in-the-age-of-industrialization/
- 점수: Metacritic PC 81, OpenCritic 63개 평론 중 95% 추천, 가장 빨리 팔린 Anno (Wikipedia).
- 칭찬: PC Gamer가 "Cities: Skylines 이후 가장 몰입되는 도시 건설"로 평했다(검색 요약). 사슬과 계층이 단계마다 맞물린다는 평.
- 비판: GameSpot 헤드라인 "The Prettiest Spreadsheet", PC World "An Industrial Revolution but not a design revolution"(Wikipedia). Prima는 무역 구조가 명확하지 않다고 평했다. 플레이어 글: 계층이 아래 계층의 필요를 더는 요구하지 않는다는 사실, 수요선(파란색)과 생산선(초록색) 해석이 알기 어렵다(Steam 글, 일화).
- [해석] 칭찬받은 쪽은 "필요(계층)가 사슬을 늘리게 만든다"는 한 줄 인과다. 비판받은 쪽은 숫자는 많고 정보가 읽히지 않는 부분이다.

### 2.2 Patrician / Port Royale (무역 시뮬)

- Patrician IV [사실]: 한자 동맹 상인. 배로 도시 간 상품을 옮겨 이익을 낸다. Metacritic 66%. 평론: 멀티플레이 삭제, 재플레이성 낮음 ("fun to play once", IGN), 전투 아쉬움, GameSpot은 정치 시뮬 칭찬, CGMagazine은 "very dry affair". PC Gamer는 "figures may add up" 하지만 열정이 없다고 평했다. 선장 자동화는 칭찬받는 드문 부분. (https://en.wikipedia.org/wiki/Patrician_IV , https://www.pcgamer.com/patrician-iv-review/ 검색 요약)
- Port Royale 4 [사실]: OpenCritic 요약 6.9(34개, 추천 40%, 한 요약 사이트 기준). 자동 무역 경로가 갈렸다: 자동화가 경로 설정이라는 새 미세관리를 낳는다(Prima), 몇 시간 뒤 손으로 사고파는 게 일이 된다(Gamereactor), 반복적이 된다는 평. (https://primagames.com/featured/port-royale-4-review , https://ipv6.gamereactor.eu/port-royale-4-review/ , 검색 요약)
- [해석] 무역 시뮬의 약점은 "가격 차이를 찾는 일의 반복"이다. 자동화는 설정 노동을 없애지 못하고 옮길 뿐이다. 이것은 빅토리아3의 건설 대기열 불만과 같은 구조다.

### 2.3 Capitalism 계열

- Capitalism (1995) [사실]: CEO로 소매·제조·R&D 경영. 최대 목표는 이익과 파산 회피. Computer Gaming World는 "역대 가장 어려운 게임 6위"로 "economy simulation should include a free MBA in every box"라고 썼다. Harvard·Stanford에서 교육용으로 썼다(1996~). (https://en.wikipedia.org/wiki/Capitalism_(video_game))
- Capitalism Lab (2012): Capitalism II의 확장판이라고만 적혀 있다. 이 위키 문서에서 Lab의 점수는 **[확인 못 함]**. 위키가 적은 Metacritic 82와 IGN 9/10은 "Capitalism Lab" 문서에 있었으나, 그 문서 본문이 Capitalism II 내용 같아 Lab의 점수로 단정하지 않는다.
- 공식 사이트 홍보 [사실, 독립 확인 없음]: 쉽게 배우지만 마스터하기 어렵고 초보는 파산하기 쉽다고 개발자 교육 가이드가 스스로 적었다. AI가 약했던 전작을 고쳤다고 주장한다. (https://www.capitalismlab.com/?p=7180 , https://www.capitalismlab.com/cap_lab_files/education/Capitalism_Lab_Educational_Use_Guide.pdf — 검색 요약)
- [해석] 가장 깊은 시뮬은 매니아층은 있지만 대중성은 얻지 못했다. 깊이만으로는 흥행하지 않는다는 반례다.

### 2.4 Offworld Trading Company (Mohawk Games, 2016)

- 핵심 루프 [사실]: 전투가 없는 RTS. 시장의 수급이 계속 움직이고, 한 플레이어의 구매가 가격을 올려 상대가 이득을 본다. 상대 회사의 지분 과반을 사들이는 적대적 인수가 승리 조건. 블랙마켓에서 사보타주를 사는데 살 때마다 값이 올라 상대가 대비할 시간이 생긴다. (https://en.wikipedia.org/wiki/Offworld_Trading_Company)
- 점수: Metacritic 78, GameSpot 9/10, PC Gamer 88/100, IGN 8/10, VentureBeat 78/100 (Wikipedia).
- 설계 맥락 [사실]: Soren Johnson이 GDC 2017에서 "An RTS Without Guns"로 발표했다. 인터뷰: "There's nothing really like it, so when you're trying to convince publishers ... they don't know what to do with it." 지도가 무작위여야 반복이 덜하다는 취지. 단순화된 UI 때문에 자원이 왜 줄어드는지 찾기 어렵다는 리뷰 지적이 있다. (https://gdconf.com/news/come-gdc-2017-learn-took-make-rts-without-guns , https://matchstickeyes.com/2014/10/01/offworld-trading-company-interview-with-soren-johnson — 검색 요약)
- [해석] 경제를 "승패 규칙이 분명한 대결"로 감쌌다. 이익 극대화만으로는 목표가 흐리다는 문제를 피한다.

### 2.5 Factorio (Wube, 2020 정식)

- 핵심 루프 [사실]: 자원을 채집해 도구와 기계를 만들고, 채굴·운송·가공·조립을 자동화하며, 연구로 다음 단계를 연다. 공해가 적 기지를 자극해 생산과 방어의 균형을 요구한다. 승리 조건은 로켓 발사. (https://en.wikipedia.org/wiki/Factorio)
- 점수: Metacritic PC 90, OpenCritic 92% 추천. PC Gamer 평론가는 "a manufacturing masterpiece"라 했다. "Cracktorio"라는 별명. 판매 350만(2022-12). 얼리 액세스 2016-02 → 1.0 2020-08. (Wikipedia)
- 개발자 [사실, 검색 요약]: 아이디어는 Minecraft의 Buildcraft 모드에서 왔다. 1.0까지 5년 예상이 8년 걸렸다. 자기 장르를 "strategic automation game"이라 부른다. (https://forums.factorio.com/3026 , https://www.pieuvre.ca/2020/09/23/gaming-factorio-interview-kovarik-wube/)
- 비판 [사실]: 위키는 직접 비판이 거의 없고 그래픽이 단순하다고만 적는다. 포럼 일화: "factory must grow" 루프의 수익 체감.
- Factorio 개발 철학(디자인 원칙)의 1차 자료는 열지 못했다. **[확인 못 함]**
- [해석] 자동화가 게임의 "재미" 자체인 구조다. 플레이어가 반복 노동을 직접 없애는 설계를 하고 그 결과가 눈에 보인다. 빅토리아3의 자동 투자와 반대 방향이다: 자동화는 플레이어가 짓는 것이어야 보상이 된다.

### 2.6 Frostpunk (11 bit studios, 2018)

- 핵심 루프 [사실]: 발전기 하나가 열을 내는 반경 안에서 도시를 키운다. 석탄·목재·강철·식량 자원, 낮에만 일하는 시민, 희망과 불만 두 막대. 법으로 생산성과 불만을 맞바꾼다(아동 노동 허용 등). 희망이 너무 낮거나 불만이 너무 높으면 반란. (https://en.wikipedia.org/wiki/Frostpunk)
- 점수: Metacritic PC 84. 5백만 장 판매(6년 내).
- 칭찬: 위기 관리, 도덕적 선택. PC Gamer: 지도자의 부담을 "masterful expression"으로 표현.
- 비판: 재플레이 가치 제한(주요 사건이 같다), 일부 메커니즘 설명 부족, Eurogamer는 플레이어 판단 여지가 없어 선택이 공허하다 (Wikipedia).
- 설계 [사실]: 개발자 발표(IGC 2018): "Scarcity can sometimes become affluence", 작은 인구여서 한 명의 죽음이 크다, "Making new gameplay does not always mean adding new content". 첫 시나리오 프로토타입이 "너무 복잡해서" 단순하게 고쳤다. (https://www.invenglobal.com/articles/6528/igc-2018-empathize-with-numbers-the-process-of-frostpunk-scenario-writing)
- [해석] 경제 수치를 "누가 얼마나 고통받는가"로 바꿔 보여 준다. 우리 `CLAUDE.md`의 "소작농 빈곤은 착취로 만든다"와 방향이 같다.

### 2.7 Crusader Kings III (Paradox, 2020)

- 핵심 루프 [사실]: 캐릭터 중심. 금·위신·신앙 세 자원, 봉신 구조, 스트레스(성격에 어긋나게 행동하면 쌓임), 상속으로 이어 플레이. (https://en.wikipedia.org/wiki/Crusader_Kings_III)
- 점수: Metacritic PC 91 "universal acclaim", IGN 10/10. 판매 400만 이상(2025-04).
- 비판: GameSpot, 이야기 엔진이 작동하지 않을 때 "your actions can feel rote and uninspired". 콘솔 후반은 성능 문제.
- [해석] 경제(금)는 단순하고 이야기·사람이 중심이다. 같은 회사의 빅토리아3와 평가가 갈리는 지점은 "경제를 본체로 둘지 이야기의 연료로 둘지"다. 단 이것은 단일 원인으로 증명한 것이 아니다.
- 빅토리아3가 CK3에서 가져온 것 [사실]: 중첩 툴팁 (PCGamesN 건설 기사).

### 2.8 Dwarf Fortress (Bay 12 / Kitfox, Steam 2022)

- 핵심 루프 [사실]: 난쟁이 개체마다 속성·성격·관계가 있고, 규모가 커지면 귀족의 요구가 늘며 무역 대상이 오고, 모든 요새는 결국 무너진다("Losing is Fun!"). (https://en.wikipedia.org/wiki/Dwarf_Fortress)
- 판매·점수 [사실]: 2022-12-06 Steam 출시, 24시간 16만 장, 12월 약 50만 장. Metacritic 93(12개), IGN 10/10. 월 수익이 Steam 이전 약 $15,000에서 2023-01 $720만 이상. (Wikipedia, https://gameworldobserver.com/2022/12/08/dwarf-fortress-sales-160k-units-24-hours-steam)
- 비판 [사실]: 어려움, 나쁜 인터페이스, 튜토리얼 부재 ("trying to build a skyscraper by banging two rocks together", Ars Technica). Steam 판은 새 UI·픽셀 그래픽·튜토리얼을 더했고 리뷰는 압도적 긍정 (검색 요약).
- [해석] 가장 깊은 시뮬 중 하나가 입문 장벽(UI·튜토리얼)을 낮추자 판매가 터졌다는 사실은 있다. 다만 같은 시기에 Steam 입점·모딩·그래픽도 함께 바뀌어서 원인을 UI 하나로 쪼갤 수 없다.

### 2.9 Against the Storm (Eremite Games, 2023 얼리 액세스)

- 핵심 루프 [사실]: 도시 건설 + 로그라이트. 마을을 세워 생산하고, 여왕의 인내 막대가 차기 전에 평판을 채워야 한다. 폭풍이 오면 마을이 파괴되고 다음 지도로 간다. 해금한 능력은 이월. 한 판 약 2시간 목표. 마을마다 3종족의 필요가 다르다. (https://en.wikipedia.org/wiki/Against_the_Storm_(video_game) , https://www.gamedeveloper.com/road-to-igf-2023/how-against-the-storm-managed-to-mix-city-building-and-roguelite-play)
- 점수 [사실]: Metacritic 91 "universal acclaim", OpenCritic 95% 추천, Eurogamer 만점. 100만 장 이상(Steam, 2024-05).
- 설계 [사실, Game Developer 인터뷰]: "had to be a game about the town itself" (도시가 아바타). 주 목표는 판마다 달라지게 하는 것. 여왕은 두 막대에 "얇은 설정 층"을 입혀 타이머를 받아들이게 한다. 짧은 판이라 도구를 "ridiculous, overpowered, and very situational"로 만들어도 된다. 개발자가 직접 "far from perfect"라고 인정.
- 평가 [사실, 검색 요약]: 일반 도시 건설이 안정을 목표로 한다면 이 게임은 "constant change"에 적응하는 게임이다. 자원을 쌓아두고 버티는 전략을 막는다.
- [해석] 도시 건설의 "열린 무한 중반이 지루하다"는 문제를 시간 압박과 판 단위 구조로 풀었다.

## 3. 높은 평가를 받은 전략 게임의 공통점

다음은 위 자료에서 내가 뽑은 해석이다. 사실로 단정하지 않는다. 반례도 적었다.

| # | 공통점 (해석) | 근거가 된 사실 | 반례·한계 |
|---|---|---|---|
| a | 목표나 압력이 분명하다 (승리 조건, 시간, 위기) | Offworld 인수, Frostpunk 희망·불만, Against the Storm 여왕 타이머, Factorio 로켓 | 샌드박스형 CK3·DF는 목표 없이도 높은 평가 |
| b | 플레이어가 직접 내리는 선택이 재미의 중심이고, 반복 노동은 자동화나 규칙으로 흡수된다 | Factorio는 자동화를 플레이어가 설계, Patrician 선장 자동화 칭찬, 빅토리아3 대기열 노동 불만 | 자동화가 설정 노동을 낳으면 불만 (Port Royale 4) |
| c | 필요(소비)가 생산을 끌고, 그 인과가 한 줄로 읽힌다 | Anno 계층 필요, Frostpunk 불만, VIC3 부 단계 소비 | Anno 도 수요·생산선 해석이 어렵다는 일화 |
| d | 경제가 사람·사회의 이야기가 된다 (누가 고통받고 누가 이득을 보는가) | Frostpunk 법, CK3 스트레스·봉신, VIC3 pop 급진화·정치 | 이야기 엔진이 안 돌 때 "rote" (GameSpot의 CK3 평) |
| e | 판마다 달라진다 (지도, 종족, 시나리오) | Against the Storm 변주 목표, Offworld 무작위 지도 | 반복성 문제를 안 푸는 게임도 팔린다 (Factorio 한 번의 큰 판) |
| f | 정보가 읽힌다 (왜 적자인가, 무엇이 막혔는가) | 빅토리아3 중첩 툴팁, Offworld UI는 원인 찾기가 어렵다는 지적 | 정보가 많은 Anno 는 "spreadsheet" 비판 |
| g | 입문 장벽이 낮거나 낮춘 적이 있다 | DF 튜토리얼·UI, Destructoid 의 VIC3 튜토리얼 칭찬 | Capitalism 은 어렵다고 하면서도 교육용으로 팔림 |
| h | 단순한 규칙에서 복잡한 결과 | Frostpunk 설계 발표, 빅토리아3 "덜 세밀한 모델" 선택 | 상세 시뮬(DF)도 높은 평가 |

## 4. 우리 게임의 현재 위치 (대조용, 코드·문서 위치)

| 항목 | 현재 | 위치 |
|---|---|---|
| 건설 | 모든 공사가 왕실 건축사무소 포인트. 그날 포인트의 50%는 왕실 공사, 50%는 민간 공사. 민간 공사의 돈은 지역 저택·금융가 금고 | `docs/DESIGN.md:393-405`, `packages/sim/src/production.ts:220` |
| 민간 건설 결정 | AI가 연 손익÷공사비 > 0.2로 고른다. 돈줄은 저택·금융가가 정한다 | `docs/DESIGN.md:403`, `packages/sim/src/finance.ts:647`, `packages/sim/src/ai.ts:724` |
| 플레이어 손잡이 | 세금 수준·국영 임금·복지 세 단계, 회사로서 짓기 | `docs/DESIGN.md:14` |
| 투자 풀 | 없음. 남는 현금이 지역 금융가 지분과 저택 금고로 | `docs/DESIGN.md:519-526`, `packages/sim/src/market.ts:832` |
| 유보 자산 규칙 | 건물 유보 자산 기준 증설/철거 (`aiReserveRule`=1) | `docs/DESIGN.md:579`, `packages/sim/src/ai.ts:1124` |
| 새 투자 | 가격이 높은 상품·굶는 건물의 부족 투입재를 만드는 건물을 지음 | `docs/DESIGN.md:579`, `packages/sim/src/ai.ts:1071` |
| 못 판 산출 | 사라진다 | `docs/DESIGN.md:11` |
| 승리/목표 | 문서에서 정해진 승리·종료 조건을 찾지 못함 **[확인 못 함: 코드에서 별도로 확인 안 함]** | `docs/DESIGN.md` 1장 |

[해석] 우리 구조는 빅토리아3 1.7 이후의 "저택·금융가가 레벨을 소유하는" 모양과 닮았고 1.2의 "투자 풀"은 없앴다. 빅토리아3가 1.2~1.5에서 겪은 "자율 투자 AI의 위치 선정" 문제는 우리 AI 쪽(`ai.ts planConstruction`)에 같은 위험으로 남아 있다.

## 5. 우리 게임에 주는 교훈 (14개)

교훈마다 근거, 우리 게임과의 관계, 제약과의 충돌 여부를 적는다. "결정 필요"는 CLAUDE.md의 제약을 바꾸거나 시작 세계·플레이어에게 보이는 규칙을 크게 바꾸는 안이다. 전부 [해석]이다.

1. **플레이어를 대기열 관리자로 만들지 않는다.** 근거: 빅토리아3 대기열 노동 불만(1.4), Kotaku "accounting software", Reason "unwieldy". 우리: 민간 건설은 이미 AI가 하지만 왕실 공사는 플레이어 몫이다(`DESIGN.md:393-399`). 제안 방향: 플레이어의 결정을 "무엇을·어디에·얼마까지" 규칙으로 올리고 클릭 반복을 없앤다(예: 목표 레벨까지 자동 증설 규칙). 제약 충돌 없음.

2. **자동 투자의 품질 조건은 "고용을 채울 수 있는가"가 핵심이다.** 근거: 빅토리아3 1.5의 고용 95% 조건, 일꾼 없는 곳에 짓는 불만(1.4). 우리: `officeStaffable`·`minStaffing` 조건이 이미 있다(`DESIGN.md:571-574`). 오버홀에서 AI를 더 자율화할 때 이 검사를 먼저 유지한다. 제약 충돌 없음 (AI 판단은 복잡해도 됨).

3. **자동화를 키워도 되돌릴 수 없는 설정 노동을 만들지 않는다.** 근거: Port Royale 4의 경로 설정 불만(2.2). 규칙을 한 번 정하면 계속 적용되는 형태(민영화 켜기 같은)가 이미 있다(`DESIGN.md:411`). 새 자동화는 "설정해야 하는 항목 수"가 늘지 않는지 먼저 센다.

4. **자동화는 플레이어가 설계할 때 보상이 된다.** 근거: Factorio(2.5). 우리 게임에서 플레이어가 설계하는 대상이 무엇인지(산업 단계·방식 사다리, 정책 조합)를 오버홀의 중심 질문으로 둘 만하다. 결정 필요: 플레이어 정체성(왕실 전담인지 민간 상회인지)은 게임 방향이다.

5. **목표나 압력이 없으면 중반이 지루해진다.** 근거: Kotaku "dull once the routine set in", 반대로 Frostpunk·Against the Storm·Offworld의 분명한 압력(3장 a). 우리: 20년 고정 시뮬이고 종료·승리 조건이 문서에 없다 **[확인 못 함]**. 위기 이벤트와 가시적 마일스톤 안은 "플레이어에게 보이는 규칙을 크게 바꾼다"이므로 결정 필요.

6. **경제 수치를 사람의 이야기로 바꿔 보여 준다.** 근거: Frostpunk 희망·불만, CK3 스트레스, 빅토리아3 급진화(2.6~2.7). 우리: 소작농 빈곤을 착취로 만드는 제약이 이미 같은 방향이다. 화면에 설명 문구를 넣지 않는 제약 안에서는 막대·라벨·수치로만 해야 한다. 제약 충돌 없음, UI는 `docs/UI_CHANGES.md` 경로.

7. **"왜 적자인가"를 한눈에 볼 수 있게 한다.** 근거: 빅토리아3의 미리보기(1.1), Offworld "원인 찾기 어려움"(2.4), DF의 UI 장벽(2.8). 우리: AI용 손익 전망(`outlook.ts`)이 있다. 이것을 플레이어에게 같은 값으로 보여 주는 안이 가능하다. 화면은 다른 작업자 소관이므로 UI_CHANGES에 넘긴다.

8. **세계 규칙은 한 줄로 설명되게 둔다.** 근거: Frostpunk 개발자 "Making new gameplay does not always mean adding new content", 빅토리아3 설계자 "덜 세밀한 모델"(1.1), `CLAUDE.md` 작업 방식 1. 우리 소유·배당·유보 자산 규칙(`DESIGN.md:503-526`)은 길다. 플레이어에게 보이는 부분이 몇 줄로 줄어드는지가 오버홀 점검 항목이다.

9. **필요(소비) → 생산 사슬의 인과를 한 줄로 만든다.** 근거: Anno의 계층 필요(2.1). 우리: 부 단계 소비 묶음(`DESIGN.md` 5장)과 산업 유형. 부가 오르면 어떤 상품 수요가 새로 생겨 어떤 건물이 필요해지는지를 지표로 노출할 수 있다. 제약 충돌 없음.

10. **빅토리아3의 소유·투자 개편은 "누가 이익을 가져가는가"를 보이게 했다.** 근거: 1.7 소유 개편, 1.10 배당 75% 노동자 지급 법 효과(1.2 표). 우리 구조는 이미 같은 방향이다. 오버홀에서 "정책이 누구의 소득을 바꾸는가"를 세금·배당 표 하나로 요약하면 정책 결과가 이야기가 된다. 제약 충돌 없음.

11. **판마다 달라지는 요소가 반복성을 줄인다.** 근거: Against the Storm 변주, Offworld 무작위 지도(2.4, 2.9). 우리: 왕국 분할은 시드로 정해지지만 시작 세계·인구는 고정 규칙이다(`DESIGN.md:18-26`). 시작 세계·인구를 바꾸는 안은 결정 필요.

12. **상대(AI 왕국)와의 비교를 보이게 한다.** 근거: Offworld 대결 구조(2.4), 빅토리아3 AI 개선 반복(1.2). 우리: 왕국 3개가 같은 AI를 쓰므로 순위·격차 지표가 가능하다. 이런 순위가 "승리 조건"으로 읽히면 5번과 겹치므로 같이 결정한다.

13. **깊이가 입문 장벽이 되면 판매가 막힌다. 장벽이 낮아지면 터진다.** 근거: DF, Capitalism, 빅토리아3 "accessible 하지 않다"(1.3). 인과는 입증되지 않았다. 오버홀의 과제는 규칙 수를 늘리지 않고 초반 몇 시간의 이해를 돕는 것이다. 설명은 화면이 아니라 README(`CLAUDE.md` 제약).

14. **실패와 상실을 설계에 넣는다.** 근거: DF "Losing is Fun", Frostpunk 도덕적 비용, Against the Storm 폭풍 리셋. 우리: 파산·굶주림·반란이 어떻게 보이는지는 별개이고, 상실이 의미 있으려면 "지키려던 것"이 보여야 한다(소작농 생활수준 같은 지표). 결정 필요: 실패 조건(왕국 멸망·게임 오버)을 둘지는 게임 방향이다.

## 6. 오버홀 토론에서 쓸 반론 후보 (평가자용)

- "빅토리아3도 자율 투자 위에서 AI 위치 선정 불만이 2024년까지 이어졌다" 는 일화이므로 우리 AI가 낫다고 말하려면 우리 쪽 측정이 필요하다 (일화를 근거로 우리 구조를 나쁘다고 단정하지 않는다).
- "점수 높은 게임들이 목표가 분명하다" 는 샌드박스형 CK3·DF 반례가 있다.
- "DF가 UI로 팔렸다" 는 입점·모딩·그래픽이 함께 바뀐 사례라 UI 단독 원인이 아니다.
- 빅토리아3의 투자 풀 기여율 숫자는 개발 일지(1.2)와 위키(1.13)가 달라 어느 쪽도 현재값으로 쓰지 않는다 **[확인 못 함]**.

## 7. 확인 못 한 것 (재조사 후보)

- PC Gamer 빅토리아3 리뷰 본문, Eurogamer 리뷰 본문 (경제 관련 문장)
- 패러독스 개발 일지 #110 본문, DD57 본문 (소유·투자의 의도)
- Wube Friday Facts의 설계 원칙, Software Engineering Daily 인터뷰 전사 (https://softwareengineeringdaily.com/2024/11/07/factorio-with-michal-kovarik/)
- Anno Union 개발 블로그의 계층 설계 글 (https://www.anno-union.com/en/devblog-residential-tiers/)
- Capitalism Lab 독립 리뷰와 Steam 리뷰 요약
- Sid Meier "Interesting Decisions" 강연 내용 (GDC 2012, 글 요약만 봄: https://www.gamedeveloper.com/design/video-sid-meier-explores-interesting-decisions-in-gameplay)
- Soren Johnson GDC 2023 강연(Games and Meaning) 본문 (https://civfanatics.com/2023/04/16/soren-johnsons-gdc-talk-games-and-meaning-or-you-have-no-idea-how-hard-it-is-to-run-a-sweatshop/ 은 짧은 글)
- Port Royale 4의 정확한 집계 점수 (Metacritic 직접 값 못 찾음)

## 8. 출처 목록

빅토리아3
- https://www.gamedeveloper.com/design/deep-dive-modeling-the-global-economy-in-victoria-3
- https://paradoxinteractive.com/games/victoria-3/news/dev-diary-71-autonomous-investment-in-1-2
- https://vic3.paradoxwikis.com/Patch_1.2 , Patch_1.5 , Patch_1.7 , Patch_1.9 , Patch_1.10 (Patch_1.7 요약에 "Removed the Directly Controlled Investment Game Rule"가 있었다. 요약이라 어느 패치 것인지 **[확인 못 함]**)
- https://www.pcgamesn.com/victoria-3/construction
- https://admin-forum.paradoxplaza.com/forum/developer-diary/dev-diary-36-construction.1513612 (검색 요약)
- https://en.wikipedia.org/wiki/Victoria_3
- https://kotaku.com/victoria-3-review-paradox-pc-kotaku-impressions-verdict-1849669988
- https://reason.com/2023/04/14/victoria-3/
- https://www.gamepressure.com/newsroom/victoria-3-still-awaits-rescue-new-expansion-falls-short/z156c3
- https://vaporlens.app/app/529340/victoria_3/stats/details
- https://steamcommunity.com/app/529340/discussions/0/4408542785991194884

다른 게임
- https://en.wikipedia.org/wiki/Anno_1800 , https://gamesbeat.com/anno-1800-hands-on-being-a-capitalist-in-the-age-of-industrialization/
- https://en.wikipedia.org/wiki/Patrician_IV , https://primagames.com/featured/port-royale-4-review , https://ipv6.gamereactor.eu/port-royale-4-review/
- https://en.wikipedia.org/wiki/Capitalism_(video_game) , https://www.capitalismlab.com/?p=7180
- https://en.wikipedia.org/wiki/Offworld_Trading_Company , https://gdconf.com/news/come-gdc-2017-learn-took-make-rts-without-guns
- https://en.wikipedia.org/wiki/Factorio , https://forums.factorio.com/3026
- https://en.wikipedia.org/wiki/Frostpunk , https://www.invenglobal.com/articles/6528/igc-2018-empathize-with-numbers-the-process-of-frostpunk-scenario-writing
- https://en.wikipedia.org/wiki/Crusader_Kings_III
- https://en.wikipedia.org/wiki/Dwarf_Fortress , https://gameworldobserver.com/2022/12/08/dwarf-fortress-sales-160k-units-24-hours-steam
- https://en.wikipedia.org/wiki/Against_the_Storm_(video_game) , https://www.gamedeveloper.com/road-to-igf-2023/how-against-the-storm-managed-to-mix-city-building-and-roguelite-play
