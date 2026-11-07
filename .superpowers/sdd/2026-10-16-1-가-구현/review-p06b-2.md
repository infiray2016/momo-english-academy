판정: Approved — Critical 0 · Important 0 · Minor 1(새 지적, fix 1 이 바꾼 줄에서 생김) (rev-p06b 재검토, 가벼운 루프 · 범위 한정, 2026-10-17 01:2x)

# 재검토: P6b 그림 카탈로그 작업 2 fix 1

대상은 워크트리 `.claude/worktrees/p06b` 의 `scripts/vocab-images.ts` 와 `tests/unit/vocab-images.test.ts` 이고, fix 1 보고 `task-p06b-fix1-report.md` 와 대조했다.
한 일은 다음과 같다.
- 바뀐 두 파일을 전부 읽었다.
- 시험 파일 하나를 실행했다. 5 통과이고 `tests/.tmp` 는 비워졌다.
- `checkSvg` 를 tsx 로 직접 불렀다. 나쁜 꼴 열 가지와 정상 꼴 여섯 가지를 넣었다.
- 스크래치패드 임시 뿌리에서 `images:check` 를 다섯 번 돌렸다. 빈 카탈로그, `--root` 를 잘못 준 경우 둘, EACCES, 폴더 자리에 파일이 있는 경우다.
- 네트워크는 쓰지 않았다. 저장소 · 워크트리 파일은 고치지 않았다(워크트리 상태 9줄 그대로).

## 지적별

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 빈 카탈로그 + 폴더 없음 | ADDRESSED | `scripts/vocab-images.ts:206~214`. 행이 있고 폴더가 없으면 2, 행이 0 이면 빈 목록으로 계속한다. 새 시험 `tests/unit/vocab-images.test.ts:226~249` 가 세 갈래를 단언한다. 0 은 출력 줄 `vocab-images check: 행 0 · 파일 0 · 위반 0` 까지 `toEqual` 로 본다(228~231). 실제 없는 폴더는 0(237~241), 행 있음 + 폴더 없음은 2(244), 행 0 + 파일 있음은 1(246~248)이다. CLI 재현도 exit 0 이다. 머리 주석 6줄과 plan 스크립트 표 check 행(plan 73줄)이 고쳐졌다. 다만 '실제 없는 폴더'를 읽는 길은 ENOENT 만이 아니라 모든 오류를 삼킨다(N-1) |
| M-1 checkSvg 빈틈 | ADDRESSED | `scripts/vocab-images.ts:80~87`. 1차의 다섯 꼴(`javascript:` href · xlink:href, `data:` use, animate · set 의 attributeName href)이 모두 걸린다. 공백 · 줄바꿈 · 작은따옴표 · 글자 참조(`&#106;avascript:`) · `#` 링크 뒤에 오는 나쁜 링크도 걸린다. `href="https://…"` 도 걸려서 옛 http 규칙을 품는다는 보고 주장이 맞다. 정상 꼴 여섯은 문제 0 이다: `xlink:href="#a"` · `href = "#a"` · `url(#a)` · `xmlns:xlink="http://www.w3.org/1999/xlink"` 만 있음 · `animate attributeName="fill"` · Twemoji 꼴 path · circle. 시험 `vocab-images.test.ts:272~277` 에 네 사례를 더했고, 옛 사례 264~266 도 새 규칙으로 걸린다 |
| M-2 하위 폴더 시험 | ADDRESSED | `vocab-images.test.ts:197~202`. `mkdirSync(old)` 를 하면 `readImageFiles` 의 `!entry.isFile()` 갈래(스크립트 275)를 지나 `old/` 가 된다. 1 과 줄 `images/vocab/old/` 를 단언하고 폴더를 지운다. 뿌리는 afterAll 이 지운다(23~25, 실행 뒤 비워짐 확인) |
| M-3 `--root` 오류 글 | ADDRESSED | `parseCatalog(text, root)` 는 `scripts/vocab-images.ts:157~162`, `runCheck` 의 `root?`(기본 `.`)는 200~202 · 210 이다. `main` 은 373, `runFetch` 는 292 에서 resolve 한 뿌리를 넘긴다. 기본 `.` 이면 글이 예전과 같은 `seed/images.json` 이라 옛 시험 사례가 그대로 지난다. 시험 216~223 이 있고 CLI 재현 글은 `…/worktrees/p06b/seed/seed/images.json` 이다 |
| M-4 `.DS_Store` | ADDRESSED | `scripts/vocab-images.ts:262 · 272` 는 `.DS_Store` 만 건너뛴다. 시험 203~210 에서 `.DS_Store` 만 있으면 0, `.hidden` 이 있으면 1 이고 줄에 `images/vocab/.hidden` 이 든다 |

## 새 지적

### Minor

**N-1. 그림 폴더를 읽는 길이 ENOENT 밖의 오류도 '폴더 없음'으로 삼켜서, 빈 카탈로그일 때 조용히 0 으로 지난다.**
- 무엇이: `scripts/vocab-images.ts:266~270` 은 `statSync` 의 모든 오류와 '폴더가 아님'을 `null` 로 바꾼다. 이 줄 자체는 fix 1 이 바꾸지 않았다. 그런데 fix 1 의 206 · 214 때문에 행 0 에서 `null` 이 통과(0)가 되면서 결과가 실패(2)에서 통과로 바뀌었다. 스크래치패드 재현은 아래와 같다.

```
행 0, public/images/vocab/stray.svg 있음
읽을 수 있음                              → 위반 1 (카탈로그 밖 파일)   exit 1
public/images 권한 000(EACCES)            → 행 0 · 파일 0 · 위반 0      exit 0
public/images/vocab 이 폴더가 아니라 파일  → 행 0 · 파일 0 · 위반 0      exit 0
```

- 왜 Minor 인가: 영향은 행이 0 인 짧은 사이(P6a 의 빈 카탈로그부터 작업 3 까지)에만 있다. 그때 볼 그림도 없다. CI checkout 은 읽을 수 없는 폴더를 만들지 않는다. 행이 생긴 뒤에는 같은 경우가 2 로 실패하므로 조용한 오판은 없다. 그때 글이 '폴더가 없다'로 원인을 잘못 말하는 것만 남는다. 브리프 볼 것 1 이 'ENOENT 만 삼키는지'를 물었고, 답은 '아니다'이다.
- 어떻게: ENOENT 일 때만 `null` 을 돌려주고, 다른 오류와 '폴더가 아님'은 그대로 던진다. 처리 안 된 거절이라 스택과 함께 종료 1 이 되고, 조용히 지나지 않는다. 컨트롤러가 직접 고칠 크기다.

```ts
let stat: ReturnType<typeof statSync>;
try {
  stat = statSync(dir);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
  throw error;
}
if (!stat.isDirectory()) throw new Error(`그림 폴더 자리에 폴더가 아닌 것이 있다: ${dir}`);
```

## 범위 밖 관찰(지적 아님)

- 새 시험 이름 "그림 카탈로그: 행이 없으면 그림 폴더가 없어도 통과한다"는 plan 증명 표에 없다(plan 에서 grep 0건). AC 시험이 아니라 spec-trace 결과는 같다(missing-test 58). 증명 표를 시험 이름과 1:1 로 두려면 컨트롤러가 '스크립트' 행에 한 이름을 더한다.

## 라운드 판정

fix 1 라운드는 Approved 다. I-1 · M-1~M-4 가 모두 ADDRESSED 이고 새로 깨진 것은 없다. 새 지적은 Minor N-1 하나이고, 가벼운 루프(C52)대로 컨트롤러가 직접 고치거나 넘긴다. fix 라운드는 1회 썼다.
