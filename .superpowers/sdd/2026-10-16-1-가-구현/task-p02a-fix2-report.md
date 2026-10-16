# fix 2 보고: P2a 음성 판정 함수(재검토 새 Minor 둘)

상태: DONE · 2026-10-16 · 구현자 impl-p02a(Opus · high) · 같은 워크트리 · git 쓰기 없음 · 근거: 컨트롤러 지시(fix 2), 재검토 `review-p02a-2.md` '새 지적'

## 지적별 판정

| 지적 | 판정 | 고친 곳 | 시험 사례 |
|---|---|---|---|
| M-A `{NAME}` 바로 뒤의 'll · 'd · 've · 're · 'm 가 쪼개짐(fix 1 회귀) | ADDRESSED | `src/core/speech/match-rate.ts:24-39` `NAME_WITH_CONTRACTION` = `/\{NAME\}(?:['‘’ʼ](s\|ll\|d\|ve\|re\|m)\b)?/gi`, 펼침 표 `NAME_CONTRACTION_WORDS`(ll→will · d→would · ve→have · re→are · m→am, 값 1 (3)과 같은 뜻), 바꾸개 `spellNameSlot` 은 ` <표지> <낱말> ` 을 넣고 's 는 자리에 흡수. 쓰는 곳 :199 | 기존 시험 "일치율: {NAME} 에 문장 부호가 붙어도 자리 하나만 아무 낱말과 맞는다"(match-rate.test.ts:171, 이름 그대로)에 더함(:180-191): `{NAME}'ll come too` 대 'Tori will come too' → 1, `{NAME}'d like it` 대 'Tori would like it' → 1, `{NAME}’ve got it`(굽은 따옴표) 대 'Tori have got it' → 1, `{NAME}'re here, {NAME}'m here` → {NAME} · are · here · {NAME} · am · here |
| M-B 주석 한 줄이 `\u` 이스케이프로 적힘 | ADDRESSED | `match-rate.ts:22-23` 주석을 한글로 다시 적음(내용도 M-A 에 맞게 고침). 바이트 확인: `sed -n 22,23p … \| od -c` 에서 한글 UTF-8 바이트가 보이고 `\u` 가 아니다. `grep -n '^ *//.*\\u' match-rate.ts` → 0건(종료 1). 정규식 안의 `‘ · ’ · ʼ · ‐-― · ` 은 그대로 둠 |

따옴표 없는 `{NAME}s` 는 지시대로 고치지 않았다(다-7 로 P4 검증기에 넘김). 허용 파일 밖의 변화는 없다.

## 명령과 출력

명령마다 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:/usr/bin:/bin` 를 앞에 두었다.

- `pnpm biome check --write src/core/speech/match-rate.ts tests/unit/match-rate.test.ts` → `Checked 2 files … No fixes applied.`
- `pnpm lint` → `Checked 44 files in 22ms. No fixes applied.`
- `pnpm test` → `Test Files 8 passed (8) · Tests 89 passed (89)`(사례는 기존 시험 안에 더해 시험 수는 그대로)
- `pnpm check:deps` → `✔ no dependency violations found (12 modules, 7 dependencies cruised)`
- `pnpm build` → `✓ Compiled successfully` · `Finished TypeScript` · 경로 `/` · `/_not-found`
- `pnpm check:bundle` → `check-bundle: 파일 25 · static 10 · 화면 파일 15 · 서버 변수 이름 5 · 대조한 값 0 · 위반 0`

## 남은 우려

없음. 시험 사례의 'Tori' 는 앱 캐릭터 이름이고 컨트롤러가 준 사례 그대로다(사람 · 아이 이름이 아니다).
