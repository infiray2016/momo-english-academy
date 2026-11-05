// 필수 e2e 도우미의 판정(UI · UX plan 묶음 0-마 · 정한 것 7 · 위험 8 · AC-23a (4) · AC-23f · AC-23g). e2e 는 브라우저에서 돌지만 '/' 요청
// 가름과 200ms 표본 분석은 순수 함수라 여기서 잠근다(필수 경로 시험이 잘못 세어 통과하지 않게).
import { describe, expect, it } from "vitest";
import { isHomeVisit } from "../e2e/route-watch";
import {
  firstIndexOf,
  heldUntil,
  longestBlankMs,
  MAX_BLANK_MS,
  SAMPLE_MS,
  type Sample,
} from "../e2e/screen-sampler";

const BASE = "http://localhost:3100";
const visit = (
  path: string,
  {
    navigation = false,
    resourceType = "fetch",
    headers = {},
  }: {
    navigation?: boolean;
    resourceType?: string;
    headers?: Record<string, string>;
  } = {},
) => ({ url: `${BASE}${path}`, navigation, resourceType, headers });

describe("'/' 요청 셈(정한 것 7)", () => {
  it("'/' 문서 이동은 센다", () => {
    expect(
      isHomeVisit(visit("/", { navigation: true, resourceType: "document" })),
    ).toBe(true);
  });

  it("'/' 의 미리 읽기가 아닌 RSC 요청(router.push('/') · Link 누름)은 센다", () => {
    expect(isHomeVisit(visit("/?_rsc=abc", { headers: { rsc: "1" } }))).toBe(
      true,
    );
  });

  it("'/' 의 미리 읽기(next-router-prefetch · segment-prefetch)와 서버 액션은 세지 않는다", () => {
    expect(
      isHomeVisit(
        visit("/?_rsc=abc", {
          headers: { rsc: "1", "next-router-prefetch": "1" },
        }),
      ),
    ).toBe(false);
    expect(
      isHomeVisit(
        visit("/?_rsc=abc", {
          headers: { rsc: "1", "next-router-segment-prefetch": "/_tree" },
        }),
      ),
    ).toBe(false);
    expect(
      isHomeVisit(visit("/", { headers: { "next-action": "abc", rsc: "1" } })),
    ).toBe(false);
  });

  it("다른 경로(세션 · 목록 · 정적 파일)와 '/' 의 머리 없는 fetch 는 세지 않는다", () => {
    for (const path of ["/session/x", "/talk/lessons", "/_next/static/a.js"])
      expect(
        isHomeVisit(
          visit(path, { navigation: true, resourceType: "document" }),
        ),
      ).toBe(false);
    expect(isHomeVisit(visit("/"))).toBe(false);
  });
});

/** 표본 줄(SAMPLE_MS 간격). */
const samples = (
  rows: { shown?: boolean; values?: Record<string, string | null> }[],
): Sample[] =>
  rows.map((r, i) => ({
    at: i * SAMPLE_MS,
    shown: r.shown ?? true,
    values: r.values ?? {},
  }));

describe("200ms 표본 분석(AC-23a (4) · AC-23f)", () => {
  it("표본 간격 · 빈 구간 상한은 정본 9절 값(200ms · 5초)이다", () => {
    expect(SAMPLE_MS).toBe(200);
    expect(MAX_BLANK_MS).toBe(5000);
  });

  it("빈 구간은 표본 수가 아니라 시각 차다: 빈 표본이 시작한 때부터 다음 표시 표본까지(끝까지 비면 마지막 표본까지), 표본이 없으면 0", () => {
    expect(longestBlankMs([])).toBe(0);
    expect(
      longestBlankMs(
        samples([
          { shown: true },
          { shown: false },
          { shown: false },
          { shown: true },
          { shown: false },
        ]),
      ),
    ).toBe(2 * SAMPLE_MS);
    // 표본기가 밀려(무거운 CI) 표본 사이가 벌어지면 그 시각 차로 잰다 — 빈 표본 둘이어도 1.5초
    const late: Sample[] = [
      { at: 0, shown: true, values: {} },
      { at: 100, shown: false, values: {} },
      { at: 1500, shown: false, values: {} },
      { at: 1600, shown: true, values: {} },
    ];
    expect(longestBlankMs(late)).toBe(1500);
  });

  it("남음: 보낸 때(처음 그 글)부터 다음 반응 표본 앞까지 표본마다 같은 글이면 ok, 중간에 빠지거나 다른 글이면 그 자리", () => {
    const said = (v: string | null, tori: string | null = null) => ({
      values: { said: v, tori },
    });
    const isReply = (s: Sample) => (s.values.tori ?? "").includes("Great!");
    const held = samples([
      said(null),
      said("I'm good."),
      said("I'm good."),
      said("I'm good.", "Great! Let's talk."),
    ]);
    expect(heldUntil(held, "said", "I'm good.", isReply)).toEqual({
      ok: true,
      fromIndex: 1,
      untilIndex: 3,
    });
    const broken = samples([
      said("I'm good."),
      said(null),
      said("I'm good.", "Great!"),
    ]);
    expect(heldUntil(broken, "said", "I'm good.", isReply)).toMatchObject({
      ok: false,
      brokeAt: 1,
    });
    // 다음 반응이 오지 않았으면 실패(끝까지 못 잼)
    expect(
      heldUntil(samples([said("I'm good.")]), "said", "I'm good.", isReply),
    ).toMatchObject({ ok: false });
    // 그 글이 한 번도 보이지 않으면 실패
    expect(
      heldUntil(samples([said(null)]), "said", "I'm good.", isReply),
    ).toMatchObject({ ok: false });
  });

  it("남음(보낸 시각부터): fromAt 을 주면 그 시각 뒤 첫 표본부터 같은 글이어야 하고, 그 표본에 글이 아직 없으면 실패다", () => {
    const said = (v: string | null, tori: string | null = null) => ({
      values: { said: v, tori },
    });
    const isReply = (s: Sample) => (s.values.tori ?? "").includes("Great!");
    const rows = samples([
      said(null),
      said(null),
      said("I'm good."),
      said("I'm good.", "Great!"),
    ]);
    // 보낸 시각이 둘째 표본 뒤면(셋째부터) 남음
    expect(
      heldUntil(rows, "said", "I'm good.", isReply, {
        fromAt: SAMPLE_MS + 1,
      }),
    ).toEqual({ ok: true, fromIndex: 2, untilIndex: 3 });
    // 보낸 시각 뒤 첫 표본이 이미 반응이면(말풍선 표본이 하나도 없음) 실패 — 빈 채 통과하지 않는다(0-마 재검토 Important)
    expect(
      heldUntil(rows, "said", "I'm good.", isReply, {
        fromAt: 2 * SAMPLE_MS + 1,
      }),
    ).toMatchObject({ ok: false, fromIndex: 3, untilIndex: 3 });
    // 보낸 시각이 첫 표본 뒤인데 둘째 표본에 말풍선이 없으면(늦게 뜸) 실패
    expect(
      heldUntil(rows, "said", "I'm good.", isReply, { fromAt: 1 }),
    ).toMatchObject({ ok: false, fromIndex: 1, brokeAt: 1 });
  });

  it("처음 자리: 조건을 처음 채운 표본 번호(그 번호부터 찾을 수 있음), 없으면 -1", () => {
    const rows = samples([
      { values: { w: null } },
      { values: { w: "" } },
      { values: { w: null } },
      { values: { w: "" } },
    ]);
    expect(firstIndexOf(rows, (s) => s.values.w !== null)).toBe(1);
    expect(firstIndexOf(rows, (s) => s.values.w !== null, 2)).toBe(3);
    expect(firstIndexOf(rows, () => false)).toBe(-1);
  });
});
