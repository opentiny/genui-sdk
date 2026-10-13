function transformImageContent(contentItem) {
  if (!contentItem || typeof contentItem !== 'object') {
    return contentItem;
  }

  if (contentItem.type === 'image_url') {
    const imageUrl = contentItem.image_url;
    if (typeof imageUrl?.url === 'string') {
      return { type: 'image', image: imageUrl.url };
    }
  }

  return contentItem;
}

export function normalizeMessagesForAiSdk(messages) {
  if (!Array.isArray(messages)) {
    return messages;
  }

  return messages.map((message) => {
    if (!message || typeof message !== 'object') {
      return message;
    }

    if (!Array.isArray(message.content)) {
      return message;
    }

    return {
      ...message,
      content: message.content.map(transformImageContent).filter(Boolean),
    };
  });
}
