const gameDefs = {
  scan: { title: '성계 탐사·자료 회수·귀환 전략', eyebrow: '01 / SCAN · CHOOSE · RETURN', summary: '성계의 위험을 정찰하고 탐사 자료 4개를 모아 8턴 안에 기지로 귀환하세요.', rules: ['성계마다 자료와 이동 연료가 다릅니다. 정찰하면 이동 피해가 줄어듭니다.', '첫 자료를 회수하면 선체 보강 또는 센서 개선을 무료로 고를 수 있습니다.', '선체가 0이 되거나 8턴을 넘기면 실패합니다. 자료 4개를 모은 뒤 귀환하면 성공합니다.'] },
  signal: { title: '첫 접촉 신호 해독 게임', eyebrow: '02 / READ · REPLY · BUILD TRUST', summary: '신호의 두 단서를 읽고 답신을 골라 4교신 중 신뢰 3을 얻으세요.', rules: ['각 교신에는 두 단서와 답신 3개가 있습니다. 알맞은 답신은 신뢰 +1, 오답은 긴장 +1입니다.', '분석은 현재 신호의 해석 힌트를 보여주며 충전량을 소비합니다. 정답 2개 뒤 분석 기회가 늘어납니다.', '긴장 3이 되거나 마지막에 신뢰가 3 미만이면 실패합니다.'] },
  power: { title: '정거장 전력망 복구 퍼즐', eyebrow: '03 / CONNECT · BALANCE · HOLD', summary: '차단기를 연결해 필수 설비 3곳에 전력을 공급하고 2교대 동안 유지하세요.', rules: ['중앙 원자로에서 초록색 경로로만 전기가 흐릅니다. 차단기 하나를 켜면 부품 1개와 행동 1회를 씁니다.', '필수 설비 3곳은 전력 6을 요구합니다. 보조발전기 연결은 부품 절약, 원자로 즉시 수리는 행동 절약 대신 축전지 1을 씁니다.', '공급이 부족하면 축전지가 닳습니다. 축전지 0 또는 8행동 초과는 실패입니다.'] },
};
const sectors = [
  { id: 'a', name: '안쪽 성계', data: 1, fuel: 1, risk: 2, icon: '◇' },
  { id: 'b', name: '중간 성계', data: 2, fuel: 2, risk: 3, icon: '✧' },
  { id: 'c', name: '외곽 성계', data: 2, fuel: 3, risk: 5, icon: '✦' },
];
const transmissions = [
  { clue: '원형 신호 세 번 · 손상된 외피', title: '외부 장치가 고장난 탐사선', hint: '장비 피해를 먼저 해결하자는 뜻에 가깝습니다.', options: ['채굴권 요구', '수리 지원 제안', '무장 경고'], answer: 1 },
  { clue: '두 항로의 겹침 · 충돌 예고', title: '접근하는 교역선', hint: '안전한 다른 길을 알려 달라는 요청입니다.', options: ['직진 고집', '교신 종료', '우회 좌표 공유'], answer: 2 },
  { clue: '저장고 온도 상승 · 식량 부족', title: '보급이 필요한 이주선', hint: '생존 물자를 교환할 제안이 도움됩니다.', options: ['보급 교환 제안', '엔진 시험 요청', '무응답'], answer: 0 },
  { clue: '감사 신호 반복 · 중립 지점 표시', title: '만남을 제안하는 대표단', hint: '위협이 아닌 공식 회담 제안입니다.', options: ['봉쇄 선언', '중립 회담 수락', '자료 파기'], answer: 1 },
  { clue: '정지 신호 반복 · 비상 통로 요청', title: '고장 난 소형 수송선', hint: '위험을 피할 임시 이동 경로가 필요합니다.', options: ['항로 통제 강화', '신호 무시', '안전 통로 공유'], answer: 2 },
  { clue: '별 지도 동봉 · 관측 수치 비교', title: '연구 협력을 제안하는 탐사선', hint: '서로의 관측 자료를 확인하자는 뜻입니다.', options: ['관측 자료 교환', '영역 폐쇄', '엔진 부품 요구'], answer: 0 },
];
const powerCells = [
  ['life', '생명유지', '✚'], ['wire', '차단기 A', '╋'], ['med', '의료실', '✧'],
  ['wire', '차단기 B', '╋'], ['core', '원자로', '◉'], ['wire', '차단기 C', '╋'],
  ['aux', '보조발전', '⚡'], ['wire', '차단기 D', '╋'], ['comm', '통신실', '⌁'],
];
const app = document.querySelector('#app');
const mode = Object.hasOwn(gameDefs, new URLSearchParams(location.search).get('game')) ? new URLSearchParams(location.search).get('game') : 'scan';
const def = gameDefs[mode];
for (const link of document.querySelectorAll('[data-nav]')) if (link.dataset.nav === mode) link.setAttribute('aria-current', 'page');
let state = freshState();
let phase = 'intro';
let message = '';
let pendingRestart = false;
let logs = [];
function shuffledSignals() { const deck=transmissions.map((_,i)=>i); for(let i=deck.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}return deck.slice(0,4); }
function freshState() {
  if (mode === 'scan') return { turn: 0, hull: 9, fuel: 11, data: 0, pos: 'base', scanned: [], taken: [], upgrade: null, upgradePending: false };
  if (mode === 'signal') return { round: 0, trust: 0, tension: 0, analysis: 2, insight: 0, hinted: false, protocol: false, deck: shuffledSignals() };
  return { turn: 0, parts: 4, battery: 5, active: [], repaired: false, stable: 0 };
}
function log(text) { logs.unshift(text); logs = logs.slice(0, 5); message = text; }
function fail(text) { phase = 'fail'; log(text); }
function win(text) { phase = 'win'; log(text); }
function advance(max) { if (phase === 'running' && state.turn >= max) fail(`행동 제한 ${max}회를 넘겼습니다. 연결과 준비 순서를 다시 조정해 보세요.`); }
function button(label, act, extra = '', style = '') { return `<button class="action ${style}" data-act="${act}" ${extra}>${label}</button>`; }
function scanMetrics() { return [['자료 / 목표', `${state.data}/4`], ['선체', `${state.hull}/9`], ['연료', `${state.fuel}/11`], ['행동 / 제한', `${state.turn}/8`]]; }
function signalMetrics() { return [['신뢰 / 목표', `${state.trust}/3`], ['긴장 / 한계', `${state.tension}/3`], ['교신', `${Math.min(state.round + 1, 4)}/4`], ['분석 기회', `${state.analysis}`]]; }
function powerMetrics() { const n = powerNetwork(); return [['설비 공급', `${n.vitals}/3`], ['출력 / 수요', `${n.capacity}/${n.demand}`], ['부품', `${state.parts}`], ['축전지', `${state.battery}/5`], ['안정 / 목표', `${state.stable}/2`]]; }
function renderIntro() { return `<div class="intro"><span class="big" aria-hidden="true">${mode === 'scan' ? '✦' : mode === 'signal' ? '◎' : '⚡'}</span><h2>목표를 확인하고 시작하세요</h2><p>${def.summary}</p><ul class="goal-list">${def.rules.slice(0,2).map(x=>`<li>${x}</li>`).join('')}</ul>${button('작전 시작', 'start', '', 'primary')}</div>`; }
function renderScan() {
  if (state.upgradePending) return `<div class="signal-card"><span class="glyph">✧</span><h3>탐사 자료로 장비를 개선합니다</h3><p>이번에는 한 가지만 무료로 선택할 수 있습니다.</p><div class="button-row">${button('선체 보강 <small>선체 +2</small>', 'upgrade', 'data-id="hull"')}${button('센서 개선 <small>이후 이동 피해 −1</small>', 'upgrade', 'data-id="sensor"')}</div></div>`;
  return `<div class="stage-head"><h2>성계 선택</h2><span class="chip">현재 위치 · ${state.pos === 'base' ? '기지' : sectors.find(x=>x.id===state.pos).name}</span></div><div class="sector-grid">${sectors.map(x=>`<div class="sector ${state.taken.includes(x.id)?'taken':''} ${state.pos===x.id?'visited':''}"><strong>${x.icon} ${x.name}</strong><span>자료 ${x.data} · 연료 ${x.fuel}</span><small>${state.scanned.includes(x.id) ? `정찰됨 · 예상 이동 피해 ${Math.max(0,x.risk-2-(state.upgrade==='sensor'?1:0))}` : '위험 미상 · 정찰하면 피해 감소'}${state.taken.includes(x.id)?' · 회수 완료':''}</small><div class="button-row">${button('정찰', 'scan', `data-id="${x.id}" ${state.scanned.includes(x.id)?'disabled':''}`, 'ghost')}${button('이동', 'travel', `data-id="${x.id}" ${state.pos===x.id?'disabled':''}`)}</div></div>`).join('')}</div><div class="button-row">${button('현재 성계 자료 회수', 'collect', `${state.pos==='base'||state.taken.includes(state.pos)?'disabled':''}`, 'primary')}${button('기지로 귀환', 'return', `${state.data<4?'disabled':''}`)}${button('현장 수리 <small>연료 2 · 선체 +3 · 1행동</small>', 'repair', `${state.fuel<2||state.hull>=9?'disabled':''}`, 'ghost')}${button('긴급 급유 <small>연료 +3 · 선체 −1 · 1행동</small>', 'refuel', '', 'ghost')}</div><p class="hint">정찰과 이동은 각각 1행동입니다. 귀환에 성공하려면 연료 2와 선체 2 이상이 필요합니다.</p>`;
}
function renderSignal() {
  const t = transmissions[state.deck[state.round]];
  return `<div class="stage-head"><h2 tabindex="-1">교신 ${state.round + 1} / 4</h2><span class="chip">${state.hinted ? '분석 완료' : '해석 중'}</span></div><div class="signal-card"><span class="glyph">◉ ── ◌</span><h3>${t.title}</h3><p>수신 내용: ${t.clue}</p><div class="clue">${state.hinted ? `분석 결과: ${t.hint}` : '두 단서를 읽고 의도를 추론하세요. 분석 기회를 써서 해석 힌트를 볼 수 있습니다.'}</div></div><div class="button-row">${button('신호 분석 <small>남은 분석 기회 '+state.analysis+'</small>', 'analyze', `${state.analysis<=0||state.hinted?'disabled':''}`, 'ghost')}</div><div class="choice-grid">${t.options.map((x,i)=>button(x,'reply',`data-id="${i}"`)).join('')}</div><p class="hint">정답을 맞히면 신뢰 +1. 두 번 맞히면 분석 기회가 하나 늘어납니다.</p>`;
}
function neighbors(i) { return [i-3,i+3,...(i%3>0?[i-1]:[]),...(i%3<2?[i+1]:[])].filter(n=>n>=0&&n<9); }
function powerNetwork() {
  const seen = new Set([4]), queue = [4];
  while (queue.length) { const i=queue.shift(); for(const n of neighbors(i)) if(!seen.has(n) && (powerCells[n][0]!=='wire'||state.active.includes(n))) { seen.add(n); queue.push(n); } }
  const vitals=[0,2,8].filter(i=>seen.has(i)).length;
  const capacity=4+(seen.has(6)?2:0)+(state.repaired?2:0);
  return {seen,vitals,capacity,demand:vitals*2};
}
function renderPower() {
  const n=powerNetwork();
  return `<div class="stage-head"><h2>전력망 · ${state.turn}/8행동</h2><span class="chip">${n.vitals===3 && n.capacity>=6?'안정 공급 가능':n.demand>n.capacity?'출력 부족':'복구 중'}</span></div><div class="power-grid" role="group" aria-label="3열 3행 전력망">${powerCells.map(([kind,label,symbol],i)=>{const active=state.active.includes(i),on=n.seen.has(i);return `<button class="grid-cell ${active?'on':''} ${on?'powered':''} ${n.demand>n.capacity&&on?'overload':''}" data-act="toggle" data-id="${i}" ${kind!=='wire'?'disabled':''} aria-label="${label} ${kind==='wire'?(active?'켜짐':'꺼짐'):(on?'전력 연결':'전력 미연결')}"><span class="symbol">${kind==='wire'?(active?'╋':'┼'):symbol}</span><span class="label">${label}</span></button>`;}).join('')}</div><p class="hint">중앙 원자로에서 붙어 있는 차단기로 전기가 흐릅니다. 초록 테두리는 전력 연결 상태입니다.</p><div class="button-row">${button('교대 진행 <small>현재 연결로 공급 판정</small>','shift','','primary')}${button('원자로 즉시 수리 <small>부품 2 · 축전지 −1 · 출력 +2</small>','core',`${state.repaired||state.parts<2||state.battery<=1?'disabled':''}`)}${button('부품 수거 <small>부품 +2 · 축전지 −1</small>','salvage','','ghost')}</div><p class="hint">차단기를 켜면 부품 1과 행동 1회를 씁니다. 끄면 부품을 돌려받지만 행동은 소모됩니다.</p>`;
}
function renderResult() {
  const good=phase==='win'; return `<div class="result ${good?'win':'fail'}"><span class="result-icon" aria-hidden="true">${good?'✓':'×'}</span><h2 tabindex="-1">${good?'목표 달성':'작전 실패'}</h2><p>${message}</p>${button('같은 게임 다시 시작','restartNow','','primary')}</div>`;
}
function render() {
  const metrics=mode==='scan'?scanMetrics():mode==='signal'?signalMetrics():powerMetrics();
  const content=phase==='intro'?renderIntro():phase==='running'?(mode==='scan'?renderScan():mode==='signal'?renderSignal():renderPower()):renderResult();
  app.innerHTML=`<section class="hero"><p class="eyebrow">${def.eyebrow}</p><h1>${def.title}</h1><p>${def.summary}</p></section><div class="layout"><section class="panel game-panel" aria-label="게임 화면"><div class="status-strip ${metrics.length===5?'five':''}" role="group" aria-label="게임 상태">${metrics.map(([label,value])=>`<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div><div class="inner"><div class="scene">${content}</div>${phase==='running'?`<p class="message ${message.includes('실패')?'bad':''}" role="status">${message||'현재 상태를 보고 다음 행동을 선택하세요.'}</p><div class="footer-actions">${pendingRestart?`${button('정말 처음부터','restartNow','','warn')}${button('취소','cancelRestart','','ghost')}`:button('처음부터','restartAsk','','ghost')}</div>`:''}</div></section><aside class="panel sidebar"><h2>게임 규칙</h2><p>${def.summary}</p>${def.rules.map(x=>`<div class="rule">${x}</div>`).join('')}<h2>최근 행동</h2><ol class="log">${logs.length?logs.map(x=>`<li>${x}</li>`).join(''):'<li>작전을 시작하면 행동 기록이 여기에 쌓입니다.</li>'}</ol></aside></div>`;
}
function actionScan(act,id) {
  const s=state, sector=sectors.find(x=>x.id===id);
  if(s.upgradePending){ if(act!=='upgrade')return; s.upgrade=id; s.upgradePending=false; if(id==='hull')s.hull=Math.min(9,s.hull+2);log(id==='hull'?'선체 보강 완료. 선체가 2 회복되었습니다.':'센서 개선 완료. 이후 이동 피해가 1 줄어듭니다.');return; }
  if(act==='scan'){if(s.scanned.includes(id))return;s.scanned.push(id);s.turn++;log(`${sector.name} 정찰 완료. 이동 피해를 2 줄일 수 있습니다.`);}
  else if(act==='travel'){if(s.pos===id)return;if(s.fuel<sector.fuel){log('연료가 부족합니다. 긴급 급유 또는 다른 성계를 선택하세요.');return;}s.fuel-=sector.fuel;s.turn++;s.pos=id;const damage=Math.max(0,sector.risk-(s.scanned.includes(id)?2:0)-(s.upgrade==='sensor'?1:0));s.hull-=damage;log(`${sector.name} 도착. 연료 ${sector.fuel} 사용, 선체 피해 ${damage}.`);}
  else if(act==='collect'){const here=sectors.find(x=>x.id===s.pos);if(!here||s.taken.includes(here.id))return;s.taken.push(here.id);s.data+=here.data;s.turn++;if(here.id==='c')s.hull--;if(s.taken.length===1)s.upgradePending=true;log(`${here.name} 자료 ${here.data}개 회수${here.id==='c'?', 외곽 위험으로 선체 피해 1':''}.${s.upgradePending?' 장비 개선을 선택하세요.':''}`);}
  else if(act==='repair'){if(s.fuel<2||s.hull>=9)return;s.fuel-=2;s.hull=Math.min(9,s.hull+3);s.turn++;log('현장 수리 완료. 연료 2를 쓰고 선체를 회복했습니다.');}
  else if(act==='refuel'){s.fuel=Math.min(11,s.fuel+3);s.hull--;s.turn++;log('긴급 급유. 연료가 늘었지만 작업 중 선체가 1 손상됐습니다.');}
  else if(act==='return'){if(s.data<4||s.fuel<2){log('귀환에는 탐사 자료 4개와 연료 2가 필요합니다.');return;}s.turn++;s.fuel-=2;s.hull--;if(s.hull>0)win(`자료 ${s.data}개를 싣고 ${s.turn}행동 만에 귀환했습니다. 남은 선체 ${s.hull}.`);else fail('귀환 중 선체가 파손됐습니다. 출발 전 선체를 2 이상 확보하거나 현장 수리를 하세요.');return;}
  if(s.hull<=0){fail(act==='refuel'?'긴급 급유 중 선체가 파손됐습니다. 선체 1일 때는 급유 대신 수리 경로를 계획하세요.':`이동 또는 채집 중 선체가 0이 됐습니다. 위험 성계를 미리 정찰하거나 현장 수리 후 이동하세요.`);return;}
  advance(8);
}
function actionSignal(act,id) {
  const s=state,t=transmissions[s.deck[s.round]];
  if(act==='analyze'){if(s.analysis<=0||s.hinted)return;s.analysis--;s.hinted=true;log(`분석 결과: ${t.hint}`);return;}
  if(act!=='reply')return;
  const choice=Number(id), correct=choice===t.answer;
  if(correct){s.trust++;s.insight++;log(`${t.options[choice]}: 의미가 통했습니다. 신뢰 +1.${s.insight===2&&!s.protocol?' 통역 자료가 쌓여 분석 기회 +1.':''}`);if(s.insight===2&&!s.protocol){s.analysis++;s.protocol=true;}}
  else{s.tension++;log(`${t.options[choice]}: 의도가 어긋났습니다. 긴장 +1. 단서의 공통 의미를 다시 살펴보세요.`);}
  s.round++;s.hinted=false;
  if(s.tension>=3){fail('오해가 세 번 누적되어 교신이 끊겼습니다. 두 단서를 함께 읽고 답신을 선택하세요.');return;}
  if(s.round>=4){if(s.trust>=3)win(`4교신에서 신뢰 ${s.trust}를 확보해 첫 접촉에 성공했습니다.`);else fail(`신뢰 ${s.trust}/3으로 대화가 끝났습니다. 분석 기회를 위험한 교신에 사용해 보세요.`);}
}
function actionPower(act,id) {
  const s=state;
  if(act==='toggle'){const i=Number(id);if(powerCells[i]?.[0]!=='wire')return;if(s.active.includes(i)){s.active=s.active.filter(x=>x!==i);s.parts++;s.turn++;log(`${powerCells[i][1]} 끔. 부품 1개를 회수했습니다.`);}else{if(s.parts<1){log('부품이 부족합니다. 부품 수거를 선택하세요.');return;}s.active.push(i);s.parts--;s.turn++;log(`${powerCells[i][1]} 켬. 연결 상태를 확인하세요.`);}}
  else if(act==='core'){if(s.repaired||s.parts<2||s.battery<=1)return;s.parts-=2;s.battery--;s.repaired=true;log('원자로 즉시 수리 완료. 행동 없이 출력을 2 늘렸지만 축전지를 1 사용했습니다.');}
  else if(act==='salvage'){s.parts+=2;s.battery--;s.turn++;log('부품 2개를 회수했지만 축전지 1을 사용했습니다.');}
  else if(act==='shift'){s.turn++;const n=powerNetwork();if(n.vitals===3&&n.capacity>=n.demand){s.stable++;log(`필수 설비 3곳에 안정 공급. ${s.stable}/2교대 유지.`);if(s.stable>=2){win(`필수 설비 3곳을 2교대 연속 유지했습니다. ${s.turn}행동, 축전지 ${s.battery}.`);return;}}else{const overloaded=n.demand>n.capacity;s.battery-=overloaded?2:1;s.stable=0;log(overloaded?`전력 과부하: 수요 ${n.demand} > 출력 ${n.capacity}. 축전지 −2.`:`필수 설비 ${n.vitals}/3만 연결됨. 축전지 −1.`);}}
  if(s.battery<=0){const n=powerNetwork();fail(act==='salvage'?'부품 수거가 마지막 축전지를 소모했습니다. 먼저 필수 설비를 연결하세요.':n.vitals<3?`축전지가 0이 됐습니다. 필수 설비 ${n.vitals}/3만 연결되어 있습니다. 차단기 경로를 먼저 완성하세요.`:'축전지가 0이 됐습니다. 모든 설비는 연결됐지만 출력이 부족합니다. 원자로 수리나 보조발전기를 연결하세요.');return;}
  advance(8);
}
app.addEventListener('click',e=>{
  const b=e.target.closest('button[data-act]');if(!b||b.disabled)return;
  const act=b.dataset.act,id=b.dataset.id;
  if(act==='start'||act==='restartNow'){state=freshState();phase='running';logs=[];message='작전을 시작했습니다. 규칙과 현재 상태를 보고 첫 행동을 고르세요.';pendingRestart=false;render();return;}
  if(act==='restartAsk'){pendingRestart=true;render();return;}
  if(act==='cancelRestart'){pendingRestart=false;render();return;}
  if(phase!=='running'||pendingRestart)return;
  if(mode==='scan')actionScan(act,id);else if(mode==='signal')actionSignal(act,id);else actionPower(act,id);
  render();
  if(mode==='signal'&&act==='reply'){app.querySelector('.scene h2')?.focus();return;}
  const selector=`button[data-act="${act}"]${id===undefined?'':`[data-id="${id}"]`}`;
  const again=app.querySelector(selector);if(again&&!again.disabled)again.focus();
});
render();
