// 회화 이야기 방식(intent 2026-11-13-회화-대화-구조-R plan 묶음 S2 fix 3)의 단원 낱말 재료 core 모듈(src/core/conversation/chat-unit-words.ts) 단위 시험.
// (1) 순수 함수가 core 에 있고 서버 파일은 같은 함수를 다시 내보낸다(대본 도구가 같은 함수를 부름 — NFR-4). (2) 턴 길은 이미 읽는 어휘 사전으로 같은
// 재료를 만들어 첫 문장 앞에 읽기를 더하지 않는다(재검토 rev-chat-s2-3 N-1 · NFR-1) — 어휘 사전으로 만든 재료와 vocab 꼴 자료로 만든 재료가 같은 값이다.
// (3) 재료를 읽지 못한 차례는 응답 뒤 평가를 부르지 않는다(M-2 — 원형 표 없는 맥락으로 수업 전체를 다시 세지 않게, 기다림으로 두어 닫을 때 다시 부름).
// (4) 부르는 자리(힌트 액션 · 턴 길 · 닫을 때)가 이 재료를 쓰고, 턴 길이 대화 호출 앞에서 재료 읽기를 기다리지 않는지 소스 글로 지킨다(M-1 · N-1).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  chatJudgeContextFrom,
  chatTurnEvalDueOf,
  chatUnitWordsFromLexicon,
  chatUnitWordsOf,
} from "@/core/conversation/chat-unit-words";
import * as server from "@/server/conversation/chat-unit-words";

const STAGE_WORDS = ["eat", "go", "see", "saw", "sea", "beach"];
/** 어휘 사전(모든 vocab — 단원 단어 밖 낱말 포함, DB 차례는 정해지지 않음). */
const LEXICON = [
  { word: "cat", pos: ["noun"], level: 1, forms: ["cats"] },
  { word: "see", pos: ["verb"], level: 1, forms: ["sees", "saw", "seen"] },
  { word: "beach", pos: ["noun"], level: 1, forms: ["beaches"] },
  { word: "saw", pos: ["noun"], level: 2, forms: ["saws"] },
  { word: "go", pos: ["verb"], level: 1, forms: ["goes", "went", "gone"] },
  { word: "eat", pos: ["verb"], level: 1, forms: ["eats", "ate", "eaten"] },
  { word: "sea", pos: ["noun"], level: 1, forms: ["seas"] },
];
/** 같은 낱말의 vocab 꼴 자료(서버 lemmaEntriesOf 의 꼴 — 다른 차례). */
const ENTRIES = LEXICON.filter((r) => STAGE_WORDS.includes(r.word))
  .map((r) => ({ word: r.word, forms: r.forms }))
  .reverse();
const SURFACES = [
  "saw",
  "saws",
  "seen",
  "went",
  "beaches",
  "seas",
  "ate",
  "cats",
  "cat",
  "dog",
];

describe("AC-27g · AC-27i 단원 낱말 재료 core(chatUnitWordsOf · chatUnitWordsFromLexicon)", () => {
  it("AC-27i 서버 파일은 core 의 같은 함수를 다시 내보낸다(이름 · 꼴 그대로)", () => {
    expect(server.chatUnitWordsOf).toBe(chatUnitWordsOf);
    expect(server.chatJudgeContextFrom).toBe(chatJudgeContextFrom);
  });

  it("AC-27i 어휘 사전으로 만든 재료는 vocab 꼴 자료로 만든 재료와 같은 값이다(단원 단어 밖 낱말은 들지 않음)", () => {
    const fromLexicon = chatUnitWordsFromLexicon({
      unitWords: STAGE_WORDS,
      lexicon: LEXICON,
    });
    const fromEntries = chatUnitWordsOf({
      unitWords: STAGE_WORDS,
      lemmaEntries: ENTRIES,
    });
    expect(fromLexicon.unitWords).toEqual(STAGE_WORDS);
    for (const surface of SURFACES)
      expect(fromLexicon.lemmaOf(surface), surface).toBe(
        fromEntries.lemmaOf(surface),
      );
    expect(fromLexicon.lemmaOf("cats")).toBeUndefined();
    expect(fromLexicon.lemmaOf("went")).toBe("go");
  });

  it("AC-27i 원형 표는 꼴 자료의 차례와 무관하다(두 낱말이 같은 꼴을 가지면 단원 단어 목록의 차례가 먼저인 낱말)", () => {
    const a = chatUnitWordsOf({
      unitWords: STAGE_WORDS,
      lemmaEntries: ENTRIES,
    });
    const b = chatUnitWordsOf({
      unitWords: STAGE_WORDS,
      lemmaEntries: [...ENTRIES].reverse(),
    });
    for (const surface of SURFACES)
      expect(a.lemmaOf(surface), surface).toBe(b.lemmaOf(surface));
    // see 가 saw 보다 단원 단어 목록에서 앞이라 'saw' 는 see 의 과거형으로 읽는다
    expect(a.lemmaOf("saw")).toBe("see");
  });
});

describe("AC-27h 재료를 읽지 못한 차례의 응답 뒤 평가(chatTurnEvalDueOf — 재검토 M-2)", () => {
  it("AC-27h 말 입력 차례라도 재료를 읽지 못했으면 응답 뒤 평가를 부르지 않는다(기다림으로 두어 닫을 때 다시 부름)", () => {
    const speech = { kind: "speech" as const, heard: "I saw the sea." };
    expect(chatTurnEvalDueOf({ input: speech, unitWordsRead: true })).toBe(
      true,
    );
    expect(chatTurnEvalDueOf({ input: speech, unitWordsRead: false })).toBe(
      false,
    );
    expect(
      chatTurnEvalDueOf({ input: { kind: "quiet" }, unitWordsRead: true }),
    ).toBe(false);
    expect(
      chatTurnEvalDueOf({
        input: { kind: "speech", heard: "  " },
        unitWordsRead: true,
      }),
    ).toBe(false);
  });
});

// ── 부르는 자리(소스 검색) ─────────────────────────────────────────────

const ROOT = process.cwd();
const source = (file: string) =>
  readFileSync(join(ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** 함수 본문(이름 뒤 첫 '{' 부터 짝이 맞는 '}' 까지). */
function bodyOf(code: string, head: string): string {
  const at = code.indexOf(head);
  expect(at, head).toBeGreaterThanOrEqual(0);
  const open = code.indexOf("{", code.indexOf(")", at));
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === "{") depth += 1;
    else if (code[i] === "}") {
      depth -= 1;
      if (depth === 0) return code.slice(open, i + 1);
    }
  }
  return code.slice(open);
}

describe("AC-27g · AC-27i 단원 낱말 재료를 부르는 자리(재검토 M-1 · N-1)", () => {
  const index = source("src/server/conversation/index.ts");
  const turn = source("src/server/conversation/chat-turn.ts");
  const closing = source("src/server/conversation/closing.ts");

  it("AC-27g 힌트 받는 액션은 힌트 단 재료를 단원 낱말 재료로 넘긴다(수업 단원 단어 · 수업 원형 표가 아님)", () => {
    const reveal = bodyOf(index, "async function chatRevealOf(");
    expect(reveal).toMatch(/readChatUnitWords\(\s*db,\s*ctx\.unitWords\s*\)/);
    const call = reveal.slice(reveal.indexOf("requestChatHint("));
    expect(call).toMatch(/unitWords:\s*unit\.unitWords/);
    expect(call).toMatch(/lemmaOf:\s*unit\.lemmaOf/);
    expect(call).not.toMatch(/state\.lesson\.unitWords|state\.lemmaOf/);
  });

  it("AC-27i 턴 길 · 닫을 때의 판정 맥락은 chatJudgeContextFrom 하나로 만든다(core chatJudgeContextOf 를 따로 부르지 않음)", () => {
    expect(turn).toMatch(/chatJudgeContextFrom\(/);
    expect(turn).not.toMatch(/chatJudgeContextOf\(/);
    expect(closing).toMatch(/chatJudgeContextFrom\(/);
    expect(closing).not.toMatch(/chatJudgeContextOf\(/);
  });

  it("AC-27i 턴 길은 대화 호출 앞에서 재료 읽기를 기다리지 않고, 판정 맥락은 호출 뒤에 만든다(NFR-1 — 첫 문장 앞에 DB 왕복을 더하지 않음)", () => {
    const callAt = turn.indexOf("talkChatTurn(");
    expect(callAt).toBeGreaterThan(0);
    const before = turn.slice(0, callAt);
    expect(before).not.toMatch(/await\s+readChatUnitWords\(/);
    expect(before).not.toMatch(/await\s+unitWordsP\b/);
    expect(before).not.toMatch(/chatJudgeContextFrom\(/);
    // 재료는 이미 읽는 어휘 사전에서 만든다
    expect(turn).toMatch(/chatUnitWordsFromLexicon\(/);
  });

  it("AC-27h 턴 길의 응답 뒤 평가는 재료를 읽은 차례에만 부른다(chatTurnEvalDueOf)", () => {
    // 그 차례의 재료 읽기 결과(어휘 사전 · vocab 꼴 자료 모두 실패하면 read 거짓)를 넘긴다
    expect(turn).toMatch(
      /chatTurnEvalDueOf\(\{\s*input,\s*unitWordsRead:\s*unitWordsRead\.read\s*\}\)/,
    );
    expect(turn).toMatch(/read:\s*false/);
    expect(turn).not.toMatch(/if\s*\(\s*chatEvalDueOf\(input\)\s*\)/);
  });
});
