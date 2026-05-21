export function getHandleData() {
  let lastType: string = '';
  function handleData(data: string, type: string) {
    if (lastType !== type) {
      process.stdout.write(`\n${type}: --------------------------------\n`);
      lastType = type;
    }
    process.stdout.write(data)
    process.stdout.write('')
  }
  return { handleData };
}

export function getHandleDataAndResult() {
  let lastType: string = '';
  const result: string[] = [];
  function handleData(data: string, type: string) {
    if (lastType !== type) {
      result.push(`\n${type}: --------------------------------\n`);
      lastType = type;
    }
    result.push(data)
    result.push('')
  }
  return { handleData, result };
}
