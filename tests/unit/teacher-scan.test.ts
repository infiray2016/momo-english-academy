// 아이 화면 소스의 화면 글자 훑기(선생님 화면 plan 값 9 · 4절 머리 문단 · C130 (7) · AC-19c).
// TypeScript 컴파일러 API 로 문자열 · 템플릿 · JSX 글만 본다(주석은 보지 않음). 옛 이름 '토리'와 명단 선생님의 한글 이름을 화면 소스에
// 직접 쓰지 않는다 — 이름 자리는 문구 표(src/core/teacher/name.ts)의 [이름] 이다. '도토리' · '스토리'처럼 앞에 한글이 붙은 낱말은
// 이름이 아니라 거르지 않는다. 음성 층(src/lib/speech) audioSession 훑기는 tests/unit/teacher-speech.test.ts 가 맡고(d5), 여기서는
// 선생님 화면 조각 폴더(src/components/teacher — 선생님 창 · 초상 · 고르기 …)의 navigator.audioSession 쓰기만 본다(묶음 검토 2 M-2, C109).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { TeachersFileSchema } from "@/core/seed/schema/teachers";

const REPO_ROOT = join(import.meta.dirname, "../..");
/** 아이 화면 소스(plan 값 9 훑기 범위). 관찰 쪽 · 시드 보기(src/app/dev)는 범위 밖이다. */
const SCAN_DIRS = [
  "src/app/(child)",
  "src/app/(setup)",
  "src/components",
  "src/core/teacher",
] as const;
const SOURCE_FILE = /\.(ts|tsx)$/;
const OLD_NAME = "토리";

/** 소스 하나의 화면 글자(문자열 · 템플릿 조각 · JSX 글). 주석은 들지 않는다. */
function screenTextsOf(fileName: string, source: string): string[] {
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const out: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    )
      out.push(node.text);
    else if (ts.isJsxText(node)) {
      const text = node.getText(file).trim();
      if (text) out.push(text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return out;
}

/** 이름이 낱말 머리에 있는 자리(앞에 한글 음절이 붙지 않음 — '도토리' · '스토리' 는 거르지 않는다). 빼는 낱말은 먼저 지운다. */
function nameHitsOf(
  texts: readonly string[],
  name: string,
  wordExceptions: readonly string[] = [],
): string[] {
  const at = new RegExp(`(?<![가-힣])${name}`);
  return texts.filter((t) => {
    let rest = t;
    for (const word of wordExceptions) rest = rest.split(word).join(" ");
    return at.test(rest);
  });
}

function sourceFilesUnder(dir: string): string[] {
  const abs = join(REPO_ROOT, dir);
  return readdirSync(abs).flatMap((name) => {
    const path = join(abs, name);
    if (statSync(path).isDirectory()) return sourceFilesUnder(join(dir, name));
    return SOURCE_FILE.test(name) ? [join(dir, name)] : [];
  });
}

const scanned = SCAN_DIRS.flatMap(sourceFilesUnder).map((path) => ({
  path: path.split(sep).join("/"),
  texts: screenTextsOf(path, readFileSync(join(REPO_ROOT, path), "utf8")),
}));

describe("화면 글자 훑기 도구", () => {
  it("훑기: 문자열 · 템플릿 조각 · JSX 글을 모으고 주석은 보지 않는다", () => {
    const texts = screenTextsOf(
      "sample.tsx",
      [
        "// 토리 주석",
        "/** 토리 문서 주석 */",
        'const a = "토리가 웃어요";',
        // biome-ignore lint/suspicious/noTemplateCurlyInString: 훑기 시험의 견본 소스 글이다(템플릿 조각을 만든다)
        "const b = `토리와 ${x} 토리야`;",
        "const c = <p title='토리 제목'>토리 글</p>;",
      ].join("\n"),
    );
    expect(texts).toEqual([
      "토리가 웃어요",
      "토리와 ",
      " 토리야",
      "토리 제목",
      "토리 글",
    ]);
    expect(texts.join(" ")).not.toContain("주석");
  });

  it("훑기: 앞에 한글이 붙은 낱말('도토리' · '스토리')과 빼는 낱말('미나리')은 이름으로 세지 않는다", () => {
    expect(
      nameHitsOf(["도토리를 주워요", "스토리", "토리노"], OLD_NAME),
    ).toEqual(["토리노"]);
    expect(
      nameHitsOf(["미나리 무침", "미나와 놀아요"], "미나", ["미나리"]),
    ).toEqual(["미나와 놀아요"]);
  });
});

describe("아이 화면 소스의 이름(AC-19c)", () => {
  it("AC-19c 아이 화면 소스의 화면 글자에 '토리'가 없다", () => {
    expect(scanned.length).toBeGreaterThan(0);
    const hits = scanned.flatMap(({ path, texts }) =>
      nameHitsOf(texts, OLD_NAME).map((t) => `${path}: ${t}`),
    );
    expect(hits).toEqual([]);
  });

  it("AC-19c 아이 화면 소스는 명단 선생님의 한글 이름을 직접 쓰지 않는다(이름은 문구 표의 [이름] 자리로만)", () => {
    const roster = TeachersFileSchema.parse(
      JSON.parse(readFileSync(join(REPO_ROOT, "seed/teachers.json"), "utf8")),
    ).teachers;
    expect(roster.length).toBeGreaterThan(0);
    const hits = roster.flatMap((t) =>
      scanned.flatMap(({ path, texts }) =>
        nameHitsOf(texts, t.nameKo, t.nameKoWordExceptions).map(
          (text) => `${path}: ${text}`,
        ),
      ),
    );
    expect(hits).toEqual([]);
  });
});

/** 소스 하나에서 audioSession 에 대입하는 식(=, ??= 등 — 비교는 아님). 주석 · 글은 보지 않는다. */
function audioSessionWritesOf(fileName: string, source: string): string[] {
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const out: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
      /audioSession/.test(node.left.getText(file))
    )
      out.push(node.getText(file));
    ts.forEachChild(node, visit);
  };
  visit(file);
  return out;
}

describe("선생님 화면 조각의 소리 통로(AC-19g)", () => {
  it("훑기: audioSession 대입식(type 바꾸기 · 통째 바꾸기)을 찾고 읽기 · 비교 · 주석은 세지 않는다", () => {
    expect(
      audioSessionWritesOf(
        "sample.ts",
        [
          "// navigator.audioSession.type = 'playback'",
          "const t = navigator.audioSession?.type;",
          "if (navigator.audioSession.type === 'auto') {}",
          "navigator.audioSession.type = 'playback';",
          "(navigator as any).audioSession = x;",
        ].join("\n"),
      ),
    ).toEqual([
      "navigator.audioSession.type = 'playback'",
      "(navigator as any).audioSession = x",
    ]);
  });

  it("AC-19g src/components/teacher(선생님 창 · 초상 · 고르기)에는 navigator.audioSession 쓰기가 없다(C109)", () => {
    const files = sourceFilesUnder("src/components/teacher");
    const names = files.map((f) => f.split(sep).join("/"));
    expect(names).toContain("src/components/teacher/teacher-window.tsx");
    expect(names).toContain("src/components/teacher/teacher-portrait.tsx");
    const hits = files.flatMap((path) =>
      audioSessionWritesOf(
        path,
        readFileSync(join(REPO_ROOT, path), "utf8"),
      ).map((w) => `${path}: ${w}`),
    );
    expect(hits).toEqual([]);
  });
});
