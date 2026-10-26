# 구현 보고: P13d 묶음 d1 — 줄인 모델 · 초상 자산 · 명단 칸 · 자산 검사(implementer · Opus · high, 2026-10-23 13:1x)

상태: DONE. 브리프 `task-teacher-d1.md` · plan `intent/2026-10-17-회화-선생님-캐릭터/plan.md`(C141) d1 몫 차례 1~5 전부. 자리는 워크트리 `.claude/worktrees/p13d`(feature/1a-p13d-teacher), 커밋 · push 없음.
차례 2 끝(seed:validate 오류 0)에 컨트롤러에게 알렸고, 컨트롤러가 그 몫을 커밋했다(지금 `git status` 에 차례 2 파일이 없음).

## 바뀐 파일

차례 1~2(컨트롤러 커밋에 든 몫):
- `scripts/teacher-reduce.ts`(신규) — 줄이기 스크립트. 순수 함수 `imageRolesOf`:65 · `applyImageRewrite`:109 · `reductionText`:177 · `parseArgs`:189 · `pngSizeOf`:236 · `resizeArgsOf`:249 · `oldAssetFiles`:260 · `formatRoster`:303, 직접 실행 `main`(값 1 차례 (1)~(9)).
- `src/core/seed/vrm.ts`(신규) — `parseGlb`:55 · `buildGlb`:107 · `vrmFactsOf`:161(값 3). GLB 머리 자리 수는 최상위 `GLB` 상수에 둠(check:ids design-number 를 늘리지 않게).
- `src/core/seed/schema/teachers.ts` — reduction:49 · nameKoWordExceptions:65 · model:79 · portrait · voice(prefer:85) 필수, 머리 주석 고침.
- `src/core/seed/structure.ts` — `OLD_TEACHER_NAMES.koWordExceptions`:297 · `TEACHER_LABEL_TEXT`:310 · `TEACHER_ASSET_DIR`:327 · `VRM_REQUIRED_EXPRESSIONS`:329 · `VRM_REQUIRED_BONES` · `VRM0_PRESET_TO_EXPRESSION` · `BYTES_PER_MB`:349 · `BYTES_PER_KB`.
- `seed/teachers.json` — 미나 · 리오 nameKoWordExceptions · model · portrait · voice.prefer [] · source.reduction(스크립트 `--write` 가 채움, 글 꼴은 지금 꼴 그대로).
- `public/teachers/` 파일 넷(아래 크기 표).
- `package.json` — `"teacher:reduce": "tsx scripts/teacher-reduce.ts"` 한 줄(lockfile 그대로, 새 의존 없음).
- 시험: `tests/fixtures/seed/vrm.ts`(신규 — 가짜 GLB 를 src 와 따로 짬) · `tests/unit/teacher-vrm.test.ts`(신규) · `tests/unit/teacher-reduce.test.ts`(신규) · `tests/fixtures/seed/builders.ts`(견본 명단 새 필수 칸) · `tests/unit/seed-teacher.test.ts`(최소 고침) · `tests/unit/seed-validate-cli.test.ts`(명령 시험이 실제 명단을 씀).

차례 3~4(아직 커밋 안 됨 — 이 보고 몫):
- `src/core/seed/check-teacher.ts` — `TeacherNames.koExceptions` · `teacherNamesOf`:53(옛 이름 몫 + 명단 칸), `KO_NAME_WORD_EXCEPTIONS` 지움, 대비 짝 accent ↔ `TEACHER_LABEL_TEXT`:338, 빼는 낱말 검사:346, 'reduction 빔' 줄 지움, `TeacherAssetIo`:369 · `checkTeacherAssets(file, io)`:394 · `checkVrm`:495(값 4 (a)~(f)).
- `src/core/seed/validate.ts` — `ValidateOptions.assetExists` → `teacherAssets?: TeacherAssetIo`:484 · 1004.
- `scripts/seed-validate.ts` — `CREDITS_FILE` · `TEACHER_LIMIT_KEYS` · `TeacherAssetFiles` · `teacherAssetLimits`:165 · `publicAssetFiles`:199, `runValidate(args, files, assets?)`(크기 상한은 읽은 시드 settings.json 에서, 없으면 종료 2), `main`:370 이 저장소 뿌리에서 io 를 만듦. `existsSync` 가져오기 지움.
- `CREDITS.md` — '3. 회화 선생님(`public/teachers/`)' 새 절, 옛 '3. 앱 안 표시'를 4 로.
- `tests/fixtures/seed/builders.ts` — 견본 설정에 `talk.teacher_model_max_mb` 8 · `talk.teacher_portrait_max_kb` 100(12절 기본값 · changeVia seed — 명령 시험이 상한을 읽음), 주석 45 → 47 키.
- `tests/fixtures/seed/loadable.ts` — 주석 한 줄(45 → 47 키)만.
- `tests/unit/seed-teacher.test.ts` — 아래 시험.

## 크기(1024 파일 넷 · 2048 표본 둘)

| 파일 | 바이트 | SHA-256 |
|---|---:|---|
| `public/teachers/mina.9c5152a7.vrm` | 4,728,568 | 9c5152a7a024…565a8a |
| `public/teachers/leo.45154cde.vrm` | 5,047,396 | 45154cdee6c1…e4e7df |
| `public/teachers/mina.fdc5f7f2.webp` | 22,336 | fdc5f7f2b1db…2df7bff |
| `public/teachers/leo.669c5d28.webp` | 22,180 | 669c5d2851a7…aee297b |
| 2048 표본 `tests/.tmp/teacher-2048/mina.f92f13b1.vrm`(추적 안 함) | 5,457,456 | f92f13b1106f… |
| 2048 표본 `tests/.tmp/teacher-2048/leo.85e8c631.vrm`(추적 안 함) | 6,323,880 | 85e8c6310cb3… |

- 모두 talk.teacher_model_max_mb 8(8,000,000B) · talk.teacher_portrait_max_kb 100(100,000B) 안. plan 어림(4.74 · 5.06MB, 2048 5.47 · 6.34MB, 초상 약 22KB)과 같다.
- 줄인 VRM: extensionsUsed 에 EXT_texture_webp, extensionsRequired [EXT_texture_webp], 그림 미나 27 WebP + 1 PNG(썸네일 256²) · 리오 24 + 1, meta.texture · licenseName 그대로.
- 재현: 같은 원본 · 같은 판으로 다시 돌리면 같은 SHA-256(미나 1024 를 다른 폴더로 다시 만들어 9c5152a7… 확인). 원본 둘의 SHA-256 은 돌리기 전후 그대로(aea824cc… · 4af2194f…), 시제품 폴더에 쓰지 않음.

## 시험(덮는 이름)

- `tests/unit/teacher-vrm.test.ts`(5): 'AC-19k 가짜 VRM 을 풀면 … 다시 묶으면 같은 JSON · BIN' · 'AC-19k 머리 glTF · 판 2 · 첫 덩이 JSON · 둘째 덩이 BIN …' · 'AC-19k VRM 0.x 의 메타 · 표정(VRM 1.0 이름으로 바꿈) · 뼈' · 'AC-19k VRM 1.0 은 판만 …' · 'AC-19k 풀기부터 사실까지 …'.
- `tests/unit/teacher-reduce.test.ts`(13): 그림 갈래 둘 · 그림 다시 쓰기 다섯(VRM 확장 · accessors · materials 글자 그대로, bufferView 4바이트 맞춤 · buffers 길이 · accessor 바이트, EXT_texture_webp · 썸네일 source 유지, 다시 묶어 풀림 · 확장 목록 안 겹침, 입력 안 바뀜) · 줄인 방법 글이 plan 값 1 글과 같음 · 인자 · PNG 크기 · 줄일 크기 · 옛 파일 고르기 · 명단 글 꼴.
- `tests/unit/seed-teacher.test.ts`(25, 새로 쓰거나 고친 것):
  - 'AC-19e 막는 이름은 …'(koExceptions 포함) · 'AC-19e 빼는 낱말을 명단 칸으로 옮긴 뒤에도 같게 걸고 빼며, 칸을 비우면 그 낱말도 이름으로 건다'(새) — AC-19e 칸 옮긴 뒤 그대로. 기존 한국어 이름 걸기 · 빼기 꼴 서른여 개는 그대로 통과(리옹은 원래 걸리지 않음).
  - 'AC-19a 가짜 명단마다 거부 하나 …' — 빼는 낱말 넷(리옹 · 세미나 · 미나 · 미난) 더함, 대비 미달은 accent ↔ 종이색.
  - 'AC-19a 규격이 꼴을 거부한다 …' — 모델 · 초상 · 목소리 · 빼는 낱말 · 줄인 방법 · prefer 빠지면 거부.
  - 'AC-19a 이름표 대비 짝은 accent 바탕 ↔ 종이색 글자(--color-paper) …' — globals.css 값과 견줌, 창 바탕이 어두워도 통과.
  - 'AC-19k 맞춘 가짜 자산은 통과한다' · 'AC-19k 깨뜨린 가짜 자료마다 거부 하나 …'(스물세 경우, 경로 · 글 조각 대조) · 'AC-19k 실제 명단 · public/teachers/ · CREDITS.md 는 자산 검사를 통과하고, 모델 둘이 상한 안이다' · 'AC-19k 시드 검증 · 명령은 자산 검사 오류를 규격 파일 오류로 내고, 상한 설정이 없으면 명령은 입력 오류 2 다'.
- `tests/unit/seed-validate-cli.test.ts` '명령: 첫 줄 요약 꼴과 --json 보고 꼴' — 실제 명령이 자산 검사까지 돌고 0(실제 명단 · public · CREDITS).

## 관문(Node 24 PATH, 워크트리 p13d, 13:1x)

```
pnpm lint                                   → Checked 404 files … No fixes applied.
pnpm exec next typegen && pnpm exec tsc --noEmit → 오류 없음
pnpm test                                   → Test Files 82 passed (82) · Tests 857 passed | 6 todo (863)
pnpm check:deps                             → ✔ no dependency violations found (203 modules, 1087 dependencies cruised)
pnpm seed:validate                          → 칸 720 · 통과 720 · 실패 0 · … · 규격 파일 오류 0 (끝 0)
pnpm check:ids                              → 끝 0 · design-number 42(이 묶음 전과 같은 수)
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → 끝 0 · unknown-ac 0 · plan-ac-not-in-spec 0
```
- `pnpm test` 는 같은 워크트리의 d2 · d5 쓰는 중 코드까지 든 상태에서 돌았고 모두 통과했다.
- 손 확인: 시드 사본의 리오 model.sha256 을 깨뜨려 `pnpm seed:validate --root <사본>` → 규격 파일 오류 2(해시 · 출처 문서). 스크립트에 틀린 원본(리오 파일을 --key mina)은 종료 2, `--write` 와 다른 `--out` 은 종료 2.

## plan 으로 풀리지 않아 정한 것

1. **dwebp 인자**: plan 값 1 의 `dwebp -png` 는 libwebp 1.6.0 dwebp 에 없는 인자다(PNG 가 기본 출력). `dwebp <in> -quiet -o <out>` 으로 썼다. 줄인 방법 글은 그대로.
2. **imageRolesOf 의 넷째 칸 `shared`**: '한 그림을 썸네일과 다른 텍스처가 같이 쓰면 종료 2'를 순수 함수로 시험하려고 그런 텍스처 차례를 돌려준다(plan 꼴 `{ thumbnail; normals; colors }` + 하나).
3. **썸네일 · 법선이 겹치면** 썸네일이 이긴다(법선 목록에서 뺌). 실제 두 모델에는 겹침이 없다. 법선 그림 이름 `Shader_NoneNormal`(8×8 빈 법선)은 `_nml` 이 아니라 '알림'만 낸다(plan '보고만').
4. **`--write` 는 `--out` 기본에서만**: 명단 경로는 public/ 기준이라 다른 폴더에 쓰면서 명단을 고치면 경로가 틀린다 — 종료 2.
5. **줄일 그림은 PNG 만**: 원본 그림이 모두 bufferView 안 PNG 라 크기를 IHDR 에서 읽고, PNG 가 아니거나 uri 그림이면 종료 2.
6. **명단 글 꼴**: seed/*.json 은 biome 밖이라 스크립트가 지금 명단 꼴(항목 칸 한 줄 · source 는 칸마다 한 줄, 칸 차례는 규격 차례)로 직접 쓴다(`formatRoster`). diff 가 새 칸 줄만 늘었다.
7. **빼는 낱말 검사 하나 더**: '이름 자리에서 걸려야 한다'(plan) 말고 '이름보다 길어야 한다'도 오류로 했다 — '미나'나 '미난'(미나 + 줄임 ㄴ)을 넣으면 이름 자체 · 줄임 꼴을 늘 빼게 되어 검사가 구멍 난다. 같은 경로 · 같은 규칙(teacher-roster).
8. **자산 검사 경로**: 명단 밖 .vrm · 출처 문서 없음은 항목이 없어 경로 `teachers`(그 파일 이름은 글에). 크기 상한 · 바이트 다름은 `.bytes`, 원본 해시 같음은 `model.sha256`, 메타는 `source.<칸>`, GLB · 판 · 표정 · 뼈는 `model.path`.
9. **크기 상한 바이트는 반올림**: `Math.round(MB × 1,000,000)` — 소수 상한에서 곱셈 오차로 1바이트 모자라게 거부하던 것을 시험이 잡았다(설정 8 · 100 에는 차이 없음).
10. **크기 상한 설정 없음은 종료 2**: plan '없으면 오류'를 seed.complete_through_level 과 같은 입력 오류(종료 2 · 표준 오류)로 했다. 자산을 넘기지 않는 runValidate(시험)는 지금처럼 자산 검사를 건너뛴다.
11. **VRM 1.0 사실**: 판 · 표정 이름(preset 키) · 뼈만 뽑고 메타는 비운다(1-가 자산 검사가 1.0 을 거부 — '명단을 늘리는 변경에서').
12. **견본 설정 두 키**: `talk.teacher_model_max_mb` · `talk.teacher_portrait_max_kb` 를 `tests/fixtures/seed/builders.ts` 견본 설정(하나짜리 키)에 12절 기본값으로 더했다 — 명령 시험(임시 시드 나무)이 상한을 읽어야 해서. check:ids fixture-setting 0.
13. **CREDITS 문구**: plan 값 4 의 칸(원 제작자 · 배포처 · 원본 제목 · 파일 안 조건 · 원본 · 줄인 파일 SHA-256 · 줄인 방법) 외에 배포 파일 이름 · 게시자 · 초상이 썸네일을 줄인 것임 · '썸네일 그림만 256² 로 줄임'을 적었다(시제품 LICENSES.md 사실).

## 요청하는 변경(공용 파일 · 설계)

- 없음. 브리프 범위 밖 파일은 건드리지 않았다(`tests/fixtures/seed/loadable.ts` 는 주석 한 줄 — 견본 설정 키 수).

## 남은 우려

- **EXT_texture_webp 그리기**: three r180 · three-vrm 3.5.5 가 줄인 VRM 을 실제로 그리는지는 이 묶음에서 보지 않았다(d8 · 로컬 3D 눈 점검 · iPad 실측, plan 위험 5). 구조(확장 두 목록 · 텍스처 source 자리)는 시험이 지킨다.
- **썸네일 256²**: three-vrm 은 썸네일을 풀지 않지만(needThumbnailImage false), 바깥 VRM 도구가 보는 썸네일이 작아졌다. 초상은 원본 썸네일(2048²)에서 만들었으므로 화질과 무관하다.
- **원본 파일 의존**: 다시 줄이려면 본 저장소 작업 트리의 시제품 원본(추적 안 함)이 있어야 한다(plan 위험 4). 해시는 명단 · CREDITS 에 있다.
- **법선 = Shader_NoneNormal**: 두 모델의 실제 법선 텍스처는 VRoid 의 8×8 빈 법선을 여러 머티리얼이 같이 쓰는 꼴이 섞여 있다. 무손실이라 손실은 없다.
- 2048 표본은 `tests/.tmp/teacher-2048/`(추적 안 함)에만 있다. d10 임시 가지 프리뷰 때 같은 명령으로 다시 만든다.
