const mean = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
const std = arr => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map(v => (v-m)**2)));
};
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

export function extractMovementFeatures(points, targetCenter=null) {
  if (!points || points.length < 2) {
    return {
      pathLength: 0, meanSpeed: 0, maxSpeed: 0, speedStd: 0,
      meanAcceleration: 0, maxAcceleration: 0, directionChanges: 0,
      pathEfficiency: 0,
    };
  }

  let pathLength = 0;
  const speeds = [];
  const vectors = [];
  for (let i=1; i<points.length; i++) {
    const a = points[i-1], b = points[i];
    const dt = Math.max((b.t-a.t)/1000, 0.001);
    const dx = b.x-a.x, dy = b.y-a.y;
    const dist = Math.hypot(dx,dy);
    pathLength += dist;
    speeds.push(dist/dt);
    vectors.push({dx,dy});
  }

  const accels = [];
  for (let i=1; i<speeds.length; i++) {
    const dt = Math.max((points[i+1].t-points[i].t)/1000,0.001);
    accels.push((speeds[i]-speeds[i-1])/dt);
  }

  let directionChanges = 0;
  for (let i=1; i<vectors.length; i++) {
    const a = vectors[i-1], b = vectors[i];
    const ma = Math.hypot(a.dx,a.dy), mb = Math.hypot(b.dx,b.dy);
    if (ma < 1 || mb < 1) continue;
    const cos = clamp((a.dx*b.dx+a.dy*b.dy)/(ma*mb), -1, 1);
    const angle = Math.acos(cos) * 180/Math.PI;
    if (angle >= 45) directionChanges++;
  }

  let pathEfficiency = 0;
  if (targetCenter && pathLength > 0) {
    const first = points[0];
    const straight = Math.hypot(targetCenter.x-first.x, targetCenter.y-first.y);
    pathEfficiency = clamp(straight/pathLength,0,1);
  }

  return {
    pathLength,
    meanSpeed: mean(speeds),
    maxSpeed: Math.max(...speeds,0),
    speedStd: std(speeds),
    meanAcceleration: mean(accels.map(Math.abs)),
    maxAcceleration: Math.max(...accels.map(Math.abs),0),
    directionChanges,
    pathEfficiency,
  };
}

export function summarizeSession(trials) {
  const goTrials = trials.filter(t=>t.type==='go');
  const noGoTrials = trials.filter(t=>t.type==='nogo');
  const correctGo = goTrials.filter(t=>t.correct && Number.isFinite(t.reactionTime));
  const rts = correctGo.map(t=>t.reactionTime);
  const commissionErrors = noGoTrials.filter(t=>!t.correct).length;
  const omissionErrors = goTrials.filter(t=>!t.correct).length;
  const correctCount = trials.filter(t=>t.correct).length;
  const movement = trials.map(t=>t.features).filter(Boolean);

  return {
    totalTrials: trials.length,
    goTrials: goTrials.length,
    noGoTrials: noGoTrials.length,
    accuracy: trials.length ? correctCount/trials.length : 0,
    commissionErrors,
    omissionErrors,
    commissionRate: noGoTrials.length ? commissionErrors/noGoTrials.length : 0,
    omissionRate: goTrials.length ? omissionErrors/goTrials.length : 0,
    meanRT: mean(rts),
    rtStd: std(rts),
    rtCV: rts.length && mean(rts) ? std(rts)/mean(rts) : 0,
    meanSpeed: mean(movement.map(x=>x.meanSpeed)),
    maxSpeed: Math.max(...movement.map(x=>x.maxSpeed),0),
    speedStd: mean(movement.map(x=>x.speedStd)),
    meanAcceleration: mean(movement.map(x=>x.meanAcceleration)),
    pathLength: mean(movement.map(x=>x.pathLength)),
    directionChanges: mean(movement.map(x=>x.directionChanges)),
    pathEfficiency: mean(movement.filter(x=>x.pathEfficiency>0).map(x=>x.pathEfficiency)),
    rts,
  };
}
