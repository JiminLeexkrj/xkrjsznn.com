# xkrjsznn.com

이지민의 개인 사이트입니다. 방문자에게는 포트폴리오를 보여 주고, 주인에게는 일정을 관리하는 공간을 엽니다.

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
  components/me/          내 공간의 화면 조각
  content/                공개 페이지의 내용. 프로젝트와 수상은 여기에 추가한다
  lib/
    auth.ts               주인인지 확인한다 (requireOwner)
    events.ts             일정 읽기 (서버 전용)
    event-types.ts        일정의 모양과 종류
    dates.ts              날짜 계산. '오늘'은 서울 시간 기준
    supabase/             Supabase 클라이언트
  proxy.ts                로그인 세션 갱신
supabase/migrations/      데이터베이스 스키마
```

주인 확인은 세 겹입니다. proxy가 로그인하지 않은 방문자를 로그인 화면으로 보내고, 모든 페이지와 액션이 `requireOwner()`로 이메일을 확인하고, 데이터베이스의 RLS가 자기 일정만 읽고 쓰게 합니다.

## 처음 설정

1. [Supabase](https://supabase.com)에서 프로젝트를 만든다.
2. SQL Editor에 `supabase/migrations/` 안의 SQL을 붙여 넣고 실행한다.
3. GitHub에서 OAuth 앱을 만든다 (Settings > Developer settings > OAuth Apps).
   - Authorization callback URL: `https://<프로젝트>.supabase.co/auth/v1/callback`
4. Supabase의 Authentication > Sign In / Providers > GitHub에 Client ID와 Secret을 넣고 켠다.
5. Supabase의 Authentication > URL Configuration
   - Site URL: `https://xkrjsznn.com`
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://xkrjsznn.com/auth/callback`
6. `.env.example`을 `.env.local`로 복사하고 값을 채운다. Vercel의 Environment Variables에도 같은 값을 넣는다.
7. 한 번 로그인한 뒤, Authentication > Sign In / Providers에서 **Allow new users to sign up**을 끈다. 다른 사람이 계정을 만들 수 없게 된다.

## 개발

```bash
npm install
npm run dev
```
