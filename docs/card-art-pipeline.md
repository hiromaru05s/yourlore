# 카드 아트 대량 생성 플로우

카드 이미지는 카드 ID 파일명으로 자동 적용된다.

- 카드 DB: `client/src/shared/cards.ts`
- 이미지 위치: `client/public/art/cards/{CARD_ID}.webp`
- 예시: `M1` 카드는 `client/public/art/cards/M1.webp`가 있으면 자동으로 표시된다.

## 1. 누락 이미지 확인

```bash
npm run art:check
```

스타터 카드까지 포함하려면:

```bash
npm run art:check -- --include-starters
```

## 2. 프롬프트 생성

```bash
npm run art:prompts
```

생성 파일:

```text
art/prompts/card-art-prompts.jsonl
```

기본값은 이미 존재하는 이미지를 건너뛴다. 전부 다시 만들 프롬프트가 필요하면:

```bash
npm run art:prompts -- --all
```

## 3. OpenAI Image API로 일괄 생성

```bash
export OPENAI_API_KEY=...
npm run art:generate
```

테스트로 2장만 확인:

```bash
npm run art:generate -- --dry-run --limit=2
```

특정 카드만 생성:

```bash
npm run art:generate -- --only=M1,S13,T4
```

품질/모델/크기 변경:

```bash
OPENAI_IMAGE_MODEL=gpt-image-2 OPENAI_IMAGE_SIZE=1024x1536 OPENAI_IMAGE_QUALITY=medium npm run art:generate
```

## 새 카드 대량 추가할 때

1. `client/src/shared/cards.ts`에 카드들을 추가한다.
2. `npm run art:check`로 빠진 이미지를 본다.
3. `npm run art:prompts`로 누락 카드 프롬프트만 만든다.
4. `npm run art:generate`로 이미지를 생성한다.
5. 앱은 `{CARD_ID}.webp`를 자동으로 카드 안에 표시한다.
