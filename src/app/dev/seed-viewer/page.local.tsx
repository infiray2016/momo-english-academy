// 시드 보기 화면(11절 (2-1), AC-7f, plan-p05b '보기 화면'). 로컬 next dev 에서만 경로가 된다(next.config 의 local.tsx,
// 정할 것 아) — 프리뷰 · 운영 · 로컬 next build 에서는 빠지고, 첫 문장이 NODE_ENV 를 한 번 더 본다(두 겹).
// 주소: /dev/seed-viewer(목록) · ?file=<내용 파일 경로>(파일) · &cell=<칸 키>(칸). 읽기만 한다(표본 검토 · 사람 확인 쓰기는 P5c).
// 접근 확인은 proxy 가 한다(/dev/* 도 쿠키, C57). 화면 글은 어른용이라 해요체 · 작은 글자다.
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import type { SeedContentPath } from "@/core/seed/structure";
import {
  assertSeedViewerLocal,
  type ContentFileEntry,
  type LoadedContentFile,
  listContentFiles,
  loadContentFile,
  pictureCatalog,
  seedViewerRoot,
} from "@/server/seed-viewer/files";
import { CellView, cellTitle, KIND_LABEL, STATUS_LABEL } from "./cell-view";

export const metadata: Metadata = {
  title: "시드 보기",
  robots: { index: false, follow: false },
};

const VIEWER_PATH = "/dev/seed-viewer";
const AREA_LABEL = {
  reading: "읽기",
  writing: "쓰기",
  speaking: "말하기",
  talk: "회화",
} as const;

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function fileHref(path: string): string {
  return `${VIEWER_PATH}?file=${encodeURIComponent(path)}`;
}
function cellHref(path: string, key: string): string {
  return `${fileHref(path)}&cell=${encodeURIComponent(key)}`;
}

/** 목록 묶음 이름(종류 · 영역). */
function groupOf(target: SeedContentPath): string {
  switch (target.kind) {
    case "lessons":
      return `수업 · ${AREA_LABEL[target.area]}`;
    case "level-tests":
      return `단계 평가 · ${AREA_LABEL[target.area]}`;
    case "placement":
      return "배치 평가";
    case "stories":
      return "토리 이야기";
  }
}

function describe(target: SeedContentPath): string {
  switch (target.kind) {
    case "lessons":
      return `${target.level}단계 · 단원 ${target.unit}`;
    case "level-tests":
      return `${target.level}단계`;
    case "placement":
      return AREA_LABEL[target.area];
    case "stories":
      return `${target.band} 구간`;
  }
}

function ValidateHint({ root }: { root: string }) {
  return (
    <p className="text-sm text-neutral-700">
      칸 검사(규격 · 정합 · 분포)는 터미널에서{" "}
      <code className="rounded bg-neutral-100 px-1">pnpm seed:validate</code> 로
      봐요. 이 화면은 읽기만 해요. 시드 뿌리:{" "}
      <code className="break-all">{root}</code>
    </p>
  );
}

function FileList({ root }: { root: string }) {
  const entries = listContentFiles(root);
  if (entries === null) {
    return <p>시드 뿌리 폴더가 없어요: {root}</p>;
  }
  if (entries.length === 0) {
    return <p>내용 파일이 아직 없어요.</p>;
  }
  const groups = new Map<string, ContentFileEntry[]>();
  for (const entry of entries) {
    const name = groupOf(entry.target);
    groups.set(name, [...(groups.get(name) ?? []), entry]);
  }
  return (
    <div className="flex flex-col gap-6">
      {[...groups.entries()].map(([name, group]) => (
        <section key={name} aria-label={name} className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">{name}</h2>
          <ul className="flex flex-col gap-1">
            {group.map((entry) => (
              <li key={entry.path} className="flex gap-3">
                <Link
                  href={fileHref(entry.path)}
                  className="font-mono text-blue-800 underline"
                >
                  {entry.path}
                </Link>
                <span className="text-sm text-neutral-600">
                  {describe(entry.target)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function FileErrors({ loaded }: { loaded: LoadedContentFile }) {
  return (
    <section aria-label="파일 오류" className="flex flex-col gap-1 text-sm">
      <p>규격 파일 오류 {loaded.referenceErrors}개</p>
      {loaded.errors.length === 0 ? (
        <p>이 파일의 규격 · 배치 오류는 없어요</p>
      ) : (
        <ul className="list-disc pl-5 text-red-800">
          {loaded.errors.map((error) => (
            <li
              key={`${error.file}-${error.rule}-${error.cell}-${error.path}-${error.message}`}
            >
              [{error.rule}] {error.file} {error.cell ?? ""} {error.path} ·{" "}
              {error.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FileView({ loaded }: { loaded: LoadedContentFile }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="break-all text-2xl font-bold">{loaded.path}</h1>
      {loaded.exists ? null : <p>파일이 없어요.</p>}
      <FileErrors loaded={loaded} />
      <table className="w-full text-sm" aria-label="칸 목록">
        <thead>
          <tr className="text-left">
            <th className="py-1 pr-2">칸 키</th>
            <th className="py-1 pr-2">종류</th>
            <th className="py-1 pr-2">제목 · 유형</th>
            <th className="py-1 pr-2">풀이 검사</th>
            <th className="py-1">표본 검토</th>
          </tr>
        </thead>
        <tbody>
          {loaded.cells.map((cell) => (
            <tr key={cell.key} className="border-t border-neutral-200">
              <td className="py-1 pr-2">
                <Link
                  href={cellHref(loaded.path, cell.key)}
                  className="font-mono text-blue-800 underline"
                >
                  {cell.key}
                </Link>
              </td>
              <td className="py-1 pr-2">
                {KIND_LABEL[cell.kind]}
                {cell.broken ? " · 규격 깨짐" : ""}
              </td>
              <td className="py-1 pr-2">{cellTitle(cell)}</td>
              <td className="py-1 pr-2">{STATUS_LABEL[cell.status]}</td>
              <td className="py-1">{cell.reviews.length}행</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Breadcrumb({ path }: { path?: string }) {
  return (
    <nav aria-label="시드 보기 길" className="flex gap-3 text-sm">
      <Link href={VIEWER_PATH} className="text-blue-800 underline">
        목록
      </Link>
      {path ? (
        <Link href={fileHref(path)} className="text-blue-800 underline">
          파일
        </Link>
      ) : null}
    </nav>
  );
}

export default async function SeedViewerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  assertSeedViewerLocal();
  const params = await searchParams;
  const file = single(params.file);
  const cellKey = single(params.cell);
  const root = seedViewerRoot();

  let body: ReactNode;
  if (file === undefined) {
    body = (
      <>
        <h1 className="text-2xl font-bold">시드 보기</h1>
        <FileList root={root} />
      </>
    );
  } else {
    const loaded = loadContentFile(root, file);
    if (loaded === null) {
      body = (
        <>
          <Breadcrumb />
          <p>시드 파일 배치에 없는 내용 파일이에요: {file}</p>
        </>
      );
    } else if (cellKey === undefined) {
      body = (
        <>
          <Breadcrumb />
          <FileView loaded={loaded} />
        </>
      );
    } else {
      const cell = loaded.cells.find((c) => c.key === cellKey);
      body = (
        <>
          <Breadcrumb path={loaded.path} />
          {cell ? (
            <CellView
              cell={cell}
              catalog={pictureCatalog(loaded.index)}
              index={loaded.index}
            />
          ) : (
            <p>이 파일에 그런 칸이 없어요: {cellKey}</p>
          )}
        </>
      );
    }
  }

  return (
    <main
      lang="ko"
      className="mx-auto flex min-h-dvh w-full max-w-[880px] flex-col gap-6 px-6 py-8 text-neutral-900"
    >
      <ValidateHint root={root} />
      {body}
    </main>
  );
}
