// 학습일 순수 함수(3.1 · NFR-7 · AC-N7, plan-p03a 파일별 값 6).
// 학습일은 app.timezone 기준 app.day_start_hour 시에 바뀐다. 시각과 두 설정값은 부르는 쪽이 넘긴다.
// 현재 시각을 읽지 않고 DB · Next · React 를 가져오지 않는다(의존 규칙 core-no-framework).

/** 하루의 시 수(시각 범위 0 ~ 23 의 끝, 단위 값). */
const HOURS_PER_DAY = 24;

const formatters = new Map<string, Intl.DateTimeFormat>();

/** 시간대별 형식기를 만들어 다시 쓴다. 틀린 시간대면 Intl 이 RangeError 를 던진다. */
function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/**
 * 그 순간의 학습일('YYYY-MM-DD').
 * 그 시간대 벽시계의 날짜와 시를 읽고, 시가 dayStartHour 보다 작으면 달력 날짜에서 하루를 뺀다.
 * 순간에서 시간을 빼고 형식화하는 꼴보다 일광 절약 시간에도 맞다.
 */
export function learningDayOf(
  instant: Date,
  timeZone: string,
  dayStartHour: number,
): string {
  if (
    !Number.isInteger(dayStartHour) ||
    dayStartHour < 0 ||
    dayStartHour >= HOURS_PER_DAY
  ) {
    throw new RangeError(
      `dayStartHour 는 0 이상 ${HOURS_PER_DAY} 미만 정수여야 합니다: ${dayStartHour}`,
    );
  }
  const parts = formatterFor(timeZone).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((p) => p.type === type)?.value;
    if (value === undefined) {
      throw new RangeError(`시각을 읽지 못했습니다(${type})`);
    }
    return Number(value);
  };
  const year = part("year");
  const month = part("month");
  const day = part("day");
  const hour = part("hour");
  const shift = hour < dayStartHour ? 1 : 0;
  return new Date(Date.UTC(year, month - 1, day - shift))
    .toISOString()
    .slice(0, 10);
}
