import { v4 as uuidv4 } from 'uuid';
import { readonly, type Ref } from 'vue';
import { emitter } from '@opentiny/genui-sdk-vue';
import type { IChatMessage, IStreamDelta } from '@opentiny/genui-sdk-core';

const cardTypeMap: Record<string, string> = {
  Angular: 'schema-card-angular',
  Vue: 'schema-card',
};

function getStreamDelta(data: any) {
  return data?.choices?.[0]?.delta || {};
}

function emitNotification(delta: IStreamDelta, chatMessage: IChatMessage) {
  const last = chatMessage.messages[chatMessage.messages.length - 1];
  if (!last) return;
  const type = last.type?.startsWith('schema-card-') ? 'schema-card' : last.type;
  emitter.emit('notification', {
    type,
    delta,
    chatMessage: readonly(chatMessage),
  });
}

function looksLikeBarePageSchema(buf: string) {
  const s = buf.trimStart();
  if (!s.startsWith('{')) return false;
  // 已有正式围栏则交给原逻辑
  if (buf.includes('```schemaJson')) return false;
  if (/```/.test(buf)) return false;
  return /"componentName"\s*:\s*"Page"/.test(s);
}

function appendSchema(content: string, delta: IStreamDelta, chatMessage: IChatMessage, framework: string) {
  const type = cardTypeMap[framework] ?? 'schema-card';
  const last = chatMessage.messages[chatMessage.messages.length - 1];
  if (last?.type === type) {
    last.content += content;
  } else {
    chatMessage.messages.push({ type, content, id: uuidv4() });
  }
  emitNotification(delta, chatMessage);
}

function enterBareSchemaMode(context: any, buffer: string) {
  context.bareSchemaMode = true;
  const framework = context.framework || 'Vue';
  const type = cardTypeMap[framework] ?? 'schema-card';

  // 清掉已经当 markdown 吐出去的裸 JSON
  context.chatMessage.messages = (context.chatMessage.messages || []).filter(
    (m: any) => m.type !== 'markdown' && !String(m.type || '').startsWith('schema-card'),
  );

  context.chatMessage.messages.push({
    type,
    content: buffer.trimStart(),
    id: uuidv4(),
  });
  emitNotification(context.delta || {}, context.chatMessage);
}

/**
 * 包在 content handler 外层：流式中途识别裸 Page JSON
 */
export function getBareSchemaContentHandler(contentHandler: any, framework: Ref<string>) {
  return {
    ...contentHandler,
    start(context: any, handlers: any) {
      context.bareSchemaMode = false;
      context.bareSchemaBuffer = '';
      context.framework = framework.value;
      contentHandler.start?.(context, handlers);
    },
    handler(data: any, context: any) {
      const delta = getStreamDelta(data);
      const chunk = delta.content || '';
      if (!chunk) {
        return contentHandler.handler?.(data, context);
      }

      context.delta = delta;

      // 已进入裸 schema 模式：后续只追加 schema-card，不再走 PatternExtractor
      if (context.bareSchemaMode) {
        context.chatMessage.content += chunk;
        context.bareSchemaBuffer += chunk;
        appendSchema(chunk, delta, context.chatMessage, context.framework || framework.value);
        return true;
      }

      // 先走原逻辑（支持正常 ```schemaJson / think 等）
      const handled = contentHandler.handler?.(data, context);

      context.bareSchemaBuffer = (context.bareSchemaBuffer || '') + chunk;

      // 中途识别：还没有 schema-card，但缓冲已像 Page JSON
      const hasSchemaCard = context.chatMessage.messages?.some((m: any) =>
        String(m.type || '').startsWith('schema-card'),
      );
      if (!hasSchemaCard && looksLikeBarePageSchema(context.bareSchemaBuffer)) {
        enterBareSchemaMode(context, context.bareSchemaBuffer);
      }

      return handled;
    },
  };
}