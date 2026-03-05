import { describe, expect, it } from "vitest";
import { getHandleDataAndResult } from "./utils/data-log-format";
import { getFileContent, readReplay } from "./utils/read-replay";
import { StreamPatternExtractor } from "../stream-pattern-extractor";
import { mergeStreams } from "./utils/merge-stream";
import { testCases } from "./testcase";

async function getPatternExtractorResult(fileName: string) {
  const readableStream = await readReplay(fileName);
  const [normalStream, handledStream ] = StreamPatternExtractor.separate(readableStream);
  const mergeStream = mergeStreams([normalStream, handledStream]).getReader();
  const { handleData, result } = getHandleDataAndResult();
  while (true) {
    const { value, done } = await mergeStream.read();
    if (done) break;
    const { value: content, type } = value;
    handleData(content, type === 0 ? 'markdown' : 'schemaJson');
  }
  return result.join('');
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
