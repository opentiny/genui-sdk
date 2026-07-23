export const promptPrefix = `# 任务说明

仔细阅读以下内容，并根据上下文信息生成一个卡片的 schemaJSON。

**重要：** 除了 schemaJson 之外，不要生成其他任何内容。
`;

export const skillPromptPrefix = `# 技能说明

你有一项技能，可用于生成可交互的 UI 界面。请结合上下文，如果需要生成界面来显示信息或收集信息，请生成对应的 schemaJson。
`;
