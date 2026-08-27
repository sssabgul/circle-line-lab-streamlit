import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";

type Relation = "two" | "tangent" | "none";
type Stage = "explore" | "mission" | "distance" | "predict" | "rule";
type Point = { x: number; y: number };

const CENTER = { x: 1, y: 2 };
const RADIUS = 3;
const X_MIN = -7;
const X_MAX = 7;
const Y_MIN = -6;
const Y_MAX = 8;
const W = 700;
const H = 700;
const TOLERANCE = 0.035;

const missionText: Record<Relation, string> = {
  two: "원과 직선이 두 점에서 만나게 해보세요.",
  tangent: "원과 직선이 딱 한 점에서 만나게 해보세요.",
  none: "원과 직선이 만나지 않게 해보세요.",
};

const relationText: Record<Relation, string> = {
  two: "두 점에서 만나요",
  tangent: "딱 한 점에서 만나요 — 접했어요!",
  none: "서로 만나지 않아요",
};

function round(value: number, digits = 1) {
  const p = 10 ** digits;
  const result = Math.round(value * p) / p;
  return Object.is(result, -0) ? 0 : result;
}

export default function App() {
  const [m, setM] = useState(0.7);
  const [k, setK] = useState(1.3);
  const [stage, setStage] = useState<Stage>("explore");
  const [missionIndex, setMissionIndex] = useState(0);
  const [missionDone, setMissionDone] = useState<boolean[]>([false, false, false]);
  const [predictionCount, setPredictionCount] = useState(0);
  const [prediction, setPrediction] = useState<Relation | null>(null);
  const [checked, setChecked] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const missions: Relation[] = ["two", "tangent", "none"];

  useEffect(() => {
    // Streamlit 커스텀 컴포넌트가 준비되었음을 알리고,
    // 화면 크기가 바뀔 때마다 iframe 높이를 자동으로 맞춘다.
    const post = (message: Record<string, unknown>) => {
      window.parent.postMessage({ isStreamlitMessage: true, ...message }, "*");
    };
    const resize = () => post({
      type: "streamlit:setFrameHeight",
      height: document.documentElement.scrollHeight,
    });

    post({ type: "streamlit:componentReady", apiVersion: 1 });
    const observer = new ResizeObserver(resize);
    observer.observe(document.documentElement);
    resize();

    return () => observer.disconnect();
  }, []);

  const math = useMemo(() => {
    // 직선 mx-y+k=0에서 중심까지 거리와 수선의 발을 계산한다.
    const a = m, b = -1, c = k;
    const denom = a * a + b * b;
    const signedNumerator = a * CENTER.x + b * CENTER.y + c;
    const d = Math.abs(signedNumerator) / Math.sqrt(denom);
    const foot = {
      x: CENTER.x - a * signedNumerator / denom,
      y: CENTER.y - b * signedNumerator / denom,
    };
    const relation: Relation = Math.abs(d - RADIUS) <= TOLERANCE
      ? "tangent" : d < RADIUS ? "two" : "none";
    const intersections: Point[] = [];
    if (relation === "tangent") intersections.push(foot);
    if (relation === "two") {
      const halfChord = Math.sqrt(Math.max(0, RADIUS ** 2 - d ** 2));
      const length = Math.sqrt(1 + m * m);
      const ux = 1 / length, uy = m / length;
      intersections.push(
        { x: foot.x + ux * halfChord, y: foot.y + uy * halfChord },
        { x: foot.x - ux * halfChord, y: foot.y - uy * halfChord },
      );
    }
    return { d, foot, relation, intersections };
  }, [m, k]);

  const px = (x: number) => (x - X_MIN) / (X_MAX - X_MIN) * W;
  const py = (y: number) => H - (y - Y_MIN) / (Y_MAX - Y_MIN) * H;
  const lineY1 = m * X_MIN + k;
  const lineY2 = m * X_MAX + k;
  const showDistance = stage === "distance" || stage === "predict" || stage === "rule";
  const isMissionSuccess = stage === "mission" && math.relation === missions[missionIndex];
  const ruleUnlocked = missionDone.every(Boolean) && predictionCount >= 3;

  function pointerToGraph(event: PointerEvent<SVGSVGElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    const vx = (event.clientX - rect.left) / rect.width * W;
    const vy = (event.clientY - rect.top) / rect.height * H;
    return { x: X_MIN + vx / W * (X_MAX - X_MIN), y: Y_MAX - vy / H * (Y_MAX - Y_MIN) };
  }

  function startDrag(event: PointerEvent<SVGSVGElement>) {
    if (stage === "predict" && !checked) return;
    const p = pointerToGraph(event);
    dragOffset.current = k - (p.y - m * p.x);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function moveDrag(event: PointerEvent<SVGSVGElement>) {
    if (!dragging) return;
    const p = pointerToGraph(event);
    setK(Math.max(-8, Math.min(8, round(p.y - m * p.x + dragOffset.current, 2))));
  }

  function finishDrag(event: PointerEvent<SVGSVGElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  }

  function completeMission() {
    if (!isMissionSuccess) return;
    const next = [...missionDone];
    next[missionIndex] = true;
    setMissionDone(next);
  }

  function nextMission() {
    const next = Math.min(2, missionIndex + 1);
    setMissionIndex(next);
  }

  function makePredictionProblem() {
    const target: Relation = (["two", "tangent", "none"] as Relation[])[predictionCount % 3];
    const sign = predictionCount % 2 === 0 ? 1 : -1;
    const base = m * CENTER.x - CENTER.y;
    const norm = Math.sqrt(m * m + 1);
    const targetDistance = target === "two" ? 1.7 : target === "tangent" ? RADIUS : 4.1;
    setK(round(-base + sign * targetDistance * norm, 3));
    setPrediction(null);
    setChecked(false);
    setStage("predict");
  }

  function checkPrediction() {
    if (!prediction) return;
    setChecked(true);
    setPredictionCount((count) => count + 1);
  }

  const steps = ["자유 탐색", "미션", "거리", "예측", "규칙"];
  const activeStep = ({ explore: 0, mission: 1, distance: 2, predict: 3, rule: 4 } as const)[stage];

  return (
    <main>
      <header>
        <div><span className="eyebrow">공통수학 2 · 원의 방정식</span><h1>원과 직선의 위치관계</h1></div>
        <div className="formula">(x − 1)² + (y − 2)² = 9</div>
      </header>

      <nav className="steps" aria-label="활동 단계">
        {steps.map((name, index) => <div key={name} className={index === activeStep ? "active" : index < activeStep ? "done" : ""}><b>{index + 1}</b><span>{name}</span></div>)}
      </nav>

      <section className="workspace">
        <div className="graph-card">
          <div className="graph-top"><span className={`status ${math.relation}`}>{relationText[math.relation]}</span><span>직선을 직접 잡고 움직여 보세요</span></div>
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="원과 움직일 수 있는 직선이 있는 좌표평면"
            onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag}>
            <rect width={W} height={H} className="plot-bg" />
            {Array.from({ length: X_MAX - X_MIN + 1 }, (_, i) => X_MIN + i).map((x) => <line key={`gx${x}`} x1={px(x)} y1={0} x2={px(x)} y2={H} className={x === 0 ? "axis" : "grid"} />)}
            {Array.from({ length: Y_MAX - Y_MIN + 1 }, (_, i) => Y_MIN + i).map((y) => <line key={`gy${y}`} x1={0} y1={py(y)} x2={W} y2={py(y)} className={y === 0 ? "axis" : "grid"} />)}
            {Array.from({ length: X_MAX - X_MIN + 1 }, (_, i) => X_MIN + i).filter(Boolean).map((x) => <text key={`tx${x}`} x={px(x)} y={py(0) + 20} className="tick x" textAnchor="middle">{x}</text>)}
            {Array.from({ length: Y_MAX - Y_MIN + 1 }, (_, i) => Y_MIN + i).filter(Boolean).map((y) => <text key={`ty${y}`} x={px(0) - 9} y={py(y) + 5} className="tick" textAnchor="end">{y}</text>)}
            <circle cx={px(CENTER.x)} cy={py(CENTER.y)} r={RADIUS / (X_MAX - X_MIN) * W} className="circle" />
            {showDistance && <g><line x1={px(CENTER.x)} y1={py(CENTER.y)} x2={px(math.foot.x)} y2={py(math.foot.y)} className="distance-line" /><text x={(px(CENTER.x)+px(math.foot.x))/2 + 8} y={(py(CENTER.y)+py(math.foot.y))/2 - 8} className="d-label">d</text><circle cx={px(math.foot.x)} cy={py(math.foot.y)} r="6" className="foot" /></g>}
            <circle cx={px(CENTER.x)} cy={py(CENTER.y)} r="7" className="center" /><text x={px(CENTER.x)+12} y={py(CENTER.y)-12} className="point-label">O(1, 2)</text>
            {!(stage === "predict" && !checked) && <><line x1={px(X_MIN)} y1={py(lineY1)} x2={px(X_MAX)} y2={py(lineY2)} className={`movable-line ${dragging ? "dragging" : ""}`} /><line x1={px(X_MIN)} y1={py(lineY1)} x2={px(X_MAX)} y2={py(lineY2)} className="hit-line" /></>}
            {math.intersections.map((p, i) => <circle key={i} cx={px(p.x)} cy={py(p.y)} r="8" className="intersection" />)}
            {stage === "predict" && !checked && <text x={W/2} y={H/2} textAnchor="middle" className="hidden-line">예측한 뒤 직선을 확인해요</text>}
          </svg>
        </div>

        <aside className="panel">
          <section className="controls">
            <div className="equation">y = <strong>{round(m, 1)}</strong>x {k >= 0 ? "+" : "−"} <strong>{Math.abs(round(k, 1))}</strong></div>
            <label><span>기울기 <b>m = {round(m, 1)}</b></span><input type="range" min="-2" max="2" step="0.1" value={m} disabled={stage === "predict" && !checked} onChange={(e) => setM(Number(e.target.value))} /></label>
            <label><span>위아래 이동 <b>k = {round(k, 1)}</b></span><input type="range" min="-8" max="8" step="0.1" value={k} disabled={stage === "predict" && !checked} onChange={(e) => setK(Number(e.target.value))} /></label>
          </section>

          {stage === "explore" && <section className="activity"><span className="tag">자유 탐색</span><h2>직선을 움직여 보세요.</h2><p>원과 직선이 만나는 모습에는 몇 가지 경우가 있을까요?</p><button onClick={() => setStage("mission")}>미션 시작하기 →</button></section>}

          {stage === "mission" && <section className="activity"><span className="tag">미션 {missionIndex + 1} / 3</span><h2>{missionText[missions[missionIndex]]}</h2><p className={isMissionSuccess ? "success" : "hint"}>{isMissionSuccess ? "성공! 현재 모습을 잘 관찰하세요." : "직선을 움직여 조건을 만들어 보세요."}</p>{isMissionSuccess && !missionDone[missionIndex] && <button onClick={completeMission}>성공 기록하기</button>}{missionDone[missionIndex] && missionIndex < 2 && <button onClick={nextMission}>다음 미션 →</button>}{missionDone.every(Boolean) && <button onClick={() => setStage("distance")}>거리 살펴보기 →</button>}</section>}

          {stage === "distance" && <section className="activity"><span className="tag">거리 탐구</span><h2>직선을 움직이며 d와 r을 비교해 보세요.</h2><div className="measure"><div><small>중심에서 직선까지</small><b>d = {round(math.d, 2)}</b></div><div><small>원의 반지름</small><b>r = {RADIUS}</b></div></div><p>교점의 개수가 언제 바뀌는지 찾아보세요.</p><button onClick={makePredictionProblem}>예측해 보기 →</button></section>}

          {stage === "predict" && <section className="activity"><span className="tag">예측 {Math.min(predictionCount + (checked ? 0 : 1), 3)} / 3</span><h2>현재 d와 r의 관계를 보고 예상해 보세요.</h2><div className="measure compact"><div><small>거리</small><b>d = {round(math.d, 2)}</b></div><div><small>반지름</small><b>r = {RADIUS}</b></div></div><div className="choices">{(["two", "tangent", "none"] as Relation[]).map((value) => <button key={value} className={prediction === value ? "selected" : "secondary"} disabled={checked} onClick={() => setPrediction(value)}>{value === "two" ? "두 점에서 만난다" : value === "tangent" ? "한 점에서 만난다" : "만나지 않는다"}</button>)}</div>{!checked ? <button disabled={!prediction} onClick={checkPrediction}>확인하기</button> : <><p className={prediction === math.relation ? "success" : "wrong"}>{prediction === math.relation ? "정답이에요!" : `다시 관찰해 보세요. 정답: ${relationText[math.relation]}`}</p>{predictionCount < 3 ? <button onClick={makePredictionProblem}>다음 예측 →</button> : <button onClick={() => setStage("rule")}>규칙 확인하기 →</button>}</>}</section>}

          {stage === "rule" && <section className="activity rule"><span className="tag">규칙 발견</span><h2>관찰한 결과를 정리해 볼까요?</h2>{ruleUnlocked ? <div className="rules"><p><b>d &lt; r</b><span>두 점에서 만남</span></p><p><b>d = r</b><span>한 점에서 만남(접함)</span></p><p><b>d &gt; r</b><span>만나지 않음</span></p></div> : <p>미션과 예측을 모두 완료하면 규칙이 열립니다.</p>}<button className="secondary" onClick={() => { setStage("explore"); setMissionIndex(0); setMissionDone([false,false,false]); setPredictionCount(0); setChecked(false); }}>처음부터 다시 하기</button></section>}
        </aside>
      </section>
    </main>
  );
}
