# Jandi MCP Server

Jandi 메신저의 채널/DM 메시지를 Claude Desktop/Code에서 조회할 수 있는 MCP 서버입니다.

## 설치

```bash
npm install
npm run build
```

## 환경변수 설정

`.env.example`을 복사하여 `.env` 파일을 생성하고 값을 채워주세요.

```env
JANDI_ACCESS_TOKEN=your_jwt_token_here
JANDI_TEAM_ID=your_team_id
JANDI_MEMBER_ID=your_member_id
JANDI_ACCOUNT_ID=your_account_id
```

### 토큰 추출 방법

1. 브라우저에서 `jandi.com` 접속 후 로그인
2. F12 → Network 탭 열기
3. 아무 API 요청 클릭 → Headers 탭
4. 다음 값들을 복사:
   - `authorization` 헤더에서 `bearer ` 뒤의 토큰
   - `x-team-id`, `x-member-id`, `x-account-id` 값

## Claude Desktop 설정

`%APPDATA%\Claude\claude_desktop_config.json` 파일에 추가:

```json
{
  "mcpServers": {
    "jandi": {
      "command": "node",
      "args": ["C:\\Users\\dev\\Desktop\\dsstore\\dongascience_jandi_mcp\\dist\\index.js"],
      "env": {
        "JANDI_ACCESS_TOKEN": "your_token",
        "JANDI_TEAM_ID": "your_team_id",
        "JANDI_MEMBER_ID": "your_member_id",
        "JANDI_ACCOUNT_ID": "your_account_id"
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

## 주의사항

- JWT 토큰은 만료됩니다. 401 오류 발생 시 토큰을 새로 추출하세요.
- 비공식 API를 사용하므로 Jandi 업데이트 시 동작하지 않을 수 있습니다.
