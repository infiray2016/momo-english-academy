# AI 코딩에서의 그래프 엔지니어링 (2026-10-16 수정 조사)

요청자가 "AI 코딩에서의 그래프 엔지니어링을 말한 것"이라고 바로잡았다. 앞선 조사(`2026-10-16-graph-engineering.md`)는 이 뜻을 네 갈래 중 하나로 두고 "앱엔 쓸 곳 없고 개발 과정은 이미 그 모양"이라 밀어 뒀다 [I5]. 그 판단은 틀렸다.
이번에는 코딩 에이전트로 소프트웨어를 만드는 현장의 뜻을 정면으로 읽었다. 대괄호 숫자는 끝의 출처 표 번호이고 [I1] 꼴은 이 저장소의 파일이다. 쪽을 작은 모델이 읽고 답하는 도구로 받은 것은 "추출", 쪽 전체를 받은 것은 "전문"으로 표시했다. 인용은 원문 그대로이고 내 해석은 "(추정)"이나 "(내 판단)"으로 가렸다.

## 요지

1. 뜻. 일을 점(node)으로 나눈다. 점 사이의 길(선, edge)과 넘길 상태를 미리 그린다. 길은 에이전트가 아니라 설계자가 정한다 [3][4][20].
2. 시작과 층. 2026-07-18 피터 스타인버거의 글 한 줄이 불씨다 [2]. 새 기술이 아니라 이름이 붙은 사건이라는 비판이 맞다 [3][7][8]. 프롬프트, 컨텍스트, 하네스, 루프 위에 쌓이는 층이고 아래 층을 없애지 않는다 [4][17].
3. Claude Code. 점은 서브에이전트, 반드시 가는 선은 훅, 절차는 스킬, 길을 코드로 쥐는 쪽은 동적 워크플로다 [24][25].
4. 좋은 그래프. 루프로 시작하고, 점은 신호가 있을 때만 더한다. 검증은 선 위에 코드로 둔다. 쓰기는 한 줄기로 한다 [5][6][23].
5. 코드베이스 지식 그래프(Graphify)는 다른 그래프다. 묻는 것이 다르다 [11]. 코드가 생긴 뒤 시험을 통과하면 들인다 [32].
6. 우리 프로젝트의 네 흐름은 이미 그래프 모양이다. 고칠 곳은 넷이다. 상태 사본, 사람 지시에 기댄 정지 조건, 선 위의 코드 게이트 부족, 에이전트 정의의 추론 수준 불일치다 [I1][I2][I4].
7. 제안. 시드 생성과 델타 spec 검토는 워크플로 스크립트로, 변경 단위 흐름은 스킬로, 구현과 화면 검토는 서브에이전트와 훅으로 둔다.
8. 확신이 낮은 곳. 8월 2일 워크숍 내용, 동적 워크플로 출시일, Graphify 토큰 절감 수치는 확인하지 못했다.

## 정의와 계보

| 출처 | 정의 (원문) |
|---|---|
| 가이드 [4] 2026-07-20 | "Graph engineering is the practice of designing the graph your agents run in" |
| 위키독스 [20] | "그래프 엔지니어링이란 AI 작업 흐름을 노드·엣지·스테이트·컨디션의 명시적인 그래프로 설계하고, 에이전트가 어느 경로로 일할지를 코드로 통제하는 방법입니다." |
| Holmberg [3] 2026-07-20 | "the difference is who decides the path, the agent or you." |

한 문장으로 줄이면 이렇다. 코딩 일을 점으로 나누고, 선과 공유 상태를 미리 그려, 에이전트의 자유를 점 안에 가둔다 (내 정리 [3][15][20]).

| 요소 | 뜻 | 출처 |
|---|---|---|
| 점(node) | 한 가지 일을 하는 단위. 전문 에이전트, 결정 코드, 도구 호출, 라우터, 사람 승인이 된다. 모델이 필요 없으면 코드로 둔다 | [4][8][17] |
| 선(edge) | 다음에 어디로 갈지. 직선, 조건, 되돌림 | [4][17] |
| 갈라 보내기 · 모아 받기 | 한 점이 여러 점을 동시에 시작하고(fan-out) 결과를 하나로 합친다(fan-in). 합치는 자리는 모두 끝나길 기다리는 장벽이다 | [4][28] |
| 공유 상태(shared state) | 선을 따라 흐르며 모든 점이 읽고 쓰는 기록. 값의 종류와 병합 규칙을 먼저 정한다 | [4][8] |
| 점검 지점(checkpoint) | 상태를 저장해 둔 자리. 멈췄다 이어 가고, 실패한 점만 다시 한다 | [8][24] |
| 게이트(gate) | 선 위에서 결과를 검사해 통과나 되돌림을 정하는 자리. 코드, 모델, 사람이 맡는다 | [3][17][18] |
| 사람 게이트 | 되돌리기 어려운 행동 앞에서 사람이 승인하는 게이트. 흐름을 멈추고 상태를 저장한 뒤 재개한다 | [8][18] |
| 노드 안의 루프 | 점 하나가 스스로 돌며 일한다. "a loop is just a single-node graph with an edge back to itself" | [4][10] |

"점검 지점"은 두 뜻으로 쓰인다. 상태 저장 [8]과, 결과를 읽고 길을 정하는 검사 [3]다. 이 문서는 저장을 점검 지점, 검사를 게이트라 부른다.

| 층 | 묻는 것 [17] | 확인한 첫 글 |
|---|---|---|
| 프롬프트 | 어떻게 말할까 | 확인하지 않음 |
| 컨텍스트 | 무엇을 보여 줄까 | Anthropic 정의 글 2025-09-29 [22] |
| 하네스(harness, 도구 · 검증 · 권한의 틀) | 어떤 환경에서 돌릴까 | Hashimoto 2026-02-05 "Engineer the Harness" [21] |
| 루프 | 언제까지 반복할까 | Steinberger 2026-06-07 [1] |
| 그래프 | 역할을 누구에게 어떻게 나눌까 | Steinberger 2026-07-18 [2] |

가이드의 연도 표기(프롬프트 2023~24, 컨텍스트 2024, 하네스 2025, 루프 2026 초, 그래프 2026 중반)는 하네스에서 어긋난다. 확인한 첫 글은 2026-02-05다 [4][21].
층은 쌓인다. 코드브릿지는 "이 다섯 단계는 앞 단계를 없애면서 넘어가는게 아니라요. 그 위에 하나씩 쌓이는 느낌에 가까워요"라 했다 [17]. TrueFoundry는 "these layers compose rather than supersede"라 적었다 [13].

## 어디서 왔나와 비판

| 날짜 | 사람 · 글 | 내용 | 출처 |
|---|---|---|---|
| 2026-06-07 | Peter Steinberger, X | "you shouldn't be prompting coding agents anymore. You should be designing loops that prompt your agents." 좋아요 19,759 | [1] |
| 2026-07-18 | Peter Steinberger, X | "Are we still talking loops or did we shift to graphs yet?" 좋아요 7,770. 답글 상위가 "im tired boss" | [2] |
| 2026-07-20 | Holmberg · Khourshid · Chase, X | 길을 누가 정하나 · 상태 기계의 재발견 · "it's basically just langgraph?" | [3] |
| 2026-07-22 | LangChain (Runkle, Chase) | "3 Years of Graph Engineering with LangGraph" | [15] |
| 2026-07-26 ~ 31 | 코드브릿지 | 영상(07-26), 인프런 강의(07-31) | [17][19] |
| 2026-08-21 | arXiv 2608.21156 | 서베이. 저자 35명 | [16] |
| 기능 | Claude Code 동적 워크플로 | 공식 문서에 출시일이 없다. 2차 글은 2026-05-28이라 한다(미확인) | [24][34] |

"용어가 6주마다 바뀐다"는 말 [17]은 날짜로 보면 과장이다. 확인한 글 기준으로 하네스에서 루프까지 122일, 루프에서 그래프까지 41일이다 (내 계산 [21][1][2]).

| 비판 | 누가 | 원문 | 맞는 부분 |
|---|---|---|---|
| 결국 LangGraph | Chase 2026-07-20, LangChain 07-22 | "it's basically just langgraph?" · "Representing agentic systems as graphs isn't new, we've been doing it for three years!" | 구조는 3년 전부터 있었다 [3][15] |
| 상태 기계의 재발견 | Khourshid 2026-07-20 | "Nothing is new; don't fall for the hype." 루프는 순환 그래프이고 switch 문으로도 된다 | 맞다 [3] |
| 루프를 대체하지 않는다 | Kokane 2026-08-05 | "What actually happened in mid-July was a naming event, not a shipping event." | 루프는 점 안에 중첩된다 [7] |
| 발명이 아니라 이름 | Deshmukh 2026-08-11 | "So this is a naming event, not an invention." Airflow DAG, 액터 모델, 1980년 계약망 프로토콜을 든다 | 이력서에 쓰지 말라 [8] |
| 목표와 측정이 본질 | Huryn (AIBC 인용) | "I call BS on graph engineering. Loop engineering was already confusing." | 원문 미확인 [5] |
| 병렬 쓰기는 취약 | Cognition 2025-06-12, 2026-04-22 | "running multiple agents in collaboration only results in fragile systems" → "writes stay single-threaded" | 코딩은 의존이 크다 [23] |

비판이 맞는 부분은 셋이다. 부품은 새롭지 않다. 루프를 없애지 않는다. 대부분의 일은 루프 하나로 된다 [5][7].
비판이 놓친 부분도 있다. 달라진 것은 점 안에 넣을 수 있는 것이다. 점 하나가 코딩 에이전트 한 세션이 된다 [15]. Claude Code는 계획을 코드로 옮긴 동적 워크플로를 기능으로 냈다 [24]. 이름보다 도구가 먼저였다고 본다 (추정, 출시일 미확인).

## 어떻게 하나

공식 문서는 수단을 "누가 계획을 쥐나"로 가른다 [24].

| 수단 | 길을 정하는 쪽 | 중간 결과가 사는 곳 | 규모 | 한계 | 출처 |
|---|---|---|---|---|---|
| 서브에이전트 | Claude, 턴마다 | Claude의 컨텍스트 | 턴마다 몇 개 | 중첩 기본 3층, 동시 20개 | [24][25] |
| 스킬 | Claude, 지침을 따라 | Claude의 컨텍스트 | 같음 | 지침이라 강제가 아니다 | [24][25] |
| 훅 | 코드, 사건마다 | 종료 코드와 피드백 | 이벤트 33종 | 판단은 못 한다 | [25] |
| 에이전트 팀 | 리드 에이전트 | 공유 작업 목록 | 팀원 서너 명 | 실험 기능. 같은 파일을 쓰면 덮어쓴다 | [25] |
| 동적 워크플로 | 스크립트 | 스크립트 변수 | 수십 ~ 수백 | 실행 중 사용자 입력 없음. 동시 16개, 한 번에 총 1,000개 | [24] |

| 그래프 요소 | Claude Code의 수단 | 출처 |
|---|---|---|
| 점 | `.claude/agents/*.md` 정의(name · description · tools · model · effort · hooks · isolation · maxTurns). 스킬의 `context: fork`. 워크플로의 `agent()`(agentType · schema · model · effort · isolation). 노드 안의 루프는 에이전트 자신의 작업 루프, 스크립트의 while, maxTurns | [25][28] |
| 선 | 모델이 정하는 선은 메인 세션의 위임과 스킬 지침. 코드가 정하는 선은 워크플로 스크립트의 `pipeline` · `parallel` · 조건문 | [24][28] |
| 반드시 가는 전이 | 훅. "make it a hook, not a polite instruction" | [5][25] |
| 공유 상태 | 산출물 파일(JSON · MD), 스크립트 변수, 공유 작업 목록. 파일은 쓰는 점을 하나로 둔다 | [10][22][24][25] |
| 코드 게이트 | 훅 종료 코드 2, `schema` 검증(다섯 번 재시도), 테스트 · 린트 | [24][25] |
| 모델 게이트 | 새 컨텍스트의 읽기 전용 검토 에이전트 | [5][23] |
| 사람 게이트 | 워크플로는 실행 중 입력을 못 받는다. "For sign-off between stages, run each stage as its own workflow". 에이전트 팀의 계획 승인은 리드가 바로 승인한다 | [24][25] |
| 점검 지점, 갈라 보내기, 모아 받기 | 같은 세션 재개(끝난 에이전트는 저장 결과). `parallel`은 장벽(모아 받기), `pipeline`은 장벽 없음이 기본 | [24][28] |

실무 글의 구현은 단출하다. Masterclass는 세 에이전트가 JSON 파일을 이어받고, 사람은 끝났다는 문구를 눈으로 본 뒤 다음 세션을 연다 [10]. 독립성이 프롬프트에 기대고 필자의 시연이 모순이라는 지적이 있다 [11]. AI Builder Club은 서브에이전트가 점, 위임이 선, 훅이 항상 가는 선이라 적고 코드 예시는 없다 [5]. ContractGraph는 믿을 것(컨텍스트)과 내놓을 것(계약)을 점마다 정하고 실패한 점만 고친다 [6]. mer.vin의 14단계 로드맵은 출력이 다음 프롬프트로 넘어갈 때만 선이 생기고, 변수가 넘어가지 않는 화살표는 끊어 병렬로 넓히라고 한다 [14].
AI Builder Club은 8월 2일 워크숍에서 "the two ways to enforce a graph"를 다루고, 코드 대신 "a skill with the SOP inside it"(SOP는 표준 작업 절차)을 기본으로 쓰는 까닭을 설명했다고만 적었다. 내용은 찾지 못했다 [4][33]. 공식 표로 읽으면 두 길은 코드(훅 · 스크립트)와 지침(스킬)이다 (내 해석, 추정).

| 도구 | 점 | 선 | 상태 | 저장 · 재개 · 사람 승인 | 출처 |
|---|---|---|---|---|---|
| LangGraph | StateGraph의 노드 | 정적 · 조건 엣지, Send(동적 갈라 보내기) | 타입 있는 상태와 병합 규칙(reducer) | checkpointer와 thread_id · interrupt()와 Command(resume=) | [29][8] |
| Google ADK | 에이전트 | Sequential · Parallel · Loop 워크플로 에이전트(AI 없이 순서를 정함). 2.0부터 그래프 기반 워크플로가 대체 | 원문에 없음 | 원문에 없음 | [29] |
| AutoGen, Microsoft Agent Framework | 에이전트, 실행자(executor) | 엣지, 오케스트레이션(순차 · 동시 · 넘기기 · 그룹 채팅 · Magentic) | 상태 · 이벤트 | 체크포인트와 재개 · 사람 입력 대기. AutoGen은 유지보수 모드 | [29] |
| Anthropic 다섯 꼴 | LLM 호출 | 연쇄 · routing · 병렬 · 지휘자와 일꾼 · 생성자와 평가자 루프 | 앞 호출의 출력 | 추출에서 확인하지 못함. "graph"라는 말이 없고 "simplest solution possible"부터 | [22] |

| 좋은 그래프의 규칙 | 근거 | 출처 |
|---|---|---|
| 루프로 시작한다. 신호가 있을 때만 점을 더한다. 신호는 다섯이다. 전문성이 다름, 갈라 보낸 뒤 합침, 단계마다 다른 모델이나 도구, 감사할 제어 흐름, 검증자 하나의 과부하 | "One node per signal you actually have." | [5] |
| 점 하나에 일 하나. 이름은 두세 단어, 수행은 서너 문장. 입력 · 출력 · 다음 단계 · 실패 정의를 적는다 | 이름에 동사가 둘이면 쪼갤지 본다. 단계마다 정해진 입력 · 산출물 · 다음 단계가 "explicit ownership"이다 | [20][11] |
| 모델이 필요 없는 점은 코드로 둔다. 애매한 판단은 AI나 사람, 필수 규칙은 코드 | "if a node does not need a model, do not use one." | [8][18] |
| 검증은 선 위에 코드로 둔다 | "A model can argue that its work is complete. A deterministic validator can prove that a required field is missing." | [6] |
| 쓰기는 한 줄기, 읽기와 검토는 여럿. 검토는 새 컨텍스트에서 읽기 전용 | "clean context leads to a notable improvement in capabilities when using a generator-verifier loop" | [23][5] |
| 공유 상태를 먼저 설계한다. 쓰는 점은 하나 | "State is the contract between every node." "State drift is the #1 way graphs rot." | [8][4] |
| 상한은 코드에 둔다. 사람 게이트는 가장 되돌리기 어려운 행동 앞에 하나 | "cap in code, never in a prompt" | [8] |

| 흔한 실패 | 모습 | 출처 |
|---|---|---|
| 루프 모양 문제에 그래프 | "most people reaching for a graph have a loop-shaped problem and a verifier they never bothered to strengthen" | [5] |
| 약한 점을 이어 붙임 | "A graph of weak nodes is just slop produced in parallel." | [5] |
| 독립성을 프롬프트에 기댐 | 읽지 않는다고 쓰고 읽으라고 지시한 시연 | [11] |
| 저장을 내구 실행으로 착각 | "Checkpoints are not durable execution." | [8] |

## 코드베이스 지식 그래프

이 그래프는 흐름 그래프와 다르다. 다섯 말을 가르는 글은 앞 넷(온톨로지 · 지식 그래프 · 컨텍스트 그래프 · 코드 그래프)이 시스템이 아는 것을, 그래프 엔지니어링이 시스템이 행동하는 방식을 다룬다고 갈랐다 [9]. Wavect도 "The term is still emerging, so precision matters."라며 실행 그래프와 지식 그래프를 한 글에서 함께 다룬다 [12].

| 출처 [11] | 코드 지식 그래프 | 에이전트 흐름 그래프 |
|---|---|---|
| 점 · 선 | 파일 · 함수 · 경로 · 문서 / 가져오기 · 호출 · 참조 | 탐색 · 구현 · 테스트 · 검토 / 허용된 전환과 넘기기 |
| 묻는 것 | "What connects this route to the database?" | "What runs after the tests fail?" |
| 위험 | 빠졌거나 낡았거나 추정된 관계 | 조율 비용, 불분명한 책임 |
| 만드는 법 | 코드에서 뽑는다. 파생물이다 (내 판단) | 설계자가 그린다. 정본이다 (내 판단) |

| Graphify | 내용 | 출처 |
|---|---|---|
| 하는 일 | "Turn any codebase, with its docs, SQL schemas, configs, and PDFs, into a queryable knowledge graph." 벡터 저장소가 없다. 코드는 tree-sitter로 로컬 파싱(LLM 없음), 문서 · PDF · 이미지는 모델이 읽는다. 버전 0.9.53(2026-08-30) [31], 공개 2026-04-05 [32] | [30] |
| 설치 · 명령 | Python 3.10+, `uv tool install graphifyy`(PyPI 이름은 y 둘), `graphify install`, 에이전트에서 `/graphify .`. `graphify query "<질문>"` · `path A B` · `explain "<이름>"` · `extract`(코드만 오프라인) · `update .` · `hook install`(커밋 때 재빌드) | [30] |
| 산출물 · 연결 | `graphify-out/`의 graph.json · GRAPH_REPORT.md · graph.html. Claude Code는 훅이 검색 전에 그래프를 권하고 `.claude/skills/graphify/SKILL.md`를 쓴다. Codex · Cursor는 AGENTS.md · 규칙 파일 | [30] |
| 선의 출처 표시 | EXTRACTED(소스에 명시)와 INFERRED(graphify가 해석해 도출). 리뷰 둘은 AMBIGUOUS까지 적지만 README에는 없다 | [30][31][32] |

절감 수치는 조건이 다르다. README의 80% 절감은 유료 Graphify Cloud 문구이고 방법이 없다 [30]. 71.5배는 큰 모노레포의 한 질의(약 12만 3천 대 1천 7백 토큰)이고 글쓴이도 천장이라 부른다 [32]. 벤치마크 원문(갱신 2026-07-05)은 ERPNext 질문 6개에서 핵심 사실 포함률이 70.8%에서 82.0%로 올랐다고 적는다. 고정 에이전트, 최대 14턴, 질의당 약 14만 토큰이며 저자 자체 측정이다 [30]. 리뷰의 결론은 "Those results justify a pilot, not an ROI claim."이다 [31]. 만드는 비용은 둘로 갈린다. 코드 파싱은 LLM 크레딧이 0이지만 문서 · PDF · 이미지는 모델이 필요하고, 도입에는 설치 · 저장소 규칙 · 보안 검토 · 교육 · 유지보수가 든다 [30][31]. 작은 코드베이스에서는 그래프를 만드는 시간이 버그를 찾는 시간보다 길었다는 경험담이 있다 [32].

| 대안 | 꼴 | 자기 주장 |
|---|---|---|
| CodeGraph | 실시간 MCP 서버, 20개 이상 언어 | 도구 호출 92% 감소, 탐색 71% 빠름(6곳) |
| codebase-memory-mcp | MCP 서버, 158개 언어, arXiv 예비 논문 | 31곳 평균 토큰 10배 · 호출 2.1배 감소, 최선 120배 |
| code-review-graph | SQLite, 저장 때 증분 갱신, 코드 검토용 | 토큰 85% 감소 |
| 도구 없음 | grep으로 찾는 에이전트 검색 + 심볼 검색(LSP) + 계층 CLAUDE.md | Anthropic 권고 [27] |

대안 세 줄은 비교 글 [32]의 요약이고 각 저장소는 열지 않았다. 각사 수치는 기준선 · 저장소 · 질문이 달라 서로 비교할 수 없다 [32].
Anthropic은 색인을 두지 않는 쪽이다. 임베딩 색인은 개발 속도를 못 따라 낡는다. grep 탐색에는 "no embedding pipeline or centralized index to maintain"라고 적었다 [27]. 들일 조건은 셋이다. 파일이 수백 개를 넘고 모듈 사이 의존이 깊다(글쓴이 기준 500+). 에이전트가 같은 구조를 다시 찾느라 턴을 많이 쓴다. 15분 시험에서 이긴다 [32].
15분 시험은 최근 실제 질문 하나를 grep만으로, 그리고 그래프로 풀어 토큰 · 도구 호출 · 정확도를 견주는 일이다. 채택 기준은 "verified accuracy, completion time and reviewer effort improve"다 [31][32]. 낡음이 숨은 비용이다. 정적 산출물은 다시 만들 때까지 낡고, `graphify hook install`이 커밋 때 다시 만든다 [30][32].

## 우리 프로젝트에 적용

읽은 것은 CLAUDE.md 둘, 에이전트 정의 다섯, 스킬 다섯, intent · specs README, 6.3 시드 생성, 검토 루프 장부, 볼트 두 쪽이다. 표는 넷이다. 가는 변경 단위 흐름 [I2][I3][I4], 나는 검토 루프 [I4], 다는 시드 생성 [I3], 라는 화면 구현 · 검토 [I2][I3]다. 괄호는 게이트 종류(코드 · 모델 · 사람)다.

| 가 변경 단위 흐름 | 하는 쪽 · 모델 | 들어오는 것 | 나가는 것 · 상태 | 다음 점 조건 |
|---|---|---|---|---|
| 1 intent 받아 적기 | Claude, intent-capture 스킬 | 요청자 말 | intent.md draft → review | 요청자가 맞다고 한다 (사람) |
| 2 intent 승인 | 요청자 | intent.md | approved, 커밋 | "응". 아니면 1로 (사람 게이트 ①) |
| 3 델타 spec 쓰기 | 편집자 Opus · high, spec-design 스킬 | approved intent, 정본 11장 | spec.md review, 원칙 대조표 | 컨트롤러 검토. 참조가 정본에 있고 대조표가 안 비었다 (모델) |
| 4 spec 승인, 정본 반영 | 요청자, 편집자 | spec.md | approved, 커밋, 13절 한 줄 먼저, specs/ 장 | "응" 또는 바꿀 번호. 끝 검색 0건 (사람 게이트 ②, 손 검색) |
| 5 plan 쓰기 | Claude, plan-build 스킬, plan mode | spec, 정본, 실제 파일 | plan.md review | 파일 · 순서 · 위험 · 증명이 찼다 (자기 점검) |
| 6 plan 승인 | 요청자 | plan.md | approved, 커밋 | "응" (사람 게이트 ③) |
| 7 구현 | implementer Opus · high | plan, 브리프 task-*.md | diff, 보고 파일 | 테스트 통과 (구현자 자기 보고) |
| 8 코드 검토, 화면 검토 | code-reviewer, design-reviewer Opus | diff, 브리프, 정본, 스크린샷, 목업 | review-*.md (심각도 · 근거) | Critical · Important 0이면 다음, 아니면 7로 (모델, 루프) |
| 9 커밋 | 요청자 지시, Claude | 통과한 diff | 커밋, plan.md done | "커밋" (사람 게이트 ④) |
| 10 기록 | 전역 Stop 훅 | 이번 턴 | 볼트 기록 표시 | 표시가 없으면 턴이 안 끝난다 (훅, 코드 게이트) |

공유 상태는 각 파일의 상태 줄, `.superpowers/sdd/` 장부, `intent/README.md` 표, 볼트 AI-SDLC 표에 산다. 같은 상태가 세 곳에 손으로 적힌다.

| 나 검토 루프 | 하는 쪽 · 모델 | 들어오는 것 | 나가는 것 · 상태 | 다음 점 조건 |
|---|---|---|---|---|
| A 검토 | analyst Opus · xhigh | 브리프 common · a, 정본 | round-N-a.md 지적 표 | 둘 다 끝나면 판정으로 (갈라 보내기) |
| B 검토 | analyst Opus · xhigh | 브리프 common · b | round-N-b.md | 위와 같음 |
| 판정, 결정 | 컨트롤러, 요청자 | A · B 보고 | task-rN-apply.md(결정 R · S · T · C, 대상 없음, 끝 검색 목록), 13절 결정 기록 | 요청자 결정 필요가 있으면 사람(제품 방향이 바뀌는 것만), 없으면 반영 (모아 받기) |
| 반영 편집 | 편집자 Opus (6회차부터 high, 제자리 수정) | task-rN-apply.md | spec · intent, round-N-applied.md | 반영 · 일부 · 미반영 · 대상 없음 건수 |
| 끝 검색 | 컨트롤러 | 고친 spec | 13절 밖 옛 전제 0건 | 0건이면 다음 (손 검색) |
| 종료 판정 | 컨트롤러, 요청자 | Critical · Important 건수 | 다음 회차 또는 종료 | 0건 또는 요청자 지시 |

Important 합계는 1~5회차에 51 · 55 · 51 · 39 · 24건, Critical은 6 · 2 · 3 · 0 · 0건이다. spec은 309줄에서 1,431줄로 늘었고 반영 시간은 2~5회차에 34 · 47 · 62 · 72분이다. 5회차 초점이 4회차 반영이 만든 새 모순이었다. 숫자 검산 · 참조 대조 · 옛 말 검색을 사람과 검토 에이전트가 손으로 했다. 5회차에서 멈춘 것은 건수 0이 아니라 요청자의 방향 수정이다.

| 다 시드 생성 (영역 × 단계 묶음) | 하는 쪽 · 모델 | 들어오는 것 | 나가는 것 · 상태 | 다음 점 조건 |
|---|---|---|---|---|
| 1 도구 만들기 | implementer Opus · high | 시드 Zod 규격, 어휘 배정 함수 | 검증 · 풀이 검사 스크립트 | 테스트 통과 (코드) |
| 2 규격 확정 | curriculum-designer Opus · xhigh, 요청자 | 단계표, 규격 48 · 240, 어휘 배정표 | 구간별 단원 틀 | 요청자가 단원 틀 값을 확인 (사람 게이트) |
| 3 표본 생성 | 본 생성용 정의(브리프만 읽음) | seed/prompts/<영역>-<단계>.md | 묶음마다 표본 2개, xhigh 대 high 4단원 | 통과율 차이 5%p 이하면 같다. 요청자가 effort 결정 (사람) |
| 4 단원 생성 | 학습 설계자 에이전트를 단원마다 새로 하나 (갈라 보내기) | 브리프, 단원 규격, 어휘 배정표, 앞 수업 주제 목록 | 수업 · 카드 JSON, seed/manifest(모델 ID · effort · 해시) | 시작 때의 해시와 모델이 그대로여야 한다. 바뀌면 묶음 처음부터 (컨트롤러가 해시를 비교, 코드로 옮길 수 있다) |
| 5 시드 검증, 풀이 검사 | 검증 스크립트(6.4), 검증기가 Sonnet 5.5 · effort low를 부름 | JSON, 정답 있는 문항(정답은 숨김) | 통과 또는 실패 칸, seed/checks/ 저장 결과 | 실패 칸은 seed.max_retries 회 다시 생성, 그래도 실패면 사람이 고침. 앱 정답과 다르게 풀리면 사람 확인 목록 (코드, 모델, 사람) |
| 6 사람 표본 검토 | 요청자 | 묶음마다 수업 2개를 아이 화면으로 | seed/reviews/*.json | 오류가 나오면 표본 5개. 같은 오류 둘이면 프롬프트를 고쳐 묶음 재생성 (사람 게이트) |
| 7 묶음 합치기, 완전성 검사 | 컨트롤러, CI main 작업 | 묶음 결과 | 개발 DB → 운영 DB | 검증 · 풀이 검사 · 사람 확인을 마쳐야 다음 묶음 (모아 받기). 빈 칸 0이 배포 관문 (코드) |

1차 범위는 영역 4 × 1~6단계 묶음, 단원 122개, 동시 2~3세션이다. 세션 셋이면 약 21~42시간으로 추정한다.

| 라 화면 구현 · 검토 | 하는 쪽 · 모델 | 들어오는 것 | 나가는 것 · 상태 | 다음 점 조건 |
|---|---|---|---|---|
| 1 브리프 쓰기 | 컨트롤러 | plan의 작업 하나, 정본 절, 목업 | task-N.md (허용 파일) | 허용 파일이 겹치지 않는다. 동시 2~3개 (사람 눈) |
| 2 구현 | implementer Opus · high | 브리프 | diff, 보고 파일 | 상태 DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED |
| 3 코드 검토 | code-reviewer | diff, 브리프, 정본 | 판정(Approved, 수정 필요), 지적(심각도 · 파일:줄) | Approved면 5, 수정 필요면 4 (모델) |
| 4 고치기 라운드, 범위 한정 재검토 | implementer, code-reviewer | 지적 목록, fix diff | 보고 파일 끝 "## fix round N", 지적별 ADDRESSED · NOT ADDRESSED, 새로 깨뜨린 것 | 전부 ADDRESSED면 5. 아니면 한 번 더. 상한 없음 |
| 5 화면 검토 | design-reviewer | 스크린샷, 목업, 정본 문구 | 판정, 지적 | Approved면 6, 아니면 4 (모델) |
| 6 커밋 | 요청자 | 통과한 diff | 커밋 | "커밋" (사람 게이트) |

쓰는 점은 구현자 하나이고 검토자는 읽기 전용이다. Cognition의 규칙과 같다 [23]. 검토자는 테스트를 다시 돌리지 않으므로 코드 검사가 검토 앞에 있어야 한다.

| 흐름 | 권하는 수단 | 까닭 |
|---|---|---|
| 가 변경 단위 | 스킬 SOP와 훅 게이트. 지금 그대로 | 단계마다 사람 승인이 있고 워크플로는 실행 중 입력을 못 받는다 [24] |
| 나 검토 루프 | 저장 워크플로 둘(이름은 제안). /review-delta-spec(A ∥ B → 병합, 건수는 schema로 코드가 센다)과 /apply-review(반영 → 끝 검색). 사이에 판정과 결정 | 갈라 보내기와 모아 받기가 실제로 있다. 변경 단위마다 델타 spec 검토가 되풀이된다(말하기 · AI 쉬는 중이 작성 중) [24][28][I3] |
| 다 시드 생성 | 묶음마다 워크플로 한 번. `pipeline`으로 단원 → 생성 → 검증. agentType은 curriculum-designer, 호출마다 model · effort 명시, 동시 3개는 `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS=3`. 묶음 사이는 사람 | 같은 단계의 반복에 결정론적 검증과 재시도. 한 묶음이 단원 5개라 "Large workflow" 경고(25개 초과)에 걸리지 않는다 [24][28][I1] |
| 라 화면 구현 · 검토 | 서브에이전트와 훅. 스크립트로 올리지 않고 에이전트 팀도 쓰지 않는다 | 점이 대여섯이고 한 번에 2~3개다. 쓰기는 한 줄기다 [24][25] |

고르는 기준은 이렇다. 사람 승인이 단계마다 있으면 스킬, 같은 단계를 여러 건에 되풀이하면 워크플로, 곁일 격리면 서브에이전트, 반드시 지킬 전이는 훅이다 [24][25]. 나 · 다의 워크플로는 에이전트 수와 모델이 지금과 같다. 달라지는 것은 선을 쥐는 쪽이 대화에서 스크립트로 옮겨 가는 점이다 (추정). LangGraph 같은 별도 프레임워크는 들이지 않는다. 같은 일을 Claude Code의 워크플로와 훅이 하고, 앱의 AI 호출은 단발 구조화 출력이다 [I5][24]. 제안은 위 표의 나 · 다와 아래 F1~F5다.

| 번호 | 지금 | 바꿀 것 (더하기 · 빼기) | 근거 | 비용 추정 |
|---|---|---|---|---|
| F1 | 상태가 세 곳에 손으로 | intent.md 머리줄을 정본으로 두고 README 표와 볼트 표는 만든다. 손 갱신을 뺀다 | [4][8] | 반나절 |
| F2 | 3 → 4 사이 확인이 사람 읽기, 끝 검색이 손 | 이전 조사의 P3(번호 추출 · 검사)를 게이트로 건다. 손 검색 · 숫자 검산을 뺀다 | [6][I5] | 반나절 ~ 하루 |
| F3 | 구현자의 테스트 통과를 자기 보고로 믿는다 | 1-가 뼈대 뒤, implementer 정의에 Stop 훅(biome · vitest 실패면 종료 거부)과 maxTurns | [25][27] | 1시간 |
| F4 | 고치기 라운드 상한이 없다 | 상한 3(제안값, 설정)을 두고 넘으면 사람 게이트로 | [17][24] | 한 줄 |
| F5 | code-reviewer · design-reviewer 정의는 effort high인데 머리말은 xhigh, 공통 규칙은 검토자 xhigh | 한쪽으로 맞춘다 (요청자 결정) | [I1][I2] | 5분 |

Graphify는 지금 들이지 않는다. 코드가 없다. 1-가 뼈대 뒤에 소스 파일 수와 탐색 턴 수를 잰다. 파일이 수백 개를 넘고 탐색이 길 때 15분 시험을 한다. 시험은 `graphify extract`(코드만, LLM 없음)로 시작한다 [30][32].
정본 문서(spec · 볼트)는 대상에서 뺀다. 번호 정규식(P3)이 결정적이고, 모델이 뽑은 선은 정본을 하나 더 만든다 [I5]. 그 사이에는 dependency-cruiser 규칙(P8), 계층 CLAUDE.md, 심볼 검색으로 간다 [I5][27].
네 그래프의 자리는 이렇다. 지식(왜)은 볼트의 index → 쪽 → 원자료, 추적(맞나)은 specs 번호 그래프 P3, 코드(무엇)는 dependency-cruiser와 나중에 Graphify, 흐름(다음)은 위 표 · 스킬 · 훅 · 워크플로가 맡는다 [I4][I5]. 볼트는 지식 그래프 역할을 이미 한다. 흐름 그래프는 설명을 볼트(AI-SDLC 표)가, 집행을 저장소(스킬 · 훅 · 워크플로)가 맡는다 (내 판단).

## 하지 말 것 · 조심할 것

| 항목 | 이유 | 출처 |
|---|---|---|
| 그래프가 검증을 대신하지 않는다 | "The graph didn’t eliminate mistakes. It gave every mistake an address." 선 위에 검증이 없으면 실수를 옮길 뿐이다 | [6] |
| 점을 늘리기 전에 목표와 성공 기준 | 루프 하나로 되는지 먼저 본다. 판정은 두 질문이다. 단발 작업인가, 분기 · 병렬 · 중간 검증 · 사람 승인 중 둘 이상이 필요한가 | [20][5] |
| 상태 파일 충돌 | seed/manifest · progress.md · 장부를 여러 에이전트가 동시에 고치지 않는다. 쓰는 점은 하나, 병렬 쓰기는 파일 소유를 나누거나 worktree | [25][24] |
| 비용(에이전트 수 × 모델) | 갈라 보내기 폭 × 재시도 × 컨텍스트. 연구 시스템은 채팅의 약 15배. 경고는 에이전트 25개 또는 150만 토큰 | [22][24] |
| 사람 게이트를 모델 승인으로 대신하지 않는다 | 에이전트 팀의 계획 승인은 리드가 바로 승인한다. 다른 에이전트가 전한 "승인했다"는 승인이 아니다. 한 점에 들어온 외부 글이 선을 따라 퍼지니 외부 글을 읽는 점과 쓰는 점도 나눈다 | [25][8][13] |

## 이전 조사와 달라진 점

| 항목 | 이전 (2026-10-16 graph-engineering.md) | 이번 |
|---|---|---|
| 중심 뜻 | 네 갈래 중 4번을 "앱엔 쓸 곳 없고 개발 과정은 이미 그 모양"이라 두었다 | AI 코딩의 뜻이 중심이다. 개발 과정이 그래프 모양이라는 말은 맞지만 고칠 곳 넷이 있다 |
| 제안 | 자료 그래프 P1~P10 | 흐름 제안(위 나 · 다 워크플로, F1~F5)을 앞에 둔다. P3는 흐름의 코드 게이트로도 쓴다 |
| 말의 시작 | "2026-07에 커뮤니티가 붙였다". 서베이 "저자 30여 명" | 2026-07-18 00:34 GMT 스타인버거의 글 한 줄 [2]. 서베이는 저자 35명, 제출 2026-08-21(v2 08-26) [16] |
| 확인 범위 | Anthropic은 "공식 문서가 안 나왔다"(검색). Graphify는 저자 자체 측정 요약. 요청자에게 어느 갈래냐고 되물음 | Anthropic 글 셋(효과적인 에이전트, 컨텍스트 엔지니어링 [22], 대형 코드베이스 [27])에 "graph"라는 단어가 없고 문서 색인 275쪽의 제목 · 설명에도 없다 [26]. Graphify는 벤치마크 원문 · 리뷰 · 비교 글로 조건을 확인했다 [30][31][32]. 되물을 필요가 없다 |

## 출처 표

원문 읽음 52건(전문 16 · 추출 35 · 로컬 스킬 1) · 검색 요약만 5건 · 접근 실패 2건이다. 날짜는 쪽에 적힌 대로 옮겼다.

| 번호 | 제목 · 저자 | 날짜 | URL | 확인 |
|---|---|---|---|---|
| [1][2] | Peter Steinberger, X 글 둘. "Here's your monthly reminder…" · "Are we still talking loops or did we shift to graphs yet?" | 2026-06-07 18:58 GMT · 2026-07-18 00:34 GMT | https://x.com/steipete/status/2063697162748260627 · https://x.com/steipete/status/2078277297791189132 | 전문 |
| [3] | X 글 셋. Shann Holmberg, David Khourshid, Harrison Chase | 2026-07-20 | https://x.com/shannholmberg/status/2079096565344739643 · https://x.com/DavidKPiano/status/2079209887158989231 · https://x.com/hwchase17/status/2079219804951683380 | 전문 |
| [4] | Shirley(바이라인), "Graph Engineering Guide (2026)", AI Builder Club | 2026-07-20, 갱신 08-28 | https://www.aibuilderclub.com/blog/graph-engineering-guide-2026 | 추출 |
| [5] | 같은 사이트 글 셋. "Graph Engineering with Claude Code", "Graph vs Loop", "Is Graph Engineering Just LangGraph?" | 2026-07-20 ~ 24, 갱신 08-03 · 08-14 | https://www.aibuilderclub.com/blog/graph-engineering-with-claude-code · …/agent-graph-vs-loop-when-to-use · …/is-graph-engineering-just-langgraph | 추출 |
| [6] | Naresh B A, "Graph Engineering for AI Coding Agents: Beyond Prompt Loops", Medium | 2026-07-30 | https://medium.com/@phoenixarjun007/graph-engineering-for-ai-coding-agents-beyond-prompt-loops-dd74bc1c4608 | 전문 |
| [7] | Akshay Kokane, "Graph Engineering Is Loop Engineering With An Org Chart Drawn On Top", Level Up Coding | 2026-08-05 | https://levelup.gitconnected.com/graph-engineering-is-loop-engineering-with-an-org-chart-drawn-on-top-8c849887fc56 | 전문 |
| [8] | Yashwant Deshmukh, "Graph Engineering for AI Agents: What It Is, Why It Matters, and How to Actually Build One", Towards AI | 2026-08-11 (메타 08-17) | https://pub.towardsai.net/graph-engineering-9986f8d5bdbd | 전문 |
| [9] | zerofuturetech, "Knowledge Graph vs Ontology vs Context Graph vs Code Graph vs Graph Engineering", Substack | 2026-08-23 | https://zerofuturetech.substack.com/p/knowledge-graph-vs-ontology-vs-context | 추출 |
| [10] | Joe Njenga, "Claude Code Graph Engineering Masterclass", 뉴스레터 | 2026-08-19 | https://newsletter.claudecodemasterclass.com/p/claude-code-graph-engineering-masterclass | 추출 |
| [11] | Piotr Myszkiewicz, "Graph Engineering for AI Coding Agents: Graphify, Claude Code, and Codex", sAIgnals | 2026-09-28 | https://saignals.buzz/articles/graph-engineering-graphify-claude-code-codex | 추출 |
| [12][31] | Kevin Riedl, Wavect 글 둘. "Graph Engineering for AI Agents: When Does a Knowledge Graph Pay Off?", "Graphify Review 2026: Is a Codebase Knowledge Graph Worth It?" | 2026-08-01 · 2026-07-16 (둘 다 갱신 09-02) | https://wavect.io/blog/graph-engineering-ai-agents/ · https://wavect.io/blog/graphify-review-codebase-knowledge-graph/ | 추출 |
| [13] | Boyu Wang, "Graph Engineering for Multi-Agent Systems: Architecture, Governance, and Observability", TrueFoundry | 게시 2026-10-15 표기 (갱신 07-20 표기와 어긋남) | https://www.truefoundry.com/blog/graph-engineering-enterprise-guide | 추출 |
| [14] | Mervin Praison, "Claude Graph Engineering: 14-Step Roadmap for Dynamic Workflows and Subagent Fleets", mer.vin | 2026-07-25 | https://mer.vin/2026/07/claude-graph-engineering-14-step-roadmap-for-dynamic-workflows-and-subagent-fleets/ | 추출 |
| [15] | LangChain 글 둘. Runkle · Chase "3 Years of Graph Engineering with LangGraph", Runkle "The Art of Loop Engineering" | 2026-07-22 · 2026-06-16 | https://www.langchain.com/blog/3-years-of-graph-engineering-with-langgraph · https://www.langchain.com/blog/the-art-of-loop-engineering | 추출 |
| [16] | Feng 외 35명, "Graph Engineering in the Era of LLM Agents: From Individual Intelligence to System Intelligence", arXiv 2608.21156 | 2026-08-21 (v2 08-26) | https://arxiv.org/abs/2608.21156 | 추출 (초록 쪽) |
| [17] | 코드브릿지, YouTube "하네스, 루프, 그래프 AI 코딩 용어가 6주마다 바뀌는 진짜 이유" | 2026-07-26 | https://www.youtube.com/watch?v=HxdYO_vo32A | 전문 (자동 자막, 오탈자 있음) |
| [18] | 코드팩토리, YouTube "또다른 트렌드 Graph Engineering 알려드림" (안내받은 URL의 실제 제목) | 2026-08-08 | https://www.youtube.com/watch?v=SBLDc4R1d_E | 전문 (자막이 영어) |
| [19] | 코드브릿지, 인프런 "하네스•루프•그래프 엔지니어링 - 프롬프트 다음의 AI 에이전트 다섯 단계" (유튜브가 아니라 강의) | 2026-07-31, 갱신 08-12 | https://www.inflearn.com/course/mastering-the-5-stag | 추출 (소개 · 목차) |
| [20] | 이창근, 위키독스 「그래프 엔지니어링 따라하기」 소개 · 01-3 · 01-4 · 04-1 | 편집 2026-09-22 (장 08-17) | https://wikidocs.net/book/20829 · /393234 · /393235 · /393252 | 전문 |
| [21] | 하네스 글 둘. Mitchell Hashimoto "My AI Adoption Journey", Birgitta Böckeler "Harness Engineering - first thoughts" | 2026-02-05 · 2026-02-17 | https://mitchellh.com/writing/my-ai-adoption-journey · https://www.martinfowler.com/articles/exploring-gen-ai/harness-engineering-memo.html | 추출 |
| [22] | Anthropic 글 셋. "Building effective agents", "How we built our multi-agent research system", "Effective context engineering for AI agents" | 2024-12-19 · 2025-06-13 · 2025-09-29 | https://www.anthropic.com/engineering/building-effective-agents · …/multi-agent-research-system · …/effective-context-engineering-for-ai-agents | 추출 |
| [23] | Walden Yan, Cognition "Don't Build Multi-Agents", "Multi-Agents: What's Actually Working" | 2025-06-12 · 2026-04-22 | https://cognition.com/blog/dont-build-multi-agents · https://cognition.com/blog/multi-agents-working | 추출 |
| [24][25] | Claude Code 문서. 동적 워크플로, 병렬 실행 비교, 서브에이전트, 스킬, 훅, 에이전트 팀 | 날짜 없음 (2026-10-16 접근) | https://code.claude.com/docs/en/workflows · …/agents · …/sub-agents · …/skills · …/hooks · …/agent-teams | 추출 (뒤 넷은 앞 10만 자) |
| [26][27] | Claude Code 문서 색인 llms.txt(275쪽의 제목 · 설명), Anthropic "How Claude Code works in large codebases: Best practices and where to start" | 2026-10-16 내려받음 · 2026-05-14 | https://code.claude.com/docs/llms.txt · https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start | 전문 · 추출 |
| [28] | `workflow-authoring` 번들 스킬 (워크플로 스크립트 참고서) | 이 세션 | 로컬 스킬 | 읽음 |
| [29] | 프레임워크 문서 넷. LangGraph 개요, Google ADK 워크플로 에이전트, AutoGen README, Microsoft Agent Framework 워크플로 | 대부분 날짜 없음 (MS 2026-07-29) | https://docs.langchain.com/oss/python/langgraph/overview · https://adk.dev/agents/workflow-agents/ · https://github.com/microsoft/autogen · https://learn.microsoft.com/en-us/agent-framework/workflows/ | 추출 |
| [30] | Graphify README(Graphify-Labs/graphify, safishamsi/graphify가 옮겨 감)와 BENCHMARKS.md | README 2026-10-16 접근, 벤치마크 갱신 2026-07-05 | https://github.com/Graphify-Labs/graphify · …/blob/v8/BENCHMARKS.md | 추출 |
| [32] | Udaykiran Estari, "Knowledge-Graph Skills for Claude Code and Codex: Graphify and Rivals Compared", Towards AI | 2026-07-16 (메타 08-06) | https://pub.towardsai.net/beyond-the-71x-benchmark-knowledge-graphs-for-coding-agents-graphify-and-rivals-compared-c835177a3b55 | 전문 (글에 적힌 작성자의 무료 열람 링크) |
| [33] | 접근 실패 둘. Joe Njenga "I Tried 5 Graphify Alternatives on Claude Code"(회원 전용, 도입부만), AI Builder Club 8월 2일 워크숍(내용을 찾지 못함) | 2026-08-15 · 2026-08-02 | https://medium.com/@joe.njenga/i-tried-5-graphify-alternatives-on-claude-code-and-found-the-sweet-spot-a3f5db2d28f1 | 접근 실패 |
| [34] | 검색 요약만 다섯. 동적 워크플로 2026-05-28 출시 주장 2차 글, OpenAI "Harness engineering: leveraging Codex in an agent-first world", frankx.ai "Claude Agent Engineering: Loops, Workflows and Graphs", Apple Books 「Claude Code In Parallel」, Towards AI "Claude Code now spawns 1,000 subagents…" | 2026 | https://www.mindstudio.ai/blog/claude-code-dynamic-workflows-parallel-sub-agents · https://www.frankx.ai/blog/graph-engineering-claude-code · https://books.apple.com/us/book/id6805216010 · https://pub.towardsai.net/claude-code-now-spawns-1-000-subagents-and-it-quietly-killed-my-langgraph-stack-e73a4a1c1912 | 검색 요약만 |
| [I1]~[I5] | 내부 자료. I1 `.claude/CLAUDE.md` · `~/.claude/CLAUDE.md` · `~/.claude/settings.json`(훅 목록만), I2 `.claude/agents/*.md` · `.claude/skills/*/SKILL.md`, I3 `intent/README.md` · `specs/README.md` · `specs/06-시드-생성.md`, I4 `.superpowers/sdd/2026-10-15-intent-spec-review/` 장부 · 볼트 `위키/방법론/AI-SDLC.md` · `그래프-엔지니어링.md`, I5 `docs/research/2026-10-16-graph-engineering.md`(이전 조사) | 2026-10-16 | 로컬 | 읽음 |

확인하지 못한 것은 일곱이다.
- AI Builder Club 8월 2일 워크숍의 내용 [33]. 동적 워크플로 출시일(공식 문서에 없고 2차 글만 5월 28일이라 한다) [24][34]. Huryn의 X 원문(AI Builder Club의 인용만 봤다) [5]
- 대안 도구 저장소의 직접 확인과 Graphify 벤치마크의 독립 재현 [32]. 코드팩토리 영상의 한국어 자막(영어 자막만 있었다) [18]
- Claude Code 서브에이전트 · 스킬 · 훅 문서의 뒷부분(앞 10만 자만 읽었다) [25]. Codex와 Cursor의 같은 기능(조사하지 않았다)

## 스킬 뼈대

`graph-engineering` 스킬을 다시 쓸 때의 틀이다. 지금 스킬의 자료 그래프 절차 1~8과 도입 순서 표는 마지막 절로 옮긴다.
```markdown
---
name: graph-engineering
description: AI 코딩 일(변경 단위 흐름 · 검토 루프 · 시드 생성 · 구현과 검토)을 점(node) · 선(edge) · 공유 상태 · 게이트로 그려 설계할 때 쓴다. 서브에이전트 여럿을 엮을지, 훅으로 막을지, 워크플로 스크립트로 올릴지 정할 때 쓴다. "그래프 엔지니어링" · "흐름 설계" · "게이트 걸어" 요청에 쓴다. 문서 · 코드 사이 참조를 뽑아 검사하는 일은 '자료 그래프' 절로 간다.
---
# 그래프 엔지니어링 (AI 코딩의 흐름 설계)
원칙은 둘이다. 길은 설계자가 정하고 에이전트의 자유는 점 안에 둔다. 검증은 선 위에 둔다. 켜지지 않는 때는 루프 하나로 되는 일, 그리고 신호 다섯(전문성, 갈라 보낸 뒤 합침, 단계별 모델, 감사할 제어 흐름, 검증자 과부하)이 하나도 없을 때다.
## 절차
1. 일 하나와 성공 기준을 확인 가능한 사실로 쓴다. 루프로 되는지 먼저 본다.
2. 점을 적는다. 이름은 두세 단어. 입력 · 수행(서너 문장) · 출력 · 실패 정의를 쓴다. 모델이 필요 없으면 코드로 둔다.
3. 선을 그린다. 직선 · 조건 · 갈라 보내기 · 모아 받기 · 되돌림. 선마다 길을 정하는 쪽(모델 · 코드 · 사람)을 쓴다.
4. 공유 상태를 정한다. 사는 곳(파일 · 스크립트 변수 · 작업 목록), 값 목록, 쓰는 점 하나.
5. 게이트를 선 위에 둔다. 코드(테스트 · 스키마 · 검증기), 모델(새 컨텍스트, 읽기 전용), 사람(되돌리기 어려운 행동 앞 하나). 반드시 지킬 전이는 훅.
6. 정지 조건과 상한을 코드나 설정에 둔다. 최대 반복 · 최대 에이전트 수 · 비용 경고 · 사람에게 넘기는 조건.
7. 수단을 고른다. 단계마다 사람 승인이면 스킬, 같은 단계의 반복이면 워크플로, 곁일 격리면 서브에이전트.
8. 돌려 보고 줄인다. 점마다 존재 이유(신호)를 적고, 빼도 같으면 뺀다. 실패가 난 점을 기록한다.
## 표 틀
점 표: | 점 | 하는 쪽(에이전트 · 모델 · effort 또는 코드) | 들어오는 것 | 나가는 것 · 상태 | 다음 점 조건 | 게이트(코드 · 모델 · 사람) |
수단 표: | 수단 | 길을 정하는 쪽 | 중간 결과가 사는 곳 | 쓰는 때 | 못 하는 것 |
## 자료 그래프와 지킬 것
(지금 스킬의 절차 1~8과 도입 순서 표.) 용어는 점 · 선 · 상태. 설계 숫자는 설정값. 비밀값 · 아이 이름은 적지 않는다. 서브에이전트는 호출마다 model · effort를 쓴다.
```
