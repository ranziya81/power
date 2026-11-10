# 하루의 문장 — Voice Diary MVP

Supabase + HTML/CSS/JavaScript 기반 개인 음성 일기 웹앱입니다.

## 구현 기능
- 이메일/비밀번호 회원가입·로그인·로그아웃 (Supabase Auth)
- 브라우저 음성 인식으로 한국어 받아쓰기 (Web Speech API)
- 개인 일기 저장·조회·수정·삭제
- 작성 날짜 선택 및 필터
- 반응형 모바일·PC 레이아웃
- 사용자별 접근 제어(RLS): 본인 일기만 조회/수정/삭제 가능

## 실행하기

1. 이 폴더를 VS Code로 열고 Live Server 또는 `python -m http.server 5500` 등 로컬 웹서버로 실행합니다. `file://` 직접 열기는 권장하지 않습니다.
2. `http://localhost:5500`으로 접속합니다.
3. 이메일과 비밀번호로 가입합니다. Supabase Auth의 이메일 확인 설정이 켜져 있으면 이메일 링크를 확인한 뒤 로그인합니다.
4. 말로 일기 쓰기 버튼을 눌러 마이크 권한을 허용합니다.
5. 일기를 저장하고 오른쪽 목록에서 확인합니다.

## Supabase
- 프로젝트: `voice-diary` (`uyvyibxsitemypmhuxgl`)
- 테이블: `public.diary_entries`
- RLS: 소유자(`auth.uid() = user_id`)만 접근 가능
- 접속 URL과 **publishable key**만 `config.js`에 포함되어 있습니다. publishable key는 공개 웹앱에 사용하도록 설계된 키입니다. **service_role/secret key는 절대로 클라이언트 코드나 GitHub에 올리지 마세요.**

## 주의 및 제한
- 음성은 브라우저 Web Speech API로 인식합니다. 브라우저 지원과 음성 인식 서비스/네트워크에 따라 동작 여부가 달라집니다. Chrome/Edge 권장, 배포시 HTTPS 필요.
- 음성 파일은 저장하지 않으며, 받아쓴 텍스트만 데이터베이스에 저장합니다. 브라우저 음성 인식 기능은 외부 음성 인식 서비스를 사용할 수 있으므로 민감한 녹음에 주의하세요.
- 일기 목록은 최신 최대 500건까지만 보여줍니다. 정식 사용 시 페이지네이션 구현 권장.
- 실제 서비스 전 이메일 인증, 로그인 제한, RLS, 데이터 백업 등을 점검하세요.
- GitHub Pages/Netlify/Vercel 등 정적 호스팅을 지원합니다.