# 구현 브리프: P11a 차례 2 fix 2 — 화면 검토 A2 지적(implementer impl-p11 이어 보기 · Opus · high, 2026-10-18 07:1x)

`review-p11-2-design.md`(des-p11, **Changes requested** · C 0 · I 3 · M 5)의 I-1 · I-2 · I-3 과 M-1~M-5 를 모두 고친다(컨트롤러가 전부 받음 — 고치는 법은 검토자가 '하나 고름'이라 한 곳은 아래에서 골랐다). 코드 검토 A2 는 Approved(M-1 은 차례 3). 워크트리 p11(HEAD 7794633), 커밋 없음. 단위 · tsc · biome · build 로컬, e2e · 사진은 CI(컨트롤러 — fix 2 뒤 CI 2차, 사진은 `p11-reading-*` 그대로 다시 찍힘).

## 고칠 것
1. **(I-1) 가로 1단계 그림 문항에서 '다음' · '한 번 더 풀기' · 정답 보기가 보는 창(820) 아래로 잘림** — 가로에서 그림 보기 칸 높이를 줄인다(검토자 추정: 보기 높이 약 140px 이면 두 줄에서 약 90px 줆; 56 × 56 · 글자 24px 는 지킴). 선 위 검증: e2e(`tests/e2e/reading.spec.ts`, 1단계 가로)에서 답을 고른 뒤 '다음'과 처음 틀림 뒤 '한 번 더 풀기'의 아래 끝이 `CHILD_VIEWPORTS.landscape.height` 안인지 단언(해설 두 줄 견본).
2. **(I-2) 1단계 지문 그림 줄의 깨진 그림 표** — 지문 그림 줄(`src/components/activities/reading.tsx:91-93` `VocabPicture`)도 P10 `AnswerPicture`(`src/components/answer/choice.tsx:45-66`)와 같은 깨짐 대체(파일 못 열면 뜻 글 점선 상자, `data-picture-missing`)를 쓴다. 평가 지문(`decorative`)은 깨지면 그리지 않는다. 시드 보기 화면(P5b)은 영향 없어야 함. 선 위 검증: e2e 에서 `[data-passage-picture] img` 가 있으면 `naturalWidth > 0` 이거나 `[data-picture-missing]` 이 보임을 단언. **프리뷰(개발용 Supabase 시험용 시드)에서 요청자가 바로 보는 자리다.**
3. **(I-3) 오른쪽 끝 낱말의 뜻 쪽지가 화면 테에서 잘림** — 열 때 낱말 자리를 재어 카드 오른쪽 반이면 `right-0` 으로 붙이고, 그래도 카드를 넘으면 카드 안으로 당긴다(쪽지 꼴은 그대로). 선 위 검증: e2e 세로에서 첫 줄 마지막 글로서리 낱말을 눌러 쪽지 상자가 활동 카드 안(`getBoundingClientRect`)인지 단언. 사진 `p11-reading-word-note-right-<방향>` 추가.
4. **(M-1) 정답 보기에서 처음 고른 오답의 ✕ 가 사라짐** — `tries` 의 오답 둘 다 ✕ 로 둔다(`src/components/session/reading.tsx:310-317`).
5. **(M-2) '한 번 더 풀기' 단계에서 해설이 사라짐** — 다시 고르는 동안에도 해설을 남긴다(`reading.tsx:382-386`). 사진 `p11-reading-retry-<방향>` 추가(다시 고르는 단계 — 처음 오답 ✕ 고정 · 해설 보임).
6. **(M-3) 세션 지문의 줄 높이** — 세션 지문(수업 길)만 줄 높이를 2 안팎(약 48px)으로 넓힌다(평가 · 시드 보기 영향 없음). `data-size-exempt` 는 그대로.
7. **(M-4) 쪽지 닫기** — 쪽지 밖(지문 빈 곳 · 카드)을 누르면 닫힌다(같은 낱말 다시 누르기도 그대로).
8. **(M-5) 가로 문항의 빈 상태 줄** — 틀(`session-frame.tsx:500` 근처)이 상태 글이 있을 때만 그 줄을 그린다(조각이 제 단추를 가질 때 자리 안 남김).

## 지킬 것
글자 크기(안내 20 · 영어 24 · 단추 이름표 22 · 카드 보조 줄 20) · 누르는 곳 56 · 문구 글자 그대로 · 색 · 틀은 바꾸지 않는다. P10 배치 · 시드 보기 화면 · 평가 지문 꼴에 영향 없음(공용 조각을 고칠 때 선택 속성 · 세션 길에서만). `check:deps` · `check:bundle` · `check:ids` 새 줄 없음. 아이 이름 · 비밀값 없음. 보고 `task-p11-report.md` '차례 2 fix 2' 절(지적마다 어디를 어떻게 · 새 사진 이름 · 단위 수) → SendMessage 한 줄 → 컨트롤러 CI 2차(사진) → des-p11 · rev-p11 범위 한정 재검토 → 차례 2 커밋 → 프리뷰.
