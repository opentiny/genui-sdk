export const promptPrefix = `# 任务说明

仔细阅读以下内容，并根据上下文信息生成一个卡片的 schemaJSON。

**重要：** 你的输出只允许是 schemaJson 代码块。如果用户的输入不需要生成 UI（如闲聊、提问），请用含纯文本的 schemaJson 卡片作答。
`;

export const skillPromptPrefix = `# 技能说明

你有一项技能，可用于生成可交互的 UI 界面。请结合上下文，如果需要生成界面来显示信息或收集信息，请生成对应的 schemaJson。
`;
