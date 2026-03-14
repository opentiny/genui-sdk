export class OverlapEliminator {
  static eliminateOverlap(origin: string, inherited: string, compareLength: number = 200, startLength: number = 50) {
    if (inherited.length < startLength) {
      return {
        pending: inherited.slice(),
        eliminated: null,
        overlapString: '',
      };
    }
    const { overlap, overlapPending, overlapLength, overlapString } = OverlapEliminator.overlapTest(origin, inherited, compareLength);
    console.log('【test】: overlap', overlap, 'overlapPending', overlapPending, 'overlapLength', overlapLength, 'overlapString', overlapString);
    return {
      pending: overlapPending ? overlapString : null,
      eliminated: overlap ? inherited.slice(overlapLength) : null,
      overlapString
    };
  }
  static overlapTest(origin: string, inherited: string, compareLength: number = 100) {
    const originString = origin.slice(-compareLength);

    let i = inherited.length;
    let findIndex = 0;
    
    while (i > 0) {
      const index = originString.lastIndexOf(inherited.slice(0, i));
      if (index > -1 && (index + i === originString.length || i === inherited.length)) {
        findIndex = index;
        break;
      }
      i--;
    }
    if (findIndex > 0) {
      if ( findIndex + i === originString.length) {
        return {
          overlap: true,
          overlapPending: false,
          overlapLength: i,
          overlapString: originString.slice(findIndex, findIndex + i),
        }
      }
      return {
        overlap: false,
        overlapPending: true,
        overlapLength: i,
        overlapString: originString.slice(findIndex, findIndex + i),
      }
     }
    return {
      overlap: false,
      overlapPending: false,
      overlapLength: 0,
      overlapString: '',
    };
  }
}