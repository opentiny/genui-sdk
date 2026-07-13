# Renderer - Buffered Fields

See [Configure Buffered Fields](../../renderer/required-complete-field-selectors).

## Custom Configuration

### Example

<demo vue="../../../../../demos/en/angular/renderer/required-complete-field-selectors.vue"  :vueFiles="['../../../../../demos/angular/renderer/required-complete-field-selectors.ts']"/>

### Behavior

Before configuring `requiredCompleteFieldSelectors`, `Text` content updates as the model streams partial output. After configuration, the full text is shown only when complete; text inside nested `div` elements is not affected.
