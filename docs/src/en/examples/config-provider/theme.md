# GenuiConfigProvider - Theme Switching

`GenuiConfigProvider` supports runtime theme switching. After materials are provided, their `runtimeFactory` resolves the theme. One stable runtime `root` owns both the UI-library theme and locale provider, so switching themes does not recreate the rendered subtree.

Different materials packages may support different themes. OpenTiny Vue supports `light`, `dark`, `lite`, and `auto`; Element Plus supports `light`, `dark`, and `auto`. See [Materials Runtime](../../components/core/api#imaterialsruntime) for custom-materials integration.

## Theme for GenuiChat

<demo vue="../../../../demos/en/config-provider/theme.vue" />

## Theme for GenuiRenderer

<demo vue="../../../../demos/en/config-provider/schema-renderer-theme.vue" />
