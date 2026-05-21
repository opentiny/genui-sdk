export async function fetchSchemaStream(
    url: string,
    userInput: string,
    onSchemaUpdate: (schemaChunk: string) => void,
  ): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: userInput }],
        model: 'deepseek-v3.2',
        stream: true,
        metadata: {
          tinygenui: JSON.stringify({
            framework: 'Angular'
          }),
        },
      })
    });
  
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  
    const reader = response.body!.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
  
    let inSchemaStream = false;
    let bufferText = ''; 
    let schemaFinished = false; 
    const startFlag = '```schemaJson';
    const endFlag = '```';
  
    // 检测 schema 开始标记
    const isSchemaJsonStart = (str: string): boolean => {
      const index = str.indexOf('`');
      if (index === -1) return false;
      return startFlag.startsWith(str.substring(index, index + startFlag.length));
    };
  
    // 检测 schema 结束标记
    const isSchemaJsonEnd = (str: string): boolean => {
      const index = str.lastIndexOf('\n');
      if (index === -1) return false;
      if (str.includes(`\n${endFlag}`)) {
        return true;
      }
      const newStr = str.slice(index).trim().substring(0, endFlag.length);
      return endFlag.startsWith(newStr);
    };
  
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        buffer += decoder.decode(value, { stream: true });
  
        while (true) {
          const lineEndIndex = buffer.indexOf('\n');
          if (lineEndIndex === -1) break;
  
          const line = buffer.slice(0, lineEndIndex).trim();
          buffer = buffer.slice(lineEndIndex + 1);
  
          if (!line.startsWith('data: ')) continue;
  
          const dataStr = line.slice(6);
  
          if (dataStr === '[DONE]' || schemaFinished) {
            return;
          }
  
          try {
            const chunk = JSON.parse(dataStr);
            const content = chunk.choices?.[0]?.delta?.content;
  
            if (!content) continue;
  
            const deltaPart = bufferText + content;
  
            // 检测是否进入或退出 schema 流
            if ((!inSchemaStream && isSchemaJsonStart(deltaPart)) || (inSchemaStream && isSchemaJsonEnd(deltaPart))) {
              const matchFlag = inSchemaStream ? /(\n\s*)```/ : startFlag;
              const matchPart = deltaPart.match(matchFlag)?.[0];
  
              if (!matchPart) {
                // 标记不完整，保留到下次
                bufferText = deltaPart;
                continue;
              }
  
              if (inSchemaStream) {
                const trimmedDelta = deltaPart.trim();
                const [schemaPart] = trimmedDelta.split(matchPart);
                if (schemaPart) {
                  onSchemaUpdate(schemaPart);
                }
                schemaFinished = true;
                return;
              } else {
                const trimmedDelta = deltaPart.trim();
                const [, schemaPart] = trimmedDelta.split(matchPart);
                inSchemaStream = true;
                bufferText = '';
                if (schemaPart) {
                  onSchemaUpdate(schemaPart);
                }
                continue;
              }
            }
  
            bufferText = '';
            if (inSchemaStream) {
              onSchemaUpdate(deltaPart);
            }
          } catch (e) {
            console.error('解析后端数据失败:', e, dataStr);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  