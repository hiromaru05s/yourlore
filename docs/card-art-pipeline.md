# 카드 아트 대량 생성 플로우

카드 이미지는 카드 ID 파일명으로 자동 적용된다.

- 카드 DB: `client/src/shared/cards.ts`
- 이미지 위치: `client/public/art/cards/{CARD_ID}.webp`
- 예시: `M1` 카드는 `client/public/art/cards/M1.webp`가 있으면 자동으로 표시된다.
- 아트 디렉션과 정확한 규격: `docs/card-art-direction.md`
- 최종 아트 규격: `1472x1344` WebP (quality 92)

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

## 3. OpenAI ImageGen으로 일괄 생성

```bash
export OPENAI_API_KEY=...
npm run art:generate
```

기본값은 OpenAI `gpt-image-2`, `1472x1344`, `high`다.

테스트로 2장만 확인:

```bash
npm run art:generate -- --dry-run --limit=2
```

특정 카드만 생성:

```bash
npm run art:generate -- --only=M1,S13,T4
```

이미 있는 이미지까지 덮어쓰기:

```bash
npm run art:generate -- --only=M1 --force
```

Replicate를 명시적으로 사용할 때:

```bash
export REPLICATE_API_TOKEN=...
npm run art:generate -- --provider=replicate --model=black-forest-labs/flux-schnell
```

OpenAI 모델을 명시해서 재생성:

```bash
export OPENAI_API_KEY=...
npm run art:generate -- --provider=openai --model=gpt-image-2 --only=M7,M13,S13 --force
```

## 새 카드 대량 추가할 때

1. `client/src/shared/cards.ts`에 카드들을 추가한다.
2. `npm run art:check`로 빠진 이미지를 본다.
3. `npm run art:prompts`로 누락 카드 프롬프트만 만든다.
4. `npm run art:generate`로 이미지를 생성한다.
5. 앱은 `{CARD_ID}.webp`를 자동으로 카드 안에 표시한다.

## 축소본(size variant) — 새 아트를 넣은 뒤 반드시 실행

원본은 832x1216(일부 1024x1536), 장당 ~165KB다. 그런데 줌 오버레이(카드 폭 400px)를
빼면 카드 아트가 화면에 그려지는 크기는 **최대 150 CSS px**(마켓/손패), 아카이브
그리드는 ~93px, 아바타는 22~74px다. 원본을 그대로 내보내면 카드 아카이브 한 화면에
57MB, 프로필 아바타 선택기에 33MB를 받게 된다 — "카드 이미지가 비정상적으로 느리다"의
정체가 이것이다.

```bash
npm run art:optimize            # 새로/바뀐 것만
npm run art:optimize -- --force # 전부 다시
```

생성물:

| 경로 | 크기 | 쓰이는 곳 |
| --- | --- | --- |
| `art/cards/{ID}.webp` | 832w, ~165KB | 줌 오버레이 **전용** |
| `art/cards/w384/{ID}.webp` | 384w, ~17KB | 아카이브 / 덱 / 마켓 / 손패 / 필드 |
| `art/cards/w128/{ID}.webp` | 128w, ~3KB | 아바타, 미니 썸네일 |

- 클라이언트에서 이 규칙을 아는 유일한 곳은 `cardArtSrc()`(`client/src/ui/cardView.ts`)다.
  경로 규칙을 바꾸려면 그 함수와 `scripts/optimize-card-art.mjs`의 `VARIANTS`를 같이 고친다.
- 축소본이 없으면 원본으로 자동 폴백한다(깨지지는 않고 그냥 느려진다).
  `npm run art:check`가 빠진/오래된 축소본을 알려준다.

## 새 카드 대량 추가할 때 (요약)

1. `client/src/shared/cards.ts`에 카드들을 추가한다.
2. `npm run art:check` → 빠진 이미지 확인.
3. `npm run art:prompts` → 누락 카드 프롬프트 생성.
4. `npm run art:generate` → 이미지 생성.
5. **`npm run art:optimize` → 축소본 생성.** (빠뜨리면 원본이 그대로 나가 느려진다)
6. 앱은 `{CARD_ID}.webp`를 자동으로 카드 안에 표시한다.
