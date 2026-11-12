function setup(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || canvas.width;
  const cssH = canvas.clientHeight || canvas.height;
  canvas.width = Math.round(cssW*dpr);
  canvas.height = Math.round(cssH*dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  return {ctx,w:cssW,h:cssH};
}

function grid(ctx,w,h,pad=36) {
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#10141a'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#242b36'; ctx.lineWidth=1;
  for(let i=0;i<5;i++){
    const y=pad+(h-pad*2)*i/4;
    ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-pad,y);ctx.stroke();
  }
}

export function drawRTChart(canvas, values) {
  const {ctx,w,h}=setup(canvas); const pad=38; grid(ctx,w,h,pad);
  if(!values.length){ ctx.fillStyle='#7d8797';ctx.fillText('No valid Go responses',pad,60);return; }
  const max=Math.max(...values,700)*1.12, min=Math.min(...values,200)*.85;
  ctx.strokeStyle='#ed3038'; ctx.lineWidth=2; ctx.beginPath();
  values.forEach((v,i)=>{
    const x=pad+(w-pad*2)*(values.length===1?.5:i/(values.length-1));
    const y=h-pad-(h-pad*2)*(v-min)/(max-min||1);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });ctx.stroke();
  values.forEach((v,i)=>{const x=pad+(w-pad*2)*(values.length===1?.5:i/(values.length-1)); const y=h-pad-(h-pad*2)*(v-min)/(max-min||1);ctx.fillStyle='#ff6469';ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle='#8c96a6';ctx.font='11px system-ui';ctx.fillText(`${Math.round(max)} ms`,4,pad+4);ctx.fillText(`${Math.round(min)} ms`,4,h-pad+4);ctx.fillText('Go trials',w-76,h-10);
}

export function drawSpeedChart(canvas, trials) {
  const {ctx,w,h}=setup(canvas); const pad=38; grid(ctx,w,h,pad);
  const values=[];
  trials.forEach(t=>{
    const pts=t.points||[];
    for(let i=1;i<pts.length;i++){
      const dt=Math.max((pts[i].t-pts[i-1].t)/1000,.001);
      values.push(Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y)/dt);
    }
  });
  if(!values.length){ctx.fillStyle='#7d8797';ctx.fillText('No movement data',pad,60);return;}
  const max=Math.max(...values,1); const sampled=values.filter((_,i)=>i%Math.max(1,Math.floor(values.length/280))===0).slice(0,280);
  ctx.strokeStyle='#5ca8ff';ctx.lineWidth=1.5;ctx.beginPath();
  sampled.forEach((v,i)=>{const x=pad+(w-pad*2)*(sampled.length===1?.5:i/(sampled.length-1));const y=h-pad-(h-pad*2)*Math.min(v,max)/max;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();
  ctx.fillStyle='#8c96a6';ctx.font='11px system-ui';ctx.fillText(`${Math.round(max)} px/s`,4,pad+4);ctx.fillText('sampled movement',w-122,h-10);
}

export function drawTrajectory(canvas, trial, arenaSize) {
  const {ctx,w,h}=setup(canvas); const pad=28; grid(ctx,w,h,pad);
  const pts=trial?.points||[];
  if(!pts.length){ctx.fillStyle='#7d8797';ctx.fillText('No trajectory data',pad,60);return;}
  const aw=arenaSize?.width||1000, ah=arenaSize?.height||600;
  const mapX=x=>pad+(w-pad*2)*(x/aw); const mapY=y=>pad+(h-pad*2)*(y/ah);
  ctx.strokeStyle='#f7f8fa';ctx.lineWidth=1.5;ctx.beginPath();pts.forEach((p,i)=>{const x=mapX(p.x),y=mapY(p.y);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke();
  const first=pts[0], last=pts[pts.length-1];
  ctx.fillStyle='#32c27d';ctx.beginPath();ctx.arc(mapX(first.x),mapY(first.y),5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ed3038';ctx.beginPath();ctx.arc(mapX(last.x),mapY(last.y),5,0,Math.PI*2);ctx.fill();
  if(trial.targetCenter){ctx.strokeStyle='#5ca8ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(mapX(trial.targetCenter.x),mapY(trial.targetCenter.y),10,0,Math.PI*2);ctx.stroke();}
  ctx.fillStyle='#8c96a6';ctx.font='11px system-ui';ctx.fillText(`Trial ${trial.index+1} · ${trial.type.toUpperCase()} · ${trial.correct?'correct':'error'}`,pad,18);
}
