// 수업 안 한국어로 묻기 장면 2(화면 고침 2 — b5-fix2): 실제 수업 틀 · 기록 칸 · 곁 말풍선을 가짜 음성 · 가짜 서버 응답으로 돌린다.
// (가) 이어 하기로 되살린 1~3단계 표현 도움의 '알려 준 말 듣기'가 소리를 못 내도 다음 영어 턴 koHelp 의 '들었음'이 참으로 남는다(코드 검토 rev-b5b I-2).
// (나) 4단계부터 지난 한국어 도움 말풍선을 누르면 가르친 표현 하나만 다시 읽고(한국어 답은 읽지 않음), 답이 빈 행은 물은 말만 그리며 다시 부르지
// 않는다. 1~3단계는 누를 것도 표현 글도 없다(rev-b5b I-1, 정본 03 대화 기록). (다) 표현 답의 소리가 시작 알림 전에 '끊김'으로 끝나도 아이 차례가
// 열린다(재검토 rev-b5a-2 N-1).
// (라) 지금 차례의 답이 빈 행(이어 하기 — 열린 행)은 곁 말풍선 자리에 질문만 그리고 딱지 · 한국어 답이 없으며, 한국어 질문 요청을 다시 보내지 않고
// 다음 영어 턴 요청의 koHelp 에 들지 않는다(재검토 rev-b5b-2 N-1 — 화면 고침 3 '다').
import {
  run as advance,
  openChat,
  PORTRAIT,
  phaseOf,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const TAUGHT = "I like ducks.";
const FISH = "I like fish.";
const SAY = "'오리를 좋아해요'는 이렇게 말해요. 잘 듣고 따라 해 봐요.";
const SAY_FISH = "'물고기를 좋아해요'는 이렇게 말해요.";
const ASKED_ONLY = "수영은 영어로 뭐라고 해요";
const SPEAK = "[data-speak-stack] [data-speak]";

const KO_RECOGNITION = {
  events: [
    { at: 50, type: "start" },
    { at: 80, type: "audiostart" },
    { at: 300, type: "soundstart" },
    { at: 400, type: "speechstart" },
    {
      at: 1200,
      type: "result",
      results: [
        {
          transcript: "오리 좋아한다는 말은 영어로 뭐라고 해요",
          isFinal: true,
        },
      ],
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

/** 화면 자료 koHelps 의 답이 있는 행. */
const answered = (
  turnNo,
  seq,
  open,
  { teachEn = TAUGHT, sayKo = SAY } = {},
) => ({
  turnNo,
  seq,
  question: "오리 좋아한다는 말은 영어로 뭐라고 해요",
  kind: "expression",
  sayKo,
  teachEn,
  textShown: false,
  fallback: "none",
  replay: "taught",
  open,
});
/** 답이 빈 행(호출 중에 끊긴 것). open 은 지금 차례에 열린 행인가(이어 하기의 live). */
const pending = (turnNo, seq, open = false) => ({
  turnNo,
  seq,
  question: ASKED_ONLY,
  kind: null,
  sayKo: null,
  textShown: false,
  fallback: null,
  replay: "teacher_line",
  open,
});
/** 쪽의 지금 선생님 행 번호(entry.tsx turnNo — 처음 기록 칸의 지난 차례 쌍 3 뒤). */
const CURRENT_TURN = 4;

async function until(p, test, limit = 8000, step = 100) {
  for (let t = 0; t < limit; t += step) {
    if (await test()) return true;
    await advance(p, step);
  }
  return test();
}

const spokenOf = (p) =>
  p.evaluate(() => [...(window.__fakeSpeech?.spoken ?? [])]);

/** '말하기'를 눌러 다음 영어 턴 요청을 보내고 그 본문을 돌려준다. */
async function sendEnglish(p) {
  await p.locator(SPEAK).click();
  await until(
    p,
    async () => (await recordOf(p)).requests.some((b) => b.input !== undefined),
    8000,
  );
  const send = p.locator("[data-confirm-send], [data-send]");
  if ((await send.count()) > 0) await send.first().click();
  await until(
    p,
    async () => (await recordOf(p)).requests.some((b) => b.input !== undefined),
    8000,
  );
  return (await recordOf(p)).requests.find((b) => b.input !== undefined);
}

/** (가) I-2: 이어 연 차례의 '알려 준 말 듣기'가 소리를 못 냄 → 안내는 뜨고 다음 턴 koHelp 의 heard 는 참. */
async function resumeReplayFail(browser, url, check) {
  const p = await openChat(browser, url, {
    viewport: PORTRAIT,
    config: {
      level: 3,
      recognitions: [EN_RECOGNITION],
      resumeKoHelps: [answered(4, 1, true)],
      speakFails: [{ text: TAUGHT, error: "synthesis-failed", times: 1 }],
    },
  });
  const opened = await untilChild(p);
  const replay = p.locator("[data-ko-replay]");
  const buttons = await replay.count();
  if (buttons > 0) await replay.first().click();
  await advance(p, 1500);
  const retry = await p
    .locator("[data-ko-retry]")
    .first()
    .getAttribute("data-ko-retry")
    .catch(() => null);
  const failed = await p.evaluate(() => window.__chat.failedReads.length);
  const req = await sendEnglish(p);
  const koHelp = req?.koHelp ?? null;
  const errors = (await recordOf(p)).pageErrors;
  check(
    "이어 연 차례의 '알려 준 말 듣기'가 소리를 못 냄 → '소리가 안 나왔어요'는 뜨고 다음 턴 koHelp 의 들었음은 참(rev-b5b I-2)",
    opened &&
      buttons >= 1 &&
      failed === 1 &&
      retry !== null &&
      Array.isArray(koHelp) &&
      koHelp.length === 1 &&
      koHelp[0].heard === true &&
      errors.length === 0,
    `열림 ${opened} · 듣기 단추 ${buttons} · 실패시킨 읽기 ${failed} · 안내 ${retry} · 다음 턴 koHelp ${JSON.stringify(koHelp)} · 쪽 오류 ${errors.join(" | ")}`,
  );
  await p.context().close();
}

/** (나) I-1: 지난 한국어 문답 — 4단계는 눌러 표현만 다시 읽음, 답이 빈 행은 물은 말만, 1~3단계는 누를 것 없음. */
async function pastHelps(browser, url, check, level) {
  const p = await openChat(browser, url, {
    viewport: PORTRAIT,
    config: {
      level,
      resumeKoHelps: [
        answered(2, 1, false, { teachEn: FISH, sayKo: SAY_FISH }),
        pending(3, 1),
      ],
    },
  });
  const opened = await untilChild(p);
  const rows = p.locator("[data-ko-log]");
  const count = await rows.count();
  const texts = [];
  for (let i = 0; i < count; i++) texts.push(await rows.nth(i).innerText());
  const askedRow = rows.filter({ hasText: ASKED_ONLY });
  const askedOnly =
    (await askedRow.count()) === 1 &&
    (await askedRow.locator("[data-ko-say], [data-ko-badge]").count()) === 0;
  const replay = p.locator("[data-ko-log-replay]");
  const buttons = await replay.count();
  let heard = "";
  if (buttons > 0) {
    const before = (await spokenOf(p)).length;
    await replay.first().click();
    await advance(p, 1500);
    heard = (await spokenOf(p)).slice(before).join(" / ");
  }
  const body = await p.evaluate(() => document.body.innerText);
  const koCalls = await p.evaluate(() => window.__chat.koCalls.length);
  const errors = (await recordOf(p)).pageErrors;
  if (level >= 4)
    check(
      "4단계 지난 한국어 도움 말풍선을 누르면 가르친 표현 하나만 다시 읽고 한국어 답은 읽지 않음 · 답이 빈 행은 물은 말만 · 다시 부르지 않음(rev-b5b I-1)",
      opened &&
        count === 2 &&
        askedOnly &&
        buttons === 1 &&
        heard === FISH &&
        !heard.includes("물고기") &&
        koCalls === 0 &&
        errors.length === 0,
      `열림 ${opened} · 기록의 문답 ${count}(${texts.map((t) => t.replaceAll("\n", " ")).join(" | ")}) · 물은 말만 ${askedOnly} · 누를 말풍선 ${buttons} · 누른 뒤 읽음 '${heard}' · 질문 요청 ${koCalls} · 쪽 오류 ${errors.join(" | ")}`,
    );
  else
    check(
      "3단계 지난 한국어 도움은 누를 것도 표현 글도 없음 · 답이 빈 행은 물은 말만(rev-b5b I-1 · T2)",
      opened &&
        count === 2 &&
        askedOnly &&
        buttons === 0 &&
        !body.includes(FISH) &&
        koCalls === 0 &&
        errors.length === 0,
      `열림 ${opened} · 기록의 문답 ${count} · 물은 말만 ${askedOnly} · 누를 말풍선 ${buttons} · 쪽에 표현 글 ${body.includes(FISH)} · 질문 요청 ${koCalls} · 쪽 오류 ${errors.join(" | ")}`,
    );
  await p.context().close();
}

/** (다) N-1: 표현 답의 소리가 시작 알림 전에 '끊김'으로 끝나도 아이 차례가 열리고 단추가 켜진다. */
async function cancelledBeforeStart(browser, url, check) {
  const p = await openChat(browser, url, {
    viewport: PORTRAIT,
    config: {
      level: 3,
      recognitions: [KO_RECOGNITION, EN_RECOGNITION],
      speakFails: [{ text: TAUGHT, error: "canceled", times: 1 }],
    },
  });
  await untilChild(p);
  await p.locator("[data-ko-ask]").click();
  await advance(p, 700);
  const confirmed = await until(
    p,
    async () => (await p.locator("[data-ko-send]").count()) > 0,
  );
  if (confirmed) await p.locator("[data-ko-send]").click();
  const back = await until(p, async () => (await phaseOf(p)) === "child");
  await advance(p, 2000);
  const still = await phaseOf(p);
  const speakOn = await p
    .locator(SPEAK)
    .first()
    .evaluate((el) => el.disabled === false)
    .catch(() => null);
  const failed = await p.evaluate(() => window.__chat.failedReads);
  const errors = (await recordOf(p)).pageErrors;
  check(
    "표현 답의 소리가 시작 전에 '끊김'으로 끝남 → 아이 차례가 열리고 '말하기'가 켜짐(재검토 rev-b5a-2 N-1)",
    confirmed &&
      back &&
      still === "child" &&
      speakOn === true &&
      failed.length === 1 &&
      errors.length === 0,
    `확인 ${confirmed} · 열림 ${back} · 2초 뒤 차례 ${still} · 말하기 켜짐 ${speakOn} · 실패시킨 읽기 ${JSON.stringify(failed.map((f) => f.error))} · 쪽 오류 ${errors.join(" | ")}`,
  );
  await p.context().close();
}

/** (라) N-1: 지금 차례의 열린 빈 행 — 곁 말풍선 자리에 질문만, 딱지 없음, 질문 요청 0, 다음 턴 koHelp 에 없음. */
async function liveEmptyRow(browser, url, check) {
  const p = await openChat(browser, url, {
    viewport: PORTRAIT,
    config: {
      level: 3,
      recognitions: [EN_RECOGNITION],
      resumeKoHelps: [pending(CURRENT_TURN, 1, true)],
    },
  });
  const opened = await untilChild(p);
  const live = p.locator("[data-ko-exchange]").filter({ hasText: ASKED_ONLY });
  const shown = await live.count();
  const inLog = await p
    .locator("[data-ko-log]")
    .filter({ hasText: ASKED_ONLY })
    .count();
  const questionOnly =
    shown === 1 &&
    (await live.locator("[data-ko-question]").innerText()) === ASKED_ONLY &&
    (await live
      .locator(
        "[data-ko-badge], [data-ko-say], [data-ko-help], [data-ko-replay]",
      )
      .count()) === 0;
  await advance(p, 1500);
  const koCallsBefore = await p.evaluate(() => window.__chat.koCalls.length);
  const req = await sendEnglish(p);
  const koHelp = req?.koHelp;
  const koCalls = await p.evaluate(() => window.__chat.koCalls.length);
  const errors = (await recordOf(p)).pageErrors;
  check(
    "지금 차례의 답이 빈 행(이어 하기): 곁 말풍선 자리에 질문만 · 딱지 없음 · 한국어 질문 요청 0 · 다음 턴 koHelp 에 없음(rev-b5b-2 N-1)",
    opened &&
      questionOnly &&
      inLog === 0 &&
      koCallsBefore === 0 &&
      koCalls === 0 &&
      req !== undefined &&
      (koHelp === undefined ||
        (Array.isArray(koHelp) && koHelp.length === 0)) &&
      errors.length === 0,
    `열림 ${opened} · 곁 말풍선 ${shown} · 질문만 ${questionOnly} · 기록 칸에 ${inLog} · 질문 요청 ${koCallsBefore} → ${koCalls} · 다음 턴 koHelp ${JSON.stringify(koHelp)} · 쪽 오류 ${errors.join(" | ")}`,
  );
  await p.context().close();
}

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  try {
    await resumeReplayFail(browser, url, check);
    await pastHelps(browser, url, check, 4);
    await pastHelps(browser, url, check, 3);
    await cancelledBeforeStart(browser, url, check);
    await liveEmptyRow(browser, url, check);
  } finally {
    await browser.close();
  }
}
