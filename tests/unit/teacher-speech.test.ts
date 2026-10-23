// 선생님 음성 감싸기(plan 회화-선생님-캐릭터 값 12, AC-19g 감싸기 몫): speak 마다 선생님 높이 · 목소리 순서를 넣고,
// 실제 시작 알림에 말하기 켬, 시작했던 발화의 결과(끝 · 취소 · 오류)에 끔. 시작 알림 없는 발화는 말하기가 아니다.
// 빠르기는 부르는 쪽 값 그대로(C125), 나머지 접점은 그대로 넘긴다. 음성 층은 navigator.audioSession 을 쓰지 않는다(C109).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { teacherSpeech } from "@/lib/speech/teacher";
import type {
  SpeakOptions,
  SpeakOutcome,
  SpeechPort,
} from "@/lib/speech/types";

type Call = {
  text: string;
  options: SpeakOptions | undefined;
  start(): void;
  finish(outcome: SpeakOutcome): void;
};

/** 발화마다 시작 · 결과를 시험이 손으로 내는 가짜 접점. */
function manualPort() {
  const calls: Call[] = [];
  const port: SpeechPort = {
    device: vi.fn(() => ({ kind: "ok" }) as never),
    unlockFromGesture: vi.fn(),
    speak: vi.fn((text: string, options?: SpeakOptions) => {
      let resolve!: (o: SpeakOutcome) => void;
      const outcome = new Promise<SpeakOutcome>((r) => {
        resolve = r;
      });
      calls.push({
        text,
        options,
        start: () => options?.onStart?.(),
        finish: (o) => resolve(o),
      });
      return outcome;
    }),
    cancelSpeaking: vi.fn(),
    listen: vi.fn(() => ({}) as never),
    checkMicrophone: vi.fn(async () => ({ ok: true }) as const),
    dispose: vi.fn(),
  };
  return { port, calls };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function wrap() {
  const { port, calls } = manualPort();
  const changes: boolean[] = [];
  const speech = teacherSpeech(port, {
    pitch: 1.08,
    voicePrefer: ["samantha"],
    onSpeaking: (on) => changes.push(on),
  });
  return { port, calls, changes, speech };
}

describe("선생님 음성 감싸기", () => {
  it("선생님 음성: speak 마다 선생님 높이 · 목소리 순서를 넣고 빠르기는 부르는 쪽 값 그대로다", () => {
    const { calls, speech } = wrap();
    void speech.speak("Hello.", { rate: 0.8 });
    void speech.speak("Again.");
    expect(
      calls.map((c) => [c.text, c.options?.pitch, c.options?.rate]),
    ).toEqual([
      ["Hello.", 1.08, 0.8],
      ["Again.", 1.08, undefined],
    ]);
    expect(calls[0]?.options?.voicePrefer).toEqual(["samantha"]);
  });

  it("선생님 음성: 시작 알림 없는 발화는 말하기가 아니고 결과에도 끄는 알림이 없다", async () => {
    const { calls, changes, speech } = wrap();
    const outcome = speech.speak("Silent.");
    calls[0]?.finish({ kind: "cancelled" });
    expect(await outcome).toEqual({ kind: "cancelled" });
    expect(changes).toEqual([]);
  });

  it("선생님 음성: 미지원(unsupported) 결과도 시작이 없었으면 알림이 없다", async () => {
    const { calls, changes, speech } = wrap();
    const outcome = speech.speak("Nope.");
    calls[0]?.finish({ kind: "unsupported" });
    await outcome;
    expect(changes).toEqual([]);
  });

  for (const outcome of [
    { kind: "ended" },
    { kind: "cancelled" },
    { kind: "error", code: "synthesis-failed" },
  ] as const) {
    it(`선생님 음성: 시작 알림에 켜고 ${outcome.kind} 뒤 끈다`, async () => {
      const { calls, changes, speech } = wrap();
      const result = speech.speak("Hello.");
      expect(changes).toEqual([]);
      calls[0]?.start();
      expect(changes).toEqual([true]);
      calls[0]?.finish(outcome);
      expect(await result).toEqual(outcome);
      expect(changes).toEqual([true, false]);
    });
  }

  it("선생님 음성: 부르는 쪽의 시작 알림도 함께 부른다", () => {
    const { calls, speech } = wrap();
    const onStart = vi.fn();
    void speech.speak("Hello.", { onStart });
    calls[0]?.start();
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("선생님 음성: 겹친 발화는 마지막 시작 발화가 끝날 때만 끈다", async () => {
    const { calls, changes, speech } = wrap();
    const first = speech.speak("One.");
    calls[0]?.start();
    const second = speech.speak("Two.");
    calls[1]?.start();
    expect(changes).toEqual([true]);
    calls[0]?.finish({ kind: "cancelled" });
    await first;
    expect(changes).toEqual([true]);
    calls[1]?.finish({ kind: "ended" });
    await second;
    expect(changes).toEqual([true, false]);
  });

  it("선생님 음성: 앞 발화가 끝난 뒤 다음 발화가 시작하면 다시 켠다", async () => {
    const { calls, changes, speech } = wrap();
    const first = speech.speak("One.");
    calls[0]?.start();
    calls[0]?.finish({ kind: "ended" });
    await first;
    const second = speech.speak("Two.");
    calls[1]?.start();
    calls[1]?.finish({ kind: "ended" });
    await second;
    expect(changes).toEqual([true, false, true, false]);
  });

  it("선생님 음성: 결과가 난 뒤 늦게 온 시작 알림은 말하기를 켜지 않는다", async () => {
    const { calls, changes, speech } = wrap();
    const outcome = speech.speak("Late.");
    calls[0]?.finish({ kind: "cancelled" });
    await outcome;
    calls[0]?.start();
    await settle();
    expect(changes).toEqual([]);
  });

  it("선생님 음성: 한 발화의 시작 알림이 두 번 와도 한 번만 센다", async () => {
    const { calls, changes, speech } = wrap();
    const outcome = speech.speak("Twice.");
    calls[0]?.start();
    calls[0]?.start();
    calls[0]?.finish({ kind: "ended" });
    await outcome;
    expect(changes).toEqual([true, false]);
  });

  it("선생님 음성: 듣기 · 장치 · 잠금 풀기 · 끊기 · 마이크 · 닫기는 그대로 넘긴다", async () => {
    const { port, changes, speech } = wrap();
    speech.device();
    speech.unlockFromGesture();
    speech.cancelSpeaking();
    speech.listen({ kind: "button" } as never);
    await speech.checkMicrophone();
    speech.dispose();
    expect(port.device).toHaveBeenCalledTimes(1);
    expect(port.unlockFromGesture).toHaveBeenCalledTimes(1);
    expect(port.cancelSpeaking).toHaveBeenCalledTimes(1);
    expect(port.listen).toHaveBeenCalledTimes(1);
    expect(port.checkMicrophone).toHaveBeenCalledTimes(1);
    expect(port.dispose).toHaveBeenCalledTimes(1);
    expect(changes).toEqual([]);
  });
});

describe("음성 층 훑기", () => {
  it("음성 층: src/lib/speech 는 navigator.audioSession 을 쓰지(바꾸지) 않는다(C109)", () => {
    const dir = join(process.cwd(), "src/lib/speech");
    const files = readdirSync(dir).filter((f) => /\.tsx?$/.test(f));
    expect(files).toContain("teacher.ts");
    expect(files).toContain("browser.ts");
    for (const file of files) {
      const text = readFileSync(join(dir, file), "utf8");
      expect(text, file).not.toMatch(/audioSession\s*(\.\s*type\s*)?=(?!=)/);
    }
    // 읽어 주기 길(접점 · 감싸기)은 읽지도 않는다. types.ts 는 관찰 쪽 기록 꼴 설명에만 이름이 있다.
    for (const file of ["browser.ts", "teacher.ts"]) {
      const text = readFileSync(join(dir, file), "utf8");
      expect(text, file).not.toMatch(/audioSession/);
    }
  });
});
