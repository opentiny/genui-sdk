import { describe, expect, it } from "vitest";
import { PatternExtractor } from "../pattern-extractor";
import { getHandleDataAndResult } from "./utils/data-log-format";
import { getFileContent, readReplay } from "./utils/read-replay";
import { testCases } from "./testcase";

async function getPatternExtractorResult(fileName: string) {
  return readReplay(fileName).then(async (readableStream) => {
    const reader = readableStream.getReader();
    const { handleData, result } = getHandleDataAndResult();
    const patternExtractor = new PatternExtractor({
      onNormalWrite: (value) => {
        handleData(value, 'markdown');
      },
      onHandledWrite: (value) => {
        handleData(value, 'schemaJson');
      },
    });
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      patternExtractor.handleContent(value);
    }
    return result.join('');
  });
}


describe('PatternExtractor', () => {
  it('should extract the pattern from the stream', async () => {
    for (const testCase of testCases) {
      const result = await getPatternExtractorResult(testCase.fileName);
      const expectedResult = await getFileContent(testCase.expectedResultFileName);
      expect(result).toBe(expectedResult);
    }
  });
});