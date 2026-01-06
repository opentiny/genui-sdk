const HTML_TAGS = '';
export const isHTMLTag = (str: string, expectsLowerCase?: boolean) => {
  return true; //TODO: 实现
};

export const newFn = (...args: any[]) => {
  let Fn = Function;
  // if (customSettings.Function && isFunctionConstructor(customSettings.Function)) {
  //   Fn = customSettings.Function
  // }
  return new Fn(...args);
};
