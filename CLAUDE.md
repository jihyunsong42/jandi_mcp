# Jandi MCP Server

Jandi 메신저의 채널/DM 메시지를 Claude Desktop/Code에서 조회할 수 있는 MCP 서버입니다.

## 설치

```bash
npm install
npm run build
```

## 환경변수 설정

`.env.example`을 복사하여 `.env` 파일을 생성하고 값을 채워주세요.

### 방법 1: 이메일/비밀번호 로그인 (권장)

```env
JANDI_EMAIL=your_email@example.com
JANDI_PASSWORD=your_password
```

MCP 서버가 시작될 때 headless 브라우저로 자동 로그인하여 토큰을 획득합니다.

### 방법 2: Refresh Token 직접 설정

```env
JANDI_REFRESH_TOKEN=your_refresh_token_here
```

Refresh token을 수동으로 추출하여 설정하는 방법입니다.

#### Refresh Token 추출 방법

1. 브라우저에서 `jandi.com` 접속 후 로그인
2. F12 → Network 탭 열기
3. 아무 API 요청 클릭 → Headers 탭
4. Response 탭에서 `refresh_token` 값 복사

> **참고**: 이메일/비밀번호 방식을 사용하면 토큰 갱신이 자동으로 처리됩니다.

## Claude Desktop 설정

`%APPDATA%\Claude\claude_desktop_config.json` 파일에 추가:

### 방법 A: npm link 사용 (권장)

프로젝트 디렉토리에서 `npm link`를 실행한 후:

```json
{
  "mcpServers": {
    "jandi": {
      "command": "jandi-mcp",
      "env": {
        "JANDI_EMAIL": "your_email@example.com",
        "JANDI_PASSWORD": "your_password"
      }
    }
  }
}
```

### 방법 B: 직접 경로 지정

```json
{
  "mcpServers": {
    "jandi": {
      "command": "node",
      "args": ["C:\\Users\\dev\\Desktop\\dsstore\\dongascience_jandi_mcp\\dist\\index.js"],
      "env": {
        "JANDI_EMAIL": "your_email@example.com",
        "JANDI_PASSWORD": "your_password"
      }
    }
  }
}
```

또는 refresh token을 직접 설정:

```json
{
  "mcpServers": {
    "jandi": {
      "command": "node",
      "args": ["C:\\Users\\dev\\Desktop\\dsstore\\dongascience_jandi_mcp\\dist\\index.js"],
      "env": {
        "JANDI_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

설정 후 Claude Desktop을 재시작하세요.

## 제공 도구

### jandi_get_rooms

팀의 채널, 토픽, DM 목록을 조회합니다.

- 파라미터: 없음
- 반환: 채널/토픽 목록, 1:1 DM 목록, 그룹 DM 목록

### jandi_get_messages

특정 채널 또는 DM의 메시지를 조회합니다.

- 파라미터:
  - `roomId` (필수): 채널/DM ID
  - `count` (선택, 기본값: 30): 가져올 메시지 수
- 반환: 메시지 목록

### jandi_get_comments

특정 게시물의 댓글을 조회합니다.

- 파라미터:
  - `postId` (필수): 게시물 ID
  - `count` (선택, 기본값: 10): 가져올 댓글 수
- 반환: 댓글 목록

## 사용 예시

```
# 채널 목록 보기
jandi_get_rooms

# 특정 채널 메시지 조회
jandi_get_messages roomId="31403834" count=10

# 특정 게시물 댓글 조회
jandi_get_comments postId="4836099780" count=5
```

## 개발 및 테스트

코드 수정 후 테스트할 때는 MCP 서버가 아닌 직접 서버를 실행하여 테스트합니다.

```bash
# 빌드
npm run build

# 직접 실행하여 테스트
node dist/index.js
```

MCP Inspector를 사용하여 테스트할 수도 있습니다:

```bash
npx @anthropic/mcp-inspector node dist/index.js
```

## 주의사항

- 이메일/비밀번호 로그인 시 첫 시작에 headless 브라우저가 실행되어 몇 초 지연될 수 있습니다.
- 2FA(이중 인증)가 활성화된 계정은 이메일/비밀번호 로그인이 작동하지 않을 수 있습니다.
- 비공식 API를 사용하므로 Jandi 업데이트 시 동작하지 않을 수 있습니다.
