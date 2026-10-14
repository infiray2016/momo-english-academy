#!/usr/bin/env python3
"""볼트 기록 강제 · 확인 스크립트.

모드
  --start   SessionStart(새 세션 · /clear · 압축 뒤): 운영 규칙 요약 · 이어하기.md · 빚을 컨텍스트로 낸다
  --prompt  UserPromptSubmit: 턴 시작 시각을 기록한다(차단 횟수 초기화)
  --stop    Stop: 이번 턴의 변경이 기록되지 않았으면 차단한다(JSON decision=block). 마지막 답을 상태에 남긴다
  --end     SessionEnd(/clear · 종료): 이어하기.md 의 자동 기록 절을 다시 쓰고, 오늘 일지가 없으면 빚(debt)을 남긴다
  --report  사람이 보는 상태표
  --lint    볼트 링크 · 고아 · sources 검사(--fix 면 문서-관계 교차표를 다시 만든다)
규칙 원문: 볼트 위키/방법론/지식저장소-운영.md
"""
import json, os, re, subprocess, sys, time, glob
from datetime import datetime, date

REPO = os.environ.get("CLAUDE_PROJECT_DIR") or os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VAULT = os.environ.get("MOMO_VAULT") or os.path.expanduser(
    "~/Library/Mobile Documents/iCloud~md~obsidian/Documents/infiray/90_AI/프로젝트/momo-english-academy")
STATE = os.path.join(REPO, ".claude", "state")
TURN = os.path.join(STATE, "turn.json")
DEBT = os.path.join(STATE, "debt.json")
MAX_BLOCKS = 2          # 한 턴에서 최대 차단 횟수(무한 루프 방지)
GRACE = 30              # 턴 시작 뒤 이 초 안에 끝난 턴은 검사하지 않는다(짧은 문답)
LOG = os.path.join(VAULT, "log.md")
HANDOFF = os.path.join(VAULT, "이어하기.md")
LAST = os.path.join(STATE, "last_turn.json")
JOURNAL = os.path.join(VAULT, "일지")
CONTENT_DIRS = ["원자료", "위키", "그림", "일지"]

def _read_stdin():
    try:
        raw = sys.stdin.read()
        return json.loads(raw) if raw.strip() else {}
    except Exception:
        return {}

def _load(p, default):
    try:
        with open(p, encoding="utf-8") as f: return json.load(f)
    except Exception:
        return default

def _save(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f: json.dump(obj, f, ensure_ascii=False, indent=1)

def _mtime(p):
    try: return os.path.getmtime(p)
    except OSError: return 0.0

def _git(*args):
    try:
        return subprocess.run(["git", *args], cwd=REPO, capture_output=True, text=True, timeout=20).stdout
    except Exception:
        return ""

def repo_changed_since(ts):
    """턴 시작 뒤 바뀐 저장소 파일(추적 · 미추적)과 커밋 수."""
    files = []
    for line in _git("status", "--porcelain", "--untracked-files=all").splitlines():
        path = line[3:].strip().strip('"')
        if path.startswith(".claude/state/"): continue
        full = os.path.join(REPO, path)
        if _mtime(full) >= ts: files.append(path)
    commits = _git("log", f"--since=@{int(ts)}", "--pretty=%h %s").strip().splitlines()
    return files, commits

def vault_changed_since(ts):
    out = []
    for d in CONTENT_DIRS:
        for p in glob.glob(os.path.join(VAULT, d, "**", "*.md"), recursive=True):
            if _mtime(p) >= ts: out.append(os.path.relpath(p, VAULT))
    return out

def today_journal():
    return os.path.join(JOURNAL, f"{date.today().isoformat()}.md")

# ───────────────────────── 모드
def mode_prompt(inp):
    """턴 시작. 직전 턴이 끝나지(Stop 통과) 않은 채 들어온 중간 메시지면 턴을 합친다."""
    st = _load(TURN, {})
    prev = st.get("turn_start"); last_stop = st.get("last_stop_at", 0)
    if prev and last_stop < prev:
        st["session_id"] = inp.get("session_id")          # 같은 턴이 이어진다
    else:
        st.update({"session_id": inp.get("session_id"), "turn_start": time.time(), "blocks": 0})
    prompt = (inp.get("prompt") or "").strip()
    if prompt:
        st.setdefault("prompts", []).append({"at": time.time(), "text": prompt[:600]})
        st["prompts"] = st["prompts"][-5:]
    _save(TURN, st)

def mode_stop(inp):
    st = _load(TURN, {})
    ts = st.get("turn_start") or (time.time() - 3600)
    last_msg = (inp.get("last_assistant_message") or "").strip()
    if last_msg:
        _save(LAST, {"at": time.time(), "last_assistant_message": last_msg[:2000],
                     "last_prompt": (st.get("prompts") or [{}])[-1].get("text", "")})
    def _pass():
        st["last_stop_at"] = time.time(); _save(TURN, st)
    if time.time() - ts < GRACE:
        return _pass()                              # 짧은 문답은 검사하지 않는다
    repo_files, commits = repo_changed_since(ts)
    vault_files = vault_changed_since(ts)
    log_ok = _mtime(LOG) >= ts
    content_vault = [f for f in vault_files if not f.startswith("일지")]
    need = []
    if (repo_files or commits or content_vault) and not log_ok:
        need.append("볼트 log.md 에 이번 턴의 ingest · lint 한 줄을 적는다")
    if (repo_files or commits) and not content_vault:
        need.append("저장소가 바뀌었는데 볼트 원자료 · 위키가 그대로다. 결정 · 지시 · 검토 보고 · 산출물 판본을 원자료에 넣고 닿는 위키 쪽을 고친다")
    if commits and _mtime(today_journal()) < ts:
        need.append(f"커밋한 턴이다. 오늘 일지 일지/{date.today().isoformat()}.md 에 한 일 · 결정 · 막힌 것을 더한다")
    if (repo_files or commits or content_vault) and _mtime(HANDOFF) < ts:
        need.append("볼트 이어하기.md 의 '지금 하던 것' · '다음 한 걸음' · '열린 질문'을 이번 턴 기준으로 고친다(세션이 끊겨도 다음 세션이 이어 가도록)")
    debt = _load(DEBT, None)
    if debt and _mtime(os.path.join(JOURNAL, f"{debt['date']}.md")) < ts and debt.get("date") != date.today().isoformat():
        need.append(f"지난 세션 빚: {debt['date']} 일지가 없다. 먼저 쓴다({debt.get('reason','')})")
    elif debt and os.path.exists(os.path.join(JOURNAL, f"{debt['date']}.md")) and _mtime(os.path.join(JOURNAL, f"{debt['date']}.md")) >= ts:
        try: os.remove(DEBT)
        except OSError: pass
    if not need:
        return _pass()
    blocks = int(st.get("blocks", 0))
    detail = []
    if repo_files: detail.append("저장소 변경 " + ", ".join(repo_files[:8]) + (" …" if len(repo_files) > 8 else ""))
    if commits: detail.append("커밋 " + "; ".join(commits[:3]))
    if content_vault: detail.append("볼트 변경 " + ", ".join(content_vault[:6]))
    reason = ("[볼트 기록 검사] 아직 끝낼 수 없다. " + " / ".join(need)
              + ". 근거: " + (" | ".join(detail) or "없음")
              + ". 규칙은 볼트 위키/방법론/지식저장소-운영.md, 절차는 /vault-ingest · /journal. 끝내면 다시 멈춰도 된다.")
    if blocks >= MAX_BLOCKS:
        print(f"[볼트 기록 검사] 경고(차단 한도 {MAX_BLOCKS}회 초과, 미처리): " + " / ".join(need), file=sys.stderr)
        return _pass()
    st["blocks"] = blocks + 1; _save(TURN, st)
    print(json.dumps({"decision": "block", "reason": reason}, ensure_ascii=False))

def _write_auto_handoff(inp):
    st = _load(TURN, {}); last = _load(LAST, {})
    ts = st.get("session_start") or (time.time() - 8 * 3600)
    repo_files, commits = repo_changed_since(ts)
    vault_files = vault_changed_since(ts)
    status = _git("status", "--porcelain").rstrip("\n").splitlines()
    head = _git("log", "-3", "--pretty=%h %s").strip().splitlines()
    prompts = st.get("prompts") or []
    when = datetime.now().strftime("%Y-%m-%d %H:%M")
    rows = [("세션 끝", f"{when} · 이유 {inp.get('reason') or inp.get('hook_event_name') or '-'}"),
            ("마지막 지시", (prompts[-1].get("text") if prompts else last.get("last_prompt") or "-").replace("\n", " ")[:300]),
            ("마지막 답 요지", (last.get("last_assistant_message") or "-").replace("\n", " ")[:600]),
            ("이 세션의 커밋", "; ".join(commits[:5]) or "없음"),
            ("저장소 미커밋 변경", ", ".join(l[3:].strip() for l in status[:10]) or "없음"),
            ("HEAD", "; ".join(head) or "-"),
            ("이 세션에 바뀐 볼트 파일", ", ".join(vault_files[:12]) + (" …" if len(vault_files) > 12 else "") or "없음")]
    auto = "## 자동 기록 (훅이 세션 끝에 씀)\n\n| 항목 | 값 |\n|---|---|\n" + "\n".join(f"| {k} | {str(v).replace('|', '/')} |" for k, v in rows) + "\n"
    if os.path.exists(HANDOFF):
        body = open(HANDOFF, encoding="utf-8").read()
        i = body.find("## 자동 기록")
        body = (body[:i] if i >= 0 else body.rstrip("\n") + "\n\n") + auto
    else:
        body = ("---\ntype: handoff\nkind: 이어하기\nproject: momo-english-academy\nupdated: " + date.today().isoformat()
                + "\nstatus: current\ntags: [프로젝트/momo-english-academy, 이어하기]\n---\n\n# 이어하기\n\n## 지금 하던 것\n\n- (Claude 가 턴마다 갱신)\n\n## 다음 한 걸음\n\n1. -\n\n## 열린 질문 · 결정 대기\n\n- -\n\n" + auto)
    body = re.sub(r"^updated: .*$", "updated: " + date.today().isoformat(), body, count=1, flags=re.M)
    with open(HANDOFF, "w", encoding="utf-8") as f: f.write(body)

def mode_end(inp):
    try: _write_auto_handoff(inp)
    except Exception as e: print(f"handoff 기록 실패: {e}", file=sys.stderr)
    st = _load(TURN, {})
    ts = st.get("session_start") or st.get("turn_start") or (time.time() - 8 * 3600)
    repo_files, commits = repo_changed_since(ts)
    vault_files = vault_changed_since(ts)
    j = today_journal()
    if (repo_files or commits or vault_files) and _mtime(j) < ts:
        _save(DEBT, {"date": date.today().isoformat(), "reason": "세션에 변경이 있었는데 일지를 쓰지 않음", "at": time.time()})

def mode_start(inp):
    st = _load(TURN, {}); st["session_start"] = time.time(); st["blocks"] = 0; _save(TURN, st)
    lines = ["[볼트 기록 규칙] 결정 · 지시 · 검토 보고 · 조사 · 산출물 판본은 그 턴에 볼트 원자료에 넣고, 닿는 위키 쪽 · index · log 를 같은 턴에 고친다. "
             "커밋한 턴에는 일지(일지/YYYY-MM-DD.md)도 더한다. Stop 훅이 검사해 안 됐으면 턴을 끝내지 못한다. "
             "절차: /vault-ingest · /vault-lint · /journal. 상태표: python3 .claude/hooks/vault_check.py --report"]
    debt = _load(DEBT, None)
    if debt:
        lines.append(f"[볼트 빚] {debt['date']} 일지가 없다({debt.get('reason','')}). 이 세션 첫 턴에서 먼저 쓴다.")
    if os.path.exists(HANDOFF):
        body = open(HANDOFF, encoding="utf-8").read()
        body = re.sub(r"^---\n.*?\n---\n", "", body, count=1, flags=re.S)
        lines.append("[이어하기 — 볼트 이어하기.md, 세션 시작 원인 " + str(inp.get("source") or "-") + "]\n" + body.strip()[:8000])
        lines.append("[이어하기 규칙] 위 '지금 하던 것'과 '다음 한 걸음'부터 이어 간다. 작업 턴마다 이 파일을 갱신한다(Stop 훅이 검사).")
    if not os.path.isdir(VAULT):
        lines.append(f"[경고] 볼트 경로가 없다: {VAULT} (MOMO_VAULT 환경 변수로 지정)")
    print("\n".join(lines))

def _report_rows():
    now = time.time()
    rows = []
    rows.append(("볼트 경로", VAULT if os.path.isdir(VAULT) else f"없음: {VAULT}"))
    rows.append(("log.md 마지막 갱신", datetime.fromtimestamp(_mtime(LOG)).strftime("%Y-%m-%d %H:%M") if _mtime(LOG) else "없음"))
    j = today_journal()
    rows.append(("오늘 일지", ("있음 " + datetime.fromtimestamp(_mtime(j)).strftime("%H:%M")) if os.path.exists(j) else "없음"))
    st = _load(TURN, {})
    ts = st.get("turn_start")
    if ts:
        rf, cm = repo_changed_since(ts); vf = vault_changed_since(ts)
        rows.append(("이번 턴 저장소 변경", f"{len(rf)}개 파일, 커밋 {len(cm)}건"))
        rows.append(("이번 턴 볼트 변경", f"{len(vf)}개"))
        rows.append(("이번 턴 log 갱신", "예" if _mtime(LOG) >= ts else "아니오"))
    debt = _load(DEBT, None)
    rows.append(("빚(미작성 일지)", f"{debt['date']} — {debt.get('reason','')}" if debt else "없음"))
    rows.append(("이어하기.md 갱신", datetime.fromtimestamp(_mtime(HANDOFF)).strftime("%Y-%m-%d %H:%M") if _mtime(HANDOFF) else "없음"))
    newer = [f for f in vault_changed_since(_mtime(LOG)) if not f.startswith("일지")]
    rows.append(("log 보다 새 원자료 · 위키", f"{len(newer)}개" + (": " + ", ".join(newer[:5]) if newer else "")))
    return rows

def mode_report():
    print("| 항목 | 상태 |\n|---|---|")
    for k, v in _report_rows(): print(f"| {k} | {v} |")
    print()
    mode_lint(fix=False, quiet=False)

# ───────────────────────── lint
def _vault_names():
    names = {}
    root_v = os.path.dirname(os.path.dirname(os.path.dirname(VAULT)))   # infiray
    for root, dirs, files in os.walk(root_v):
        if "/.obsidian" in root or "/.trash" in root: continue
        for f in files:
            if f.endswith(".md"):
                rel = os.path.relpath(os.path.join(root, f), root_v)[:-3]
                names.setdefault(f[:-3], []).append(rel)
                if f.endswith(".excalidraw.md"): names.setdefault(f[:-14], []).append(rel)
    return names

def mode_lint(fix=False, quiet=False):
    names = _vault_names()
    mine = [p for p in glob.glob(os.path.join(VAULT, "**", "*.md"), recursive=True)]
    inbound = {}; missing = []; no_sources = []; n = 0
    for fp in mine:
        if fp.endswith(".excalidraw.md"): continue
        s = open(fp, encoding="utf-8").read()
        rel = os.path.relpath(fp, VAULT)
        if rel.startswith("위키/") and not re.search(r"^sources: \[.+\]", s, re.M) and os.path.basename(fp) not in ("문서-관계.md",):
            no_sources.append(rel)
        for m in re.findall(r"\[\[([^\]|#]+)", s):
            n += 1; m = m.replace("\\", ""); base = m.split("/")[-1]
            if base in names or base.replace(".excalidraw", "") in names:
                inbound[base.replace(".excalidraw", "")] = inbound.get(base.replace(".excalidraw", ""), 0) + 1
            else:
                missing.append((rel, m))
    orphans = [os.path.relpath(fp, VAULT) for fp in mine
               if os.path.basename(fp)[:-3] not in inbound and not fp.endswith(".excalidraw.md")
               and os.path.basename(fp) not in ("README.md", "index.md")]
    if fix:
        _regen_relations()
    if not quiet:
        print(f"링크 {n}개 · 끊긴 링크 {len(missing)}개 · 고아 쪽 {len(orphans)}개 · sources 없는 위키 쪽 {len(no_sources)}개")
        for r, m in missing: print(f"  끊김: {r} → [[{m}]]")
        for o in orphans: print(f"  고아: {o}")
        for s_ in no_sources: print(f"  sources 없음: {s_}")
        if fix: print("  문서-관계 교차표를 다시 만들었다")
    return not (missing or orphans or no_sources)

def _regen_relations():
    wiki = {}
    for p in glob.glob(os.path.join(VAULT, "위키", "**", "*.md"), recursive=True):
        s = open(p, encoding="utf-8").read(); name = os.path.basename(p)[:-3]
        m = re.search(r"^sources: \[(.*?)\]", s, re.M)
        wiki[name] = [x.strip() for x in m.group(1).split(",")] if m else []
    raws = sorted(os.path.basename(p)[:-3] for p in glob.glob(os.path.join(VAULT, "원자료", "*", "*.md")))
    rev = {r: [w for w, ss in wiki.items() if r in ss] for r in raws}
    rows_w = "\n".join(f"| [[{w}]] | " + " · ".join(f"[[{s}]]" for s in ss) + " |" for w, ss in sorted(wiki.items()) if ss)
    rows_r = "\n".join(f"| [[{r}]] | " + (" · ".join(f"[[{w}]]" for w in rev[r]) or "(아직 없음)") + " |" for r in raws)
    p = os.path.join(VAULT, "위키", "문서-관계.md")
    s = open(p, encoding="utf-8").read()
    def repl(section, header, body):
        nonlocal s
        pat = re.compile(r"(## " + re.escape(section) + r"\n)(.*?)(?=\n## |\Z)", re.S)
        s = pat.sub(lambda m: m.group(1) + header + body + "\n", s, count=1)
    repl("위키 쪽이 근거로 다는 원자료", "\n프론트매터 `sources` 에서 만든다. `vault_check.py --lint --fix` 가 다시 만든다.\n\n| 위키 쪽 | 근거 원자료 |\n|---|---|\n", rows_w)
    repl("원자료가 들어간 위키 쪽", "\n| 원자료 | 이 원자료를 근거로 쓰는 쪽 |\n|---|---|\n", rows_r)
    open(p, "w", encoding="utf-8").write(s)

if __name__ == "__main__":
    args = sys.argv[1:]
    inp = _read_stdin() if any(a in args for a in ("--start", "--prompt", "--stop", "--end")) else {}
    if "--start" in args: mode_start(inp)
    elif "--prompt" in args: mode_prompt(inp)
    elif "--stop" in args: mode_stop(inp)
    elif "--end" in args: mode_end(inp)
    elif "--lint" in args: sys.exit(0 if mode_lint(fix="--fix" in args) else 1)
    else: mode_report()
