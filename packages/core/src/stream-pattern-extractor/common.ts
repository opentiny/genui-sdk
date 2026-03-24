export function getPartialStartRegString(flag: string) {
  return flag
    .split('')
    .reverse()
    .reduce((acc, cur) => {
      return `${cur}(${acc})?`;
    }, '');
}
