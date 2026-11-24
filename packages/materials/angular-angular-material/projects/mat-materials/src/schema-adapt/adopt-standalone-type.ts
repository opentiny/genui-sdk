import { Type, ɵɵProvidersFeature } from '@angular/core';

/**
 * Clone Ivy `ɵcmp` / `ɵdir` onto a schema subclass so `createComponent` constructs
 * `sub` while reusing the official template. Does not mutate the official type.
 *
 * Ivy registers `providers` via `providersResolver`, not the `providers` array.
 * Official defs still `useExisting: MatXxx`; the live instance is `SchemaMatXxx`,
 * so the official class token must be aliased onto the subclass.
 */
export function adoptStandaloneType<T>(sub: Type<T>, base: Type<unknown>): Type<T> {
  const baseAny = base as { ɵfac?: (t?: Type<unknown>) => T; ɵcmp?: any; ɵdir?: any };
  const subAny = sub as {
    ɵfac?: (t?: Type<unknown>) => T;
    ɵcmp?: any;
    ɵdir?: any;
  };
  if (baseAny.ɵfac) {
    subAny.ɵfac = (t?: Type<unknown>) => baseAny.ɵfac!(t || sub);
  }
  if (baseAny.ɵcmp) {
    const cmp = Object.create(baseAny.ɵcmp);
    aliasOfficialToken(cmp, sub, base);
    subAny.ɵcmp = cmp;
  }
  if (baseAny.ɵdir) {
    const dir = Object.create(baseAny.ɵdir);
    aliasOfficialToken(dir, sub, base);
    subAny.ɵdir = dir;
  }
  return sub;
}

function aliasOfficialToken(def: { type?: unknown; providersResolver?: (d: unknown, fn?: unknown) => void }, sub: Type<unknown>, base: Type<unknown>): void {
  def.type = sub;
  const parentResolver = def.providersResolver;
  ɵɵProvidersFeature([{ provide: base, useExisting: sub }])(def as never);
  const extraResolver = def.providersResolver;
  def.providersResolver = (d, fn) => {
    extraResolver?.(d, fn);
    parentResolver?.(d, fn);
  };
}
