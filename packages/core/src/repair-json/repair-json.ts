import { jsonrepair } from 'jsonrepair';
import { fixJson } from 'ai';

export enum RepairJsonState {
  INVALID_INPUT = 'invalid-input',
  SUCCESS = 'success-parse',
  REPAIRED = 'repaired-parse',
  FAILED = 'failed-repair',
}

export const safeJsonParse = (jsonString: string) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return undefined;
  }
};

export const repairJson = (jsonString: string | undefined) => {
  if (typeof jsonString !== 'string') {
    return { state: RepairJsonState.INVALID_INPUT, value: undefined };
  }
  let result = safeJsonParse(jsonString);
  if (result) {
    return { state: RepairJsonState.SUCCESS, value: result };
  }
  try {

    const fixedString = fixJson(jsonString);
    result = jsonrepair(fixedString);
    return { state: RepairJsonState.REPAIRED, value: JSON.parse(result) };
  } catch (error) {
    return { state: RepairJsonState.FAILED, value: undefined };
  }
};
