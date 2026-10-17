// 회화 카드 · 회화 평가 장의 어른용 표(plan-p05b 보기 화면 '회화 카드' · '회화 평가 장' 행, 정할 것 파).
// 회화 아이 화면은 1-나라 그리지 않는다. 어른용 글이라 작은 글자를 쓴다(4절 '부모용 정보').
import type { ReactNode } from "react";
import type { TalkLesson } from "@/core/seed/schema/lesson";
import type {
  GreetingTurn,
  Line,
  QuestionCard,
  TalkTestSheet,
  TurnCard,
} from "@/core/seed/schema/talk";
import type { PictureNote } from "@/server/seed-viewer/files";

type NoteOf = (key: string) => PictureNote;

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

/** 1~3단계 인사 질문 · 대화 턴 · 더 이야기할 거리 한 턴. */
function TurnText({
  turn,
  noteOfKey,
}: {
  turn: GreetingTurn | TurnCard;
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
      {"targets" in turn ? (
        <span>
          노리는 단어 {turn.targets.join(", ")} ·{" "}
          {turn.ask === "first" ? "처음 묻는 턴" : "다시 묻는 턴"}
        </span>
      ) : null}
      <span>힌트(뜻) {turn.hintKo}</span>
      {turn.frameEn ? <span lang="en">힌트(틀) {turn.frameEn}</span> : null}
      <span lang="en">힌트(문장) {turn.hintEn}</span>
      <span lang="en">답 예시 {turn.answerExample}</span>
      {turn.twoAnswers ? (
        <span lang="en">답 두 개 {turn.twoAnswers.join(" / ")}</span>
      ) : null}
      {turn.imageKey ? <PictureText note={noteOfKey(turn.imageKey)} /> : null}
    </div>
  );
}

/** 4단계부터 카드 질문 목록 한 줄. */
function QuestionText({ question }: { question: QuestionCard }) {
  return (
    <div className="flex flex-col gap-0.5 py-1">
      <span>
        <span lang="en" className="font-semibold">
          {question.en}
        </span>
        <span className="text-neutral-600"> · {question.ko}</span>
      </span>
      <span>노리는 단어 {question.targets.join(", ")}</span>
      <span>힌트(뜻) {question.hintKo}</span>
      {question.hintTiers.map((tier, i) => (
        <span key={tier} lang="en">
          힌트 {i + 1}단 {tier}
        </span>
      ))}
      {question.usablePhrases ? (
        <span lang="en">
          쓸 수 있는 말 {question.usablePhrases.join(" / ")}
        </span>
      ) : null}
      <span lang="en">답 예시 {question.answerExample}</span>
    </div>
  );
}

/** 회화 수업 카드 표(어른용). */
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
        <Row name="목표 표현">
          <List items={card.targetExpressions} />
        </Row>
        <Row name={`인사(${card.greetingTurns}턴)`}>
          {"questions" in card.greeting ? (
            <List
              items={card.greeting.questions.map((turn) => (
                <TurnText
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
              <span key={word.word}>
                <span lang="en" className="font-semibold">
                  {word.word}
                </span>{" "}
                {word.meaningKo} · <span lang="en">{word.example}</span>
                {word.exampleKo ? ` · ${word.exampleKo}` : ""}
              </span>
            ))}
          />
        </Row>
        <Row name="대화 첫 질문">
          <span lang="en">{card.firstQuestion}</span>
        </Row>
        <Row name="예상 흐름">
          <List items={card.flow} />
        </Row>
        <Row name="오늘 이야기 목록">
          <List items={card.todayTopicsKo} />
        </Row>
        {card.turns ? (
          <Row name={`대화 턴(${card.turns.length})`}>
            <List
              items={card.turns.map((turn) => (
                <TurnText
                  key={`${turn.question.en}-${turn.targets.join(",")}`}
                  turn={turn}
                  noteOfKey={noteOfKey}
                />
              ))}
            />
          </Row>
        ) : null}
        {card.questions ? (
          <Row name={`질문 목록(${card.questions.length})`}>
            <List
              items={card.questions.map((question) => (
                <QuestionText key={question.en} question={question} />
              ))}
            />
          </Row>
        ) : null}
        {card.moreTalk ? (
          <Row name={`더 이야기할 거리(${card.moreTalk.length})`}>
            <List
              items={card.moreTalk.map((turn) => (
                <TurnText
                  key={`${turn.question.en}-${turn.targets.join(",")}`}
                  turn={turn}
                  noteOfKey={noteOfKey}
                />
              ))}
            />
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
        {card.missions ? (
          <Row name="미션">
            <List
              items={card.missions.map((mission) => (
                <span key={mission.en}>
                  {mission.ko} · <span lang="en">{mission.en}</span>
                </span>
              ))}
            />
          </Row>
        ) : null}
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
