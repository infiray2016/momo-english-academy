// 가르치는 수업 쓰기 연결(가르치고 배우는 수업 plan 묶음 라-2 · 델타 spec 설계 1 '틀린 뒤 차례' 쓰기 행 · '같이 해 보기의 꼴과 수' · 5 정본 밖
// 문구 · 정한 것 8, 정본 15절 AC-3d · AC-4d · AC-22c). 입력은 정규 시드 셋의 승인 수업(seed/lessons/writing/3/1.json) 그대로다. 조각을
// renderToStaticMarkup 으로 그려 단계(initial 시도로 되살림)마다 보이는 것을 본다(누름 흐름은 e2e teach.spec.ts).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/session", () => ({}));
vi.mock("@/server/actions/teacher", () => ({}));
vi.mock("@/server/actions/conversation", () => ({}));

import type { PictureLookup } from "@/components/activities/common";
import { TILE_TEXT, TogetherCards } from "@/components/answer/tiles";
import { CHIP_NAME } from "@/components/session/teach/chips";
import { TEACH_TEXT } from "@/components/session/teach/teacher-line";
import {
  WRITING_TEXT,
  WritingItemActivity,
  type WritingItemInput,
  type WritingTeach,
  writingTeachStageOf,
} from "@/components/session/writing-items";
import type { Answer } from "@/core/answer/check";
import {
  LessonFileSchema,
  type LessonOf,
  type WritingItem,
} from "@/core/seed/schema/lesson";
import { WRITING_WHY_KO } from "@/core/writing/why";

const lesson = (() => {
  const file = LessonFileSchema.parse(
    JSON.parse(
      readFileSync(
        join(process.cwd(), "seed", "lessons", "writing", "3", "1.json"),
        "utf8",
      ),
    ),
  );
  return file.lessons[0] as LessonOf["writing"];
})();
if (lesson.content.shape !== "items") throw new Error("쓰기 꼴");
const item = lesson.content.items[0] as WritingItem;
if (!item.spare || !item.whyKo) throw new Error("승인 수업 문항 꼴");
const spare = item.spare as WritingItem;
const tiles = (pieces: string[]): Answer => ({ kind: "tiles", pieces });
// 'The bedroom is pink.'
const RIGHT = tiles(["The", "bedroom", "is", "pink", "."]);
const ORDER = tiles(["The", "is", "bedroom", "pink", "."]);
const CAPITAL = tiles(["the", "bedroom", "is", "pink", "."]);
const PERIOD = tiles(["The", "bedroom", "is", ".", "pink"]);

const pictures: PictureLookup = {
  ofWord: (word) => ({ meaningKo: word, catalogued: false }),
  ofKey: (key) => ({ meaningKo: key, catalogued: false }),
};
const teachOf = (mode: "solo" | "spare"): WritingTeach => ({
  mode,
  teacher: null,
  speechSettings: { skipNoticeMs: 1500, speakCharsPerSecondKo: 5, rateKo: 1 },
});
const html = (
  initial: WritingItemInput | undefined,
  teach: WritingTeach | undefined,
  target: WritingItem = item,
) =>
  renderToStaticMarkup(
    createElement(WritingItemActivity, {
      item: target,
      level: 3,
      pictures,
      speech: undefined,
      ...(initial ? { initial } : {}),
      onChange: () => {},
      onDone: () => {},
      ...(teach ? { teach } : {}),
    }),
  );

describe("가르치는 수업 쓰기 1~3 문항 — 틀린 뒤 차례(AC-3d · 정한 것 8)", () => {
  it("AC-3d 처음 틀리면 정답을 보이지 않고 같은 문항 위에 까닭별 '왜' 하나와 '한 번 더 하기'다(차례 → 시드 whyKo)", () => {
    const out = html({ tries: [ORDER] }, teachOf("solo"));
    expect(out).toContain(item.whyKo);
    expect(out).toContain(TEACH_TEXT.retry.do);
    expect(out).not.toContain(WRITING_TEXT.answerIs);
    // 보이는 카드는 아이가 놓은 차례(정답 차례가 아님)
    const shown = [...out.matchAll(/data-reveal-tile=""[^>]*>([^<]*)</g)].map(
      (m) => m[1],
    );
    expect(shown).toEqual(["The", "is", "bedroom", "pink", "."]);
    expect(out.indexOf("data-teach-why")).toBeLessThan(
      out.indexOf("data-answer-row"),
    );
  });

  it("AC-3d 차례는 맞고 대문자만 틀리면 '첫 글자를 대문자 단추로 바꿔요.', 마침표 자리만 틀리면 '마침표는 맨 끝에 놓아요.'(앱 문구)", () => {
    const capital = html({ tries: [CAPITAL] }, teachOf("solo"));
    expect(capital).toContain(WRITING_WHY_KO.capital);
    expect(capital).toContain("첫 글자를 대문자 단추로 바꿔요.");
    expect(capital).not.toContain(item.whyKo);
    const period = html({ tries: [PERIOD] }, teachOf("solo"));
    expect(period).toContain("마침표는 맨 끝에 놓아요.");
  });

  it("AC-3d 같은 문제 다시는 정답 대신 칸의 칩(색 칸 — 무엇 · is · 어때요 · 마침표)을 켜고 대문자 단추를 반짝인다", () => {
    const out = html({ tries: [ORDER], retrying: true }, teachOf("solo"));
    const roles = [...out.matchAll(/data-slot-role="([a-z]+)"/g)].map(
      (m) => m[1],
    );
    expect(roles).toEqual(["thing", "thing", "is", "how", "end"]);
    for (const role of ["thing", "is", "how", "end"] as const)
      expect(out).toContain(CHIP_NAME[role]);
    expect(out).toContain("data-capital-flash");
    // 움직임 줄이기 설정이면 반짝임 없이 멈춘 고리(motion-safe 에만 animate)
    expect(out).toContain("motion-safe:animate-pulse");
    expect(out).toContain("ring-4");
    expect(out).not.toContain("data-reveal-tile");
    expect(out).not.toContain(WRITING_TEXT.answerIs);
    // 처음 놓을 때는 색 칸 · 반짝임이 없다
    const first = html(undefined, teachOf("solo"));
    expect(first).not.toContain("data-slot-role");
    expect(first).not.toContain("data-capital-flash");
  });

  it("AC-3d 둘째도 틀리면 그때 정답을 보이고('정답은 이거예요') 그대로 놓게 한다(한 번 더 하기 — 맞힐 때까지)", () => {
    const out = html({ tries: [ORDER, CAPITAL] }, teachOf("solo"));
    expect(out).toContain(WRITING_TEXT.answerIs);
    const shown = [...out.matchAll(/data-reveal-tile=""[^>]*>([^<]*)</g)].map(
      (m) => m[1],
    );
    expect(shown).toEqual(["The", "bedroom", "is", "pink", "."]);
    expect(out).toContain(TEACH_TEXT.retry.do);
    expect(out).not.toContain("data-teach-why");
    // 정답을 본 뒤 다시 놓을 때도 색 칸은 남는다
    expect(
      html({ tries: [ORDER, CAPITAL], retrying: true }, teachOf("solo")),
    ).toContain("data-slot-role");
    const ok = html({ tries: [ORDER, RIGHT] }, teachOf("solo"));
    expect(ok).toContain(WRITING_TEXT.right);
  });

  it("AC-22c 짝은 처음 맞으면 '혼자 해냈어요!', 틀리면 바른 답과 짝의 '왜'만 보이고 다시 하지 않는다", () => {
    const right = tiles(["My", "bedroom", "is", "blue", "."]);
    const wrong = tiles(["My", "is", "bedroom", "blue", "."]);
    expect(html({ tries: [right] }, teachOf("spare"), spare)).toContain(
      TEACH_TEXT.spareRight,
    );
    const miss = html({ tries: [wrong] }, teachOf("spare"), spare);
    expect(miss).toContain(spare.whyKo ?? "");
    expect(miss).toContain(WRITING_TEXT.answerIs);
    expect(miss).not.toContain(TEACH_TEXT.retry.do);
    expect(miss).not.toContain('data-teach-action="retry"');
    expect(miss).toContain(WRITING_TEXT.next);
    // 짝은 색 칸이 없다
    expect(html(undefined, teachOf("spare"), spare)).not.toContain(
      "data-slot-role",
    );
  });

  it("AC-3d 짝도 틀린 '왜' 화면의 '다음'은 선생님이 줄을 읽기 전에는 흐리고(설계 5), 짝을 맞힌 화면의 '다음'은 바로 밝다", () => {
    const wrong = tiles(["My", "is", "bedroom", "blue", "."]);
    const miss = html({ tries: [wrong] }, teachOf("spare"), spare);
    expect(miss).toMatch(/<button[^>]*data-teach-next=""[^>]*disabled=""/);
    expect(miss).toContain("data-teach-why");
    const right = tiles(["My", "bedroom", "is", "blue", "."]);
    const ok = html({ tries: [right] }, teachOf("spare"), spare);
    const next = ok.match(/<button[^>]*>다음<\/button>/)?.[0] ?? "";
    expect(next).not.toBe("");
    expect(next).not.toContain('disabled=""');
  });

  it("AC-3d teach 없는 수업은 지금 규칙 그대로(틀리면 '정답은 이거예요' · '한 번 더 풀기')", () => {
    const out = html({ tries: [ORDER] }, undefined);
    expect(out).toContain(WRITING_TEXT.answerIs);
    expect(out).toContain(WRITING_TEXT.tryAgain);
    expect(out).not.toContain("data-teach-why");
  });

  it("AC-3d 단계 함수: 놓기 → 왜 → 다시 놓기 → 맞음 · 정답 보기, 짝은 첫 시도 하나로 끝", () => {
    expect(writingTeachStageOf("solo", item, [], false)).toBe("answer");
    expect(writingTeachStageOf("solo", item, [ORDER], false)).toBe("why");
    expect(writingTeachStageOf("solo", item, [ORDER], true)).toBe("answer");
    expect(writingTeachStageOf("solo", item, [ORDER, CAPITAL], false)).toBe(
      "wrong",
    );
    expect(writingTeachStageOf("solo", item, [ORDER, RIGHT], false)).toBe(
      "right",
    );
    expect(writingTeachStageOf("spare", item, [RIGHT], false)).toBe(
      "spare-right",
    );
    expect(writingTeachStageOf("spare", item, [ORDER], false)).toBe(
      "spare-wrong",
    );
  });
});

describe("같이 해 보기 쓰기 카드(AC-4d · 표본 W6 · W7)", () => {
  const together = lesson.teach?.together ?? [];
  const [blanks, capital] = together;
  if (!blanks?.filled || !capital?.filled) throw new Error("같이 해 보기 꼴");

  it("AC-4d 앱이 놓아 둔 카드 사이 빈칸 수가 남은 카드 수와 같고, 첫 글자는 이미 대문자다", () => {
    const out = renderToStaticMarkup(
      createElement(TogetherCards, {
        cards: blanks.filled?.cards ?? [],
        choices: blanks.choices ?? [],
        capital: blanks.filled?.capital ?? false,
        capitalOnly: blanks.slot === "capital",
        disabled: false,
        onTry: () => {},
      }),
    );
    const empty = out.match(/data-slot="empty"/g) ?? [];
    expect(empty).toHaveLength(blanks.choices?.length ?? -1);
    for (const choice of blanks.choices ?? [])
      expect(out).toContain(`data-tile="${choice}"`);
    expect(out).toMatch(/data-slot="filled"[^>]*>The</);
    expect(out).toContain(TILE_TEXT.done);
    expect(out).not.toContain("data-capital-flash");
  });

  it("AC-4d 대문자 자리 문항은 카드가 다 놓여 있고(소문자 첫 글자) 대문자 단추가 반짝이며 '다 놓았어요'가 없다", () => {
    const out = renderToStaticMarkup(
      createElement(TogetherCards, {
        cards: capital.filled?.cards ?? [],
        choices: capital.choices ?? [],
        capital: capital.filled?.capital ?? true,
        capitalOnly: capital.slot === "capital",
        disabled: false,
        onTry: () => {},
      }),
    );
    expect(out).not.toContain('data-slot="empty"');
    expect(out).toMatch(/data-slot="filled"[^>]*>the</);
    expect(out).toContain("data-capital-flash");
    expect(out).not.toContain(TILE_TEXT.done);
  });
});
