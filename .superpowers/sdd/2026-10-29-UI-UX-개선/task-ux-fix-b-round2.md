# 브리프 B fix 2: 코드 검토 B 지적 반영(구현자 impl-ux-b · Opus · high, 2026-10-29 18:5x)

근거: 검토 보고 `.superpowers/sdd/2026-10-29-UI-UX-개선/review-b-report.md`(Changes requested, I 2 · M 10) · 13절 C167(정본 보정 — 끝인사 글 · '여기부터 해요' · 별 수는 설정값). 작업 자리 · 파일 소유 · 관문은 브리프 B 와 같다(`task-ux-fix-b.md`). 커밋하지 않는다. 컨트롤러 결정을 아래에 적었으니 보고의 '어떻게'와 함께 읽는다.

| 지적 | 결정 | 할 일 |
|---|---|---|
| I-1 결과 · 마무리 '별 하나'가 숫자를 박음 | 고친다(C167 (5)) | 서버가 ResultView · WrapView 에 reward.star_complete 값을 싣고, 보상 조각이 그 수만큼 별을 그린다. 글은 숫자 없는 '별을 받았어요'. 단위 시험에 값 2 경우 하나 |
| I-2 '홈 화면 꼴' 크기 e2e 가 첫 사용 꼴만 잼 | 고친다 | 그 시험 앞에 두 영역만 끝낸 수업을 넣어 첫 사용 꼴과 보통 꼴이 한 줄에 섞이게. 사진도 두 꼴을 한 장에 |
| M-1 홈이 끝낸 세션을 두 번 읽음 | 고친다 | 한 번 읽어 영역별 첫 사용 판정과 별 합을 함께 냄 |
| M-2 설정값 바꾸면 지난 별도 다시 셈 | 코드는 그대로, 주석 한 줄(C167 (5)) | `src/core/reward/star.ts` 머리에 '잠정 셈 — 장부는 P12' |
| M-3 새 수업 종류 목록 두 벌 | 고친다 | 한 곳(today/done.ts 의 NEW_LESSON_KINDS)에서 내보내 star.ts 가 쓴다 |
| M-4 마무리 별 판정이 종류를 지어 넘김 | 고친다 | WrapView 에 session.kind 를 실어 그대로 넘김 |
| M-5 다시 하기 결과에 '오늘 얻은 단어' · 초고 '다시 했어요' | 고친다 | 다시 하기에서는 단어 카드를 숨기고(P12 '맞힌 단어' 전), '다시 했어요'는 초고가 아닐 때만 |
| M-6 정리에서 읽지 않은 끝인사도 첫 장에 남음 | 고친다(C167 (1)) | 정리를 거치지 않고 첫 장만 보이는 길에서는 끝인사를 넘기지 않는다. 끝맺음 끝인사 길 e2e 하나(가짜 AI 끝맺음 응답 → 첫 장 글 = 그 끝인사) |
| M-7 분량 아래 판정의 낱말 셈이 검증기와 다름 | 화면 수와 판정을 함께 검증기의 sentenceWords 로 옮긴다(아이가 보는 수와 쪽지가 같아야 하므로 둘 다) | writing-composition.tsx 의 낱말 셈을 `src/core/seed/text.ts` sentenceWords 로. 단위 시험 하나('cats .' · 'dog,cat') |
| M-8 머리 주석 넷이 사실과 다름 | 고친다 | reward.tsx · result.ts · result-view.tsx · closing-cards.tsx 머리 주석 |
| M-9 무음 모드 조각이 훅을 다시 씀 | 고친다 | mic-blocked.tsx 의 useIpadSafari 를 가져다 씀 |
| M-10 구현 값을 되읽는 시험 | 고친다 | settings.json 값 단언 시험 삭제, 문구 상수만 보는 단위 단언은 빼도 됨, writing.spec 에 toBeFocused() 한 줄 |

정본 쪽(13절 C167, 4절 홈 표 · 회화 마무리 행 등)은 UI · UX spec 에서 컨트롤러가 반영한다. 코드만 고친다.

## 관문 · 보고
먼저 시험을 쓰고 실패를 본 뒤 고친다. `pnpm test` · `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm check:deps` · `pnpm check:ids` 통과. 통합 · e2e 는 이 Mac 에서 못 돌리니 정적으로 맞춘다. 보고는 `task-ux-fix-b-report.md` 끝에 'fix round 2' 절(지적별 ADDRESSED · 파일:줄 · 시험 이름)을 더한다. 마지막 답은 상태와 보고 경로만.
