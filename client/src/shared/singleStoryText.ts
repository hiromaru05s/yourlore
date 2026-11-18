import { copy as c, type Copy } from './tutorialSteps';
import type { StoryScene } from './singleStory';
export type StoryActor = 'zeno'|'lumi'|'noel'|'vera'|'aries'|'waltz'|'you'|'narrator';
export interface StoryLine { actor:StoryActor; text:Copy; }
export const STORY_NAMES:Record<StoryActor,Copy>={zeno:c('ゼノ','Zeno','제노'),lumi:c('ルミ','Lumi','루미'),noel:c('ノエル','Noel','노엘'),vera:c('ヴェラ','Vera','베라'),aries:c('アリエス','Aries','아리에스'),waltz:c('ワルツ','Waltz','왈츠'),you:c('あなた','You','당신'),narrator:c('記録の余白','Between the records','기록의 여백')};
const line=(actor:StoryActor,ja:string,en:string,ko:string):StoryLine=>({actor,text:c(ja,en,ko)});
export const SINGLE_CHAPTERS=[
 {id:1,title:c('最初の接続','First connection','첫 연결'),place:c('ビブリオン図書館・選抜試験場','Biblion Library · Examination hall','비블리온 도서관 · 선발 시험장'),summary:c('探しているのは、一人の記録。まずはその扉を開く資格から。','One person’s record brought you here. First, earn the right to enter.','찾는 것은 한 사람의 기록. 먼저 문을 열 자격부터.'),actor:'zeno'},
 {id:2,title:c('一枚になるまで','Becoming a card','한 장이 되기까지'),place:c('登録室・実習区域','Registration room · Practice area','등록실 · 실습 구역'),summary:c('記憶は、そのままではカードにならない。','A memory does not become a card on its own.','기억은 저절로 카드가 되지 않는다.'),actor:'lumi'},
 {id:3,title:c('知らない相手','An unfamiliar opponent','낯선 상대'),place:c('シーカー交流区','Seekers’ meeting hall','시커 교류 구역'),summary:c('知らない誰かの選択が、あなたの読みを変える。','Someone else’s choices will challenge what you think you know.','모르는 누군가의 선택이 당신의 판단을 바꾼다.'),actor:'noel'},
 {id:4,title:c('閉じた目録','The sealed catalogue','닫힌 목록'),place:c('資格審査室・深層目録','Qualification chamber · Deep catalogue','자격 심사실 · 심층 목록'),summary:c('父の名前は、ここにある。それでも、声は届かない。','Your father’s name is here. His voice is still beyond reach.','아버지의 이름이 여기 있다. 하지만 목소리는 닿지 않는다.'),actor:'vera'},
 {id:5,title:c('七つの扉','Seven doors','일곱 개의 문'),place:c('マスターシーカーの回廊','Hall of the Master Seekers','마스터 시커의 회랑'),summary:c('誰から訪ねるかは、あなたが決める。','You choose whose door to approach first.','누구를 먼저 찾을지는 당신이 결정한다.'),actor:'zeno'},
] as const;
export const SINGLE_SCENES:Record<StoryScene,StoryLine[]>={
 '1:before':[
  line('narrator','扉の向こうから、カードを切る音がする。握りしめたペンダントが、かすかに熱を帯びた。','Cards shuffle beyond the doors. The pendant in your hand grows faintly warm.','문 너머로 카드를 섞는 소리가 들린다. 움켜쥔 펜던트가 희미하게 따뜻해졌다.'),
  line('zeno','選抜試験の受験者だね。ここへ来た理由を、聞いてもいい？','Here for the selection exam? May I ask what brought you here?','선발 시험 응시자구나. 여기에 온 이유를 물어봐도 될까?'),
  line('you','父の記録を探している。ほかに、たどれる場所がない。','I’m looking for my father’s record. There’s nowhere else left to look.','아버지의 기록을 찾고 있어. 달리 찾아갈 곳이 없어.'),
  line('zeno','なら、記録に触れる方法から覚えよう。この区域では、床のルーンが具現化を受け止め、水晶が出力を見張っている。','Then let’s learn to handle records. The runes in this floor contain manifestations, while the crystals monitor their output.','그럼 기록을 다루는 법부터 배우자. 바닥의 룬이 구현을 받아내고 수정이 출력을 감시해.'),
  line('zeno','危なくなる前に接続を切る仕組みもある。でも、使う人の判断まで代わってはくれない。まずは僕と、一枚ずつ。','The connection can be cut before it becomes dangerous. That cannot replace your judgement. Let’s begin, one card at a time.','위험해지기 전에 연결을 끊는 장치도 있어. 하지만 사용자의 판단까지 대신하진 못해. 나와 한 장씩 시작하자.'),
 ],
 '1:after':[
  line('zeno','接続、解除まで確認できた。基礎実習は修了だよ。','Connection and release confirmed. Your basic practice is complete.','연결과 해제까지 확인했어. 기초 실습 수료야.'),
  line('you','父も、こうやって記録を読んでいたのかな。','I wonder if my father read records like this.','아버지도 이렇게 기록을 읽었을까.'),
  line('zeno','それを確かめるためにも、次は登録室へ行こう。君のデッキを、実際の相手に使ってみるんだ。','To find out, visit the registration room next. You’ll try your deck against another seeker.','그걸 알아보기 위해서라도 다음은 등록실로 가자. 실제 상대에게 네 덱을 써 보는 거야.'),
 ],
 '2:before':[
  line('lumi','ここには、まだカードになっていない記録がたくさんあるの。観測できたものを全部、対戦に持ち込めるわけじゃない。','Many records here have never become cards. Not everything we observe can be brought into a duel.','여기에는 아직 카드가 되지 않은 기록이 많아. 관측한 모든 것을 대전에 가져갈 수 있는 건 아니야.'),
  line('lumi','確かめて、必要な部分を切り出して、安全に再現できる形へ整える。登録が済んで、初めて一枚になる。','We verify a record, select what matters and make it safe to reproduce. Only after registration does it become a card.','확인하고, 필요한 부분을 골라내고, 안전하게 재현하도록 다듬어. 등록을 마쳐야 비로소 한 장이 돼.'),
  line('you','どうして、本や大きな水晶じゃなくて、カードなんだ？','Why cards, rather than books or large crystals?','책이나 커다란 수정 대신, 왜 카드지?'),
  line('lumi','一度につなぐ記録の範囲を決められて、組み替えもしやすいから。昔から遊ばれていたリンケージの形にも馴染むでしょ。','They bound the record we connect to, and are easy to rearrange. People already knew the format from the old game of Linkage.','한 번에 연결할 기록의 범위를 정할 수 있고 조합하기도 쉬워서야. 오래전부터 즐기던 린케이지의 형식에도 익숙하잖아.'),
  line('lumi','スターターは自分が持ち込む接続の土台。対戦中に購入するカードは、共通書庫から接続先を広げるもの。私と試してみよう。','Starters form the foundation you bring with you. Cards bought during a duel expand your connections into the shared archive. Try it against me.','스타터는 직접 가져오는 연결의 토대야. 대전 중 구매하는 카드는 공통 서고로 연결을 넓혀 주지. 나와 시험해 보자.'),
 ],
 '2:after':[
  line('lumi','うん、登録できる。勝てた手だけじゃなくて、迷った手も覚えておいてね。','Yes, we can register your practice. Remember the decisions you struggled with, as well as the ones that won.','응, 등록할 수 있겠어. 이겼던 수만 아니라 망설였던 수도 기억해 둬.'),
  line('you','同じカードでも、つなぎ方でこんなに変わるんだな。','The same cards can change so much depending on how they connect.','같은 카드라도 연결 방식에 따라 이렇게 달라지는구나.'),
  line('lumi','街の灯りや工房にもマナは使う。でも、誰もが自由に記録を具現化できるわけじゃない。だから私たちが、確かめるの。','Mana lights our streets and helps our workshops. But not everyone can safely manifest records. That is why we check.','거리의 조명이나 공방에서도 마나를 써. 하지만 누구나 자유롭게 기록을 구현할 수 있는 건 아니야. 그래서 우리가 확인하는 거야.'),
 ],
 '3:before':[
  line('noel','教官の癖だけ覚えても、知らない相手には通じない。交流区で二戦、戦ってきて。','Learning an instructor’s habits is not enough. Go play two duels in the meeting hall.','교관의 습관만 익혀서는 낯선 상대에게 통하지 않아. 교류 구역에서 두 번 대전하고 와.'),
  line('you','勝ってこい、とは言わないんだな。','You didn’t say I had to win.','이기고 오라는 건 아니네.'),
  line('noel','見るのは、違う選択に出会った経験。ノーマル対戦なら勝っても負けてもいい。ランク戦は、この課題には含めない。','This is about encountering other choices. Finish normal duels; wins and losses both count. Ranked duels are not part of this assignment.','다른 선택을 만난 경험을 보는 거야. 노멀 대전은 이겨도 져도 돼. 랭크전은 이 과제에 포함하지 않아.'),
 ],
 '3:after':[
  line('noel','二戦分の記録を確認した。読めなかった一手は、次の相手への手掛かりになる。','Two duel records confirmed. A move you failed to predict can teach you something for the next opponent.','두 경기의 기록을 확인했어. 읽지 못한 한 수는 다음 상대를 위한 단서가 돼.'),
  line('narrator','部屋に戻ると、育ての親からの便りが届いていた。「入館できたか。こちらへの連絡を忘れるな」','Back in your room, a letter waits from the person who raised you. “Did you get inside? Remember to contact us.”','방에 돌아오자 나를 길러 준 이의 편지가 와 있었다. 「입관했느냐. 우리에게 연락하는 것을 잊지 마라.」'),
  line('you','……まだ、返せない。あの人たちにとって、父は救う相手じゃない。','…I can’t answer yet. To them, Father is not someone to save.','……아직 답할 수 없어. 그들에게 아버지는 구해야 할 사람이 아니야.'),
 ],
 '4:before':[
  line('vera','ここから先は、勝つためだけの実習じゃない。大きな力を預けていいか、確かめる試験よ。','The next examination is about more than winning. We need to know whether we can entrust you with greater power.','이제부터는 이기기만 하면 되는 실습이 아니야. 더 큰 힘을 맡겨도 될지 확인하는 시험이지.'),
  line('you','父と同じルーンが、目録にあった。でも、何も映らなかった。','I found my father’s runes in the catalogue. But nothing appeared.','목록에 아버지와 같은 룬이 있었어. 하지만 아무것도 보이지 않았어.'),
  line('vera','索引が見えることと、その記録へ接続できることは違う。まずノエル、そして私の実技を通過して。','Seeing an index is different from connecting to its record. Pass Noel’s practical examination, then mine.','색인이 보이는 것과 기록에 연결할 수 있는 건 달라. 먼저 노엘의 실기, 그리고 내 실기를 통과해.'),
  line('vera','ルミを含む三人の認定、基礎実習、ノーマル二戦。その全部が揃えば、ワルツに取り次ぐ。','Lumi, Noel and I must all certify you, alongside basic practice and two normal duels. Then I’ll take you to Waltz.','루미를 포함한 세 사람의 인증, 기초 실습, 노멀 두 경기. 모두 갖추면 왈츠에게 안내할게.'),
 ],
 '4:after':[
  line('waltz','ユンゲルの息子だな。そのペンダントの歪みは、普通の記録には残らない。だが、俺たちには分かる。','You are Yungel’s son. Ordinary records do not preserve the distortion in that pendant. We can perceive it.','융겔의 아들이군. 그 펜던트의 왜곡은 보통 기록에는 남지 않는다. 하지만 우리에게는 보여.'),
  line('you','知っていたのか。俺を育てたのは、レヴナントだ。でも、あいつらは父を消そうとしている。俺は、父を救いたい。','You knew? The Revenant raised me. But they want to erase my father. I want to save him.','알고 있었어? 나를 기른 건 레버넌트야. 하지만 그들은 아버지를 없애려 해. 나는 아버지를 구하고 싶어.'),
  line('waltz','その記録は、俺が本を貸すようには渡せない。七人のマスターと俺に、定められた規則で勝て。接続に必要な認証を揃えるんだ。','I cannot hand you that record like a borrowed book. Defeat the seven Masters and me under the prescribed rules. Earn the authorizations your connection needs.','그 기록은 책을 빌려 주듯 건넬 수 없다. 일곱 마스터와 나를 정해진 규칙 아래 이겨라. 연결에 필요한 인증을 모으는 거다.'),
  line('you','勝ったら、俺があんたたちの代わりになるのか？','If I win, do I take your place?','이기면 내가 너희를 대신하게 되는 거야?'),
  line('waltz','違う。渡すのは、記録に触れる資格だ。俺たちを水晶につなぐ役目まで、押しつけはしない。父の記録が何を返すかは、お前自身が確かめろ。','No. You earn access to the record. We will not impose the duty that binds us to the crystals. What your father’s record reveals is for you to discover.','아니. 기록에 닿을 자격을 주는 거다. 우리를 수정에 묶는 역할까지 떠넘기지 않아. 아버지의 기록이 무엇을 돌려줄지는 직접 확인해라.'),
 ],
 '5:before':[
  line('zeno','挑戦資格が登録されたよ。マスターへの扉に、順番はない。誰に会いたいか、自分で選んで。','Your qualification is registered. The Masters’ doors have no prescribed order. Choose whom you want to meet.','도전 자격이 등록됐어. 마스터의 문에는 정해진 순서가 없어. 누구를 만날지 직접 골라.'),
  line('you','二百年近く、同じ八人がここを守ってきたんだな。','The same eight people have guarded this place for almost two hundred years.','거의 이백 년 동안 같은 여덟 명이 여기를 지켜 왔구나.'),
  line('zeno','守り方まで同じだったわけじゃないよ。記録を公開したい人も、危険な真実を管理すべきだと考える人もいる。','They have not always agreed how. Some want records opened to everyone. Others believe dangerous truths must be controlled.','지키는 방식까지 같았던 건 아니야. 기록을 공개하려는 이도, 위험한 진실을 관리해야 한다고 믿는 이도 있어.'),
  line('zeno','勝てば、その人の認証と、もっと個人的な記録への入口が開く。ほかのマスターを選ぶために、人物編を読んでおく必要はないよ。','A victory earns their authorization and opens a more personal story. You do not need to read that story before choosing another Master.','이기면 그 사람의 인증과 더 개인적인 기록의 입구가 열려. 다른 마스터를 선택하기 위해 인물편을 미리 읽을 필요는 없어.'),
 ],
 '5:after':[
  line('you','父の声へ続く道は、一つじゃない。まずは、自分の意志でこの扉を選ぶ。','There is more than one path toward my father’s voice. The first door will be my choice.','아버지의 목소리로 가는 길은 하나가 아니야. 먼저 내 의지로 이 문을 선택하겠어.'),
  line('zeno','行っておいで。修練したくなったら、いつでもここへ戻れるから。','Off you go. You can always return here when you want to practice.','다녀와. 수련하고 싶어지면 언제든 여기로 돌아와도 돼.'),
 ],
 'aries:before':[
  line('aries','記録を読みたい。それだけなら、志願者は皆そう言う。お前は、その先に何を望む？','You want to read a record. Every applicant says that. What do you want beyond it?','기록을 읽고 싶다. 지원자는 모두 그렇게 말하지. 너는 그 너머에 무엇을 바라지?'),
  line('you','父を救いたい。そのせいで誰かを傷つけるのかも、確かめたい。','I want to save my father. I also need to know if doing so would hurt someone else.','아버지를 구하고 싶어. 그 때문에 누군가 다치는지도 확인하고 싶어.'),
  line('aries','答えを決めつけていないなら、見込みはある。願いを持ったまま、目の前の盤面を読めるか。勝負で見せてもらおう。','There is hope if you have not decided the answer already. Can you read the board while holding on to that wish? Show me in a duel.','답을 단정하지 않았다면 가능성은 있겠군. 소원을 품은 채 눈앞의 판을 읽을 수 있는지, 승부로 보여 줘.'),
 ],
 'aries:after':[
  line('narrator','認証の光が静まった後、アリエスは古い名簿を開いた。一つの名前の横に、「辞退」とある。','After the authorization’s light fades, Aries opens an old register. Beside one name is the word “Withdrew.”','인증의 빛이 잦아들자 아리에스가 오래된 명부를 펼쳤다. 한 이름 옆에 「사퇴」라고 적혀 있다.'),
  line('you','試験に落ちた人の記録か？','Is this someone who failed the exam?','시험에 떨어진 사람의 기록이야?'),
  line('aries','いや。適性も、力もあった。だが、深層へ進む代わりに街へ戻った。今は子供たちに、普通のリンケージを教えている。','No. They had both aptitude and strength. But they went back to the city instead of entering the depths. Now they teach children ordinary Linkage.','아니. 적성도 힘도 있었다. 하지만 심층으로 가는 대신 거리로 돌아갔다. 지금은 아이들에게 평범한 린케이지를 가르치고 있지.'),
  line('you','引き止めなかったのか。','You didn’t try to stop them?','붙잡지 않았어?'),
  line('aries','引き止めた。才能を捨てるな、と。……捨てるかどうかを決めるのは、私ではなかったのにな。','I did. I told them not to waste their talent. …It was never mine to decide what wasting it meant.','붙잡았다. 재능을 버리지 말라고. ……무엇이 버리는 것인지 결정할 사람은 내가 아니었는데.'),
  line('aries','認証を得たからといって、進み続ける義務はない。お前が何を選ぶにせよ、その資格は、お前のものだ。','Authorization does not oblige you to keep going. Whatever you choose, the right you earned belongs to you.','인증을 얻었다고 계속 나아갈 의무가 있는 건 아니다. 무엇을 선택하든, 그 자격은 네 것이다.'),
 ],
};
