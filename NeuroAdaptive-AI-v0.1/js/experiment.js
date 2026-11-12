import { MouseTracker } from './mouseTracker.js';
import { extractMovementFeatures } from './featureExtractor.js';

const sleep = ms => new Promise(r=>setTimeout(r,ms));

export class GoNoGoExperiment {
  constructor({ arena, cue, target, startZone, hint, onProgress, onTrial, onPointCount, onStatus }) {
    this.arena=arena; this.cue=cue; this.target=target; this.startZone=startZone; this.hint=hint;
    this.onProgress=onProgress; this.onTrial=onTrial; this.onStatus=onStatus;
    this.tracker=new MouseTracker(arena,onPointCount);
    this.trials=[]; this.running=false; this._resolveClick=null; this._currentType=null;
    this._arenaClick = this._arenaClick.bind(this);
    this.arena.addEventListener('click',this._arenaClick);
  }

  buildSchedule(n=20) {
    const noGoCount=6;
    const types=[...Array(n-noGoCount).fill('go'),...Array(noGoCount).fill('nogo')];
    for(let i=types.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[types[i],types[j]]=[types[j],types[i]];}
    // Avoid three no-go in a row for a smoother demo.
    for(let i=2;i<types.length;i++) if(types[i]==='nogo'&&types[i-1]==='nogo'&&types[i-2]==='nogo'){const k=types.findIndex((v,idx)=>idx>i&&v==='go');if(k>0)[types[i],types[k]]=[types[k],types[i]];}
    return types;
  }

  async run(n=20) {
    if(this.running) return;
    this.running=true; this.trials=[];
    const schedule=this.buildSchedule(n);
    for(let i=0;i<schedule.length;i++){
      this.onProgress?.(i,n,this.trials);
      const result=await this.runTrial(i,schedule[i]);
      this.trials.push(result); this.onTrial?.(result,this.trials);
      await sleep(280);
    }
    this.onProgress?.(n,n,this.trials);
    this.running=false;
    return this.trials;
  }

  async waitForStartHover() {
    this.startZone.classList.remove('ready');
    this.hint.textContent='把滑鼠移到 START 區開始下一題';
    this.onStatus?.('等待固定起始位置');
    await new Promise(resolve=>{
      let timer=null;
      const enter=()=>{
        this.startZone.classList.add('ready');
        this.hint.textContent='保持一下…';
        timer=setTimeout(clean,350);
      };
      const leave=()=>{if(timer)clearTimeout(timer);timer=null;this.startZone.classList.remove('ready');this.hint.textContent='請回到 START 區';};
      const clean=()=>{this.startZone.removeEventListener('pointerenter',enter);this.startZone.removeEventListener('pointerleave',leave);resolve();};
      this.startZone.addEventListener('pointerenter',enter);
      this.startZone.addEventListener('pointerleave',leave);
    });
  }

  async runTrial(index,type) {
    await this.waitForStartHover();
    this.startZone.classList.remove('ready');
    this.hint.textContent='';
    this._currentType=type;
    this.tracker.beginTrial(index,type);
    this.onStatus?.('Recording mouse trajectory');

    await sleep(180 + Math.random()*180);
    this.cue.textContent=type==='go'?'V':'2';
    this.cue.classList.toggle('nogo',type==='nogo');
    this.cue.classList.remove('hidden');
    const stimulusOnset=performance.now();
    await sleep(260);
    this.cue.classList.add('hidden');

    const rect=this.arena.getBoundingClientRect();
    const tx=80+Math.random()*Math.max(100,rect.width-200);
    const ty=80+Math.random()*Math.max(80,rect.height-280);
    this.target.style.left=`${tx}px`;
    this.target.style.top=`${ty}px`;
    this.target.classList.remove('hidden');
    const targetRect={x:tx+50,y:ty+23};

    let clicked=false, reactionTime=null;
    const response=await new Promise(resolve=>{
      const timeout=setTimeout(()=>{this._resolveClick=null;resolve({clicked:false});},1250);
      this._resolveClick=(event)=>{clearTimeout(timeout);this._resolveClick=null;resolve({clicked:true,event});};
    });

    if(response.clicked){clicked=true; reactionTime=performance.now()-stimulusOnset;}
    this.target.classList.add('hidden');
    const points=this.tracker.stopTrial();
    const correct=type==='go'?clicked:!clicked;
    const features=extractMovementFeatures(points,type==='go'?targetRect:null);
    const trial={ index,type,correct,clicked,reactionTime,stimulusOnset,points,targetCenter:targetRect,features };
    this._currentType=null;
    if(correct){this.hint.textContent='✓';this.hint.style.color='#52da95';}
    else {this.hint.textContent=type==='go'?'漏按':'誤按';this.hint.style.color='#ff7479';}
    await sleep(180);
    this.hint.style.color='';
    return trial;
  }

  _arenaClick(event) {
    if(!this._resolveClick) return;
    // Go requires clicking the visible target; on No-Go, any click is an inhibition error.
    if(this._currentType==='go' && event.target!==this.target) return;
    this._resolveClick(event);
  }
}
