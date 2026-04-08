export const onEventRegex = /^on(?<firstLetter>[A-Z])/;
export const isOnEvent = (key: string) => onEventRegex.test(key);

export function toNativeEventName(str: string) {
  return str.replace(/^on/, '').toLowerCase();
}
export function toOnEventName(str: string) {
  return 'on' + str.charAt(0).toUpperCase() + str.slice(1);
}
export function toEventName(str: string) {
  return str.replace(onEventRegex, (match, firstLetter) => {
    return firstLetter.toLowerCase();
  });
}