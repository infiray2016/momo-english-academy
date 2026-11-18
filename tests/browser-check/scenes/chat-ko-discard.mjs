// 수업 안 한국어로 묻기 장면 3(화면 고침 3 '다' — b5-fix3c): 버리는 듣기를 켠 기기(speech.discard_mode all · speech.deaf_detect all — 시험용)에서
// 실제 수업 틀 · 아이 차례를 가짜 음성 · 가짜 서버 응답으로 돌린다. 같은 흐름의 e2e 는 tests/e2e/talk-ko-ask-discard.spec.ts(CI 몫)이고, 이
// 장면은 그 흐름이 실제 브라우저에서 그대로 도는지 미리 보는 로컬 도구다(증명 표에는 올리지 않음 — 컨트롤러 판정).
// (가) 영어 '말하기'가 '준비 중이에요'인 동안과 마이크 다시 켬(회복) 동안 '한국어로 물어보기'가 꺼진다(AC-N28 켠 기기 · 코드 검토 rev-b5a I-5).
// (나) 한국어 듣기의 마이크 안 잡힘 뒤 회복(안내 · 짧은 말 mic · 누름 없이 한국어로 다시 들음)이 끝나 한국어 인식 확인이 뜬다. 그 사이 버림은 speech.lang.
// (다) 한국어 듣기의 service-not-allowed 뒤 단추가 숨고 합친 안내가 다음 누름까지 남으며, 다음 영어 진짜의 다시 연 까닭이 no_lang 이다(AC-25f (나)).
// (라) 한국어 듣기의 마이크 안 잡힘이 talk.ko_ask_fail_hide_after 번 이어지면 회복 짧은 말은 그보다 하나 적게 나오고 단추가 숨으며, 그 뒤 영어
//      마이크 안 잡힘은 넘김 안내가 아니라 회복이다(AC-25f (다)).
import {
  run as advance,
  openChat,
  PORTRAIT,
  phaseOf,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const SPEAK = "[data-speak-stack] [data-speak]";
const KO = "[data-ko-ask]";
const DISCARD_LINE = "[data-child-turn] [data-discard-line]";
const KO_LINE = "[data-child-turn] [data-ko-line]";
const MIC_RECOVER = "잠깐만요, 마이크를 다시 켤게요";
const MIC_STUCK =
  "마이크가 계속 안 잡혀요. '잘 모르겠어요'를 눌러 넘어가 주세요";
/** 쪽 자료 talkShortLines.mic 의 글(entry.tsx viewOf). */
const MIC_SHORT = "One moment.";
const NOTICE = {
  hint: "지금은 한국어로 물어볼 수 없어요. '힌트'를 눌러 봐요",
  talk: "지금은 한국어로 물어볼 수 없어요. 아는 말로 말해 봐요",
};
const QUESTION = "오리 좋아한다는 말은 영어로 뭐라고 해요";
/** talk.ko_ask_fail_hide_after(시드 값 — 장면이 바꾸지 않음). */
const FAIL_HIDE_AFTER = 3;

/** 말을 받는 진짜(audiostart 가 판정 문턱 밖 — 마이크 안 잡힘이 아님). */
const heard = (text) => ({
  events: [
    { at: 50, type: "start" },
    { at: 300, type: "audiostart" },
    { at: 400, type: "soundstart" },
    { at: 450, type: "speechstart" },
    { at: 900, type: "result", results: [{ transcript: text, isFinal: true }] },
    { at: 950, type: "speechend" },
  ],
});
/** 마이크 안 잡힘(audiostart 가 speech.deaf_audiostart_ms 안에 오고 소리 · 결과가 없음 — 앱이 speech.deaf_silence_ms 뒤 끝냄). */
const DEAF = {
  events: [
    { at: 50, type: "start" },
    { at: 80, type: "audiostart" },
  ],
  onStop: [{ at: 10, type: "end" }],
  onAbort: [{ at: 10, type: "end" }],
};
/** 죽은 버림(audiostart 가 speech.discard_live_as_ms 안) — 스스로 끝나지 않고 층이 멈춘다. */
const DISCARD = {
  events: [
    { at: 10, type: "start" },
    { at: 40, type: "audiostart" },
  ],
};
/** 인식 오류로 끝나는 진짜. */
const failing = (error) => ({
  events: [
    { at: 50, type: "start" },
    { at: 100, type: "error", error },
    { at: 110, type: "end" },
  ],
});

const BASE = {
  discard: "all",
  level: 3,
  // 조용함 타이머가 긴 회복 동안 끼어들지 않게 기다림 시간 없이(chat-quiet-discard 와 같은 꼴)
  signal: { hint: true },
  settings: { "speech.deaf_detect": "all", "speech.deaf_retry_max": 0 },
};

async function until(p, test, limit = 15_000, step = 100) {
  for (let t = 0; t < limit; t += step) {
    if (await test()) return true;
    await advance(p, step);
  }
  return test();
}

const textOf = (p, sel) =>
  p.evaluate(
    (s) =>
      [...document.querySelectorAll(s)].map((e) => e.textContent).join(" | "),
    sel,
  );
const disabledOf = (p, sel) =>
  p.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? el.disabled === true : null;
  }, sel);
const countOf = (p, sel) =>
  p.evaluate((s) => document.querySelectorAll(s).length, sel);
const fake = (p) =>
  p.evaluate(() => ({
    spoken: [...(window.__fakeSpeech?.spoken ?? [])],
    langs: [...(window.__fakeSpeech?.langs ?? [])],
    starts: (window.__fakeSpeech?.calls ?? []).filter(
      (c) => c.method === "start",
    ).length,
  }));
const micShorts = async (p) =>
  (await fake(p)).spoken.filter((t) => t === MIC_SHORT).length;
const childTurns = async (p) => (await recordOf(p)).childTurns;

/** 확인 칸이 뜨면 보내고 아이 말 턴 요청이 n 개가 될 때까지. */
async function sendUntil(p, n) {
  const ok = await until(p, async () => {
    if ((await childTurns(p)) >= n) return true;
    const send = p.locator(
      "[data-child-confirm]:not([data-ko-confirm]) button",
      {
        hasText: "보내기",
      },
    );
    if ((await send.count()) > 0) await send.first().click();
    return false;
  });
  return ok;
}

/** (가) 영어 '준비 중이에요' · 회복 동안 한국어 단추가 꺼짐. */
async function englishWaiting(browser, url, check) {
  const p = await openChat(browser, url, {
    viewport: PORTRAIT,
    config: {
      ...BASE,
      readMs: 2500,
      recognitions: [
        heard("I like it"),
        DISCARD,
        DEAF,
        DISCARD,
        heard("I like ducks"),
        DISCARD,
      ],
    },
  });
  const opened = await untilChild(p);
  await p.locator(SPEAK).click();
  const first = await sendUntil(p, 1);
  // 선생님 답을 버림 안에서 읽는 동안 누른다
  const reading = await until(
    p,
    async () =>
      (await countOf(p, "[data-talk-panel][data-talk-reading]")) > 0 &&
      (await countOf(p, SPEAK)) > 0,
  );
  await p.locator(SPEAK).click();
  await advance(p, 100);
  const preparing = await p
    .locator(SPEAK)
    .first()
    .evaluate((el) => el.hasAttribute("data-speak-preparing"));
  const koOffPreparing = await disabledOf(p, KO);
  const recovering = await until(
    p,
    async () => (await textOf(p, DISCARD_LINE)) === MIC_RECOVER,
  );
  const koOffRecovering = await disabledOf(p, KO);
  const shortHeard = await until(p, async () => (await micShorts(p)) === 1);
  const koOffAfterShort = await disabledOf(p, KO);
  const second = await sendUntil(p, 2);
  const errors = (await recordOf(p)).pageErrors;
  check(
    "버리는 듣기 기기: 영어 '준비 중이에요'와 회복('잠깐만요, …') 동안 '한국어로 물어보기'가 꺼짐(AC-N28)",
    opened &&
      first &&
      reading &&
      preparing &&
      koOffPreparing === true &&
      recovering &&
      koOffRecovering === true &&
      shortHeard &&
      koOffAfterShort === true &&
      second &&
      errors.length === 0,
    `열림 ${opened} · 첫 턴 ${first} · 읽는 중 ${reading} · 준비 중 ${preparing} · 그때 한국어 단추 꺼짐 ${koOffPreparing} · 회복 안내 ${recovering} · 그때 꺼짐 ${koOffRecovering} · 짧은 말 ${shortHeard} · 그 뒤 꺼짐 ${koOffAfterShort} · 둘째 턴 ${second} · 쪽 오류 ${errors.join(" | ")}`,
  );
  await p.context().close();
}

/** (나) 한국어 듣기의 마이크 안 잡힘 회복이 끝남. */
async function koRecovery(browser, url, check) {
  const p = await openChat(browser, url, {
    viewport: PORTRAIT,
    config: {
      ...BASE,
      recognitions: [
        DEAF,
        DISCARD,
        heard(QUESTION),
        DISCARD,
        heard("I like ducks"),
        DISCARD,
      ],
    },
  });
  const opened = await untilChild(p);
  await p.locator(KO).click();
  const recovering = await until(
    p,
    async () => (await textOf(p, DISCARD_LINE)) === MIC_RECOVER,
  );
  const koOff = await disabledOf(p, KO);
  const shortHeard = await until(p, async () => (await micShorts(p)) === 1);
  const confirmed = await until(
    p,
    async () => (await countOf(p, "[data-ko-send]")) > 0,
  );
  const confirmText = await textOf(p, "[data-ko-confirm]");
  const lineAfter = await textOf(p, DISCARD_LINE);
  if (confirmed) await p.locator("[data-ko-send]").click();
  const answered = await until(
    p,
    async () => (await countOf(p, "[data-ko-exchange]")) > 0,
  );
  const back = await until(p, async () => (await phaseOf(p)) === "child");
  const koCalls = await p.evaluate(() => window.__chat.koCalls.length);
  // 다음 '말하기'(영어)
  await until(p, async () => (await disabledOf(p, SPEAK)) === false);
  await p.locator(SPEAK).click();
  const sent = await sendUntil(p, 1);
  const { langs } = await fake(p);
  const ko = langs.flatMap((l, i) => (l === "ko-KR" ? [i] : []));
  const afterKo = langs.slice((ko.at(-1) ?? -1) + 1);
  const between = langs.slice((ko[0] ?? 0) + 1, ko.at(-1) ?? 0);
  const errors = (await recordOf(p)).pageErrors;
  check(
    "버리는 듣기 기기: 한국어 듣기의 마이크 안 잡힘 → 회복 안내 · 짧은 말 뒤 누름 없이 한국어로 다시 들어 인식 확인까지(회복이 끝남), 그 사이 · 뒤 버림과 다음 '말하기'는 en-US(AC-25d)",
    opened &&
      recovering &&
      koOff === true &&
      shortHeard &&
      confirmed &&
      confirmText.includes(QUESTION) &&
      lineAfter !== MIC_RECOVER &&
      answered &&
      back &&
      koCalls === 1 &&
      sent &&
      ko.length === 2 &&
      between.length >= 1 &&
      between.every((l) => l === "en-US") &&
      afterKo.length >= 2 &&
      afterKo.every((l) => l === "en-US") &&
      errors.length === 0,
    `열림 ${opened} · 회복 안내 ${recovering} · 단추 꺼짐 ${koOff} · 짧은 말 ${shortHeard} · 확인 ${confirmed}('${confirmText}') · 그때 안내 줄 '${lineAfter}' · 답 ${answered} · 아이 차례 ${back} · 질문 요청 ${koCalls} · 영어 턴 ${sent} · 언어 ${langs.join(",")} · 쪽 오류 ${errors.join(" | ")}`,
  );
  await p.context().close();
}

/** (다) service-not-allowed 뒤 숨김 · 안내 남음 · 다시 연 까닭 no_lang. */
async function koServiceNotAllowed(browser, url, check) {
  const p = await openChat(browser, url, {
    viewport: PORTRAIT,
    config: {
      ...BASE,
      recognitions: [
        failing("service-not-allowed"),
        DISCARD,
        heard("I like ducks"),
        DISCARD,
      ],
    },
  });
  const opened = await untilChild(p);
  await p.locator(KO).click();
  const hidden = await until(p, async () => (await countOf(p, KO)) === 0);
  const hint = await disabledOf(p, "[data-child-turn] [data-hint-button]");
  const expected = hint === false ? NOTICE.hint : NOTICE.talk;
  const line = await textOf(p, KO_LINE);
  await advance(p, 5000);
  const kept = await textOf(p, KO_LINE);
  const blocked = await countOf(p, "[data-blocked]");
  const startsIdle = (await fake(p)).starts;
  await p.locator(SPEAK).click();
  await advance(p, 100);
  const cleared = await countOf(p, KO_LINE);
  const sent = await sendUntil(p, 1);
  const body = (await recordOf(p)).requests.find((b) => b.input !== undefined);
  const dc = body?.clientListen?.listens?.at(-1)?.dc ?? null;
  const errors = (await recordOf(p)).pageErrors;
  check(
    "버리는 듣기 기기: 한국어 듣기 service-not-allowed → 단추 숨김 · 합친 안내가 다음 누름까지 남음 · 막힘 없음 · 다음 영어 진짜의 다시 연 까닭 no_lang(AC-25f (나) · (라))",
    opened &&
      hidden &&
      line === expected &&
      kept === expected &&
      blocked === 0 &&
      startsIdle === 1 &&
      cleared === 0 &&
      sent &&
      dc?.g === "reopen" &&
      dc?.rw === "no_lang" &&
      errors.length === 0,
    `열림 ${opened} · 숨김 ${hidden} · 힌트 꺼짐 ${hint} · 안내 '${line}' · 5초 뒤 '${kept}' · 막힘 ${blocked} · 그동안 start ${startsIdle} · 누른 뒤 안내 ${cleared} · 턴 ${sent} · dc ${JSON.stringify(dc)} · 쪽 오류 ${errors.join(" | ")}`,
  );
  await p.context().close();
}

/** (라) 한국어 마이크 안 잡힘 문턱: 짧은 말은 문턱 − 1 번, 숨김, 영어 셈은 처음부터. */
async function koDeafHide(browser, url, check) {
  const recognitions = [];
  for (let i = 0; i < FAIL_HIDE_AFTER; i++) recognitions.push(DEAF, DISCARD);
  recognitions.push(DEAF, DISCARD, heard("I like ducks"), DISCARD);
  const p = await openChat(browser, url, {
    viewport: PORTRAIT,
    config: { ...BASE, recognitions },
  });
  const opened = await untilChild(p);
  await p.locator(KO).click();
  const hidden = await until(
    p,
    async () => (await countOf(p, KO)) === 0,
    40_000,
  );
  await advance(p, 5000);
  const shorts = await micShorts(p);
  const line = await textOf(p, KO_LINE);
  const hint = await disabledOf(p, "[data-child-turn] [data-hint-button]");
  const expected = hint === false ? NOTICE.hint : NOTICE.talk;
  const stuckText = (await textOf(p, "[data-child-turn]")).includes(MIC_STUCK);
  const blocked = await countOf(p, "[data-blocked]");
  const turnsBefore = await childTurns(p);
  const { langs } = await fake(p);
  const parity = langs.every((l, i) => l === (i % 2 === 0 ? "ko-KR" : "en-US"));
  await p.locator(SPEAK).click();
  const enRecover = await until(
    p,
    async () => (await textOf(p, DISCARD_LINE)) === MIC_RECOVER,
  );
  const enStuck = (await textOf(p, "[data-child-turn]")).includes(MIC_STUCK);
  const sent = await sendUntil(p, 1);
  const errors = (await recordOf(p)).pageErrors;
  check(
    "버리는 듣기 기기: 한국어 마이크 안 잡힘이 문턱만큼 이어지면 짧은 말 문턱 − 1 번 · 단추 숨김 · 합친 안내 · 넘김 안내 · 막힘 · 턴 없음, 그 뒤 영어 마이크 안 잡힘은 회복(AC-25f (다))",
    opened &&
      hidden &&
      shorts === FAIL_HIDE_AFTER - 1 &&
      line === expected &&
      !stuckText &&
      blocked === 0 &&
      turnsBefore === 0 &&
      langs.length === FAIL_HIDE_AFTER * 2 &&
      parity &&
      enRecover &&
      !enStuck &&
      sent &&
      errors.length === 0,
    `열림 ${opened} · 숨김 ${hidden} · 짧은 말 ${shorts} · 안내 '${line}'(기대 '${expected}') · 넘김 안내 ${stuckText} · 막힘 ${blocked} · 그동안 턴 ${turnsBefore} · 언어 ${langs.join(",")} · 영어 회복 ${enRecover} · 영어 넘김 안내 ${enStuck} · 턴 ${sent} · 쪽 오류 ${errors.join(" | ")}`,
  );
  await p.context().close();
}

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  try {
    await englishWaiting(browser, url, check);
    await koRecovery(browser, url, check);
    await koServiceNotAllowed(browser, url, check);
    await koDeafHide(browser, url, check);
  } finally {
    await browser.close();
  }
}
