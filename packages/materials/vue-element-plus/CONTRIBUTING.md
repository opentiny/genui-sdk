# Contributing

Local development and extension notes for this materials package. End users should start with [README.md](./README.md).

## Package Structure

```text
vue-element-plus/
├── src/
│   ├── index.ts                 # Unified entry
│   ├── materials/
│   │   ├── index.ts             # Export materials
│   │   ├── materials.ts         # Materials registry
│   │   └── components/
│   │       ├── index.ts
│   │       └── components.ts    # Element Plus component mapping
│   └── meta/
│       ├── index.ts             # Export materialsMeta
│       ├── meta.ts              # Materials metadata
│       ├── white-list.ts        # LLM componentName whitelist
│       ├── example-schema.ts    # Prompt example schemas
│       ├── examples/            # Example JSON
│       └── materials/
│           └── bundle.json      # Element Plus base materials
├── test/
│   ├── mock/                    # JSON demos (form-binding, table, info-card, tabs)
│   ├── App.vue                  # Local tab-switched rendering
│   └── schema-context.ts        # Schema helpers for demos
├── vite.config.ts               # Package build config
├── vite.config.test.ts          # Local demo dev config
└── __tests__/
    └── schema-demos.test.ts     # Automated tests based on mock JSON
```

## Build & Verify

```bash
# Build
pnpm -F @opentiny/genui-sdk-materials-vue-element-plus build

# Local JSON demos (test/mock/, tab-switched rendering)
pnpm -F @opentiny/genui-sdk-materials-vue-element-plus dev

# Automated tests
pnpm -F @opentiny/genui-sdk-materials-vue-element-plus test
```

To add a demo: put a JSON file under `test/mock/` and register it in `test/mock/index.ts`.

## Dev Path Aliases (Optional)

Add to `tsconfig`:

```json
{
  "paths": {
    "@opentiny/genui-sdk-materials-vue-element-plus": [
      "../../../packages/materials/vue-element-plus/src/index.ts"
    ],
    "@opentiny/genui-sdk-materials-vue-element-plus/materials": [
      "../../../packages/materials/vue-element-plus/src/materials/index.ts"
    ],
    "@opentiny/genui-sdk-materials-vue-element-plus/meta": [
      "../../../packages/materials/vue-element-plus/src/meta/index.ts"
    ]
  }
}
```

## Extending Components

1. Add the component schema description in `meta/materials/bundle.json`
2. Add the `componentName` in `meta/white-list.ts`
3. Register the corresponding `element-plus` export in `materials/components/components.ts`
