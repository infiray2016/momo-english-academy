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
// 합친 안내(ko-ask.ts KO_ASK_NOTICE · KO_ASK_RETRY 글자 그대로 — b5-fix5, 13절 C226 보완 2 (5)): 그 턴에 '힌트'가 있고 열 단이 남았으면 hint 꼴
const NOTICE_HINT = "지금은 한국어로 물어볼 수 없어요. '힌트'를 눌러 봐요";
const NOTICE_RETRY = "지금은 대답을 못 했어요. 한 번 더 물어봐요";

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
const ERROR = { reply: { t: "error" } };

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

/**
 * 안내 줄의 문장 줄(M-4): 문장 조각([data-ko-sentence])마다 글이 차지한 줄 수. 한 문장이 두 줄로 갈리면 split 거짓. 조각이 없으면(한 문장 안내) 참.
 * 조각은 inline-block 이라 getClientRects 는 안에서 글이 접혀도 상자 하나만 돌려준다(늘 1 — 재검토 rev-b5a-3 N-1). 그래서 글의 줄 상자를
 * Range 로 받아 위아래로 겹치지 않는 묶음을 센다. whole 은 안내 줄 전체의 줄 수다 — 가로에서는 두 줄이어야 해서, 이 셈이 1 보다 큰 값을
 * 낼 수 있음을 함께 보인다.
 */
async function lineRowsOf(p) {
  return p.evaluate((s) => {
    const rowsOf = (el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()]
        .filter((r) => r.width > 0 && r.height > 0)
        .sort((a, b) => a.top - b.top);
      let rows = 0;
      let bottom = Number.NEGATIVE_INFINITY;
      for (const r of rects) {
        if (r.top >= bottom - 1) {
          rows += 1;
          bottom = r.bottom;
        } else bottom = Math.max(bottom, r.bottom);
      }
      return rows;
    };
    const line = document.querySelector(s);
    if (!line) return { split: false, whole: 0, detail: "줄 없음" };
    const parts = [...line.querySelectorAll("[data-ko-sentence]")];
    const rows = parts.map(rowsOf);
    const whole = rowsOf(line);
    return {
      split: parts.length > 0 && rows.every((n) => n === 1),
      whole,
      detail: `문장 ${parts.length} · 문장마다 줄 ${rows.join("/")} · 안내 전체 줄 ${whole} · 줄 높이 ${Math.round(line.getBoundingClientRect().height)}`,
    };
  }, SEL.line);
}

/**
 * 줄 셈의 잣대 확인(재검토 rev-b5a-3 N-1): 안내 줄을 잠깐 좁혀 문장이 안에서 접히게 한 때의 줄 셈. 이때는 split 이 거짓이어야 한다 — '문장마다 한
 * 줄' 판정이 늘 참이 아니라 문장 안의 줄 바꿈을 실제로 잡는다는 것을 보인다. 본 뒤 너비를 되돌린다(장면의 끝에서만 부른다).
 */
async function narrowRowsOf(p) {
  const narrow = (width) =>
    p.evaluate(
      ([s, w]) => {
        const line = document.querySelector(s);
        if (!line) return;
        line.style.display = w ? "inline-block" : "";
        line.style.maxWidth = w;
      },
      [SEL.line, width],
    );
  await narrow("96px");
  const rows = await lineRowsOf(p);
  await narrow("");
  return rows;
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
    // M-2(C226 보완 2 (4)): 꺼진 한국어 단추의 글 · 테 색이 꺼진 '잘 모르겠어요'와 같고 '가' 표지 바탕이 보라가 아니다
    look: await p.evaluate(
      ({ k, d }) => {
        const a = document.querySelector(k);
        const b = document.querySelector(d);
        const mark = a?.querySelector("[aria-hidden]");
        if (!a || !b || !mark) return null;
        const sa = getComputedStyle(a);
        const sb = getComputedStyle(b);
        const sm = getComputedStyle(mark);
        return {
          koColor: sa.color,
          offColor: sb.color,
          koEdge: sa.borderTopColor,
          offEdge: sb.borderTopColor,
          markBg: sm.backgroundColor,
          markColor: sm.color,
        };
      },
      { k: SEL.ko, d: SEL.dontKnow },
    ),
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
    // I-2(C226 보완 2 (2)): 딱지 글 크기 · 딱지가 말풍선 위 테에 걸침(딱지 위 끝 < 말풍선 위 끝 < 딱지 아래 끝) · 딱지 아래와 답 글 사이
    badgeLook: has
      ? await p.evaluate(() => {
          const badge = [...document.querySelectorAll("[data-ko-badge]")].at(
            -1,
          );
          const say = [...document.querySelectorAll("[data-ko-say]")].at(-1);
          const bubble = say?.parentElement;
          if (!badge || !bubble || !say) return null;
          const b = badge.getBoundingClientRect();
          const u = bubble.getBoundingClientRect();
          const t = say.getBoundingClientRect();
          return {
            px: Number.parseFloat(getComputedStyle(badge).fontSize),
            straddles: b.top < u.top && u.top < b.bottom,
            clear: Math.round(t.top - b.bottom),
          };
        })
      : null,
    taughtHeight: await p
      .locator("[data-ko-taught]")
      .first()
      .evaluate((el) => el.getBoundingClientRect().height)
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
  // M-1(C226 보완 2 (3)): 한국어 단추 오른쪽 끝 ↔ '잘 모르겠어요' 왼쪽 끝 28px · 묶음 양옆 고리 자리 12px 씩
  const dontKnowBox = await boxOf(p, SEL.dontKnow);
  const side = ko && dontKnowBox ? dontKnowBox.x - (ko.x + ko.width) : null;
  check(
    `${where} · '한국어로 물어보기'가 '말하기' 아래에 있고 꼴로 갈림`,
    speak !== null &&
      ko !== null &&
      stack !== null &&
      gap !== null &&
      gap >= 16 &&
      Math.abs(stack.width - ko.width - 24) <= 2 &&
      side !== null &&
      Math.abs(side - 28) <= 1 &&
      look?.koBorder === "dashed" &&
      look?.speakBorder !== "dashed" &&
      look?.mark === "가" &&
      look?.koText.includes("한국어로 물어보기"),
    `말하기 ${fmt(speak)} · 한국어 ${fmt(ko)} · 묶음 너비 ${Math.round(stack?.width ?? 0)} · 사이 ${gap === null ? "-" : Math.round(gap)} · '잘 모르겠어요'와 옆 사이 ${side === null ? "-" : Math.round(side)} · 테 ${look?.speakBorder}/${look?.koBorder} · 바탕 ${look?.speakBg}/${look?.koBg} · 표지 ${look?.mark} · 글 '${look?.koText}'`,
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
  const lk = listening.look;
  check(
    `${where} · 한국어 듣는 중: 꺼진 '한국어로 물어보기'가 꺼진 '잘 모르겠어요'와 같은 옅은 글 · 테이고 '가' 표지도 옅음(M-2)`,
    lk !== null &&
      lk.koColor === lk.offColor &&
      lk.koEdge === lk.offEdge &&
      lk.markColor === lk.offColor &&
      !/200, 185, 242/.test(lk.markBg),
    JSON.stringify(lk),
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
  const bl = help.badgeLook;
  check(
    `${where} · 답: '한국어 도움' 딱지 글 20px 이상 · 말풍선 위 테에 걸침 · 답 글과 겹치지 않음(I-2)`,
    bl !== null && bl.px >= 20 && bl.straddles && bl.clear >= 0,
    JSON.stringify(bl),
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
  const second = await askKo(p, browserName, null, view);
  check(
    `${where} · 둘째 한국어 듣는 중: 쪽 넘침 0 · 위 띠가 화면 안`,
    second.listening.page.ok,
    second.listening.page.detail,
  );
  check(
    `${where} · 둘째 인식 확인: 쪽 넘침 0 · 위 띠가 화면 안`,
    second.confirm.page.ok,
    second.confirm.page.detail,
  );
  let offOk = false;
  let offDetail = `둘째 확인 ${second.confirm.shown}`;
  let offShot = null;
  if (second.confirm.shown) {
    await sendKo(p);
    const koLeft = await p.locator(SEL.ko).count();
    // 글은 textContent 로(문장 조각 사이에서 줄이 바뀌면 innerText 가 사이 빈칸을 빼므로 — 화면 시험 toHaveText 와 같은 잣대)
    const line = await p
      .locator(SEL.line)
      .first()
      .textContent()
      .catch(() => null);
    const fit = await fitOf(p, view, { needKo: false, needLine: true });
    const page = await pageOf(p, view);
    const lines = await lineRowsOf(p);
    offShot = await shot(p, browserName, `${tag}-5-off-notice`);
    // 3단계 첫 차례: '힌트'가 있고 연 단이 없다 — hint 꼴(M-3). 두 문장은 문장 사이에서만 줄이 바뀐다(M-4)
    offOk =
      koLeft === 0 && line === NOTICE_HINT && fit.ok && page.ok && lines.split;
    offDetail = `한국어 단추 ${koLeft} · 줄 '${line}' · 문장 줄 ${lines.detail} · ${fit.detail} · ${page.detail}`;
  }
  check(
    `${where} · 꺼짐: 단추가 사라지고 합친 안내(힌트 꼴)가 화면 안 · 쪽 넘침 0 · 위 띠가 화면 안`,
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
async function twoAsks(browser, url, check, { view, name, browserName }) {
  const FISH = "I like fish.";
  const p = await openChat(browser, url, {
    viewport: view,
    config: {
      recognitions: [KO_RECOGNITION, KO_RECOGNITION, EN_RECOGNITION],
      koHelps: [{}, { reply: { t: "ok", help: { teachEn: FISH } } }],
    },
  });
  await untilChild(p);
  // 두 번 묻는 동안의 쪽 넘김 · 위 띠(I-1 — 확인 칸이 열린 때 · 답 뒤 · 둘째 확인 칸이 닫힌 뒤)
  const pages = [];
  for (let i = 0; i < 2; i++) {
    const { confirm } = await askKo(p, null, null, view);
    pages.push([`${i + 1}째 확인`, confirm.page]);
    if (confirm.shown) {
      await p.locator("[data-ko-send]").click();
      await advance(p, 300);
    }
    await until(p, async () => (await phaseOf(p)) === "child");
    await advance(p, 1500);
    pages.push([`${i + 1}째 답 뒤`, await pageOf(p, view)]);
    // 지금 질문이 칸 위로 넘어간 꼴을 눈으로 보는 사진(화면 재검토 des-ko-screen-2 N-1)
    if (browserName)
      await shot(
        p,
        browserName,
        `l3-${view.width > view.height ? "landscape" : "portrait"}-two-asks-${i + 1}-after`,
      );
  }
  check(
    `${name} · 한 차례에 두 번 물음: 확인 · 답 뒤마다 쪽 넘침 0 · 위 띠가 화면 안(I-1)`,
    pages.length === 4 && pages.every(([, m]) => m.ok),
    pages.map(([k, m]) => `${k}: ${m.detail}`).join(" / "),
  );
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
    `${name} · 한 차례에 두 번 물음 → 두 '알려 준 말 듣기'가 저마다 제 표현을 읽고 다음 턴에 두 도움의 다시 들은 수(I-6)`,
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

/** M-3 · C226 보완 2 (5): 요청이 오류로 끝나면(다시 보냄까지 모두 error) 단추가 남고 안내는 '한 번 더 물어봐요' 꼴이다(가로 — 두 줄 안내 자리). */
async function errorReply(browser, url, browserName, check) {
  const p = await openChat(browser, url, {
    viewport: LANDSCAPE,
    config: {
      recognitions: [KO_RECOGNITION],
      koHelps: [ERROR, ERROR, ERROR, ERROR, ERROR],
    },
  });
  await untilChild(p);
  const sent = await askAndSend(p);
  const back = await until(
    p,
    async () => (await phaseOf(p)) === "child",
    20000,
  );
  await advance(p, 300);
  const koLeft = await p.locator(SEL.ko).count();
  const koOn = await enabledOf(p, SEL.ko);
  const line = await p
    .locator(SEL.line)
    .first()
    .textContent()
    .catch(() => null);
  const lines = await lineRowsOf(p);
  const fit = await fitOf(p, LANDSCAPE, { needLine: true });
  const page = await pageOf(p, LANDSCAPE);
  await shot(p, browserName, "l3-landscape-error-notice");
  check(
    "가로 · 오류로 끝난 질문: 한국어 단추가 남고 안내 '한 번 더 물어봐요' · 문장 사이에서만 줄 바뀜 · 화면 안 · 쪽 넘침 0",
    sent &&
      back &&
      koLeft === 1 &&
      koOn &&
      line === NOTICE_RETRY &&
      lines.split &&
      fit.ok &&
      page.ok,
    `보냄 ${sent} · 돌아옴 ${back} · 한국어 단추 ${koLeft}(켜짐 ${koOn}) · 줄 '${line}' · ${lines.detail} · ${fit.detail} · ${page.detail}`,
  );
  // 잣대 확인: 안내 줄을 좁히면 문장이 안에서 접혀 '문장마다 한 줄'이 거짓이 된다(판정이 늘 참이 아님 — 재검토 rev-b5a-3 N-1)
  const narrow = await narrowRowsOf(p);
  const again = await lineRowsOf(p);
  check(
    "줄 셈의 잣대: 안내 줄을 좁히면 문장 안에서 줄이 바뀐 것으로 세고, 되돌리면 다시 문장마다 한 줄",
    lines.split && !narrow.split && again.split,
    `좁혔을 때 ${narrow.detail} / 되돌린 뒤 ${again.detail}`,
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
        `4단계 ${view.width}×${view.height} · 가르친 표현이 글로 보이고(누르는 곳 56px 이상 — M-5) 딱지 글 20px 이상 · 네 단추가 화면 안`,
        r.opened &&
          r.sent.opened &&
          r.help.has &&
          r.help.badge === "한국어 도움" &&
          r.help.taught === 1 &&
          r.help.taughtText?.trim() === TAUGHT &&
          (r.help.taughtHeight ?? 0) >= 56 &&
          (r.help.badgeLook?.px ?? 0) >= 20 &&
          r.help.replay === 0 &&
          r.help.spoken.includes(TAUGHT) &&
          r.fit.ok &&
          r.errors.length === 0,
        `답 뒤 열림 ${r.sent.opened} · 딱지 '${r.help.badge}' · 표현 글 ${r.help.taught}('${r.help.taughtText}' · 누르는 곳 높이 ${r.help.taughtHeight}) · 딱지 ${JSON.stringify(r.help.badgeLook)} · 듣기 알약 ${r.help.replay} · 읽은 것에 표현 ${r.help.spoken.includes(TAUGHT)} · ${r.fit.detail} · 쪽 오류 ${r.errors.length}`,
      );
      log(`4단계 ${name} 답 뒤 영어 턴 요청의 koHelp: ${r.koHelpPart}`);
    }
    // 기다리는 동안 · 응답 갈래 · 두 번 물음(b5-fix1 — 코드 검토 rev-b5a I-3 · I-4 · I-6)
    await stopWhileWaiting(browser, url, check);
    await staleReply(browser, url, check);
    await twoAsks(browser, url, check, {
      view: PORTRAIT,
      name: "세로",
      browserName,
    });
    await twoAsks(browser, url, check, {
      view: LANDSCAPE,
      name: "가로",
      browserName,
    });
    await errorReply(browser, url, browserName, check);
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
