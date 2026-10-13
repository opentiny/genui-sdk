# Renderer - Custom Actions

Custom actions let you implement complex interaction logic. Pair them with prompts so the LLM emits schema JSON that invokes those actions.

## Passing customActions to the Renderer

Pass actions via the `customActions` prop. Each action includes:

- `name`: Action name
- `description`: Action description
- `execute`: Handler receiving `params` and `context`
- `parameters`: Optional parameter schema; the model uses it to fill `params` for `execute`

### execute Parameters

- `params`: Arguments passed when the action is invoked
- `context`: Renderer context (state and methods); use `context.state` for two-way bound global state

### Example: Open a Page

<demo vue="../../../../../demos/en/angular/renderer/custom-actions-open-page.vue"  :vueFiles="['../../../../../demos/angular/renderer/custom-actions-open-page.ts']"/>

## Send Custom Actions to the Server

After registering actions on the renderer, include them in chat requests so the model can generate correct action calls.

```ts {9-31}
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: userInput }],
    model: 'deepseek-v3.2',
    stream: true,
    metadata: {
      tinygenui: JSON.stringify({
        framework: 'Angular',
        customActions: [
          {
            name: 'openPage',
            description: 'Open a page',
            parameters: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to open',
                },
                target: {
                  type: 'string',
                  description: 'Target window: _self (same tab) or _blank (new tab)',
                },
              },
              required: ['url', 'target'],
            },
          }
        ]
      }),
    },
  }),
});
```
