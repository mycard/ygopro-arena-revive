class Utils {
  static getExpScore(
    expA: number,
    expB: number,
    scoreA: number,
    scoreB: number,
  ) {
    let rExpA = expA,
      rExpB = expB;
    if (scoreA === scoreB) {
      rExpA += 0.5;
      rExpB += 0.5;
    } else if (scoreA > scoreB) {
      rExpA += 1;
      if (expA > expB) rExpB += 0.5;
    } else if (scoreA < scoreB) {
      rExpB += 1;
      if (expA < expB) rExpA += 0.5;
    }
    return { expA: rExpA, expB: rExpB };
  }
  static getEloScore(rA: number, rB: number, sA: number, sB: number) {
    //17.07.18 增加规则，平局不加分.
    if (sA === sB) {
      return { ptA: rA, ptB: rB };
    }

    const k = 24;
    const eA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
    const eB = 1 / (1 + Math.pow(10, (rA - rB) / 400));

    let diffA = k * (sA - eA);

    // 如果算出的变动分数小于8或者大于16就按8和16计
    if (diffA > 0 && diffA > 16) {
      //console.log("diffA 加分大于16 按16分结算", diffA);
      diffA = 16;
    }

    if (diffA > 0 && diffA < 8) {
      //console.log("diffA 加分小于8 按8分结算", diffA);
      diffA = 8;
    }

    if (diffA < 0 && diffA > -8) {
      //console.log("diffA 扣分小于8 按8分结算算", diffA);
      diffA = -8;
    }

    if (diffA < 0 && diffA < -15) {
      //console.log("diffA 扣分大于16 按16分结算", diffA);
      diffA = -15;
    }

    const rrA = rA + diffA;

    let diffB = k * (sB - eB);

    // 如果算出的变动分数小于8或者大于16就按8和16计
    if (diffB > 0 && diffB > 16) {
      //console.log("diffB 加分大于16 按16分结算", diffB);
      diffB = 16;
    }

    if (diffB > 0 && diffB < 8) {
      //console.log("diffB 加分小于8 按8分结算", diffB);
      diffB = 8;
    }

    if (diffB < 0 && diffB > -8) {
      //console.log("diffB 扣分小于8 按8分结算算", diffB);
      diffB = -8;
    }

    if (diffB < 0 && diffB < -15) {
      //console.log("diffB 扣分大于16 按16分结算", diffB);
      diffB = -15;
    }

    const rrB = rB + diffB;

    //console.log(diffA, diffB);

    // // 加分高于16
    // if( (rrB - rB) > 16 ) {
    //     rrB  = rB + 16;
    // }

    // // 扣分低于8
    // if( (rB - rrB) < 8 ) {
    //     rrB = rB - 8;
    // }

    return { ptA: rrA, ptB: rrB };
  }
}
