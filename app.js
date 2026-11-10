import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
const state = { user: null, dbReady: false, entries: [], editingId: null, recognition: null, listening: false, speechBase: '', speechFinal: '' };
const DEMO_STORAGE_KEY='voice-diary-demo-entries-v1';
function demoEntries(){try{return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY)||'[]');}catch{return [];}}
function setDbStatus(message,ok=false){const el=$('dbStatus');el.textContent=message;el.style.background=ok?'#edf5eb':'#fff3d8';el.style.borderColor=ok?'#b9d3b6':'#e9d2a3';el.style.color=ok?'#35533a':'#775b25';}
function persistDemo(){localStorage.setItem(DEMO_STORAGE_KEY,JSON.stringify(state.entries));}
let toastTimer;
function toast(message) { const el=$('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),3500); }
function todayLocal() { const d = new Date(); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function setMessage(id, message, isError=false) { const el=$(id); el.textContent=message; el.style.color=isError?'#b6534e':'#657b61'; }
function readableError(err){return String(err?.message||err||'알 수 없는 오류');}
$('todayLabel').textContent=new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(new Date());
function resetEditor(){stopSpeech();state.editingId=null;$('diaryForm').reset();$('entryDate').value=todayLocal();$('editorHeading').textContent='새로운 일기';$('editPill').textContent='새 기록';$('saveBtn').textContent='일기 저장하기 ↗';setMessage('editorMessage','');}
$('clearBtn').addEventListener('click',resetEditor);
async function loadEntries(){
 if(!state.dbReady||!state.user)return;
 const {data,error}=await db.from('diary_entries').select('id,title,content,entry_date,created_at').eq('user_id',state.user.id).order('entry_date',{ascending:false}).order('created_at',{ascending:false}).limit(500);
 if(error){setDbStatus('⚠ DB 조회 실패: '+readableError(error));toast('일기 불러오기에 실패했습니다.');return;}
 state.entries=data||[];renderEntries();
}
async function importOldLocalEntries(){
 const local=demoEntries();if(!Array.isArray(local)||local.length===0)return;
 const records=local.filter(e=>e&&e.entry_date&&typeof e.content==='string').map(e=>({
  id:(typeof e.id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e.id))?e.id:crypto.randomUUID(),
  user_id:state.user.id, title:String(e.title||''), content:e.content,entry_date:e.entry_date,created_at:e.created_at||new Date().toISOString(),updated_at:e.updated_at||new Date().toISOString()
 }));
 if(records.length===0)return;
 const {error}=await db.from('diary_entries').upsert(records,{onConflict:'id'});
 if(error){setDbStatus('⚠ 기존 브라우저 기록을 DB로 옮기지 못했습니다. 원본은 브라우저에 남아 있습니다: '+readableError(error));return;}
 try{localStorage.removeItem(DEMO_STORAGE_KEY);}catch{}
 toast('기존 체험 일기 '+records.length+'개를 DB로 옮겼습니다.');
}
async function initializeDatabase(){
 $('saveBtn').disabled=true;setDbStatus('⏳ Supabase DB 연결 중입니다…');
 try{
  const {data:existing,error:sessionError}=await db.auth.getSession();if(sessionError)throw sessionError;
  let session=existing.session;
  if(!session){
   const {data,error}=await db.auth.signInAnonymously();if(error)throw error;session=data.session;
  }
  if(!session?.user)throw Error('익명 사용자 세션을 만들지 못했습니다.');
  state.user=session.user;state.dbReady=true;
  setDbStatus('✓ Supabase DB 연결됨 · 로그인 화면 없이 자동으로 저장합니다. 현재 브라우저의 익명 계정에 연결된 기록입니다.',true);
  await importOldLocalEntries();await loadEntries();
 }catch(error){
  state.dbReady=false;
  const msg=readableError(error);
  const hint=/anonymous|disabled|not allowed/i.test(msg)?'Supabase → Authentication → Settings에서 Allow anonymous sign-ins를 켜세요. ':'';
  setDbStatus('⚠ DB 연결 실패. '+hint+msg);
  setMessage('editorMessage','DB 연결이 필요합니다. 위 안내에 따라 설정하고 새로고침하세요.',true);
 }finally{$('saveBtn').disabled=!state.dbReady;}
}
resetEditor();
initializeDatabase();
function renderEntries(){const filter=$('filterDate').value;const rows=filter?state.entries.filter(e=>e.entry_date===filter):state.entries;$('entryCount').textContent=String(rows.length);const container=$('entryList');container.replaceChildren();if(rows.length===0){const p=document.createElement('div');p.className='empty';p.textContent=filter?'이 날짜에는 아직 기록이 없어요.':'아직 기록이 없어요.\n오늘의 첫 일기를 남겨보세요.';p.style.whiteSpace='pre-line';container.append(p);return;}for(const entry of rows){const article=document.createElement('article');article.className='entry-item';const date=document.createElement('div');date.className='date';date.textContent=entry.entry_date;const title=document.createElement('h3');title.textContent=entry.title||'제목 없는 하루';const body=document.createElement('p');const value=entry.content||'내용 없음';body.textContent=value.length>150?value.slice(0,150)+'…':value;const actions=document.createElement('div');actions.className='item-actions';const edit=document.createElement('button');edit.type='button';edit.textContent='수정';edit.addEventListener('click',()=>editEntry(entry.id));const del=document.createElement('button');del.type='button';del.className='danger';del.textContent='삭제';del.addEventListener('click',()=>deleteEntry(entry.id));actions.append(edit,del);article.append(date,title,body,actions);container.append(article);}}
function editEntry(id){const e=state.entries.find(e=>e.id===id);if(!e)return;stopSpeech();state.editingId=id;$('entryDate').value=e.entry_date;$('entryTitle').value=e.title||'';$('entryContent').value=e.content||'';$('editorHeading').textContent='일기 수정하기';$('editPill').textContent='수정 중';$('saveBtn').textContent='수정 내용 저장 ↗';setMessage('editorMessage','');$('diaryForm').scrollIntoView({behavior:'smooth',block:'start'});}
async function deleteEntry(id){
 if(!state.dbReady||!state.user){toast('DB 연결 후 삭제할 수 있습니다.');return;}
 if(!confirm('이 일기를 정말 삭제할까요? 삭제한 내용은 복구할 수 없습니다.'))return;
 const {error}=await db.from('diary_entries').delete().eq('id',id).eq('user_id',state.user.id);
 if(error){toast('삭제 실패: '+readableError(error));return;}
 if(state.editingId===id)resetEditor();toast('DB에서 일기를 삭제했습니다.');await loadEntries();
}
$('diaryForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!state.dbReady||!state.user){setMessage('editorMessage','Supabase DB가 연결되지 않았습니다.',true);return;}
 stopSpeech();const content=$('entryContent').value.trim();
 if(!content){setMessage('editorMessage','일기 내용을 입력하거나 음성으로 말해 주세요.',true);return;}
 const payload={user_id:state.user.id,title:$('entryTitle').value.trim(),content,entry_date:$('entryDate').value,updated_at:new Date().toISOString()};
 const btn=$('saveBtn');btn.disabled=true;setMessage('editorMessage','DB에 저장 중입니다…');
 try{
  const result=state.editingId?
   await db.from('diary_entries').update(payload).eq('id',state.editingId).eq('user_id',state.user.id).select('id').single():
   await db.from('diary_entries').insert(payload).select('id').single();
  if(result.error)throw result.error;
  resetEditor();toast('Supabase DB에 저장했습니다.');await loadEntries();
 }catch(err){setMessage('editorMessage','DB 저장 실패: '+readableError(err),true);}
 finally{btn.disabled=!state.dbReady;}
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