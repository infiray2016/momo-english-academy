# Minor 정리 브리프: P10 차례 1 검토의 Minor 다섯(implementer impl-p10 · Opus · high) — 차례 2 와 함께

`review-p10-1.md`(rev-p10, **Approved** — C 0 · I 0 · M 5; 설계 준수 · 12절 키 33 대조 · .env.local 보존 · 신호 처리 모두 맞음)의 Minor 를 **차례 2 를 끝내는 라운드에 함께** 정리한다(가벼운 루프, 재검토 없이 컨트롤러 확인). 고치는 법은 보고 3절 그대로. 워크트리 p10, 커밋하지 않는다.

## 고칠 것
1. **M-1** `scripts/dev-db.ts` `--reset`: 자료 폴더를 지우기 전에 `postmaster.pid` 의 pid 가 살아 있으면(다른 포트로 켜 둔 인스턴스) 종료 2 · 오류 한 줄로 막는다(rmSync 앞). 시험 하나.
2. **M-2** 시작 중(1초 안쪽) 신호: 처리기를 더 일찍 걸고 `pg.stop()` 기다림에 상한을 둔다(상수). 임시 폴더가 남지 않게.
3. **M-3** `.env.local` 판정: 로컬 호스트(127.0.0.1 · localhost)에 경로 `/momo_dev` 이면 포트가 달라도 '우리 주소'로 보고 고친다(예전 `--port` 실행의 흔적). 다른 호스트 · 다른 DB 이름만 '다른 주소'.
4. **M-4** Supabase 역할 흉내 · URL 조립이 `tests/integration/global-setup.ts` 와 두 벌 → 한 곳(`tests/fixtures/` 또는 `scripts/` 공용 작은 모듈, 경계 규칙에 맞게)으로 모으고 둘 다 그것을 쓴다.
5. **M-5** `tests/unit/dev-tree.test.ts`: devSeedTree 의 실제 적재 수(칸 · 단원 · 배치 문항)를 고정하는 단언, 가림 시험이 빈 길이 아니라 실제 값을 보게.

## 완료 판정 · 보고
차례 2 완료 판정과 함께: biome 0 · tsc · build · test · test:int · e2e · e2e:local · deps · spec · bundle, `pnpm db:dev --reset` 이 켜진 인스턴스 앞에서 종료 2. 보고 `task-p10-report.md` '차례 1 Minor 정리' 소절(지적마다 파일:줄 · 시험). 요지는 차례 2 보고에 같이.
