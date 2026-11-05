// 회화 카드 · 회화 평가 장의 어른용 표(plan-p05b 보기 화면 '회화 카드' · '회화 평가 장' 행, 정할 것 파). 회화 카드는 새 꼴(C189 —
// 목표 · 오늘 쓸 말 · 짧은 준비 · 필수 질문 · 더 이야기할 거리 · 미션 · 역할 바꾸기)을 그대로 보인다(요청자 표본 읽기, H11).
// 회화 아이 화면은 1-나라 그리지 않는다. 어른용 글이라 작은 글자를 쓴다(4절 '부모용 정보').
import type { ReactNode } from "react";
import type { TalkLesson } from "@/core/seed/schema/lesson";
import type {
  Line,
  TalkGreetingQuestion,
  TalkMore,
  TalkRequired,
  TalkTestSheet,
} from "@/core/seed/schema/talk";
import type { TalkFirstForm } from "@/core/seed/structure";
import type { PictureNote } from "@/server/seed-viewer/files";

type NoteOf = (key: string) => PictureNote;

/** 1단계 처음 묻는 턴의 첫 꼴 이름(6.3). */
const FIRST_FORM_LABEL: Record<TalkFirstForm, string> = {
  plain: "그냥",
  choices: "선택지",
  introduce: "꺼내기",
};

/** 이름 · 값 한 줄. */
function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <tr className="border-t border-neutral-200 align-top">
      <th scope="row" className="w-40 py-2 pr-4 text-left font-semibold">
        {name}
      </th>
      <td className="py-2">{children}</td>
    </tr>
  );
}

function LineText({ line }: { line: Line }) {
  return (
    <span>
      <span lang="en">{line.en}</span>
      {line.ko ? <span className="text-neutral-600"> · {line.ko}</span> : null}
    </span>
  );
}

function List({ items }: { items: readonly ReactNode[] }) {
  const numbered = items.map((item, i) => ({ item, no: i + 1 }));
  return (
    <ol className="list-decimal pl-5">
      {numbered.map(({ item, no }) => (
        <li key={no}>{item}</li>
      ))}
    </ol>
  );
}

function PictureText({ note }: { note: PictureNote }) {
  return (
    <span>
      그림 {note.key ?? note.name}
      {note.license ? ` · ${note.license}` : ""}
      {note.attribution ? ` · ${note.attribution}` : ""}
      {note.exists ? "" : " · 파일 없음"}
    </span>
  );
}

/** 1~3단계 인사 질문 한 턴. */
function GreetingText({
  turn,
  noteOfKey,
}: {
  turn: TalkGreetingQuestion;
  noteOfKey: NoteOf;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-1">
      <span>
        <span lang="en" className="font-semibold">
          {turn.question.en}
        </span>
        <span className="text-neutral-600"> · {turn.question.ko}</span>
      </span>
      <span>힌트(뜻) {turn.hintKo}</span>
      {turn.frameEn ? <span lang="en">힌트(틀) {turn.frameEn}</span> : null}
      <span lang="en">힌트(문장) {turn.hintEn}</span>
      <span lang="en">답 예시 {turn.answerExample}</span>
      {turn.imageKey ? <PictureText note={noteOfKey(turn.imageKey)} /> : null}
    </div>
  );
}

/** 필수 질문 · 더 이야기할 거리 한 줄. */
function ItemText({
  item,
  noteOfKey,
}: {
  item: TalkRequired | TalkMore;
  noteOfKey: NoteOf;
}) {
  const required = "firstForm" in item || "choices" in item ? item : undefined;
  return (
    <div className="flex flex-col gap-0.5 py-1">
      <span>
        <span lang="en" className="font-semibold">
          {item.en}
        </span>
        {item.ko ? (
          <span className="text-neutral-600"> · {item.ko}</span>
        ) : null}
      </span>
      <span>
        노리는 단어 {item.targets.join(", ")} ·{" "}
        {item.ask === "first" ? "처음 묻는 질문" : "다시 묻는 질문"}
        {required?.firstForm
          ? ` · 첫 꼴 ${FIRST_FORM_LABEL[required.firstForm]}`
          : ""}
      </span>
      <span>
        목표 {item.goals.join(", ")}
        {item.demands ? ` · 요구 능력 ${item.demands.join(", ")}` : ""}
        {item.purpose ? ` · 상황 ${item.purpose}` : ""}
      </span>
      <span>힌트(뜻) {item.hintKo}</span>
      {item.hints.map((hint, i) => (
        <span key={hint} lang="en">
          힌트 {i + 1}단 {hint}
        </span>
      ))}
      <span lang="en">답 예시 {item.answerExample}</span>
      <span>
        쉬운 질문 <LineText line={item.easyQuestion} />
      </span>
      {required?.choices ? (
        <span lang="en">선택지 {required.choices.join(" / ")}</span>
      ) : null}
      {item.usablePhrases ? (
        <span lang="en">쓸 수 있는 말 {item.usablePhrases.join(" / ")}</span>
      ) : null}
      {item.imageKey ? <PictureText note={noteOfKey(item.imageKey)} /> : null}
    </div>
  );
}

/** 회화 수업 카드 표(어른용, 새 꼴). */
export function TalkCardTable({
  lesson,
  noteOfKey,
}: {
  lesson: TalkLesson;
  noteOfKey: NoteOf;
}) {
  const card = lesson.card;
  return (
    <table className="w-full text-sm" aria-label="회화 카드">
      <tbody>
        <Row name="주제">{card.topic}</Row>
        <Row name="학습 목표">
          {card.goals.join(", ")}
          {card.purpose ? ` · 상황 ${card.purpose}` : ""}
        </Row>
        <Row name="목표 표현">
          <List items={card.targetExpressions} />
        </Row>
        <Row name={`인사(${card.greetingTurns}턴)`}>
          {"questions" in card.greeting ? (
            <List
              items={card.greeting.questions.map((turn) => (
                <GreetingText
                  key={turn.question.en}
                  turn={turn}
                  noteOfKey={noteOfKey}
                />
              ))}
            />
          ) : (
            <span>
              첫 말 <LineText line={card.greeting.firstLine} />
            </span>
          )}
        </Row>
        <Row name="오늘 쓸 말">
          <List
            items={card.todayWords.map((word) => (
              <span key={word.word} className="flex flex-col gap-0.5">
                <span>
                  <span lang="en" className="font-semibold">
                    {word.word}
                  </span>{" "}
                  {word.meaningKo} · <span lang="en">{word.example}</span>
                </span>
                <span lang="en">들려줄 말 {word.modelLine}</span>
                {word.imageKey ? (
                  <PictureText note={noteOfKey(word.imageKey)} />
                ) : null}
              </span>
            ))}
          />
        </Row>
        <Row name="짧은 준비 낱말">
          {card.prep && card.prep.length > 0
            ? card.prep.join(", ")
            : "없음(앱이 고른다)"}
        </Row>
        <Row name={`필수 질문(${card.required.length})`}>
          <List
            items={card.required.map((item) => (
              <ItemText key={item.no} item={item} noteOfKey={noteOfKey} />
            ))}
          />
        </Row>
        <Row name={`더 이야기할 거리(${card.more.length})`}>
          <List
            items={card.more.map((item) => (
              <ItemText key={item.no} item={item} noteOfKey={noteOfKey} />
            ))}
          />
        </Row>
        <Row name="예상 흐름">
          <List items={card.flow} />
        </Row>
        <Row name="오늘 이야기 목록">
          <List items={card.todayTopicsKo} />
        </Row>
        {card.missions ? (
          <Row name="미션">
            <List
              items={card.missions.map((mission) => (
                <span key={mission.en}>
                  {mission.ko} · <span lang="en">{mission.en}</span> · 목표{" "}
                  {mission.goals.join(", ")}
                  {mission.demands
                    ? ` · 요구 능력 ${mission.demands.join(", ")}`
                    : ""}
                </span>
              ))}
            />
          </Row>
        ) : null}
        {card.roleSwap ? (
          <Row name="역할 바꾸기">
            <span lang="en">{card.roleSwap.firstLine}</span> · 힌트{" "}
            <span lang="en">{card.roleSwap.hint}</span> · 상황{" "}
            {card.roleSwap.purpose}
          </Row>
        ) : null}
        <Row name="정리">
          <List
            items={card.closingLines.map((line) => (
              <LineText key={line.en} line={line} />
            ))}
          />
        </Row>
        <Row name="끝맺음 조건">{card.endCondition}</Row>
        <Row name="끝인사">
          <LineText line={card.farewell} />
        </Row>
        <Row name="끝인사(안전 상한)">
          <LineText line={card.safetyFarewell} />
        </Row>
        <Row name="칭찬 대사">
          <List items={card.praiseLines} />
        </Row>
        <Row name="안전한 대사">
          <List
            items={card.safeLines.map((line) => (
              <LineText key={line.en} line={line} />
            ))}
          />
        </Row>
      </tbody>
    </table>
  );
}

/** 회화 평가 카드 장 표(어른용). */
export function TalkSheetTable({ sheet }: { sheet: TalkTestSheet }) {
  const numbered = sheet.turns.map((turn, i) => ({ turn, no: i + 1 }));
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p>
        첫 말 <LineText line={sheet.firstLine} />
      </p>
      <table className="w-full" aria-label="회화 평가 장">
        <thead>
          <tr className="text-left">
            <th className="py-1 pr-2">턴</th>
            <th className="py-1 pr-2">토리 질문</th>
            <th className="py-1 pr-2">허용 답(틀 자리 품사)</th>
            <th className="py-1 pr-2">아이가 할 말 뜻</th>
            <th className="py-1 pr-2">영어 틀</th>
            <th className="py-1 pr-2">영어 문장</th>
            <th className="py-1">연결 단원</th>
          </tr>
        </thead>
        <tbody>
          {numbered.map(({ turn, no }) => (
            <tr key={no} className="border-t border-neutral-200 align-top">
              <td className="py-1 pr-2">{no}</td>
              <td className="py-1 pr-2">
                <span lang="en">{turn.question.en}</span>
                {turn.question.ko ? (
                  <span className="text-neutral-600">
                    {" "}
                    · {turn.question.ko}
                  </span>
                ) : null}
              </td>
              <td className="py-1 pr-2">
                <List
                  items={turn.allowed.map((answer) => (
                    <span key={answer.text} lang="en">
                      {answer.text}
                      {answer.slotPos ? ` (${answer.slotPos})` : ""}
                    </span>
                  ))}
                />
              </td>
              <td className="py-1 pr-2">{turn.childKo}</td>
              <td className="py-1 pr-2" lang="en">
                {turn.frameEn}
              </td>
              <td className="py-1 pr-2" lang="en">
                {turn.sentenceEn}
              </td>
              <td className="py-1">단원 {turn.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
