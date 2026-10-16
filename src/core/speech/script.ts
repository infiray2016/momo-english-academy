// 음성 대본 규격(plan-p02 '파일별 값' 4). 가짜 Web Speech(P2b) · 관찰 페이지 내보내기 · 단위 시험의
// 다시 돌려 보기가 같은 꼴을 쓴다. at 은 start() · stop() · abort() 를 부른 뒤의 ms 다.
import { z } from "zod";
import type { EndRule, ListenOutcome, SpeechSettings } from "./listen";

const ms = z.number().nonnegative();

const SIMPLE_EVENT_TYPES = [
  "start",
  "audiostart",
  "soundstart",
  "speechstart",
  "speechend",
  "soundend",
  "audioend",
  "nomatch",
  "end",
] as const;

export const scriptEventSchema = z.union([
  z.strictObject({ at: ms, type: z.enum(SIMPLE_EVENT_TYPES) }),
  z.strictObject({
    at: ms,
    type: z.literal("result"),
    /** 그 객체의 결과 목록 전체(첫 후보만). */
    results: z.array(
      z.strictObject({ transcript: z.string(), isFinal: z.boolean() }),
    ),
  }),
  z.strictObject({
    at: ms,
    type: z.literal("error"),
    error: z.string().min(1),
    message: z.string().optional(),
  }),
]);

export const recognitionRunSchema = z.strictObject({
  events: z.array(scriptEventSchema),
  /** 없으면 [end] 로 본다(Chrome 꼴로 봄, 추측). */
  onStop: z.array(scriptEventSchema).optional(),
  /** 없으면 [error aborted, end] 로 본다(Chrome 꼴로 봄, 추측). */
  onAbort: z.array(scriptEventSchema).optional(),
  /** 아무 일도 내지 않는다(stop · abort 에도). */
  hang: z.boolean().optional(),
  /** start() 가 InvalidStateError 를 던진다. */
  startThrows: z.boolean().optional(),
});

export const utteranceRunSchema = z.strictObject({
  startAfter: ms.optional(),
  endAfter: ms.optional(),
  neverStart: z.boolean().optional(),
  neverEnd: z.boolean().optional(),
  error: z.string().optional(),
});

const positiveMs = z.number().positive();

export const endRuleSchema = z.strictObject({
  endSilenceMs: positiveMs.optional(),
  capMs: positiveMs.optional(),
  chunkMs: positiveMs,
}) satisfies z.ZodType<EndRule>;

export const speechSettingsSchema = z.strictObject({
  lang: z.string().min(1),
  maxListenMs: positiveMs,
  endSilenceMs: z.strictObject({
    "1-3": positiveMs,
    "4-6": positiveMs,
    "7-9": positiveMs,
    "10-12": positiveMs,
  }),
  watchdogExtraMs: ms,
}) satisfies z.ZodType<SpeechSettings>;

const count = z.number().int().nonnegative();

export const listenOutcomeSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("result"),
    text: z.string(),
    pieces: z.array(z.string()),
    endedBy: z.enum([
      "silence",
      "button",
      "cap",
      "browser",
      "stall-after-stop",
    ]),
    restarts: count,
    watchdogRestarts: count,
  }),
  z.strictObject({ kind: z.literal("no-result") }),
  z.strictObject({
    kind: z.literal("error"),
    code: z.string(),
    group: z.enum(["retry", "mic-unavailable", "network"]),
    partialText: z.string(),
  }),
  z.strictObject({ kind: z.literal("stalled"), partialText: z.string() }),
  z.strictObject({
    kind: z.literal("interrupted"),
    reason: z.enum(["hidden", "speak", "leave"]),
    partialText: z.string(),
  }),
]) satisfies z.ZodType<ListenOutcome>;

export const speechScriptSchema = z.strictObject({
  name: z.string().min(1),
  /** '손으로 씀 — <근거>' 또는 'H2 기록 — <기기 · OS · 브라우저 판 · 날짜>'. */
  source: z.string().min(1),
  /** 없으면 webkit · true. */
  expose: z
    .strictObject({
      recognition: z.enum(["standard", "webkit", "both", "none"]),
      synthesis: z.boolean(),
    })
    .optional(),
  /** start() 마다 차례로 하나. 모자라면 마지막 것을 되풀이한다. */
  recognitions: z.array(recognitionRunSchema),
  synthesis: z
    .strictObject({
      voices: z.array(
        z.strictObject({
          name: z.string(),
          lang: z.string(),
          localService: z.boolean(),
          default: z.boolean(),
        }),
      ),
      utterances: z.array(utteranceRunSchema).optional(),
    })
    .optional(),
  /** 관찰 페이지가 내보낼 때. */
  device: z
    .strictObject({
      userAgent: z.string(),
      label: z.string(),
      verdict: z.string(),
    })
    .optional(),
  observed: z
    .array(
      z.strictObject({
        label: z.string(),
        rule: endRuleSchema,
        settings: speechSettingsSchema,
        buttonAt: ms.optional(),
        outcome: listenOutcomeSchema,
      }),
    )
    .optional(),
});

export type ScriptEvent = z.infer<typeof scriptEventSchema>;
export type RecognitionRun = z.infer<typeof recognitionRunSchema>;
export type UtteranceRun = z.infer<typeof utteranceRunSchema>;
export type SpeechScript = z.infer<typeof speechScriptSchema>;

/** expose 가 없을 때. */
export const DEFAULT_EXPOSE: NonNullable<SpeechScript["expose"]> = {
  recognition: "webkit",
  synthesis: true,
};
/** onStop 이 없을 때. */
export const DEFAULT_ON_STOP: readonly ScriptEvent[] = [{ at: 0, type: "end" }];
/** onAbort 가 없을 때. */
export const DEFAULT_ON_ABORT: readonly ScriptEvent[] = [
  { at: 0, type: "error", error: "aborted" },
  { at: 0, type: "end" },
];

/** 대본 규격을 통과하지 않으면 던진다. */
export function parseSpeechScript(value: unknown): SpeechScript {
  return speechScriptSchema.parse(value);
}
