// 회화 이야기 방식(talk.lead_mode 'chat', spec '회화 대화 구조 R' 설계 2 '흘려 받기' · 설계 4 · 데이터 절, plan 묶음 S0)의 흘려 받기 배선 가운데 DB ·
// SDK 없는 순수 함수. 서버 talk.ts 에 있던 것을 그대로 옮겼다(13절 C243 보완 10 (1) — 서버 흘려 받기와 대본 도구 talk-observe 가 같은 함수를
// 부른다, 옮기기 전 판으로 만든 기준 파일 tests/fixtures/chat-core-move-baseline 과 글자까지 같음). 서버 talk.ts 는 같은 이름으로 다시 내보낸다.

import {
  type ChatSayChange,
  TALK_CHAT_OUTPUT_FIELDS,
  type TalkChatInput,
  talkChatCheckFields,
  talkChatMessages,
  talkChatTurnSpec,
} from "@/core/ai/calls/talk-chat";
import type { Masker } from "@/core/ai/mask";
import { checkOutputFields } from "@/core/ai/output-check";
import {
  createToriSentenceGate,
  type ToriEnReaderKeys,
} from "@/core/conversation/stream";
import { type ForbiddenList, splitSentences } from "@/core/seed/text";

/**
 * 이야기 방식의 흘려 받는 칸 이름: 말 칸 say 와 그 앞의 글 칸 listen_sentence(응답 규격의 칸 차례 — 앞 칸은 글이라 이스케이프를 풀어 끝까지 받는다).
 * 앞 칸을 끝까지 읽은 뒤에만 흘린다: 따라 할 문장을 알아야 부르는 쪽이 say 의 그 문장을 소리 줄로 뺄지 정할 수 있다(설계 4). 차례를 어긴 응답은
 * 흘리지 않고 끝에서 한 번에 낸다(지금 길의 위험 3 과 같음).
 */
export const TALK_CHAT_READER_KEYS: ToriEnReaderKeys = {
  sayKey: "say",
  heads: TALK_CHAT_OUTPUT_FIELDS.slice(
    0,
    TALK_CHAT_OUTPUT_FIELDS.indexOf("say"),
  ).map((key) => ({ key, kind: "string" as const })),
  requireHeads: true,
};

/**
 * 따라 할 문장의 6.4 출력 검사(응답 끝의 출력 검사와 같은 칸 · 같은 함수 — talkChatCheckFields 의 listen_sentence, 길이는 보지 않음). 걸리면 빈 글이다.
 * 흘려 받는 동안 say 의 첫 문장보다 먼저 부른다(검토 rev-chat-p1 H2: 6.4 가 비운 문장은 소리 줄로 빼지 않는다).
 */
export function chatListenCheckedOf(
  listen: string,
  forbidden: ForbiddenList,
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

/** 문장 문(createToriSentenceGate)의 재료. */
export type ChatGateOptions = {
  forbidden: ForbiddenList;
  metaPhrases: readonly string[];
  safeLine: string;
  sentenceMaxWords: number;
};

/**
 * 문장 문이 바꾸거나 지운 문장의 짝(검토 rev-chat-p1 H3): 응답의 say 를 같은 문장 나누기(splitSentences — 흘려 읽기와 같은 경계)로 나눠 같은 문장 문에
 * 차례대로 넣고, 나간 글이 원래 문장과 다른 것만 { 원래 문장 → 나간 글(지우면 '') } 으로 남긴다. sent 는 문장 문을 지나 나간 문장(흘린 문장과 같아야 한다).
 * 문장 문을 다시 쓰지 않고 그 함수를 그대로 돌린다.
 */
export function chatSayChangesOf(
  say: string,
  options: ChatGateOptions,
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
 * 저장할 sent_user_message(검토 rev-chat-p1 H3): 요청 본문의 마지막 사용자 메시지 글과 같은 글 — 규격의 가림을 지난 입력으로 메시지를 만든 끝 칸이다
 * (buildAiRequest 가 만드는 글과 같다). chatUserMessageOf 를 가리지 않은 입력으로 다시 부르지 않는다. 다음 차례는 이 글을 대화 기록의 user 칸에 그대로
 * 넘긴다(캐시 앞머리).
 */
export function talkChatSentUserMessageOf(
  input: TalkChatInput,
  masker: Masker,
): string {
  return (
    talkChatMessages(talkChatTurnSpec.mask(input, masker)).at(-1)?.content ?? ""
  );
}
