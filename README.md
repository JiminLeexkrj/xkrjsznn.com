# xkrjsznn.com

이지민의 개인 사이트입니다. 방문자에게는 포트폴리오를 보여 주고, 주인에게는 일정을 관리하고 공부하는 공간을 엽니다.

## 구조

```
src/
  app/
    page.tsx              공개 페이지 (정적)
    login/                주인 로그인 (GitHub)
    auth/callback/        GitHub에서 돌아오는 곳. 주인이 아니면 바로 로그아웃
    me/                   주인만 쓰는 공간
      page.tsx            오늘 할 일과 앞으로 14일
      calendar/page.tsx   월간 달력
      actions.ts          일정 추가, 고치기, 완료, 삭제
      study/              공부 공간. 과목별 프로젝트 → PDF → 페이지별 해설
        actions.ts        프로젝트 만들기와 이름 바꾸기, PDF 올리기, 지우기
    api/lms-sync/         KU LMS+ 확장이 LMS 목록을 보내는 곳
    api/study/explain/    PDF 한 페이지의 해설을 OpenAI로 쓰고 저장한다
  components/me/          내 공간의 화면 조각
  components/study/       공부 공간의 화면 조각. StudyViewer가 PDF와 해설을 나란히 보여 준다
  content/                공개 페이지의 내용. 프로젝트와 수상은 여기에 추가한다
  lib/
    auth.ts               주인인지 확인한다 (requireOwner)
    events.ts             일정 읽기 (서버 전용)
    event-types.ts        일정의 모양과 종류
    lms.ts                LMS 항목 읽기 (서버 전용)
    lms-types.ts          LMS 항목의 모양과 사이트에 보여 줄 단계
    day-items.ts          하루의 일정과 LMS 항목을 시각 순으로 합친다
    study.ts              프로젝트, PDF, 해설 읽기 (서버 전용)
    study-types.ts        공부 공간의 모양과 한도
    openai.ts             해설 프롬프트와 OpenAI 호출 (서버 전용)
    pdfjs.ts              브라우저에서 PDF 열기, 페이지 글자와 그림 뽑기
    dates.ts              날짜 계산. '오늘'은 서울 시간 기준
    supabase/             Supabase 클라이언트
  proxy.ts                로그인 세션 갱신
supabase/migrations/      데이터베이스 스키마
```

주인 확인은 세 겹입니다. proxy가 로그인하지 않은 방문자를 로그인 화면으로 보내고, 모든 페이지와 액션이 `requireOwner()`로 이메일을 확인하고, 데이터베이스의 RLS가 자기 일정만 읽고 쓰게 합니다.

## 처음 설정

1. [Supabase](https://supabase.com)에서 프로젝트를 만든다.
2. SQL Editor에 `supabase/migrations/` 안의 SQL을 파일 이름 순서대로 하나씩 붙여 넣고 실행한다.
3. GitHub에서 OAuth 앱을 만든다 (Settings > Developer settings > OAuth Apps).
   - Authorization callback URL: `https://<프로젝트>.supabase.co/auth/v1/callback`
4. Supabase의 Authentication > Sign In / Providers > GitHub에 Client ID와 Secret을 넣고 켠다.
5. Supabase의 Authentication > URL Configuration
   - Site URL: `https://xkrjsznn.com`
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://xkrjsznn.com/auth/callback`
6. `.env.example`을 `.env.local`로 복사하고 값을 채운다. Vercel의 Environment Variables에도 같은 값을 넣는다.
7. 한 번 로그인한 뒤, Authentication > Sign In / Providers에서 **Allow new users to sign up**을 끈다. 다른 사람이 계정을 만들 수 없게 된다.

## LMS 연동

KU LMS+ 확장(원본은 `C:\KuLmsPlus\extension`)이 LMS에서 불러온 과제, 퀴즈, 수업 일정, 영상 출석 마감을 `POST /api/lms-sync`로 보낸다. 확장은 같은 Chrome에 있는 이 사이트의 로그인 쿠키로 부르므로 주인 확인과 RLS는 다른 페이지와 같고, 사이트는 `LMS_EXTENSION_ID`와 같은 확장이 보낸 요청만 받는다. LMS 항목은 `lms_marks`에 따로 두고 사이트에서는 읽기만 한다.

1. `chrome://extensions`에서 확장 카드의 ID를 `LMS_EXTENSION_ID`로 `.env.local`과 Vercel에 넣는다. 압축해제한 확장의 ID는 폴더 경로로 정해지므로, 폴더를 옮기면 ID도 바뀐다.
2. 같은 Chrome에서 사이트에 로그인해 둔다.
3. 확장의 캘린더에서 새로고침하면 사이트로도 보낸다. 상단에 "사이트에 반영됨"이 뜨면 된다.

어떤 단계를 사이트에 보여 줄지는 `src/lib/lms-types.ts`의 `SHOWN_STAGES`에서 정한다.

## 공부 공간

`/me/study`에서 과목마다 프로젝트를 만들고 PDF를 올리면, 페이지마다 OpenAI가 쓴 해설이 PDF 옆에 나란히 붙는다. 해설은 `study_explanations`에 저장되므로 다시 열면 그대로 보이고, 마지막으로 보던 페이지에서 다시 시작한다.

- **올리기**: Vercel 함수는 4.5MB가 넘는 요청을 받지 못하므로, 서버가 서명 업로드 표를 내주고 브라우저가 Supabase Storage의 비공개 버킷 `study-pdfs`에 바로 올린다. 파일 하나에 50MB까지.
- **해설 쓰기**: 뷰어가 열려 있는 동안, 지금 페이지부터 비어 있는 페이지를 두 장씩 채운다. 브라우저가 페이지를 JPEG와 글자로 뽑아 `/api/study/explain`에 보내고, 서버가 모델을 부른 뒤 저장한다. 뷰어를 닫으면 멈추고, 다시 열면 남은 페이지부터 이어 쓴다.
- **환경 변수**: `OPENAI_API_KEY`(필수), `OPENAI_MODEL`(기본 `gpt-6-luna`), `OPENAI_REASONING_EFFORT`(선택). `.env.local`과 Vercel에 같은 값을 넣는다.
- 프롬프트는 `src/lib/openai.ts`의 `INSTRUCTIONS`에서 고친다.

## 개발

```bash
npm install
npm run dev
```
