// Historical reducers predate First Aid's turn totals. Derive their expected
// history from the resolved damage events, including shield and reversal rules.
export function recordFirstAidHistory(result, turn) {
  for (const event of result.events) {
    if (event.type === 'turnHeader') turn = event.turn;
    if (event.type !== 'damage') continue;
    const player = result.state.players[event.player];
    const prior = player.damageReceived;
    if (prior?.turn === turn) prior.total += event.amount;
    else player.damageReceived = {turn, total:event.amount, previous:prior?.turn === turn-1 ? prior.total : 0};
  }
}
