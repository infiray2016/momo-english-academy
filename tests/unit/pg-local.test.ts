// 내장 Postgres 읽기(검토 review-p10-5-6-code I-1). embedded-postgres 는 읽힐 때 async-exit-hook 로 beforeExit 에
// '코드 0 으로 끝내기'를 걸어 vitest 의 실패 종료 코드를 덮는다. 읽은 뒤 새로 걸린 처리기를 떼고 'exit'(자식 정리)만 남긴다.
import { afterEach, describe, expect, it } from "vitest";
import {
  EXIT_HOOK_EVENTS,
  importEmbeddedPostgres,
} from "../../scripts/pg-local";

type Listener = (...args: unknown[]) => void;
const emitter = process as unknown as NodeJS.EventEmitter;
const added: [string, Listener][] = [];

afterEach(() => {
  for (const [event, listener] of added.splice(0)) emitter.off(event, listener);
});

describe("내장 Postgres 읽기", () => {
  it("내장 Postgres 읽기: 읽을 때 새로 걸린 beforeExit · message · 신호 처리기는 떼고 exit 처리기와 앞서 있던 처리기는 남긴다", async () => {
    const mine: Listener = () => {};
    emitter.on("beforeExit", mine);
    added.push(["beforeExit", mine]);
    const hooked: [string, Listener][] = [
      ...EXIT_HOOK_EVENTS.map(
        (event) => [event, () => {}] as [string, Listener],
      ),
      ["exit", () => {}],
    ];
    const loaded = await importEmbeddedPostgres(async () => {
      for (const [event, listener] of hooked) {
        emitter.on(event, listener);
        added.push([event, listener]);
      }
      return { default: class Fake {} } as never;
    });
    expect(loaded).toBeDefined();
    for (const [event, listener] of hooked) {
      expect(emitter.listeners(event).includes(listener)).toBe(
        event === "exit",
      );
    }
    expect(emitter.listeners("beforeExit")).toContain(mine);
  });

  it("내장 Postgres 읽기: 실제 embedded-postgres 를 읽은 뒤에도 beforeExit 처리기가 늘지 않는다", async () => {
    const before = emitter.listeners("beforeExit").length;
    const Postgres = await importEmbeddedPostgres();
    expect(typeof Postgres).toBe("function");
    expect(emitter.listeners("beforeExit").length).toBe(before);
  });
});
