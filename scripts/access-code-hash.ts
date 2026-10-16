// 가족 접근 코드의 ACCESS_CODE_HASH 값 만들기(H4, plan-p03b 파일별 값 10).
// 사용: pnpm access:hash — 요청자 터미널에서 돌린다(대화창 `!` 로 돌리면 출력이 대화에 남는다).
// 터미널이면 숨긴 입력을 두 번 받고(같아야 함), 아니면(파이프 · 시험) 표준 입력 첫 줄 하나를 쓴다.
// 표준 출력에는 ACCESS_CODE_HASH 값 한 줄만 낸다. 안내 · 오류는 표준 오류로. 코드는 어디에도 출력하지 않는다.
// 종료 코드: 0 성공, 1 규칙 위반 또는 두 입력 다름, 2 입력 없음.
// src/server/access/code.ts 는 server-only 라 tsx(Node)에서 읽히지 않으므로, 같은 규칙(src/core)과 같은 해시 호출을 쓴다.
import { realpathSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { hash } from "@node-rs/argon2";
import {
  ACCESS_CODE_MIN_LENGTH,
  encodeAccessCodeHash,
  isValidAccessCode,
} from "../src/core/access-token";

export const EXIT_OK = 0;
export const EXIT_RULE = 1;
export const EXIT_NO_INPUT = 2;

/** 숨긴 입력 한 줄(터미널). 입력한 글자를 화면에 되돌려 쓰지 않는다. */
function promptHidden(question: string): Promise<string | null> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stderr,
      terminal: true,
    });
    const output = rl as unknown as {
      _writeToOutput: (text: string) => void;
    };
    process.stderr.write(question);
    output._writeToOutput = () => {};
    let answered = false;
    rl.question("", (answer) => {
      answered = true;
      process.stderr.write("\n");
      rl.close();
      resolve(answer);
    });
    rl.on("close", () => {
      if (!answered) resolve(null);
    });
  });
}

/** 파이프 입력의 첫 줄. 없으면 null. */
function readFirstLine(): Promise<string | null> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, terminal: false });
    let done = false;
    rl.once("line", (line) => {
      done = true;
      rl.close();
      resolve(line);
    });
    rl.once("close", () => {
      if (!done) resolve(null);
    });
  });
}

async function main(): Promise<number> {
  let code: string | null;
  if (process.stdin.isTTY) {
    code = await promptHidden("가족 접근 코드: ");
    if (code === null || code.trim() === "") {
      console.error("입력이 없습니다");
      return EXIT_NO_INPUT;
    }
    const again = await promptHidden("한 번 더: ");
    if (again === null || again.trim() !== code.trim()) {
      console.error("두 입력이 다릅니다");
      return EXIT_RULE;
    }
  } else {
    code = await readFirstLine();
  }
  code = code?.trim() ?? "";
  if (code === "") {
    console.error("입력이 없습니다");
    return EXIT_NO_INPUT;
  }
  if (!isValidAccessCode(code)) {
    console.error(
      `접근 코드는 영문 · 숫자 ${ACCESS_CODE_MIN_LENGTH}자 이상이어야 합니다`,
    );
    return EXIT_RULE;
  }
  process.stdout.write(`${encodeAccessCodeHash(await hash(code))}\n`);
  return EXIT_OK;
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
  main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
