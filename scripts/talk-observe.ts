// 회화 수업 실호출 표본 평가 명령(회화 plan 묶음 13 · AC-15o · 9절 실시간 호출 표본 평가의 회화 몫, 컨트롤러 T-131 로 앞당김).
// 사용: pnpm talk:observe [--yes] [--script <이름>] [--level <단계>] [--effort low|medium] [--rounds <n>] [--set <키>=<값> …]
//        [--baseline <json>] [--out <폴더>] [--anchored]
// --yes 가 없으면 대본 · 아이 차례 수 · 예상 호출 · 예상 비용만 출력하고 부르지 않는다(종료 0). 설정 파일은 바꾸지 않는다.
// 설정값은 설정 파일 → 대본 칸 settings(그 대본만) → --effort → --set(명령 전체) 차례로 메모리에서만 덮는다('AI 몫 넓힘' plan 묶음 4-가).
// --rounds 는 대본마다 같은 대화를 n 바퀴 돌리고, --baseline 은 기준선 보고 경로를 보고에 적기만 한다(지표 셈 · 견줌은 묶음 4-나 talk-metrics).
// 턴 흐름은 앱의 순수 함수(src/core/conversation/* · src/core/ai/calls/talk-lesson.ts)를 그대로 쓰고, 세션 · 행 · 기록은 DB 없이 메모리
// 상태로 흉내 낸다. 서버의 턴 끝 처리(src/server/conversation/lesson-turn.ts settleLessonTurn · 문장 문 · 카드 자리)는 server-only 라
// 가져올 수 없어 이 파일에 줄여 옮겼다(이번 패치 판 — 2026-11-05 밤 작업 트리, f4ec058 위 C202 고침). 흉내 낸 것과 못 낸 것은 보고 task-talk-13-report.md 다.
// 'AI 몫 넓힘' 묶음 5: 1~3단계 실시간 검사(신호 말 · 지어낸 경험 · 상황 차례 — core cue-line · made-up · situation)와 끝 처리(반응 자리 상황 줄 ·
// 신호 말 · 둘째 인사 대신 줄 · 실패 대신 줄 · 들리지 않음 판단 칸 비움) · 힌트 단(장면 여는 질문 · 인사 질문 · 카드 항목 · AI 힌트)을 서버와 같은
// core 함수로 잇는다. 사본이 서버와 같은 답을 내는지는 tests/unit/talk-observe-parity.test.ts 가 본다(plan 위험 4 — 짝이 다르면 대본을 돌리지 않는다).
// 아이 말은 대본의 글(인식 결과 흉내)이다. 보고는 턴마다 선생님 말 · 뜻 · 소리 줄 · 갈래 · 카드 자리 까닭 · 되돌림 · 같은 질문 ·
// 사람 판정 칸 · 토큰 · 첫 문장 시간 · 비용과, 끝에 대본의 설계 예시 · 기대 옆에 실제를 둔 '나란히' 표다.
// 재생 대본(대본 칸 replay — 13절 C217 (4) · AC-15zl): 실제 수업의 아이 입력(들은 글 · 단추 · 누른 힌트 수)을 그대로 넣는 고정 입력 재생이다.
// 차례 칸 meant(기대 낱말 · 잘못 들린 낱말) · lessonBefore(실제 수업의 앞 선생님 말)는 보고에 그대로 실려 지표 넷(talk-replay-metrics)이 읽는다.
// 자리 재현(--anchored — 13절 C217 (4)): 재생 대본의 차례 칸 anchor(실제 수업의 아이 행 칸 · 그 뒤 선생님 행)로, 아이 차례마다 그 차례 바로 앞까지의
// 실제 기록을 메모리 상태로 깔고 그 입력 하나에 대한 선생님 다음 차례만 새로 받는다(말 차례만 부른다). 새 응답은 다음 차례로 잇지 않는다 —
// 고정 입력 재생의 어긋남이 없다. 보고 파일 이름 끝에 -anchored 를 붙인다.
// 순수 함수를 내보내고 네트워크 · 파일 쓰기는 직접 실행될 때만 한다. src/server 를 가져오지 않는다. 키 값은 출력하지 않는다.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type Anthropic from "@anthropic-ai/sdk";
import { APIError } from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  answerTextOf,
  type CallSpec,
  type LevelContext,
  prepareAnswer,
} from "../src/core/ai/calls/common";
import {
  applyTalkChatChecks,
  CHAT_QUESTION_MAX,
  CHAT_SENTENCE_MAX,
  type ChatSayChange,
  TALK_CHAT_OUTPUT_FIELDS,
  type TalkChatInput,
  type TalkChatOutput,
  talkChatAssistantOf,
  talkChatCheckFields,
  talkChatMessages,
  talkChatTopicOf,
  talkChatTurnSpec,
} from "../src/core/ai/calls/talk-chat";
import {
  type ChatEvalEntry,
  TALK_CHAT_EVAL_SYSTEM,
  type TalkChatEvalInput,
  type TalkChatEvalOutput,
  talkChatEvalInputOf,
  talkChatEvalSpec,
} from "../src/core/ai/calls/talk-chat-eval";
import {
  type ChatHintChildInput,
  type ChatHintContextEntry,
  type ChatHintTierKind,
  type TalkChatHintInput,
  talkChatHintSpec,
  talkChatHintSystem,
} from "../src/core/ai/calls/talk-chat-hint";
import {
  applyTalkLeadChecks,
  TALK_LEAD_OUTPUT_FIELDS,
  type TalkLeadCefr,
  type TalkLeadInput,
  type TalkLeadOutput,
  type TalkLeadRules,
  talkLeadAssistantOf,
  talkLeadCheckFields,
  talkLeadTextOf,
  talkLeadTurnSpec,
  talkLeadUserMessage,
} from "../src/core/ai/calls/talk-lead";
import {
  applyTalkLessonChecks,
  EMPTY_TORI_EN_STUCK,
  emptyToriEnStuckOf,
  isLowBandLevel,
  type TalkCallTurn,
  type TalkLessonContext,
  type TalkLessonInput,
  type TalkLessonOutput,
  type TalkLessonRules,
  type TalkTeacher,
  talkCallTurnOf,
  talkCardChainKeysOf,
  talkEasyAiSlotOf,
  talkLessonCheckFields,
  talkLessonContextDelta,
  talkLessonInvalidReasonOf,
  talkLessonRewriteOf,
  talkLessonTurnSpec,
  talkLessonUserMessage,
  talkLineOptionsOf,
  talkSceneWordsOf,
  talkTurnWiringOf,
  teacherSentencesMaxOf,
} from "../src/core/ai/calls/talk-lesson";
import { requestConfigOf, settingKeysOf } from "../src/core/ai/combo";
import {
  billedAttemptsOf,
  type ContentBlockLike,
  costOf,
  formatUsd6,
  type MessageLike,
} from "../src/core/ai/cost";
import { inlineJsonSchemaRefs } from "../src/core/ai/inline-refs";
import { createMasker } from "../src/core/ai/mask";
import { checkOutputFields } from "../src/core/ai/output-check";
import { buildAiRequest } from "../src/core/ai/request";
import {
  cardItemOf,
  isSupportMove,
  oldestMoreOf,
  opensSlot,
  slotChanceOf,
  startPrepWordsOf,
  type TalkCarry,
  talkChancesOf,
} from "../src/core/conversation/chances";
import {
  type ChatAiQuestion,
  type ChatHintRecord,
  type ChatHintReply,
  chatAiQuestionOf,
  chatChildHintOf,
  chatExplainReplyOf,
  chatHintRecordOf,
  chatHintRecordOfRow,
  chatHintReplyOf,
} from "../src/core/conversation/chat-hints";
import {
  type ChatEvalFailure,
  type ChatEvalState,
  type ChatJudge,
  type ChatJudgeContext,
  type ChatJudgeInputKind,
  type ChatJudgeRow,
  chatJudgeChangesOf,
  chatJudgesOf,
  readChatJudge,
} from "../src/core/conversation/chat-judge";
import {
  type ChatInput,
  type ChatRecognizer,
  chatClockOf,
  chatInputLineOf,
  chatRecognizerSchemaOf,
} from "../src/core/conversation/chat-message";
import {
  CHAT_QUIET_OFF,
  type ChatQuietState,
  chatQuietDueAt,
  reduceChatQuiet,
} from "../src/core/conversation/chat-quiet";
import type { ChatReplyCheck } from "../src/core/conversation/chat-reply";
import { chatWrapSourcesOf } from "../src/core/conversation/chat-reply";
import {
  type ChatSegmentCore,
  chatStepOf,
  lessonAdvanceChatOf,
} from "../src/core/conversation/chat-segments";
import {
  type ChatEndSignal,
  type ChatTurnEnd,
  chatEvalAfterTeacherOf,
  chatEvalDueOf,
  chatEvalOnCloseOf,
  chatFlowRowsOf,
} from "../src/core/conversation/chat-turn-core";
import {
  type ChatOpen,
  type ChatReplayLine,
  type ChatTurnPlan,
  chatChildFieldsOf,
  chatFirstQuestionBlocksOf,
  chatHistoryOf,
  chatOpenAcceptsOf,
  chatOpenInputOf,
  chatPrevStageOf,
  chatTurnInputOf,
  chatTurnPlanOf,
  chatTurnSegmentOf,
  createChatSentenceFlow,
} from "../src/core/conversation/chat-turn-plan";
import {
  type ChatCallResult,
  chatTurnResultOf,
} from "../src/core/conversation/chat-turn-result";
import {
  type ChatUnitWords,
  chatJudgeContextFrom,
  chatUnitWordsOf,
} from "../src/core/conversation/chat-unit-words";
import {
  createRewriteHold,
  isDontKnowSaying,
} from "../src/core/conversation/child-kind";
import { clientListenRowOf } from "../src/core/conversation/client-listen";
import {
  type CueBand,
  cueBandOf,
  cueLineForTurn,
  isSoundCue as isSoundCueOf,
  seedCuePhrasesOf,
} from "../src/core/conversation/cue-line";
import type { SoundAlikeEntry } from "../src/core/conversation/heard-hint";
import {
  type AiHints,
  type HintTier,
  heardHelpOf,
  heardHelpsOfMove,
  hintKindOf,
  type LessonHintItem,
  lessonHintTiersOf,
  openedTierCount,
} from "../src/core/conversation/hints";
import type { LeadCandidateRow } from "../src/core/conversation/lead-candidate";
import {
  type LeadFormRule,
  type LeadLevelInput,
  type LeadNarrowHit,
  leadNarrowHitsOf,
  leadNarrowItemOf,
  leadNarrowOutcomeOf,
  leadNarrowRetryPrompt,
  leadWideCheckOf,
} from "../src/core/conversation/lead-level";
import { leadKoLineOf } from "../src/core/conversation/lead-low-band";
import {
  chatStartAllowed,
  isChatSession,
  isLeadSession,
  leadModeStartField,
  TALK_LEAD_MODE_KEY,
  type TalkLeadMode,
  talkLeadModeOf,
} from "../src/core/conversation/lead-mode";
import {
  LEAD_STUCK_READINGS,
  type LeadExtra,
  leadPrevStuckOf,
  leadTeacherMoveOf,
} from "../src/core/conversation/lead-record";
import {
  createLeadSentenceFlow,
  type LeadAiQuestion,
  type LeadChildFields,
  type LeadHeads,
  type LeadOpen,
  type LeadRowLike,
  type LeadSoundLine,
  leadAiQuestionOf,
  leadAskAgainFloorApplies,
  leadChildFieldsOf,
  leadChildHelpAfterOf,
  leadChildHelpOfRow,
  leadChildOf,
  leadChildStuckOf,
  leadClosingAddsOf,
  leadClosingTurnOf,
  leadConversationOrder,
  leadExplanationOf,
  leadExtraOf,
  leadFailedMoveKindOf,
  leadFirstTurnOf,
  leadFlowPrevStuckOf,
  leadGateOf,
  leadGreetingOf,
  leadHintsOf,
  leadHistoryOf,
  leadHoldSayOf,
  leadKeptSoundOf,
  leadMoveWithSound,
  leadNarrowTargetOf,
  leadOpenAcceptsOf,
  leadOpenChildOf,
  leadSaidOf,
  leadSettleOf,
  leadStartModeOf,
  leadStatusOf,
  leadTurnAppliesOf,
  leadTurnLinesOf,
  type TalkLeadRetryInput,
  talkLeadRetrySpec,
} from "../src/core/conversation/lead-turn-core";
import {
  childLinesOf,
  type LateCardRow,
  type LessonArgs,
  lateCardAnswerOf,
  lessonTurnSegmentOf,
  nextTeacherTurnOf,
  reaskWordsOf,
  type TalkQuestionSlot,
  type TeacherAttachLine,
  type TeacherMoveAi,
  type TeacherTurnPlan,
  talkLessonPositionOf,
  teacherMoveOf,
} from "../src/core/conversation/lesson-flow";
import {
  childCauseOf,
  TALK_HEARD_HELPS,
  TALK_HINT_KINDS,
  type TalkChatSettings,
  type TalkHeardHelp,
  type TalkHintKind,
  type TalkInputMode,
  type TalkLessonChildTurn,
  type TalkLessonTurn,
  type TalkTurnSegment,
  talkLessonSettingsFrom,
} from "../src/core/conversation/lesson-turns";
import { maskNameAnswer } from "../src/core/conversation/listen";
import { madeUpHit } from "../src/core/conversation/made-up";
import {
  NO_CARD_ITEM,
  readTalkMove,
  TALK_SUPPORT_STAGE_EASY,
  type TalkAppHelp,
  type TalkMove,
  TalkMoveSchema,
  type TalkSlotWhy,
  talkMoveOf,
} from "../src/core/conversation/move";
import {
  cardQuestionKeyOf,
  checkLowLevelQuestion,
  type EasySlotCheck,
  type LowLevelLineOptions,
  questionEchoesChild,
  questionKeyOf,
  sameQuestionKeyHit,
  turnQuestionOf,
} from "../src/core/conversation/question-check";
import {
  type HeldQuestionFail,
  heldQuestionFailOf,
  keepLastHeldQuestion,
  mergeQuestionRetry,
  questionRetryNoteOf,
  stuckRewriteNoteOf,
} from "../src/core/conversation/question-retry";
import { metWordsIn } from "../src/core/conversation/said";
import {
  allowedLemmaOfVocab,
  checkSituationSentence,
  echoesTurnSentence,
  failSituationLineOf,
  heardFieldsBlankOf,
  type SituationPlace,
  situationLineOf,
  situationPlaceOf,
  situationRotationOf,
  situationTailOf,
} from "../src/core/conversation/situation";
import {
  type AppendLine,
  cardLineWithoutSaidOf,
  MORE_PROMPT,
  normalizeSpoken,
  sayingAnswer,
  shownTurnOf,
  toriKoShownOf,
} from "../src/core/conversation/spoken";
import {
  checkToriSentence,
  createToriEnReader,
  createToriSentenceGate,
  isQuestionSentence,
  safeLineOf,
  type ToriEnReaderKeys,
} from "../src/core/conversation/stream";
import { wrapUpLinesOf } from "../src/core/conversation/wrap-up";
import {
  ForbiddenFileSchema,
  HomophonesFileSchema,
  LevelSpecsFileSchema,
  ListFormsFileSchema,
  MetaSentencesFileSchema,
  SoundAlikesFileSchema,
  type TalkAllowedWordsFile,
  TalkAllowedWordsFileSchema,
  type TalkCueLinesFile,
  TalkCueLinesFileSchema,
  type TalkLevelSpec,
  type TalkListLine,
  TalkMadeUpPhrasesFileSchema,
  type TalkSituationLinesFile,
  TalkSituationLinesFileSchema,
  UnitSpecsFileSchema,
} from "../src/core/seed/schema/reference";
import { type TalkCard, TalkCardSchema } from "../src/core/seed/schema/talk";
import { TeachersFileSchema } from "../src/core/seed/schema/teachers";
import {
  AI_WAIT_TIMEOUT_MULTIPLE,
  type AskKind,
  bandOf,
  FUNCTION_POS,
  PLACEHOLDER_NAME,
  TALK_CUE_BANDS,
  TALK_CUE_PLACES,
  TALK_SITUATION_FORBIDDEN_SCOPES,
  TALK_SITUATION_PLACES,
} from "../src/core/seed/structure";
import {
  buildLexicon,
  type FormRule,
  type LexiconEntry,
  splitSentences,
  tokenize,
} from "../src/core/seed/text";
import { lemmaLookup } from "../src/core/session/attempt";
import { chatMaterialOf } from "../src/core/teacher/roster";
import {
  SAMPLE_CONTACT_PATTERNS,
  SAMPLE_NAMES,
} from "../tests/fixtures/ai/sample-inputs";
import {
  createScriptClient,
  loadScriptConfig,
  readApiKey,
  type ScriptConfig,
  ScriptInputError,
  withFormat,
} from "./ai-contract";
import { observeFailureOf } from "./ai-observe";

/** 대본 폴더(시험용 자료 — 단위 시험도 같은 파일을 읽는다). */
export const SCRIPT_DIR = "tests/fixtures/talk-observe";
const SEED_DIR = "seed";
/** --effort 로 견줄 값(D7: low vs medium). */
export const OBSERVE_EFFORTS = ["low", "medium"] as const;
export type ObserveEffort = (typeof OBSERVE_EFFORTS)[number];
/** 예상 비용 어림(추측, 설계 값 아님): 글자 → 토큰 · 턴마다 늘어나는 앞 턴 전문 · 응답 JSON 길이. 캐시는 셈하지 않는다(위쪽 어림). */
const CHARS_PER_TOKEN = 4;
const HISTORY_TOKENS_PER_TURN = 400;
const OUTPUT_TOKENS_PER_CALL = 600;
/** 재질문 요청에 더해지는 앞 tori_en · 다시 쓰기 메시지(추측). */
const RETRY_NOTE_TOKENS = 150;
const PRICE4_PER_MICRO = 10_000;
const EXIT_OK = 0;
const EXIT_INPUT = 2;
const PURPOSE = "talk_turn" as const;
/** 지난 대화 요약을 몇 줄까지 넘기는지(서버 lesson-turn.ts summaryLimit 과 같은 설정 키). */
const MEMORY_SUMMARIES_KEY = "talk.memory_summaries";

// ── 인자 ─────────────────────────────────────────────────────────

/** 덮어 쓸 수 있는 설정값(대본 칸 settings · --set). 설정 시드의 값 꼴 가운데 글 · 수 · 참거짓만 받는다. */
export type SettingValue = string | number | boolean;
/** 설정 키 꼴(점으로 나뉜 영어 소문자 · 수 · _ · -, 예 talk.greeting_recall · ai.effort.talk_turn.1-3). */
export const SETTING_KEY_PATTERN = /^[a-z][a-z0-9_]*(?:\.[a-z0-9_-]+)+$/;

/** 다룬 필수 질문 수가 기준선의 이 비율 아래인 대본에 알림(판정이 아님, spec N-3 · 설계 3 '--chance-alert(기본 0.5)'). */
export const CHANCE_ALERT_DEFAULT = 0.5;

/** --chance-alert 값(0 초과 1 이하, 아니면 null). */
export function chanceAlertOf(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : null;
}

export type TalkObserveArgs = {
  yes: boolean;
  script: string | null;
  level: number | null;
  effort: ObserveEffort | null;
  out: string | null;
  /** 대본마다 돌릴 바퀴 수(1 이상). */
  rounds: number;
  /** --set 으로 덮는 설정값(명령 전체 · 대본 칸 settings 보다 앞섬 · 메모리에서만). */
  set: Readonly<Record<string, SettingValue>>;
  /** 기준선 보고 JSON 경로(끝의 지표 표가 견준다 — talk-metrics). */
  baseline: string | null;
  /** 다룬 필수 질문 수가 기준선 × 이 값 아래인 대본에 알림(판정이 아님, spec N-3 · 0 초과 1 이하). */
  chanceAlert: number;
  /** 자리 재현 모드(--anchored — 준 때에만 칸이 있다). 재생 대본(차례 칸 anchor)만 돌린다. */
  anchored?: true;
  /**
   * 이야기 방식 수업(talk.lead_mode chat)의 기록 전용 평가 호출(--chat-eval on|off — 준 때에만 칸이 있다, 없으면 켬: 앱과 같음). 끄면 부르지 않고
   * '부르지 않음'으로 적는다.
   */
  chatEval?: boolean;
};

/** --set 의 값 글 → 값: true · false 는 참거짓, 십진 수는 수, 그 밖은 글 그대로(on · off · low 꼴). */
export function settingValueOf(text: string): SettingValue {
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  return text;
}

/** --set <키>=<값> 한 개를 읽는다. */
function parseSet(
  value: string,
):
  | { ok: true; key: string; value: SettingValue }
  | { ok: false; error: string } {
  const at = value.indexOf("=");
  if (at <= 0 || at === value.length - 1)
    return { ok: false, error: `--set 은 <키>=<값> 꼴이다: ${value}` };
  const key = value.slice(0, at);
  if (!SETTING_KEY_PATTERN.test(key))
    return { ok: false, error: `--set 의 설정 키 꼴이 아니다: ${key}` };
  return { ok: true, key, value: settingValueOf(value.slice(at + 1)) };
}

export function parseArgs(
  argv: readonly string[],
): { ok: true; args: TalkObserveArgs } | { ok: false; error: string } {
  const args: TalkObserveArgs = {
    yes: false,
    script: null,
    level: null,
    effort: null,
    out: null,
    rounds: 1,
    set: {},
    baseline: null,
    chanceAlert: CHANCE_ALERT_DEFAULT,
  };
  const set: Record<string, SettingValue> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (arg === "--yes") {
      args.yes = true;
      continue;
    }
    if (arg === "--anchored") {
      args.anchored = true;
      continue;
    }
    if (
      arg !== "--script" &&
      arg !== "--chat-eval" &&
      arg !== "--level" &&
      arg !== "--effort" &&
      arg !== "--out" &&
      arg !== "--rounds" &&
      arg !== "--set" &&
      arg !== "--baseline" &&
      arg !== "--chance-alert"
    )
      return { ok: false, error: `모르는 인자: ${arg}` };
    if (value === undefined || value.startsWith("--"))
      return { ok: false, error: `${arg} 뒤에 값이 없다` };
    i += 1;
    if (arg === "--script") args.script = value;
    else if (arg === "--chat-eval") {
      if (value !== "on" && value !== "off")
        return { ok: false, error: "--chat-eval 은 on · off 가운데 하나다" };
      args.chatEval = value === "on";
    } else if (arg === "--out") args.out = value;
    else if (arg === "--baseline") args.baseline = value;
    else if (arg === "--chance-alert") {
      const n = chanceAlertOf(value);
      if (n === null)
        return { ok: false, error: "--chance-alert 는 0 초과 1 이하 수다" };
      args.chanceAlert = n;
    } else if (arg === "--set") {
      const one = parseSet(value);
      if (!one.ok) return one;
      set[one.key] = one.value;
    } else if (arg === "--rounds") {
      const rounds = Number(value);
      if (!Number.isInteger(rounds) || rounds < 1)
        return { ok: false, error: "--rounds 는 1 이상 정수다" };
      args.rounds = rounds;
    } else if (arg === "--level") {
      const level = Number(value);
      if (!Number.isInteger(level) || level < 1)
        return { ok: false, error: "--level 은 1 이상 정수다" };
      args.level = level;
    } else {
      const effort = OBSERVE_EFFORTS.find((e) => e === value);
      if (!effort)
        return {
          ok: false,
          error: `--effort 는 ${OBSERVE_EFFORTS.join(" · ")} 가운데 하나다`,
        };
      args.effort = effort;
    }
  }
  return { ok: true, args: { ...args, set } };
}

// ── 대본 ─────────────────────────────────────────────────────────

/** 사람 판정 칸(브리프 할 것 2 · AC-15o (나) 되돌림). 값은 설계대로라면 어떠해야 하는가(기대)다. */
export const JUDGE_KEYS = [
  "followUp",
  "contextlessCard",
  "answerFirst",
  "koMeaning",
  "sceneAssert",
  "sameSoundTwice",
  "returns",
  "stuckRight",
  "ownReaction",
] as const;
export type JudgeKey = (typeof JUDGE_KEYS)[number];
export const JUDGE_LABELS: Readonly<Record<JudgeKey, string>> = {
  followUp: "이어 묻기였는가",
  contextlessCard: "카드 질문을 맥락 없이 끼웠는가",
  answerFirst: "답을 먼저 들려줬는가",
  koMeaning: "한국어 뜻 있는가",
  sceneAssert: "장면 단정 문장",
  sameSoundTwice: "같은 소리 두 번",
  returns: "오늘 이야기로 돌아왔는가",
  stuckRight: "막힘 판정 맞음",
  ownReaction: "선생님 자기 반응 한마디 있음",
};

const ExpectSchema = z.strictObject({
  ...Object.fromEntries(JUDGE_KEYS.map((k) => [k, z.boolean().optional()])),
  /** 낱말 답 턴: recast 가 이 낱말을 담은 바른 문장이어야 한다(AC-15o (가)). */
  recastWord: z.string().min(1).optional(),
}) as z.ZodType<Partial<Record<JudgeKey, boolean>> & { recastWord?: string }>;

const MeantSchema = z.strictObject({
  /** 아이가 하려던 말의 낱말(선생님이 이 낱말로 받아야 알아들은 것). */
  word: z.string().trim().min(1),
  /** 들은 글에서 잘못 들린 낱말(선생님이 이 낱말을 되풀이하면 못 알아들은 것). */
  heardAs: z.array(z.string().trim().min(1)).min(1),
  /** 근거 한 줄(사람이 읽는 글 — 확인된 것인지 추정인지). */
  note: z.string().optional(),
});
/** 재생 대본의 기대 낱말 주석(보고 칸 · 지표가 읽는 꼴). */
export type ObserveMeant = z.infer<typeof MeantSchema>;

/**
 * 자리 재현 재료(실제 수업 기록의 칸 그대로 — 13절 C217 (4)). child 는 그 아이 행의 칸(막힘 말로 저장됐는가 stuck_phrase · 힌트 종류 · 단 ·
 * 들은 도움 · 노린 단어), teachers 는 그 입력 뒤 다음 아이 차례 앞까지의 선생님 행(응답 한 행과 뒤따른 앱 차례 — 화면 글 · move · AI 질문 힌트)이다.
 */
const AnchorSchema = z.strictObject({
  child: z.strictObject({
    stuck: z.boolean(),
    hint: z.enum(TALK_HINT_KINDS),
    hintTier: z.int().min(0),
    heardHelp: z.enum(TALK_HEARD_HELPS),
    targets: z.array(z.string()),
  }),
  teachers: z
    .array(
      z.strictObject({
        text: z.string(),
        move: TalkMoveSchema,
        aiQuestion: z
          .strictObject({
            en: z.string(),
            hintKo: z.string(),
            hints: z.array(z.string()),
            answerExample: z.string(),
            usable: z.array(z.string()).optional(),
          })
          .nullable(),
      }),
    )
    .min(1),
});
export type ObserveAnchor = z.infer<typeof AnchorSchema>;

/** 인식기 정보 글의 길이 상한(서버 턴 요청 규격 TALK_TEXT_MAX 와 같은 값 — server-only index.ts 라 값을 둔다, 짝 시험이 묶음). */
export const OBSERVE_CHAT_TEXT_MAX = 500;

/**
 * 이야기 방식 차례의 앱 행동(묶음 T1 — 이야기 방식 수업에서만 읽는다). waitSeconds 는 선생님 말의 읽기 끝(도구는 소리 시간을 몰라 끝 줄을 받은 때를 읽기 끝으로 본다) 뒤 아이가 입력하기까지 망설인 시간(가짜 시계 —
 * 조용함 타이머가 그 사이에 지나면 조용함 차례가 먼저 온다), recognizer 는 그 차례 턴 요청에 실을 인식기 정보(확신 정도 · 다른 후보 · 중간 결과만),
 * hintRetry 는 힌트가 실패해 '다시 받기'가 보일 때 누르는가(기본 누름).
 */
const ChatStepSchema = z.strictObject({
  waitSeconds: z.number().min(0).optional(),
  recognizer: chatRecognizerSchemaOf(OBSERVE_CHAT_TEXT_MAX).optional(),
  hintRetry: z.boolean().optional(),
});

const StepSchema = z
  .strictObject({
    /** 아이 말(인식 결과 흉내). */
    say: z.string().trim().min(1).optional(),
    /**
     * '잘 모르겠어요' 단추 · 말소리 없음(기기 쪽) · 조용함(quiet — 이야기 방식만: 아이가 누르지도 말하지도 않음. 조용함 타이머가 지나면 조용함 차례,
     * 신호가 없으면 기다림).
     */
    input: z.enum(["dont_know", "nospeech", "quiet"]).optional(),
    /** 고르기 차례(마무리 물음 · 마무리 제안)의 단추 — 이야기 방식만: more '더 이야기하기' · stop '그만하기'(구석 단추 — 언제든). */
    choose: z.enum(["more", "stop"]).optional(),
    /** 이야기 방식 차례의 앱 행동(망설임 · 인식기 정보 · 힌트 다시 받기). */
    chat: ChatStepSchema.optional(),
    /** 아이가 연 힌트(없으면 앞 선생님 차례에서 들은 도움으로 앱처럼 정한다). */
    hint: z.enum(TALK_HINT_KINDS).optional(),
    hintTier: z.int().min(0).optional(),
    /** 설계된 대화의 그 차례 선생님 말(사람이 나란히 볼 예). */
    design: z.string().optional(),
    note: z.string().optional(),
    expect: ExpectSchema.optional(),
    /**
     * 재생 대본의 주석(13절 C217 (4) · AC-15zl): 들은 글이 아이가 하려던 말과 다를 때 그 기대 낱말(word)과 잘못 들린 낱말(heardAs).
     * 'See' = sea 면 { word: "sea", heardAs: ["see"] }. 지표 '못 알아들음'이 읽는다(talk-replay-metrics) — 흐름 · 요청에는 닿지 않는다.
     */
    meant: MeantSchema.optional(),
    /** 재생 대본: 실제 수업에서 이 입력 바로 앞에 선생님이 한 말(〈 〉 는 소리 줄). 고정 입력 재생이 어긋난 차례를 가르는 재료다. */
    lessonBefore: z.string().trim().min(1).optional(),
    /** 재생 대본: 자리 재현(--anchored) 재료. 고정 입력 재생은 읽지 않는다. */
    anchor: AnchorSchema.optional(),
  })
  .refine(
    (s) =>
      s.choose !== undefined ||
      (s.say === undefined) !== (s.input === undefined),
    {
      message: "차례마다 say 와 input 가운데 하나만 둔다",
    },
  )
  .refine(
    (s) =>
      s.choose === undefined || (s.say === undefined && s.input === undefined),
    { message: "고르기 차례(choose)에는 say · input 을 두지 않는다" },
  )
  .refine((s) => s.meant === undefined || s.say !== undefined, {
    message: "기대 낱말 주석(meant)은 말 차례(say)에만 둔다",
  });
export type ObserveStep = z.infer<typeof StepSchema>;

const ScriptSchema = z.strictObject({
  name: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  level: z.int().min(1),
  unit: z.int().min(1),
  lesson: z.int().min(1),
  teacher: z.string().min(1),
  source: z.string().optional(),
  note: z.string().optional(),
  /**
   * 고정 입력 재생 대본(13절 C217 (4)): 실제 수업의 아이 입력(들은 글 · 단추 · 누른 힌트 수)을 차례대로 그대로 넣는다. 선생님 말이 실제 수업과
   * 달라지면 뒤 입력이 그 질문과 어긋날 수 있으므로 계획 줄 · 보고 · 지표 표에 '고정 입력 재생'을 밝힌다.
   */
  replay: z.boolean().optional(),
  /** 짧은 준비에서 인식 실패로 건너뛴 낱말(보고에만 — 서버도 보인 낱말 전부를 만난 것으로 넘긴다, 분석 A9). */
  prep: z.strictObject({ skipped: z.array(z.string()) }).optional(),
  /** 지난 대화 요약(최근 것부터 — 서버 summariesBefore 흉내, talk.memory_summaries 줄까지 넘긴다). 둘째 세션 꼴 대본(설계 7). */
  summaries: z.array(z.string().trim().min(1)).min(1).optional(),
  /** 이 대본만 덮는 설정값(메모리에서만 — 설정 파일은 그대로, --set 이 앞선다). */
  settings: z
    .record(
      z.string().regex(SETTING_KEY_PATTERN),
      z.union([z.string(), z.number(), z.boolean()]),
    )
    .optional(),
  steps: z.array(StepSchema).min(1),
});
export type ObserveScript = z.infer<typeof ScriptSchema>;

export function parseObserveScript(
  raw: unknown,
  file: string,
): { ok: true; script: ObserveScript } | { ok: false; error: string } {
  const parsed = ScriptSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: `${file}: ${first?.path.join(".") ?? ""} ${first?.message ?? "꼴이 틀렸다"}`,
    };
  }
  if (`${parsed.data.name}.json` !== file)
    return { ok: false, error: `${file}: name 이 파일 이름과 다르다` };
  return { ok: true, script: parsed.data };
}

/** 이름 · 단계로 대본을 고른다. */
export function selectScripts(
  scripts: readonly ObserveScript[],
  args: Pick<TalkObserveArgs, "script" | "level">,
): ObserveScript[] {
  return scripts.filter(
    (s) =>
      (args.script === null || s.name === args.script) &&
      (args.level === null || s.level === args.level),
  );
}

// ── 자료(시드 파일 → 메모리) ──────────────────────────────────────

/** 시드 파일 JSON(읽은 그대로). 회화 수업 파일이 없으면 lessonFile 은 null. */
export type SeedFiles = {
  lessonFile: unknown;
  levelSpecs: unknown;
  unitSpecs: unknown;
  teachers: unknown;
  vocab: unknown;
  forms: unknown;
  forbidden: unknown;
  meta: unknown;
  /**
   * 회화 1~3단계 시드 목록 넷(서버 seedLessonTalkLists 와 같은 파일 — 'AI 몫 넓힘' plan 정한 것 5). 파일이 없으면 null 이고 빈 목록으로 본다(서버
   * seed-lists seedListOrEmpty 와 같다). 칸이 없으면(옛 시험 재료) 빈 목록이다.
   */
  talkCueLines?: unknown;
  talkSituationLines?: unknown;
  talkAllowedWords?: unknown;
  talkMadeUpPhrases?: unknown;
  /**
   * 동음이의어 묶음 · 소리가 가까운 낱말 목록(13절 C217 (1) — 서버 seedHomophones · seedSoundAlikes 와 같은 파일). 파일이 없으면 null 이고 빈
   * 목록으로 본다. 칸이 없으면(옛 시험 재료) 빈 목록이다.
   */
  homophones?: unknown;
  soundAlikes?: unknown;
};

/** 회화 1~3단계 시드 목록 넷(서버 lesson-turn.ts LessonTalkLists 와 같은 꼴). */
export type ObserveTalkLists = {
  cue: TalkCueLinesFile;
  situation: TalkSituationLinesFile;
  allowed: TalkAllowedWordsFile;
  madeUp: readonly string[];
};

/** 시드 목록 파일을 읽었는가(없으면 null · 칸이 없으면 undefined — 둘 다 빈 목록으로 본다). */
const hasList = (raw: unknown) => raw !== undefined && raw !== null;

/**
 * 받침 둘째의 AI 질문 자리면 질문 검사 재료(그 응답에 남은 고르기 답 수), 아니면 undefined(서버 lesson-turn.ts lessonEasySlotOf 사본 — 13절
 * C217 (2) (ㄴ), 끝 처리와 질문 다시 쓰기가 같이 쓴다). 자리 판정은 core talkEasyAiSlotOf.
 */
export function observeEasySlotOf(
  chosen: Pick<TeacherTurnPlan, "kind" | "aiAsks" | "stage">,
  value: Pick<TalkLessonOutput, "choices">,
  low: boolean,
): EasySlotCheck | undefined {
  return talkEasyAiSlotOf(chosen, low)
    ? { choices: value.choices.length }
    : undefined;
}

const recordOf = <K extends string, V>(keys: readonly K[], value: () => V) =>
  Object.fromEntries(keys.map((key) => [key, value()])) as Record<K, V>;

/** 시드 목록 넷 읽기(없으면 빈 목록 — 서버 seedTalkCueLines · seedTalkSituationLines · seedTalkAllowedWords · seedTalkMadeUpPhrases 와 같은 빈 꼴). */
export function talkListsOf(
  files: Pick<
    SeedFiles,
    | "talkCueLines"
    | "talkSituationLines"
    | "talkAllowedWords"
    | "talkMadeUpPhrases"
  >,
): ObserveTalkLists {
  const has = hasList;
  return {
    cue: has(files.talkCueLines)
      ? TalkCueLinesFileSchema.parse(files.talkCueLines)
      : recordOf(TALK_CUE_PLACES, () =>
          recordOf(TALK_CUE_BANDS, () => ({ long: [], short: [] })),
        ),
    situation: has(files.talkSituationLines)
      ? TalkSituationLinesFileSchema.parse(files.talkSituationLines)
      : {
          lines: recordOf(TALK_SITUATION_PLACES, () => []),
          forbidden: recordOf(TALK_SITUATION_FORBIDDEN_SCOPES, () => []),
        },
    allowed: has(files.talkAllowedWords)
      ? TalkAllowedWordsFileSchema.parse(files.talkAllowedWords)
      : { allowed: [], feeling: [] },
    madeUp: has(files.talkMadeUpPhrases)
      ? [...TalkMadeUpPhrasesFileSchema.parse(files.talkMadeUpPhrases).phrases]
      : [],
  };
}

/** 한 대본을 돌릴 재료(서버 state · 단계 맥락 · 질문 검사 범위를 시드로 채운 것). */
export type Materials = {
  level: number;
  unit: number;
  lessonNo: number;
  card: TalkCard;
  spec: TalkLevelSpec;
  newWords: string[];
  ctx: LevelContext;
  goalTexts: { id: string; ko: string }[];
  teacher: TalkTeacher;
  lemmaOf: (surface: string) => string | undefined;
  allowedWords: ReadonlySet<string>;
  forms: readonly FormRule[];
  allowedForms: ReadonlySet<string>;
  forbidden: z.infer<typeof ForbiddenFileSchema>;
  metaPhrases: readonly string[];
  /** 회화 1~3단계 시드 목록 넷(4단계부터는 읽지 않는다 — 서버 lists 가 low 일 때만인 것과 같다). */
  talkLists: ObserveTalkLists;
  /**
   * 동음이의어 묶음(시드 lists/homophones.json — 서버 seedHomophones). 1~3단계의 먼저 답한 필수 질문 · 들은 글 귀띔 · 막힘 무름이 같은 묶음을
   * 쓴다(13절 C217 (1)). 파일이 없으면 빈 묶음이다.
   */
  homophones: readonly (readonly string[])[];
  /** 소리가 가까운 낱말 목록(시드 lists/sound-alikes.json — 서버 seedSoundAlikes, 들은 글 귀띔). 파일이 없으면 빈 목록이다. */
  soundAlikes: readonly SoundAlikeEntry[];
  /** 기능어(어휘 시드의 기능어 표시, 소문자 — 서버 readFunctionWords 와 같이 모든 단계). 상황 차례 답 글 검사가 쓴다. */
  functionWords: ReadonlySet<string>;
  /** 허용 낱말 대조의 모든 단계 원형 찾기(서버 readAllowedLemmaOf 와 같은 core allowedLemmaOfVocab — 모든 단계 어휘 행 · 허용 낱말). */
  allowedLemmaOf: (surface: string) => string | undefined;
  /**
   * 새 엔진 길(talk.lead_mode claude — 묶음 X2)의 재료: 모든 단계 어휘 행(서버 lead-turn.ts readLexiconEntries 와 같은 칸 — 좁은 정의의 단계 ·
   * 품사 사전과 허용 낱말 원형)과 이 단계 · 다음 단계의 CEFR(서버 leadCefrOf 와 같은 두 행). 옛 시험 재료에는 없다(새 엔진 길이 열리지 않음).
   */
  leadLexicon?: readonly LexiconEntry[];
  leadCefr?: TalkLeadCefr | null;
  /**
   * 이야기 방식(talk.lead_mode chat — 묶음 T1)의 선생님 재료(시드 teachers.json 의 두 칸 — 서버 chatMaterialOf 가 읽는 값). 두 칸이 다 있을 때만 있고
   * 아니면 null(그 선생님 수업은 지금 길). 옛 시험 재료에는 없다(이야기 방식이 열리지 않음).
   */
  chatTeacher?: { chatPersonaEn: string; chatFavoritesEn: string } | null;
  /**
   * 단원 낱말 재료의 원형 표(묶음 T1 fix 1 · 컨트롤러 결정 I-1 — 서버 S2 fix 2 와 같은 재료): 단계 맥락의 단원 단어(ctx.unitWords) 각각의 어휘 행으로만
   * 만든 표(범위 전체 표를 덧붙이지 않음). 이야기 방식의 힌트 단 재료 · 판정 맥락이 쓴다. 옛 시험 재료에는 없다(그때는 lemmaOf).
   */
  unitLemmaOf?: (surface: string) => string | undefined;
  /**
   * 수업 상태의 원형 표(서버 state.ts state.lemmaOf — 그 수업 내용의 단원 단어 각각의 어휘 행으로 만든 표, 묶음 T1 fix 1 덧붙임). 이야기 방식의 만남
   * 셈 · 정리 되짚을 말이 서버처럼 쓴다(공식 학습 기록이라 기존 계산 그대로 — 컨트롤러 결정). 옛 시험 재료에는 없다(그때는 lemmaOf).
   */
  lessonLemmaOf?: (surface: string) => string | undefined;
};

const LessonFileLite = z.object({
  area: z.literal("talk"),
  level: z.int(),
  unit: z.int(),
  lessons: z.array(
    z.object({
      lessonNo: z.int(),
      newWords: z.array(z.string()),
      /** 그 수업 내용의 단원 단어(서버 수업 상태의 원형 표 state.lemmaOf 의 재료 — 묶음 T1 fix 1). 옛 시드에는 없다. */
      unitWords: z.array(z.string()).optional(),
      card: z.unknown(),
    }),
  ),
});
const VocabLite = z.object({
  vocab: z.array(
    z.object({
      word: z.string(),
      level: z.int(),
      forms: z.array(z.string()),
      partsOfSpeech: z.array(z.string()).optional(),
      /** 시드 vocab.json 의 품사 칸(서버 적재가 vocab.parts_of_speech 로 옮긴다 — 새 엔진 사전이 읽는다). */
      pos: z.array(z.string()).optional(),
    }),
  ),
});

/** 시드 JSON → 재료. 카드 · 단계 규격 · 단원 규격 · 선생님이 없으면 그 까닭(돌리지 않고 계획에서 건너뜀). */
export function materialsOf(
  files: SeedFiles,
  where: Pick<ObserveScript, "level" | "unit" | "lesson" | "teacher">,
): { ok: true; materials: Materials } | { ok: false; missing: string } {
  const { level, unit, lesson, teacher } = where;
  const lessonPath = `seed/lessons/talk/${level}/${unit}.json`;
  if (files.lessonFile === null)
    return { ok: false, missing: `카드 시드 없음(${lessonPath})` };
  const lessons = LessonFileLite.safeParse(files.lessonFile);
  const row = lessons.success
    ? lessons.data.lessons.find((l) => l.lessonNo === lesson)
    : undefined;
  if (!row) return { ok: false, missing: `수업 ${lesson} 없음(${lessonPath})` };
  const card = TalkCardSchema.safeParse(row.card);
  if (!card.success)
    return { ok: false, missing: `새 꼴 카드가 아님(${lessonPath})` };
  const talkSpecs = LevelSpecsFileSchema.parse(
    files.levelSpecs,
  ).levelSpecs.filter((s) => s.area === "talk");
  const levelSpec = talkSpecs.find((s) => s.level === level);
  if (!levelSpec)
    return { ok: false, missing: `회화 ${level}단계 단계 규격 없음` };
  const nextSpec = talkSpecs.find((s) => s.level === level + 1);
  const spec = levelSpec as TalkLevelSpec;
  const unitRows = UnitSpecsFileSchema.parse(files.unitSpecs).unitSpecs.filter(
    (u) => u.area === "talk",
  ) as {
    level: number;
    unit: number;
    revision: number;
    learningElement: string;
    words: string[];
    goals?: { id: string; ko: string }[];
  }[];
  // 칸마다 가장 높은 판(서버 levelContextOf 의 pickByCell 과 같은 뜻 — 세션 시작 판은 없으니 시드의 마지막 판)
  const latest = new Map<string, (typeof unitRows)[number]>();
  for (const r of unitRows) {
    const key = `${r.level}-${r.unit}`;
    const had = latest.get(key);
    if (!had || had.revision < r.revision) latest.set(key, r);
  }
  const unitSpec = latest.get(`${level}-${unit}`);
  if (!unitSpec)
    return { ok: false, missing: `회화 ${level}단계 단원 ${unit} 규격 없음` };
  const prevLearningElements = [...latest.values()]
    .filter((r) => r.level < level || (r.level === level && r.unit < unit))
    .sort((a, b) => a.level - b.level || a.unit - b.unit)
    .map((r) => r.learningElement);
  const teacherRow = TeachersFileSchema.parse(files.teachers).teachers.find(
    (t) => t.key === teacher,
  );
  if (!teacherRow) return { ok: false, missing: `선생님 ${teacher} 없음` };
  const allVocab = VocabLite.parse(files.vocab).vocab;
  const vocab = allVocab.filter((v) => v.level <= level);
  const talkLists = talkListsOf(files);
  const unitWords = [...unitSpec.words];
  const unitSet = new Set(unitWords);
  const unitLemma = lemmaLookup(vocab.filter((v) => unitSet.has(v.word)));
  const lessonUnitSet = new Set(row.unitWords ?? []);
  const rangeLemma = lemmaLookup(vocab);
  const formsFile = ListFormsFileSchema.parse(files.forms);
  const allowedForms = new Set(
    formsFile.forms
      .filter(({ introducedAt }) => {
        const at = introducedAt.rst;
        return (
          at !== null &&
          at !== undefined &&
          (at.level < level || (at.level === level && at.unit <= unit))
        );
      })
      .map(({ id }) => id),
  );
  return {
    ok: true,
    materials: {
      level,
      unit,
      lessonNo: lesson,
      card: card.data,
      spec,
      newWords: [...row.newWords],
      ctx: {
        level,
        canDo: spec.canDo,
        learningElement: unitSpec.learningElement,
        prevLearningElements,
        unitWords,
        sentenceMaxWords: spec.sentenceMaxWords,
      },
      goalTexts: (unitSpec.goals ?? []).map(({ id, ko }) => ({ id, ko })),
      teacher: { nameEn: teacherRow.nameEn, personaEn: teacherRow.personaEn },
      lemmaOf: (s) => unitLemma(s) ?? rangeLemma(s),
      // 서버와 같은 core chatUnitWordsOf(재료: 모든 어휘 행 — 함수가 단계 맥락의 단원 단어 행만 그 목록 차례로 씀, 서버 readChatUnitWords · 턴 길과 같은 값)
      unitLemmaOf: chatUnitWordsOf({ unitWords, lemmaEntries: allVocab })
        .lemmaOf,
      // 서버 state.ts 와 같은 재료: lemmaLookup(lemmaEntriesOf(db, lesson.unitWords)) — 그 수업 내용의 단원 단어 각각의 어휘 행(단계 거름 없음)
      lessonLemmaOf: lemmaLookup(
        allVocab.filter((v) => lessonUnitSet.has(v.word)),
      ),
      allowedWords: new Set(vocab.map((v) => v.word.toLowerCase())),
      forms: formsFile.forms,
      allowedForms,
      forbidden: ForbiddenFileSchema.parse(files.forbidden),
      metaPhrases: MetaSentencesFileSchema.parse(files.meta).phrases,
      talkLists,
      homophones: hasList(files.homophones)
        ? HomophonesFileSchema.parse(files.homophones).groups
        : [],
      soundAlikes: hasList(files.soundAlikes)
        ? SoundAlikesFileSchema.parse(files.soundAlikes).words
        : [],
      allowedLemmaOf: allowedLemmaOfVocab(allVocab, talkLists.allowed.allowed),
      // 서버 readFunctionWords 는 적재된 vocab.parts_of_speech(시드 pos 칸을 옮긴 것)를 읽는다 — 시드 파일에는 pos 칸만 있다(검토 rev-x2 I-1)
      functionWords: new Set(
        allVocab
          .filter(
            (v) => (v.pos ?? v.partsOfSpeech)?.includes(FUNCTION_POS) === true,
          )
          .map((v) => v.word.toLowerCase()),
      ),
      leadLexicon: allVocab.map((v) => ({
        word: v.word,
        pos: [...(v.pos ?? v.partsOfSpeech ?? [])],
        level: v.level,
        forms: [...v.forms],
      })),
      leadCefr: { level: levelSpec.cefr, next: nextSpec?.cefr ?? null },
      chatTeacher:
        teacherRow.chatPersonaEn && teacherRow.chatFavoritesEn
          ? {
              chatPersonaEn: teacherRow.chatPersonaEn,
              chatFavoritesEn: teacherRow.chatFavoritesEn,
            }
          : null,
    },
  };
}

// ── 요청 구성 ────────────────────────────────────────────────────

/**
 * 회화 턴 요청 본문: 구조화 출력 형식을 붙이고 응답 규격의 $defs · $ref 를 펼친다(서버 src/server/ai/talk.ts talkOutputFormatOf 와 같은 꼴 —
 * $ref 꼴은 API 가 'compiled grammar is too large' 로 거부한다, 대본 3회차 400). 서버 함수는 server-only 라 같은 core 함수로 펼친다.
 */
export function talkBodyOf(
  body: Record<string, unknown>,
  wireSchema: z.ZodType,
): Record<string, unknown> {
  const withSchema = withFormat(body, wireSchema);
  const output = withSchema.output_config as Record<string, unknown> & {
    format: { type: string; schema: Record<string, unknown> };
  };
  return {
    ...withSchema,
    output_config: {
      ...output,
      format: {
        type: output.format.type,
        schema: inlineJsonSchemaRefs(output.format.schema),
      },
    },
  };
}

/** 이 단계 회화 턴의 설정값(--effort 면 그 구간 effort 키만 바꾼 사본 — 설정 파일은 바꾸지 않는다). */
export function observeValues(
  values: Readonly<Record<string, unknown>>,
  level: number,
  effort: ObserveEffort | null,
): Record<string, unknown> {
  if (effort === null) return { ...values };
  return { ...values, [settingKeysOf(PURPOSE, level).effort]: effort };
}

/** 덮은 설정 하나(보고 · 계획 줄). known 은 설정 파일(또는 TEST_SETTINGS)에 그 키가 있었는가 — 없으면 읽는 코드가 없을 수 있다. */
export type SettingOverride = {
  key: string;
  value: SettingValue;
  from: "script" | "set";
  known: boolean;
};

/**
 * 한 대본을 돌릴 설정값: 설정 파일 → 대본 칸 settings → --effort → --set 차례로 덮은 사본(설정 파일 · 받은 값은 바꾸지 않는다).
 * overrides 는 마지막에 이긴 덮음만 적는다(같은 키를 대본과 명령이 함께 덮으면 명령 쪽 하나).
 */
export function runValuesOf({
  values,
  level,
  effort,
  script,
  set,
}: {
  values: Readonly<Record<string, unknown>>;
  level: number;
  effort: ObserveEffort | null;
  script: Pick<ObserveScript, "settings">;
  set: Readonly<Record<string, SettingValue>>;
}): { values: Record<string, unknown>; overrides: SettingOverride[] } {
  const fromScript = script.settings ?? {};
  const merged = observeValues({ ...values, ...fromScript }, level, effort);
  Object.assign(merged, set);
  const known = (key: string) => Object.hasOwn(values, key);
  const overrides: SettingOverride[] = [
    ...Object.entries(fromScript)
      .filter(([key]) => !Object.hasOwn(set, key))
      .map(([key, value]) => ({
        key,
        value,
        from: "script" as const,
        known: known(key),
      })),
    ...Object.entries(set).map(([key, value]) => ({
      key,
      value,
      from: "set" as const,
      known: known(key),
    })),
  ];
  return { values: merged, overrides };
}

/** 덮은 설정 한 줄 글(계획 · 보고). */
export function overrideText(o: SettingOverride): string {
  return `${o.key}=${String(o.value)}(${o.from === "script" ? "대본" : "명령"}${o.known ? "" : " · 설정 파일에 없는 키"})`;
}

/** 넘길 지난 대화 요약: talk.memory_summaries 가 1 이상 정수면 그 줄까지(서버와 같은 상한), 아니면 받은 그대로. */
export function summariesOf(
  summaries: readonly string[],
  values: Readonly<Record<string, unknown>>,
): string[] {
  const limit = values[MEMORY_SUMMARIES_KEY];
  return typeof limit === "number" && Number.isInteger(limit) && limit > 0
    ? summaries.slice(0, limit)
    : [...summaries];
}

// ── 메모리 대화 ──────────────────────────────────────────────────

/** 메모리 행(talk_turns 의 흉내 — 흐름 · 앞 턴 전문 · 보고가 읽는 칸만). */
export type SimRow =
  | {
      speaker: "tori";
      turnNo: number;
      text: string;
      rewrite: string;
      move: TalkMove;
      answerExample: string | null;
      /** AI 질문 힌트(서버 talk_turns.aiQuestion 의 힌트 칸 — 다음 차례 힌트 단). 앱 차례 · 질문이 남지 않은 행은 null. */
      aiQuestion: ObserveAiQuestion | null;
      /**
       * 새 엔진 길(묶음 X2)이 쓴 행에만 있는 칸: 토막(talk_turns.segment — 없으면 인사 토막의 지금 길 행), 아이 말 없이 부른 차례의 보낸 사용자
       * 메시지(sent_user_message), 막힌 뒤 한국어 뜻(explanation), 뜻 줄(tori_ko). 새 엔진 행의 rewrite 는 tori_rewrite(응답 JSON, say = 나간 말)다.
       */
      segment?: TalkTurnSegment;
      sentUserMessage?: string | null;
      explanation?: string | null;
      toriKo?: string | null;
      /** 이야기 방식 행(묶음 T1)만: 힌트 호출이 만든 값(서버 ai_question 의 이야기 방식 꼴 — chatAiQuestionOf) · 길이 초과 기록. */
      chatAi?: ChatAiQuestion | null;
      overLength?: boolean;
    }
  | {
      speaker: "child";
      turnNo: number;
      segment: TalkTurnSegment;
      text: string | null;
      input: TalkInputMode;
      nospeech: boolean;
      stuck: boolean;
      targets: string[];
      sentUserMessage: string | null;
      /**
       * 새 엔진 길(묶음 X2)의 아이 행에만 있는 칸(서버 talk_turns 아이 행 — lessonChildRowOf · lead-turn.ts saveLeadTurn): 힌트 칸 셋(되물은 뒤
       * 하한을 이어 받은 값), 뜻 힌트를 열었는가(같은 기록에서 — 새 후보 판정 meaningHint), Claude 후보 · '말했다' · 되물음 표지.
       */
      hintKind?: TalkHintKind;
      hintLevel?: number;
      heardHelp?: Exclude<TalkHeardHelp, "none"> | null;
      meaningHint?: boolean;
      selfUsedWords?: string[];
      saidWords?: string[];
      askAgain?: boolean;
      /**
       * 이야기 방식 아이 행(묶음 T1)만: 조용함 입구 행(서버 input_mode quiet — 흐름 꼴로 읽기 전에 거른다), 막힘 말(stuck_phrase), 첫 판정 기록과 늦게 온
       * 평가 값으로 고쳐 쓴 기록(chat_judge).
       */
      quiet?: true;
      stuckPhrase?: string | null;
      chatJudge?: unknown;
    };

/** 차례 하나를 부르기 전 준비(요청 본문 · 계획 · 입력). */
export type PreparedTurn = {
  stepIndex: number;
  step: ObserveStep;
  childText: string | null;
  mode: TalkInputMode;
  nospeech: boolean;
  segment: TalkTurnSegment;
  ifAnswered: TeacherTurnPlan;
  ifStuck: TeacherTurnPlan | null;
  turn: TalkCallTurn;
  input: TalkLessonInput;
  rules: TalkLessonRules;
  userMessage: string;
  request: {
    body: Record<string, unknown>;
    betas: string[];
    timeoutMs: number;
    model: string;
    effort: string;
    thinking: string;
  };
  /** 부르기 전 흐름 값(보고). */
  before: {
    followRun: number;
    asked: ReadonlyMap<string, number>;
    silentBlocked: boolean;
    stuckInSlot: number;
  };
  hintKind: TalkHintKind;
  hintTier: number;
  heardHelp: TalkHeardHelp;
  /** 부르기 전 흐름 입력(서버 LessonArgs 와 같은 꼴 — 짝 시험이 같은 재료로 서버 함수를 부른다). */
  flowArgs: LessonArgs;
  /** 지금 질문 자리(부르기 전)와 그 힌트 단(서버 lessonHintsAt 과 같은 셈). */
  slot: TalkQuestionSlot | null;
  hintTiers: HintTier[];
  /** 이번 아이 말이 노린 단어(지금 질문 자리의 낱말 — 서버 lessonChildLiteOf 의 targets). */
  targets: string[];
  /** 이번 사용자 메시지를 만든 때의 '바뀐 값' 재료(다음 턴의 비교 기준 — 서버 talkLessonInputOf 의 prev). */
  context: TalkLessonContext;
};

/** 응답 메시지(text 블록의 글을 읽는 꼴 — 서버 talk.ts 의 TalkMessage 와 같다). */
export type TalkMessage = Omit<MessageLike, "content"> & {
  content: readonly (ContentBlockLike & { text?: string })[];
};

/** 한 시도의 결과(실호출 · 시험의 가짜 응답이 같은 꼴로 넘긴다). */
export type CallResult =
  | {
      ok: true;
      message: TalkMessage;
      latencyMs: number;
      firstSentenceMs: number | null;
      requestId: string;
    }
  | { ok: false; status: number; detail: string; latencyMs: number };

export type TurnUsage = {
  model: string;
  stopReason: string;
  verdict: "strict" | "normalized" | "invalid";
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  latencyMs: number;
  firstSentenceMs: number | null;
  requestId: string;
  checkHits: number;
};

export type JudgeCell = { expect: boolean | null; auto: boolean | null };

/**
 * 기술 오류 자리(spec 'AI 몫 넓힘' 설계 8 측정 정의): 들리지 않음 차례와, 회화 턴 호출이 실패 · 거절 · 읽지 못함으로 끝나 앱이 상황 줄 ·
 * 칭찬 대사 · 카드 글을 쓴 차례다. 지표 셈(묶음 4-나)은 이 표시로 분자 · 분모에서 빼고 따로 센다.
 * call: failed 호출 실패(상태 코드) · refusal 거절(stop_reason) · unreadable 응답을 읽지 못함 · retry_failed 재질문 호출이 실패하거나 읽지 못함.
 */
export type TechErrorCall =
  | "failed"
  | "refusal"
  | "unreadable"
  | "retry_failed";
export type TechErrorMark = { nospeech: boolean; call: TechErrorCall | null };

export function techErrorOf({
  nospeech,
  result,
  readable,
  retryFailed,
}: {
  nospeech: boolean;
  result: CallResult;
  readable: boolean;
  retryFailed: boolean;
}): TechErrorMark | null {
  const call: TechErrorCall | null = !result.ok
    ? "failed"
    : result.message.stop_reason === "refusal"
      ? "refusal"
      : !readable
        ? "unreadable"
        : retryFailed
          ? "retry_failed"
          : null;
  return nospeech || call !== null ? { nospeech, call } : null;
}

const TECH_ERROR_TEXT: Readonly<Record<TechErrorCall, string>> = {
  failed: "호출 실패",
  refusal: "거절",
  unreadable: "응답을 읽지 못함",
  retry_failed: "재질문 호출 실패",
};

/** 기술 오류 자리 표시 글(보고 표시 칸). */
export function techErrorText(mark: TechErrorMark): string {
  return `기술 오류 자리(${[
    ...(mark.nospeech ? ["들리지 않음"] : []),
    ...(mark.call ? [TECH_ERROR_TEXT[mark.call]] : []),
  ].join(" · ")})`;
}

/** 보고의 아이 칸 글: 들리지 않음 · '잘 모르겠어요' 단추 차례(말 입력이 아님 — 지표 셈 talk-metrics 가 가른다). */
export const CHILD_NOSPEECH_TEXT = "(말소리 없음)";
export const CHILD_DONT_KNOW_TEXT = "(잘 모르겠어요)";

/** 보고 한 줄(아이 차례 하나 → 선생님 차례 하나). */
export type TurnRecord = {
  no: number;
  child: string;
  segment: TalkTurnSegment;
  plan: string;
  teacher: string;
  /** 앱이 붙인 줄(신호 말이 있으면 맨 앞 · 그 뒤 화면 글 붙일 줄). */
  attach: string[];
  /** 1~3단계 신호 말 한 줄(attach 맨 앞과 같은 글 · 뜻 — 옛 보고에는 없다). */
  cue?: { en: string; ko?: string } | null;
  toriKo: string | null;
  sound: { model?: string; choices?: [string, string]; answer?: string };
  recast: string;
  explanation: string;
  move: Pick<TalkMove, "kind" | "next" | "why" | "item" | "app" | "stage">;
  replaced: TalkSlotWhy | null;
  dropped: { en: string; reason: string }[];
  returned: string | null;
  sameQuestion: string | null;
  judge: Record<JudgeKey, JudgeCell>;
  recastCheck: { word: string; ok: boolean } | null;
  usage: TurnUsage | null;
  failure: string | null;
  /** 응답을 읽지 못한 차례의 응답 원문(JSON 보고에만 — 대본 회차 r1 판정 I-3 (가), 어느 칸이 깨지는지 보는 재료). 그 밖은 없음. */
  rawOnFail?: string;
  /**
   * 앱이 선생님 말에 넣은 상황 줄 글(상황 검사로 바꾼 줄 · 반응 자리에 둔 줄 — 대본 지표가 '앱이 바꾼 차례'와 'AI 가 예문 그대로 쓴 차례'를
   * 가른다, M-5). 옛 보고는 칸 없음(지표가 표시 글로 읽는다).
   */
  situationLines?: string[];
  flags: string[];
  /** 기술 오류 자리(설계 8 — 지표 분자 · 분모에서 빼고 따로 센다). 정상 차례는 null. */
  techError: TechErrorMark | null;
  design: string | null;
  /** 재생 대본의 기대 낱말 주석(대본 칸 그대로 — 주석이 있는 차례에만, 지표 '못 알아들음'의 재료). */
  meant?: ObserveMeant;
  /** 재생 대본: 실제 수업에서 이 입력 바로 앞에 선생님이 한 말(대본 칸 그대로 — 있는 차례에만). */
  lessonBefore?: string;
  /**
   * 자리 재현으로 받은 차례(--anchored — 그 차례에만 칸이 있다): 앞 상태가 실제 수업 기록이다. lessonAfter 는 실제 수업에서 그 입력 뒤 선생님이
   * 한 말(화면 글), prevFirstWord 는 기록에서 이 차례 앞의 가장 가까운 AI 반응(대화 토막 · 받침 아님)의 첫 낱말이다(없으면 null — 지표 (나)가
   * 새 응답의 첫 낱말과 견준다). check 는 깐 상태 대조(도구가 그 자리에서 셈한 값이 기록과 다른 칸 이름 — 같으면 빈 목록).
   */
  anchored?: {
    lessonAfter: string;
    prevFirstWord: string | null;
    check: string[];
  };
  /** 정규화 · 검사 뒤 AI 출력(JSON 보고에만). */
  output: TalkLessonOutput | null;
  /** 이 턴의 사용자 메시지(JSON 보고에만 — 앞 턴 전문 재료). */
  userMessage: string;
  /** 뒤따른 앱 차례(대화 첫 질문 등). */
  appAfter: string[];
  /**
   * 재질문(13절 C203 (3) — 1~3단계 질문 검사에 걸린 AI 되묻기를 카드 자리로 바꾸기 전에 AI 에 한 번 다시 쓰게 하는 재호출). 재호출 턴이면
   * 그 시도의 사용량(본 호출과 따로)과 결과, 아니면 null. 판정 · 입력 · 잇기는 core question-retry 의 함수다.
   */
  /** 응답 첫 칸 아이 말 갈래(13절 C204, 정규화 뒤 — 읽지 못했으면 null). */
  childKind: string | null;
  /** AI 의 stuck(정규화 전) · 앱이 본 막힘(effectiveStuckOf 뒤) · 앱이 막힘을 무름. */
  stuck: { ai: boolean | null; app: boolean; overridden: boolean };
  reask: {
    usage: TurnUsage | null;
    outcome: string;
    /** 첫 시도의 tori_en(정규화 뒤 — 걸린 질문이 든 글). */
    firstToriEn: string;
    /** 첫 시도의 걸림(retryOf 의 heldQuestionFailOf). */
    firstFail: QuestionFailNote;
    /** 다시 쓴 시도의 tori_en(응답을 읽지 못했으면 null). */
    retryToriEn: string | null;
    /** 다시 쓴 시도의 걸림(이은 질문의 질문 검사 · 같은 질문, 통과했거나 잇지 못했으면 null). */
    retryFail: QuestionFailNote | null;
  } | null;
};

/**
 * 소리 줄 신호 말인가(core cue-line 의 신호 구 — 서버 lesson-turn.ts 와 같은 함수). 시드 신호 말 줄은 문장 문이 live.cuePhrases 로 함께 본다.
 * talk-metrics 도 이 함수를 쓴다.
 */
export function isSoundCue(sentence: string): boolean {
  return isSoundCueOf(sentence);
}

/** 장면 단정 문장(아이 상태 · 행동을 단정 — 분석 A6 · 5.1 3): 'You are thirsty.' 꼴. 사람 판정의 자동 힌트다. */
const SCENE_ASSERT = /^(?:you are|you're|you look|you feel)\b[^?]*[.!]$/i;

export function isSceneAssert(sentence: string): boolean {
  return SCENE_ASSERT.test(sentence.trim());
}

function lessonTextOf(
  kept: readonly string[],
  attach: readonly TeacherAttachLine[],
): string {
  return [
    kept.join(" "),
    ...attach
      .filter((l) => l.kind !== "sound")
      .flatMap((l) => ("en" in l ? [l.en] : [])),
  ].join("\n");
}

function toAppend(line: TeacherAttachLine): AppendLine | null {
  if (line.kind === "question")
    return {
      kind: "question",
      en: line.en,
      ...(line.ko ? { ko: line.ko } : {}),
    };
  if (line.kind === "closing")
    return {
      kind: "more_prompt",
      en: line.en,
      ...(line.ko ? { ko: line.ko } : {}),
    };
  if (line.kind === "answer_example")
    return { kind: "answer_example", en: line.en };
  return null;
}

/**
 * 겹침 없애기(서버 shownAttachOf 사본, C125 (3)). 남은 카드 질문 줄에서는 선생님 문장에 이미 든 앞 문장(카드의 장면 문장)을 뺀다(서버와 같은 core
 * 함수 cardLineWithoutSaidOf — 13절 C217 보완).
 */
function shownAttachOf(
  kept: readonly string[],
  attach: readonly TeacherAttachLine[],
): TeacherAttachLine[] {
  const text = attach.flatMap((l) => {
    const a = toAppend(l);
    return a ? [a] : [];
  });
  const left = [...shownTurnOf(kept, text).append];
  return attach
    .filter((l) => {
      const a = toAppend(l);
      if (!a) return true;
      const at = left.findIndex(
        (s) => s.kind === a.kind && "en" in s && s.en === l.en,
      );
      if (at < 0) return false;
      left.splice(at, 1);
      return true;
    })
    .map((l) => (l.kind === "question" ? cardLineWithoutSaidOf(kept, l) : l));
}

function questionLineOf(
  card: TalkCard,
  koMeaning: boolean,
  ref: TeacherTurnPlan["item"],
  role: "card" | "easy",
): TeacherAttachLine | null {
  const item = cardItemOf(card, ref);
  if (!item) return null;
  const text = role === "easy" ? item.easyQuestion : item;
  return {
    kind: "question",
    role,
    en: text.en,
    ...(koMeaning && text.ko ? { ko: text.ko } : {}),
    item: { ...ref },
  };
}

/** 질문이 지워진 AI 차례 → 카드 자리(서버 lessonCardSlotOf 사본, 3.3 카드 자리 (2) · (3) · C194 (1)). */
function cardSlotOf(
  chosen: TeacherTurnPlan,
  why: TalkSlotWhy,
  ctx: {
    card: TalkCard;
    turns: readonly TalkLessonTurn[];
    asked: ReadonlyMap<string, number>;
    max: number;
    low: boolean;
    koMeaning: boolean;
    dropped: readonly string[];
  },
): TeacherTurnPlan | null {
  const blocked = [
    ...new Set([...chosen.blocked, ...ctx.dropped.map(questionKeyOf)]),
  ];
  const guard = { blocked, asked: ctx.asked, max: ctx.max };
  const base: TeacherTurnPlan = {
    ...chosen,
    kind: "card_slot",
    callsAi: true,
    aiAsks: false,
    why,
    attach: [],
    app: [],
  };
  const afterStuck = chosen.cause === "button" || chosen.cause === "stuck";
  if (
    afterStuck &&
    chosen.stage === TALK_SUPPORT_STAGE_EASY &&
    chosen.easyFallback &&
    chosen.item.kind !== "none"
  ) {
    const line = questionLineOf(ctx.card, ctx.koMeaning, chosen.item, "easy");
    if (line) return { ...base, attach: [line], app: ["easy_question"] };
  }
  const attach: TeacherAttachLine[] = [];
  const app: TalkAppHelp[] = [];
  const answer =
    afterStuck || chosen.cause === "nospeech" ? chosen.answerFallback : null;
  if (answer) {
    attach.push(
      ctx.low
        ? { kind: "sound", role: "answer", en: answer }
        : { kind: "answer_example", en: answer },
    );
    app.push("answer_example");
  }
  const ref =
    slotChanceOf({ card: ctx.card, chances: chosen.chances, ...guard }) ??
    oldestMoreOf({ card: ctx.card, turns: ctx.turns, ...guard });
  const line = ref
    ? questionLineOf(ctx.card, ctx.koMeaning, ref, "card")
    : null;
  if (line) attach.push(line);
  if (attach.length === 0) return null;
  const item = ref ? cardItemOf(ctx.card, ref) : undefined;
  return {
    ...base,
    attach,
    app,
    ...(item && ref
      ? { item: { ...ref }, words: [...item.targets], goals: [...item.goals] }
      : {}),
  };
}

/** 1~3단계 둘째 인사 AI 질문이 걸린 턴(재질문 뒤): 카드 둘째 인사 질문을 붙인 카드 자리(서버 greetingFallbackSlotOf 사본, spec 설계 2 [M-2]). */
function greetingFallbackSlotOf(
  chosen: TeacherTurnPlan,
  line: TeacherAttachLine,
  why: TalkSlotWhy,
): TeacherTurnPlan {
  return {
    ...chosen,
    kind: "card_slot",
    callsAi: true,
    aiAsks: false,
    why,
    attach: [line],
    app: [],
  };
}

/** 문장 문 한 줄(서버 lesson-turn.ts LessonSentence 와 같은 꼴 — 까닭 · 상황 줄로 바뀐 문장의 AI 원문 ai · 그 뜻 ko). */
export type Entry = {
  en: string;
  question: boolean;
  cue: boolean;
  state: "sent" | "held" | "dropped";
  reason?:
    | "question"
    | "same"
    | "overlap"
    | "together"
    | "rewrite"
    | "cue"
    | "made_up"
    | "situation";
  ai?: string;
  ko?: string;
};

/** 1~3단계 실시간 검사 재료(서버 LessonLiveChecks 와 같은 꼴). 없으면 신호 구 지움만 한다(4단계부터 · 옛 시험 길). */
export type ObserveLiveChecks = {
  cuePhrases: readonly string[];
  madeUp: readonly string[];
  situation: ObserveSituationChecks | null;
};

/** 상황 차례 검사 재료(서버 LessonSituationChecks 와 같은 꼴). */
export type ObserveSituationChecks = {
  options: LowLevelLineOptions | null;
  allowed: ReadonlySet<string>;
  allowedLemmaOf?: ((surface: string) => string | undefined) | undefined;
  forbidden: { all: readonly string[]; nospeech: readonly string[] };
  lines: Partial<TalkSituationLinesFile["lines"]>;
  turnNo: number;
  question: string;
  /** 이 대화의 앞 선생님 행 글(상황 줄 되풀이 피하기 — 서버 teacherTextsOf). */
  spoken?: readonly string[];
  /** 참이면 되풀이 · 예 베끼기도 상황 검사에 건다(서버 LessonSituationChecks.repeat — 판정 r1 I-1 (나)). */
  repeat?: boolean;
  functionWords: ReadonlySet<string>;
};

/** 끝 처리 재료(서버 LessonSettleLive 와 같은 꼴 — 반응 자리 상황 줄 · 신호 말). */
export type ObserveSettleLive = {
  situationLines: Partial<TalkSituationLinesFile["lines"]>;
  turnNo: number;
  cue: { file: TalkCueLinesFile; band: CueBand } | null;
};

/** 한 선생님 차례의 실시간 검사 · 끝 처리 재료. */
export type ObserveLive = {
  checks: ObserveLiveChecks;
  settle: ObserveSettleLive;
};

/**
 * 상황 차례 답 글 검사의 질문 글(서버 slotQuestionTextOf 사본): 그 질문 자리를 연 선생님 행(opensSlot)부터 지금까지 선생님 행 글을 잇는다.
 */
export function slotQuestionTextOf(turns: readonly TalkLessonTurn[]): string {
  const texts: string[] = [];
  for (let i = turns.length - 1; i >= 0; i--) {
    const row = turns[i];
    if (row?.speaker !== "teacher") continue;
    texts.unshift(row.text);
    if (opensSlot(row)) break;
  }
  return texts.join(" ");
}

/** 선생님 행 글(차례대로 — 상황 줄 되풀이 피하기 재료, 서버 teacherTextsOf 사본). */
export function teacherTextsOf(turns: readonly TalkLessonTurn[]): string[] {
  return turns.flatMap((t) => (t.speaker === "teacher" ? [t.text] : []));
}

/**
 * 이 선생님 차례의 실시간 검사 · 끝 처리 재료(서버 lessonTurnAfterChild 의 live · settle live 배선과 같은 값 — 목록 넷 · 기능어 · 허용 낱말
 * 원형 · 질문 글 · 앞 선생님 행 글 · 턴 번호). turns 는 이번 아이 행 앞까지(서버 state.turns), teacherTurnNo 는 이번 선생님 행 번호(아이 행 번호
 * + 1). 서버는 허용 낱말 원형을 상황 차례 계획일 때만 읽지만 그 사전은 상황 차례 검사만 쓰므로 늘 넘겨도 판정이 같다. 4단계부터 null.
 */
export function observeLiveOf(
  materials: Pick<
    Materials,
    "level" | "talkLists" | "functionWords" | "allowedLemmaOf"
  >,
  {
    turns,
    teacherTurnNo,
    lineOptions,
    rotationKey = "",
  }: {
    turns: readonly TalkLessonTurn[];
    teacherTurnNo: number;
    lineOptions: LowLevelLineOptions | null;
    /** 상황 줄 돌림에 섞는 대화마다 다른 값(서버는 세션 id — 도구는 대본 이름 · 바퀴, 판정 r1 M-6). 비면 턴 번호 그대로. */
    rotationKey?: string;
  },
): ObserveLive | null {
  if (!isLowBandLevel(materials.level)) return null;
  const lists = materials.talkLists;
  const band = cueBandOf(materials.level);
  const turnNo = situationRotationOf(teacherTurnNo, rotationKey);
  return {
    checks: {
      cuePhrases: seedCuePhrasesOf(lists.cue),
      madeUp: lists.madeUp,
      situation: {
        options: lineOptions,
        allowed: new Set(lists.allowed.allowed),
        allowedLemmaOf: materials.allowedLemmaOf,
        forbidden: lists.situation.forbidden,
        lines: lists.situation.lines,
        turnNo,
        question: slotQuestionTextOf(turns),
        spoken: teacherTextsOf(turns),
        repeat: true,
        functionWords: materials.functionWords,
      },
    },
    settle: {
      situationLines: lists.situation.lines,
      turnNo,
      cue: band ? { file: lists.cue, band } : null,
    },
  };
}

/** 그 계획의 상황 차례 검사 맥락(서버 situationContextOf 사본 — 답 글은 받침 · 들리지 않음에서 계획의 답 예시가 있을 때만). */
function situationContextOf(
  place: SituationPlace,
  plan: Pick<TeacherTurnPlan, "answerFallback">,
  checks: ObserveSituationChecks,
) {
  return {
    place,
    options: checks.options,
    allowed: checks.allowed,
    ...(checks.allowedLemmaOf ? { allowedLemmaOf: checks.allowedLemmaOf } : {}),
    forbidden: checks.forbidden,
    answer:
      place !== "greeting_end" && plan.answerFallback
        ? {
            example: plan.answerFallback,
            question: checks.question,
            functionWords: checks.functionWords,
          }
        : null,
    ...(checks.repeat ? { repeat: { spoken: checks.spoken ?? [] } } : {}),
  };
}

/**
 * 선생님 문장 문(서버 createLessonSentenceFlow 의 accept 사본 — 흘려 받는 대신 응답 끝에 문장마다 차례로 넣는다). 1~3단계는 먼저 실시간 검사를
 * 한다: AI 가 쓴 신호 말은 늘 지우고(cue), live 가 있으면 물음표 아닌 문장의 지어낸 경험 꼴을 지우며(made_up), 상황 차례의 물음표 아닌 문장은
 * 상황 검사를 받아 첫 걸림은 상황 줄로 바꾸고(ai 에 원문) 뒤 걸림은 지운다(situation).
 */
export function sentenceEntriesOf(
  sentences: readonly string[],
  plan: TeacherTurnPlan,
  {
    low,
    asked,
    max,
    live = null,
  }: {
    low: boolean;
    asked: ReadonlyMap<string, number>;
    max: number;
    live?: ObserveLiveChecks | null;
  },
): Entry[] {
  const list: Entry[] = [];
  let holding = false;
  let sameDropped = false;
  let situationUsed = false;
  const answers = plan.attach.flatMap((l) =>
    l.kind === "sound" ? [l.en] : [],
  );
  const asks = plan.kind === "ai" && plan.aiAsks;
  const liveDrop = (entry: Entry): boolean => {
    if (!low) return false;
    if (entry.cue) {
      entry.state = "dropped";
      entry.reason = "cue";
      return true;
    }
    if (entry.question || live === null) return false;
    if (madeUpHit(entry.en, live.madeUp) !== null) {
      entry.state = "dropped";
      entry.reason = "made_up";
      return true;
    }
    const checks = live.situation;
    const place = checks ? situationPlaceOf(plan) : null;
    if (!checks || place === null) return false;
    // [N-2] 상황 줄로 바꾼 뒤의 AI 문장은 지운다(상황 줄이 반응 · 넘김을 이미 담는다 — 같은 뜻 두 번 말하기 막음, 대본 회차 r2 판정 N-2)
    // [N-2] 이 턴에 남긴 문장과 같은 뜻을 되풀이하는 AI 문장도 지운다(echoesTurnSentence)
    if (
      situationUsed ||
      echoesTurnSentence(
        entry.en,
        list
          .filter((e) => e.state !== "dropped" && !e.question)
          .map((e) => e.en),
      )
    ) {
      entry.state = "dropped";
      entry.reason = "situation";
      return true;
    }
    const check = checkSituationSentence(
      entry.en,
      situationContextOf(place, plan, checks),
    );
    if (check.ok) return false;
    const reacted = list.some(
      (e) => e.state !== "dropped" && !e.question && !e.cue,
    );
    const line = situationLineOf(checks.lines, place, checks.turnNo, {
      sentences: list.filter((e) => e.state !== "dropped").map((e) => e.en),
      texts: checks.spoken ?? [],
      reacted,
    });
    if (line === null) {
      entry.state = "dropped";
      entry.reason = "situation";
      return true;
    }
    situationUsed = true;
    // [N-1] 이 턴에 AI 맞장구가 남았으면 상황 줄의 넘김만 붙인다(반응은 AI, 넘김은 앱 — 대본 회차 r2 판정 N-1 (나))
    const shown = situationTailOf(line, reacted);
    entry.ai = entry.en;
    entry.en = shown.en;
    entry.ko = shown.ko;
    return false;
  };
  for (const en of sentences) {
    const question = isQuestionSentence(en);
    const cue = low && isSoundCueOf(en, live?.cuePhrases ?? []);
    const entry: Entry = { en, question, cue, state: "sent" };
    if (liveDrop(entry)) {
      // 지움(1~3단계 신호 말 · 지어낸 경험 · 상황 차례 둘째 걸림부터)
    } else if (
      answers.length > 0 &&
      sayingAnswer(
        entry.en,
        answers.map((a) => [a, a] as const),
      )
    ) {
      entry.state = "dropped";
      entry.reason = "overlap";
    } else if (holding) entry.state = "held";
    else if (question && !asks) {
      entry.state = "dropped";
      entry.reason = "question";
    } else if (question && low) {
      holding = true;
      entry.state = "held";
    } else if (question && sameDropped) {
      entry.state = "dropped";
      entry.reason = "question";
    } else if (question) {
      const hit = sameQuestionKeyHit({
        key: questionKeyOf(en),
        blocked: plan.blocked,
        asked,
        max,
      });
      if (hit) {
        entry.state = "dropped";
        entry.reason = "same";
        sameDropped = true;
      }
    }
    list.push(entry);
  }
  return list;
}

/** 걸림 한 건의 글: "질문" 까닭(걸린 낱말). */
function failText(f: QuestionFailNote): string {
  if (f.reason === "stuck_overridden")
    return "막힘 무름(AI stuck → 앱이 무름) — 통째로 다시 쓰기";
  return `"${f.question}" ${f.reason}${f.words.length > 0 ? `(${f.words.join(", ")})` : ""}`;
}

/** 신호 말 · 상황 줄 한 줄의 꼴(서버 cueLineView 사본 — 뜻은 뜻을 보이는 단계만). */
function cueLineView(
  line: TalkListLine,
  koMeaning: boolean,
): { en: string; ko?: string } {
  return {
    en: line.en,
    ...(koMeaning && line.ko !== "" ? { ko: line.ko } : {}),
  };
}

/** 앱이 고른 반응 한 줄(응답 없는 턴 — 서버 LessonOutcomeView 'line'). */
export type FailLine = { en: string; ko?: string };

/**
 * 응답이 없는 턴의 반응 자리 한 줄(서버 lessonOutcomeViewOf 의 거절 · 실패 길 사본): 1~3단계 상황 차례는 그 자리 상황 줄, 거절은 카드 안전한
 * 대사(그 줄의 뜻 함께), 그 밖의 1~3단계 실패는 카드 칭찬 대사(아이 행 턴 번호로 돌림). 4단계부터 실패는 서버가 'Oops' 쉼(선생님 행 없음)이라
 * 도구는 대화를 잇기 위해 카드 안전한 대사 한 줄을 둔다(흉내 못 낸 것).
 */
export function observeFailLineOf({
  low,
  koMeaning,
  card,
  refusal,
  situation,
  safeLine,
  childTurnNo,
}: {
  low: boolean;
  koMeaning: boolean;
  card: Pick<TalkCard, "safeLines">;
  refusal: boolean;
  situation: TalkListLine | null;
  safeLine: string;
  childTurnNo: number;
}): FailLine {
  if (low && situation) return cueLineView(situation, koMeaning);
  const withKo = (safe: { en: string; ko?: string | undefined }) => ({
    en: safe.en,
    ...(safe.ko !== undefined ? { ko: safe.ko } : {}),
  });
  if (refusal || !low)
    return withKo(
      card.safeLines.find((l) => l.en === safeLine) ?? { en: safeLine },
    );
  // 1~3단계 실패는 뜻이 있는 안전한 대사(서버 lessonOutcomeViewOf — 판정 r1 I-3 (나), 뜻은 그 단계가 뜻을 보일 때만)
  const en = safeLineOf(card.safeLines, childTurnNo);
  const safe = card.safeLines.find((l) => l.en === en) ?? { en };
  return koMeaning ? withKo(safe) : { en: safe.en };
}

// ── 서버 배선 사본(새 엔진 길 · '더 이야기하기' — 묶음 X2) ───────────────
// 아래는 server-only 파일에만 있어 스크립트가 부를 수 없는 작은 배선이다. 판단은 모두 core 함수이고 여기서는 부르는 차례만 옮긴다. 서버 함수와
// 같은 답을 내는지는 tests/unit/talk-observe-parity.test.ts 가 서버 함수와 맞대어 본다. core 로 옮기면 이 사본을 지운다(task-x2-report '확인할 것').

/** 이번 아이 말의 흐름 꼴(서버 lesson-turn.ts lessonChildLiteOf 사본 — 토막은 core lessonTurnSegmentOf). */
export function observeChildLiteOf(
  position: Parameters<typeof lessonTurnSegmentOf>[0] &
    Pick<ReturnType<typeof talkLessonPositionOf>, "slot">,
  input: { mode: TalkInputMode; nospeech?: boolean },
  settings: LessonArgs["settings"],
  stuck = false,
): TalkLessonChildTurn {
  const nospeech = input.mode === "dont_know" && input.nospeech === true;
  const cause =
    input.mode === "speech" ? "speech" : nospeech ? "nospeech" : "button";
  return {
    speaker: "child",
    segment: lessonTurnSegmentOf(position, cause, settings),
    input: input.mode,
    stuck: input.mode === "speech" && stuck,
    nospeech,
    targets: [...(position.slot?.words ?? [])],
  };
}

/** 회화 턴 끝점의 상한 · 저장 여유(ms — 서버 lesson-turn.ts TURN_IN_FLIGHT_MS · TURN_SAVE_GRACE_MS 사본, 동등 시험이 값을 맞댄다). */
export const OBSERVE_TURN_IN_FLIGHT_MS = 60_000;
export const OBSERVE_TURN_SAVE_GRACE_MS = 5000;
const OBSERVE_MS_PER_SECOND = 1000;

/**
 * 좁은 정의 다시 말하기를 부를 시간이 남았는가(서버 lesson-turn.ts questionRetryFits 사본 — 검토 rev-x2 M-3, 기록만). 서버는 받은 때부터 지난
 * 시간으로 재고, 도구는 본 호출의 지연을 그 값으로 쓴다. 도구의 동작(다시 말하기를 부름)은 바꾸지 않고 이 값을 기록에 남긴다.
 */
export function observeQuestionRetryFits({
  elapsedMs,
  timeoutMs,
}: {
  elapsedMs: number;
  timeoutMs: number;
}): boolean {
  return (
    elapsedMs +
      AI_WAIT_TIMEOUT_MULTIPLE * timeoutMs +
      OBSERVE_TURN_SAVE_GRACE_MS <=
    OBSERVE_TURN_IN_FLIGHT_MS
  );
}

/** talk_turns 길이 초과(서버 lesson-turn.ts lessonOverLengthOf 사본). */
export function observeOverLengthOf({
  words,
  sentences,
  max,
}: {
  words: number;
  sentences: number;
  max: number;
}): boolean {
  return words > 0 || sentences > max;
}

/** '더 이야기하기' 지금 방식의 결정(서버 index.ts lessonMoreOf 사본 — 거리 고르기는 core chances 함수). */
export type ObserveMore =
  | {
      ok: true;
      segment: LessonArgs["segment"];
      move: TalkMove;
      line: { en: string; ko?: string };
      complete: boolean;
    }
  | { ok: false };

/**
 * '더 이야기하기'(지금 방식, 서버 index.ts lessonMoreOf 사본): 고르기 차례에서만, 더 이야기할 거리 하나를 카드 자리로 — 다시 쓰기가 남은 낱말을
 * 노리는 것 → 가장 오래전에 쓴 것(같은 질문 상한 안) → 가장 오래전에 쓴 것. 마무리 물음이면 더 이야기하기 토막과 참여 완료, 마무리 제안이면 토막 그대로.
 * 대본 도구의 아이는 새 아이라 이월이 없고 세션은 진행 중이다.
 */
export function observeMoreOf(
  args: LessonArgs & { carry?: TalkCarry },
): ObserveMore {
  const no = { ok: false } as const;
  if (args.segment === "wrap_up") return no;
  const pos = talkLessonPositionOf(args);
  if (pos.choice === null || pos.lastRow !== "teacher") return no;
  const chances = talkChancesOf({
    card: args.card,
    newWords: args.newWords,
    turns: args.turns,
    carry: args.carry ?? { goals: [], words: [] },
    missionsDone: 0,
    settings: args.settings,
    prepWords: args.prepWords,
  });
  const guard = {
    blocked: [],
    asked: pos.askedQuestions,
    max: args.settings.sameQuestionMax,
  };
  const ref =
    slotChanceOf({
      card: args.card,
      chances: { required: [], reuse: chances.reuse },
      ...guard,
    }) ??
    oldestMoreOf({ card: args.card, turns: args.turns, ...guard }) ??
    oldestMoreOf({ card: args.card, turns: args.turns, blocked: [] });
  const item = ref ? cardItemOf(args.card, ref) : undefined;
  if (!ref || !item) return no;
  const closing = pos.choice === "closing";
  return {
    ok: true,
    segment: closing ? "more_talk" : args.segment,
    move: talkMoveOf({
      kind: "card_slot",
      item: ref,
      words: item.targets,
      goals: item.goals,
      streak: pos.streak,
    }),
    line: {
      en: item.en,
      ...(args.spec.koMeaning && item.ko ? { ko: item.ko } : {}),
    },
    complete: closing,
  };
}

/**
 * '더 이야기하기' 새 엔진 몫(서버 index.ts lessonMoreLeadOf 사본): 카드 거리를 고르지 않고 토막만 — 마무리 물음이면 더 이야기하기 토막, 마무리
 * 제안이면 토막 그대로. 받는 조건은 lessonMoreOf 와 같다.
 */
export function observeMoreLeadOf(args: LessonArgs):
  | { ok: true; segment: LessonArgs["segment"]; complete: boolean }
  | {
      ok: false;
    } {
  if (args.segment === "wrap_up") return { ok: false };
  const pos = talkLessonPositionOf(args);
  if (pos.choice === null || pos.lastRow !== "teacher") return { ok: false };
  const closing = pos.choice === "closing";
  return {
    ok: true,
    segment: closing ? "more_talk" : args.segment,
    complete: closing,
  };
}

/** N 의 흘려 받는 앞 칸 이름(서버 talk.ts TALK_LEAD_READER_KEYS 의 heads — R1 응답 규격의 말 칸 say 앞 칸들). */
const LEAD_HEAD_KEYS: readonly string[] = TALK_LEAD_OUTPUT_FIELDS.slice(
  0,
  TALK_LEAD_OUTPUT_FIELDS.indexOf("say"),
);

/** 다 받은 응답의 앞 칸 값(서버 talk.ts headsOf 사본 — 흘려 받는 읽개가 말 칸 앞에서 넘기는 값과 같다). 글 · 참 거짓 값만. */
export function leadHeadsOf(prepared: unknown): LeadHeads {
  const out: Record<string, string | boolean> = {};
  if (prepared === null || typeof prepared !== "object") return out;
  const r = prepared as Record<string, unknown>;
  for (const key of LEAD_HEAD_KEYS) {
    const v = r[key];
    if (typeof v === "string" || typeof v === "boolean") out[key] = v;
  }
  return out;
}

/** 응답 글 → 다듬은 값(서버 talk.ts parsedAnswer 사본 — 글 블록을 이은 원문, 안 되면 답 글 하나). 읽지 못하면 undefined. */
function leadPreparedOf(message: TalkMessage): unknown {
  const joined = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  for (const text of [joined, answerTextOf(message)]) {
    try {
      return prepareAnswer(JSON.parse(text), []);
    } catch {
      // 다음 글로
    }
  }
  return undefined;
}

/**
 * 상황 줄이 든 턴의 뜻(서버 situationKoOf 사본 — 상황 줄로 바뀐 문장 · 반응 자리 상황 줄이 있을 때만, 아니면 null 로 옛 규칙에 맡긴다).
 */
function situationKoOf({
  koRaw,
  entries,
  fallback,
  ordered,
}: {
  koRaw: string | readonly string[] | null;
  entries: readonly Entry[];
  fallback: readonly Entry[];
  ordered: readonly Entry[];
}): { ko: string | null } | null {
  if (fallback.length === 0 && !entries.some((e) => e.ko !== undefined))
    return null;
  const kept = ordered.filter((e) => e.state !== "dropped");
  if (
    typeof koRaw !== "string" &&
    koRaw !== null &&
    koRaw.length === entries.length
  ) {
    const list = [
      ...fallback.map((e) => e.ko ?? ""),
      ...entries.map((e, i) => e.ko ?? koRaw[i] ?? ""),
    ];
    return {
      ko: toriKoShownOf({
        ko: list,
        sent: ordered.map((e) => e.en),
        shown: kept.map((e) => e.en),
        lowBand: true,
      }),
    };
  }
  if (kept.length > 0 && kept.every((e) => e.ko !== undefined)) {
    const joined = kept
      .map((e) => (e.ko ?? "").trim())
      .filter((k) => k !== "")
      .join(" ");
    return { ko: joined === "" ? null : joined };
  }
  return { ko: null };
}

/** 화면 글 문장에 그 낱말이 드는가(서버 keptHasWord 사본). */
function keptHasWord(kept: readonly string[], word: string): boolean {
  const lower = word.toLowerCase();
  return kept.some((s) =>
    tokenize(s).some(
      (t) => t.kind === "word" && t.text.toLowerCase() === lower,
    ),
  );
}

/** 선생님 행들의 move(차례대로 — 신호 말 셈 재료, 서버 teacherMovesOf 사본). */
function teacherMovesOf(turns: readonly TalkLessonTurn[]): (TalkMove | null)[] {
  return turns.flatMap((t) => (t.speaker === "teacher" ? [t.move] : []));
}

/** 선생님 행의 AI 질문 힌트(서버 talk_turns.aiQuestion 의 힌트 칸 — 다음 차례 힌트 단 재료). */
export type ObserveAiQuestion = { en: string } & AiHints;

export type Settled = {
  plan: TeacherTurnPlan;
  replaced: TalkSlotWhy | null;
  kept: string[];
  dropped: { en: string; reason: string }[];
  /** 상황 차례 검사로 상황 줄이 된 문장(AI 원문 → 상황 줄) · 반응 자리에 둔 상황 줄(ai null). */
  situation: { ai: string | null; en: string }[];
  attach: TeacherAttachLine[];
  ko: string | null;
  sound: { model?: string; choices?: [string, string] };
  move: TalkMove;
  text: string;
  rewrite: string;
  answerExample: string | null;
  /** 이 행이 남기는 AI 질문 힌트(서버 aiQuestion — 검사에 걸린 힌트는 비움). 질문이 남지 않았으면 null. */
  aiQuestion: ObserveAiQuestion | null;
  /** 1~3단계 신호 말 한 줄(뜻 줄 뒤 · 소리 줄 앞, text · rewrite 밖 — 서버 LessonTurnResult.cue). 없으면 null. */
  cue: { en: string; ko?: string } | null;
};

/**
 * 회화 턴 결과 → 선생님 행(서버 settleLessonTurn 사본 — 정한 것 5 · 18 · 19, 'AI 몫 넓힘' 묶음 2). 1~3단계 잡아 둔 물음표 문장의 질문 검사 ·
 * 같은 질문, 질문이 지워진 AI 차례의 카드 자리(둘째 인사는 카드 둘째 인사 질문), 1~3단계 소리 줄(카드 자리면 버림), 신호 말 · 겹침 지우기,
 * 반응이 다 지워진 상황 차례의 상황 줄, 겹침 없애기, 뜻 줄(상황 줄 뜻), move, 신호 말 한 줄. 응답이 없으면(실패) failLine 한 줄로 반응 자리를
 * 채운다(서버 'line' 길 — 주지 않으면 옛 길대로 카드 안전한 대사). 도구는 흘려 받지 않으므로 끊김(cut) 길은 없다.
 */
export function settleTurn({
  chosen,
  value,
  sentences,
  soundFixed,
  blockedSentences = 0,
  entries: givenEntries,
  needsQuestion = false,
  hintsBlocked = false,
  failLine,
  live = null,
  materials,
  turns,
  asked,
  max,
  lineOptions,
}: {
  chosen: TeacherTurnPlan;
  value: TalkLessonOutput | null;
  sentences: readonly string[];
  soundFixed: boolean;
  /** 문장 문(검사)에 걸려 바뀌거나 빠진 선생님 문장 수(서버 LessonOutcomeView.blocked). */
  blockedSentences?: number;
  /** 문장 문을 지난 문장(재질문을 이은 것 — 주면 sentences 대신 쓴다, 서버 withQuestionRetry 의 flow). */
  entries?: readonly Entry[];
  /** 통째 다시 쓰기에 실패해 앞 문장을 모두 지운 턴(서버 view.needsQuestion) — 질문이 없으면 카드 자리(fail). */
  needsQuestion?: boolean;
  /** 출력 검사가 힌트 칸을 걸렀다(서버 outcome.hintsBlocked — AI 질문 힌트를 남기지 않는다). */
  hintsBlocked?: boolean;
  /** 응답이 없는 턴의 반응 한 줄(observeFailLineOf). 없으면 카드 안전한 대사(옛 길). */
  failLine?: FailLine | null;
  /** 1~3단계 실시간 검사 · 끝 처리 재료(observeLiveOf). 없으면 신호 말 · 상황 줄이 없다(4단계부터 · 옛 시험). */
  live?: ObserveLive | null;
  materials: Pick<Materials, "card" | "spec">;
  turns: readonly TalkLessonTurn[];
  asked: ReadonlyMap<string, number>;
  max: number;
  lineOptions: LowLevelLineOptions | null;
}): Settled {
  const { card, spec } = materials;
  const low = spec.band === "1-3";
  const koMeaning = spec.koMeaning;
  const asks = chosen.kind === "ai" && chosen.aiAsks;
  const entries = givenEntries
    ? givenEntries.map((e) => ({ ...e }))
    : sentenceEntriesOf(sentences, chosen, {
        low,
        asked,
        max,
        live: live?.checks ?? null,
      });
  let why: TalkSlotWhy | null = null;
  const dropped: string[] = entries
    .filter((e) => e.state === "dropped" && e.reason === "same")
    .map((e) => e.en);
  if (dropped.length > 0) why = "same_question";
  // [M-r2-1] 1~3단계는 한 차례 질문 하나 — 잡아 둔 질문이 둘 이상이면 마지막 것만(core keepLastHeldQuestion)
  if (low)
    keepLastHeldQuestion(entries, (q) => {
      const o = lineOptions;
      return (
        value !== null &&
        o !== null &&
        o.childLines !== undefined &&
        questionEchoesChild(q, o.childLines, o.lemmaOf, value.next_targets)
      );
    });
  const heldQuestions = entries.filter((e) => e.state === "held" && e.question);
  if (heldQuestions.length > 0) {
    let fail: TalkSlotWhy | null = null;
    if (!value) fail = "cut";
    else if (lineOptions === null) fail = "question_check";
    else {
      const options = lineOptions;
      // 받침 둘째의 AI 질문 자리는 예 · 아니요 질문이나 고르기 답 둘이 딸린 질문만 받는다(서버와 같음 — 13절 C217 (2) (ㄴ), 다시 쓰기와 같은 판정)
      const easySlot = observeEasySlotOf(chosen, value, low);
      const ranged = heldQuestions.every(
        (q) =>
          checkLowLevelQuestion(q.en, {
            ...options,
            targets: value.next_targets,
            easySlot,
          }).ok,
      );
      const same = sameQuestionKeyHit({
        key: questionKeyOf(heldQuestions.at(-1)?.en ?? ""),
        blocked: chosen.blocked,
        asked,
        max,
      });
      fail = !ranged ? "question_check" : same ? "same_question" : null;
    }
    if (fail) {
      for (const q of heldQuestions) {
        q.state = "dropped";
        q.reason = fail === "same_question" ? "same" : "question";
        dropped.push(q.en);
      }
      why = why ?? (fail === "cut" ? null : fail);
    }
  }
  // 반응 자리에 앱이 고른 한 줄(응답 없는 턴 — 서버 'line' 길)
  const line: FailLine | null = value
    ? null
    : (failLine ?? { en: safeLineOf(card.safeLines, turns.length) });
  const lineEntries: Entry[] = line
    ? [
        {
          en: line.en,
          question: isQuestionSentence(line.en),
          cue: false,
          state: "held",
        },
      ]
    : [];
  const all = [...entries, ...lineEntries];
  const willKeep = (e: Entry) => e.state !== "dropped";
  const keptQuestion = all.some((e) => willKeep(e) && e.question && !e.cue);
  if (asks && !why) {
    if (line && !keptQuestion) why = "fail";
    else if (value && needsQuestion && !keptQuestion) why = "fail";
  }
  let plan = chosen;
  let replaced: TalkSlotWhy | null = null;
  // 재질문(C203 (3))은 부르는 쪽이 먼저 했다(retryOf → 재호출 → mergeQuestionRetry 로 이은 entries) — 여기서 다시 걸리면 카드 자리다
  if (asks && why) {
    const slot = chosen.greetingFallback
      ? greetingFallbackSlotOf(chosen, chosen.greetingFallback, why)
      : cardSlotOf(chosen, why, {
          card,
          turns,
          asked,
          max,
          low,
          koMeaning,
          dropped,
        });
    if (slot) {
      plan = slot;
      replaced = why;
    }
  }
  const questionDropped = asks && (dropped.length > 0 || replaced !== null);
  const sound: Settled["sound"] = {};
  if (value && low && plan.kind === "ai") {
    if (value.model_line !== "") sound.model = value.model_line;
    if (!questionDropped && value.choices.length === 2)
      sound.choices = [value.choices[0] ?? "", value.choices[1] ?? ""];
  }
  const hasSound =
    sound.model !== undefined ||
    sound.choices !== undefined ||
    plan.attach.some((l) => l.kind === "sound");
  // 소리 줄의 답 짝(서버 server/ai/talk.ts soundPairsOf 사본): 따라 할 말이 선택지 하나와 같은 말이면 따라 할 말 짝은 넣지 않는다
  const choicePairs: (readonly [string, string])[] = sound.choices
    ? [sound.choices]
    : [];
  const model = sound.model ?? "";
  const modelInChoices =
    model !== "" && choicePairs.length > 0 && sayingAnswer(model, choicePairs);
  const pairs: (readonly [string, string])[] = [
    ...(model !== "" && !modelInChoices ? [[model, model] as const] : []),
    ...choicePairs,
  ];
  for (const e of all) {
    if (e.state !== "held") continue;
    if (e.cue && !hasSound) {
      e.state = "dropped";
      e.reason = "question";
    } else if (!e.cue && pairs.length > 0 && sayingAnswer(e.en, pairs)) {
      e.state = "dropped";
      e.reason = "overlap";
    }
  }
  // 반응이 다 지워진 1~3단계 상황 차례는 상황 줄 하나를 반응 자리 맨 앞에 둔다(서버와 같음 — 성공 응답일 때만)
  const place = low ? situationPlaceOf(chosen) : null;
  const reacted = all.some((e) => willKeep(e) && !e.question);
  const fallbackLine =
    place !== null && live && value && !reacted
      ? situationLineOf(live.settle.situationLines, place, live.settle.turnNo, {
          sentences: all.filter((e) => willKeep(e)).map((e) => e.en),
          texts: teacherTextsOf(turns),
        })
      : null;
  const fallback: Entry[] = fallbackLine
    ? [
        {
          en: fallbackLine.en,
          question: false,
          cue: false,
          state: "held",
          ko: fallbackLine.ko,
        },
      ]
    : [];
  const ordered = [...fallback, ...all];
  const kept = ordered.filter(willKeep).map((e) => e.en);
  const attach = shownAttachOf(kept, plan.attach);
  // 뜻은 옛 한 글 꼴 · 문장마다 목록 꼴(13절 C202 (5)) 모두 받는다. 문장 문에 걸린 문장이 있는 응답은 걸린 문장의 뜻을 가려낼 수 없어 뜻을
  // 보이지 않는다. 상황 줄이 든 턴은 상황 줄 뜻으로 맞춘다(서버 situationKoOf)
  const koRaw: string | readonly string[] | null =
    value && blockedSentences > 0
      ? null
      : value && value.tori_ko.length > 0
        ? value.tori_ko
        : line?.ko !== undefined
          ? line.ko
          : null;
  const situationKo = situationKoOf({ koRaw, entries, fallback, ordered });
  const ko = !koMeaning
    ? null
    : situationKo
      ? situationKo.ko
      : toriKoShownOf({
          ko: koRaw,
          sent: ordered.map((e) => e.en),
          shown: kept,
          lowBand: low,
        });
  const keepNext = plan.kind === "ai" && !questionDropped;
  const ai: TeacherMoveAi = value
    ? {
        next: keepNext ? value.next_move : "none",
        ...(keepNext
          ? {
              item: { ...value.card_item },
              words: [...value.next_targets],
              goals: [...value.next_goal],
            }
          : { item: { ...NO_CARD_ITEM }, words: [], goals: [] }),
        intro: replaced
          ? value.new_words.filter((w) => keptHasWord(kept, w))
          : [...value.new_words],
        suggest: {
          fit: value.response_fit,
          topic: value.child_topic,
          asked: value.child_asked,
          goals: value.goal_suggest.map((g) => ({ id: g.goal, why: g.why_ko })),
        },
        ai: replaced ? "none" : value.support,
      }
    : {};
  const moveBase = teacherMoveOf(plan, ai);
  const move = talkMoveOf({
    ...moveBase,
    ...(soundFixed &&
    sound.model !== undefined &&
    !moveBase.app.includes("model_line")
      ? { app: [...moveBase.app, "model_line"] }
      : {}),
    ...(sound.model !== undefined || sound.choices !== undefined
      ? {
          sound: {
            ...(moveBase.sound ?? {}),
            ...(sound.model !== undefined ? { model: sound.model } : {}),
            ...(sound.choices !== undefined ? { choices: sound.choices } : {}),
          },
        }
      : {}),
  });
  const text = lessonTextOf(kept, attach);
  const turnQuestion = turnQuestionOf(text, move.kind);
  const asksNext = value !== null && keepNext && turnQuestion !== null;
  // 신호 말은 이 행 move 와 지난 선생님 행 move 로 다시 고른다(저장하지 않음 — plan 정한 것 6, 서버와 같은 core 함수)
  const cueSource = low ? (live?.settle.cue ?? null) : null;
  const cueLine = cueSource
    ? cueLineForTurn({
        prior: teacherMovesOf(turns),
        move,
        band: cueSource.band,
        file: cueSource.file,
      })
    : null;
  return {
    plan,
    replaced,
    kept,
    dropped: ordered
      .filter((e) => e.state === "dropped")
      .map((e) => ({ en: e.en, reason: e.reason ?? "" })),
    situation: [
      ...fallback.map((e) => ({ ai: null, en: e.en })),
      ...entries.flatMap((e) =>
        e.ai !== undefined && e.state !== "dropped"
          ? [{ ai: e.ai, en: e.en }]
          : [],
      ),
    ],
    attach,
    ko,
    sound,
    move,
    text,
    rewrite: talkLessonRewriteOf({
      sentSentences: kept,
      sound: {
        ...(sound.model !== undefined ? { modelLine: sound.model } : {}),
        ...(sound.choices !== undefined ? { choices: sound.choices } : {}),
      },
      appended: attach.flatMap((l) => ("en" in l ? [l.en] : [])),
    }),
    answerExample: asksNext && value ? value.next_answer_example : null,
    aiQuestion:
      asksNext && value && turnQuestion !== null
        ? {
            en: turnQuestion,
            ...(hintsBlocked
              ? { hintKo: "", hints: [], usable: [] }
              : {
                  hintKo: value.next_hint_ko,
                  hints: [...value.next_hints],
                  usable: [...value.next_usable_phrases],
                }),
          }
        : null,
    cue: cueLine ? cueLineView(cueLine, koMeaning) : null,
  };
}

/** 이 질문 자리를 연 선생님 행 차례(서버 slotOpenerIndex 사본). 없으면 -1. */
function slotOpenerIndex(
  turns: readonly TalkLessonTurn[],
  slot: TalkQuestionSlot | null,
): number {
  if (!slot) return -1;
  for (let i = turns.length - 1; i >= 0; i--) {
    const row = turns[i];
    if (row?.speaker !== "teacher") continue;
    const m = row.move;
    if (!m || m.kind === "closing_slot" || isSupportMove(m)) continue;
    return i;
  }
  return -1;
}

/** 처음 묻는 턴 · 다시 묻는 턴(서버 lessonAskKindOf 사본). */
function askKindOf(
  turns: readonly TalkLessonTurn[],
  slot: TalkQuestionSlot | null,
): AskKind {
  if (!slot || slot.words.length === 0) return "first";
  const opener = slotOpenerIndex(turns, slot);
  const before = new Set<string>();
  turns.slice(0, Math.max(0, opener)).forEach((row) => {
    if (row.speaker === "teacher" && row.move)
      for (const w of row.move.words) before.add(w);
  });
  return slot.words.some((w) => before.has(w)) ? "re_ask" : "first";
}

/**
 * 지금 질문 자리의 힌트 단(서버 lessonHintsAt 사본 — 카드 항목 · 1~3단계 장면 여는 질문(sceneHintItemOf) · 1~3단계 인사 질문(greetingHintItemOf) ·
 * 그 질문을 쓴 선생님 행의 AI 힌트 차례). aiQuestions 는 선생님 행 차례대로의 AI 질문 힌트(없는 행은 null).
 */
export function observeHintTiersOf({
  spec,
  card,
  turns,
  aiQuestions,
  slot,
}: {
  spec: TalkLevelSpec;
  card: TalkCard;
  turns: readonly TalkLessonTurn[];
  aiQuestions: readonly (ObserveAiQuestion | null)[];
  slot: TalkQuestionSlot | null;
}): HintTier[] {
  if (!slot) return [];
  const englishTiers = spec.hintTiers.filter((t) => t !== "ko");
  const cardItem =
    slot.item.kind === "none"
      ? null
      : ((slot.item.kind === "required" ? card.required : card.more).find(
          (x) => x.no === slot.item.no,
        ) ?? null);
  const opener = card.sceneOpener;
  const sceneItem: LessonHintItem | null =
    slot.scene === true && opener
      ? {
          hintKo: opener.hintKo,
          hints: englishTiers.map((t) =>
            t === "frame" ? (opener.frameEn ?? "") : opener.hintEn,
          ),
          usablePhrases: [],
        }
      : null;
  const greetingItem = ((): LessonHintItem | null => {
    if (slot.item.kind !== "none" || slot.question === null) return null;
    if (!("questions" in card.greeting)) return null;
    const key = cardQuestionKeyOf(slot.question);
    const q = card.greeting.questions.find(
      (g) => cardQuestionKeyOf(g.question.en) === key,
    );
    if (!q) return null;
    return {
      hintKo: q.hintKo,
      hints: englishTiers.map((t) =>
        t === "frame" ? (q.frameEn ?? "") : q.hintEn,
      ),
      usablePhrases: [],
    };
  })();
  const item = cardItem ?? sceneItem ?? greetingItem;
  const row =
    item || slot.question === null
      ? undefined
      : aiQuestions.findLast((r) => r?.en === slot.question);
  const ai =
    row && (row.hintKo !== "" || row.hints.length > 0 || row.usable.length > 0)
      ? { hintKo: row.hintKo, hints: row.hints, usable: row.usable }
      : undefined;
  return lessonHintTiersOf({
    spec,
    item,
    ai,
    askKind: askKindOf(turns, slot),
  });
}

/** 응답 → 정규화 값(서버 parsedAnswer · ai-contract evaluateCall 과 같은 길). raw 는 정규화 전(소리 줄 바뀜 판정). */
export function evaluateLessonMessage(
  message: CallResult & { ok: true },
  input: TalkLessonInput,
  rules: TalkLessonRules,
): {
  verdict: "strict" | "normalized" | "invalid";
  value: TalkLessonOutput | null;
  raw: unknown;
  /** 읽지 못한 까닭(not_json · talk-lesson talkLessonInvalidReasonOf — 판정 r1 I-3 (가)). 읽었으면 없음. */
  invalidReason?: string;
  /** 응답 글 블록을 이은 원문. */
  text?: string;
} {
  const spec = talkLessonTurnSpec;
  const content = message.message.content as readonly {
    type: string;
    text?: string;
  }[];
  const joined = content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  let prepared: unknown;
  for (const text of [joined, answerTextOf({ content })]) {
    try {
      prepared = prepareAnswer(JSON.parse(text), spec.enumPaths);
      break;
    } catch {
      // 다음 글로
    }
  }
  if (prepared === undefined)
    return {
      verdict: "invalid",
      value: null,
      raw: null,
      invalidReason: "not_json",
      text: joined,
    };
  const wire = spec.wireSchema(input, rules).safeParse(prepared);
  if (
    message.message.stop_reason === "end_turn" &&
    wire.success &&
    spec.validate(wire.data, input, rules).length === 0
  )
    return {
      verdict: "strict",
      value: spec.normalize(wire.data, input, rules),
      raw: prepared,
    };
  const value = spec.normalize(prepared, input, rules);
  // 읽지 못한 까닭: 정규화 까닭 · 엄격 규격(첫 걸린 칸) · 앱 확인 검사 · 채운 칸(판정 r1 I-3 — 어떤 칸이 어떤 값이었는지)
  const wireNote = wire.success
    ? `규격 통과 · 앱 확인 ${spec.validate(wire.data, input, rules).join(" / ") || "없음"}`
    : `규격 ${wire.error.issues[0]?.path.join(".") || "-"}:${wire.error.issues[0]?.code ?? "-"}`;
  return {
    verdict: value === null ? "invalid" : "normalized",
    value,
    raw: prepared,
    ...(value === null
      ? {
          invalidReason: `${talkLessonInvalidReasonOf(prepared) ?? "normalize_null"} · ${wireNote} · 채운 칸 ${filledFieldsOf(prepared)}`,
          text: joined,
        }
      : {}),
  };
}

/**
 * 읽지 못한 응답에서 빈 값이 아닌 칸과 그 값(판정 r1 I-3 — 어떤 칸이 어떤 값이었는지 표시 칸에 남긴다). 빈 글 · 'none' · 빈 목록 · 거짓 · 0 ·
 * 카드 항목 none 은 뺀다. 객체가 아니면 '-'.
 */
export function filledFieldsOf(raw: unknown): string {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return "-";
  const filled = Object.entries(raw as Record<string, unknown>).filter(
    ([, v]) =>
      !(
        v === "" ||
        v === "none" ||
        v === false ||
        v === 0 ||
        v === null ||
        (Array.isArray(v) && v.length === 0) ||
        (typeof v === "object" &&
          v !== null &&
          (v as { kind?: unknown }).kind === "none")
      ),
  );
  return filled.length === 0
    ? "없음"
    : filled.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" ");
}

const lightOf = (row: SimRow): TalkLessonTurn =>
  row.speaker === "tori"
    ? {
        speaker: "teacher",
        text: row.text,
        move: row.move,
        answerExample: row.answerExample,
      }
    : {
        speaker: "child",
        segment: row.segment,
        input: row.input,
        stuck: row.stuck,
        nospeech: row.nospeech,
        targets: [...row.targets],
        // 되물음 표지는 참인 행만 칸을 둔다(서버 state.ts lessonTurnOf — 새 엔진 길의 아이 행만 참일 수 있다)
        ...(row.askAgain === true ? { askAgain: true } : {}),
      };

const masker = createMasker({
  names: SAMPLE_NAMES,
  isVocabWord: () => false,
  contactPatterns: SAMPLE_CONTACT_PATTERNS,
});

/**
 * 한 차례에 같은 소리가 두 번 들리는가(자동 힌트, 검토 M-2): 읽는 줄 전부 — AI 선생님 문장 · 앱이 붙인 글 줄(카드 질문 · 답 예시 · 앱 대사,
 * 문장마다) · 소리 줄(따라 할 말 · 선택지 · 답 소리) — 가운데 정규화한 문장이 같은 것이 있거나, AI 문장이 소리 줄의 답을 담으면 참.
 */
export function sameSoundTwiceOf({
  kept,
  attach,
  sound,
}: {
  kept: readonly string[];
  attach: readonly TeacherAttachLine[];
  sound: Settled["sound"];
}): boolean {
  const soundLines = [
    ...(sound.model !== undefined ? [sound.model] : []),
    ...(sound.choices ?? []),
    ...attach.flatMap((l) => (l.kind === "sound" ? [l.en] : [])),
  ];
  const textLines = attach.flatMap((l) =>
    l.kind !== "sound" && "en" in l ? [l.en] : [],
  );
  const spoken = [...kept, ...textLines, ...soundLines]
    .flatMap(splitSentences)
    .map(normalizeSpoken)
    .filter((n) => n !== "");
  if (new Set(spoken).size < spoken.length) return true;
  const pairs = soundLines.map((l) => [l, l] as const);
  return pairs.length > 0 && kept.some((k) => sayingAnswer(k, pairs));
}

/** 선택 판정의 기대 값(대본) · 자동 힌트(이 턴의 사실로 셀 수 있는 것만, 나머지는 null — 사람이 본다). */
export function judgeOf({
  expect,
  move,
  kept,
  attach,
  ko,
  sound,
  spec,
  prevTeacher,
  lastChildSpoke,
  returned,
}: {
  expect: ObserveStep["expect"];
  move: TalkMove;
  kept: readonly string[];
  attach: readonly TeacherAttachLine[];
  ko: string | null;
  sound: Settled["sound"];
  spec: Pick<TalkLevelSpec, "koMeaning">;
  prevTeacher: TalkMove | null;
  lastChildSpoke: boolean;
  returned: string | null;
}): Record<JudgeKey, JudgeCell> {
  const text = lessonTextOf(kept, attach);
  const question = turnQuestionOf(text, move.kind);
  const answerSound = attach.flatMap((l) =>
    l.kind === "sound" || l.kind === "answer_example" ? [l.en] : [],
  );
  const soundLines = [
    ...(sound.model !== undefined ? [sound.model] : []),
    ...(sound.choices ?? []),
    ...answerSound,
  ].map(normalizeSpoken);
  const shown = [
    ...kept,
    ...attach.flatMap((l) => (l.kind === "question" ? [l.en] : [])),
  ];
  const cardQuestion =
    question !== null &&
    move.item.kind !== "none" &&
    (move.kind === "ai" || move.kind === "card_slot");
  const prevCard =
    prevTeacher !== null &&
    prevTeacher.item.kind !== "none" &&
    prevTeacher.stage === 0;
  const koLines = attach.filter((l) => l.kind === "question");
  const auto: Record<JudgeKey, boolean | null> = {
    followUp:
      move.kind === "ai" &&
      question !== null &&
      (move.next === "follow_up" || move.next === "follow_child"),
    // 앞 선생님 차례도 카드 질문이었고 아이가 말로 답했는데 이어 묻지 않고 카드 질문을 꺼낸 턴 — 사람이 맥락을 본다(의심 표시)
    contextlessCard:
      cardQuestion && prevCard && lastChildSpoke && move.stage === 0
        ? true
        : null,
    answerFirst: soundLines.length > 0,
    koMeaning: spec.koMeaning
      ? (kept.length === 0 || ko !== null) &&
        koLines.every((l) => l.kind === "question" && l.ko !== undefined)
      : null,
    sceneAssert: shown.some(isSceneAssert),
    sameSoundTwice: sameSoundTwiceOf({ kept, attach, sound }),
    returns: returned !== null,
    // 사람만 본다(검토 task-talk-quality-review-1 149줄 5): 막힘 판정은 턴 표 '갈래' 칸의 child_kind · 막힘 · 무름을 보고 적는다
    stuckRight: null,
    ownReaction: null,
  };
  return Object.fromEntries(
    JUDGE_KEYS.map((k) => [k, { expect: expect?.[k] ?? null, auto: auto[k] }]),
  ) as Record<JudgeKey, JudgeCell>;
}

// ── 이야기 방식 서버 배선 사본(이야기 방식 묶음 T1 — 회화 대화 구조 R plan 'T1', NFR-4 · AC-18) ─────────────────────────────
// 이야기 방식의 판단(요청 조립 · 사실 줄 · 응답 처리 · 소리 줄 · 기록 도출 · 두 판정)은 모두 core 함수를 그대로 부른다(아래 createTalkSim 의 chat 길).
// 여기 둔 것은 그 core 함수를 잇는 서버 배선 가운데 server-only 파일에 있어 이 도구가 가져올 수 없는 것의 사본이다(판단을 새로 쓰지 않고 원본 몸을
// 그대로 옮김). 원본과 같은 답을 내는지는 tests/unit/talk-observe-parity.test.ts 'AC-27r 서버 배선 사본이 서버 export 와 같다' 가 서버 export 와
// 맞대어 본다. 원본 자리: src/server/conversation/index.ts lessonStartModeOf · src/server/ai/talk.ts TALK_CHAT_READER_KEYS · chatListenCheckedOf ·
// chatSayChangesOf · chatOutcomeOf · talkChatSentUserMessageOf · src/server/conversation/chat-hint.ts chatDialogRowsOf · chatSayFromRowOf ·
// chatSaidSayLostOf · chatSaidSayOf · chatChildInputOf · chatHintInputOf · levelCallSpecOf · levelInputOf · src/server/conversation/chat-eval.ts
// chatEvalEntriesOf · chatEvalInputFor · chatEvalStateOf · chatEvalPendingOf · chatLessonSayLostOf · chatEvalFailureOf · chatJudgeRowsOf ·
// chatEvalWritesOf. 모두 DB 없는 순수 함수라 core 로 옮기면 사본이 없어진다(보고 task-chat-t1-report.md '서버와 같은 함수를 부르지 못한 자리').

/**
 * 이야기 방식 수업의 행(서버 talk_turns 행에서 서버 함수가 읽는 칸 — TalkTurnRow · chat-hint ChatTurnRowLike 와 같은 이름 · 꼴). 대본 도구의 행
 * (SimRow)을 이 꼴로 옮겨 서버 배선 사본 · core 함수에 넘긴다. id 는 '말한 쪽-차례 번호'다.
 */
export type ChatSimRow = {
  id: string;
  turnNo: number;
  segment: string;
  speaker: "child" | "tori";
  text: string | null;
  inputMode: string | null;
  hintKind: TalkHintKind | null;
  hintLevel: number | null;
  clientListen: unknown;
  sentUserMessage: string | null;
  toriRewrite: string | null;
  toriKo: string | null;
  aiQuestion: unknown;
  move: unknown;
  chatJudge: unknown;
  stuckPhrase: string | null;
  targetWords: string[] | null;
  askAgain: boolean | null;
  overLength: boolean | null;
};

/**
 * 처음 스냅숏에 적을 회화 방식(서버 index.ts lessonStartModeOf 사본): 설정이 chat 이면 넷(설정 · 1~3단계 구간 · 단원 재료 · 고른 선생님의 이야기 방식
 * 재료)이 모두 설 때만 chat, 하나라도 빠지면 app 이다. 설정이 app · claude 면 지금 판단(core leadStartModeOf) 그대로다.
 */
export function observeChatStartModeOf({
  mode,
  level,
  unit,
  teacher,
}: {
  mode: TalkLeadMode;
  level: number;
  unit: number;
  teacher: { chatPersonaEn?: string; chatFavoritesEn?: string } | null;
}): TalkLeadMode {
  if (mode !== "chat") return leadStartModeOf({ mode, level, unit });
  return chatStartAllowed({
    setting: true,
    lowBand: isChatSession({ start: { leadMode: "chat" }, level }),
    unitMaterial:
      (talkLeadTextOf(level, unit)?.chatTopicEn?.trim() ?? "") !== "",
    teacherMaterial: teacher !== null && chatMaterialOf(teacher) !== null,
  })
    ? "chat"
    : "app";
}

/** 이야기 방식의 흘려 받는 칸 이름(서버 talk.ts TALK_CHAT_READER_KEYS 사본 — 말 칸 say 와 그 앞의 글 칸 listen_sentence). */
const OBSERVE_CHAT_READER_KEYS: ToriEnReaderKeys = {
  sayKey: "say",
  heads: TALK_CHAT_OUTPUT_FIELDS.slice(
    0,
    TALK_CHAT_OUTPUT_FIELDS.indexOf("say"),
  ).map((key) => ({ key, kind: "string" as const })),
  requireHeads: true,
};

/** 따라 할 문장의 6.4 출력 검사(서버 talk.ts chatListenCheckedOf 사본): 걸리면 빈 글이다. */
export function observeChatListenCheckedOf(
  listen: string,
  forbidden: z.infer<typeof ForbiddenFileSchema>,
  sentenceMaxWords: number,
): string {
  if (listen === "") return "";
  const fields = talkChatCheckFields({
    say_ko: "",
    listen_sentence: listen,
  }).filter((field) => field.path === "listen_sentence");
  const hits = checkOutputFields(fields, { forbidden, sentenceMaxWords });
  return hits.has("listen_sentence") ? "" : listen;
}

/** 문장 문이 바꾸거나 지운 문장의 짝(서버 talk.ts chatSayChangesOf 사본). */
export function observeChatSayChangesOf(
  say: string,
  options: {
    forbidden: z.infer<typeof ForbiddenFileSchema>;
    metaPhrases: readonly string[];
    safeLine: string;
    sentenceMaxWords: number;
  },
): { changes: ChatSayChange[]; sent: string[] } {
  const gate = createToriSentenceGate(options);
  const changes: ChatSayChange[] = [];
  for (const sentence of splitSentences(say)) {
    const out = gate.accept(sentence);
    if (out !== sentence) changes.push({ from: sentence, to: out ?? "" });
  }
  return { changes, sent: gate.sent() };
}

/**
 * 저장할 sent_user_message(서버 talk.ts talkChatSentUserMessageOf 사본 — 요청 본문의 마지막 사용자 메시지 글, 규격의 가림을 지난 입력으로 만든 글). 가림은
 * 이 도구의 가림(시험용 이름 · 연락처 꼴)이다.
 */
export function observeChatSentUserMessageOf(input: TalkChatInput): string {
  return (
    talkChatMessages(talkChatTurnSpec.mask(input, masker)).at(-1)?.content ?? ""
  );
}

/** 서버 chat-hint.ts CHAT_DIALOG_SEGMENTS 사본(대화 호출이 도는 토막). */
const OBSERVE_CHAT_DIALOG_SEGMENTS: readonly string[] = [
  "greeting",
  "talk",
  "more_talk",
];

/** 대화 토막의 행만, 대화 차례로(서버 chat-hint.ts chatDialogRowsOf 사본). */
function observeChatDialogRowsOf<R extends ChatSimRow>(
  rows: readonly R[],
): R[] {
  return leadConversationOrder(
    rows.filter((row) => OBSERVE_CHAT_DIALOG_SEGMENTS.includes(row.segment)),
  );
}

/** 닫힌 뒤에도 남는 칸만으로 다시 세운 선생님 말(서버 chat-hint.ts chatSayFromRowOf 사본). */
function observeChatSayFromRowOf(
  row: Pick<ChatSimRow, "text" | "move">,
): string {
  const shown = ((row.text ?? "").split("\n")[0] ?? "").trim();
  const move = readTalkMove(row.move ?? null);
  const removed = move?.chat?.removed ?? move?.lead?.removed ?? [];
  return [shown, ...removed]
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join(" ");
}

/** 원문이 지워져 나간 말을 다시 세울 수 없는 선생님 행인가(서버 chat-hint.ts chatSaidSayLostOf 사본). */
export function observeChatSaidSayLostOf(
  row: Pick<ChatSimRow, "toriRewrite" | "move">,
): boolean {
  if (row.toriRewrite !== null) return false;
  const move = readTalkMove(row.move ?? null);
  const { chat, lead } = move ?? {};
  return (
    chat?.removed?.length === 0 ||
    chat?.listen?.sentence === "" ||
    lead?.removed?.length === 0 ||
    lead?.model?.sentence === ""
  );
}

/** 선생님 행의 나간 say 전체(서버 chat-hint.ts chatSaidSayOf 사본). */
function observeChatSaidSayOf(
  row: Pick<ChatSimRow, "toriRewrite" | "text" | "move">,
): string {
  if (row.toriRewrite !== null) {
    try {
      const parsed: unknown = JSON.parse(row.toriRewrite);
      const say = (parsed as { say?: unknown } | null)?.say;
      if (typeof say === "string") return say;
    } catch {
      // 아래 다시 세운 글로
    }
  }
  return observeChatSayFromRowOf(row);
}

/** 아이 행의 입력 갈래(서버 chat-hint.ts chatChildInputOf 사본). */
function observeChatChildInputOf(
  row: Pick<ChatSimRow, "inputMode" | "clientListen" | "text">,
): ChatHintChildInput {
  if (row.inputMode === "quiet") return { kind: "quiet" };
  if (row.inputMode === "dont_know") {
    const src = (row.clientListen as { src?: unknown } | null | undefined)?.src;
    return src === "nospeech" ? { kind: "not_heard" } : { kind: "dont_know" };
  }
  const heard = (row.text ?? "").trim();
  return heard === "" ? { kind: "not_heard" } : { kind: "speech", heard };
}

/** 힌트 호출 입력(서버 chat-hint.ts chatHintInputOf 사본). 그 선생님 행이 대화 토막에 없으면 null. */
export function observeChatHintInputOf({
  rows,
  teacherRowId,
  level,
  sentenceMaxWords,
  hintTiers,
  teacherNameEn,
}: {
  rows: readonly ChatSimRow[];
  teacherRowId: string;
  level: number;
  sentenceMaxWords: number;
  hintTiers: readonly ChatHintTierKind[];
  teacherNameEn: string;
}): TalkChatHintInput | null {
  const dialog = observeChatDialogRowsOf(rows);
  const at = dialog.findIndex(
    (row) => row.id === teacherRowId && row.speaker === "tori",
  );
  const teacher = dialog[at];
  if (teacher === undefined) return null;
  const context: ChatHintContextEntry[] = dialog
    .slice(0, at)
    .map((row) =>
      row.speaker === "tori"
        ? { speaker: "teacher", say: observeChatSaidSayOf(row) }
        : { speaker: "child", input: observeChatChildInputOf(row) },
    );
  return {
    level,
    sentenceMaxWords,
    hintTiers: [...hintTiers],
    teacherNameEn,
    say: observeChatSaidSayOf(teacher),
    context,
  };
}

/** 단계 맥락 칸을 덧댄 규격(서버 chat-hint.ts levelCallSpecOf 사본 — runAiCall 의 입력 꼴). */
function observeLevelCallSpecOf<I, O, R>(
  spec: CallSpec<I, O, R>,
): CallSpec<I & LevelContext, O, R> {
  return {
    ...spec,
    mask: (input, mask) => ({ ...input, ...spec.mask(input, mask) }),
  };
}

/** 입력에 단계 맥락 칸을 덧댄다(서버 chat-hint.ts levelInputOf 사본). */
function observeLevelInputOf<I extends object>(
  input: I,
  { level, sentenceMaxWords }: { level: number; sentenceMaxWords: number },
): I & LevelContext {
  return {
    canDo: "",
    learningElement: "",
    prevLearningElements: [],
    unitWords: [],
    ...input,
    level,
    sentenceMaxWords,
  } as I & LevelContext;
}

/** 대화 토막의 행 → 평가 호출의 기록 꼴(서버 chat-eval.ts chatEvalEntriesOf 사본). */
function observeChatEvalEntriesOf(rows: readonly ChatSimRow[]): {
  entries: ChatEvalEntry[];
  childAt: Map<string, number>;
} {
  const entries: ChatEvalEntry[] = [];
  const childAt = new Map<string, number>();
  for (const row of rows) {
    if (row.speaker === "child") {
      childAt.set(row.id, entries.length);
      entries.push({
        speaker: "child",
        message:
          row.sentUserMessage ?? chatInputLineOf(observeChatChildInputOf(row)),
      });
      continue;
    }
    if (row.sentUserMessage !== null)
      entries.push({ speaker: "child", message: row.sentUserMessage });
    entries.push({ speaker: "teacher", say: observeChatSaidSayOf(row) });
  }
  return { entries, childAt };
}

/** 아이 행 하나의 평가 입력(서버 chat-eval.ts chatEvalInputFor 사본). 대화 토막의 아이 행이 아니면 null. */
export function observeChatEvalInputOf({
  rows,
  childRowId,
  contextTurns,
  unitWords,
}: {
  rows: readonly ChatSimRow[];
  childRowId: string;
  contextTurns: number;
  unitWords: readonly string[];
}): TalkChatEvalInput | null {
  const { entries, childAt } = observeChatEvalEntriesOf(
    observeChatDialogRowsOf(rows),
  );
  const at = childAt.get(childRowId);
  if (at === undefined) return null;
  return talkChatEvalInputOf({ entries, at, contextTurns, unitWords });
}

/** 아이 행의 평가 상태(서버 chat-eval.ts chatEvalStateOf 사본). */
export function observeChatEvalStateOf(
  row: Pick<ChatSimRow, "chatJudge" | "inputMode" | "clientListen" | "text">,
): ChatEvalState {
  const judge = readChatJudge(row.chatJudge);
  if (judge !== null) {
    const { status, output, failure } = judge.legacy;
    if (status === "failed")
      return failure === undefined ? { status } : { status, failure };
    if (status !== "done") return { status };
    return output === null ? { status: "failed" } : { status: "done", output };
  }
  return chatEvalDueOf(observeChatChildInputOf(row))
    ? { status: "waiting" }
    : { status: "not_called" };
}

/** 아직 평가 값을 기다리는 아이 행인가(서버 chat-eval.ts chatEvalPendingOf 사본). */
function observeChatEvalPendingOf(row: ChatSimRow): boolean {
  return (
    row.speaker === "child" && observeChatEvalStateOf(row).status === "waiting"
  );
}

/** 원문이 지워진 수업인가(서버 chat-eval.ts chatLessonSayLostOf 사본). */
function observeChatLessonSayLostOf(rows: readonly ChatSimRow[]): boolean {
  return observeChatDialogRowsOf(rows).some(
    (row) => row.speaker === "tori" && observeChatSaidSayLostOf(row),
  );
}

/** AI 호출 실패 갈래 → 판정 없음의 까닭(서버 chat-eval.ts chatEvalFailureOf 사본 — 도구의 실패 갈래 이름으로 받는다). */
export function observeChatEvalFailureOf(reason: string): ChatEvalFailure {
  if (reason === "timeout") return "timeout";
  if (reason === "invalid" || reason === "output_blocked") return "invalid";
  return "other";
}

/** 판정 함수에 넘기는 행(서버 chat-eval.ts chatJudgeRowsOf 사본). */
export function observeChatJudgeRowsOf(
  rows: readonly ChatSimRow[],
  spec: ChatJudgeContext["spec"],
  override?: { id: string; state: ChatEvalState },
): { rows: ChatJudgeRow[]; ids: string[]; stored: Map<number, unknown> } {
  const dialog = observeChatDialogRowsOf(rows);
  const out: ChatJudgeRow[] = [];
  const ids: string[] = [];
  const stored = new Map<number, unknown>();
  let prevTeacher: ChatSimRow | null = null;
  for (const row of dialog) {
    ids.push(row.id);
    if (row.speaker === "tori") {
      const move = readTalkMove(row.move);
      const listen = move?.chat?.listen;
      out.push({
        role: "teacher",
        say: observeChatSayFromRowOf(row),
        listenSentence: listen?.inSay === true ? listen.sentence : null,
        explainShown: move?.chat?.explain === true,
        closing: move?.kind === "closing_slot",
        first: move?.kind === "first_question",
      });
      prevTeacher = row;
      continue;
    }
    const input: ChatJudgeInputKind = observeChatChildInputOf(row).kind;
    const tiers =
      prevTeacher === null
        ? []
        : (chatHintRecordOfRow(prevTeacher.aiQuestion, spec)?.tiers ?? []);
    stored.set(out.length, row.chatJudge);
    out.push({
      role: "child",
      input,
      heard: input === "speech" ? (row.text ?? "").trim() : "",
      opened: tiers.slice(0, row.hintLevel ?? 0).map((tier) => tier.kind),
      koHelp: null,
      eval:
        override !== undefined && override.id === row.id
          ? override.state
          : observeChatEvalStateOf(row),
    });
  }
  return { rows: out, ids, stored };
}

/** 새 평가 값의 쓰기(서버 chat-eval.ts chatEvalWritesOf 사본). 그 행이 기다림이 아니면 null(두 번 쓰지 않음). */
export function observeChatEvalWritesOf({
  rows,
  childRowId,
  state,
  ctx,
}: {
  rows: readonly ChatSimRow[];
  childRowId: string;
  state: ChatEvalState;
  ctx: ChatJudgeContext;
}): { id: string; judge: ChatJudge }[] | null {
  const target = rows.find(
    (row) => row.id === childRowId && row.speaker === "child",
  );
  if (target === undefined || !observeChatEvalPendingOf(target)) return null;
  if (observeChatLessonSayLostOf(rows)) return null;
  const judged = observeChatJudgeRowsOf(rows, ctx.spec, {
    id: childRowId,
    state,
  });
  if (!judged.ids.includes(childRowId)) return null;
  return chatJudgeChangesOf({
    rows: judged.rows,
    stored: judged.stored,
    ctx,
  }).map(({ row, judge }) => ({ id: judged.ids[row] ?? "", judge }));
}

/** 메모리 대화의 이어받을 상태(자리 재현 — snapshot 이 내고 createTalkSim 의 seed 가 받는다). */
export type SimSeed = {
  rows: SimRow[];
  segment: LessonArgs["segment"];
  prepWords: string[];
  prevContext: TalkLessonContext | null;
};

export type TalkSim = {
  readonly rows: readonly SimRow[];
  /** 지금 상태의 사본(자리 재현 — 이 상태에서 한 차례만 새로 받을 대화를 따로 만든다). */
  snapshot(): SimSeed;
  /**
   * 자리 재현: 준비한 차례의 아이 행과 실제 수업 기록의 선생님 행(anchor)을 AI 를 부르지 않고 깐다. 아이 행의 사용자 메시지는 이 코드가 그
   * 자리에서 만든 것이다(기록에 sent_user_message 가 없다 — 앞 턴 전문 재료).
   */
  lay(prepared: PreparedTurn, anchor: ObserveAnchor): void;
  /** 다음 대본 차례를 부를 준비. 흐름이 AI 를 부르지 않는 자리(마무리 고르기 · 닫힘 등)면 멈춘 까닭. */
  prepare(
    step: ObserveStep,
    stepIndex: number,
  ): { ok: true; turn: PreparedTurn } | { ok: false; reason: string };
  /**
   * 재질문(13절 C203 (3), 서버 withQuestionRetry 와 같은 판정): 성공 응답 · 질문을 쓰는 AI 차례 · 1~3단계에서 잡아 둔 질문이 검사에 걸리면
   * 다시 쓰게 할 요청(같은 입력 + 앞 tori_en · 다시 쓰기 메시지). 아니면 null. 한 턴에 한 번만 부른다.
   */
  retryOf(prepared: PreparedTurn, result: CallResult): RetryAsk | null;
  /** 결과(와 재질문 응답)를 받아 아이 행 · 선생님 행(과 뒤따르는 앱 차례)을 더하고 보고 한 줄을 돌려준다. */
  finish(
    prepared: PreparedTurn,
    result: CallResult,
    retry?: { ask: RetryAsk; result: CallResult },
  ): TurnRecord;
  /**
   * 아이 차례 앞에서 수업이 멈추는가(대화가 닫힘 · 고르기 차례 — prepare 가 먼저 보는 두 조건 그대로, 상태를 바꾸지 않음). choice 는 고르기 차례의
   * 갈래(마무리 물음 · 마무리 제안).
   */
  stopBefore(): {
    reason: string;
    choice: "closing" | "suggestion" | null;
  } | null;
  /**
   * 고르기 차례에서 '더 이야기하기'(서버 index.ts chooseLessonMoreTalk): 지금 방식은 앱이 더 이야기할 거리 하나를 카드 자리 행으로 붙이고
   * (lessonMoreOf), 새 엔진은 행 없이 토막만 바꾼 뒤 아이 말 없이 부르는 입구 more 를 연다(lessonMoreLeadOf — 다음 선생님 말은 lead.prepare 의
   * 입구 차례가 쓴다). 받지 않으면 까닭.
   */
  chooseMore():
    | { ok: true; mode: "app"; line: { en: string; ko?: string } }
    | { ok: true; mode: "claude" | "chat" }
    | { ok: false; reason: string };
  /** 새 엔진 길(talk.lead_mode claude — 회화 Claude 주도 묶음 X2). 처음 스냅숏이 app 이면 on 이 거짓이고 나머지는 부르지 않는다. */
  readonly lead: LeadSim;
  /** 이야기 방식 길(talk.lead_mode chat — 이야기 방식 묶음 T1). 처음 스냅숏이 chat 이 아니면 on 이 거짓이고 나머지는 부르지 않는다. */
  readonly chat: ChatSim;
};

// ── 이야기 방식 길의 꼴(묶음 T1) ───────────────────────────────────────

/**
 * 이야기 방식 차례를 연 것(서버 chat-turn.ts ChatEntry 의 갈래): 대본 차례의 아이 말 · 모름 단추 · 말소리 없음(아이 행) · 아이 말 없이 부르는 입구
 * 넷(start 수업 첫 말 · more 더 이야기하기 · back 짧은 준비 뒤 돌아옴 · quiet 조용함 — quiet 는 아이 행을 남김). hintOpened 는 화면이 다음 턴 요청에
 * 싣는 연 힌트 단 수, recognizer 는 그 턴 요청의 인식기 정보다.
 */
export type ChatSimEntry =
  | {
      kind: "child";
      step: ObserveStep;
      stepIndex: number;
      hintOpened?: number;
      recognizer?: ChatRecognizer;
    }
  | { kind: "open"; open: ChatOpen };

/** 이야기 방식 한 차례를 부를 준비(서버 chatTeacherTurn 의 (1)~(2): 입력 · 부르기 전 판단 · 요청 · 보낸 메시지). */
export type ChatPreparedTurn = {
  entry: ChatSimEntry;
  input: ChatInput;
  plan: ChatTurnPlan;
  /** 호출 전에 들어간 아이 행(서버 lesson-turn 이 넣은 행 · 조용함 입구의 quiet 행). 입구 start · more · back 은 null. */
  child: ChatSimRow | null;
  teacherTurnNo: number;
  segment: TalkTurnSegment;
  chatInput: TalkChatInput;
  /** 보낸 사용자 메시지(가린 뒤 — 서버 talkChatSentUserMessageOf 와 같은 글). */
  userMessage: string;
  request: PreparedTurn["request"];
  safeLine: string;
  check: ChatReplyCheck;
  hintOpened: number;
};

/** 이야기 방식 선생님 행(서버 꼴 + move 를 읽은 값). */
export type ChatSimTeacherRow = ChatSimRow & {
  move: TalkMove;
  overLength: boolean;
};
/** 이야기 방식 아이 행(서버 꼴 + 저장 때 쓰는 '말했다' 칸). */
export type ChatSimChildRow = ChatSimRow & {
  saidWords: string[];
  selfUsedWords: string[];
};

/**
 * 이야기 방식 한 차례의 결과(서버가 쓰는 줄 · 저장한 행 · 끝 줄). lines 는 서버 write 차례 그대로(흘린 문장 → 남은 문장 · 뜻 · 소리 줄), 안전 상한
 * 차례는 빈 목록이고 close 가 닫는 줄이다. signal 은 끝 줄의 chat 칸(닫힌 차례는 null). facts 는 붙인 사실 줄의 갈래, judge 는 아이 행의 첫 판정 기록.
 */
export type ChatTurnRecord = {
  entry: "child" | ChatOpen;
  no: number;
  lines: ChatReplayLine[];
  close: { reason: "safety"; farewell: { en: string; ko?: string } } | null;
  signal: ChatEndSignal | null;
  turnEnd: ChatTurnEnd;
  stage: number;
  run: number;
  facts: string[];
  teacher: ChatSimTeacherRow | null;
  child: ChatSimChildRow | null;
  judge: ChatJudge | null;
  met: string[];
  /** 흘린 줄과 응답 처리 글이 갈렸다(서버는 로그 한 줄 — 켜기 전 관문이 셈). */
  diverged: boolean;
  call: ChatCallResult;
  /** 응답 값(정규화 · 6.4 뒤). 응답이 없던 차례는 null. */
  value: TalkChatOutput | null;
  raw: unknown;
  usage: TurnUsage | null;
  failure: string | null;
  userMessage: string;
  /** 아이가 들은 영어(글 줄 · 소리 줄 · 닫는 줄을 줄마다). */
  heard: string;
};

/** 힌트 · 설명 요청 하나(서버 chatRevealOf → chatHintRun 의 갈래). */
export type ChatHintAsk =
  | { kind: "none" }
  | { kind: "stored"; record: ChatHintRecord }
  | { kind: "failed"; reason: string }
  | {
      kind: "call";
      explain: boolean;
      retry: number;
      teacherRowId: string;
      input: TalkChatHintInput;
      request: PreparedTurn["request"];
    };
export type ChatHintOutcome =
  | { ok: true; record: ChatHintRecord; usage: TurnUsage | null }
  | { ok: false; reason: string; usage: TurnUsage | null };

/** 평가 호출 하나(서버 runChatEval 의 입력 · 요청). */
export type ChatEvalAsk = {
  childRowId: string;
  input: TalkChatEvalInput;
  request: PreparedTurn["request"];
};

export type ChatSim = {
  /** 처음 스냅숏의 방식이 chat 이다(isChatSession — 조건 넷이 섬). */
  readonly on: boolean;
  /** 이야기 방식 설정(talk.chat_*). */
  readonly settings: TalkChatSettings;
  /** 인사 뒤 짧은 준비가 열리는 수업인가(처음 스냅숏의 준비 계획이 있음 — 돌아옴 입구가 한 번 온다). */
  readonly prepOpens: boolean;
  /** 지금 토막에서 이야기 방식이 선생님 차례를 만든다(인사 · 대화 · 더 이야기하기). */
  applies(): boolean;
  /** 앱이 아이 말 없이 부를 입구(수업 첫 말 start · 짧은 준비 뒤 back · 고른 뒤 more — core chatOpenAcceptsOf). 조용함은 화면 타이머가 정한다. */
  openDue(): Exclude<ChatOpen, "quiet"> | null;
  prepare(
    entry: ChatSimEntry,
  ): { ok: true; turn: ChatPreparedTurn } | { ok: false; reason: string };
  finish(prepared: ChatPreparedTurn, result: CallResult): ChatTurnRecord;
  /** 지금 행(서버 talk_turns 꼴, 쌓인 차례 그대로). */
  serverRows(): ChatSimRow[];
  /** 마지막 선생님 행의 힌트(explain 이면 막힌 뒤 설명) 요청. retry 는 다시 받기 번호(0 = 첫 누름). */
  hintAsk(kind: "hint" | "explain", retry?: number): ChatHintAsk;
  hintFinish(
    ask: Extract<ChatHintAsk, { kind: "call" }>,
    result: CallResult,
  ): ChatHintOutcome;
  /** 선생님 차례 n+1 뒤 평가할 아이 행(core chatEvalAfterTeacherOf — 기다림인 행만). */
  evalDue(): string | null;
  evalAsk(childRowId: string): ChatEvalAsk | null;
  evalFinish(
    ask: ChatEvalAsk,
    result: CallResult,
  ): { state: ChatEvalState; written: boolean; usage: TurnUsage | null };
  /** 닫을 때 남은 평가(core chatEvalOnCloseOf — 기다림인 말 입력 아이 행 전부). */
  closeEvalIds(): string[];
  /** 수업을 닫는다(구석 '그만하기' — 정리 토막으로). */
  close(): void;
  /**
   * 정리 토막의 되짚을 말(서버 lesson-turn.ts lessonWrapLinesOf 의 이야기 방식 갈래 — core chatWrapSourcesOf 의 따라 할 문장, 모자라면 카드 정리
   * 대사). 대본에서 셀 것 M-1(되짚을 말이 카드 정리 대사였던 수업)의 재료다.
   */
  wrapLines(): { en: string; ko?: string }[];
};

/** 새 엔진 차례를 연 것(서버 lead-turn.ts LeadEntry 의 두 갈래): 대본 차례의 아이 말 · 아이 말 없이 부르는 입구(대화 첫 차례 · 더 이야기하기). */
export type LeadSimEntry =
  | { kind: "child"; step: ObserveStep; stepIndex: number }
  | { kind: "open"; open: LeadOpen };

/** 새 엔진 아이 차례의 아이 행 재료(서버 lessonChildRowOf 와 같은 셈 — 호출 전 값). */
export type LeadSimChild = {
  /** 들린 글(가린 뒤). 단추 · 말소리 없음은 null. */
  text: string | null;
  mode: TalkInputMode;
  nospeech: boolean;
  segment: TalkTurnSegment;
  /** 아이 행 턴 번호(마지막 선생님 행의 번호 — 서버와 같음). */
  turnNo: number;
  hintKind: TalkHintKind;
  hintLevel: number;
  heardHelp: Exclude<TalkHeardHelp, "none"> | null;
  /** 연 힌트 단에 뜻 단이 들었다(hintKind 와 같은 기록 — 새 후보 판정 meaningHint, 검토 rev-r3 8 (나)). */
  meaningHint: boolean;
  targets: string[];
  /** 흐름 꼴(막힘 전 — 서버 lessonChildLiteOf). */
  lite: TalkLessonChildTurn;
};

/** 새 엔진 한 차례를 부를 준비(요청 · 사실 값 · 아이 행 재료). */
export type LeadPreparedTurn = {
  entry: LeadSimEntry;
  child: LeadSimChild | null;
  open: LeadOpen | null;
  /** 앱이 정한 마무리 차례(서버와 같은 때 — 말로 답한 차례만). */
  closing: boolean;
  /** 대화 토막의 첫 선생님 차례(인사 이음 · 대화 시작 줄). */
  first: boolean;
  /** 이 차례 선생님 행의 턴 번호 · 토막. */
  teacherTurnNo: number;
  segment: TalkTurnSegment;
  input: TalkLeadInput;
  rules: TalkLeadRules;
  /** 보낸 사용자 메시지(가린 뒤 — 아이 행 또는 입구 차례 선생님 행의 sent_user_message). */
  userMessage: string;
  request: PreparedTurn["request"];
  /** 문장 문이 걸린 문장 첫 자리를 바꿀 카드 안전한 대사. */
  safeLine: string;
  levelInput: LeadLevelInput;
  lineOptions: LowLevelLineOptions;
};

/** 좁은 정의 다시 말하기 한 번의 요청(서버 lead-turn.ts 의 runAiCall(talkLeadRetrySpec) 과 같은 입력). */
export type LeadRetryAsk = {
  target: { index: number; sentence: string; hits: LeadNarrowHit[] };
  prompt: string;
  input: TalkLeadRetryInput;
  request: PreparedTurn["request"];
};

/**
 * 아이가 들은 영어의 줄(보고의 heard): 받은 줄 차례 그대로 잇단 글 줄은 빈칸으로 이은 한 줄, 소리 줄 · 붙인 줄은 한 줄씩이다(글 사이에서 읽은 소리 줄은
 * 그 자리 — 13절 C241 보완 7. 소리 줄이 모두 글 뒤인 차례는 지난 꼴 '글 전부 → 소리 줄 → 붙인 줄' 그대로다). 되묻는 차례에 그대로 둔 앞 차례의
 * 소리 줄(kept)과 뜻 줄은 넣지 않는다.
 */
export function observeHeardLinesOf(
  lines: readonly (LeadLine | ChatReplayLine)[],
): string[] {
  const out: string[] = [];
  let text: string[] = [];
  const flush = () => {
    if (text.length > 0) out.push(text.join(" "));
    text = [];
  };
  for (const line of lines) {
    if (line.t === "s") text.push(line.en);
    else if (line.t === "sound") {
      if ("lead" in line && line.lead?.kept === true) continue;
      flush();
      out.push(line.say);
    } else if (line.t === "add") {
      flush();
      out.push(line.en);
    }
  }
  flush();
  return out.filter((l) => l.trim() !== "");
}

/** 아이에게 나간 줄 하나(서버 lead-turn.ts 가 write 로 흘려 보내는 줄과 같은 꼴 — 끝 줄 밖). */
export type LeadLine =
  | { t: "s"; en: string }
  | { t: "ko"; ko: string }
  | LeadSoundLine
  | { t: "add"; kind: "more_prompt"; en: string; ko?: string };

/** 새 엔진 한 차례의 결과(저장될 행의 칸 · 화면 줄 · 평가 입력 · 기록). */
export type LeadTurnRecord = {
  entry: "child" | LeadOpen;
  /** 대본 차례 번호(1부터, 입구 차례는 0). */
  no: number;
  lines: LeadLine[];
  /** 아이가 들은 영어(글 줄 → 소리 줄 → 상수 물음, 줄마다). */
  heard: string;
  teacher: {
    text: string;
    toriRewrite: string | null;
    toriKo: string | null;
    explanation: string | null;
    overLength: boolean;
    aiQuestion: LeadAiQuestion | null;
    move: TalkMove;
    sentUserMessage: string | null;
  };
  /** 아이 행의 칸(입구 차례는 null). 힌트 칸은 되물은 뒤 하한을 이어 받은 값이다. */
  child: {
    text: string | null;
    selfUsedWords: string[];
    saidWords: string[];
    stuckPhrase: string | null;
    sentUserMessage: string;
    askAgain: boolean;
    hintKind: TalkHintKind;
    hintLevel: number;
    heardHelp: Exclude<TalkHeardHelp, "none"> | null;
  } | null;
  /** '만났다'(나간 말 전체 — 서버 writeSay 의 met). */
  met: string[];
  closing: boolean;
  /** 마무리 차례인데 그 아이 말의 읽기가 막힘이었다(검토 rev-s1 M-4 — reading: 응답 읽기 칸 · effective: 지금 무름 뒤). */
  closingStuck: { reading: boolean; effective: boolean };
  /** 받아 둔 차례(첫 문장이 늦게 나감): 말 칸 전체(held_say) · 첫 문장부터 물음(held_question). */
  held: "say" | "question" | null;
  /** 좁은 정의 다시 말하기(설계 6): 걸린 질문 · 다시 받은 문장(받는 조건을 지나지 못하면 "") · 다시 걸림. 걸리지 않았으면 null. */
  narrow: {
    sentence: string;
    item: string;
    prompt: string;
    called: boolean;
    retry: string;
    again: boolean;
    /**
     * 서버라면 다시 말하기를 불렀는가(questionRetryFits — 본 호출 지연과 ai.timeout_seconds.realtime 으로 셈, 검토 rev-x2 M-3). 기록만 하고
     * 도구는 늘 부른다. 옛 기록에는 없다.
     */
    fits?: boolean;
  } | null;
  /** 응답 값(정규화 · 출력 검사 뒤). 응답이 없는 차례는 null. */
  value: TalkLeadOutput | null;
  /** 응답 원문을 다듬은 값(modelFirst — 읽지 못했으면 null). */
  raw: unknown;
  usage: TurnUsage | null;
  retryUsage: TurnUsage | null;
  /** 응답이 없는 차례의 까닭(그 밖은 null). */
  failure: string | null;
  userMessage: string;
};

export type LeadSim = {
  /** 처음 스냅숏의 방식이 claude 이고 단계가 새 방식의 구간이다(isLeadSession). */
  readonly on: boolean;
  /** 지금 토막에서 선생님 차례를 새 엔진이 만든다(leadTurnAppliesOf). */
  applies(): boolean;
  /** 아이 말 없이 부를 입구가 열렸는가(대화 첫 질문 차례면 start, 고르기 뒤면 more — core leadOpenAcceptsOf). */
  openDue(): LeadOpen | null;
  prepare(
    entry: LeadSimEntry,
  ): { ok: true; turn: LeadPreparedTurn } | { ok: false; reason: string };
  /** 응답의 말 칸에 좁은 정의에 걸린 질문이 있으면 다시 말하기 요청 하나(한 차례에 한 번), 아니면 null. */
  retryOf(prepared: LeadPreparedTurn, result: CallResult): LeadRetryAsk | null;
  /** 결과(와 다시 말하기 응답)로 선생님 행(과 아이 행)을 더하고 결과를 돌려준다. */
  finish(
    prepared: LeadPreparedTurn,
    result: CallResult,
    retry?: { ask: LeadRetryAsk; result: CallResult },
  ): LeadTurnRecord;
  /** 새 후보 판정의 행(대화 · 더 이야기하기 토막의 새 엔진 행, 대화 차례대로 — lead-candidate 입력 꼴). */
  candidateRows(): LeadCandidateRow[];
};

/** 걸림 한 건(까닭 · 걸린 낱말 — 질문 검사 까닭이거나 같은 질문 same_question). */
export type QuestionFailNote = {
  question: string;
  reason: string;
  words: string[];
};

/** 재질문 요청 하나(retryOf). */
export type RetryAsk = {
  /** question: 걸린 질문만 다시(C203 (3)) · rewrite: 막힘을 무른 턴을 통째로 다시(C204 (3), stuckRewriteNoteOf). */
  kind: "question" | "rewrite";
  fail: HeldQuestionFail | null;
  note: string;
  input: TalkLessonInput;
  request: PreparedTurn["request"];
};

/** 응답 하나를 읽은 값(정규화 · 출력 검사 · 걸린 칸 바꾸기 · 문장 문 — 서버 streamCore 끝 처리 흉내). */
type Evaluated = {
  value: TalkLessonOutput | null;
  /** 정규화 전 AI 의 stuck(앱이 무르기 전 — 정규화 effectiveStuckOf 뒤 값은 value.stuck). 읽지 못했으면 null. */
  aiStuck: boolean | null;
  sentences: string[];
  blocked: number;
  soundFixed: boolean;
  /** 출력 검사가 힌트 칸을 걸렀다(서버 outcome.hintsBlocked). */
  hintsBlocked: boolean;
  /** 응답이 거절(stop_reason refusal)로 끝났다(서버 '거절' 길 — 반응 자리는 카드 안전한 대사). */
  refusal: boolean;
  failure: string | null;
  /** 읽지 못한 응답의 원문(TurnRecord.rawOnFail). */
  rawOnFail?: string;
  /** 1~3단계 막힘 응답의 빈 tori_en 을 반응 지워진 막힘 차례로 받았다(core emptyToriEnStuckOf — 서버 ai_calls 까닭 empty_tori_en_stuck). */
  emptyStuck?: true;
  usage: TurnUsage | null;
};

/**
 * 메모리 세션(서버 TalkLessonState 의 흉내): 첫 인사(앱) 행으로 시작해 대본 차례마다 흐름 계획 → 호출 입력 → (결과) → 행을 더한다.
 * 인사 끝 차례 뒤에는 짧은 준비를 지난 것으로 보고(1~3단계 늘 — 카드 prep 낱말 전부를 보인 낱말로) 대화 첫 질문(앱) 행을 더한다.
 * 아이는 새 아이다: '안다' 단어 없음 · 친한 정도 0 · 지난 대화 요약 없음 · 이월 없음.
 */
export function createTalkSim(
  materials: Materials,
  values: Readonly<Record<string, unknown>>,
  book: ScriptConfig["book"],
  options: {
    /** 인사 뒤 짧은 준비에서 건너뛴 낱말(대본 prep.skipped — 만난 낱말에서 뺀다, 서버 lesson-input.ts skippedPrepWordsOf · 분석 A9). */
    skippedPrep?: readonly string[];
    /** 지난 대화 요약(대본 summaries — talk.memory_summaries 줄까지 넘긴다). */
    summaries?: readonly string[];
    /** 상황 줄 · 예 돌림에 섞는 대화마다 다른 값(서버 세션 id 자리 — 대본 이름 · 바퀴, 판정 r1 M-6). 없으면 턴 번호 그대로. */
    rotationKey?: string;
    /** 이어받을 메모리 상태(자리 재현 — 다른 대화의 snapshot). 주면 앱 첫 차례를 다시 더하지 않는다. */
    seed?: SimSeed;
    /** 이야기 방식 수업 시작 시각(수업 시작 줄의 요일 · 때 — 서버 요청 시각 자리). 없으면 지금. */
    chatAt?: Date;
    /** 이야기 방식 수업 시작 줄의 만남 수(같은 선생님과 정리까지 닫은 수업 수 — 서버 chatMetCountOf 자리). 없으면 0(새 아이). */
    chatMet?: number;
  } = {},
): TalkSim {
  const rotationKey = options.rotationKey ?? "";
  const { card, spec, level } = materials;
  const band = bandOf(level);
  const low = isLowBandLevel(level);
  // 동음이의어 묶음(서버와 같이 1~3단계만 — 4단계부터는 빈 묶음)
  const homophones = low ? materials.homophones : [];
  const settings = talkLessonSettingsFrom((k) => values[k], band);
  const rules = talkLessonTurnSpec.rulesOf(values, {
    level,
  } as TalkLessonInput);
  const reqConfig = requestConfigOf({ purpose: PURPOSE, level, values, book });
  const rows: SimRow[] = options.seed
    ? options.seed.rows.map((row) => ({ ...row }))
    : [];
  let segment: LessonArgs["segment"] = options.seed?.segment ?? "greeting";
  let prepWords: string[] = [...(options.seed?.prepWords ?? [])];
  // 처음 스냅숏의 짧은 준비 계획(서버 index.ts talk-start prepPlan — 늘 모드만, 새 아이라 '안다' · 이월 없음)
  const prepPlan =
    settings.prepMode === "always"
      ? startPrepWordsOf({
          card,
          carryWords: [],
          unitWords: materials.newWords,
          known: [],
          count: settings.prepWords,
        })
      : [];
  let prevContext: TalkLessonContext | null = options.seed?.prevContext ?? null;
  const summaries = summariesOf(options.summaries ?? [], values);
  // 처음 스냅숏의 회화 방식(서버 index.ts ensureLessonStarted — core leadStartModeOf: 설정이 claude · 새 방식의 단계 구간 · 그 단원의 안내문 글이
  // 있을 때만 claude). 그 뒤 판단은 이 값 하나로 한다(isLeadSession · leadTurnAppliesOf). 설정이 없거나 app 이면 지금 길 그대로다
  // 설정이 chat 이면 서버 index.ts lessonStartModeOf 와 같은 조건 넷(설정 · 1~3단계 · 단원 재료 · 선생님 재료)으로 chat · app 을 고른다(묶음 T1 —
  // app · claude 는 위 판단 그대로)
  const start = leadModeStartField(
    observeChatStartModeOf({
      mode: talkLeadModeOf(values[TALK_LEAD_MODE_KEY]),
      level,
      unit: materials.unit,
      teacher: materials.chatTeacher ?? null,
    }),
  );
  const leadOn = isLeadSession({ start, level });
  const chatOn = isChatSession({ start, level });

  // 흐름 꼴(서버 state.ts lessonFlowTurnsOf): 이야기 방식 수업만 quiet 행을 core chatFlowRowsOf 로 거른 뒤 흐름 꼴로 읽는다(서버와 같은 거름 함수)
  const lightTurns = () =>
    (chatOn
      ? chatFlowRowsOf(
          rows.map((row) => ({
            row,
            speaker: row.speaker,
            inputMode: row.speaker === "child" && row.quiet ? "quiet" : null,
          })),
        ).map(({ row }) => row)
      : rows
    ).map(lightOf);
  const argsOf = (): LessonArgs => ({
    spec,
    card,
    newWords: materials.newWords,
    turns: lightTurns(),
    segment,
    settings,
    prepWords,
  });
  const lastTori = () =>
    rows.findLast((r) => r.speaker === "tori") as
      | (SimRow & { speaker: "tori" })
      | undefined;
  const nextToriNo = () => (rows.at(-1)?.turnNo ?? 0) + 1;

  /** 앱 차례(첫 인사 · 대화 첫 질문 — AI 없음) 행을 더한다. 더한 글을 돌려준다. */
  const appendAppTurns = (): string[] => {
    const added: string[] = [];
    for (;;) {
      // 새 엔진 세션의 대화 토막은 카드 첫 질문 행을 붙이지 않는다(서버 index.ts lessonAdvanceLeadOf — 첫 질문은 입구 start 의 새 엔진 차례가 쓴다)
      if (leadTurnAppliesOf({ start, segment, level })) return added;
      // 이야기 방식 수업은 인사 · 대화 · 더 이야기하기에 카드 행을 넣지 않는다(서버 index.ts chatStepOf · lessonAdvanceChatOf — 수업 첫 말은 입구 start)
      if (chatOn && chatTurnSegmentOf(segment)) return added;
      const plan = nextTeacherTurnOf(argsOf());
      if (plan.kind !== "first_question" || plan.callsAi) return added;
      const text = lessonTextOf([], plan.attach);
      rows.push({
        speaker: "tori",
        turnNo: nextToriNo(),
        text,
        rewrite: talkLessonRewriteOf({
          sentSentences: [],
          appended: plan.attach.flatMap((l) => ("en" in l ? [l.en] : [])),
        }),
        move: teacherMoveOf(plan),
        answerExample: null,
        aiQuestion: null,
      });
      added.push(text.trim());
    }
  };
  if (!options.seed) appendAppTurns();

  const historyOf = () =>
    rows.flatMap((child) => {
      if (child.speaker !== "child" || child.sentUserMessage === null)
        return [];
      const tori = rows.find(
        (r) => r.speaker === "tori" && r.turnNo === child.turnNo + 1,
      );
      return tori && tori.speaker === "tori"
        ? [{ user: child.sentUserMessage, assistant: tori.rewrite }]
        : [];
    });
  const openingLine = () => {
    const first = rows.find((r) => r.speaker === "tori" && r.turnNo === 1);
    return first?.speaker === "tori"
      ? first.rewrite
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l !== "")
          .join(" ")
      : undefined;
  };
  const childWords = (extra: string) => {
    const out = new Set<string>();
    for (const text of [
      ...rows.flatMap((r) => (r.speaker === "child" && r.text ? [r.text] : [])),
      extra,
    ])
      for (const t of tokenize(text))
        if (t.kind === "word") out.add(t.text.toLowerCase());
    return [...out];
  };
  const contextNow = (): TalkLessonContext => {
    // 만난 낱말: 보인 준비 낱말 가운데 건너뛴 것은 뺀다(서버 lessonContextAt 이번 패치 판). 다시 묻는 낱말(reaskWordsOf)에는 그대로 둔다
    const skipped = options.skippedPrep ?? [];
    const met = new Set(prepWords.filter((w) => !skipped.includes(w)));
    for (const r of rows)
      if (r.speaker === "tori")
        for (const w of metWordsIn(r.text, {
          unitWords: materials.ctx.unitWords,
          lemmaOf: materials.lemmaOf,
        }))
          met.add(w);
    const unknownWords = [...materials.ctx.unitWords];
    return {
      unknownWords,
      metUnknownWords: unknownWords.filter((w) => met.has(w)),
      newWords: [...materials.newWords],
      friendship: 0,
      missionsDone: [],
    };
  };
  // 서버 lineOptionsOf 와 같은 core 함수(talkLineOptionsOf) — 1~3단계는 호출 입력과 같은 동음이의어 묶음을 넘겨, 노리는 단어 검사가 아이가 한두
  // 낱말 말로 한 낱말의 같은 소리 낱말까지 본다(13절 'C203 (1) · C217 보완 3' (2))
  const lineOptionsOf = (words: string[]): LowLevelLineOptions =>
    talkLineOptionsOf({
      sentenceMaxWords: materials.ctx.sentenceMaxWords,
      unitWords: materials.ctx.unitWords,
      teacher: materials.teacher,
      lineRange: {
        allowedWords: materials.allowedWords,
        forms: materials.forms,
        allowedForms: materials.allowedForms,
        childWords: words,
        reaskWords: [],
      },
      lemmaOf: materials.lemmaOf,
      ...(low ? { homophones } : {}),
    });
  /** 늦은 카드 답 판정 재료(서버 lateCardRowsOf 사본 — 선생님 행 move · 아이 행 인식 글). */
  const lateRowsNow = (): LateCardRow[] =>
    rows.map(
      (r): LateCardRow =>
        r.speaker === "child"
          ? { speaker: "child", text: r.text ?? "" }
          : { speaker: "teacher", text: r.text, move: r.move },
    );
  /** 1~3단계 질문 검사 재료(서버와 같이 이 대화의 아이 말을 함께 — 되묻는 질문 걸림, 판정 r1 I-6). childText 는 말 입력의 인식 글. */
  const lineOptionsFor = (childText: string | null): LowLevelLineOptions => ({
    ...lineOptionsOf(childWords(childText ?? "")),
    childLines: childLinesOf(lateRowsNow(), childText),
  });

  /** 회화 턴 요청 본문(앱 흐름과 같은 길 — 구조화 출력 형식 · 자동 캐시). */
  const requestOf = (input: TalkLessonInput): PreparedTurn["request"] => {
    const built = buildAiRequest(talkLessonTurnSpec, input, {
      config: reqConfig,
      masker,
      rules,
    });
    return {
      body: talkBodyOf(
        built.body as unknown as Record<string, unknown>,
        built.wireSchema,
      ),
      betas: built.betas,
      timeoutMs: built.timeoutMs,
      model: reqConfig.model,
      effort: reqConfig.effort,
      thinking: reqConfig.thinking.type,
    };
  };
  /** 응답 첫 칸 stuck 으로 고른 계획(말 입력이고 막힘이면 막힘 계획). */
  const chosenOf = (
    p: PreparedTurn,
    value: TalkLessonOutput | null,
  ): TeacherTurnPlan =>
    value?.stuck === true && p.mode === "speech" && p.ifStuck
      ? p.ifStuck
      : p.ifAnswered;
  /**
   * 앱이 막힘을 무른 말 입력 턴(13절 C204 (3)): AI 는 stuck 참이었는데 정규화(effectiveStuckOf)가 거짓으로 무름. 1~3단계면 서버처럼 이 응답
   * 문장을 하나도 보내지 않고 모두 잡아 두며(holdAll), 질문을 쓰는 차례면 통째로 다시 쓰게 한다(withQuestionRetry rewrite).
   */
  const overriddenOf = (p: PreparedTurn, e: Evaluated): boolean =>
    p.mode === "speech" && e.aiStuck === true && e.value?.stuck === false;
  /**
   * 통째 다시 쓰기로 잡아 두는 턴인가(서버와 같은 core createRewriteHold — 앱이 막힘을 물렀고 · 보낸 문장이 없고 · 1~3단계 범위를 읽었고 ·
   * 고른 계획이 질문을 쓰는 차례). 도구는 stuck 칸이 tori_en 앞이라 늘 '보낸 문장 없음'이다.
   */
  const holdsOf = (
    p: PreparedTurn,
    e: Evaluated,
    chosen: TeacherTurnPlan,
  ): boolean => {
    const hold = createRewriteHold({ low, rangeOk: true });
    hold.onStuck(overriddenOf(p, e), chosen.kind === "ai" && chosen.aiAsks);
    return hold.holding();
  };
  /**
   * 이 차례의 실시간 검사 · 끝 처리 재료(서버와 같은 배선 — 이번 아이 행 앞까지의 행, 이번 선생님 행 번호 = 마지막 선생님 행 번호 + 1, 질문
   * 검사와 같은 범위). 4단계부터 null.
   */
  const liveFor = (p: PreparedTurn): ObserveLive | null =>
    observeLiveOf(materials, {
      turns: lightTurns(),
      teacherTurnNo: (lastTori()?.turnNo ?? 0) + 1,
      lineOptions: lineOptionsFor(p.childText),
      rotationKey,
    });
  /** 들리지 않음 차례(1~3단계)는 응답의 판단 칸을 읽지 않는다(서버 heardFieldsBlankOf — AC-1 (가)). */
  const blankIfNotHeard = (
    p: PreparedTurn,
    value: TalkLessonOutput | null,
  ): TalkLessonOutput | null =>
    value && low && p.mode === "dont_know" && p.nospeech
      ? heardFieldsBlankOf(value)
      : value;
  /** 다시 쓰기에 실패한 잡아 둔 턴: 앞 응답 문장을 모두 지운다(서버 withQuestionRetry fallback droppedAll — 끝 처리가 카드 자리를 만든다). */
  const droppedAll = (list: readonly Entry[]): Entry[] =>
    list.map((e) => ({ ...e, state: "dropped" as const, reason: "rewrite" }));
  const heldAll = (list: readonly Entry[]): Entry[] =>
    list.map((e) =>
      e.state === "dropped" ? { ...e } : { ...e, state: "held" as const },
    );
  /** 응답 하나 읽기: 정규화 · 출력 검사 · 걸린 칸 바꾸기 · 문장 문(서버는 시도마다 새 문장 문). */
  const evaluateResult = (
    input: TalkLessonInput,
    model: string,
    result: CallResult,
  ): Evaluated => {
    if (!result.ok)
      return {
        value: null,
        aiStuck: null,
        sentences: [],
        blocked: 0,
        soundFixed: false,
        hintsBlocked: false,
        refusal: false,
        failure: `호출 실패 ${result.status} · ${result.detail}`,
        usage: null,
      };
    const evaluated = evaluateLessonMessage(result, input, rules);
    const cost = costOf(billedAttemptsOf(result.message, model), book);
    let hits = 0;
    let value: TalkLessonOutput | null = null;
    let sentences: string[] = [];
    let blocked = 0;
    let soundFixed = false;
    let hintsBlocked = false;
    if (evaluated.value !== null) {
      const checks = checkOutputFields(talkLessonCheckFields(evaluated.value), {
        forbidden: materials.forbidden,
        sentenceMaxWords: materials.ctx.sentenceMaxWords,
      });
      hits = checks.size;
      const checked = applyTalkLessonChecks(evaluated.value, checks, input);
      value = checked.value;
      hintsBlocked = checked.hintsBlocked;
      const raw = (evaluated.raw ?? {}) as { model_line?: unknown };
      const rawModel =
        typeof raw.model_line === "string" ? raw.model_line.trim() : "";
      soundFixed = rawModel !== "" && rawModel !== value.model_line;
      const gate = createToriSentenceGate({
        forbidden: materials.forbidden,
        metaPhrases: materials.metaPhrases,
        safeLine: safeLineOf(card.safeLines, input.history.length + 1),
        sentenceMaxWords: materials.ctx.sentenceMaxWords,
      });
      sentences = splitSentences(value.tori_en).flatMap((one) => {
        const out = gate.accept(one);
        return out === null ? [] : [out];
      });
      blocked = gate.blocked().length;
    }
    const rawStuck = (evaluated.raw as { stuck?: unknown } | null)?.stuck;
    return {
      value,
      aiStuck: typeof rawStuck === "boolean" ? rawStuck : null,
      sentences,
      blocked,
      soundFixed,
      hintsBlocked,
      refusal: result.message.stop_reason === "refusal",
      // 읽지 못한 까닭 · 멈춘 까닭을 표시 칸에, 원문은 JSON 보고에(판정 r1 I-3 (가))
      failure:
        evaluated.value === null
          ? `응답을 읽지 못함(${evaluated.verdict} · 까닭 ${evaluated.invalidReason ?? "-"} · stop ${result.message.stop_reason ?? "-"})`
          : null,
      ...(evaluated.value === null && evaluated.text !== undefined
        ? { rawOnFail: evaluated.text }
        : {}),
      ...(evaluated.value !== null && emptyToriEnStuckOf(evaluated.raw, false)
        ? { emptyStuck: true as const }
        : {}),
      usage: {
        model: result.message.model,
        stopReason: result.message.stop_reason ?? "",
        verdict: evaluated.verdict,
        inputTokens: cost.tokens.input,
        outputTokens: cost.tokens.output,
        cacheReadTokens: cost.tokens.cacheRead,
        cacheWriteTokens: cost.tokens.cacheWrite,
        costUsd: Number(formatUsd6(cost.costMicros)),
        latencyMs: result.latencyMs,
        firstSentenceMs: result.firstSentenceMs,
        requestId: result.requestId,
        checkHits: hits,
      },
    };
  };

  // ── 새 엔진 길(talk.lead_mode claude — 회화 Claude 주도 묶음 X2) ──────
  // 서버 src/server/conversation/lead-turn.ts leadTeacherTurn 과 같은 차례로 지난다. 판단은 core lead-turn-core · lead-* · talk-lead 의 함수를 그대로
  // 부르고(NFR-4), 여기는 행 흉내 · 부르는 차례(서버 배선)만 둔다. 서버 배선 가운데 server-only 라 부를 수 없는 자리는 위 '서버 배선 사본'과
  // 아래 주석의 '서버 lead-turn.ts:줄'이다(task-x2-report '확인할 것'). 응답은 다 받은 메시지 하나로 흘려 받기를 흉내 낸다(문장 차례 · 붙잡기 ·
  // 문장 문이 같다 — 시도 다시 보내기 · 다른 모델 다시 부르기 · 끊김은 흉내 내지 않는다).
  const leadText = talkLeadTextOf(level, materials.unit);
  let leadLexicon: ReturnType<typeof buildLexicon> | null = null;
  const leadLexiconOf = () => {
    leadLexicon ??= buildLexicon(materials.leadLexicon ?? []);
    return leadLexicon;
  };
  const leadAllowed = new Set(materials.talkLists.allowed.allowed);
  const sceneWords = talkSceneWordsOf({
    card,
    unitWords: materials.ctx.unitWords,
  });
  /** 대화 기록 · 사실 값이 읽는 행(서버 talk_turns 행과 같은 칸 — core LeadRowLike). 토막이 없는 선생님 행은 인사 토막의 지금 길 행이다. */
  const leadRowOf = (r: SimRow): LeadRowLike =>
    r.speaker === "tori"
      ? {
          speaker: "tori",
          turnNo: r.turnNo,
          segment: r.segment ?? "greeting",
          text: r.text,
          move: r.move,
          toriRewrite: r.rewrite === "" ? null : r.rewrite,
          sentUserMessage: r.sentUserMessage ?? null,
        }
      : {
          speaker: "child",
          turnNo: r.turnNo,
          segment: r.segment,
          text: r.text,
          sentUserMessage: r.sentUserMessage,
        };
  const leadRowsNow = (): LeadRowLike[] => rows.map(leadRowOf);
  const leadRequestOf = (
    spec_: typeof talkLeadTurnSpec | typeof talkLeadRetrySpec,
    input: TalkLeadInput | TalkLeadRetryInput,
    leadRules: TalkLeadRules,
  ): PreparedTurn["request"] => {
    const built = buildAiRequest(
      spec_ as typeof talkLeadRetrySpec,
      input as TalkLeadRetryInput,
      { config: reqConfig, masker, rules: leadRules },
    );
    return {
      body: talkBodyOf(
        built.body as unknown as Record<string, unknown>,
        built.wireSchema,
      ),
      betas: built.betas,
      timeoutMs: built.timeoutMs,
      model: reqConfig.model,
      effort: reqConfig.effort,
      thinking: reqConfig.thinking.type,
    };
  };
  const leadStuckOfReading = (p: LeadPreparedTurn, reading: unknown) =>
    p.child === null
      ? false
      : leadChildStuckOf({
          reading,
          mode: p.child.mode,
          heard: p.child.text ?? "",
          sceneWords,
          homophones,
        });
  const leadHitsOf = (p: LeadPreparedTurn) => (sentence: string) =>
    leadNarrowHitsOf(sentence, p.levelInput);
  /** 사용량(옛 길 evaluateResult 와 같은 셈 — 비용은 같은 단가표). */
  const leadUsageOf = (
    result: CallResult & { ok: true },
    model: string,
    verdict: TurnUsage["verdict"],
    checkHits: number,
  ): TurnUsage => {
    const cost = costOf(billedAttemptsOf(result.message, model), book);
    return {
      model: result.message.model,
      stopReason: result.message.stop_reason ?? "",
      verdict,
      inputTokens: cost.tokens.input,
      outputTokens: cost.tokens.output,
      cacheReadTokens: cost.tokens.cacheRead,
      cacheWriteTokens: cost.tokens.cacheWrite,
      costUsd: Number(formatUsd6(cost.costMicros)),
      latencyMs: result.latencyMs,
      firstSentenceMs: result.firstSentenceMs,
      requestId: result.requestId,
      checkHits,
    };
  };
  type LeadOutcome =
    | {
        ok: true;
        value: TalkLeadOutput;
        sentSentences: string[];
        blocked: string[];
        overLength: number;
        held: boolean;
      }
    | {
        ok: false;
        reason: "cut_after_first";
        sentSentences: string[];
        overLength: number;
      }
    | { ok: false; reason: "refusal" | "invalid" | "server" };
  /**
   * 응답 하나 읽기(서버 talk.ts streamCore · finishTalk 의 N 몫 흉내): 앞 칸 값으로 붙잡기를 묻고(leadHoldSayOf — 흐름에도 앞 칸을 넘김), 말 칸 문장을
   * 차례로 문장 문(createToriSentenceGate)에 지나 붙잡지 않은 시도면 흐름(createLeadSentenceFlow)에 넘긴다. 정규화 뒤 말 칸은 문장 문을 지난 글이고
   * 출력 검사는 applyTalkLeadChecks 다. 흐름 상태는 그대로 돌려준다(끝 처리가 앞서 나간 문장 수 · 붙잡음을 읽는다).
   */
  type LeadEvaluated = {
    outcome: LeadOutcome;
    flow: ReturnType<typeof createLeadSentenceFlow>;
    /** 흘려 받는 동안 바로 내보낸 문장(차례대로). */
    sent: string[];
    usage: TurnUsage | null;
    raw: unknown;
    failure: string | null;
  };
  const evaluateLead = (
    p: LeadPreparedTurn,
    result: CallResult,
  ): LeadEvaluated => {
    const flow = createLeadSentenceFlow({
      low,
      closing: p.closing,
      prevStuck: (heads) =>
        leadFlowPrevStuckOf({
          hasChild: p.child !== null,
          mode: p.child?.mode ?? "speech",
          nospeech: p.child?.nospeech ?? false,
          reading: heads.reading,
          heard: p.child?.text ?? "",
          sceneWords,
          homophones,
        }),
      hitsOf: leadHitsOf(p),
    });
    const sent: string[] = [];
    const none = (
      reason: "refusal" | "invalid" | "server",
      failure: string,
      usage: TurnUsage | null,
      raw: unknown,
    ): LeadEvaluated => ({
      outcome: { ok: false, reason },
      flow,
      sent,
      usage,
      raw,
      failure,
    });
    if (!result.ok)
      return none(
        "server",
        `호출 실패 ${result.status} · ${result.detail}`,
        null,
        null,
      );
    const prepared = leadPreparedOf(result.message);
    const stop = result.message.stop_reason ?? "";
    if (stop !== "end_turn")
      return none(
        stop === "refusal" ? "refusal" : "invalid",
        `응답이 끝나지 않음(stop ${stop || "-"})`,
        leadUsageOf(result, p.request.model, "invalid", 0),
        prepared ?? null,
      );
    const heads = leadHeadsOf(prepared);
    flow.heads(heads);
    const held = leadHoldSayOf(level)(heads);
    const gate = createToriSentenceGate({
      forbidden: materials.forbidden,
      metaPhrases: materials.metaPhrases,
      safeLine: p.safeLine,
      sentenceMaxWords: materials.ctx.sentenceMaxWords,
    });
    let emitted = 0;
    const say = (prepared as { say?: unknown } | undefined)?.say;
    if (typeof say === "string")
      for (const sentence of splitSentences(say)) {
        const out = gate.accept(sentence);
        if (out === null || held) continue;
        emitted += 1;
        if (flow.accept(out)) sent.push(out);
      }
    const wire = talkLeadTurnSpec
      .wireSchema(p.input, p.rules)
      .safeParse(prepared);
    const strict =
      prepared !== undefined &&
      wire.success &&
      talkLeadTurnSpec.validate(wire.data, p.input, p.rules).length === 0
        ? wire.data
        : null;
    const value = talkLeadTurnSpec.normalize(
      strict ?? prepared,
      p.input,
      p.rules,
    );
    if (value === null) {
      const usage = leadUsageOf(result, p.request.model, "invalid", 0);
      const failure = `응답을 읽지 못함(${prepared === undefined ? "not_json" : "normalize_null"})`;
      return emitted > 0
        ? {
            outcome: {
              ok: false as const,
              reason: "cut_after_first" as const,
              sentSentences: gate.sent(),
              overLength: gate.overLength(),
            },
            flow,
            sent,
            usage,
            raw: prepared ?? null,
            failure,
          }
        : none("invalid", failure, usage, prepared ?? null);
    }
    const shown: TalkLeadOutput = { ...value, say: gate.sent().join(" ") };
    const hits = checkOutputFields(talkLeadCheckFields(shown), {
      forbidden: materials.forbidden,
      sentenceMaxWords: materials.ctx.sentenceMaxWords,
    });
    const checked = applyTalkLeadChecks(shown, hits);
    return {
      outcome: {
        ok: true as const,
        value: checked.value,
        sentSentences: gate.sent(),
        blocked: [...gate.blocked()] as string[],
        overLength: gate.overLength(),
        held,
      },
      flow,
      sent,
      usage: leadUsageOf(
        result,
        p.request.model,
        strict === null ? "normalized" : "strict",
        hits.size,
      ),
      raw: prepared ?? null,
      failure: null,
    };
  };
  /** 다시 말하기 응답 읽기(서버 run.ts runAiCall 의 한 시도 흉내 — 거절 · 읽지 못함 · 출력 검사의 치명 걸림은 null). */
  const leadRetryAnswerOf = (
    ask: LeadRetryAsk,
    result: CallResult,
  ): { answer: string | null; usage: TurnUsage | null } => {
    if (!result.ok) return { answer: null, usage: null };
    const message = result.message;
    let prepared: unknown;
    try {
      prepared = prepareAnswer(
        JSON.parse(answerTextOf(message)),
        talkLeadRetrySpec.enumPaths,
      );
    } catch {
      prepared = undefined;
    }
    const rules_ = talkLeadRetrySpec.rulesOf(values, ask.input);
    const strictOk =
      message.stop_reason === "end_turn" &&
      prepared !== undefined &&
      talkLeadRetrySpec.wireSchema(ask.input, rules_).safeParse(prepared)
        .success;
    const value =
      message.stop_reason === "refusal" || prepared === undefined
        ? null
        : talkLeadRetrySpec.normalize(prepared, ask.input, rules_);
    if (value === null)
      return {
        answer: null,
        usage: leadUsageOf(result, ask.request.model, "invalid", 0),
      };
    const hits = checkOutputFields(talkLeadRetrySpec.checkFields(value), {
      forbidden: materials.forbidden,
      sentenceMaxWords: materials.ctx.sentenceMaxWords,
    });
    const checked = talkLeadRetrySpec.applyChecks(value, hits, ask.input);
    return {
      answer: checked.fatal ? null : checked.value.question,
      usage: leadUsageOf(
        result,
        ask.request.model,
        strictOk ? "strict" : "normalized",
        hits.size,
      ),
    };
  };
  /** 대본 차례의 아이 행 재료(서버 lessonChildRowOf · lessonChildLiteOf 와 같은 셈 — 옛 길 prepare 와 같은 core 함수). */
  const leadSimChildOf = (
    step: ObserveStep,
    position: ReturnType<typeof talkLessonPositionOf>,
    args: LessonArgs,
  ): LeadSimChild => {
    const mode: TalkInputMode = step.say === undefined ? "dont_know" : "speech";
    const nospeech = step.input === "nospeech";
    const lite = observeChildLiteOf(position, { mode, nospeech }, settings);
    const prev = lastTori();
    const heardHelps = [...new Set(heardHelpsOfMove(prev?.move ?? null, spec))];
    const tiers = observeHintTiersOf({
      spec,
      card,
      turns: args.turns,
      aiQuestions: rows.flatMap((r) =>
        r.speaker === "tori" ? [r.aiQuestion] : [],
      ),
      slot: position.slot,
    });
    const opened = openedTierCount({
      tiers,
      pressed: step.hintTier ?? 0,
      dontKnowCount: position.stuckInSlot,
    });
    const openedTiers = tiers.slice(0, opened);
    const help = heardHelpOf(heardHelps);
    return {
      text: mode === "speech" ? masker(step.say ?? "").text : null,
      mode,
      nospeech: lite.nospeech,
      segment: lite.segment === "greeting_end" ? "greeting" : lite.segment,
      turnNo: lastTori()?.turnNo ?? 0,
      hintKind:
        step.hint ?? hintKindOf({ opened: openedTiers, heard: heardHelps }),
      hintLevel: step.hint !== undefined ? (step.hintTier ?? 0) : opened,
      heardHelp: help === "none" ? null : help,
      meaningHint: openedTiers.some((t) => t.kind === "ko"),
      targets: [...lite.targets],
      lite,
    };
  };

  const lead: LeadSim = {
    on: leadOn,
    applies: () => leadTurnAppliesOf({ start, segment, level }),
    openDue() {
      if (!leadTurnAppliesOf({ start, segment, level })) return null;
      const pos = talkLessonPositionOf(argsOf());
      if (pos.closed || pos.lastRow !== "teacher") return null;
      for (const open of ["start", "more"] as const)
        if (
          leadOpenAcceptsOf(open, {
            segment,
            firstQuestionDue: pos.firstQuestionDue,
            choice: pos.choice,
          })
        )
          return open;
      return null;
    },
    prepare(entry) {
      if (!leadOn) return { ok: false, reason: "새 엔진 세션이 아니다" };
      const leadCefr = materials.leadCefr;
      if (leadText === null || !leadCefr || !materials.leadLexicon)
        return {
          ok: false,
          reason: "새 엔진 재료가 없다(안내문 글 · CEFR · 어휘 사전)",
        };
      if (!leadTurnAppliesOf({ start, segment, level }))
        return { ok: false, reason: `새 엔진 토막이 아니다(${segment})` };
      const args = argsOf();
      const position = talkLessonPositionOf(args);
      if (position.closed) return { ok: false, reason: "대화가 닫혔다" };
      if (position.lastRow !== "teacher")
        return { ok: false, reason: "선생님 차례 뒤가 아니다" };
      if (entry.kind === "open") {
        if (
          !leadOpenAcceptsOf(entry.open, {
            segment,
            firstQuestionDue: position.firstQuestionDue,
            choice: position.choice,
          })
        )
          return { ok: false, reason: `입구 ${entry.open} 를 받지 않는 때다` };
      } else if (position.choice !== null)
        return {
          ok: false,
          reason: `고르기 차례(${position.choice === "closing" ? "마무리 물음" : "마무리 제안"})에 닿아 멈춘다`,
        };
      else if (position.firstQuestionDue)
        return {
          ok: false,
          reason: "대화 첫 질문 차례다(입구 start 를 먼저 부른다)",
        };
      if (
        entry.kind === "child" &&
        (entry.step.input === "quiet" || entry.step.choose !== undefined)
      )
        return {
          ok: false,
          reason: "조용함 · 고르기 차례는 이야기 방식 수업에서만 받는다",
        };
      const child =
        entry.kind === "child"
          ? leadSimChildOf(entry.step, position, args)
          : null;
      const open = entry.kind === "open" ? entry.open : null;
      const mode = child?.mode ?? "speech";
      const nospeech = child?.nospeech ?? false;
      const speech = child !== null && mode === "speech";
      const heard = child?.text ?? "";
      // 마무리 물음을 꺼내는 때는 지금 그대로 앱이 정한다(core leadClosingTurnOf — 말로 답한 차례만, 막힘 없이 더한 위치)
      const closing = leadClosingTurnOf({
        speech,
        positionAfter: () =>
          talkLessonPositionOf({
            ...args,
            turns: [...args.turns, ...(child === null ? [] : [child.lite])],
          }),
      });
      const ordered = leadConversationOrder(leadRowsNow());
      const unitWords = materials.ctx.unitWords;
      // 범위 재료(서버 lesson-input.ts lessonRangeOf — 1~3단계 어휘 · 형태 · 이 대화의 아이 낱말 · 다시 묻는 낱말)
      const lineOptions = talkLineOptionsOf({
        sentenceMaxWords: materials.ctx.sentenceMaxWords,
        unitWords,
        teacher: materials.teacher,
        lineRange: {
          allowedWords: materials.allowedWords,
          forms: materials.forms,
          allowedForms: materials.allowedForms,
          childWords: childWords(heard),
          reaskWords: reaskWordsOf({
            turns: args.turns,
            prepWords,
            metBefore: [],
          }),
        },
        lemmaOf: materials.lemmaOf,
        homophones,
      });
      const levelInput: LeadLevelInput = {
        level,
        range: lineOptions,
        forms: materials.forms as readonly LeadFormRule[],
        lexicon: leadLexiconOf(),
        promptLines: [leadText.topicEn, leadText.sentencesLikeEn],
        allowed: leadAllowed,
        allowedLemmaOf: materials.allowedLemmaOf,
      };
      const history = leadHistoryOf(ordered);
      const first = leadFirstTurnOf(ordered);
      const status = leadStatusOf({
        rows: ordered,
        hasChild: child !== null,
        speech,
        heard,
        turnsLeft: position.turnsLeft,
        unitWords,
        homophones,
        soundAlikes: materials.soundAlikes,
        lemmaOf: materials.lemmaOf,
        open,
        closing,
      });
      const input: TalkLeadInput = {
        ...materials.ctx,
        teacher: materials.teacher,
        cefr: leadCefr,
        text: leadText,
        history,
        turn: {
          child:
            open !== null
              ? leadOpenChildOf(open)
              : leadChildOf({ mode, nospeech, heard }),
          ...(first ? { greeting: leadGreetingOf(ordered) } : {}),
          status,
        },
      };
      const leadRules = talkLeadTurnSpec.rulesOf(values, input);
      return {
        ok: true,
        turn: {
          entry,
          child,
          open,
          closing,
          first,
          teacherTurnNo:
            child !== null
              ? child.turnNo + 1
              : rows.reduce((max, r) => Math.max(max, r.turnNo), 0) + 1,
          segment: child?.segment ?? (segment as TalkTurnSegment),
          input,
          rules: leadRules,
          userMessage: talkLeadUserMessage(
            talkLeadTurnSpec.mask(input, masker).turn,
          ),
          request: leadRequestOf(talkLeadTurnSpec, input, leadRules),
          safeLine: safeLineOf(card.safeLines, history.length + 1),
          levelInput,
          lineOptions,
        },
      };
    },
    retryOf(p, result) {
      const e = evaluateLead(p, result);
      if (!e.outcome.ok) return null;
      const target = leadNarrowTargetOf(e.outcome.sentSentences, {
        closing: p.closing,
        move: e.outcome.value.move,
        hitsOf: leadHitsOf(p),
      });
      if (target === null) return null;
      const prompt = leadNarrowRetryPrompt(target.sentence, target.hits);
      const input: TalkLeadRetryInput = {
        ...p.input,
        retry: { assistant: JSON.stringify(e.outcome.value), prompt },
      };
      return {
        target,
        prompt,
        input,
        request: leadRequestOf(talkLeadRetrySpec, input, p.rules),
      };
    },
    finish(p, result, retry) {
      const e = evaluateLead(p, result);
      const { outcome, flow } = e;
      const child = p.child;
      const mode = child?.mode ?? "speech";
      const speech = child !== null && mode === "speech";
      const heard = child?.text ?? "";
      const args = argsOf();
      const position = talkLessonPositionOf(args);
      const unitWords = materials.ctx.unitWords;
      const lemmaOf = materials.lemmaOf;
      const liteOf = (stuck: boolean): TalkLessonChildTurn | null =>
        child === null
          ? null
          : { ...child.lite, stuck: child.mode === "speech" && stuck };
      const positionAfter = (lite: TalkLessonChildTurn) =>
        talkLessonPositionOf({ ...args, turns: [...args.turns, lite] });
      const ordered = leadConversationOrder(leadRowsNow());
      const prevTeacher = ordered.findLast((r) => r.speaker === "tori");
      const prevMove = readTalkMove(prevTeacher?.move);
      const askedChild = rows.findLast((r) => r.speaker === "child");
      // 되물은 뒤의 답(02-2 259줄 — core leadChildHelpAfterOf): 앞 선생님 행이 새 엔진의 되묻기면 되물은 아이 차례의 힌트 칸을 하한으로
      const helpArgs = {
        own: child === null ? null : leadChildHelpOfRow(child),
        prevMove,
        asked:
          askedChild?.speaker === "child"
            ? leadChildHelpOfRow(askedChild)
            : null,
      };
      const { help, fields: helpFields } = leadChildHelpAfterOf(helpArgs);
      // 뜻 힌트도 같은 하한으로 이어 받는다(hintKind 와 같은 기록에서 — 검토 rev-r3 8 (나) · rev-x2 M-6)
      const meaningHint =
        child !== null &&
        (child.meaningHint ||
          (leadAskAgainFloorApplies(helpArgs) &&
            askedChild?.speaker === "child" &&
            askedChild.meaningHint === true));
      const sentenceMax = teacherSentencesMaxOf(values, level);
      const lines: LeadLine[] = e.sent.map((en) => ({ t: "s", en }));
      const send = (en: string) => lines.push({ t: "s", en });
      const closingLine = (): LeadLine => ({
        t: "add",
        kind: "more_prompt",
        en: MORE_PROMPT.en,
        ...(spec.koMeaning ? { ko: MORE_PROMPT.ko } : {}),
      });
      // 응답이 없던 차례(move.lead 없는 행)의 소리 줄: 표지 없는 지금 꼴 — 글 뒤(서버 lead-turn.ts 와 같은 꼴). 응답이 있는 차례는 아래의 core
      // leadTurnLinesOf(고르기 물음 ask · 되묻는 차례의 kept · 글 사이의 소리 줄)
      const failedSoundLines = (s: { model?: string; answer?: string }) => {
        if (s.model !== undefined)
          lines.push({ t: "sound", kind: "model", say: s.model });
        if (s.answer !== undefined)
          lines.push({ t: "sound", kind: "answer", say: s.answer });
      };
      let teacher: LeadTurnRecord["teacher"];
      let childFields: LeadChildFields | null;
      let say: string;
      let closingAdded: boolean;
      let stuck = false;
      let value: TalkLeadOutput | null = null;
      let narrowLog: LeadTurnRecord["narrow"] = null;
      let retryUsage: TurnUsage | null = null;
      let held: LeadTurnRecord["held"] = null;
      let explanation: string | null = null;
      if (!outcome.ok) {
        // (4-가) 응답이 없는 차례(서버 lead-turn.ts:607-701 — 첫 문장 뒤 끊김은 보낸 문장 · 붙잡은 문장으로 닫고, 그 밖은 카드 안전한 대사)
        let shown: string[];
        let ko: string | null = null;
        let sound: { model?: string; answer?: string } = {};
        if (outcome.reason === "cut_after_first") {
          const cutMove = flow.move();
          if (cutMove === undefined) {
            shown = outcome.sentSentences.slice(0, flow.sentCount());
          } else {
            const cut = leadSettleOf({
              level,
              move: cutMove,
              prevStuck: flow.prevStuck(),
              closing: p.closing,
              modelSentence: "",
              sentences: outcome.sentSentences,
              sentCount: flow.sentCount(),
              held: false,
              narrow: null,
            });
            for (const en of cut.release) send(en);
            shown = cut.shown;
            sound = cut.sound;
          }
        } else {
          const view = observeFailLineOf({
            low,
            koMeaning: spec.koMeaning,
            card,
            refusal: outcome.reason === "refusal",
            situation: null,
            safeLine: p.safeLine,
            childTurnNo: child?.turnNo ?? p.teacherTurnNo,
          });
          send(view.en);
          ko = view.ko ?? null;
          shown = [view.en];
        }
        if (ko !== null) lines.push({ t: "ko", ko });
        failedSoundLines(sound);
        say = shown.join(" ");
        closingAdded = leadClosingAddsOf({ closing: p.closing, say });
        if (closingAdded) lines.push(closingLine());
        const lite = liteOf(false);
        teacher = {
          text: [say, ...(closingAdded ? [MORE_PROMPT.en] : [])].join("\n"),
          toriRewrite: null,
          toriKo: ko,
          explanation: null,
          overLength: observeOverLengthOf({
            words:
              outcome.reason === "cut_after_first" ? outcome.overLength : 0,
            sentences: shown.length,
            max: sentenceMax,
          }),
          aiQuestion: null,
          move: leadMoveWithSound(
            talkMoveOf({
              kind: leadFailedMoveKindOf({ closing: p.closing, open: p.open }),
              cause: lite === null ? null : childCauseOf(lite),
            }),
            sound,
          ),
          sentUserMessage: child === null ? p.userMessage : null,
        };
        childFields =
          child === null
            ? null
            : leadChildFieldsOf({
                speech,
                childUsedOnOwn: [],
                said: [],
                stuck: false,
                heard,
                sentUserMessage: p.userMessage,
                askAgain: false,
                helpFields,
              });
      } else {
        // (4-나) 응답이 있는 차례(서버 lead-turn.ts:704-941)
        value = outcome.value;
        stuck = leadStuckOfReading(p, value.reading);
        const lite = liteOf(stuck);
        const prevStuck = lite === null ? false : leadPrevStuckOf(lite);
        const sentences = outcome.sentSentences;
        const target = leadNarrowTargetOf(sentences, {
          closing: p.closing,
          move: value.move,
          hitsOf: leadHitsOf(p),
        });
        let narrow: { index: number; sentence: string } | null = null;
        let narrowRecord: LeadExtra["narrow"];
        if (target !== null) {
          // 서버는 시간 예산(questionRetryFits)이 남을 때만 부른다 — 도구는 retry 가 주어졌으면 부른 것으로 본다
          const answered = retry
            ? leadRetryAnswerOf(retry.ask, retry.result)
            : null;
          retryUsage = answered?.usage ?? null;
          const decided = leadNarrowOutcomeOf({
            original: target.sentence,
            received: answered?.answer ?? null,
            input: p.levelInput,
            passes: (sentence) =>
              checkToriSentence(sentence, {
                forbidden: materials.forbidden,
                metaPhrases: materials.metaPhrases,
              }).ok,
          });
          narrow = { index: target.index, sentence: decided.sentence };
          narrowRecord = {
            item: leadNarrowItemOf(target.hits),
            retry: decided.retry,
            again: decided.again,
            ms: retry ? Math.max(0, retry.result.latencyMs) : 0,
          };
          narrowLog = {
            sentence: target.sentence,
            item: narrowRecord.item,
            prompt: leadNarrowRetryPrompt(target.sentence, target.hits),
            called: retry !== undefined,
            retry: decided.retry,
            again: decided.again,
            fits: observeQuestionRetryFits({
              elapsedMs: Math.max(0, result.latencyMs),
              timeoutMs:
                (values["ai.timeout_seconds.realtime"] as number) *
                OBSERVE_MS_PER_SECOND,
            }),
          };
        }
        const settled = leadSettleOf({
          level,
          move: value.move,
          prevStuck,
          closing: p.closing,
          modelSentence: value.model_sentence,
          sentences,
          sentCount: flow.sentCount(),
          held: outcome.held,
          narrow,
        });
        // (5) 줄: 남은 글 문장(소리 줄은 뺀 자리에서 — 13절 C241 보완 7) → 뜻 → 글 뒤의 소리 줄 · 그대로 둔 앞 차례 줄 → 마무리 상수(서버
        // lead-turn.ts 와 같은 core leadTurnLinesOf)
        const ko = spec.koMeaning
          ? leadKoLineOf(level, value.say_ko).trim()
          : "";
        lines.push(
          ...leadTurnLinesOf({
            lines: settled.lines,
            sound: settled.sound,
            kept: leadKeptSoundOf({
              level,
              move: value.move,
              hasChild: child !== null,
              own: settled.sound,
              prevMove,
              rows: ordered,
            }),
            ko,
          }),
        );
        say = settled.say;
        closingAdded = leadClosingAddsOf({ closing: p.closing, say });
        if (closingAdded) lines.push(closingLine());
        // (6) 기록: 힌트 재료 · 넓은 검사 · gate · 기록 칸(core leadHintsOf · leadGateOf · leadExtraOf — 서버 턴 길과 같은 함수)
        const { hintBlock, aiHints } = leadHintsOf({
          output: value,
          range: p.levelInput,
          check: {
            forbidden: materials.forbidden,
            sentenceMaxWords: materials.ctx.sentenceMaxWords,
          },
          spec,
          unitWords,
          lemmaOf,
        });
        const wide = leadWideCheckOf(settled.say, {
          range: p.lineOptions,
          extra: {
            allowed: leadAllowed,
            allowedLemmaOf: materials.allowedLemmaOf,
          },
          sentenceMax,
          same: {
            blocked: [],
            asked: position.askedQuestions,
            max: settings.sameQuestionMax,
          },
        });
        const gate = leadGateOf({
          blocked: outcome.blocked,
          heldSay: outcome.held,
          flowHeld: flow.held(),
          sentCount: flow.sentCount(),
          hintBlock,
          rangeUnread: false,
        });
        held = gate.includes("held_say")
          ? "say"
          : gate.includes("held_question")
            ? "question"
            : null;
        const extra = leadExtraOf({
          narrow: narrowRecord,
          wide,
          gate,
          closingAdded,
          removed: settled.removed,
          soundMoved: settled.soundMoved,
          soundAt: settled.soundAt,
        });
        const move = leadMoveWithSound(
          leadTeacherMoveOf({
            response: {
              reading: value.reading,
              move: value.move,
              say: settled.say,
              model_sentence: value.model_sentence,
            },
            prevChild: lite,
            spec,
            closingSlot: p.closing,
            firstQuestion: p.open === "start",
            unitWords,
            lemmaOf,
            extra,
          }),
          settled.sound,
        );
        const teacherText = [
          settled.shown.join(" "),
          ...(closingAdded ? [MORE_PROMPT.en] : []),
        ].join("\n");
        explanation = leadExplanationOf({
          child: lite,
          stuckInSlot: () =>
            lite === null ? 0 : positionAfter(lite).stuckInSlot,
          spec,
          level,
          hintKo: value.hint_ko,
        });
        const { askAgain, said } = leadSaidOf({
          hasChild: child !== null,
          move: value.move,
          help,
          candidates: value.child_used_on_own,
          heard,
          speech,
          stuck,
          unitWords,
          lemmaOf,
          homophones,
        });
        teacher = {
          text: teacherText,
          toriRewrite: talkLeadAssistantOf(JSON.stringify(value), settled.say),
          toriKo: ko === "" ? null : ko,
          explanation,
          overLength: observeOverLengthOf({
            words: outcome.overLength,
            sentences: sentences.length,
            max: sentenceMax,
          }),
          aiQuestion: leadAiQuestionOf({
            question: turnQuestionOf(teacherText, move.kind),
            ko,
            hintEn: value.hint_en,
            hints: aiHints,
          }),
          move,
          sentUserMessage: child === null ? p.userMessage : null,
        };
        childFields =
          child === null
            ? null
            : leadChildFieldsOf({
                speech,
                childUsedOnOwn: value.child_used_on_own,
                said,
                stuck,
                heard,
                sentUserMessage: p.userMessage,
                askAgain,
                helpFields,
              });
      }
      // 행 저장(서버 saveLeadTurn — 아이 행은 호출 전에 들어가 있고 끝에 칸을 채운다, 입구 차례는 아이 행이 없다)
      // 아이 행의 힌트 칸: 호출 전 값에 되물은 뒤 하한이 바꾼 칸만 덮는다(서버 update — helpFields)
      const childHelp =
        child === null
          ? null
          : {
              hintKind: childFields?.hintKind ?? child.hintKind,
              hintLevel: childFields?.hintLevel ?? child.hintLevel,
              heardHelp:
                childFields?.heardHelp === undefined
                  ? child.heardHelp
                  : childFields.heardHelp,
            };
      if (child !== null && childFields !== null && childHelp !== null)
        rows.push({
          speaker: "child",
          turnNo: child.turnNo,
          segment: child.segment,
          text: child.text,
          input: child.mode,
          nospeech: child.nospeech,
          stuck: childFields.stuckPhrase !== null,
          targets: [...child.targets],
          sentUserMessage: p.userMessage,
          hintKind: childHelp.hintKind,
          hintLevel: childHelp.hintLevel,
          heardHelp: childHelp.heardHelp,
          meaningHint,
          selfUsedWords: [...childFields.selfUsedWords],
          saidWords: [...childFields.saidWords],
          ...(childFields.askAgain ? { askAgain: true } : {}),
        });
      const aq = teacher.aiQuestion;
      rows.push({
        speaker: "tori",
        turnNo: p.teacherTurnNo,
        text: teacher.text,
        rewrite: teacher.toriRewrite ?? "",
        move: teacher.move,
        // 서버 state.ts lessonTurnOf 와 같이 AI 질문의 답 예시(빈 글은 없음)
        answerExample: aq && aq.answerExample !== "" ? aq.answerExample : null,
        aiQuestion: aq
          ? {
              en: aq.en,
              hintKo: aq.hintKo ?? "",
              hints: [...(aq.hints ?? [])],
              usable: [],
            }
          : null,
        segment: p.segment,
        sentUserMessage: teacher.sentUserMessage,
        explanation: teacher.explanation,
        toriKo: teacher.toriKo,
      });
      // 들은 영어: 줄 차례 그대로(글 사이의 소리 줄도 제자리 — 13절 C241 보완 7). 되묻는 차례에 그대로 둔 앞 차례의 소리 줄(kept)은 저절로
      // 읽지 않으므로 들은 영어가 아니다(화면 lessonSpokenItemsOf 와 같음)
      const heardLines = observeHeardLinesOf(lines);
      const reading = value?.reading;
      return {
        entry: p.open ?? "child",
        no: p.entry.kind === "child" ? p.entry.stepIndex + 1 : 0,
        lines,
        heard: heardLines.join("\n"),
        teacher,
        child:
          child === null || childFields === null || childHelp === null
            ? null
            : {
                text: child.text,
                selfUsedWords: [...childFields.selfUsedWords],
                saidWords: [...childFields.saidWords],
                stuckPhrase: childFields.stuckPhrase,
                sentUserMessage: childFields.sentUserMessage,
                askAgain: childFields.askAgain === true,
                ...childHelp,
              },
        met: metWordsIn(say, { unitWords, lemmaOf }),
        closing: p.closing,
        closingStuck: {
          reading:
            p.closing &&
            reading !== undefined &&
            LEAD_STUCK_READINGS.has(reading),
          effective: p.closing && stuck,
        },
        held,
        narrow: narrowLog,
        value,
        raw: e.raw,
        usage: e.usage,
        retryUsage,
        failure: e.failure,
        userMessage: p.userMessage,
      };
    },
    candidateRows() {
      const ordered = leadConversationOrder(
        rows.map((row) => ({
          ...leadRowOf(row),
          row,
        })),
      ).filter((r) => r.segment === "talk" || r.segment === "more_talk");
      return ordered.flatMap((r, i): LeadCandidateRow[] => {
        const row = r.row;
        if (row.speaker === "tori") {
          const lead_ = row.move.lead;
          let say = row.text.split("\n")[0] ?? "";
          if (lead_ && row.rewrite !== "")
            try {
              const parsed = JSON.parse(row.rewrite) as { say?: unknown };
              if (typeof parsed.say === "string") say = parsed.say;
            } catch {
              // 화면 글 첫 줄로
            }
          return [
            {
              role: "teacher",
              say,
              move: lead_?.move ?? null,
              model: lead_?.model?.sentence ?? null,
              choices: lead_?.choices === true,
              koShown: (row.explanation ?? null) !== null,
            },
          ];
        }
        const next = ordered
          .slice(i + 1)
          .find((x) => x.row.speaker === "tori")?.row;
        const nextLead = next?.speaker === "tori" ? next.move.lead : undefined;
        return [
          {
            role: "child",
            heard: row.text ?? "",
            saidWords: [...(row.saidWords ?? [])],
            claudeWords: [...(row.selfUsedWords ?? [])],
            hintKind: row.hintKind ?? "none",
            // 말 입력이 아닌 차례는 막힘으로 채운다(검토 rev-r3 · R3 고침 1 확인할 것 3 — 지금 판정이 말 입력 아닌 차례를 비우는 것과 같은 조건)
            stuck: row.stuck || row.input !== "speech",
            // 수업 안 한국어로 묻기(talk_ko_helps)는 그 가지가 합쳐질 때 생긴다 — 그때까지 거짓(검토 rev-r3 8 (가))
            koHelp: false,
            meaningHint: row.meaningHint ?? false,
            reading: nextLead?.reading ?? null,
          },
        ];
      });
    },
  };

  // ── 이야기 방식 길(talk.lead_mode chat — 이야기 방식 묶음 T1) ──────────
  // 서버 src/server/conversation/chat-turn.ts chatTeacherTurn · saveChatTurn 과 같은 차례로 지난다. 판단은 core chat-turn-plan · chat-turn-result ·
  // chat-turn-core · chat-reply · chat-hints · chat-judge 의 함수를 그대로 부르고(NFR-4 · AC-18), 여기는 행 흉내 · 부르는 차례(서버 배선)만 둔다.
  // server-only 라 부를 수 없는 배선은 위 '이야기 방식 서버 배선 사본'이다. 응답은 다 받은 메시지 하나로 흘려 받기를 흉내 낸다(서버 streamCore ·
  // finishTalk · chatKit · chatOutcomeOf 의 차례 — 읽개 · 6.4 · 문장 문 · 흐름이 같다. 시도 다시 보내기 · 다른 모델 다시 부르기는 흉내 내지 않는다).
  const chatTopic = talkChatTopicOf(level, materials.unit);
  const chatTeacher = materials.chatTeacher ?? null;
  const chatSettings = settings.chat;
  const chatAt = options.chatAt ?? new Date();
  const chatMet = options.chatMet ?? 0;
  const chatSpec = { ...spec, band };
  // 단원 낱말 재료(서버 chat-unit-words.ts ChatUnitWords — 컨트롤러 결정 T1 fix 1 I-1): 단계 맥락의 단원 단어와 그 낱말로만 만든 원형 표. 힌트 단
  // 재료 · 판정 맥락이 서버와 같은 재료를 쓴다
  const chatUnit: ChatUnitWords = {
    unitWords: materials.ctx.unitWords,
    lemmaOf: materials.unitLemmaOf ?? materials.lemmaOf,
  };
  const chatUnitLemmaOf = chatUnit.lemmaOf;
  // 수업 상태의 원형 표(서버 state.lemmaOf) — 만남 셈 · 정리 되짚을 말만 쓴다
  const chatLessonLemmaOf = materials.lessonLemmaOf ?? materials.lemmaOf;
  /** '더 이야기하기'를 골랐고 그 입구를 아직 부르지 않았다(화면은 단추를 누른 뒤에만 신호 more 를 보낸다 — T2 가 찾은 결함). */
  let chatMoreChosen = false;
  // 판정 맥락(서버 턴 길 · 닫는 길과 같은 core chatJudgeContextFrom)
  const chatJudgeCtx: ChatJudgeContext = chatJudgeContextFrom(
    { card, spec: { band }, teacher: materials.teacher },
    chatUnit,
    homophones,
  );
  /** 대본 도구 행 → 서버 행 꼴(서버 state 의 talk_turns 행이 갖는 칸 — 아이 행의 듣기 기록 칸은 core clientListenRowOf 로 같은 꼴). */
  const chatRowOf = (r: SimRow): ChatSimRow =>
    r.speaker === "tori"
      ? {
          id: `tori-${r.turnNo}`,
          turnNo: r.turnNo,
          segment: r.segment ?? "greeting",
          speaker: "tori",
          text: r.text,
          inputMode: null,
          hintKind: null,
          hintLevel: null,
          clientListen: null,
          sentUserMessage: r.sentUserMessage ?? null,
          toriRewrite: r.rewrite === "" ? null : r.rewrite,
          toriKo: r.toriKo ?? null,
          aiQuestion: r.chatAi ?? null,
          move: r.move,
          chatJudge: null,
          stuckPhrase: null,
          targetWords: null,
          askAgain: null,
          overLength: r.overLength ?? false,
        }
      : {
          id: `child-${r.turnNo}`,
          turnNo: r.turnNo,
          segment: r.segment,
          speaker: "child",
          text: r.text,
          inputMode: r.quiet ? "quiet" : r.input,
          hintKind: r.hintKind ?? "none",
          hintLevel: r.hintLevel ?? 0,
          clientListen: r.quiet
            ? null
            : clientListenRowOf(
                { mode: r.input, nospeech: r.nospeech },
                undefined,
              ),
          sentUserMessage: r.sentUserMessage,
          toriRewrite: null,
          toriKo: null,
          aiQuestion: null,
          move: null,
          chatJudge: r.chatJudge ?? null,
          stuckPhrase: r.stuckPhrase ?? null,
          targetWords: [...r.targets],
          askAgain: r.askAgain ?? null,
          overLength: null,
        };
  const chatRowsNow = (): ChatSimRow[] => rows.map(chatRowOf);
  /** 요청 본문(서버 buildAiRequest + 출력 형식 — 대화는 streamCore bodyOf, 힌트 · 평가는 runAiCall 과 같은 꼴). */
  const chatRequestOf = <I, O, R>(
    spec_: CallSpec<I, O, R>,
    input: I,
    rules_: R,
  ): PreparedTurn["request"] => {
    const config_ =
      spec_.purpose === PURPOSE
        ? reqConfig
        : requestConfigOf({ purpose: spec_.purpose, level, values, book });
    const built = buildAiRequest(spec_, input, {
      config: config_,
      masker,
      rules: rules_,
    });
    return {
      body: talkBodyOf(
        built.body as unknown as Record<string, unknown>,
        built.wireSchema,
      ),
      betas: built.betas,
      timeoutMs: built.timeoutMs,
      model: config_.model,
      effort: config_.effort,
      thinking: config_.thinking.type,
    };
  };
  /** 서버 lessonChildRowOf 의 아이 글(그 자리 답 예시 · 힌트 단의 {NAME} 틀이 있으면 이름 자리를 가린 뒤 가림 — 같은 core 함수). */
  const chatChildTextOf = (
    say: string,
    position: ReturnType<typeof talkLessonPositionOf>,
    args: LessonArgs,
  ): string => {
    const raw = say.trim();
    const tiers = observeHintTiersOf({
      spec,
      card,
      turns: args.turns,
      aiQuestions: rows.flatMap((r) =>
        r.speaker === "tori" ? [r.aiQuestion] : [],
      ),
      slot: position.slot,
    });
    const templates = [
      position.slot?.answerExample ?? "",
      ...tiers.map((t) => t.text),
    ].filter((t) => t.includes(PLACEHOLDER_NAME));
    const named =
      templates.length > 0 ? maskNameAnswer(raw, { templates }) : raw;
    return masker(named).text;
  };
  const chatUsageOf = (
    result: CallResult,
    model: string,
    verdict: TurnUsage["verdict"],
    hits: number,
  ): TurnUsage | null =>
    result.ok ? leadUsageOf(result, model, verdict, hits) : null;
  /**
   * 응답 하나 읽기(서버 talk.ts streamCore · finishTalk · chatKit · chatOutcomeOf 의 이야기 방식 몫): 읽개(앞 칸 listen_sentence 를 끝까지 읽은
   * 뒤 say 를 문장마다) · 앞 칸이 다 읽힌 때 6.4 를 지난 따라 할 문장을 흐름에 알림 · 문장마다 문장 문 → 흐름(createChatSentenceFlow) · 끝의 정규화 ·
   * 6.4 · 문장 문 짝 · 대화 기록 글. 결과는 서버 chat-turn.ts 가 talkChatTurn 의 결과를 옮긴 ChatCallResult 와 같은 꼴이다.
   */
  const evaluateChat = (p: ChatPreparedTurn, result: CallResult) => {
    const flow = createChatSentenceFlow({
      level,
      appStuck: p.plan.appStuck,
      holdAll: p.plan.lastTurn,
    });
    const failed = (
      reason: string,
      failure: string,
      usage: TurnUsage | null,
      raw: unknown,
    ) => ({
      call: { kind: "failed", reason } as ChatCallResult,
      flow,
      value: null,
      raw,
      usage,
      failure,
    });
    if (!result.ok)
      return failed(
        "server",
        `호출 실패 ${result.status} · ${result.detail}`,
        null,
        null,
      );
    const forbidden = materials.forbidden;
    const sentenceMaxWords = materials.ctx.sentenceMaxWords;
    const gate = createToriSentenceGate({
      forbidden,
      metaPhrases: materials.metaPhrases,
      safeLine: p.safeLine,
      sentenceMaxWords,
    });
    let emitted = 0;
    const emit = (sentence: string) => {
      const out = gate.accept(sentence);
      if (out === null) return;
      emitted += 1;
      flow.accept(out);
    };
    let asked = false;
    const askHold = (heads: Readonly<Record<string, unknown>>) => {
      if (asked) return;
      asked = true;
      const raw = heads[OBSERVE_CHAT_READER_KEYS.heads[0]?.key ?? ""];
      flow.listen(
        observeChatListenCheckedOf(
          typeof raw === "string" ? raw : "",
          forbidden,
          sentenceMaxWords,
        ),
      );
    };
    const text = result.message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    const reader = createToriEnReader(OBSERVE_CHAT_READER_KEYS);
    const fresh = reader.push(text);
    if (reader.sayStarted()) askHold(reader.heads());
    for (const sentence of fresh) emit(sentence);
    const prepared = leadPreparedOf(result.message);
    const stop = result.message.stop_reason ?? "";
    const cut = () => ({
      call: {
        kind: "cut",
        sentSentences: gate.sent(),
        overLength: gate.overLength(),
        firstSentenceMs: result.firstSentenceMs,
      } as ChatCallResult,
      flow,
      value: null,
      raw: prepared ?? null,
      usage: chatUsageOf(result, p.request.model, "invalid", 0),
      failure: `첫 문장 뒤 끊김(stop ${stop || "-"})`,
    });
    if (stop !== "end_turn") {
      // 첫 문장이 나간 뒤 끝나지 않은 응답은 그 문장으로 닫는다(서버 talkAttemptNext close_turn → cut_after_first)
      if (emitted > 0) return cut();
      return failed(
        stop === "refusal" ? "refusal" : "invalid",
        `응답이 끝나지 않음(stop ${stop || "-"})`,
        chatUsageOf(result, p.request.model, "invalid", 0),
        prepared ?? null,
      );
    }
    // 끝(서버 finishTalk): 앞 칸을 흘려 읽지 못했으면 응답 전체의 앞 칸으로 묻고, 남은 문장 · 흘리지 못한 말 칸을 낸다
    const heads: Record<string, unknown> = {};
    if (prepared !== null && typeof prepared === "object")
      for (const { key } of OBSERVE_CHAT_READER_KEYS.heads) {
        const v = (prepared as Record<string, unknown>)[key];
        if (typeof v === "string" || typeof v === "boolean") heads[key] = v;
      }
    askHold(heads);
    for (const sentence of reader.finish()) emit(sentence);
    const streamed = reader.closed() && !reader.failed();
    const sayRaw = (prepared as { say?: unknown } | undefined)?.say;
    if (!streamed && typeof sayRaw === "string")
      for (const sentence of splitSentences(sayRaw)) emit(sentence);
    const wire = talkChatTurnSpec
      .wireSchema(p.chatInput, { turnWords: chatSettings.turnWords })
      .safeParse(prepared);
    const strict =
      prepared !== undefined &&
      wire.success &&
      talkChatTurnSpec.validate(wire.data, p.chatInput, {
        turnWords: chatSettings.turnWords,
      }).length === 0
        ? wire.data
        : null;
    const value = talkChatTurnSpec.normalize(strict ?? prepared, p.chatInput, {
      turnWords: chatSettings.turnWords,
    });
    if (value === null) {
      if (emitted > 0) return cut();
      return failed(
        "invalid",
        `응답을 읽지 못함(${prepared === undefined ? "not_json" : "normalize_null"})`,
        chatUsageOf(result, p.request.model, "invalid", 0),
        prepared ?? null,
      );
    }
    const shown: TalkChatOutput = { ...value, say: gate.sent().join(" ") };
    const hits = checkOutputFields(talkChatCheckFields(shown), {
      forbidden,
      sentenceMaxWords,
    });
    const checked = applyTalkChatChecks(shown, hits);
    // 서버 chatOutcomeOf: 문장 문 짝 · 6.4 가 비운 따라 할 문장 · 대화 기록 글
    const replay = observeChatSayChangesOf(value.say, {
      forbidden,
      metaPhrases: materials.metaPhrases,
      safeLine: p.safeLine,
      sentenceMaxWords,
    });
    const sentSentences = gate.sent();
    const same =
      replay.sent.length === sentSentences.length &&
      replay.sent.every((sentence, i) => sentence === sentSentences[i]);
    const listenBlocked =
      value.listen_sentence.trim() !== "" &&
      checked.value.listen_sentence === "";
    const recorded = listenBlocked ? { ...value, listen_sentence: "" } : value;
    const assistant = same
      ? talkChatAssistantOf(JSON.stringify(recorded), replay.changes)
      : JSON.stringify({ ...recorded, say: sentSentences.join(" ") });
    return {
      call: {
        kind: "ok",
        value: checked.value,
        assistant,
        blocked: [...gate.blocked()] as string[],
        listenBlocked,
        overLength: gate.overLength(),
        sentSentences,
        firstSentenceMs: result.firstSentenceMs,
      } as ChatCallResult,
      flow,
      value: checked.value,
      raw: prepared ?? null,
      usage: chatUsageOf(
        result,
        p.request.model,
        strict === null ? "normalized" : "strict",
        hits.size,
      ),
      failure: null,
    };
  };
  /** 이번 차례가 아이 입력을 받을 때인가(서버 lesson-turn.ts 아이 차례 받기의 조건 — 이야기 방식은 chatFirstQuestionBlocksOf). */
  const chatChildRefusalOf = (
    position: ReturnType<typeof talkLessonPositionOf>,
  ): string | null => {
    if (position.closed) return "대화가 닫혔다";
    if (position.choice !== null)
      return `고르기 차례(${position.choice === "closing" ? "마무리 물음" : "마무리 제안"})에 닿아 멈춘다`;
    if (position.lastRow !== "teacher") return "선생님 차례 뒤가 아니다";
    if (chatFirstQuestionBlocksOf(position))
      return "대화 첫 질문 차례다(입구 back 을 먼저 부른다)";
    if (position.prepPending) return "짧은 준비를 기다린다";
    return null;
  };

  /** 토막 판단의 입력(core ChatSegmentCore — 서버 LessonCore 의 이야기 방식 몫: 위치 되짚기 입력 + 처음 스냅숏의 준비 계획 · 끊긴 행 없음). */
  const chatSegmentCoreOf = (): ChatSegmentCore => ({
    ...argsOf(),
    prepPlan,
    orphan: false,
  });
  /**
   * 화면의 토막 넘김(묶음 S2 접점 — 이 한곳): 선생님 차례 뒤 할 일이 넘김이면 넘긴다. 이야기 방식 몫은 core chatStepOf · lessonAdvanceChatOf(서버
   * index.ts 와 같은 함수)를 그대로 부른다. 인사가 끝난 뒤 짧은 준비로 넘김은 세 방식 모두 지금 길(서버 lessonAdvanceOf)이라 그 몫만 흉내 낸다:
   * 준비 토막으로 가서 쪽지 낱말 전부를 보인 것으로 두고(따라 말하기 행은 만들지 않음), 다시 lessonAdvanceChatOf 로 대화 토막에 넘긴다. 넘김이 내는
   * 입구 신호(start · back)는 openDue 가 같은 함수로 다시 읽는다.
   */
  function chatAdvanceAfterTurn(): void {
    const core = chatSegmentCoreOf();
    if (chatStepOf(core)?.kind === "advance") {
      const decided = lessonAdvanceChatOf(core);
      if (decided.ok) segment = decided.segment;
      return;
    }
    if (segment !== "greeting") return;
    const pos = talkLessonPositionOf(core);
    if (pos.lastRow !== "teacher" || pos.choice !== null || !pos.greetingDone)
      return;
    if (prepPlan.length > 0) {
      segment = "prep";
      prepWords = [...prepPlan];
    }
    const decided = lessonAdvanceChatOf(chatSegmentCoreOf());
    if (decided.ok) segment = decided.segment;
  }

  const chat: ChatSim = {
    on: chatOn,
    settings: chatSettings,
    prepOpens: prepPlan.length > 0,
    applies: () =>
      chatOn &&
      chatTurnSegmentOf(segment) &&
      !talkLessonPositionOf(argsOf()).closed,
    openDue() {
      if (!chatOn || !chatTurnSegmentOf(segment)) return null;
      const core = chatSegmentCoreOf();
      const position = talkLessonPositionOf(core);
      const accepts = (open: ChatOpen) =>
        chatOpenAcceptsOf(open, {
          segment,
          position,
          rows: chatRowsNow(),
          orphan: null,
          settings: chatSettings,
        });
      // 수업 첫 말 · 돌아옴: 화면의 할 일이 넘김이면 넘김이 내는 신호(core chatStepOf · lessonAdvanceChatOf — 서버 index.ts 와 같은 함수)를 턴 길이 받는다
      if (chatStepOf(core)?.kind === "advance") {
        const decided = lessonAdvanceChatOf(core);
        if (decided.ok && decided.lead !== null && accepts(decided.lead))
          return decided.lead;
      }
      // 더 이야기하기: 아이가 고른 뒤에만(chooseMore — 서버 lessonMoreLeadOf 사본) 신호 more 를 턴 길이 받는다. 마무리 제안 자리에서도 턴 길은
      // more 를 받지만(core leadOpenAcceptsOf), 화면은 단추를 누르기 전에는 보내지 않는다(실험 도구 T2 가 찾은 결함)
      return chatMoreChosen && accepts("more") ? "more" : null;
    },
    prepare(entry) {
      const no = (reason: string) => ({ ok: false as const, reason });
      if (!chatOn) return no("이야기 방식 세션이 아니다");
      if (!chatTurnSegmentOf(segment))
        return no(`이야기 방식 토막이 아니다(${segment})`);
      if (chatTopic === null || chatTeacher === null)
        return no("이야기 방식 재료가 없다(단원 주제 · 선생님 재료)");
      const args = argsOf();
      const position = talkLessonPositionOf(args);
      const live = chatRowsNow();
      const maxTurn = rows.reduce((max, r) => Math.max(max, r.turnNo), 0);
      let child: ChatSimRow | null = null;
      let input: ChatInput;
      let teacherTurnNo: number;
      let hintOpened = 0;
      if (entry.kind === "open") {
        // 입구를 받는가(서버 runChatOpenTurn — chatOpenAcceptsOf, 대본 도구에는 끊긴 고아 행이 없다)
        if (
          !chatOpenAcceptsOf(entry.open, {
            segment,
            position,
            rows: live,
            orphan: null,
            settings: chatSettings,
          })
        )
          return no(`입구 ${entry.open} 를 받지 않는 때다`);
        teacherTurnNo = maxTurn + 1;
        if (entry.open === "quiet") {
          // quiet 아이 행(입력 방식 quiet · 글 없음 — 서버 runChatOpenTurn 이 호출 전에 넣는 행)
          child = {
            id: `child-${teacherTurnNo - 1}`,
            turnNo: teacherTurnNo - 1,
            segment,
            speaker: "child",
            text: null,
            inputMode: "quiet",
            hintKind: "none",
            hintLevel: 0,
            clientListen: null,
            sentUserMessage: null,
            toriRewrite: null,
            toriKo: null,
            aiQuestion: null,
            move: null,
            chatJudge: null,
            stuckPhrase: null,
            targetWords: null,
            askAgain: null,
            overLength: null,
          };
          input = { kind: "quiet" };
        } else
          input = chatOpenInputOf(
            entry.open,
            entry.open === "start"
              ? {
                  clock: chatClockOf(
                    chatAt,
                    values["app.timezone"] as string,
                    chatSettings.dayPartHours,
                  ),
                  met: chatMet,
                }
              : null,
          );
      } else {
        const step = entry.step;
        if (step.input === "quiet" || step.choose !== undefined)
          return no("조용함 · 고르기 차례는 입구 · chooseMore 로 부른다");
        const refused = chatChildRefusalOf(position);
        if (refused !== null) return no(refused);
        const lastTeacher = rows.at(-1) as SimRow;
        const mode: TalkInputMode =
          step.say === undefined ? "dont_know" : "speech";
        const nospeech = mode === "dont_know" && step.input === "nospeech";
        hintOpened = entry.hintOpened ?? 0;
        // 아이 행(서버 lesson-turn 이 lessonChildRowOf 로 호출 전에 넣는 행 — 힌트 칸은 저장 때 이야기 방식 값으로 고쳐 쓴다)
        child = {
          id: `child-${lastTeacher.turnNo}`,
          turnNo: lastTeacher.turnNo,
          segment,
          speaker: "child",
          text:
            mode === "speech"
              ? chatChildTextOf(step.say ?? "", position, args)
              : null,
          inputMode: mode,
          hintKind: "none",
          hintLevel: 0,
          clientListen: clientListenRowOf({ mode, nospeech }, undefined),
          sentUserMessage: null,
          toriRewrite: null,
          toriKo: null,
          aiQuestion: null,
          move: null,
          chatJudge: null,
          stuckPhrase: null,
          targetWords: [...(position.slot?.words ?? [])],
          askAgain: null,
          overLength: null,
        };
        teacherTurnNo = lastTeacher.turnNo + 1;
        input = chatTurnInputOf(child, entry.recognizer, {
          unsureConfidence: chatSettings.unsureConfidence,
          unsureOnPartial: chatSettings.unsureOnPartial,
        });
      }
      const plan = chatTurnPlanOf({
        input,
        child,
        args,
        position,
        rows: live,
        segment,
        prepOpens: prepPlan.length > 0,
        safetyMaxTurns: values["talk.safety_max_turns"] as number,
        settings,
      });
      const ordered = leadConversationOrder(live);
      const history = chatHistoryOf(ordered);
      const chatInput: TalkChatInput = {
        level,
        unitWords: materials.ctx.unitWords,
        teacher: {
          nameEn: materials.teacher.nameEn,
          chatPersonaEn: chatTeacher.chatPersonaEn,
          chatFavoritesEn: chatTeacher.chatFavoritesEn,
        },
        topicEn: chatTopic,
        history,
        message: { facts: plan.facts, input },
      };
      const heard = input.kind === "speech" ? input.heard : "";
      // 범위 재료(서버 lesson-input.ts lessonRangeOf · lineOptionsOf — 1~3단계 어휘 · 형태 · 이 대화의 아이 낱말 · 다시 묻는 낱말)
      const range = talkLineOptionsOf({
        sentenceMaxWords: materials.ctx.sentenceMaxWords,
        unitWords: materials.ctx.unitWords,
        teacher: materials.teacher,
        lineRange: {
          allowedWords: materials.allowedWords,
          forms: materials.forms,
          allowedForms: materials.allowedForms,
          childWords: childWords(heard),
          reaskWords: reaskWordsOf({
            turns: args.turns,
            prepWords,
            metBefore: [],
          }),
        },
        lemmaOf: materials.lemmaOf,
        homophones,
      });
      return {
        ok: true,
        turn: {
          entry,
          input,
          plan,
          child,
          teacherTurnNo,
          segment: (child?.segment ?? segment) as TalkTurnSegment,
          chatInput,
          userMessage: observeChatSentUserMessageOf(chatInput),
          request: chatRequestOf(
            talkChatTurnSpec,
            chatInput,
            talkChatTurnSpec.rulesOf(values, chatInput),
          ),
          safeLine: safeLineOf(card.safeLines, history.length + 1),
          check: {
            range,
            extra: {
              allowed: leadAllowed,
              allowedLemmaOf: materials.allowedLemmaOf,
            },
            sentenceMax: CHAT_SENTENCE_MAX,
            questionMax: CHAT_QUESTION_MAX,
            madeUpPhrases: materials.talkLists.madeUp,
          },
          hintOpened,
        },
      };
    },
    finish(p, result) {
      if (p.entry.kind === "open" && p.entry.open === "more")
        chatMoreChosen = false;
      const e = evaluateChat(p, result);
      const live = chatRowsNow();
      const ordered = leadConversationOrder(live);
      const child = p.child;
      const position = talkLessonPositionOf(argsOf());
      // (4) 응답 갈래의 조립(core chatTurnResultOf — 서버 chat-turn.ts 와 같은 인자)
      const result_ = chatTurnResultOf({
        plan: p.plan,
        call: e.call,
        flow: { sent: e.flow.sent(), held: e.flow.held() },
        level,
        koMeaning: spec.koMeaning,
        check: p.check,
        card,
        safeLine: p.safeLine,
        turnNo: child?.turnNo ?? p.teacherTurnNo,
        sentenceMax: teacherSentencesMaxOf(values, level),
        prevStage: chatPrevStageOf(live),
        rowsAfter: child !== null ? [...ordered, child] : ordered,
        settings: { lesson: settings, chat: chatSettings },
        // 만남 셈은 서버 그대로(chat-turn.ts lexicon — 단계 맥락의 단원 단어 + 수업 상태의 원형 표, 컨트롤러 결정: 기존 계산을 바꾸지 않음)
        lexicon: {
          unitWords: materials.ctx.unitWords,
          lemmaOf: chatLessonLemmaOf,
        },
      });
      const lines: ChatReplayLine[] = [
        ...e.flow.sent().map((en) => ({ t: "s" as const, en })),
        ...result_.lines,
      ];
      const draft = result_.teacher;
      const teacher: ChatSimTeacherRow | null =
        draft === null
          ? null
          : {
              ...chatRowOf({
                speaker: "tori",
                turnNo: p.teacherTurnNo,
                text: draft.text,
                rewrite: draft.toriRewrite ?? "",
                move: draft.move,
                answerExample: null,
                aiQuestion: null,
                segment: p.segment,
                sentUserMessage: child === null ? p.userMessage : null,
                toriKo: draft.toriKo,
                chatAi: null,
                overLength: draft.overLength,
              }),
              move: draft.move,
              overLength: draft.overLength,
            };
      // (5) 아이 행 칸(서버 saveChatTurn): 힌트 칸은 그 선생님 행의 실제 단과 화면이 보낸 연 단 수로(core chatChildHintOf), quiet 는 없음
      let childRow: ChatSimChildRow | null = null;
      let judge: ChatJudge | null = null;
      if (child !== null) {
        const prevTeacher = live.find(
          (r) => r.speaker === "tori" && r.turnNo === child.turnNo,
        );
        const hint =
          p.plan.input.kind === "quiet"
            ? { hintKind: "none" as TalkHintKind, hintLevel: 0 }
            : chatChildHintOf({
                record: chatHintRecordOfRow(
                  prevTeacher?.aiQuestion ?? null,
                  chatSpec,
                ),
                opened: p.hintOpened,
                stuckRun: position.stuckInSlot,
                heard: [
                  ...new Set(
                    heardHelpsOfMove(readTalkMove(prevTeacher?.move), spec),
                  ),
                ],
              });
        const fields = chatChildFieldsOf({
          input: p.plan.input,
          sentUserMessage: p.userMessage,
          hint,
        });
        childRow = { ...child, ...fields };
        // 첫 판정 기록(서버 saveChatTurn — 서버 chatJudgeRowsOf 사본 + core chatJudgesOf, 그 행에만)
        const judged = observeChatJudgeRowsOf(
          [
            ...live.filter((r) => r.id !== child.id),
            childRow,
            ...(teacher === null ? [] : [teacher]),
          ],
          chatJudgeCtx.spec,
        );
        const index = judged.ids.indexOf(child.id);
        judge =
          index < 0
            ? null
            : (chatJudgesOf(judged.rows, chatJudgeCtx).find(
                (j) => j.row === index,
              )?.judge ?? null);
        rows.push({
          speaker: "child",
          turnNo: child.turnNo,
          segment: child.segment as TalkTurnSegment,
          text: child.text,
          input: child.inputMode === "speech" ? "speech" : "dont_know",
          nospeech:
            (child.clientListen as { src?: unknown } | null)?.src ===
            "nospeech",
          stuck: fields.stuckPhrase !== null,
          targets: [...(child.targetWords ?? [])],
          sentUserMessage: fields.sentUserMessage,
          hintKind: fields.hintKind,
          hintLevel: fields.hintLevel,
          selfUsedWords: [...fields.selfUsedWords],
          saidWords: [...fields.saidWords],
          stuckPhrase: fields.stuckPhrase,
          chatJudge: judge,
          ...(child.inputMode === "quiet" ? { quiet: true as const } : {}),
        });
      }
      if (draft !== null)
        rows.push({
          speaker: "tori",
          turnNo: p.teacherTurnNo,
          text: draft.text,
          rewrite: draft.toriRewrite ?? "",
          move: draft.move,
          answerExample: null,
          aiQuestion: null,
          segment: p.segment,
          sentUserMessage: child === null ? p.userMessage : null,
          toriKo: draft.toriKo,
          chatAi: null,
          overLength: draft.overLength,
        });
      // 토막: 안전 상한 차례면 닫고(서버 closeLessonOnTurn), 아니면 화면의 토막 넘김(S2 접점 — chatAdvanceAfterTurn 한곳)
      if (p.plan.lastTurn) segment = "wrap_up";
      else chatAdvanceAfterTurn();
      const heardLines = [
        ...observeHeardLinesOf(lines),
        ...(p.plan.lastTurn ? [result_.farewell.en] : []),
      ].filter((l) => l.trim() !== "");
      return {
        entry: p.entry.kind === "open" ? p.entry.open : "child",
        no: p.entry.kind === "child" ? p.entry.stepIndex + 1 : 0,
        lines,
        close: p.plan.lastTurn
          ? { reason: "safety", farewell: result_.farewell }
          : null,
        signal: p.plan.lastTurn ? null : result_.finish.signal,
        turnEnd: result_.finish.end,
        stage: result_.finish.stage,
        run: result_.finish.run,
        facts: p.plan.facts.map((f) => f.kind),
        teacher,
        child: childRow,
        judge,
        met: result_.met,
        diverged: result_.diverged,
        call: e.call,
        value: e.value,
        raw: e.raw,
        usage: e.usage,
        failure: e.failure,
        userMessage: p.userMessage,
        heard: heardLines.join("\n"),
      };
    },
    serverRows: () => chatRowsNow(),
    hintAsk(kind, retry = 0) {
      // 서버 index.ts chatRevealOf → chat-hint.ts chatHintRun: 저장된 단이 있으면 그것, 다시 받기 상한을 넘으면 실패, 아니면 호출 하나
      const teacher = rows.findLast((r) => r.speaker === "tori");
      if (!chatOn || teacher === undefined) return { kind: "none" };
      const live = chatRowsNow();
      const teacherRowId = chatRowOf(teacher).id;
      const input = observeChatHintInputOf({
        rows: live,
        teacherRowId,
        level,
        sentenceMaxWords: materials.ctx.sentenceMaxWords,
        hintTiers: spec.hintTiers,
        teacherNameEn: materials.teacher.nameEn,
      });
      if (input === null) return { kind: "none" };
      const stored =
        teacher.speaker === "tori"
          ? chatHintRecordOfRow(teacher.chatAi ?? null, chatSpec)
          : null;
      if (stored !== null) return { kind: "stored", record: stored };
      const explain = kind === "explain";
      const n = explain ? 0 : retry;
      if (n > chatSettings.hintRetryMax)
        return { kind: "failed", reason: "retry_max" };
      const spec_ = observeLevelCallSpecOf(talkChatHintSpec);
      const leveled = observeLevelInputOf(input, {
        level,
        sentenceMaxWords: materials.ctx.sentenceMaxWords,
      });
      return {
        kind: "call",
        explain,
        retry: n,
        teacherRowId,
        input,
        request: chatRequestOf(
          spec_,
          leveled,
          talkChatHintSpec.rulesOf(values, leveled),
        ),
      };
    },
    hintFinish(ask, result) {
      const read = chatCallValueOf(
        observeLevelCallSpecOf(talkChatHintSpec),
        observeLevelInputOf(ask.input, {
          level,
          sentenceMaxWords: materials.ctx.sentenceMaxWords,
        }),
        result,
        ask.request.model,
      );
      if (!read.ok)
        return { ok: false, reason: read.reason, usage: read.usage };
      // 힌트 단 재료: 단계 맥락의 단원 단어와 그 낱말로 만든 원형 표(서버 S2 fix 2 와 같은 재료 — 컨트롤러 결정 I-1)
      const record = chatHintRecordOf({
        output: read.value,
        spec: chatSpec,
        unitWords: chatUnit.unitWords,
        lemmaOf: chatUnitLemmaOf,
      });
      // 만든 단이 없으면 실패(서버 chatHintRun no_tiers), 있으면 그 선생님 행 ai_question 칸에 저장(설명 요청도 같은 칸 — 보완 5 (2))
      if (record.tiers.length === 0)
        return { ok: false, reason: "no_tiers", usage: read.usage };
      const at = rows.findLastIndex(
        (r) => r.speaker === "tori" && chatRowOf(r).id === ask.teacherRowId,
      );
      const row = rows[at];
      if (row?.speaker === "tori")
        rows[at] = { ...row, chatAi: chatAiQuestionOf(record) };
      return { ok: true, record, usage: read.usage };
    },
    evalDue() {
      if (!chatOn) return null;
      const due = chatEvalAfterTeacherOf(
        observeChatDialogRowsOf(chatRowsNow()),
      );
      return due !== null && observeChatEvalPendingOf(due) ? due.id : null;
    },
    evalAsk(childRowId) {
      const live = chatRowsNow();
      const target = live.find((r) => r.id === childRowId);
      if (target === undefined || !observeChatEvalPendingOf(target))
        return null;
      if (observeChatLessonSayLostOf(live)) return null;
      const input = observeChatEvalInputOf({
        rows: live,
        childRowId,
        contextTurns: chatSettings.evalContextTurns,
        unitWords: materials.ctx.unitWords,
      });
      if (input === null) return null;
      const leveled = observeLevelInputOf(input, {
        level,
        sentenceMaxWords: materials.ctx.sentenceMaxWords,
      });
      return {
        childRowId,
        input,
        request: chatRequestOf(
          observeLevelCallSpecOf(talkChatEvalSpec),
          leveled,
          talkChatEvalSpec.rulesOf(values, leveled),
        ),
      };
    },
    evalFinish(ask, result) {
      const read = chatCallValueOf(
        observeLevelCallSpecOf(talkChatEvalSpec),
        observeLevelInputOf(ask.input, {
          level,
          sentenceMaxWords: materials.ctx.sentenceMaxWords,
        }),
        result,
        ask.request.model,
      );
      const state: ChatEvalState = read.ok
        ? { status: "done", output: read.value }
        : { status: "failed", failure: observeChatEvalFailureOf(read.reason) };
      // 늦게 온 값의 쓰기(서버 writeChatEval — 그 값에 기대는 뒤 행까지 다시 센 판정을 한꺼번에)
      const writes = observeChatEvalWritesOf({
        rows: chatRowsNow(),
        childRowId: ask.childRowId,
        state,
        ctx: chatJudgeCtx,
      });
      for (const write of writes ?? []) {
        const at = rows.findIndex(
          (r) => r.speaker === "child" && chatRowOf(r).id === write.id,
        );
        const row = rows[at];
        if (row?.speaker === "child")
          rows[at] = { ...row, chatJudge: write.judge };
      }
      return { state, written: writes !== null, usage: read.usage };
    },
    closeEvalIds() {
      if (!chatOn) return [];
      return chatEvalOnCloseOf(
        observeChatDialogRowsOf(chatRowsNow()),
        observeChatEvalPendingOf,
      ).map((r) => r.id);
    },
    close() {
      segment = "wrap_up";
    },
    wrapLines: () =>
      wrapUpLinesOf({
        recasts: chatWrapSourcesOf(rows.filter((r) => r.speaker === "tori")),
        todayWords: card.todayWords.map((w) => w.word),
        closingLines: card.closingLines,
        koMeaning: spec.koMeaning,
        // 서버 lessonWrapLinesOf 와 같은 수업 상태의 원형 표
        lemmaOf: chatLessonLemmaOf,
      }).map(({ en, ko }) => ({ en, ...(ko === undefined ? {} : { ko }) })),
  };

  /**
   * 힌트 · 평가 응답 읽기(서버 run.ts runAiCall 의 한 시도 흉내 — 거절 · 끝나지 않음 · 읽지 못함 · 출력 검사의 치명 걸림은 실패 갈래). 다시 시도는
   * 흉내 내지 않는다.
   */
  function chatCallValueOf<I, O, R>(
    spec_: CallSpec<I, O, R>,
    input: I,
    result: CallResult,
    model: string,
  ):
    | { ok: true; value: O; usage: TurnUsage | null }
    | { ok: false; reason: string; usage: TurnUsage | null } {
    if (!result.ok)
      return {
        ok: false,
        reason: /timeout/i.test(result.detail) ? "timeout" : "server",
        usage: null,
      };
    const message = result.message;
    const stop = message.stop_reason ?? "";
    let prepared: unknown;
    try {
      prepared = prepareAnswer(
        JSON.parse(answerTextOf(message)),
        spec_.enumPaths,
      );
    } catch {
      prepared = undefined;
    }
    if (stop !== "end_turn")
      return {
        ok: false,
        reason: stop === "refusal" ? "refusal" : "invalid",
        usage: chatUsageOf(result, model, "invalid", 0),
      };
    const rules_ = spec_.rulesOf(values, input);
    const wire = spec_.wireSchema(input, rules_).safeParse(prepared);
    const strict =
      prepared !== undefined &&
      wire.success &&
      spec_.validate(wire.data, input, rules_).length === 0
        ? wire.data
        : null;
    const value = spec_.normalize(strict ?? prepared, input, rules_);
    if (value === null)
      return {
        ok: false,
        reason: "invalid",
        usage: chatUsageOf(result, model, "invalid", 0),
      };
    const hits = checkOutputFields(spec_.checkFields(value), {
      forbidden: materials.forbidden,
      sentenceMaxWords: materials.ctx.sentenceMaxWords,
    });
    const checked = spec_.applyChecks(value, hits, input);
    const usage = chatUsageOf(
      result,
      model,
      strict === null ? "normalized" : "strict",
      hits.size,
    );
    if (checked.fatal) return { ok: false, reason: "output_blocked", usage };
    return { ok: true, value: checked.value, usage };
  }

  return {
    rows,
    lead,
    chat,
    stopBefore() {
      const position = talkLessonPositionOf(argsOf());
      if (position.closed) return { reason: "대화가 닫혔다", choice: null };
      if (position.choice !== null)
        return {
          reason: `고르기 차례(${position.choice === "closing" ? "마무리 물음" : "마무리 제안"})에 닿아 멈춘다`,
          choice: position.choice,
        };
      return null;
    },
    chooseMore() {
      if (leadOn || chatOn) {
        // 이야기 방식도 새 엔진과 같은 몫(서버 index.ts lessonMoreChoiceOf — 카드 거리 행 없이 토막만, 다음 말은 입구 more)
        const decided = observeMoreLeadOf(argsOf());
        if (!decided.ok) return { ok: false, reason: "고를 차례가 아니다" };
        segment = decided.segment;
        if (chatOn) chatMoreChosen = true;
        return { ok: true, mode: chatOn ? "chat" : "claude" };
      }
      const decided = observeMoreOf(argsOf());
      if (!decided.ok)
        return {
          ok: false,
          reason: "고를 차례가 아니거나 더 이야기할 거리가 없다",
        };
      // 서버 index.ts chooseLessonMoreTalk 의 카드 자리 행(insertTeacherRow — 화면 글은 붙인 줄, 다시 쓴 글은 그 줄)
      const attach: TeacherAttachLine[] = [
        {
          kind: "question",
          role: "card",
          en: decided.line.en,
          ...(decided.line.ko === undefined ? {} : { ko: decided.line.ko }),
          item: { ...decided.move.item },
        },
      ];
      rows.push({
        speaker: "tori",
        turnNo: rows.reduce((max, r) => Math.max(max, r.turnNo), 0) + 1,
        text: lessonTextOf([], attach),
        rewrite: talkLessonRewriteOf({
          sentSentences: [],
          appended: attach.flatMap((l) => ("en" in l ? [l.en] : [])),
        }),
        move: decided.move,
        answerExample: null,
        aiQuestion: null,
      });
      segment = decided.segment;
      return { ok: true, mode: "app", line: decided.line };
    },
    snapshot() {
      return {
        rows: rows.map((row) => ({ ...row })),
        segment,
        prepWords: [...prepWords],
        prevContext,
      };
    },
    lay(p, anchor) {
      const turnNo = lastTori()?.turnNo ?? 0;
      rows.push({
        speaker: "child",
        turnNo,
        segment: p.segment === "greeting_end" ? "greeting" : p.segment,
        text: p.childText,
        input: p.mode,
        nospeech: p.nospeech,
        stuck: anchor.child.stuck,
        targets: [...anchor.child.targets],
        sentUserMessage: p.userMessage,
      });
      anchor.teachers.forEach((t, i) => {
        const [first = "", ...attached] = t.text.split("\n");
        rows.push({
          speaker: "tori",
          turnNo: turnNo + 1 + i,
          text: t.text,
          // 기록에 다시 쓴 글(tori_rewrite)이 없어 화면 글 · 소리 줄로 같은 꼴을 만든다(talkLessonRewriteOf — 소리 줄은 붙인 줄 앞)
          rewrite: talkLessonRewriteOf({
            sentSentences: splitSentences(first),
            sound: {
              ...(t.move.sound?.model !== undefined
                ? { modelLine: t.move.sound.model }
                : {}),
              ...(t.move.sound?.choices !== undefined
                ? { choices: t.move.sound.choices }
                : {}),
            },
            appended: [
              ...(t.move.sound?.answer !== undefined
                ? [t.move.sound.answer]
                : []),
              ...attached,
            ],
          }),
          move: t.move,
          // 서버 lessonTurnOf 와 같이 AI 질문의 답 예시(빈 글은 없음)
          answerExample:
            t.aiQuestion && t.aiQuestion.answerExample !== ""
              ? t.aiQuestion.answerExample
              : null,
          aiQuestion: t.aiQuestion
            ? {
                en: t.aiQuestion.en,
                hintKo: t.aiQuestion.hintKo,
                hints: [...t.aiQuestion.hints],
                usable: [...(t.aiQuestion.usable ?? [])],
              }
            : null,
        });
      });
      prevContext = p.context;
      if (p.segment === "greeting_end") {
        segment = "talk";
        prepWords = [...prepPlan];
      }
    },
    prepare(step, stepIndex) {
      if (step.input === "quiet" || step.choose !== undefined)
        return {
          ok: false,
          reason: "조용함 · 고르기 차례는 이야기 방식 수업에서만 받는다",
        };
      if (chatOn && chatTurnSegmentOf(segment))
        return {
          ok: false,
          reason: "이야기 방식 수업이다(sim.chat 으로 부른다)",
        };
      const args = argsOf();
      const position = talkLessonPositionOf(args);
      if (position.closed) return { ok: false, reason: "대화가 닫혔다" };
      if (position.choice !== null)
        return {
          ok: false,
          reason: `고르기 차례(${position.choice === "closing" ? "마무리 물음" : "마무리 제안"})에 닿아 멈춘다`,
        };
      if (position.lastRow !== "teacher")
        return { ok: false, reason: "선생님 차례 뒤가 아니다" };
      const mode: TalkInputMode =
        step.say === undefined ? "dont_know" : "speech";
      const nospeech = step.input === "nospeech";
      const cause =
        mode === "speech" ? "speech" : nospeech ? "nospeech" : "button";
      const childSegment = lessonTurnSegmentOf(position, cause, settings);
      const lite: TalkLessonChildTurn = {
        speaker: "child",
        segment: childSegment,
        input: mode,
        stuck: false,
        nospeech,
        targets: [...(position.slot?.words ?? [])],
      };
      // 알아듣기 재료 조립(서버 lessonTurnAfterChild (6) 과 같은 core 함수 talkTurnWiringOf — 코드 검토 rev-content-1 I-3): 동음이의어 묶음 ·
      // 먼저 답한 필수 질문(1~3단계만 — 판정 r1 I-2, 따라 말한 · 고른 말은 뺌) · 차례 계획 둘 · 아이가 답하던 질문 자리 · 귀띔 재료
      const said = mode === "speech" ? masker(step.say ?? "").text : null;
      const wiring = talkTurnWiringOf({
        low,
        args,
        lite,
        childText: said,
        rows: lateRowsNow(),
        card,
        lemmaOf: materials.lemmaOf,
        homophones,
        soundAlikes: materials.soundAlikes,
      });
      const plans = wiring.plans;
      const { ifAnswered } = plans;
      if (!ifAnswered.callsAi || ifAnswered.kind === "none")
        return {
          ok: false,
          reason: `흐름이 회화 턴을 부르지 않는다(${ifAnswered.kind})`,
        };
      const prev = lastTori();
      const heard = [...new Set(heardHelpsOfMove(prev?.move ?? null, spec))];
      // 힌트 단(서버 lessonChildRowOf — 지금 질문 자리의 단 · 열린 단 수는 같은 자리 둘째 '모름'부터 마지막 단까지). 대본 칸 hint 가 있으면
      // 그 종류 · 단 그대로(화면에서 아이가 연 것의 흉내), 없으면 열린 단으로 센다(hintTier 는 누른 수)
      const tiers = observeHintTiersOf({
        spec,
        card,
        turns: args.turns,
        aiQuestions: rows.flatMap((r) =>
          r.speaker === "tori" ? [r.aiQuestion] : [],
        ),
        slot: position.slot,
      });
      const opened = openedTierCount({
        tiers,
        pressed: step.hintTier ?? 0,
        dontKnowCount: position.stuckInSlot,
      });
      const hintTier = step.hint !== undefined ? (step.hintTier ?? 0) : opened;
      const hintKind: TalkHintKind =
        step.hint ?? hintKindOf({ opened: tiers.slice(0, opened), heard });
      const heardHelp = heardHelpOf(heard);
      const childText = said;
      const planned = talkCallTurnOf({
        plan: ifAnswered,
        ifStuck: plans.ifStuck,
        child: childText ?? "",
        input: mode,
        hintKind,
        hintTier,
        heardHelp,
        // 1~3단계 'Child said more' 줄(서버와 같이 느낌 낱말 · 원형을 넘김 — 계획이 1~3단계일 때만 줄이 생긴다)
        ...(low ? { feelingWords: materials.talkLists.allowed.feeling } : {}),
        lemmaOf: materials.lemmaOf,
        // 1~3단계 상황 차례의 'Example line'(서버와 같은 돌림 번호 — 판정 r1 I-1 (가) · M-6)
        exampleTurn: situationRotationOf(
          (lastTori()?.turnNo ?? 0) + 1,
          rotationKey,
        ),
        // 1~3단계 들은 글 귀띔(13절 C217 (1)) · 바로 앞 선생님 말의 첫 낱말(C217 보완) — 서버와 같이 talkTurnWiringOf 가 조립한 재료 그대로
        heard: wiring.heardOf(materials.ctx.unitWords),
        lastStart: wiring.lastStart,
      });
      // 인사 끝 턴은 다음 토막을 알린다(서버 lesson-turn.ts 이번 패치 판 — 처음 스냅숏의 짧은 준비 계획이 있으면 준비)
      // 한 턴 늦게 온 카드 답도 '앞 차례가 카드 기회'로 본다(서버 lesson-turn.ts lessonCallTurnOf 와 같은 차례 — 그 함수 · lateCardRowsOf 는
      // server-only 라 core lateCardAnswerOf 에 같은 재료(선생님 행 move · 아이 행 인식 글)를 넘긴다. '이미 답함' · 폭 상한까지 같다)
      const late =
        mode === "speech" &&
        planned.afterCardChance !== true &&
        lateCardAnswerOf({
          rows: lateRowsNow(),
          child: childText ?? "",
          lemmaOf: materials.lemmaOf,
        });
      const turn: TalkCallTurn = {
        ...planned,
        ...(late ? { afterCardChance: true } : {}),
        ...(planned.segment === "greeting_end"
          ? { nextPart: prepPlan.length > 0 ? "prep" : "talk" }
          : {}),
      };
      const now = contextNow();
      const history = historyOf();
      const opening = history.length === 0 ? openingLine() : undefined;
      const input: TalkLessonInput = {
        ...materials.ctx,
        spec,
        teacher: materials.teacher,
        card,
        goalTexts: materials.goalTexts,
        carryGoals: [],
        summaries,
        history,
        turn: { ...turn, context: talkLessonContextDelta(prevContext, now) },
        lineRange: {
          allowedWords: low ? materials.allowedWords : new Set(),
          forms: low ? materials.forms : [],
          allowedForms: low ? materials.allowedForms : new Set(),
          childWords: low ? childWords(childText ?? "") : [],
          reaskWords: reaskWordsOf({
            turns: args.turns,
            prepWords,
            metBefore: [],
          }),
        },
        ...(opening !== undefined ? { openingLine: opening } : {}),
        lemmaOf: materials.lemmaOf,
        // 막힘 무름이 같은 소리로 들린 장면 낱말도 본다(서버와 같이 1~3단계만 — 13절 C217 (1))
        ...wiring.callInput,
      };
      const userMessage = talkLessonUserMessage(
        input.turn,
        opening !== undefined
          ? { line: opening, teacherNameEn: materials.teacher.nameEn }
          : undefined,
      );
      return {
        ok: true,
        turn: {
          stepIndex,
          step,
          childText,
          mode,
          nospeech,
          segment: childSegment,
          ifAnswered,
          ifStuck: plans.ifStuck,
          turn,
          input,
          rules,
          userMessage,
          request: requestOf(input),
          before: {
            followRun: position.followRun,
            asked: new Map(position.askedQuestions),
            silentBlocked: position.silentBlocked,
            stuckInSlot: position.stuckInSlot,
          },
          hintKind,
          hintTier,
          heardHelp,
          flowArgs: args,
          slot: position.slot,
          hintTiers: tiers,
          targets: [...lite.targets],
          context: now,
        },
      };
    },
    retryOf(p, result) {
      if (!low) return null;
      const first = evaluateResult(p.input, p.request.model, result);
      if (!first.value) return null;
      const chosen = chosenOf(p, first.value);
      if (!(chosen.kind === "ai" && chosen.aiAsks)) return null;
      const rewrite = holdsOf(p, first, chosen);
      const listed = sentenceEntriesOf(first.sentences, chosen, {
        low,
        asked: p.before.asked,
        max: settings.sameQuestionMax,
        live: liveFor(p)?.checks ?? null,
      });
      const entries = rewrite ? heldAll(listed) : listed;
      const options = lineOptionsFor(p.childText);
      const targets = first.value.next_targets;
      let fail: HeldQuestionFail | null = null;
      let note: string;
      if (rewrite) note = stuckRewriteNoteOf(p.childText ?? "");
      else {
        fail = heldQuestionFailOf({
          entries,
          targets,
          // 받침 둘째의 AI 질문 자리면 쉬운 질문 조건을 함께 본다(끝 처리와 같은 판정 — 서버 withQuestionRetry)
          options: {
            ...options,
            easySlot: observeEasySlotOf(chosen, first.value, low),
          },
          // 카드 답 바로 뒤 차례의 카드 필수 질문 글(13절 C217 (2) (ㄷ))
          chainKeys: talkCardChainKeysOf(p.turn, card),
        });
        if (fail === null) return null;
        note = questionRetryNoteOf(fail, {
          sentenceMaxWords: materials.ctx.sentenceMaxWords,
          targets,
          childWords: options.childWords,
          // 쉬운 질문 자리면 까닭과 관계없이 예 · 아니요 질문으로 다시 쓰게 한다(서버 withQuestionRetry 와 같음 — 코드 검토 rev-content-1 M-1)
          easySlot: observeEasySlotOf(chosen, first.value, low) !== undefined,
        });
      }
      const input: TalkLessonInput = {
        ...p.input,
        retry: { previous: entries.map((e) => e.en).join(" "), note },
      };
      return {
        kind: rewrite ? "rewrite" : "question",
        fail,
        note,
        input,
        request: requestOf(input),
      };
    },
    finish(p, result, retry) {
      const turnNo = lastTori()?.turnNo ?? 0;
      const first = evaluateResult(p.input, p.request.model, result);
      const usage = first.usage;
      // 재호출로 이은 턴은 다시 쓴 응답의 따라 할 말 바뀜 표시를 쓴다(서버 N-4 와 같음, 검토 T-2)
      let soundFixed = first.soundFixed;
      let hintsBlocked = first.hintsBlocked;
      const failure = first.failure;
      const live = liveFor(p);
      let value = blankIfNotHeard(p, first.value);
      let blockedSentences = first.blocked;
      const stuck = value?.stuck === true && p.mode === "speech";
      const chosen = chosenOf(p, value);
      const asked = p.before.asked;
      const stuckOverridden = overriddenOf(p, first);
      // 막힘을 무른 1~3단계 질문 차례는 보낸 문장이 없다 — 통째로 다시 쓰고, 못 하면 앞 문장을 모두 지워 카드 자리로(서버 withQuestionRetry fallback)
      const listed = value
        ? sentenceEntriesOf(first.sentences, chosen, {
            low,
            asked,
            max: settings.sameQuestionMax,
            live: live?.checks ?? null,
          })
        : undefined;
      const holding = holdsOf(p, first, chosen);
      let entries: Entry[] | undefined =
        listed && holding ? heldAll(listed) : listed;
      // 재질문(C203 (3)): 다시 쓴 응답의 첫 물음표 문장부터를 앞 응답의 반응 뒤에 잇는다. 끝 처리가 같은 검사를 다시 해 걸리면 카드 자리
      let reask: {
        usage: TurnUsage | null;
        outcome: string;
        firstToriEn: string;
        firstFail: QuestionFailNote;
        retryToriEn: string | null;
      } | null = null;
      let merged = false;
      let retryFailed = false;
      const lineOptions = lineOptionsFor(p.childText);
      if (retry) {
        const second = evaluateResult(
          retry.ask.input,
          retry.ask.request.model,
          retry.result,
        );
        retryFailed = second.failure !== null;
        const firstToriEn = value?.tori_en ?? "";
        const firstFail: QuestionFailNote = retry.ask.fail
          ? { ...retry.ask.fail, words: [...retry.ask.fail.words] }
          : { question: "", reason: "stuck_overridden", words: [] };
        let outcome = `첫 시도 ${failText(firstFail)} → `;
        if (value && entries && second.value) {
          const joined = mergeQuestionRetry({
            first: value,
            firstEntries: entries,
            retry: second.value,
            retryEntries: sentenceEntriesOf(second.sentences, chosen, {
              low,
              asked,
              max: settings.sameQuestionMax,
              live: live?.checks ?? null,
            }),
            whole: retry.ask.kind === "rewrite",
          });
          if (joined) {
            entries = joined.entries;
            value = blankIfNotHeard(p, joined.value);
            blockedSentences += second.blocked;
            merged = true;
            soundFixed = second.soundFixed;
            hintsBlocked = second.hintsBlocked;
          } else
            outcome += holding
              ? "다시 쓴 응답에 질문 없음 → 앞 문장을 모두 지우고 카드 자리"
              : "다시 쓴 응답에 질문 없음 → 앞 응답으로 카드 자리";
        } else
          outcome += `재호출 실패(${second.failure ?? "응답 없음"}) → 앞 응답으로 카드 자리`;
        reask = {
          usage: second.usage,
          outcome,
          firstToriEn,
          firstFail,
          retryToriEn: second.value?.tori_en ?? null,
        };
      }
      const needsQuestion = holding && !merged && listed !== undefined;
      if (needsQuestion) entries = droppedAll(listed);
      const child: SimRow = {
        speaker: "child",
        turnNo,
        // talk_turns.segment 에 greeting_end 가 없어 저장된 행은 greeting 이다(되짚기가 인사 끝을 스스로 안다)
        segment: p.segment === "greeting_end" ? "greeting" : p.segment,
        text: p.childText,
        input: p.mode,
        nospeech: p.nospeech,
        stuck,
        targets: [...p.targets],
        sentUserMessage: p.userMessage,
      };
      const turnsWithChild = [...lightTurns(), lightOf(child)];
      // 응답이 없는 턴의 반응 한 줄(서버 lessonOutcomeViewOf — 1~3단계 상황 차례 · 아이 말이 모름 꼴이면 상황 줄, 거절은 안전한 대사, 그 밖
      // 1~3단계는 뜻 있는 안전한 대사 — 판정 r1 I-3)
      const failLine = value
        ? null
        : observeFailLineOf({
            low,
            koMeaning: spec.koMeaning,
            card,
            refusal: first.refusal,
            // 서버와 같은 core failSituationLineOf('쉬운'을 약속하지 않는 줄 — 코드 검토 Minor 3)
            situation:
              low && live
                ? failSituationLineOf(
                    live.settle.situationLines,
                    chosen,
                    p.mode === "speech" ? (p.childText ?? "") : null,
                    live.settle.turnNo,
                    teacherTextsOf(lightTurns()),
                  )
                : null,
            safeLine: safeLineOf(card.safeLines, p.input.history.length + 1),
            childTurnNo: turnNo,
          });
      const settled = settleTurn({
        chosen,
        value,
        sentences: first.sentences,
        soundFixed,
        blockedSentences,
        ...(entries ? { entries } : {}),
        needsQuestion,
        hintsBlocked,
        failLine,
        live,
        materials,
        turns: turnsWithChild,
        asked,
        max: settings.sameQuestionMax,
        lineOptions,
      });
      // 다시 쓴 시도의 걸림: 이은 질문을 같은 질문 검사에 다시 대 본다(끝 처리와 같은 재료). 같은 질문으로 바뀌었으면 그 까닭
      let retryFail: QuestionFailNote | null = null;
      if (reask && merged && settled.replaced !== null) {
        const fail =
          entries && value
            ? heldQuestionFailOf({
                entries,
                targets: value.next_targets,
                // 끝 처리와 같은 재료(받침 둘째의 쉬운 질문 조건까지 — 카드 답 뒤 까닭 chain 은 끝 처리가 보지 않는다)
                options: {
                  ...lineOptions,
                  easySlot: observeEasySlotOf(chosen, value, low),
                },
              })
            : null;
        retryFail = fail
          ? { ...fail, words: [...fail.words] }
          : {
              question:
                entries?.findLast((e) => e.question && !e.cue)?.en ?? "",
              reason: settled.replaced,
              words: [],
            };
      }
      const reaskRecordOf = (
        r: NonNullable<typeof reask>,
        f: QuestionFailNote | null,
      ): NonNullable<TurnRecord["reask"]> => ({
        ...r,
        retryFail: f,
        outcome: merged
          ? `${r.outcome}${f === null ? `다시 쓴 질문 통과("${entries?.findLast((e) => e.question && !e.cue)?.en ?? ""}")` : `다시 써도 걸림 ${failText(f)} → 카드 자리(${settled.replaced})`}`
          : r.outcome,
      });
      rows.push(child);
      const prevTeacher = lastTori()?.move ?? null;
      rows.push({
        speaker: "tori",
        turnNo: turnNo + 1,
        text: settled.text,
        rewrite: settled.rewrite,
        move: settled.move,
        answerExample: settled.answerExample,
        aiQuestion: settled.aiQuestion,
      });
      prevContext = p.context;
      if (p.segment === "greeting_end") {
        // 인사 끝 뒤 짧은 준비(1~3단계 늘 · 4단계부터 필요할 때만 — 첫 묶음 흉내는 늘 모드만)
        segment = "talk";
        prepWords = [...prepPlan];
      }
      const appAfter = appendAppTurns();

      const question = turnQuestionOf(settled.text, settled.move.kind);
      let sameQuestion: string | null = null;
      if (question !== null) {
        const key = questionKeyOf(question);
        const n = (p.before.asked.get(key) ?? 0) + 1;
        if (chosen.blocked.includes(key)) sameQuestion = "막힌 뒤 같은 질문";
        else if (n >= 2) sameQuestion = `같은 질문 ${n}번째`;
      }
      if (settled.dropped.some((d) => d.reason === "same"))
        sameQuestion = `${sameQuestion ?? ""}${sameQuestion ? " · " : ""}앱이 같은 질문을 지움`;
      const m = settled.move;
      const supportMove = m.stage > 0 || m.cause !== null;
      const returned =
        p.before.followRun > 0 &&
        !supportMove &&
        m.next !== "follow_child" &&
        (m.kind === "card_slot" ||
          m.next === "required" ||
          m.next === "more" ||
          m.next === "introduce")
          ? `돌아옴(따라가기 ${p.before.followRun}턴 뒤)`
          : null;
      const flags: string[] = [];
      if (talkLessonPositionOf(argsOf()).silentBlocked)
        flags.push("들리지 않음이 이어져 막힘 화면(speech.silent_items_max)");
      if (stuck) flags.push("응답이 막힘 말로 봄(stuck)");
      if (first.emptyStuck)
        flags.push(
          `빈 tori_en 막힘 응답 → 앱 받침(${EMPTY_TORI_EN_STUCK}, 기술 오류 자리 아님)`,
        );
      if (stuckOverridden)
        flags.push("막힘 무름(AI stuck → 앱이 무름, C204 (3))");
      if ((usage?.checkHits ?? 0) > 0)
        flags.push(`출력 검사 걸림 ${usage?.checkHits}칸`);
      if (soundFixed) flags.push("따라 할 말을 앱이 바꿈");
      for (const s of settled.situation)
        flags.push(
          s.ai === null
            ? `반응 자리에 상황 줄("${s.en}")`
            : `상황 줄로 바꿈("${s.ai}" → "${s.en}")`,
        );
      const techError = techErrorOf({
        nospeech: p.nospeech,
        result,
        readable: first.value !== null,
        retryFailed,
      });
      if (techError) flags.push(techErrorText(techError));
      const recastWord = p.step.expect?.recastWord;
      const recast = value?.recast ?? "";
      return {
        no: p.stepIndex + 1,
        child:
          p.mode === "speech"
            ? (p.step.say ?? "")
            : p.nospeech
              ? CHILD_NOSPEECH_TEXT
              : CHILD_DONT_KNOW_TEXT,
        segment: p.segment,
        plan: `${chosen.kind}${chosen.aiAsks ? " · 질문" : ""}${chosen.stage > 0 ? ` · 받침 ${chosen.stage}` : ""}`,
        teacher: settled.kept.join(" "),
        // 앱이 붙인 줄: 신호 말(뜻 줄 뒤 · 소리 줄 앞 — 서버 lessonAfterLinesOf 차례) → 화면 글 붙일 줄
        attach: [
          ...(settled.cue ? [settled.cue.en] : []),
          ...settled.attach.flatMap((l) =>
            l.kind === "sound" ? [] : "en" in l ? [l.en] : [],
          ),
        ],
        cue: settled.cue,
        toriKo: settled.ko,
        sound: {
          ...settled.sound,
          ...(settled.attach.some((l) => l.kind === "sound")
            ? {
                answer: settled.attach
                  .flatMap((l) => (l.kind === "sound" ? [l.en] : []))
                  .join(" "),
              }
            : {}),
        },
        recast,
        explanation: value?.explanation ?? "",
        move: {
          kind: m.kind,
          next: m.next,
          why: m.why,
          item: m.item,
          app: m.app,
          stage: m.stage,
        },
        replaced: settled.replaced,
        dropped: settled.dropped,
        returned,
        sameQuestion,
        judge: judgeOf({
          expect: p.step.expect,
          move: m,
          kept: settled.kept,
          attach: settled.attach,
          ko: settled.ko,
          sound: settled.sound,
          spec,
          prevTeacher,
          lastChildSpoke: p.mode === "speech" && !stuck,
          returned,
        }),
        recastCheck:
          recastWord === undefined
            ? null
            : {
                word: recastWord,
                ok: tokenize(recast).some(
                  (t) =>
                    t.kind === "word" &&
                    (t.text.toLowerCase() === recastWord.toLowerCase() ||
                      materials.lemmaOf(t.text) === recastWord.toLowerCase()),
                ),
              },
        usage,
        failure,
        ...(first.rawOnFail !== undefined
          ? { rawOnFail: first.rawOnFail }
          : {}),
        situationLines: settled.situation.map((s) => s.en),
        flags,
        techError,
        design: p.step.design ?? null,
        ...(p.step.meant !== undefined ? { meant: p.step.meant } : {}),
        ...(p.step.lessonBefore !== undefined
          ? { lessonBefore: p.step.lessonBefore }
          : {}),
        output: value,
        userMessage: p.userMessage,
        appAfter,
        childKind: first.value?.child_kind ?? null,
        stuck: {
          ai: first.aiStuck,
          app: stuck,
          overridden: stuckOverridden,
        },
        reask: reask === null ? null : reaskRecordOf(reask, retryFail),
      };
    },
  };
}

// ── 계획 · 비용 어림 ─────────────────────────────────────────────

// ── 이야기 방식 대본 돌리기(묶음 T1 '앱 행동' — 화면이 하는 일을 가짜 시계로 흉내) ──────────────────────────────

/** 이야기 방식 수업의 호출 갈래: 대화 · 힌트(누름) · 막힌 뒤 설명 · 기록 전용 평가. */
export const CHAT_CALL_KINDS = ["dialog", "hint", "explain", "eval"] as const;
export type ChatCallKind = (typeof CHAT_CALL_KINDS)[number];
export type ChatCallCounts = Record<ChatCallKind, number>;
/** 호출 하나(실호출이면 흘려 받기 · 시험이면 가짜 응답). 부르는 쪽이 문(명시 인자 · 부르기 전 호출 수와 어림 비용)을 지난 뒤 넘긴다. */
export type ChatCaller = (
  kind: ChatCallKind,
  request: PreparedTurn["request"],
) => Promise<CallResult>;

const noCalls = (): ChatCallCounts => ({
  dialog: 0,
  hint: 0,
  explain: 0,
  eval: 0,
});

/** 평가 호출 한 번의 기록(꺼져 있으면 not_called — 부르지 않음). */
export type ChatEvalRecord = {
  childRowId: string;
  called: boolean;
  status: "done" | "failed" | "not_called" | "skipped";
  failure?: ChatEvalFailure;
  written?: boolean;
  usage?: TurnUsage | null;
  /** 평가 출력(판정 있음일 때 — 묶음 T1 fix 1 M-3). */
  output?: TalkChatEvalOutput;
  /** 평가 호출의 지연(ms). */
  latencyMs?: number;
};

/**
 * 대본 차례 하나(또는 앱이 아이 말 없이 연 입구 하나)의 기록. entry: 아이 말 차례 child · 입구(start · back · more · quiet) · 조용함 신호가 없어 그냥
 * 기다린 차례 wait · 고르기 단추 choose. waitedMs 는 끝 줄을 받은 때부터 이 차례가 나가기까지 가짜 시계로 잰 기다림이다. 아이 이름은 가린 글만 든다.
 */
export type ChatScenarioTurn = {
  no: number;
  entry: "child" | ChatOpen | "wait" | "choose";
  record: ChatTurnRecord | null;
  hints: {
    tier: number;
    retry: number;
    called: boolean;
    reply: ChatHintReply;
    /** 부른 누름만: 힌트 호출의 사용량 · 지연(ms) — 묶음 T1 fix 1 M-3(AC-15 힌트 지연). */
    usage?: TurnUsage | null;
    latencyMs?: number;
  }[];
  explain?: {
    called: boolean;
    reply: { ok: true; text: string } | { ok: false };
    usage?: TurnUsage | null;
    latencyMs?: number;
  };
  evals: ChatEvalRecord[];
  waitedMs: number;
  note: string | null;
  /** 대화 호출의 사용량(첫 문장 시간 · 입력 토큰 · 비용). */
  usage: TurnUsage | null;
  /** 이 차례에 부른 호출 수(갈래별). */
  calls: ChatCallCounts;
  /** 이 차례에 부른 호출 전부의 비용(달러). */
  costUsd: number;
};

export type ChatScenarioRun = {
  turns: ChatScenarioTurn[];
  stopped: string | null;
  /** 닫힌 수업(그만하기 · 안전 상한)의 정리 되짚을 말(sim.chat.wrapLines — 대본에서 셀 것 M-1). 닫히지 않은 수업은 칸이 없다. */
  wrap?: { en: string; ko?: string }[];
  /** 끝의 행(서버 꼴 — 늦게 온 평가로 고쳐 쓴 판정 chat_judge 포함, 묶음 T1 fix 1 M-3). */
  rows?: ChatSimRow[];
  calls: ChatCallCounts;
  costUsd: number;
};

const MS_PER_SECOND_CHAT = 1000;

/**
 * 이야기 방식 대본을 돌린다(서버 턴 길과 같은 함수 — sim.chat · 화면의 할 일과 같은 차례). 화면이 하는 일: 앱 입구(수업 첫 말 · 짧은 준비 뒤 돌아옴 ·
 * 고른 뒤 더 이야기하기)를 아이 말 없이 부르고, 끝 줄 신호로 조용함 타이머(core reduceChatQuiet — 가짜 시계, 읽기 끝은 끝 줄을 받은 때로 봄)를 걸며,
 * 설명 기다림 칸이 있으면 막힌 뒤 설명을 청하고, 차례의 hintTier 만큼 힌트 단을 차례로 연다(첫 누름이 실패하면 다시 받기, 연 단 수는 다음 턴 요청에).
 * 차례 input quiet 는 아이가 아무것도 하지 않음이다: 타이머가 지나면 조용함 차례, 신호가 없으면(잇달아 말한 수 상한 · 'AI 쉬는 중') 기다림만 남긴다.
 * chat.waitSeconds 만큼 망설인 뒤 말하면 그 사이 타이머가 지나 조용함 차례가 먼저 온다. 기록 전용 평가 호출은 evalOn 일 때만 부르고 끄면 '부르지
 * 않음'으로 적는다. 고르기 choose more 는 '더 이야기하기', stop 은 구석 '그만하기'(닫고 남은 평가를 부름)다. stopOn 이 까닭을 내면 그 자리에서 멈춘다.
 */
export async function runChatScenario(
  sim: TalkSim,
  steps: readonly ObserveStep[],
  opts: {
    call: ChatCaller;
    evalOn: boolean;
    stopOn?: (result: CallResult) => string | null;
  },
): Promise<ChatScenarioRun> {
  const turns: ChatScenarioTurn[] = [];
  const total = noCalls();
  let stopped: string | null = sim.chat.on ? null : "이야기 방식 세션이 아니다";
  let now = 0;
  let turnStart = 0;
  let quiet: ChatQuietState = CHAT_QUIET_OFF;
  const costOfUsage = (u: TurnUsage | null | undefined) => u?.costUsd ?? 0;
  const callOne = async (
    turn: ChatScenarioTurn,
    kind: ChatCallKind,
    request: PreparedTurn["request"],
  ): Promise<CallResult | null> => {
    const result = await opts.call(kind, request);
    turn.calls[kind] += 1;
    total[kind] += 1;
    const stop = opts.stopOn?.(result) ?? null;
    if (stop !== null) {
      stopped = stop;
      return null;
    }
    return result;
  };
  const newTurn = (
    no: number,
    entry: ChatScenarioTurn["entry"],
    waitedMs: number,
    note: string | null = null,
  ): ChatScenarioTurn => ({
    no,
    entry,
    record: null,
    hints: [],
    evals: [],
    waitedMs,
    note,
    usage: null,
    calls: noCalls(),
    costUsd: 0,
  });
  const runEval = async (
    turn: ChatScenarioTurn,
    childRowId: string,
  ): Promise<void> => {
    if (!opts.evalOn) {
      turn.evals.push({ childRowId, called: false, status: "not_called" });
      return;
    }
    const ask = sim.chat.evalAsk(childRowId);
    if (ask === null) {
      turn.evals.push({ childRowId, called: false, status: "skipped" });
      return;
    }
    const result = await callOne(turn, "eval", ask.request);
    if (result === null) return;
    const out = sim.chat.evalFinish(ask, result);
    turn.costUsd += costOfUsage(out.usage);
    turn.evals.push({
      childRowId,
      called: true,
      status: out.state.status === "done" ? "done" : "failed",
      ...(out.state.status === "failed" && out.state.failure !== undefined
        ? { failure: out.state.failure }
        : {}),
      written: out.written,
      usage: out.usage,
      ...(out.state.status === "done" ? { output: out.state.output } : {}),
      latencyMs: result.latencyMs,
    });
  };
  /** 선생님 차례 뒤 화면 · 서버가 하는 일: 응답 뒤 평가 · 막힌 뒤 설명 · 조용함 타이머 걸기 · 닫힌 차례면 남은 평가. */
  const afterTeacher = async (turn: ChatScenarioTurn): Promise<void> => {
    const record = turn.record;
    if (record === null) return;
    turnStart = now;
    const due = sim.chat.evalDue();
    if (due !== null) await runEval(turn, due);
    if (stopped !== null) return;
    if (
      record.close !== null ||
      record.teacher === null ||
      record.signal === null
    ) {
      quiet = CHAT_QUIET_OFF;
      if (record.close !== null)
        for (const id of sim.chat.closeEvalIds()) await runEval(turn, id);
      return;
    }
    quiet = reduceChatQuiet(quiet, {
      type: "open",
      now,
      turnKey: record.teacher.id,
      signal: record.signal,
    });
    quiet = reduceChatQuiet(quiet, { type: "read-end", now });
    if (record.signal.explainWait !== undefined) {
      const ask = sim.chat.hintAsk("explain");
      let recordOf: ChatHintRecord | null = null;
      let called = false;
      let latency = 0;
      let usage: TurnUsage | null = null;
      if (ask.kind === "stored") recordOf = ask.record;
      else if (ask.kind === "call") {
        called = true;
        const result = await callOne(turn, "explain", ask.request);
        if (result === null) return;
        latency = result.latencyMs;
        const out = sim.chat.hintFinish(ask, result);
        usage = out.usage;
        turn.costUsd += costOfUsage(out.usage);
        recordOf = out.ok ? out.record : null;
      }
      const reply = chatExplainReplyOf(recordOf);
      turn.explain = called
        ? { called, reply, usage, latencyMs: latency }
        : { called, reply };
      quiet = reduceChatQuiet(quiet, {
        type: reply.ok ? "explain-shown" : "explain-failed",
        now: now + latency,
      });
    }
  };
  const dialogTurn = async (
    entry: ChatSimEntry,
    turn: ChatScenarioTurn,
  ): Promise<boolean> => {
    const ready = sim.chat.prepare(entry);
    if (!ready.ok) {
      stopped = `차례 ${turn.no}: ${ready.reason}`;
      return false;
    }
    const result = await callOne(turn, "dialog", ready.turn.request);
    if (result === null) return false;
    const record = sim.chat.finish(ready.turn, result);
    turn.record = record;
    turn.usage = record.usage;
    turn.costUsd += costOfUsage(record.usage);
    turns.push(turn);
    await afterTeacher(turn);
    return stopped === null;
  };
  /** 앱 입구(수업 첫 말 · 돌아옴 · 더 이야기하기)를 받는 동안 부른다. */
  const drainOpens = async (): Promise<boolean> => {
    for (let guard = 0; guard < CHAT_OPENS_PER_STEP; guard++) {
      const open = sim.chat.openDue();
      if (open === null) return true;
      if (
        !(await dialogTurn(
          { kind: "open", open },
          newTurn(0, open, now - turnStart),
        ))
      )
        return false;
    }
    return true;
  };
  /** 조용함 타이머가 지난 때까지 시계를 옮기고 조용함 차례를 연다(끝 줄 신호가 기다림을 실었을 때만). */
  const quietTurn = async (
    no: number,
    note: string | null,
  ): Promise<boolean> => {
    const due = chatQuietDueAt(quiet);
    if (due === undefined) return false;
    now = due;
    quiet = reduceChatQuiet(quiet, { type: "tick", now });
    if (quiet.phase !== "sent") return false;
    return dialogTurn(
      { kind: "open", open: "quiet" },
      newTurn(no, "quiet", now - turnStart, note),
    );
  };

  for (const [i, step] of steps.entries()) {
    if (stopped !== null) break;
    if (!(await drainOpens())) break;
    const no = i + 1;
    if (step.choose !== undefined) {
      const turn = newTurn(no, "choose", now - turnStart, step.choose);
      turns.push(turn);
      if (step.choose === "stop") {
        quiet = reduceChatQuiet(quiet, { type: "input", now, input: "stop" });
        sim.chat.close();
        for (const id of sim.chat.closeEvalIds()) await runEval(turn, id);
        stopped = null;
        break;
      }
      const chosen = sim.chooseMore();
      if (!chosen.ok) {
        stopped = `차례 ${no}: ${chosen.reason}`;
        break;
      }
      continue;
    }
    const stop = sim.stopBefore();
    if (stop !== null) {
      stopped = `차례 ${no}: ${stop.reason}`;
      break;
    }
    if (step.input === "quiet") {
      if (!(await quietTurn(no, null))) {
        if (stopped !== null) break;
        turns.push(
          newTurn(
            no,
            "wait",
            now - turnStart,
            "조용함 신호 없음(잇달아 말한 수 상한 · 'AI 쉬는 중' · 고르기 차례) — 선생님이 더 말하지 않고 기다린다",
          ),
        );
      }
      continue;
    }
    // 망설임: 그 사이 조용함 타이머가 지나면 조용함 차례가 먼저 온다(그 말은 다음 아이 차례로)
    let wait = (step.chat?.waitSeconds ?? 0) * MS_PER_SECOND_CHAT;
    for (;;) {
      const due = chatQuietDueAt(quiet);
      if (due === undefined || turnStart + wait < due) break;
      const spent = due - turnStart;
      if (!(await quietTurn(no, "망설이는 사이 조용함 차례"))) break;
      wait = Math.max(0, wait - spent);
    }
    if (stopped !== null) break;
    if (sim.stopBefore() !== null) {
      stopped = `차례 ${no}: ${sim.stopBefore()?.reason ?? ""}`;
      break;
    }
    now = turnStart + wait;
    const turn = newTurn(no, "child", wait);
    // 힌트 누름: 단을 차례로 연다(첫 누름이 실패하면 다시 받기 — talk.chat_hint_retry_max 까지). 한 단이 다시 받기까지 실패하면 그 자리에 실패
    // 문구만 남고 다음 단은 열리지 않는다(화면과 같음 — 서버의 같은 번호 표지 행은 다시 부르지 않으므로 호출 수가 서버와 같다, 검토 rev-chat-t1 M-1)
    let opened = 0;
    const pressed = step.hintTier ?? 0;
    if (pressed > 0)
      quiet = reduceChatQuiet(quiet, { type: "input", now, input: "hint" });
    for (let tier = 0; tier < pressed && stopped === null; tier++) {
      let shown = false;
      for (let retry = 0; ; retry++) {
        const ask = sim.chat.hintAsk("hint", retry);
        let record: ChatHintRecord | null = null;
        let called = false;
        let usage: TurnUsage | null = null;
        let latencyMs = 0;
        if (ask.kind === "stored") record = ask.record;
        else if (ask.kind === "call") {
          called = true;
          const result = await callOne(turn, "hint", ask.request);
          if (result === null) break;
          latencyMs = result.latencyMs;
          const out = sim.chat.hintFinish(ask, result);
          usage = out.usage;
          turn.costUsd += costOfUsage(out.usage);
          record = out.ok ? out.record : null;
        }
        const reply =
          ask.kind === "none"
            ? ({ ok: false, retry: false } as const)
            : chatHintReplyOf({
                record,
                tier,
                retriesUsed: retry,
                retryMax: sim.chat.settings.hintRetryMax,
                aiResting: false,
              });
        turn.hints.push({
          tier,
          retry,
          called,
          reply,
          ...(called ? { usage, latencyMs } : {}),
        });
        if (reply.ok) {
          opened = tier + 1;
          shown = true;
        }
        if (reply.ok || !reply.retry || step.chat?.hintRetry === false) break;
      }
      if (!shown) break;
    }
    if (stopped !== null) break;
    quiet = reduceChatQuiet(quiet, {
      type: "input",
      now,
      input: step.say === undefined ? "dont_know" : "talk",
    });
    await dialogTurn(
      {
        kind: "child",
        step,
        stepIndex: i,
        hintOpened: opened,
        ...(step.chat?.recognizer === undefined
          ? {}
          : { recognizer: step.chat.recognizer }),
      },
      turn,
    );
  }
  if (stopped === null) await drainOpens();
  // 닫힌 수업이면 정리 되짚을 말(대본에서 셀 것 M-1), 끝의 행은 늘(늦게 온 평가로 고쳐 쓴 판정 포함 — 검토 rev-chat-t1 M-3)
  const closed = sim.stopBefore()?.reason === "대화가 닫혔다";
  return {
    turns,
    stopped,
    ...(closed ? { wrap: sim.chat.wrapLines() } : {}),
    rows: sim.chat.serverRows(),
    calls: total,
    costUsd:
      Math.round(turns.reduce((sum, t) => sum + t.costUsd, 0) * 1_000_000) /
      1_000_000,
  };
}

/** 한 대본 차례 앞에서 앱이 잇달아 여는 입구의 상한(수업 첫 말 · 돌아옴 · 더 이야기하기 — 기술 값, 되풀이 고리를 막음). */
const CHAT_OPENS_PER_STEP = 3;

/**
 * 이야기 방식 대본의 어림 호출 수(위쪽 어림 — 부르기 전 계획 줄): 대화는 수업 첫 말 · 아이 말 차례 · 짧은 준비 뒤 돌아옴(준비가 열리면 한 번) ·
 * '더 이야기하기' · 조용함 차례(잇달아 말한 수 상한까지 — 그 뒤는 기다림), 힌트는 누른 차례마다 첫 누름 + 다시 받기 상한, 설명은 앱이 아는 막힘
 * 차례(모름 단추 · 모름 말)마다 하나, 평가는 말 입력 차례마다 하나(켰을 때). 망설임으로 끼는 조용함 차례는 세지 않는다.
 */
export function chatCallPlanOf(
  steps: readonly ObserveStep[],
  {
    prepOpens,
    evalOn,
    hintRetryMax,
    teacherRunMax,
  }: {
    prepOpens: boolean;
    evalOn: boolean;
    hintRetryMax: number;
    teacherRunMax: number;
  },
): ChatCallCounts {
  const out = noCalls();
  out.dialog = 1 + (prepOpens ? 1 : 0);
  let run = 0;
  for (const step of steps) {
    if (step.choose === "more") {
      out.dialog += 1;
      continue;
    }
    if (step.choose !== undefined) continue;
    if (step.input === "quiet") {
      if (run < teacherRunMax) {
        out.dialog += 1;
        run += 1;
      }
      continue;
    }
    run = 0;
    out.dialog += 1;
    if ((step.hintTier ?? 0) > 0) out.hint += 1 + hintRetryMax;
    const stuck =
      step.input === "dont_know" ||
      (step.say !== undefined && isDontKnowSaying(step.say));
    if (stuck) out.explain += 1;
    if (evalOn && step.say !== undefined) out.eval += 1;
  }
  return out;
}

/** 이야기 방식 대본 한 바퀴의 보고(-chat.json 의 runs 한 칸). */
export type ChatObserveReport = {
  script: string;
  level: number;
  unit: number;
  lesson: number;
  round: number;
  evalOn: boolean;
  overrides: SettingOverride[];
  plan: ChatPlan | null;
  run: ChatScenarioRun;
};

/** 이야기 방식 보고(사람이 읽는 표 — 차례마다 입구 · 끝 갈래 · 사실 줄 · 신호 · 들은 영어 · 첫 문장 시간 · 입력 토큰 · 호출 · 비용). */
export function chatReportMarkdown(
  date: string,
  reports: readonly ChatObserveReport[],
): string {
  const out: string[] = [`# 이야기 방식 대본 ${date}`, ""];
  for (const r of reports) {
    out.push(
      `## ${r.script} · ${r.level}단계 단원 ${r.unit} 수업 ${r.lesson} · 바퀴 ${r.round} · 평가 ${r.evalOn ? "켬" : "끔"}`,
      "",
      `호출 대화 ${r.run.calls.dialog} · 힌트 ${r.run.calls.hint} · 설명 ${r.run.calls.explain} · 평가 ${r.run.calls.eval} · ${r.run.costUsd}달러${r.run.stopped ? ` · 멈춤: ${r.run.stopped}` : ""}`,
      "",
      "| 차례 | 입구 | 기다림 ms | 끝 | 사실 줄 | 신호 | 선생님 말 | 첫 문장 ms | 입력 토큰 | 호출 | 비용 |",
      "|---|---|---|---|---|---|---|---|---|---|---|",
    );
    for (const t of r.run.turns) {
      const rec = t.record;
      out.push(
        `| ${[
          String(t.no),
          t.entry,
          String(t.waitedMs),
          rec?.turnEnd ?? (rec?.close ? "close" : "-"),
          rec?.facts.join(" · ") ?? "",
          rec?.signal ? JSON.stringify(rec.signal) : "",
          (rec?.heard ?? t.note ?? "").replace(/\n/g, " / "),
          String(t.usage?.firstSentenceMs ?? "-"),
          String(t.usage?.inputTokens ?? "-"),
          CHAT_CALL_KINDS.filter((k) => t.calls[k] > 0)
            .map((k) => `${k} ${t.calls[k]}`)
            .join(" · "),
          String(t.costUsd),
        ]
          .map((c) => c.replace(/\|/g, "\\|"))
          .join(" | ")} |`,
      );
    }
    out.push("");
  }
  return `${out.join("\n")}\n`;
}

/** 이야기 방식 대본 하나의 계획(부르기 전 — 호출 갈래별 어림 수 · 어림 비용). */
export type ChatPlan = {
  name: string;
  calls: ChatCallCounts;
  evalOn: boolean;
  costUsd: number;
};

/**
 * 이야기 방식 대본의 계획(chatCallPlanOf 의 수 + 어림 비용 — 추측, 설계 값 아님): 대화 호출은 planRunOf 와 같은 셈(첫 요청 글자 · 차례마다 늘어나는
 * 기록), 힌트 · 설명 · 평가 호출은 그 규격 안내문 글자 / CHARS_PER_TOKEN + HISTORY_TOKENS_PER_TURN 입력 · OUTPUT_TOKENS_PER_CALL 출력, 단가는 그 목적의
 * 모델. 캐시 할인을 셈하지 않은 위쪽 어림이다.
 */
export function chatPlanOf({
  script,
  sim,
  materials,
  values,
  book,
  evalOn,
  dialogPromptChars,
}: {
  script: ObserveScript;
  sim: TalkSim;
  materials: Materials;
  values: Readonly<Record<string, unknown>>;
  book: ScriptConfig["book"];
  evalOn: boolean;
  dialogPromptChars: number;
}): ChatPlan {
  const calls = chatCallPlanOf(script.steps, {
    prepOpens: sim.chat.prepOpens,
    evalOn,
    hintRetryMax: sim.chat.settings.hintRetryMax,
    teacherRunMax: sim.chat.settings.teacherRunMax,
  });
  const configOf = (
    purpose: "talk_turn" | "talk_chat_hint" | "talk_chat_eval",
  ) => requestConfigOf({ purpose, level: script.level, values, book });
  const dialogConfig = configOf(PURPOSE);
  const dialog = planRunOf(
    {
      ...script,
      steps: Array.from({ length: calls.dialog }, () => ({ say: "-" })),
    },
    {
      ok: true,
      promptChars: dialogPromptChars,
      model: dialogConfig.model,
      effort: dialogConfig.effort,
      thinking: dialogConfig.thinking.type,
      price: book.get(dialogConfig.model),
    },
  );
  let hintChars = 0;
  try {
    const dummy: TalkChatHintInput = {
      level: script.level,
      sentenceMaxWords: materials.ctx.sentenceMaxWords,
      hintTiers: [...materials.spec.hintTiers],
      teacherNameEn: materials.teacher.nameEn,
      say: "",
      context: [],
    };
    hintChars = talkChatHintSystem(
      dummy,
      talkChatHintSpec.rulesOf(values, dummy),
    ).length;
  } catch {
    hintChars = 0;
  }
  const extraMicros = (
    purpose: "talk_chat_hint" | "talk_chat_eval",
    chars: number,
    n: number,
  ) => {
    const price = book.get(configOf(purpose).model);
    if (!price || n === 0) return 0;
    const input = Math.ceil(chars / CHARS_PER_TOKEN) + HISTORY_TOKENS_PER_TURN;
    return (
      (n * (input * price.input4 + OUTPUT_TOKENS_PER_CALL * price.output4)) /
      PRICE4_PER_MICRO
    );
  };
  const micros =
    extraMicros("talk_chat_hint", hintChars, calls.hint + calls.explain) +
    extraMicros("talk_chat_eval", TALK_CHAT_EVAL_SYSTEM.length, calls.eval);
  return {
    name: script.name,
    calls,
    evalOn,
    costUsd:
      Math.round(dialog.expectedCostUsd * 1_000_000 + micros) / 1_000_000,
  };
}

/** 이야기 방식 계획 줄(대본마다 한 줄 — planLines 뒤에 붙인다). */
export function chatPlanLines(
  plans: readonly ChatPlan[],
  rounds: number,
): string[] {
  if (plans.length === 0) return [];
  const sum = (k: ChatCallKind) =>
    plans.reduce((n, plan) => n + plan.calls[k], 0);
  const all = CHAT_CALL_KINDS.reduce((n, k) => n + sum(k), 0);
  const cost = plans.reduce((n, plan) => n + plan.costUsd, 0);
  return [
    ...plans.map(
      (plan) =>
        `${plan.name} · 이야기 방식(chat) · 호출 어림(위쪽) 대화 ${plan.calls.dialog} · 힌트 ${plan.calls.hint} · 설명 ${plan.calls.explain} · 평가 ${plan.calls.eval}(${plan.evalOn ? "켬" : "끔 — 부르지 않음"}) · 약 ${plan.costUsd.toFixed(4)}달러`,
    ),
    `이야기 방식 합계: 대본 ${plans.length} × 바퀴 ${rounds} · 호출 어림 ${all * rounds}(대화 ${sum("dialog") * rounds} · 힌트 ${sum("hint") * rounds} · 설명 ${sum("explain") * rounds} · 평가 ${sum("eval") * rounds}) · 약 ${(cost * rounds).toFixed(4)}달러 — 조용함 망설임 · 다시 받기 실패 밖, 캐시 할인을 셈하지 않은 위쪽 어림. 이 호출은 앱의 호출 기록 · 하루 알림에 들지 않는다(쓴 비용은 장부에)`,
  ];
}

export type PlanRun = {
  name: string;
  title: string;
  level: number;
  childTurns: number;
  calls: number;
  /** 첫 턴 요청의 시스템 프롬프트 · 응답 규격 글자 수(어림 재료). 건너뛴 대본은 0. */
  promptChars: number;
  expectedTokens: { input: number; output: number };
  expectedCostUsd: number;
  model: string;
  effort: string;
  thinking: string;
  skipped: string | null;
  /** 재질문(C203 (3)) 상한: 1~3단계에서 질문을 쓸 수 있는 말 입력 차례마다 1회(첫 차례 인사 끝은 질문이 없어 뺌). 4단계부터 0. */
  reaskMax: number;
  reaskMaxCostUsd: number;
  /** 이 대본에 덮은 설정(대본 칸 · --set). */
  overrides: SettingOverride[];
  /** 넘기는 지난 대화 요약 줄 수(대본 summaries). */
  summaries: number;
  /** 고정 입력 재생 대본인가(대본 칸 replay — 그 대본에만 칸이 있다). */
  replay?: true;
};

/** 자리 재현 모드(--anchored)에 붙이는 알림 글(계획 줄 · 보고 · 지표 표가 같은 글을 쓴다). */
export const ANCHORED_NOTICE =
  "자리 재현: 아이 차례마다 그 차례 바로 앞까지의 실제 수업 기록을 상태로 깔고 그 입력 하나에 대한 선생님 다음 차례만 새로 받는다(말 차례만 · 새 응답은 다음 차례로 잇지 않는다)";

/** 자리 재현을 돌릴 수 있는 대본인가(재생 대본이고 차례마다 anchor 가 있다). */
export function isAnchoredScript(script: ObserveScript): boolean {
  return (
    script.replay === true &&
    script.steps.every((step) => step.anchor !== undefined)
  );
}

/** 계획 줄의 차례 수: 자리 재현은 말 차례만 부른다(그 밖은 대본 그대로). */
function planScriptOf(script: ObserveScript, anchored: boolean): ObserveScript {
  if (!anchored) return script;
  const said = script.steps.filter((step) => step.say !== undefined);
  return said.length > 0 ? { ...script, steps: said } : script;
}

/** 글의 첫 낱말(소문자 — 없으면 null). */
function firstWordOf(text: string): string | null {
  for (const t of tokenize(text))
    if (t.kind === "word") return t.text.toLowerCase();
  return null;
}

/**
 * 깐 상태 대조(자리 재현): 도구가 그 자리에서 셈한 아이 행 칸이 실제 수업 기록과 다른 칸 이름. 같으면 빈 목록이다 — 다르면 기록을 그대로 깔지
 * 못한 것이라 보고에 적는다(노린 단어 · 들은 도움 · 토막).
 */
export function anchorCheckOf(
  p: Pick<PreparedTurn, "targets" | "heardHelp" | "hintKind" | "hintTier">,
  anchor: ObserveAnchor,
): string[] {
  const same = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((x, i) => x === b[i]);
  return [
    ...(same(p.targets, anchor.child.targets) ? [] : ["targets"]),
    ...(p.heardHelp === anchor.child.heardHelp ? [] : ["heardHelp"]),
    ...(p.hintKind === anchor.child.hint ? [] : ["hintKind"]),
    ...(p.hintTier === anchor.child.hintTier ? [] : ["hintTier"]),
  ];
}

/** 고정 입력 재생 대본에 붙이는 알림 글(계획 줄 · 보고 · 지표 표가 같은 글을 쓴다). */
export const REPLAY_NOTICE =
  "고정 입력 재생: 실제 수업의 아이 입력을 차례대로 그대로 넣는다. 선생님 말이 실제 수업과 달라지면 뒤 입력이 그 질문과 어긋날 수 있다";

/**
 * 예상 호출 · 비용(추측): 대본의 아이 차례마다 회화 턴 한 번(인사 첫 말 · 대화 첫 질문은 앱). 호출 i 의 입력은 첫 요청의 프롬프트 글자 /
 * CHARS_PER_TOKEN + i × HISTORY_TOKENS_PER_TURN, 출력은 OUTPUT_TOKENS_PER_CALL. 캐시 읽기 할인은 셈하지 않는다(위쪽 어림).
 * 재질문은 상한만 따로 적는다: 같은 차례 입력 + 앞 tori_en · 다시 쓰기 메시지(RETRY_NOTE_TOKENS).
 */
export function planRunOf(
  script: ObserveScript,
  info:
    | {
        ok: true;
        promptChars: number;
        model: string;
        effort: string;
        thinking: string;
        price: { input4: number; output4: number } | undefined;
      }
    | { ok: false; missing: string },
  overrides: readonly SettingOverride[] = [],
): PlanRun {
  const base = {
    name: script.name,
    title: script.title,
    level: script.level,
    childTurns: script.steps.length,
    overrides: [...overrides],
    summaries: script.summaries?.length ?? 0,
    ...(script.replay === true ? { replay: true as const } : {}),
  };
  if (!info.ok)
    return {
      ...base,
      calls: 0,
      promptChars: 0,
      expectedTokens: { input: 0, output: 0 },
      expectedCostUsd: 0,
      model: "",
      effort: "",
      thinking: "",
      skipped: info.missing,
      reaskMax: 0,
      reaskMaxCostUsd: 0,
    };
  const calls = script.steps.length;
  const first = Math.ceil(info.promptChars / CHARS_PER_TOKEN);
  let input = 0;
  for (let i = 0; i < calls; i++) input += first + i * HISTORY_TOKENS_PER_TURN;
  const output = calls * OUTPUT_TOKENS_PER_CALL;
  const microsOf = (inTokens: number, outTokens: number) =>
    info.price
      ? (inTokens * info.price.input4 + outTokens * info.price.output4) /
        PRICE4_PER_MICRO
      : 0;
  const micros = microsOf(input, output);
  const reaskAt = isLowBandLevel(script.level)
    ? script.steps.flatMap((step, i) =>
        i > 0 && step.say !== undefined ? [i] : [],
      )
    : [];
  const reaskMicros = reaskAt.reduce(
    (sum, i) =>
      sum +
      microsOf(
        first + i * HISTORY_TOKENS_PER_TURN + RETRY_NOTE_TOKENS,
        OUTPUT_TOKENS_PER_CALL,
      ),
    0,
  );
  return {
    ...base,
    calls,
    promptChars: info.promptChars,
    expectedTokens: { input, output },
    expectedCostUsd: Math.round(micros) / 1_000_000,
    model: info.model,
    effort: info.effort,
    thinking: info.thinking,
    skipped: null,
    reaskMax: reaskAt.length,
    reaskMaxCostUsd: Math.round(reaskMicros) / 1_000_000,
  };
}

/** 계획 줄: 대본마다 한 바퀴 값, 합계는 바퀴 수를 곱한 값. 끝 줄은 보고 자리(기준선이 있으면 그 뒤에 한 줄). */
export function planLines(
  runs: readonly PlanRun[],
  meta: {
    settingsSource: string;
    pricesSource: string;
    out: string;
    rounds: number;
    baseline: string | null;
    /** 자리 재현 모드(--anchored)인가. */
    anchored?: boolean;
  },
): string[] {
  const live = runs.filter((r) => r.skipped === null);
  const n = meta.rounds;
  const calls = live.reduce((s, r) => s + r.calls, 0);
  const cost = live.reduce((s, r) => s + r.expectedCostUsd, 0);
  const reask = live.reduce((s, r) => s + r.reaskMax, 0);
  const reaskCost = live.reduce((s, r) => s + r.reaskMaxCostUsd, 0);
  const extraOf = (r: PlanRun) =>
    [
      ...(meta.anchored === true
        ? ["자리 재현"]
        : r.replay === true
          ? ["고정 입력 재생"]
          : []),
      ...(r.summaries > 0 ? [`지난 대화 요약 ${r.summaries}줄`] : []),
      ...(r.overrides.length > 0
        ? [`덮는 설정 ${r.overrides.map(overrideText).join(" · ")}`]
        : []),
    ]
      .map((x) => ` · ${x}`)
      .join("");
  return [
    `talk-observe: 계획만(부르지 않음 — 실제 호출은 --yes) · 설정 ${meta.settingsSource} · 단가 ${meta.pricesSource} · 바퀴 ${n}`,
    ...runs.map((r) =>
      r.skipped !== null
        ? `${r.name} · ${r.level}단계 · 아이 차례 ${r.childTurns} · 건너뜀: ${r.skipped}`
        : `${r.name} · ${r.level}단계 · ${r.model} · effort ${r.effort} · 생각 ${r.thinking} · 아이 차례 ${r.childTurns} · 예상 호출 ${r.calls} · 입력 약 ${r.expectedTokens.input} · 출력 약 ${r.expectedTokens.output} 토큰 · 약 ${r.expectedCostUsd.toFixed(4)}달러 · 재질문 최대 +${r.reaskMax}회(약 ${r.reaskMaxCostUsd.toFixed(4)}달러)${extraOf(r)}`,
    ),
    `합계: 대본 ${runs.length}(돌릴 것 ${live.length}) × 바퀴 ${n} · 예상 호출 ${calls * n}(한 바퀴 ${calls}) · 예상 비용 약 ${(cost * n).toFixed(4)}달러(한 바퀴 약 ${cost.toFixed(4)}) · 재질문 최대 +${reask * n}회(한 턴에 1회 상한, 1~3단계 질문 검사에 걸리거나 막힘을 무른 턴만 — 약 ${(reaskCost * n).toFixed(4)}달러 더) · 캐시 할인을 셈하지 않은 위쪽 어림`,
    ...(meta.anchored === true
      ? [`${ANCHORED_NOTICE}.`]
      : runs.some((r) => r.replay === true)
        ? [`${REPLAY_NOTICE}.`]
        : []),
    `보고 자리: ${meta.out}`,
    ...(meta.baseline !== null
      ? [
          `기준선: ${meta.baseline} — 끝의 지표 표(talk-metrics)가 대본마다 견준다`,
        ]
      : []),
  ];
}

// ── 보고 ─────────────────────────────────────────────────────────

export type RunReport = {
  script: Pick<
    ObserveScript,
    | "name"
    | "title"
    | "level"
    | "unit"
    | "lesson"
    | "teacher"
    | "source"
    | "note"
    | "prep"
    | "replay"
  >;
  model: string;
  effort: string;
  thinking: string;
  /** 몇째 바퀴인가(1부터, --rounds). */
  round: number;
  /** 첫 턴 요청의 시스템 프롬프트 전문(고정부 · 가변부 — JSON 보고에만, 비교 재료). 첫 차례를 준비하지 못했으면 빈 글. */
  systemPrompt: string;
  /** 이 대본에 덮은 설정(대본 칸 · --set). */
  overrides: SettingOverride[];
  /** 넘긴 지난 대화 요약(talk.memory_summaries 줄까지). */
  summaries: string[];
  turns: TurnRecord[];
  opening: string[];
  stopped: string | null;
  /** 자리 재현으로 돈 바퀴(--anchored — 그 바퀴에만 칸이 있다). 차례들은 서로 잇지 않은 따로 받은 응답이다. */
  anchored?: true;
};

const cell = (text: string) =>
  text.replaceAll("|", "\\|").replaceAll("\n", " / ").trim() || "—";
const yn = (v: boolean | null) => (v === null ? "—" : v ? "예" : "아니요");

/** 갈래 칸: child_kind · 막힘(AI → 앱, 무름 표시). 말 입력이 아니면 갈래가 없다. */
function childKindCell(t: TurnRecord): string {
  const kind = t.childKind ?? "—";
  const ai = t.stuck.ai === null ? "—" : t.stuck.ai ? "참" : "거짓";
  return t.stuck.overridden
    ? `${kind} · 막힘 ${ai} → 무름`
    : `${kind} · 막힘 ${t.stuck.app ? "참" : "거짓"}`;
}

function soundCell(s: TurnRecord["sound"]): string {
  return [
    s.model !== undefined ? `따라 할 말 〈${s.model}〉` : "",
    s.choices ? `선택지 〈${s.choices[0]}〉〈${s.choices[1]}〉` : "",
    s.answer !== undefined ? `답 소리 〈${s.answer}〉` : "",
  ]
    .filter((x) => x !== "")
    .join(" · ");
}

function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] ??
    null
  );
}

export type ObserveTotals = {
  turns: number;
  calls: number;
  failures: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  costUsd: number;
  firstSentenceP50: number | null;
  firstSentenceP95: number | null;
  followUps: number;
  aiTurns: number;
  replaced: Record<string, number>;
  sameQuestion: number;
  /** 재질문 턴 수 · 그 비용(본 호출 비용과 따로). */
  reaskTurns: number;
  reaskCostUsd: number;
  sceneAssert: number;
  answerFirst: number;
  expectMismatch: number;
  /** 기술 오류 자리 차례 수(들리지 않음 · 호출 실패 등 — 한 차례가 둘 다면 둘 다 센다). */
  techErrors: { nospeech: number; call: number };
};

export function totalsOf(runs: readonly RunReport[]): ObserveTotals {
  const turns = runs.flatMap((r) => r.turns);
  const used = turns.flatMap((t) => (t.usage ? [t.usage] : []));
  const first = used.flatMap((u) =>
    u.firstSentenceMs === null ? [] : [u.firstSentenceMs],
  );
  const replaced: Record<string, number> = {};
  for (const t of turns)
    if (t.replaced) replaced[t.replaced] = (replaced[t.replaced] ?? 0) + 1;
  return {
    turns: turns.length,
    calls: used.length,
    failures: turns.filter((t) => t.failure !== null).length,
    inputTokens: used.reduce((s, u) => s + u.inputTokens, 0),
    outputTokens: used.reduce((s, u) => s + u.outputTokens, 0),
    cacheReadTokens: used.reduce((s, u) => s + u.cacheReadTokens, 0),
    costUsd: Math.round(used.reduce((s, u) => s + u.costUsd, 0) * 1e6) / 1e6,
    reaskTurns: turns.filter((t) => t.reask !== null).length,
    reaskCostUsd:
      Math.round(
        turns.reduce((s, t) => s + (t.reask?.usage?.costUsd ?? 0), 0) * 1e6,
      ) / 1e6,
    firstSentenceP50: percentile(first, 0.5),
    firstSentenceP95: percentile(first, 0.95),
    followUps: turns.filter((t) => t.judge.followUp.auto === true).length,
    aiTurns: turns.filter((t) => t.move.kind === "ai").length,
    replaced,
    sameQuestion: turns.filter((t) => t.sameQuestion !== null).length,
    sceneAssert: turns.filter((t) => t.judge.sceneAssert.auto === true).length,
    answerFirst: turns.filter((t) => t.judge.answerFirst.auto === true).length,
    techErrors: {
      nospeech: turns.filter((t) => t.techError?.nospeech === true).length,
      call: turns.filter((t) => (t.techError?.call ?? null) !== null).length,
    },
    expectMismatch: turns.reduce(
      (s, t) =>
        s +
        JUDGE_KEYS.filter((k) => {
          const c = t.judge[k];
          return c.expect !== null && c.auto !== null && c.expect !== c.auto;
        }).length,
      0,
    ),
  };
}

export function reportMarkdown({
  date,
  runs,
  skipped,
}: {
  date: string;
  runs: readonly RunReport[];
  skipped: readonly PlanRun[];
}): string {
  const out: string[] = [
    `# 회화 수업 실호출 표본 평가(talk:observe · ${date})`,
    "",
    "읽는 법. 아이 말은 대본의 글(인식 결과 흉내)이고 흐름은 앱의 순수 함수를 메모리 상태로 돌린 것이다. 〈 〉 는 글 없이 소리로만 나가는 줄이다. '자동'은 이 턴의 사실로 센 힌트이고 판정은 '사람' 칸에 적는다(□ 를 예 · 아니요로). '—' 는 값 없음이다.",
    "",
  ];
  for (const r of runs) {
    const s = r.script;
    out.push(
      `## ${s.title}(\`${s.name}\` · ${s.level}단계 단원 ${s.unit} 수업 ${s.lesson} · 선생님 ${s.teacher} · ${r.model} · effort ${r.effort} · 생각 ${r.thinking} · 바퀴 ${r.round})`,
      "",
    );
    if (s.source) out.push(`출처: ${s.source}`, "");
    if (s.note) out.push(s.note, "");
    if (r.anchored === true) out.push(`${ANCHORED_NOTICE}.`, "");
    else if (s.replay === true) out.push(`${REPLAY_NOTICE}.`, "");
    if (r.overrides.length > 0)
      out.push(`덮은 설정: ${r.overrides.map(overrideText).join(" · ")}`, "");
    if (r.summaries.length > 0)
      out.push(
        `지난 대화 요약(넘긴 것): ${r.summaries.map(cell).join(" / ")}`,
        "",
      );
    if (s.prep?.skipped.length)
      out.push(
        `짧은 준비에서 건너뜀(인식 실패 흉내): ${s.prep.skipped.join(" · ")} — 다시 묻는 낱말(reaskWords)에는 보인 낱말 전부가 들고, 이미 만난 낱말(사용자 메시지 'Already met')에서는 뺀다(서버와 같음, 분석 A9).`,
        "",
      );
    if (r.opening.length > 0)
      out.push(`앱 첫 차례: ${r.opening.map(cell).join(" / ")}`, "");
    out.push(
      "| 차례 | 아이(대본) | 갈래(child_kind · 막힘) | 계획 | 선생님 말 | 붙인 줄 | tori_ko | 소리 줄 | recast | 갈래 | 카드 자리 까닭 | 되돌림 | 같은 질문 | 토큰(입력 · 출력 · 캐시 읽기) | 첫 문장 · 전체 ms | 비용 | 표시 |",
      "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    );
    for (const t of r.turns) {
      const u = t.usage;
      out.push(
        `| ${t.no} | ${cell(t.child)} | ${cell(childKindCell(t))} | ${cell(t.plan)} | ${cell(t.teacher)} | ${cell(t.attach.join(" / "))} | ${cell(t.toriKo ?? "")} | ${cell(soundCell(t.sound))} | ${cell(t.recast)}${t.recastCheck ? ` (${t.recastCheck.word} ${t.recastCheck.ok ? "담음" : "없음"})` : ""} | ${t.move.kind} · ${t.move.next} | ${cell(t.replaced ?? t.move.why ?? "")} | ${cell(t.returned ?? "")} | ${cell(t.sameQuestion ?? "")} | ${u ? `${u.inputTokens} · ${u.outputTokens} · ${u.cacheReadTokens}` : "—"} | ${u ? `${u.firstSentenceMs ?? "—"} · ${u.latencyMs}` : "—"} | ${u ? u.costUsd.toFixed(6) : "—"}${t.reask ? ` · 재질문 ${t.reask.usage ? t.reask.usage.costUsd.toFixed(6) : "—"}` : ""} | ${cell([...(t.failure ? [t.failure] : []), ...(t.reask ? [`재질문: ${t.reask.outcome}`] : []), ...t.flags, ...(t.appAfter.length > 0 ? [`앱 다음 차례: ${t.appAfter.join(" / ")}`] : [])].join(" · "))} |`,
      );
    }
    if (r.stopped) out.push("", `멈춤: ${r.stopped}`);
    out.push(
      "",
      "### 나란히(설계 예시 · 기대 옆에 실제)",
      "",
      `| 차례 | 설계된 대화(대본) | 실제 선생님 말 | ${JUDGE_KEYS.map((k) => `${JUDGE_LABELS[k]}: 기대 · 자동 · 사람`).join(" | ")} |`,
      `|---|---|---|${JUDGE_KEYS.map(() => "---").join("|")}|`,
    );
    for (const t of r.turns) {
      const actual = [t.teacher, ...t.attach, soundCell(t.sound)]
        .filter((x) => x !== "")
        .join(" / ");
      out.push(
        `| ${t.no} | ${cell(t.design ?? "")} | ${cell(actual)} | ${JUDGE_KEYS.map((k) => `${yn(t.judge[k].expect)} · ${yn(t.judge[k].auto)} · □`).join(" | ")} |`,
      );
    }
    out.push("");
  }
  for (const s of skipped)
    out.push(`- 건너뜀: \`${s.name}\`(${s.level}단계) — ${s.skipped}`);
  const t = totalsOf(runs);
  out.push(
    "",
    "## 합계",
    "",
    "| 항목 | 값 |",
    "|---|---|",
    `| 아이 차례 · 호출 · 실패 | ${t.turns} · ${t.calls} · ${t.failures} |`,
    `| 토큰(입력 · 출력 · 캐시 읽기) | ${t.inputTokens} · ${t.outputTokens} · ${t.cacheReadTokens} |`,
    `| 비용(달러, 본 호출) | ${t.costUsd.toFixed(6)} |`,
    `| 재질문 턴 · 비용(달러, 따로) | ${t.reaskTurns} · ${t.reaskCostUsd.toFixed(6)} |`,
    `| 첫 문장 p50 · p95(ms) | ${t.firstSentenceP50 ?? "—"} · ${t.firstSentenceP95 ?? "—"} |`,
    `| 이어 묻기(자동) · AI 차례 | ${t.followUps} · ${t.aiTurns} |`,
    `| 카드 자리로 바꾼 턴(까닭별) | ${
      Object.entries(t.replaced)
        .map(([k, v]) => `${k} ${v}`)
        .join(" · ") || "0"
    } |`,
    `| 같은 질문 표시 턴 | ${t.sameQuestion} |`,
    `| 장면 단정(자동) · 답을 먼저 들려줌(자동) | ${t.sceneAssert} · ${t.answerFirst} |`,
    `| 기술 오류 자리(들리지 않음 · 호출) | ${t.techErrors.nospeech} · ${t.techErrors.call} |`,
    `| 기대와 자동 힌트가 다른 칸 | ${t.expectMismatch} |`,
    `| 카드 질문을 맥락 없이 끼운 턴(사람 판정, AC-15o (라)) | □ |`,
    "",
  );
  return out.join("\n");
}

// ── 실행 ─────────────────────────────────────────────────────────

/** 기준선 JSON(지표 셈이 읽는 꼴 — talk-metrics ObserveJson). */
type ObserveJsonLike = {
  date: string;
  effort: string;
  rounds: number;
  runs: RunReport[];
};

export type TalkObserveIo = {
  root: string;
  config: ScriptConfig;
  readScripts: () => { file: string; raw: unknown }[];
  readSeed: (level: number, unit: number) => SeedFiles;
  createClient: () => Anthropic;
  log: (line: string) => void;
  write: (path: string, text: string) => void;
  now?: () => Date;
  /** 기준선 JSON 읽기(없으면 파일에서 — 시험은 메모리로 넘긴다). */
  readJson?: (path: string) => unknown;
};

/** 흘려 받기 시도 하나(베타 stream · maxRetries 0). tori_en 의 첫 문장이 끝난 시각을 잰다(서버 첫 문장 시간과 같은 뜻 — 문장 문 앞). */
async function streamTurn(
  client: Anthropic,
  request: PreparedTurn["request"],
  keys?: ToriEnReaderKeys,
): Promise<CallResult> {
  const started = Date.now();
  const reader = createToriEnReader(keys);
  let firstSentenceMs: number | null = null;
  const stream = client.beta.messages.stream(
    {
      ...request.body,
      ...(request.betas.length > 0 ? { betas: request.betas } : {}),
    } as never,
    { timeout: request.timeoutMs },
  );
  stream.on("text", (delta) => {
    if (reader.push(delta).length > 0 && firstSentenceMs === null)
      firstSentenceMs = Date.now() - started;
  });
  try {
    const message = await stream.finalMessage();
    return {
      ok: true,
      message: message as unknown as Extract<
        CallResult,
        { ok: true }
      >["message"],
      latencyMs: Date.now() - started,
      firstSentenceMs,
      requestId: stream.request_id ?? "",
    };
  } catch (error) {
    const status =
      error instanceof APIError && typeof error.status === "number"
        ? error.status
        : 0;
    // 오류 본문의 message 도 200자까지 남긴다(원인 가리기 — 2026-11-06 3회차 400 전부 실패 뒤 보탬). 키 · 비밀값은 본문에 없다
    const apiError =
      error instanceof APIError
        ? (
            error.error as
              | { error?: { type?: string; message?: string } }
              | undefined
          )?.error
        : undefined;
    const detail =
      error instanceof APIError
        ? `${apiError?.type ?? error.constructor.name}${apiError?.message ? ` — ${apiError.message.slice(0, 200)}` : ""}`
        : error instanceof Error
          ? error.name
          : "Error";
    return { ok: false, status, detail, latencyMs: Date.now() - started };
  }
}

function loadScripts(io: Pick<TalkObserveIo, "readScripts">): ObserveScript[] {
  const scripts: ObserveScript[] = [];
  for (const { file, raw } of io.readScripts()) {
    const parsed = parseObserveScript(raw, file);
    if (!parsed.ok) throw new ScriptInputError(parsed.error);
    scripts.push(parsed.script);
  }
  return scripts;
}

export async function runTalkObserve(
  args: TalkObserveArgs,
  io: TalkObserveIo,
): Promise<number> {
  const chosen = selectScripts(loadScripts(io), args);
  // 자리 재현은 차례마다 실제 수업 기록(anchor)이 있는 재생 대본만 돌린다
  const scripts = args.anchored ? chosen.filter(isAnchoredScript) : chosen;
  if (scripts.length === 0)
    throw new ScriptInputError(
      args.anchored && chosen.length > 0
        ? "자리 재현(--anchored)은 차례마다 anchor 가 있는 재생 대본만 돌린다"
        : "고른 대본이 없다(--script · --level 을 보라)",
    );
  const out = args.out ?? join(tmpdir(), "talk-observe");
  const simOptionsOf = (script: ObserveScript) => ({
    skippedPrep: script.prep?.skipped ?? [],
    summaries: script.summaries ?? [],
  });
  const prepared = scripts.map((script) => {
    const { values, overrides } = runValuesOf({
      values: io.config.values,
      level: script.level,
      effort: args.effort,
      script,
      set: args.set,
    });
    const m = materialsOf(io.readSeed(script.level, script.unit), script);
    if (!m.ok)
      return {
        script,
        materials: null,
        values,
        overrides,
        chatPlan: null,
        run: planRunOf(script, m, overrides),
      };
    const sim = createTalkSim(
      m.materials,
      values,
      io.config.book,
      simOptionsOf(script),
    );
    // 이야기 방식 수업(talk.lead_mode chat — 묶음 T1)의 첫 요청은 수업 첫 말 입구다
    const chatFirst = sim.chat.on
      ? sim.chat.prepare({ kind: "open", open: "start" })
      : null;
    const first = chatFirst ?? sim.prepare(script.steps[0] as ObserveStep, 0);
    const promptChars = first.ok
      ? String(first.turn.request.body.system ?? "").length +
        JSON.stringify(
          (first.turn.request.body.output_config as { format?: unknown })
            .format ?? {},
        ).length
      : 0;
    const chatPlan = sim.chat.on
      ? chatPlanOf({
          script,
          sim,
          materials: m.materials,
          values,
          book: io.config.book,
          evalOn: args.chatEval !== false,
          dialogPromptChars: promptChars,
        })
      : null;
    const config = requestConfigOf({
      purpose: PURPOSE,
      level: script.level,
      values,
      book: io.config.book,
    });
    const price = io.config.book.get(config.model);
    return {
      script,
      materials: m.materials,
      values,
      overrides,
      chatPlan,
      run: planRunOf(
        planScriptOf(script, args.anchored === true),
        {
          ok: true,
          promptChars,
          model: config.model,
          effort: config.effort,
          thinking: config.thinking.type,
          price,
        },
        overrides,
      ),
    };
  });
  const runs = prepared.map((p) => p.run);
  for (const line of planLines(runs, {
    settingsSource: io.config.settingsSource,
    pricesSource: io.config.pricesSource,
    out,
    rounds: args.rounds,
    baseline: args.baseline,
    anchored: args.anchored === true,
  }))
    io.log(line);
  const chatPlans = prepared.flatMap((p) =>
    p.chatPlan === null ? [] : [p.chatPlan],
  );
  for (const line of chatPlanLines(chatPlans, args.rounds)) io.log(line);
  // 기준선은 부르기 전에 읽어 꼴을 본다(잘못된 기준선으로 실호출을 쓰지 않게)
  const metricsModule = await import("./talk-metrics");
  let baselineJson: ObserveJsonLike | null = null;
  if (args.baseline !== null) {
    const parsed = metricsModule.parseObserveJson(
      (io.readJson ?? readJsonFile)(args.baseline),
      args.baseline,
    );
    if (!parsed.ok) throw new ScriptInputError(parsed.error);
    baselineJson = parsed.json;
  }
  if (!args.yes) return EXIT_OK;

  const client = io.createClient();
  const reports: RunReport[] = [];
  const chatReports: ChatObserveReport[] = [];
  let stopAll: string | null = null;
  // 바퀴마다 대본 전부를 한 번씩(같은 바퀴의 대본이 붙어 있게 — 중간에 멈춰도 앞 바퀴는 온전하다)
  for (let round = 1; round <= args.rounds; round++)
    for (const p of prepared) {
      if (!p.materials || stopAll) continue;
      // 바퀴마다 다른 돌림 열쇠(서버 세션 id 자리 — 같은 대본 두 바퀴가 같은 자리에서 같은 상황 줄을 내지 않게, 판정 r1 M-6)
      const simOptions = {
        ...simOptionsOf(p.script),
        rotationKey: `${p.script.name}#${round}`,
      };
      const sim = createTalkSim(
        p.materials,
        p.values,
        io.config.book,
        simOptions,
      );
      if (sim.chat.on) {
        // 이야기 방식: 대화 · 힌트 · 설명 · 평가 호출이 모두 같은 문(--yes 와 위 계획 줄)을 지난 뒤 이 자리에서만 부른다
        const run = await runChatScenario(sim, p.script.steps, {
          call: (kind, request) =>
            streamTurn(
              client,
              request,
              kind === "dialog" ? OBSERVE_CHAT_READER_KEYS : undefined,
            ),
          evalOn: args.chatEval !== false,
          stopOn: (result) => {
            if (result.ok) return null;
            const f = observeFailureOf(result.status, {}, new Headers());
            if (!f.stop) return null;
            stopAll = `${f.key} — 실행 전체를 멈춘다(콘솔 한도 · 계정)`;
            return stopAll;
          },
        });
        for (const t of run.turns)
          io.log(
            `${p.script.name}${args.rounds > 1 ? ` · 바퀴 ${round}` : ""} · ${t.no} · ${t.entry}${t.record ? ` · ${t.record.turnEnd ?? "-"} · 신호 ${JSON.stringify(t.record.signal)}` : ""}${t.usage ? ` · ${t.usage.firstSentenceMs ?? "-"}ms · 입력 ${t.usage.inputTokens}` : (t.record?.failure ?? t.note ?? "")} · 호출 ${CHAT_CALL_KINDS.map((k) => `${k} ${t.calls[k]}`).join(" ")} · ${t.costUsd}달러`,
          );
        chatReports.push({
          script: p.script.name,
          level: p.script.level,
          unit: p.script.unit,
          lesson: p.script.lesson,
          round,
          evalOn: args.chatEval !== false,
          overrides: p.overrides,
          plan: p.chatPlan,
          run,
        });
        continue;
      }
      const opening = sim.rows.flatMap((r) =>
        r.speaker === "tori" ? [r.text.trim()] : [],
      );
      const turns: TurnRecord[] = [];
      let stopped: string | null = null;
      let systemPrompt = "";
      /** 한 차례를 부르고(재질문 포함) 보고 한 줄을 낸다. 실행 전체를 멈출 실패면 null(stopAll 을 적는다). */
      const callOne = async (
        on: TalkSim,
        turn: PreparedTurn,
      ): Promise<TurnRecord | null> => {
        const result = await streamTurn(client, turn.request);
        if (!result.ok) {
          const f = observeFailureOf(result.status, {}, new Headers());
          if (f.stop) {
            stopAll = `${f.key} — 실행 전체를 멈춘다(콘솔 한도 · 계정)`;
            stopped = stopAll;
            return null;
          }
        }
        // 재질문(C203 (3)): 걸린 1~3단계 질문이면 한 번 더 부른다(한 턴에 1회 — 서버 withQuestionRetry 와 같음)
        const ask = on.retryOf(turn, result);
        const again = ask ? await streamTurn(client, ask.request) : null;
        const record = on.finish(
          turn,
          result,
          ask && again ? { ask, result: again } : undefined,
        );
        io.log(
          `${p.script.name}${args.rounds > 1 ? ` · 바퀴 ${round}` : ""} · ${record.no} · ${record.move.kind}/${record.move.next} · ${record.usage ? `${record.usage.firstSentenceMs ?? "-"}ms · 입력 ${record.usage.inputTokens} · 출력 ${record.usage.outputTokens} · ${record.usage.costUsd}달러` : (record.failure ?? "")}${record.reask ? ` · 재질문 ${record.reask.usage?.costUsd ?? "-"}달러 · ${record.reask.outcome}` : ""}`,
        );
        return record;
      };
      if (args.anchored) {
        // 자리 재현: sim 은 실제 수업 기록만 깔며 나아가고, 말 차례마다 그 상태의 사본에서 한 차례만 새로 받는다(새 응답은 잇지 않는다)
        let prevFirstWord: string | null = null;
        for (const [i, step] of p.script.steps.entries()) {
          const anchor = step.anchor as ObserveAnchor;
          const fixed: ObserveStep = {
            ...step,
            hint: anchor.child.hint,
            hintTier: anchor.child.hintTier,
          };
          const ready = sim.prepare(fixed, i);
          if (!ready.ok) {
            stopped = `차례 ${i + 1}: ${ready.reason}`;
            break;
          }
          if (systemPrompt === "")
            systemPrompt = String(ready.turn.request.body.system ?? "");
          if (step.say !== undefined) {
            const fork = createTalkSim(p.materials, p.values, io.config.book, {
              ...simOptions,
              seed: sim.snapshot(),
            });
            const forked = fork.prepare(fixed, i);
            if (!forked.ok) {
              stopped = `차례 ${i + 1}: ${forked.reason}`;
              break;
            }
            const record = await callOne(fork, forked.turn);
            if (record === null) break;
            turns.push({
              ...record,
              anchored: {
                lessonAfter: (anchor.teachers[0]?.text ?? "")
                  .split("\n")
                  .map((line) => line.trim())
                  .filter((line) => line !== "")
                  .join(" / "),
                prevFirstWord,
                check: anchorCheckOf(forked.turn, anchor),
              },
            });
          }
          sim.lay(ready.turn, anchor);
          // 기록에서 이 차례 뒤의 AI 반응(대화 토막 · 받침 아님 · AI 글이 있음)의 첫 낱말 — 다음 차례의 (나) 견줌 재료
          const answered = anchor.teachers[0];
          const reaction = answered?.text.split("\n")[0] ?? "";
          if (
            answered &&
            ready.turn.segment !== "greeting" &&
            ready.turn.segment !== "greeting_end" &&
            answered.move.stage === 0 &&
            reaction.trim() !== ""
          )
            prevFirstWord = firstWordOf(reaction);
        }
      } else
        for (const [i, step] of p.script.steps.entries()) {
          const ready = sim.prepare(step, i);
          if (!ready.ok) {
            stopped = ready.reason;
            break;
          }
          if (i === 0)
            systemPrompt = String(ready.turn.request.body.system ?? "");
          const record = await callOne(sim, ready.turn);
          if (record === null) break;
          turns.push(record);
        }
      reports.push({
        script: p.script,
        model: p.run.model,
        effort: p.run.effort,
        thinking: p.run.thinking,
        round,
        systemPrompt,
        overrides: p.overrides,
        summaries: summariesOf(p.script.summaries ?? [], p.values),
        turns,
        opening,
        stopped,
        ...(args.anchored ? { anchored: true as const } : {}),
      });
    }
  const date = (io.now?.() ?? new Date()).toISOString().slice(0, 10);
  const effort = args.effort ?? "settings";
  const base = join(
    out,
    `${date}-talk-observe-${effort}${args.anchored ? "-anchored" : ""}`,
  );
  const skipped = runs.filter((r) => r.skipped !== null);
  // 이야기 방식 대본의 기록은 따로 둔다(지금 길의 보고 · 지표 꼴과 다름 — 실험 묶음 T2 가 읽는다). 아이 이름은 가린 글만 든다
  if (chatReports.length > 0) {
    io.write(
      `${base}-chat.json`,
      `${JSON.stringify({ date, effort, rounds: args.rounds, set: args.set, runs: chatReports }, null, 2)}\n`,
    );
    io.write(`${base}-chat.md`, chatReportMarkdown(date, chatReports));
    io.log(`talk-observe: 이야기 방식 ${base}-chat.md · ${base}-chat.json`);
    if (reports.length === 0) return EXIT_OK;
  }
  const json = {
    date,
    effort,
    rounds: args.rounds,
    set: args.set,
    baseline: args.baseline,
    totals: totalsOf(reports),
    runs: reports,
    skipped,
  };
  // 끝의 지표 표(설계 8 — talk-metrics 와 같은 셈, 기준선이 있으면 견줌 · 기회 알림)
  const metrics = metricsModule.metricsFilesOf({
    json,
    baseline: baselineJson,
    meta: {
      source: `${base}.json`,
      date,
      effort,
      rounds: args.rounds,
      baseline: args.baseline,
      chanceAlert: args.chanceAlert,
    },
    kitFor: metricsModule.seedKitFor(io.root),
  });
  io.write(
    `${base}.md`,
    `${reportMarkdown({ date, runs: reports, skipped })}\n${metrics.markdown}`,
  );
  io.write(
    `${base}.json`,
    `${JSON.stringify({ ...json, metrics: metrics.metrics }, null, 2)}\n`,
  );
  io.write(`${base}-metrics.md`, metrics.markdown);
  io.write(`${base}-metrics.json`, metrics.json);
  io.write(`${base}-review.md`, metrics.review);
  io.log(
    `talk-observe: ${base}.md · ${base}.json · 지표 ${base}-metrics.md · 검토 목록 ${base}-review.md`,
  );
  return EXIT_OK;
}

function readJsonFile(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new ScriptInputError(`JSON 을 읽지 못했다: ${path}`);
  }
}

/** 시드 파일 읽기(회화 수업 파일이 없으면 lessonFile null). */
export function readSeedFiles(
  root: string,
  level: number,
  unit: number,
): SeedFiles {
  const at = (...p: string[]) => join(root, SEED_DIR, ...p);
  const lessonPath = at("lessons", "talk", String(level), `${unit}.json`);
  return {
    lessonFile: existsSync(lessonPath) ? readJsonFile(lessonPath) : null,
    levelSpecs: readJsonFile(at("level-specs.json")),
    unitSpecs: readJsonFile(at("unit-specs.json")),
    teachers: readJsonFile(at("teachers.json")),
    vocab: readJsonFile(at("vocab.json")),
    forms: readJsonFile(at("lists", "forms.json")),
    forbidden: readJsonFile(at("lists", "forbidden.json")),
    meta: readJsonFile(at("lists", "meta-sentences.json")),
    talkCueLines: optionalJson(at("lists", "talk-cue-lines.json")),
    talkSituationLines: optionalJson(at("lists", "talk-situation-lines.json")),
    talkAllowedWords: optionalJson(at("lists", "talk-allowed-words.json")),
    talkMadeUpPhrases: optionalJson(at("lists", "talk-made-up-phrases.json")),
    homophones: optionalJson(at("lists", "homophones.json")),
    soundAlikes: optionalJson(at("lists", "sound-alikes.json")),
  };
}

/** 없을 수 있는 시드 파일(없으면 null — 서버 seedListOrEmpty 처럼 빈 목록으로 본다). */
function optionalJson(path: string): unknown {
  return existsSync(path) ? readJsonFile(path) : null;
}

/** 대본 파일 읽기(이름 차례). */
export function readScriptFiles(
  root: string,
): { file: string; raw: unknown }[] {
  const dir = join(root, SCRIPT_DIR);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => ({ file, raw: readJsonFile(join(dir, file)) }));
}

async function main(): Promise<number> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`talk-observe: ${parsed.error}`);
    return EXIT_INPUT;
  }
  const root = process.cwd();
  const { baseline } = parsed.args;
  if (baseline !== null && !existsSync(baseline)) {
    console.error(`talk-observe: 기준선 파일이 없다: ${baseline}`);
    return EXIT_INPUT;
  }
  try {
    return await runTalkObserve(parsed.args, {
      root,
      config: loadScriptConfig({ root }),
      readScripts: () => readScriptFiles(root),
      readSeed: (level, unit) => readSeedFiles(root, level, unit),
      createClient: () => {
        const key = readApiKey();
        if (key === null)
          throw new ScriptInputError(
            "ANTHROPIC_API_KEY 가 없습니다(.env.local)",
          );
        return createScriptClient(key);
      },
      log: (line) => console.log(line),
      write: (path, text) => {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, text);
      },
    });
  } catch (error) {
    if (error instanceof ScriptInputError) {
      console.error(`talk-observe: ${error.message}`);
      return EXIT_INPUT;
    }
    throw error;
  }
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  void main().then((code) => {
    process.exitCode = code;
  });
}
