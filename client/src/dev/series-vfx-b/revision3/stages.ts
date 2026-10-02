export const eggStages:Record<string,[string,string][]>= {
 A105:[['wait','待機'],['tick','ターン進行']],
 A106:[['hit','被弾・耐久減少'],['break','耐久0・破壊']],
 A107:[['support','孵化支援']],
 A108:['TGE2','TGE3','TGE4','TGE5','TGE6','TGE7'].map(id=>[id,id]),
 A109:[['D_BLACK','黒竜'],['D_RED','赤竜'],['D_BLUE','青竜']],
 A110:[['DIVINE','降臨・マナ・対象破壊']],
};
export const stateStages:Record<string,[string,string][]>= {
 N001:[['gain','獲得'],['hold','保持'],['heal','ターン開始の回復']],
 N002:[['gain','獲得'],['hold','保持'],['absorb','吸収・残量'],['break','吸収・体力への超過'],['expire','期限消失']],
};
