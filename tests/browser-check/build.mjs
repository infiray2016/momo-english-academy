// 실제 화면 조각을 esbuild 로 묶어 브라우저에서 바로 여는 쪽(pages/<쪽>/index.html + bundle.js)을 만든다.
// 조각이 기대는 무거운 조각(말풍선 · 판 · 공용 꼴)은 stubs/ 의 대역으로 바꾸고, 나머지 '@/…' 는 저장소의 src/ 에서 그대로 가져온다.
// 바꿔 끼우기(swaps): 조각 하나를 다른 파일(예: git show 로 뽑은 옛 판)로 바꿔 묶는다. 작업 트리의 src/ 는 건드리지 않는다.
import { existsSync, realpathSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const HERE = fileURLToPath(new URL(".", import.meta.url));
const STUBS = join(HERE, "stubs");

/** 쪽 목록: 진입 조각 · 쪽 HTML · 대역 조각('@/…' 경로 → stubs/ 안의 파일). 새 쪽은 여기에 한 줄을 더한다. */
export const PAGES = {
  "talk-log": {
    dir: join(HERE, "pages", "talk-log"),
    stubs: {
      "@/components/conversation/child-turn": "child-turn.tsx",
      "@/components/conversation/tori": "tori.ts",
      "@/components/activities/common": "common.ts",
      "@/components/board/board": "board.ts",
    },
  },
  // 수업 화면의 배치(S5 fix 7): 실제 조각(아이 화면 한 장 · 위 띠 · 선생님 창 · 기록 칸 · 말풍선 · 아이 차례 · 정리)과 앱의 실제 스타일(Tailwind)
  "talk-lesson": {
    dir: join(HERE, "pages", "talk-lesson"),
    tailwind: true,
    stubs: {
      "next/image": "next-image.tsx",
      "next/link": "next-link.tsx",
      "client-only": "empty.ts",
      "@/server/actions/conversation": "server-conversation.ts",
    },
  },
  // 이야기 방식 화면(회화 대화 구조 R 묶음 W): 실제 수업 틀(talk-frame)과 실제 스타일 — 서버 액션 · 턴 요청 · 음성만 쪽 안의 가짜
  "talk-chat": {
    dir: join(HERE, "pages", "talk-chat"),
    tailwind: true,
    stubs: {
      "next/image": "next-image.tsx",
      "next/link": "next-link.tsx",
      "next/navigation": "next-navigation.ts",
      "client-only": "empty.ts",
      "@/server/actions/conversation": "chat-actions.ts",
      "@/server/actions/session": "chat-actions.ts",
      "@/server/actions/teacher": "chat-actions.ts",
    },
  },
};

/** 워크트리의 node_modules 에서 @tailwindcss/node · @tailwindcss/oxide 를 찾는다(@tailwindcss/turbopack 이 가진 것 — 새 의존을 더하지 않는다). */
function loadTailwind() {
  const at = join(ROOT, "node_modules", "@tailwindcss", "turbopack");
  if (!existsSync(at))
    throw new Error(
      "워크트리의 node_modules 에 @tailwindcss/turbopack 이 없어요",
    );
  const req = createRequire(realpathSync(join(at, "package.json")));
  return { node: req("@tailwindcss/node"), oxide: req("@tailwindcss/oxide") };
}

/**
 * 앱의 실제 스타일(src/app/globals.css)을 src/ 와 쪽 폴더의 클래스로 묶는다. 글꼴은 next/font 가 만든 것이라 globals.css 에 없다 — 마지막 빌드
 * (.next/static)의 @font-face · 글꼴 변수를 가져오고, 없으면 대체 글꼴로 둔다(돌려준 글이 그 사실을 알린다).
 */
async function buildTailwind(pageDir, outDir) {
  const { node, oxide } = loadTailwind();
  const appDir = join(ROOT, "src", "app");
  const css = await readFile(join(appDir, "globals.css"), "utf8");
  const compiler = await node.compile(css, {
    base: appDir,
    onDependency() {},
  });
  const scanner = new oxide.Scanner({
    sources: [
      { base: join(ROOT, "src"), pattern: "**/*", negated: false },
      { base: pageDir, pattern: "**/*", negated: false },
    ],
  });
  await writeFile(join(outDir, "app.css"), compiler.build(scanner.scan()));
  const chunks = join(ROOT, ".next", "static", "chunks");
  let fonts = "";
  if (existsSync(chunks)) {
    for (const f of await readdir(chunks)) {
      if (!f.endsWith(".css")) continue;
      const text = await readFile(join(chunks, f), "utf8");
      if (!text.includes("--font-jua")) continue;
      const media = pathToFileURL(join(ROOT, ".next", "static", "media")).href;
      const faces = (text.match(/@font-face\{[^}]*\}/g) ?? []).map((r) =>
        r.replaceAll("url(../media/", `url(${media}/`),
      );
      const vars = (text.match(/\{--font-(?:jua|gowun|fredoka):[^}]*\}/g) ?? [])
        .map((r) => `:root${r}`)
        .join("\n");
      fonts = `${faces.join("\n")}\n${vars}\n`;
      break;
    }
  }
  await writeFile(join(outDir, "fonts.css"), fonts);
  return fonts
    ? "글꼴: 마지막 빌드(.next/static)의 Jua · Gowun Dodum · Fredoka"
    : "글꼴: 빌드한 글꼴이 없어 대체 글꼴(글줄 너비가 실제와 다를 수 있음)";
}

/** 워크트리의 node_modules 에서 esbuild 를 찾는다(직접 의존이 아니면 tsx · vite 가 가진 것). 새 의존을 더하지 않는다. */
function loadEsbuild() {
  const rootRequire = createRequire(join(ROOT, "package.json"));
  for (const via of [null, "tsx", "vite"]) {
    try {
      const req = via
        ? createRequire(rootRequire.resolve(`${via}/package.json`))
        : rootRequire;
      return req("esbuild");
    } catch {
      // 다음 길로
    }
  }
  throw new Error("워크트리의 node_modules 에서 esbuild 를 찾지 못했어요");
}

/**
 * 쪽 하나를 outDir 에 묶는다.
 * @param {string} name PAGES 의 이름
 * @param {{ outDir: string, swaps?: Array<{ from: string, to: string }> }} options
 *   swaps 의 from 은 저장소 안의 조각 경로(절대 경로), to 는 그 자리에 묶을 파일(절대 경로)
 * @returns {Promise<string>} 묶은 쪽의 index.html 경로
 */
export async function buildPage(name, { outDir, swaps = [] }) {
  const page = PAGES[name];
  if (!page) throw new Error(`없는 쪽이에요: ${name}`);
  const esbuild = loadEsbuild();
  const swapOf = new Map(swaps.map((s) => [s.from, s.to]));
  const originOf = new Map(swaps.map((s) => [s.to, s.from]));
  const used = new Set();
  const pick = (r) => {
    const to = swapOf.get(r.path);
    if (to) {
      used.add(r.path);
      return { path: to };
    }
    return {
      path: r.path,
      external: r.external,
      namespace: r.namespace,
      sideEffects: r.sideEffects,
    };
  };
  const dir = join(outDir, name);
  await mkdir(dir, { recursive: true });
  await esbuild.build({
    entryPoints: [join(page.dir, "entry.tsx")],
    bundle: true,
    outfile: join(dir, "bundle.js"),
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    nodePaths: [join(ROOT, "node_modules")],
    plugins: [
      {
        name: "browser-check-alias",
        setup(build) {
          // '@/…' 밖의 꾸러미(next/image · next/link · client-only)도 대역 표에 있으면 바꾼다
          build.onResolve({ filter: /^(next\/|client-only$)/ }, (args) => {
            const stub = page.stubs[args.path];
            return stub ? { path: join(STUBS, stub) } : undefined;
          });
          build.onResolve({ filter: /^@\// }, async (args) => {
            const stub = page.stubs[args.path];
            if (stub) return { path: join(STUBS, stub) };
            const r = await build.resolve(`./${args.path.slice(2)}`, {
              resolveDir: join(ROOT, "src"),
              kind: args.kind,
              pluginData: { plain: true },
            });
            if (r.errors.length > 0) return { errors: r.errors };
            return pick(r);
          });
          if (swaps.length === 0) return;
          // 바꿔 끼운 파일의 상대 경로는 원래 자리를 기준으로 풀고, src 안의 상대 경로가 바꿀 조각을 가리키면 바꿔 끼운다
          build.onResolve({ filter: /^\.\.?\// }, async (args) => {
            if (args.pluginData?.plain) return undefined;
            const origin = originOf.get(args.importer);
            const r = await build.resolve(args.path, {
              resolveDir: origin ? dirname(origin) : args.resolveDir,
              kind: args.kind,
              pluginData: { plain: true },
            });
            if (r.errors.length > 0) return { errors: r.errors };
            return pick(r);
          });
        },
      },
    ],
    logLevel: "warning",
  });
  const unused = swaps.filter((s) => !used.has(s.from));
  if (unused.length > 0) {
    throw new Error(
      `바꿔 끼울 조각을 묶음에서 만나지 못했어요(쪽 ${name}): ${unused.map((s) => s.from).join(", ")}`,
    );
  }
  await copyFile(join(page.dir, "index.html"), join(dir, "index.html"));
  if (page.tailwind)
    console.log(`쪽 ${name} · ${await buildTailwind(page.dir, dir)}`);
  return join(dir, "index.html");
}

/** '조각 경로=파일 경로' 꼴을 절대 경로 둘로 푼다. 조각 경로는 저장소 뿌리, 파일 경로는 명령을 친 자리 기준이다. */
export function parseSwap(text, cwd) {
  const at = text.indexOf("=");
  if (at <= 0 || at === text.length - 1) {
    throw new Error(
      `--swap 은 '조각 경로=파일 경로' 꼴이에요(예: src/components/conversation/talk-log.tsx=/tmp/old/talk-log.tsx): ${text}`,
    );
  }
  const real = (p) => {
    if (!existsSync(p)) throw new Error(`--swap 의 파일이 없어요: ${p}`);
    return realpathSync(p);
  };
  return {
    from: real(resolve(ROOT, text.slice(0, at))),
    to: real(resolve(cwd, text.slice(at + 1))),
  };
}
