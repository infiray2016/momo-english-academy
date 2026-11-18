// 수업 안 한국어로 묻기 장면(묶음 5-다, 13절 C226 (1) · (4)): 실제 수업 틀 · 아이 차례(child-turn) · 곁 말풍선(ko-help-bubble)을 가짜 음성 · 가짜
// 서버 응답으로 돌린다. (가) 3단계: '한국어로 물어보기'가 '말하기' 아래 같은 너비에 점선 테 · '가' 표지로 갈리고, 누르면 '한국어로 물어보세요' 줄과
// 함께 다른 단추가 꺼지며(큰 단추는 그 듣기를 끝내는 단추로 남음), 인식 확인 뒤 '한국어 도움' 딱지의 말풍선이 영어 글 없이 '알려 준 말 듣기'와
// 뜬다. (나) 뜻 답에는 '알려 준 말 듣기'가 없다. (다) 응답이 꺼짐이면 단추가 사라지고 합친 안내가 보인다. (라) 4단계는 가르친 표현이 글로 보인다.
// (마) 세로 820×1180 · 가로 1180×820, 기록 칸 줄이 적을 때 · 많을 때 네 단추와 한국어 안내 줄이 화면 안에 있다. 사진은 KO_ASK_SHOTS 폴더(없으면
// 임시 폴더)에 남긴다.
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  run as advance,
  LANDSCAPE,
  openChat,
  PORTRAIT,
  phaseOf,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const SHOTS =
  process.env.KO_ASK_SHOTS || join(tmpdir(), "browser-check-ko-ask");
const QUESTION = "오리 좋아한다는 말은 영어로 뭐라고 해요";
const TAUGHT = "I like ducks.";
const KO_LISTENING = "한국어로 물어보세요";
const NOTICE_TALK = "지금은 한국어로 물어볼 수 없어요. 아는 말로 말해 봐요";

/** 한국어 듣기 한 번(가짜 인식): 말한 뒤 끝 조용함(speech.end_silence_seconds.ko_ask)이 지나면 화면이 멈춘다. */
const KO_RECOGNITION = {
  events: [
    { at: 50, type: "start" },
    { at: 80, type: "audiostart" },
    { at: 300, type: "soundstart" },
    { at: 400, type: "speechstart" },
    {
      at: 1200,
      type: "result",
      results: [{ transcript: QUESTION, isFinal: true }],
    },
    { at: 1300, type: "speechend" },
  ],
};
const EN_RECOGNITION = {
  events: [
    { at: 50, type: "start" },
    { at: 80, type: "audiostart" },
    { at: 300, type: "soundstart" },
    { at: 400, type: "speechstart" },
    {
      at: 900,
      type: "result",
      results: [{ transcript: "I like ducks", isFinal: true }],
    },
    { at: 950, type: "speechend" },
  ],
};
const MEANING = {
  reply: {
    t: "ok",
    help: {
      kind: "meaning",
      teachEn: undefined,
      replay: "teacher_line",
      textShown: false,
      sayKo: "선생님은 호수에 가 봤다고 말했어요.",
    },
  },
};
const OFF = { reply: { t: "off" } };

const SEL = {
  speak: "[data-speak-stack] [data-speak]",
  ko: "[data-ko-ask]",
  hint: "[data-hint-button]",
  dontKnow: "[data-dont-know]",
  line: "[data-ko-line]",
};

async function boxOf(p, selector) {
  const l = p.locator(selector).first();
  if ((await l.count()) === 0) return null;
  return l.boundingBox();
}

/** 상자가 보는 창 안에 다 드는가(1px 여유). */
function inside(box, view) {
  return (
    box !== null &&
    box.y >= -1 &&
    box.x >= -1 &&
    box.y + box.height <= view.height + 1 &&
    box.x + box.width <= view.width + 1
  );
}

function fmt(box) {
  return box
    ? `${Math.round(box.y)}~${Math.round(box.y + box.height)}(x ${Math.round(box.x)}~${Math.round(box.x + box.width)})`
    : "없음";
}

/** 네 단추(있는 것만 — 꺼짐 뒤엔 한국어 단추가 없음)와 한국어 안내 줄이 화면 안인가. */
async function fitOf(p, view, { needKo = true, needLine = false } = {}) {
  const boxes = {};
  for (const [k, s] of Object.entries(SEL)) boxes[k] = await boxOf(p, s);
  const need = ["speak", "hint", "dontKnow"];
  if (needKo) need.push("ko");
  if (needLine) need.push("line");
  const out = need.filter((k) => !inside(boxes[k], view));
  const scrollY = await p.evaluate(() => window.scrollY);
  return {
    ok: out.length === 0,
    detail: `${Object.entries(boxes)
      .map(([k, b]) => `${k} ${fmt(b)}`)
      .join(
        " · ",
      )} · 쪽 넘김 ${Math.round(scrollY)}${out.length ? ` · 밖: ${out.join(", ")}` : ""}`,
  };
}

/**
 * 쪽 넘침 · 위 띠(b5-fix1, 13절 C226 (4)): 쪽 높이가 보는 창을 넘는 몫(1px 여유)과 쪽 넘김, 위 띠('그만하기' · '홈'이 있는 수업 제목 띠)가 보는 창
 * 안인가. 가로로 연 수업의 쪽 넘김 0 · 위 띠 보임(talk-lesson-land)과 같은 잣대다.
 */
async function pageOf(p, view) {
  const m = await p.evaluate(() => {
    const band = document.querySelector("[data-paper-band]");
    const r = band?.getBoundingClientRect();
    return {
      over: document.scrollingElement.scrollHeight - window.innerHeight,
      scrollY: window.scrollY,
      band: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
    };
  });
  const bandIn = inside(m.band, view);
  return {
    // 쪽 넘침 = 쪽이 넘겨져 있음(쪽 넘김, talk-lesson-land 와 같은 잣대). 쪽 높이가 보는 창보다 큰 몫(빈 알림 줄 자리 · 아래 여백)은 참고로만 적는다 —
    // 한국어 단추를 끈 수업도 세로에서 그 몫이 있다
    ok: m.scrollY <= 1 && bandIn,
    detail: `쪽 넘김 ${Math.round(m.scrollY)} · 위 띠 ${fmt(m.band)}${bandIn ? "" : "(밖)"} · (참고) 쪽 높이 − 보는 창 ${Math.round(m.over)}`,
  };
}

async function shot(p, browserName, name) {
  const path = join(SHOTS, `${browserName}-${name}.png`);
  await p.screenshot({ path });
  return path;
}

async function until(p, test, limit = 8000, step = 100) {
  for (let t = 0; t < limit; t += step) {
    if (await test()) return true;
    await advance(p, step);
  }
  return test();
}

const disabledOf = (p, s) =>
  p
    .locator(s)
    .first()
    .evaluate((el) => el.disabled === true)
    .catch(() => null);

/** 한국어 단추를 누르고 듣는 중 · 인식 확인까지 간다. 사진 이름 머리를 주면 둘을 찍는다. */
async function askKo(p, browserName, tag, view) {
  await p.locator(SEL.ko).click();
  await advance(p, 700);
  const listening = {
    line: await p
      .locator(SEL.line)
      .first()
      .innerText()
      .catch(() => null),
    speakOff: await disabledOf(p, SEL.speak),
    hintOff: await disabledOf(p, SEL.hint),
    dontKnowOff: await disabledOf(p, SEL.dontKnow),
    koOff: await disabledOf(p, SEL.ko),
    lang: await p.evaluate(() => window.__fakeSpeech?.langs.at(-1) ?? null),
  };
  listening.fit = view ? await fitOf(p, view, { needLine: true }) : null;
  listening.page = view ? await pageOf(p, view) : null;
  if (tag) listening.shot = await shot(p, browserName, `${tag}-2-ko-listening`);
  const confirmed = await until(
    p,
    async () => (await p.locator("[data-ko-confirm]").count()) > 0,
  );
  const confirm = {
    shown: confirmed,
    text: confirmed
      ? await p.locator("[data-ko-confirm] [data-child-bubble]").innerText()
      : null,
    again: await p.locator("[data-ko-again]").count(),
    send: await p.locator("[data-ko-send]").count(),
  };
  confirm.page = view ? await pageOf(p, view) : null;
  if (tag) confirm.shot = await shot(p, browserName, `${tag}-3-ko-confirm`);
  return { listening, confirm };
}

/** '보내기'를 누르고 답이 그려져 아이 차례가 다시 열릴 때까지(1~3단계 표현은 쉼 뒤 소리 시작까지). */
async function sendKo(p) {
  await p.locator("[data-ko-send]").click();
  await advance(p, 300);
  const pending = await p.locator("[data-ko-pending]").count();
  const phaseWait = await phaseOf(p);
  const opened = await until(p, async () => (await phaseOf(p)) === "child");
  await advance(p, 300);
  return { pending, phaseWait, opened };
}

async function helpOf(p) {
  const help = p.locator("[data-ko-help]").last();
  const has = (await help.count()) > 0;
  const exchange = p.locator("[data-ko-exchange]").last();
  return {
    has,
    badge: has
      ? await p
          .locator("[data-ko-badge]")
          .last()
          .innerText()
          .catch(() => null)
      : null,
    say: has
      ? await p
          .locator("[data-ko-say]")
          .last()
          .innerText()
          .catch(() => null)
      : null,
    exchangeText: has ? await exchange.innerText() : "",
    taught: await p.locator("[data-ko-taught]").count(),
    taughtText: await p
      .locator("[data-ko-taught]")
      .first()
      .innerText()
      .catch(() => null),
    replay: await p.locator("[data-ko-replay]").count(),
    replayText: await p
      .locator("[data-ko-replay]")
      .first()
      .innerText()
      .catch(() => null),
    bodyHasTaught: (await p.evaluate(() => document.body.innerText)).includes(
      "I like ducks",
    ),
    spoken: await p.evaluate(() => [...(window.__fakeSpeech?.spoken ?? [])]),
  };
}

/** (가) · (마): 3단계 꼴 한 바퀴(처음 → 듣는 중 → 확인 → 도움 → 꺼짐 안내) — 판정과 화면 안 측정. */
async function lowFlow(browser, url, browserName, check, { view, pairs, tag }) {
  const p = await openChat(browser, url, {
    viewport: view,
    config: {
      pairs,
      recognitions: [KO_RECOGNITION, KO_RECOGNITION],
      koHelps: [{}, OFF],
    },
  });
  const opened = await untilChild(p);
  const where = `${tag} · ${view.width}×${view.height} · 기록 칸 쌍 ${pairs}`;
  const startFit = await fitOf(p, view);
  check(
    `${where} · 처음: 네 단추가 화면 안`,
    opened && startFit.ok,
    startFit.detail,
  );
  // C226 (1): '말하기' 아래 · 같은 너비 · 점선 테와 '가' 표지로 가름
  const speak = await boxOf(p, SEL.speak);
  const ko = await boxOf(p, SEL.ko);
  const stack = await boxOf(p, "[data-speak-stack]");
  const look = await p.evaluate(
    ({ s, k }) => {
      const a = document.querySelector(s);
      const b = document.querySelector(k);
      if (!a || !b) return null;
      const sa = getComputedStyle(a);
      const sb = getComputedStyle(b);
      return {
        speakBorder: sa.borderTopStyle,
        koBorder: sb.borderTopStyle,
        speakBg: sa.backgroundColor,
        koBg: sb.backgroundColor,
        koText: b.innerText.replace(/\s+/g, " ").trim(),
        mark: b.querySelector("[aria-hidden]")?.textContent ?? null,
      };
    },
    { s: SEL.speak, k: SEL.ko },
  );
  const gap = speak && ko ? ko.y - (speak.y + speak.height) : null;
  check(
    `${where} · '한국어로 물어보기'가 '말하기' 아래에 있고 꼴로 갈림`,
    speak !== null &&
      ko !== null &&
      stack !== null &&
      gap !== null &&
      gap >= 16 &&
      Math.abs(ko.width - stack.width) <= 2 &&
      look?.koBorder === "dashed" &&
      look?.speakBorder !== "dashed" &&
      look?.mark === "가" &&
      look?.koText.includes("한국어로 물어보기"),
    `말하기 ${fmt(speak)} · 한국어 ${fmt(ko)} · 묶음 너비 ${Math.round(stack?.width ?? 0)} · 사이 ${gap === null ? "-" : Math.round(gap)} · 테 ${look?.speakBorder}/${look?.koBorder} · 바탕 ${look?.speakBg}/${look?.koBg} · 표지 ${look?.mark} · 글 '${look?.koText}'`,
  );
  const startPage = await pageOf(p, view);
  check(
    `${where} · 처음: 쪽 넘침 0 · 위 띠가 화면 안`,
    startPage.ok,
    startPage.detail,
  );
  const startShot = await shot(p, browserName, `${tag}-1-start`);

  const { listening, confirm } = await askKo(p, browserName, tag, view);
  const listenFit = listening.fit;
  check(
    `${where} · 누르면 '${KO_LISTENING}' 줄이 뜨고 힌트 · 잘 모르겠어요 · 한국어 단추가 꺼짐`,
    listening.line === KO_LISTENING &&
      listening.hintOff === true &&
      listening.dontKnowOff === true &&
      listening.koOff === true &&
      listening.lang === "ko-KR",
    `줄 '${listening.line}' · 말하기 꺼짐 ${listening.speakOff}(듣기를 끝내는 단추) · 힌트 꺼짐 ${listening.hintOff} · 잘 모르겠어요 꺼짐 ${listening.dontKnowOff} · 한국어 꺼짐 ${listening.koOff} · 인식 언어 ${listening.lang}`,
  );
  check(
    `${where} · 한국어 듣는 중: 네 단추와 안내 줄이 화면 안`,
    listenFit.ok,
    listenFit.detail,
  );
  check(
    `${where} · 한국어 듣는 중: 쪽 넘침 0 · 위 띠가 화면 안`,
    listening.page.ok,
    listening.page.detail,
  );
  check(
    `${where} · 인식 확인: 쪽 넘침 0 · 위 띠가 화면 안`,
    confirm.page.ok,
    confirm.page.detail,
  );
  check(
    `${where} · 인식 확인: 한국어 글 · '다시 말하기' · '보내기'`,
    confirm.shown &&
      confirm.text === QUESTION &&
      confirm.again === 1 &&
      confirm.send === 1,
    `보임 ${confirm.shown} · 글 '${confirm.text}' · 다시 ${confirm.again} · 보내기 ${confirm.send}`,
  );

  const sent = await sendKo(p);
  const help = await helpOf(p);
  const helpShot = await shot(p, browserName, `${tag}-4-ko-help`);
  const record = await recordOf(p);
  const koCalls = await p.evaluate(() =>
    window.__chat.koCalls.map((c) => c.body),
  );
  check(
    `${where} · 답: '한국어 도움' 딱지 말풍선 · 영어 글 없음 · '알려 준 말 듣기' 있음`,
    sent.opened &&
      koCalls.length === 1 &&
      koCalls[0].question === QUESTION &&
      help.has &&
      help.badge === "한국어 도움" &&
      help.taught === 0 &&
      !help.bodyHasTaught &&
      !/[A-Za-z]/.test(help.exchangeText) &&
      help.replay >= 1 &&
      help.replayText?.includes("알려 준 말 듣기") &&
      help.spoken.includes(TAUGHT),
    `기다림 점 셋 ${sent.pending} · 차례 ${sent.phaseWait} → 열림 ${sent.opened} · 질문 요청 ${koCalls.length}('${koCalls[0]?.question}') · 딱지 '${help.badge}' · 답 '${help.say}' · 표현 글 ${help.taught} · 화면에 영어 표현 ${help.bodyHasTaught} · 곁 말풍선 글 '${help.exchangeText.replace(/\s+/g, " ")}' · 듣기 단추 ${help.replay}('${help.replayText}') · 읽은 것에 표현 ${help.spoken.includes(TAUGHT)} · 쪽 오류 ${record.pageErrors.length}`,
  );
  const helpFit = await fitOf(p, view);
  check(`${where} · 답 뒤: 네 단추가 화면 안`, helpFit.ok, helpFit.detail);
  const helpPage = await pageOf(p, view);
  check(
    `${where} · 도움 말풍선: 쪽 넘침 0 · 위 띠가 화면 안`,
    helpPage.ok,
    helpPage.detail,
  );

  // (다) 둘째 질문은 꺼짐 — 단추가 사라지고 합친 안내
  const second = await askKo(p, browserName, null);
  let offOk = false;
  let offDetail = `둘째 확인 ${second.confirm.shown}`;
  let offShot = null;
  if (second.confirm.shown) {
    await sendKo(p);
    const koLeft = await p.locator(SEL.ko).count();
    const line = await p
      .locator(SEL.line)
      .first()
      .innerText()
      .catch(() => null);
    const fit = await fitOf(p, view, { needKo: false, needLine: true });
    offShot = await shot(p, browserName, `${tag}-5-off-notice`);
    offOk = koLeft === 0 && line === NOTICE_TALK && fit.ok;
    offDetail = `한국어 단추 ${koLeft} · 줄 '${line}' · ${fit.detail}`;
  }
  check(
    `${where} · 꺼짐: 단추가 사라지고 합친 안내가 화면 안`,
    offOk,
    offDetail,
  );
  const errors = (await recordOf(p)).pageErrors;
  check(`${where} · 쪽 오류 없음`, errors.length === 0, errors.join(" | "));
  await p.context().close();
  return [startShot, listening.shot, confirm.shot, helpShot, offShot].filter(
    Boolean,
  );
}

/** (나) 뜻 답 · (라) 4단계: 한 번 묻고 답을 본다. */
async function oneAsk(
  browser,
  url,
  browserName,
  { level, koHelps, tag, view },
) {
  const p = await openChat(browser, url, {
    viewport: view,
    config: { level, recognitions: [KO_RECOGNITION, EN_RECOGNITION], koHelps },
  });
  const opened = await untilChild(p);
  const { confirm } = await askKo(p, browserName, null);
  const sent = confirm.shown ? await sendKo(p) : { opened: false };
  const help = await helpOf(p);
  const fit = await fitOf(p, view);
  const path = await shot(p, browserName, `${tag}-ko-help`);
  // 다음 영어 턴 요청에 도움 칸이 실리는지(참고 — 서버 묶음 4-다가 받음)
  let koHelpPart = null;
  if (sent.opened) {
    await p.locator(SEL.speak).click();
    await until(
      p,
      async () =>
        (await recordOf(p)).requests.some((b) => b.input !== undefined),
      6000,
    );
    const req = (await recordOf(p)).requests.find((b) => b.input !== undefined);
    koHelpPart = req ? JSON.stringify(req.koHelp ?? null) : "요청 없음";
  }
  const errors = (await recordOf(p)).pageErrors;
  await p.context().close();
  return { opened, confirm, sent, help, fit, path, koHelpPart, errors };
}

/** 한국어 질문을 보내고(기다림에 들어간 뒤) 돌아온다 — 기다리는 동안의 누름을 보는 장면들이 쓴다. */
async function askAndSend(p) {
  const { confirm } = await askKo(p, null, null);
  if (!confirm.shown) return false;
  await p.locator("[data-ko-send]").click();
  await advance(p, 300);
  return true;
}

const enabledOf = async (p, s) => (await disabledOf(p, s)) === false;

/** I-4: 답을 기다리는 동안 '그만하기'를 누르면 정리로 가고, 늦게 온 답은 그리지도 읽지도 않는다. */
async function stopWhileWaiting(browser, url, check) {
  const p = await openChat(browser, url, {
    viewport: PORTRAIT,
    config: {
      wrap: { words: [] },
      recognitions: [KO_RECOGNITION],
      koHelps: [{ delayMs: 4000 }],
    },
  });
  await untilChild(p);
  const sent = await askAndSend(p);
  const waiting = await phaseOf(p);
  await p.locator("[data-paper-band] [data-talk-stop]").click();
  await advance(p, 6000);
  const help = await helpOf(p);
  const errors = (await recordOf(p)).pageErrors;
  const koCalls = await p.evaluate(() => window.__chat.koCalls.length);
  const wrapped = await p.evaluate(
    () =>
      document.querySelector("[data-talk-panel]") === null ||
      document.querySelector("[data-wrap-log], [data-talk-wrap]") !== null,
  );
  check(
    "기다리는 동안 '그만하기' → 늦게 온 답이 그려지지도 읽히지도 않음(I-4)",
    sent &&
      waiting === "ko_help" &&
      koCalls === 1 &&
      !help.has &&
      !help.spoken.includes(TAUGHT) &&
      errors.length === 0,
    `보냄 ${sent} · 기다림 차례 ${waiting} · 질문 요청 ${koCalls} · 정리로 감 ${wrapped} · 곁 말풍선 ${help.has} · 읽은 것에 표현 ${help.spoken.includes(TAUGHT)} · 쪽 오류 ${errors.join(" | ")}`,
  );
  await p.context().close();
}

/** I-3: 응답이 stale 이면 아이 차례로 돌아오고(단추가 꺼진 채 남지 않음) 화면 자료를 새로 읽는다. */
async function staleReply(browser, url, check) {
  const p = await openChat(browser, url, {
    viewport: PORTRAIT,
    config: {
      recognitions: [KO_RECOGNITION],
      koHelps: [{ reply: { t: "stale" } }],
    },
  });
  await untilChild(p);
  const sent = await askAndSend(p);
  const back = await until(p, async () => (await phaseOf(p)) === "child");
  await advance(p, 300);
  const speakOn = await enabledOf(p, SEL.speak);
  const koOn = await enabledOf(p, SEL.ko);
  const dontKnowOn = await enabledOf(p, SEL.dontKnow);
  const refresh = await p.evaluate(() => window.__chat.router.refresh);
  check(
    "응답 stale → 아이 차례로 돌아오고 '말하기' · '한국어로 물어보기' · '잘 모르겠어요'가 켜짐 · 새로 읽음(I-3)",
    sent && back && speakOn && koOn && dontKnowOn && refresh >= 1,
    `보냄 ${sent} · 돌아옴 ${back} · 말하기 ${speakOn} · 한국어 ${koOn} · 잘 모르겠어요 ${dontKnowOn} · 새로 읽음 ${refresh}`,
  );
  await p.context().close();
}

/** I-6: 한 차례에 두 번 물으면 두 곁 말풍선의 '알려 준 말 듣기'가 저마다 제 표현을 읽고, 다음 턴 본문에 두 도움의 다시 들은 수가 실린다. */
async function twoAsks(browser, url, check) {
  const FISH = "I like fish.";
  const p = await openChat(browser, url, {
    viewport: PORTRAIT,
    config: {
      recognitions: [KO_RECOGNITION, KO_RECOGNITION, EN_RECOGNITION],
      koHelps: [{}, { reply: { t: "ok", help: { teachEn: FISH } } }],
    },
  });
  await untilChild(p);
  for (let i = 0; i < 2; i++) {
    await askAndSend(p);
    await until(p, async () => (await phaseOf(p)) === "child");
    await advance(p, 1500);
  }
  const spokenAt = async () =>
    p.evaluate(() => [...(window.__fakeSpeech?.spoken ?? [])]);
  const replays = p.locator("[data-ko-replay]");
  const count = await replays.count();
  const heard = [];
  for (let i = 0; i < Math.min(count, 2); i++) {
    const before = (await spokenAt()).length;
    await replays.nth(i).click();
    await advance(p, 1500);
    heard.push((await spokenAt()).slice(before).join(" / "));
  }
  await p.locator(SEL.speak).click();
  await until(
    p,
    async () => (await recordOf(p)).requests.some((b) => b.input !== undefined),
    6000,
  );
  const req = (await recordOf(p)).requests.find((b) => b.input !== undefined);
  const koHelp = req?.koHelp ?? [];
  check(
    "한 차례에 두 번 물음 → 두 '알려 준 말 듣기'가 저마다 제 표현을 읽고 다음 턴에 두 도움의 다시 들은 수(I-6)",
    count === 2 &&
      heard[0]?.includes(TAUGHT) &&
      !heard[0]?.includes(FISH) &&
      heard[1]?.includes(FISH) &&
      koHelp.length === 2 &&
      koHelp.every((h) => h.replays === 1),
    `듣기 단추 ${count} · 첫째 누름에 읽음 '${heard[0]}' · 둘째 '${heard[1]}' · 다음 턴 koHelp ${JSON.stringify(koHelp)}`,
  );
  await p.context().close();
}

export async function run({ browserType, browserName, url, check, log }) {
  mkdirSync(SHOTS, { recursive: true });
  const browser = await browserType.launch();
  const shots = [];
  try {
    // (가) · (다) · (마): 세로 · 가로 × 기록 칸 줄 적음 · 많음
    for (const [view, name] of [
      [PORTRAIT, "portrait"],
      [LANDSCAPE, "landscape"],
    ]) {
      for (const pairs of [3, 12]) {
        shots.push(
          ...(await lowFlow(browser, url, browserName, check, {
            view,
            pairs,
            tag: `l3-${name}-log${pairs}`,
          })),
        );
      }
    }
    // (나) 뜻 답: '알려 준 말 듣기' 없음
    {
      const r = await oneAsk(browser, url, browserName, {
        level: 3,
        koHelps: [MEANING],
        tag: "l3-portrait-meaning",
        view: PORTRAIT,
      });
      shots.push(r.path);
      check(
        "3단계 뜻 답 · 딱지 말풍선은 있고 '알려 준 말 듣기'는 없음",
        r.opened &&
          r.sent.opened &&
          r.help.has &&
          r.help.badge === "한국어 도움" &&
          r.help.replay === 0 &&
          r.help.taught === 0 &&
          r.errors.length === 0,
        `열림 ${r.opened} · 답 뒤 열림 ${r.sent.opened} · 딱지 '${r.help.badge}' · 답 '${r.help.say}' · 듣기 단추 ${r.help.replay} · 표현 글 ${r.help.taught} · 쪽 오류 ${r.errors.length}`,
      );
      log(`뜻 답 뒤 영어 턴 요청의 koHelp: ${r.koHelpPart}`);
    }
    // (라) 4단계: 가르친 표현이 글로 보임(세로 · 가로)
    for (const [view, name] of [
      [PORTRAIT, "portrait"],
      [LANDSCAPE, "landscape"],
    ]) {
      const r = await oneAsk(browser, url, browserName, {
        level: 4,
        koHelps: [{}],
        tag: `l4-${name}`,
        view,
      });
      shots.push(r.path);
      check(
        `4단계 ${view.width}×${view.height} · 가르친 표현이 글로 보이고 네 단추가 화면 안`,
        r.opened &&
          r.sent.opened &&
          r.help.has &&
          r.help.badge === "한국어 도움" &&
          r.help.taught === 1 &&
          r.help.taughtText?.trim() === TAUGHT &&
          r.help.replay === 0 &&
          r.help.spoken.includes(TAUGHT) &&
          r.fit.ok &&
          r.errors.length === 0,
        `답 뒤 열림 ${r.sent.opened} · 딱지 '${r.help.badge}' · 표현 글 ${r.help.taught}('${r.help.taughtText}') · 듣기 알약 ${r.help.replay} · 읽은 것에 표현 ${r.help.spoken.includes(TAUGHT)} · ${r.fit.detail} · 쪽 오류 ${r.errors.length}`,
      );
      log(`4단계 ${name} 답 뒤 영어 턴 요청의 koHelp: ${r.koHelpPart}`);
    }
    // 기다리는 동안 · 응답 갈래 · 두 번 물음(b5-fix1 — 코드 검토 rev-b5a I-3 · I-4 · I-6)
    await stopWhileWaiting(browser, url, check);
    await staleReply(browser, url, check);
    await twoAsks(browser, url, check);
    // (참고) 한국어 단추가 있는 수업과 끈 수업(talk.ko_ask_mode off)의 처음 쪽 넘김 · 위 띠('그만하기') 자리 — 판정 아님, 화면 검토 자료
    for (const [view, name] of [
      [PORTRAIT, "portrait"],
      [LANDSCAPE, "landscape"],
    ]) {
      const seen = [];
      for (const mode of ["on", "off"]) {
        const p = await openChat(browser, url, {
          viewport: view,
          config: { settings: { "talk.ko_ask_mode": mode } },
        });
        await untilChild(p);
        const scrollY = await p.evaluate(() => Math.round(window.scrollY));
        const over = await p.evaluate(() =>
          Math.round(
            document.scrollingElement.scrollHeight - window.innerHeight,
          ),
        );
        const stop = await p
          .getByRole("button", { name: "그만하기" })
          .boundingBox()
          .catch(() => null);
        const ko = await p.locator(SEL.ko).count();
        if (mode === "off")
          shots.push(await shot(p, browserName, `ko-off-${name}-start`));
        seen.push(
          `${mode}: 한국어 단추 ${ko} · 쪽 넘김 ${scrollY} · 쪽 높이 − 보는 창 ${over} · 그만하기 ${fmt(stop)}`,
        );
        await p.context().close();
      }
      log(`처음 쪽 넘김 견줌 ${name}: ${seen.join(" / ")}`);
    }
  } finally {
    await browser.close();
  }
  for (const s of shots) log(`사진: ${s}`);
}
