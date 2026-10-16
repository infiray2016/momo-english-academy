// pnpm 의 실제 경로(node_modules/.pnpm/<이름>@<판>/node_modules/<이름>/)와 평범한 꼴을 둘 다 받는다.
// 두 꼴을 '( … )?' 로 묶으면 dependency-cruiser 의 safe-regex 검사가 겹친 반복으로 보고 거부하므로 갈래로 나눠 적는다.
/** @type {import('dependency-cruiser').IConfiguration} */
const npm = (names) =>
  `(^|/)node_modules/(${names})/|(^|/)node_modules/\\.pnpm/[^/]+/node_modules/(${names})/`;

module.exports = {
  forbidden: [
    {
      name: "core-no-framework",
      comment:
        "src/core 는 순수 함수다. DB · Next · React · src/server 를 가져오지 않는다(CLAUDE.md, 묶음 위험 7, 조사 P8)",
      severity: "error",
      from: { path: "^src/core/" },
      to: {
        path: `^src/(db|server)/|${npm("next|react|react-dom|drizzle-orm|drizzle-kit|postgres")}`,
      },
    },
    {
      name: "core-no-io",
      comment:
        "src/core 는 순수 함수다. 파일 · 프로세스 · 네트워크 내장 모듈(fs · child_process · http · https · net, node: 접두 포함)을 가져오지 않는다. node:crypto 는 허용(seed 검증 해시, P4c)",
      severity: "error",
      from: { path: "^src/core/" },
      to: {
        dependencyTypes: ["core"],
        path: "^(node:)?(fs|fs/promises|child_process|http|https|http2|net)$",
      },
    },
    {
      name: "no-circular",
      comment: "가져오기 순환 금지(조사 P8)",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "ai-only-from-server",
      comment:
        "src/server/ai 는 src/server 안에서만 가져온다(AI 호출은 서버 코드에서만, 조사 P8)",
      severity: "error",
      from: { pathNot: "^src/server/" },
      to: { path: "^src/server/ai/" },
    },
    {
      name: "db-only-from-server",
      comment:
        "src/ 가운데 src/server · src/db 밖은 src/db · drizzle-orm · postgres 를 가져오지 않는다(10절 'DB 접근은 서버의 Drizzle 연결로만', plan-p03a 공용 변경 7). src/core 는 core-no-framework 가 이미 막아 한 줄로만 보고되게 뺀다",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/(server|db|core)/" },
      to: { path: `^src/db/|${npm("drizzle-orm|postgres")}` },
    },
    {
      name: "sdk-only-in-ai",
      comment:
        "(제안) @anthropic-ai/sdk 는 src/server/ai 에서만 가져온다. scripts/ 는 대상 밖(풀이 검사 · AI 계약은 스크립트가 직접 부른다)",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/server/ai/" },
      to: { path: npm("@anthropic-ai/sdk") },
    },
    {
      name: "no-fake-speech-in-app",
      comment:
        "가짜 Web Speech(시험용)는 앱 코드가 가져오지 않는다. e2e(tests/)만 쓴다(plan-p02 다-3)",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/lib/speech/fake-web-speech" },
      to: { path: "^src/lib/speech/fake-web-speech" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
  },
};
