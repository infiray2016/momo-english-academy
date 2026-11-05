# 구현 보고: 가르치고 배우는 수업 묶음 라-2, 읽기 · 쓰기 연결(2026-10-30 03:4x, 구현자 Opus · high)
상태: DONE_WITH_CONCERNS. 워크트리 p13d이고 커밋은 하지 않았다. 라-1 조각(`src/components/session/teach/*`) · speaking.tsx · sound-retry · placement · evidence · recap.ts · result.ts · attempt.ts 판정 함수 · 시드 · specs · globals.css 는 읽기만 했다.

## 바뀐 파일(p13d 기준 줄)
- `src/app/(child)/session/[id]/session-frame.tsx`: 머리 주석 :25 · 상수 :234~237 · 같이 해 보기 자리 TogetherSlot :366 · 가르치는 수업 상태(판정 맥락 · 이 기기 시도 · 짝 · 안내 셈 · 읽기 도움) :528~568 · 대기열 시도 · 도움 되살리기와 짝 다시 고르기 :679~688 · complete 판 2 · 짝 slot :811 · advance 의 resumePointOf skip :845 · 자리 조각 고르기(today · preview · model · together · 짝 읽기 · 짝 쓰기 · 지문 도움 · 문항 teach) :924~1100 · 혼자 · 짝 첫 화면 한 줄 :1505 · 진행 막대 끝낸 칸 :1567 · 위 띠 자리 이름 :1580 · 무음 모드 줄 :1631
- `src/components/session/reading.tsx`: 읽어 주기 onRead :79 · 지문 onReadAloud :188 · teachQuestionStageOf :302 · QuestionTeach :317 · 답 문장 띠 :365 · QuestionActivity teach 갈래 :474~ · 지문 늘 함께 :562 · 같이 해 보기 보기 ReadingTogetherChoices :698
- `src/components/session/writing-items.tsx`: writingTeachStageOf :77 · WritingTeach :95 · 색 칸 · 까닭별 '왜' :231~249 · 짝 틀림 :354
- `src/components/answer/tiles.tsx`: 대문자 반짝임 CAPITAL_FLASH :68 · 색 칸 EmptySlot :74 · SlotTag :106 · slotRoles · flashCapital :149 · 같이 해 보기 카드 TogetherCards :477
- `src/core/session/progress.ts`: 자리 이름은 TEACH_SLOT_NAME :14 · TEACH_SLOT_OF :78 · isTeachActivities :107 · teach 갈래 :144(teach 없는 수업의 표는 그대로)
- 신규 `src/core/session/teach-frame.ts`(230줄): teachSlotAt · firstActivityOfSlot · spareChoiceOnDevice · progressFinalsOf · teachNoticesAfter · 읽기 도움(aidUsed · aidOf · readingAidsFrom) · assembleRolesOf · togetherTryRight
- `src/server/session/index.ts`: 화면 자료 칸만 더함 — spares.outcomes :1216 · teaching(선생님 · 칭찬 초) :1223 · 본보기 그림 키 · 그림 짝 보기 :1287 · :1292 · teach 수업 새 단어 그림 · outcomes :1466 · :1593 · :1639. 시도 저장 길은 그대로다
- 시험: `tests/unit/{teach-frame,reading-teach,writing-teach}.test.ts`(신규) · `ux-progress.test.ts`(자리 이름 · teach 갈래) · `tests/e2e/teach.spec.ts`(신규, 정적) · `tests/e2e/lessons.ts` teachSample :183 · `tests/integration/session-flow.test.ts`(새 칸 outcomes 에 맞춘 단언 둘)
- `src/components/activities/common.tsx` 는 바꾸지 않았다. teach 새 단어는 세션 틀이 라-1 NewWordsScreen 을 고르고, teach 없는 수업의 미리보기는 그대로다

## L-34 의 선택: 서버 값 합치기
서버가 저장된 혼자 첫 시도로 센 결과를 화면 자료 view.spares.outcomes 에 싣는다. 기기는 그 위에 이 기기에서 낸 첫 끝 시도(대기열에 남은 것과 이 화면에서 낸 것)의 결과를 빈 자리에만 더하고 sparesToShow 로 고른다. 같은 활동은 서버 값이 이긴다. 다른 기기에서 이어 하면 서버 결과만 남아 서버 값과 같다(통합 시험에 단언 한 줄).
까닭은 셋이다. 첫째, 혼자 해 보기 끝에 인터넷이 끊겨도 바로 짝으로 갈 수 있다(대기열 비우기 + router.refresh 는 연결이 있어야 하고, 실패하면 막다른 자리가 생긴다). 둘째, refresh 는 SessionFrame 의 useState 초기값을 바꾸지 못해 새 화면 자료를 받는 효과를 따로 두어야 한다. 셋째, 같은 순수 함수와 같은 맥락(outcomeContextOf)이라 서버의 다시 고르기와 갈릴 길이 없다.

## 설계와 다르게 한 것
1. 브리프 표에 없는 새 순수 파일 teach-frame.ts 를 두었다. 세션 틀 · 조각이 함께 쓰는 셈을 DB · 화면 없이 시험하려는 것이다.
2. 쓰기 혼자 문항에는 칩 칸 시드가 없다. 그래서 색 칸의 자리는 정답 카드 차례에서 가린다(is 앞은 무엇, is, 뒤는 어때요, 문장 부호는 마침표). 이 꼴이 아니면 색 칸 없이 대문자 단추만 반짝인다.
3. 무음 모드 줄은 두 번째 안내부터 켜고, 소리가 난 줄이 끝나면 거둔다. 그 사이에는 틀 안 아래에 늘 보인다.
4. 같이 해 보기는 맞으면 반응 줄이 끝나고 talk.teacher_praise_seconds 가 지난 뒤에 넘어간다. 소리 없이 바로 끝나는 기기에서 rightKo 가 곧장 사라지지 않게 하려는 것이다.
5. 읽기 도움(aid)은 teach 수업에서만 보낸다(정한 것 1 조건). 문항 · 짝 화면에는 낱말 뜻 보기가 없어서(지금 그대로) gloss 는 지문 화면에서 연 낱말이다. 짝 글은 따로 센다. 모음은 기기 입력 저장소의 세션 몫 자리(활동 번호 0)에 둔다.
6. 표본 R13 의 '이렇게 찾는 거예요' · W10 의 '이 차례예요'는 문구 표 밖이라 넣지 않았다. 맞으면 '맞았어요!'만이다. 쓰기 둘째 틀림 뒤 단추는 teach 수업에서 '한 번 더 하기'다.
7. 짝이 틀리면 바른 답 위에 '정답은 이거예요' 줄도 남는다. '다음'은 '왜' 줄을 읽는 동안에도 밝다.
8. 선생님은 집 프로필의 고른 선생님(readHouseholdTeacher)을 화면 자료에 싣는다. 고르기를 당기는 일은 마-2 몫이라, 그 전에 고르지 않은 집은 기본 초상이다.
9. 말하기 같이 해 보기 · 짝은 라-3 몫이라 기록 활동에 넣지 않았다. 라-3 전에는 말하기 teach 수업을 끝낼 수 없다(말하기 teach 시드는 아직 적재 전).
10. writing-guided-fix · draft 진행 시도의 판 1 은 그대로 두었다. 브리프가 complete 만 정했고 e2e writing.spec 이 판 1 을 단언한다.
11. e2e 는 reading.spec · writing.spec 을 고치지 않고 teach.spec 하나에 모았다.

## 시험(정본 AC 이름)
- 단위 새 36: ux-progress 'AC-22c 가르치는 수업은 묶음을 자리 다섯…' 외 둘 · teach-frame 'AC-22c' 짝 고르기 다섯 · 세션 틀 그림 다섯(AC-22c · AC-3g) · 'AC-N20 … 두 번째로 나면 무음 모드 줄' · 'AC-3d' 읽기 도움 · 색 칸 · 'AC-4d' 같이 해 보기 한 시도 · reading-teach 'AC-3k 3단계 읽기 문제 화면은 지문을 두 방향 모두 늘…' · 'AC-3d' 왜 · 띠 · 둘째 정답 · teach 없는 수업 · 'AC-22c 짝은…' · writing-teach 'AC-3d' 까닭별 왜 셋 · 색 칸 · 둘째 정답 · 'AC-22c 짝은…' · 'AC-4d' 카드 둘
- e2e(정적): 'AC-22c 읽기 … 짝이 스스로 해 보기로 … AC-3d 왜 · 띠 · 둘째 정답' · 'AC-22c 다 맞히면 짝 없이 결과' · 'AC-4d 같이 해 보기 … AC-3d … AC-22c 짝' · 'AC-N20 … 두 번째부터 무음 모드 줄'(가짜 음성 neverStart)
- 통합(정적 고침): session-flow 'AC-3e …'에 outcomes 칸과 다른 기기 서버 값 단언

## 관문(p13d, Node 24, 03:4x)
| 관문 | 결과 |
|---|---|
| pnpm lint | 종료 1 — 528 파일 가운데 2 오류. 둘 다 형식이고 `result-view.tsx` · `server/session/result.ts`(사 · 라-4 진행 중 파일)다. 이 묶음 13 파일 biome check 종료 0 |
| pnpm exec tsc --noEmit | 종료 0 |
| pnpm test | 123 파일 · 1451 통과 · 6 todo |
| pnpm check:deps | 위반 0(271 모듈) |
| pnpm check:ids | 종료 0, 규칙 위반 0, design-number 47(기준 49, 이 묶음 0), design-color 0 |
| pnpm spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0, missing-test 16(P12, 전과 같음) |
| pnpm build | 종료 0(dev 3013 과 동시 — Next 16 은 dev 출력이 .next/dev 로 갈림) |
| pnpm check:bundle | 위반 0 |
| 첫 JS 3D(NFR-11) | /session/[id] 첫 JS 25덩이에 3D 표지 0. three 가 든 덩이 1개는 따로다(클라이언트 참조 목록 검사, 스크래치패드 first-js-3d.mjs) |

## 요청하는 변경
1. spec 설계 6(시드 규격): 쓰기 혼자 문항 색 칸의 칩 자리를 정답에서 가리는 지금 규칙으로 둘지, 문항마다 칸을 둘지 정해 주기 바란다.
2. UI · UX 설계 6: 무음 모드 줄의 자리와 지속(두 번째부터 켜고 소리가 나면 거둠)이 뜻에 맞는지 화면 검토에서 확인 바란다.
3. 라-1 조각의 props 는 모자란 것이 없었다.

## 남은 우려
1. e2e · 통합은 이 기기에서 돌리지 않았다. 실행은 11-01 뒤 CI 이고, 그 전에는 완료로 적지 않는다.
2. 같이 해 보기 진행은 기기에 되살리지 않는다. 도중에 닫으면 그 문항 처음부터다(연습이라 점수 영향 없음).
3. 쓰기 같이 해 보기는 filled 칸이 있는 조립 꼴만 입력을 그린다. 1~2단계 같이 해 보기 꼴은 둘째 묶음에서 붙인다.
4. 로컬 눈 점검은 teach 시드 적재 전이라 e2e 견본으로만 할 수 있다(컨트롤러 3013).
