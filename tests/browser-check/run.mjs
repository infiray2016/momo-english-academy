// 실제 브라우저 점검: 쪽을 묶고 → WebKit · Chromium 에서 장면을 돌리고 → 장면마다 통과 · 실패 한 줄 → 하나라도 실패하면 1 로 끝낸다.
// 장면이 던지거나 시간 상한을 넘거나 쪽 오류(pageerror)가 나도 그 장면을 실패로 세고, 띄운 브라우저를 닫은 뒤 다음 장면으로 간다.
// 쓰는 법: pnpm check:browser [장면 이름 …] [--browser webkit|chromium] [--swap 조각 경로=파일 경로 …] [--keep]
// 장면 이름은 scenes/ 의 파일 이름(.mjs 뺌)이고, 앞부분만 줘도 된다(예: talk-log 는 talk-log-* 전부).
import { readdir, rm } from "node:fs/promises";
import { loadavg } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, webkit } from "@playwright/test";
import { buildPage, PAGES, parseSwap } from "./build.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const BROWSERS = { webkit, chromium };
/** 장면 하나의 시간 상한(ms, 점검 값). 가장 긴 장면(누름 63회)이 6분쯤이라 그 두 배 반이다. 넘으면 실패로 세고 다음 장면으로 간다. */
const SCENE_LIMIT_MS = 15 * 60 * 1000;

/**
 * 장면이 띄운 브라우저를 모두 기억하고, 그 브라우저에서 연 쪽의 오류(pageerror)를 모은다.
 * 장면이 도중에 던져도 실행기가 closeAll() 로 한 자리에서 닫는다(장면마다 닫기를 맡기지 않음).
 */
function trackBrowsers(type) {
  const browsers = [];
  const pageErrors = [];
  const seen = new WeakSet();
  const watch = (page) => {
    if (seen.has(page)) return;
    seen.add(page);
    page.on("pageerror", (e) => pageErrors.push(e.message));
  };
  const tracked = Object.create(type);
  tracked.launch = async (...args) => {
    const browser = await type.launch(...args);
    browsers.push(browser);
    const newContext = browser.newContext.bind(browser);
    const newPage = browser.newPage.bind(browser);
    browser.newContext = async (...a) => {
      const context = await newContext(...a);
      context.on("page", watch);
      return context;
    };
    browser.newPage = async (...a) => {
      const page = await newPage(...a);
      watch(page);
      return page;
    };
    return browser;
  };
  const closeAll = () =>
    Promise.allSettled(browsers.map((b) => b.close())).then(() => undefined);
  return { tracked, pageErrors, closeAll };
}

function withLimit(promise, ms) {
  let timer;
  const limit = new Promise((_, reject) => {
    timer = setTimeout(
      () =>
        reject(new Error(`시간 상한 ${Math.round(ms / 60000)}분을 넘었어요`)),
      ms,
    );
  });
  // 상한에 걸려 버려진 장면이 뒤늦게 던져도 과정이 죽지 않게 받아 둔다
  promise.catch(() => undefined);
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

const load = () =>
  loadavg()
    .map((n) => n.toFixed(1))
    .join(" · ");

function parseArgs(argv) {
  const cwd = process.env.INIT_CWD ?? process.cwd();
  const out = { names: [], browsers: [], swaps: [], keep: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const eq = a.indexOf("=");
      if (eq > 0) return a.slice(eq + 1); // --browser=webkit · --swap=조각=파일
      i += 1;
      if (i >= argv.length) throw new Error(`${a} 뒤에 값이 없어요`);
      return argv[i];
    };
    if (a === "--") continue;
    if (a === "--keep") out.keep = true;
    else if (a === "--browser" || a.startsWith("--browser=")) {
      out.browsers.push(...value().split(","));
    } else if (a === "--swap" || a.startsWith("--swap=")) {
      out.swaps.push(parseSwap(value(), cwd));
    } else if (a.startsWith("--")) throw new Error(`모르는 인자예요: ${a}`);
    else out.names.push(a);
  }
  if (out.browsers.length === 0) out.browsers = Object.keys(BROWSERS);
  for (const b of out.browsers) {
    if (!BROWSERS[b])
      throw new Error(`브라우저는 webkit · chromium 가운데 하나예요: ${b}`);
  }
  return out;
}

async function loadScenes(names) {
  const files = (await readdir(join(HERE, "scenes")))
    .filter((f) => f.endsWith(".mjs"))
    .sort();
  const all = files.map((f) => f.replace(/\.mjs$/, ""));
  const picked =
    names.length === 0
      ? all
      : all.filter((s) => names.some((n) => s === n || s.startsWith(n)));
  const unknown = names.filter(
    (n) => !all.some((s) => s === n || s.startsWith(n)),
  );
  if (unknown.length > 0) {
    throw new Error(
      `없는 장면이에요: ${unknown.join(", ")} (있는 장면: ${all.join(", ")})`,
    );
  }
  const scenes = [];
  for (const name of picked) {
    const mod = await import(
      pathToFileURL(join(HERE, "scenes", `${name}.mjs`)).href
    );
    if (!PAGES[mod.page])
      throw new Error(`장면 ${name} 의 쪽(${mod.page})이 build.mjs 에 없어요`);
    scenes.push({ name, page: mod.page, run: mod.run });
  }
  return scenes;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scenes = await loadScenes(args.names);
  const outDir = join(HERE, ".out", `run-${process.pid}`);
  const urls = {};
  let code = 1;
  try {
    for (const page of new Set(scenes.map((s) => s.page))) {
      const html = await buildPage(page, { outDir, swaps: args.swaps });
      urls[page] = pathToFileURL(html).href;
    }
    if (args.swaps.length > 0) {
      for (const s of args.swaps)
        console.log(`바꿔 끼움 · ${s.from} ← ${s.to}`);
    }
    console.log(`기기 부하 평균(1 · 5 · 15분) 처음 ${load()}`);
    const summary = [];
    for (const browserName of args.browsers) {
      for (const scene of scenes) {
        const results = [];
        const started = Date.now();
        const tag = `${browserName} · ${scene.name}`;
        const check = (label, ok, detail = "") => {
          results.push(ok);
          console.log(
            `  ${ok ? "통과" : "실패"} · ${tag} · ${label} · ${detail}`,
          );
        };
        const log = (text) => console.log(`  ${tag} · ${text}`);
        let error = null;
        const { tracked, pageErrors, closeAll } = trackBrowsers(
          BROWSERS[browserName],
        );
        try {
          await withLimit(
            scene.run({
              browserType: tracked,
              browserName,
              url: (query = "") => `${urls[scene.page]}?${query}`,
              check,
              log,
            }),
            SCENE_LIMIT_MS,
          );
          if (results.length === 0) error = "판정이 하나도 없어요";
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
        } finally {
          await closeAll();
        }
        if (pageErrors.length > 0) {
          console.log(
            `  실패 · ${tag} · 쪽 오류 없음 · ${pageErrors.length}건, 첫 오류: ${pageErrors[0]}`,
          );
        }
        const failed =
          results.filter((r) => !r).length + (pageErrors.length > 0 ? 1 : 0);
        const ok = !error && failed === 0;
        const secs = Math.round((Date.now() - started) / 1000);
        const counted = results.length + (pageErrors.length > 0 ? 1 : 0);
        const why = error
          ? `오류: ${error}${failed > 0 ? ` · 판정 실패 ${failed}건` : ""}`
          : `판정 ${counted}건 가운데 실패 ${failed}건`;
        console.log(`${ok ? "통과" : "실패"} · ${tag} · ${why} · ${secs}초`);
        summary.push({ tag, ok });
      }
    }
    console.log(`기기 부하 평균(1 · 5 · 15분) 끝 ${load()}`);
    const bad = summary.filter((s) => !s.ok);
    console.log(
      bad.length === 0
        ? `\n모두 통과(${summary.length}건: 장면 ${scenes.length} × 브라우저 ${args.browsers.length})`
        : `\n실패 ${bad.length}건: ${bad.map((s) => s.tag).join(", ")}`,
    );
    code = bad.length === 0 ? 0 : 1;
  } finally {
    if (!args.keep) await rm(outDir, { recursive: true, force: true });
    else console.log(`묶은 쪽을 남겼어요: ${outDir}`);
  }
  return code;
}

// 결과를 다 찍은 뒤 스스로 끝낸다. 장면이 남긴 브라우저 · 타이머 · 끝나지 않는 약속이 과정을 붙잡지 못하게 한다.
main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(2);
  },
);
