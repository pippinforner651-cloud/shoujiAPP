export type BuildVariant = 'v1' | 'v2-preview';

export function resolveBuildVariant(value?: string): BuildVariant {
  return value === 'v2-preview' ? 'v2-preview' : 'v1';
}

export function getPreviewLabel(variant: BuildVariant): string | null {
  return variant === 'v2-preview'
    ? 'E23 V2预览测试版 · 多人功能尚未上线'
    : null;
}

export function getActiveScaleRatio(variant: BuildVariant, frozenV1Ratio: number): number {
  return variant === 'v2-preview' ? 1 : frozenV1Ratio;
}

const viteEnv = (import.meta as ImportMeta & {
  env?: { VITE_BUILD_VARIANT?: string; VITE_APP_VERSION_LABEL?: string };
}).env;

export const BUILD_VARIANT = resolveBuildVariant(viteEnv?.VITE_BUILD_VARIANT);
export const IS_V2_PREVIEW = BUILD_VARIANT === 'v2-preview';
export const APP_VERSION_LABEL = viteEnv?.VITE_APP_VERSION_LABEL?.trim()
  || (IS_V2_PREVIEW ? 'V2 预览测试版' : 'V1.0.1');
