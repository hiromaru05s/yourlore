# LORE 카드 아트 디렉션 v2

## 납품 규격

- 대상: 카드 프레임 안쪽의 아트만
- 정확한 캔버스: `1472 × 1344 px`
- 비율: `1.095:1` 가로형
- 저장: `{CARD_ID}.webp`
- 권장 WebP 품질: `92`
- 프레임, 카드명, 코스트, 효과문, 로고, 워터마크는 이미지에 넣지 않는다.
- 프레임이 가장자리를 덮으므로 핵심 피사체와 효과는 중앙 80% 안에 둔다.

현재 카드 전체는 세로형이지만 실제 아트 창은 `left 7%`, `right 6.4%`,
`top 13.8%`, `height 50.6%`인 가로형이다. 따라서 카드 전체 비율로 이미지를
만들지 않고, 안쪽 아트 창 비율에 직접 맞춘다.

## 공통 세계관 프롬프트

```text
Create one finished LORE TCG inner-art illustration on an exact 1472x1344 pixel
landscape canvas (aspect ratio 1.095:1). This is the artwork inside the card
frame, not a full card mockup.

World art bible: an original, timeworn royal archive in a dark-fantasy world;
blackened oak, weathered black stone, aged brass, parchment ivory, candle amber,
oxblood red, and restrained cobalt or malachite magical accents.

Rendering: premium hand-painted late-2000s dark-fantasy PC game concept art,
confident brush texture, strong silhouette, dramatic chiaroscuro, grounded
materials, restrained ornament, readable at thumbnail size.

Avoid glossy mobile-game 3D, plastic surfaces, anime styling, modern objects,
photorealistic photography, and recognizable characters or logos from existing
franchises.
```

이 공통 블록 뒤에 카드 타입 규칙, 카드명/ID/효과, 카드별 시각 브리프가
자동으로 붙는다.

## 타입별 연출 문법

### 몬스터

- 기본은 주 피사체 한 개만 사용한다.
- 소환·군단 카드가 아니라면 복제된 인물이나 의미 없는 군중을 두지 않는다.
- 피사체는 화면의 약 55~72%를 차지하고 실루엣만으로 식별 가능해야 한다.
- 스탯은 숫자로 그리지 않고 체격, 자세, 장비의 무게로 표현한다.

### 마법

- 사람보다 현상, 유물, 공간, 작동 원리를 먼저 그린다.
- 카드의 정체성이 인물 자체가 아닌 이상 사람, 마법사, 얼굴, 손을 넣지 않는다.
- 단순한 빛 덩어리 대신 무엇이 무엇에 작용하는지 한 장면에서 읽혀야 한다.
- 드로우는 서고/봉인 문서, 회복은 생명 유물, 버프는 무기/문양, 파괴는
  구조적 균열처럼 효과 계열별 시각 언어를 공유한다.

### 함정

- 함정 장치가 발동하는 바로 그 순간을 근접 구도로 보여준다.
- 사람, 전사 피해자, 얼굴, 몸, 손, 인간 실루엣을 넣지 않는다.
- 공격 궤적, 빈 갑옷 표식, 석상 표적은 사용할 수 있다.
- 마법과 달리 장치의 입구, 방아쇠, 작동 경로, 결과가 보여야 한다.

### 스타터

- 반복해서 사용하는 대표 도구 한 개를 기록 보관소의 받침대나 낡은 작전
  테이블 위에 둔다.
- 사람과 손은 넣지 않는다.
- `컬`, `보물상자`, `어튠`은 서로 다른 재질과 실루엣으로 즉시 구분한다.

## 전체 프롬프트 생성

스타터를 포함한 현재 최종 DB 전체를 다시 뽑는다.

```bash
npm run art:prompts -- --include-starters --all
```

출력 파일은 `art/prompts/card-art-prompts.jsonl`이며, 각 행에는 카드 ID,
타입, 코스트, `1472x1344` 규격, 아트 디렉션 버전, 최종 프롬프트가 들어간다.

최신 OpenAI 이미지 모델로 생성할 때:

```bash
export OPENAI_API_KEY=...
npm run art:generate -- --provider=openai --model=gpt-image-2 --force
```

기본 생성 설정은 `1472x1344`, `high`, WebP이며, 저장 직전에 다시 정확한
크기로 정규화한다.
