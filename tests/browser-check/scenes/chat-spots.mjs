// G (나) 자리 재현 화면(회화 대화 구조 R plan 'G 의 차례' (나) · spec 설계 13 '자리 재현 실호출'): 자리 재현 도구(scripts/exp/chat-spots.ts)의 화면
// 자료(screens.json)를 talk-chat-spots 쪽의 가짜 서버가 되돌려 틀게 하고, 열여섯 자리마다 실제 수업 틀을 띄워 사진을 찍는다. 판정은 자리마다
// '쪽이 열림 · 그 자리의 선생님 글(또는 닫는 줄)이 화면에 보임 · {NAME} 이 화면에 남지 않음 · 쪽 오류 없음'이고, 기다림 자리는 조용함 요청이 없음,
// 힌트 자리는 힌트 응답 글이 보임, 설명 자리는 설명 글이 보임, 정리 자리는 정리가 열림, 들리지 않음 자리는 말소리 없음 듣기 뒤 턴 요청 한 번과
// 회색 '못 들었어요' 말풍선을 더 본다. 채점이 아니라 사람이 사진을 보는 자리다.
// 닿지 못한 자리(화면 자료 reached 거짓 — 실호출 응답이 그 자리의 조건을 세우지 않음)는 통과 · 실패로 세지 않고 '닿지 못함' 줄로 따로 센다
// (검토 rev-g-spots I-1). 차례가 있으면 화면을 띄워 사진(-unreached)을 남기고, 차례가 없으면(trigger missing) 화면 없이 까닭만 적는다. 끝에
// '자리 N · 통과 · 실패 · 닿지 못함' 한 줄을 찍는다.
// 자료: 환경 변수 CHAT_SPOTS_RESULT(screens.json 경로 또는 그것이 든 폴더 — 실호출 결과), 주지 않으면 저장소의 가짜 결과 묶음
// tests/browser-check/fixtures/chat-spots-fake.json. 사진: 환경 변수 CHAT_SPOTS_SHOTS(폴더), 주지 않으면 운영체제 임시 폴더의 chat-spots-shots
// (저장소 밖). 쪽 talk-chat-spots 는 build.mjs 의 쪽 목록에 있다(대역 표는 talk-chat 쪽과 같은 상수).
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  run as advance,
  PORTRAIT,
  phaseOf,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

const HERE = fileURLToPath(new URL("..", import.meta.url));

export const page = "talk-chat-spots";

/** 쪽의 아이 이름(entry.tsx PAGE_NAME — 화면이 {NAME} 을 채우는 글). */
const PAGE_NAME = "Momo";
const NAME_SLOT = "{NAME}";

function screensPath() {
  const given = process.env.CHAT_SPOTS_RESULT;
  if (!given) return join(HERE, "fixtures", "chat-spots-fake.json");
  return existsSync(given) && statSync(given).isDirectory()
    ? join(given, "screens.json")
    : given;
}

function shotsDir() {
  const dir =
    process.env.CHAT_SPOTS_SHOTS ?? join(tmpdir(), "chat-spots-shots");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** 말소리 없음으로 끝나는 듣기 한 번(no-speech — 앱이 talk.nospeech_dontknow_count 번 세면 '들리지 않음'으로 보낸다). */
const NO_SPEECH = {
  events: [
    { at: 50, type: "start" },
    { at: 80, type: "audiostart" },
    { at: 4000, type: "error", error: "no-speech" },
    { at: 4010, type: "end" },
  ],
};
/** 말소리 없음 듣기를 누르는 상한(설정 talk.nospeech_dontknow_count 보다 넉넉히 — 턴 요청이 가면 멈춘다). */
const NOSPEECH_PRESS_MAX = 5;

/** 아이 말 한 번의 가짜 인식 대본(들린 글 하나, 확정 결과). */
function heardScript(text) {
  return {
    events: [
      { at: 50, type: "start" },
      { at: 80, type: "audiostart" },
      { at: 300, type: "soundstart" },
      { at: 400, type: "speechstart" },
      {
        at: 900,
        type: "result",
        results: [{ transcript: text, isFinal: true }],
      },
      { at: 950, type: "speechend" },
    ],
  };
}

async function open(browser, url, spot) {
  const context = await browser.newContext({ viewport: PORTRAIT });
  const p = await context.newPage();
  await p.clock.install({ time: 0 });
  const heard = (spot.heard ?? "I like it.").replaceAll(NAME_SLOT, PAGE_NAME);
  await p.addInitScript(
    (c) => {
      window.__chatConfig = c;
    },
    {
      spot,
      recognitions:
        spot.trigger === "nospeech"
          ? Array.from({ length: NOSPEECH_PRESS_MAX }, () => NO_SPEECH)
          : [heardScript(heard)],
    },
  );
  await p.goto(url(""));
  const t = await p.evaluate(() => Date.now());
  await p.clock.pauseAt(t + 1000);
  await p.getByRole("button", { name: "시작!" }).click();
  return p;
}

/** 말하기 한 번(말하기 → 끝 조용함 · 인식 확인 → 보내기가 있으면 누름). */
async function talkOnce(p) {
  await p.getByRole("button", { name: "말하기", exact: true }).click();
  await advance(p, 4500);
  const send = p.getByRole("button", { name: "보내기" });
  if ((await send.count()) > 0) await send.first().click();
  await advance(p, 4000);
}

/** 말소리 없음 듣기를 턴 요청이 갈 때까지 되풀이한다(앱의 실제 '눌렀으나 들리지 않음' 길). 누른 수를 돌려준다. */
async function noSpeechUntilSent(p) {
  for (let n = 1; n <= NOSPEECH_PRESS_MAX; n += 1) {
    const talk = p.getByRole("button", { name: "말하기", exact: true });
    if ((await talk.count()) > 0) await talk.first().click();
    await advance(p, 5000);
    await advance(p, 3000);
    if ((await recordOf(p)).childTurns > 0) return n;
  }
  return NOSPEECH_PRESS_MAX;
}

async function settle(p, ms = 8000) {
  for (let t = 0; t < ms; t += 200) {
    const phase = await phaseOf(p);
    if (phase === "child" && t >= 1500) return;
    await advance(p, 200);
  }
}

const fill = (s) => s.replaceAll(NAME_SLOT, PAGE_NAME);

export async function run({ browserType, browserName, url, check, log }) {
  const path = screensPath();
  const data = JSON.parse(readFileSync(path, "utf8"));
  const screens = data.screens ?? [];
  const dir = shotsDir();
  log(
    `자료 ${path}(${data.live ? "실호출" : "가짜"} · 자리 ${screens.length}) · 사진 ${dir}`,
  );
  check(
    "화면 자료를 읽음",
    screens.length > 0 && screens.every((s) => typeof s.id === "string"),
    `자리 ${screens.length}`,
  );
  const count = { pass: 0, fail: 0, unreached: [] };
  const browser = await browserType.launch();
  for (const [i, spot] of screens.entries()) {
    const name = `${String(i + 1).padStart(2, "0")} ${spot.label}`;
    const why = (spot.why ?? []).join(" · ") || "-";
    if (spot.trigger === "missing") {
      count.unreached.push(spot.id);
      log(`닿지 못함 · ${name} · 까닭 ${why} · 차례 없음 — 화면을 띄우지 않음`);
      continue;
    }
    const p = await open(browser, url, spot);
    const opened = await untilChild(p);
    const extra = [];
    // 힌트는 앱과 같이 아이가 말하기 전에 앞 선생님 차례에서 단을 차례로 연다
    for (const _ of spot.hints) {
      const button = p.locator("[data-hint-button]");
      if ((await button.count()) > 0) await button.first().click();
      await advance(p, 2500);
    }
    const hintText = await p.locator("body").innerText();
    const shownHints = spot.hints.filter((h) => h.ok).map((h) => fill(h.text));
    if (shownHints.length > 0)
      extra.push([
        "힌트 글 보임",
        shownHints.every((h) => hintText.includes(h)),
      ]);
    let pressed = 0;
    if (spot.trigger === "speech") await talkOnce(p);
    else if (spot.trigger === "nospeech") pressed = await noSpeechUntilSent(p);
    else if (spot.trigger === "dont_know")
      await p.locator("[data-dont-know]").click();
    else if (spot.trigger === "quiet") {
      for (let t = 0; t < 60_000; t += 500) {
        const r = await recordOf(p);
        if (r.quiet >= spot.replies.length) break;
        await advance(p, 500);
      }
    } else if (spot.trigger === "none") await advance(p, 30_000);
    if (spot.trigger !== "hint") await settle(p);
    if (spot.explain) await advance(p, 3000);
    if (spot.wrap) {
      const stop = p.getByRole("button", { name: "그만하기" });
      if ((await stop.count()) > 0) await stop.first().click();
      await advance(p, 6000);
    }
    const reached = spot.reached !== false;
    const shot = join(
      dir,
      `${browserName}-${String(i + 1).padStart(2, "0")}-${spot.id}${reached ? "" : "-unreached"}.png`,
    );
    await p.screenshot({ path: shot });
    const text = await p.locator("body").innerText();
    const r = await recordOf(p);
    const seen = spot.expect.map(fill).filter((e) => !text.includes(e));
    if (spot.trigger === "none")
      extra.push(["조용함 요청 없음", r.quiet === 0]);
    if (spot.trigger === "quiet")
      extra.push(["조용함 요청 수", r.quiet === spot.replies.length]);
    if (spot.explain?.ok)
      extra.push(["설명 글 보임", text.includes(spot.explain.text)]);
    if (spot.wrap)
      extra.push([
        "정리 열림",
        (await p.locator("[data-wrap-log]").count()) > 0,
      ]);
    if (spot.trigger === "nospeech") {
      extra.push([`턴 요청 한 번(말하기 ${pressed}번)`, r.childTurns === 1]);
      // 같은 회색 글이 지금 시도 자리에도 뜨므로 기록 칸에 남았는지까지는 증명하지 않는다 — 판정 이름을 그만큼으로 둔다(검토 rev-g-spots-2 N-4)
      extra.push([
        "회색 '못 들었어요' 글이 화면에 있음",
        text.includes("못 들었어요"),
      ]);
    }
    const ok =
      opened &&
      seen.length === 0 &&
      !text.includes(NAME_SLOT) &&
      r.pageErrors.length === 0 &&
      extra.every(([, v]) => v);
    const detail = `열림 ${opened} · 안 보인 글 ${seen.length === 0 ? "없음" : seen.join(" | ")} · {NAME} 남음 ${text.includes(NAME_SLOT)} · ${extra.map(([k, v]) => `${k} ${v}`).join(" · ") || "-"} · 사진 ${shot}`;
    if (!reached) {
      count.unreached.push(spot.id);
      log(`닿지 못함 · ${name} · 까닭 ${why} · 화면(참고) ${detail}`);
    } else {
      check(name, ok, detail);
      if (ok) count.pass += 1;
      else count.fail += 1;
    }
    await p.context().close();
  }
  // 닿지 못한 자리가 있으면 이 판정 하나가 실패해 실행기 끝 줄 · 종료 코드에도 드러난다(자리별 통과 · 실패 셈은 그대로 — 검토 rev-g-spots-2 N-2)
  check(
    "모든 자리에 닿음",
    count.unreached.length === 0,
    count.unreached.join(", ") || "-",
  );
  log(
    `자리 ${screens.length} · 통과 ${count.pass} · 실패 ${count.fail} · 닿지 못함 ${count.unreached.length}${count.unreached.length > 0 ? `(${count.unreached.join(", ")})` : ""}`,
  );
}
