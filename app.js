const $ = id => document.getElementById(id);
const state = { entries: [], editingId: null, recognition: null, listening: false, speechBase: '', speechFinal: '' };
const DEMO_STORAGE_KEY='voice-diary-demo-entries-v1';
function demoEntries(){try{return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY)||'[]');}catch{return [];}}
function persistDemo(){localStorage.setItem(DEMO_STORAGE_KEY,JSON.stringify(state.entries));}
let toastTimer;
function toast(message) { const el=$('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),3500); }
function todayLocal() { const d = new Date(); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function setMessage(id, message, isError=false) { const el=$(id); el.textContent=message; el.style.color=isError?'#b6534e':'#657b61'; }
function readableError(err){return String(err?.message||err||'알 수 없는 오류');}
$('todayLabel').textContent=new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(new Date());
function resetEditor(){stopSpeech();state.editingId=null;$('diaryForm').reset();$('entryDate').value=todayLocal();$('editorHeading').textContent='새로운 일기';$('editPill').textContent='새 기록';$('saveBtn').textContent='일기 저장하기 ↗';setMessage('editorMessage','');}
$('clearBtn').addEventListener('click',resetEditor);
async function loadEntries(){state.entries=demoEntries().sort((a,b)=>b.entry_date.localeCompare(a.entry_date)||b.created_at.localeCompare(a.created_at));renderEntries();}
resetEditor();
loadEntries();
function renderEntries(){const filter=$('filterDate').value;const rows=filter?state.entries.filter(e=>e.entry_date===filter):state.entries;$('entryCount').textContent=String(rows.length);const container=$('entryList');container.replaceChildren();if(rows.length===0){const p=document.createElement('div');p.className='empty';p.textContent=filter?'이 날짜에는 아직 기록이 없어요.':'아직 기록이 없어요.\n오늘의 첫 일기를 남겨보세요.';p.style.whiteSpace='pre-line';container.append(p);return;}for(const entry of rows){const article=document.createElement('article');article.className='entry-item';const date=document.createElement('div');date.className='date';date.textContent=entry.entry_date;const title=document.createElement('h3');title.textContent=entry.title||'제목 없는 하루';const body=document.createElement('p');const value=entry.content||'내용 없음';body.textContent=value.length>150?value.slice(0,150)+'…':value;const actions=document.createElement('div');actions.className='item-actions';const edit=document.createElement('button');edit.type='button';edit.textContent='수정';edit.addEventListener('click',()=>editEntry(entry.id));const del=document.createElement('button');del.type='button';del.className='danger';del.textContent='삭제';del.addEventListener('click',()=>deleteEntry(entry.id));actions.append(edit,del);article.append(date,title,body,actions);container.append(article);}}
function editEntry(id){const e=state.entries.find(e=>e.id===id);if(!e)return;stopSpeech();state.editingId=id;$('entryDate').value=e.entry_date;$('entryTitle').value=e.title||'';$('entryContent').value=e.content||'';$('editorHeading').textContent='일기 수정하기';$('editPill').textContent='수정 중';$('saveBtn').textContent='수정 내용 저장 ↗';setMessage('editorMessage','');$('diaryForm').scrollIntoView({behavior:'smooth',block:'start'});}
async function deleteEntry(id){
 if(!confirm('이 일기를 정말 삭제할까요? 삭제한 내용은 복구할 수 없습니다.'))return;
 const before=state.entries;state.entries=state.entries.filter(e=>e.id!==id);
 try{persistDemo();}catch(e){state.entries=before;toast('브라우저 저장소에 접근할 수 없습니다.');return;}
 if(state.editingId===id)resetEditor();
 toast('일기를 삭제했습니다.');await loadEntries();
}
$('diaryForm').addEventListener('submit',async e=>{
 e.preventDefault();stopSpeech();const content=$('entryContent').value.trim();
 if(!content){setMessage('editorMessage','일기 내용을 입력하거나 음성으로 말해 주세요.',true);return;}
 const payload={title:$('entryTitle').value.trim(),content,entry_date:$('entryDate').value,updated_at:new Date().toISOString()};
 const btn=$('saveBtn');btn.disabled=true;setMessage('editorMessage','저장 중입니다…');
 try{
  const now=new Date().toISOString();const before=state.entries.map(e=>({...e}));
  if(state.editingId){const idx=state.entries.findIndex(e=>e.id===state.editingId);if(idx<0)throw Error('수정할 일기를 찾지 못했습니다.');state.entries[idx]={...state.entries[idx],...payload};}
  else state.entries.push({...payload,id:crypto.randomUUID(),created_at:now});
  try{persistDemo();}catch(err){state.entries=before;throw err;}
  resetEditor();toast('이 브라우저에 일기를 저장했습니다.');await loadEntries();
 }catch(err){setMessage('editorMessage',`저장 실패: ${readableError(err)}`,true);}
 finally{btn.disabled=false;}
});
$('filterDate').addEventListener('change',renderEntries);$('resetFilterBtn').addEventListener('click',()=>{$('filterDate').value='';renderEntries();});
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(!SpeechRecognition){$('recordBtn').disabled=true;$('speechStatus').textContent='이 브라우저는 음성 인식을 지원하지 않아요. Chrome이나 Edge에서 HTTPS로 열어 주세요.';}else{
  const recognition=new SpeechRecognition();state.recognition=recognition;recognition.lang='ko-KR';recognition.continuous=true;recognition.interimResults=true;
  recognition.onstart=()=>{state.listening=true;updateSpeechUi();};
  recognition.onresult=event=>{let interim='';for(let i=event.resultIndex;i<event.results.length;i++){const text=event.results[i][0].transcript;if(event.results[i].isFinal)state.speechFinal+=text+' ';else interim+=text;}const parts=[state.speechBase,state.speechFinal.trim(),interim.trim()].filter(Boolean);$('entryContent').value=parts.join(parts.length>1?'\n':'');};
  recognition.onerror=event=>{const messages={not_allowed:'마이크 사용을 허용해 주세요.',no_speech:'음성이 들리지 않았어요. 다시 시도해 주세요.',audio_capture:'마이크를 찾을 수 없습니다.',network:'음성 인식 네트워크에 문제가 있어요.'};$('speechStatus').textContent=messages[event.error]||`음성 인식 오류: ${event.error}`;};
  recognition.onend=()=>{state.listening=false;updateSpeechUi();};
}
function updateSpeechUi(){const on=state.listening;$('recordBtn').classList.toggle('recording',on);$('recordBtn').setAttribute('aria-pressed',String(on));$('recordLabel').textContent=on?'녹음 종료':'말로 일기 쓰기';if(on)$('speechStatus').textContent='듣고 있어요. 편하게 말씀해 주세요.';else if($('speechStatus').textContent==='듣고 있어요. 편하게 말씀해 주세요.')$('speechStatus').textContent='음성 인식이 종료됐어요.';}
function stopSpeech(){if(state.recognition&&state.listening){state.recognition.stop();state.listening=false;updateSpeechUi();}}
$('recordBtn').addEventListener('click',()=>{if(!state.recognition)return;if(state.listening){stopSpeech();return;}state.speechBase=$('entryContent').value.trim();state.speechFinal='';try{state.recognition.start();}catch(e){$('speechStatus').textContent='마이크 시작에 실패했어요. 다시 시도해 주세요.';}});