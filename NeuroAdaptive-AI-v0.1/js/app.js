import { GoNoGoExperiment } from './experiment.js';
import { summarizeSession } from './featureExtractor.js';
import { analyzeInteraction } from './analyzer.js';
import { drawRTChart, drawSpeedChart, drawTrajectory } from './charts.js';

const $=s=>document.querySelector(s);
const screens=[...document.querySelectorAll('.screen')];
function show(id){screens.forEach(s=>s.classList.toggle('active',s.id===id));window.scrollTo({top:0,behavior:'smooth'});}

const els={
  intro:$('#screenIntro'), instructions:$('#screenInstructions'), task:$('#screenTask'), results:$('#screenResults'),
  arena:$('#taskArena'), cue:$('#cueDisplay'), target:$('#targetButton'), startZone:$('#startZone'), hint:$('#arenaHint'),
  trialLabel:$('#trialLabel'), accuracyLive:$('#accuracyLive'), progressBar:$('#progressBar'), trackingStatus:$('#trackingStatus'), pointCount:$('#pointCount'),
};

let session={ createdAt:new Date().toISOString(), version:'0.1', trials:[], summary:null, analysis:null, arenaSize:null };
let experiment;

$('#btnMethod').addEventListener('click',()=>$('#methodPanel').classList.toggle('hidden'));
$('#btnStart').addEventListener('click',()=>show('screenInstructions'));
$('#btnBeginTask').addEventListener('click',startExperiment);
$('#btnRestart').addEventListener('click',()=>location.reload());
$('#btnPreview').addEventListener('click',()=>{ $('#adaptivePreview').classList.remove('hidden'); $('#adaptivePreview').scrollIntoView({behavior:'smooth'}); });
$('#btnToggleFocus').addEventListener('click',e=>{ const b=$('#mockBrowser'); b.classList.toggle('focus'); e.currentTarget.textContent=b.classList.contains('focus')?'返回一般模式':'切換 Focus Mode'; });
$('#btnDownloadCsv').addEventListener('click',downloadCsv);
$('#btnDownloadJson').addEventListener('click',()=>downloadBlob(JSON.stringify(session,null,2),'neuroadaptive-session.json','application/json'));

async function startExperiment(){
  show('screenTask');
  const r=els.arena.getBoundingClientRect(); session.arenaSize={width:r.width,height:r.height};
  experiment=new GoNoGoExperiment({
    arena:els.arena,cue:els.cue,target:els.target,startZone:els.startZone,hint:els.hint,
    onPointCount:n=>els.pointCount.textContent=`${n} points`,
    onStatus:s=>els.trackingStatus.textContent=s,
    onProgress:(i,n,trials)=>{
      els.trialLabel.textContent=`Trial ${Math.min(i+1,n)} / ${n}`;
      els.progressBar.style.width=`${(i/n)*100}%`;
      const acc=trials.length?trials.filter(t=>t.correct).length/trials.length:null;
      els.accuracyLive.textContent=acc===null?'—':`Accuracy ${(acc*100).toFixed(0)}%`;
    }
  });
  const trials=await experiment.run(20);
  session.trials=trials;
  session.summary=summarizeSession(trials);
  session.analysis=analyzeInteraction(session.summary);
  renderResults();
  show('screenResults');
}

function metric(label,value,sub=''){
  return `<div class="metric-card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-sub">${sub}</div></div>`;
}

function renderResults(){
  const s=session.summary,a=session.analysis;
  $('#metricGrid').innerHTML=[
    metric('Accuracy',`${(s.accuracy*100).toFixed(0)}%`,`${s.totalTrials-s.commissionErrors-s.omissionErrors} / ${s.totalTrials} correct`),
    metric('Mean Reaction Time',s.meanRT?`${Math.round(s.meanRT)} ms`:'—','correct Go trials'),
    metric('RT Variability',`${Math.round(s.rtStd)} ms`,`CV ${(s.rtCV*100).toFixed(1)}%`),
    metric('Commission Errors',s.commissionErrors,`No-Go errors / ${s.noGoTrials}`),
    metric('Omission Errors',s.omissionErrors,`Go misses / ${s.goTrials}`),
    metric('Mean Mouse Speed',`${Math.round(s.meanSpeed)} px/s`,'trajectory-derived'),
    metric('Max Mouse Speed',`${Math.round(s.maxSpeed)} px/s`,'session max'),
    metric('Mean Acceleration',`${Math.round(s.meanAcceleration)} px/s²`,'absolute acceleration'),
    metric('Direction Changes',s.directionChanges.toFixed(1),'average / trial'),
    metric('Path Efficiency',s.pathEfficiency?`${(s.pathEfficiency*100).toFixed(0)}%`:'—','straight line / actual path'),
  ].join('');

  $('#indicatorBadge').textContent=`${a.level} indicator`;
  $('#indicatorBadge').style.borderColor=a.level==='High'?'#ed3038':a.level==='Moderate'?'#f3b84b':'#32c27d';
  $('#scoreValue').textContent=a.score;
  $('#scoreLabel').textContent=a.label;
  $('#scoreExplanation').textContent=a.explanation;
  $('#scoreRing').style.background=`conic-gradient(#ed3038 0deg, #ed3038 ${a.score*3.6}deg, #252c37 ${a.score*3.6}deg)`;
  $('#signalList').innerHTML=a.signals.map(x=>`<div class="signal-item"><span>${x.name}<br><small>${x.display}</small></span><span class="signal-tag ${x.severity}">${x.severity==='high'?'High':x.severity==='mid'?'Moderate':'Low'}</span></div>`).join('');
  $('#recommendationList').innerHTML=a.recommendations.map((x,i)=>`<div class="rec-item"><span>${i+1}. ${x}</span></div>`).join('');

  requestAnimationFrame(()=>{
    drawRTChart($('#rtChart'),s.rts);
    drawSpeedChart($('#speedChart'),session.trials);
    const candidate=[...session.trials].filter(t=>t.points?.length>5).sort((x,y)=>y.points.length-x.points.length)[0] || session.trials[0];
    drawTrajectory($('#trajectoryChart'),candidate,session.arenaSize);
  });
}

function downloadCsv(){
  const headers=['trial','type','correct','clicked','reaction_time_ms','path_length_px','mean_speed_px_s','max_speed_px_s','speed_sd_px_s','mean_acceleration_px_s2','direction_changes','path_efficiency','point_count'];
  const rows=session.trials.map(t=>[
    t.index+1,t.type,t.correct,t.clicked,t.reactionTime?Math.round(t.reactionTime):'',
    t.features.pathLength.toFixed(2),t.features.meanSpeed.toFixed(2),t.features.maxSpeed.toFixed(2),t.features.speedStd.toFixed(2),
    t.features.meanAcceleration.toFixed(2),t.features.directionChanges,t.features.pathEfficiency.toFixed(4),t.points.length
  ]);
  const csv=[headers,...rows].map(r=>r.join(',')).join('\n');
  downloadBlob(csv,'neuroadaptive-session.csv','text/csv;charset=utf-8');
}
function downloadBlob(content,name,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);}
