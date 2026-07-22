export type LlmProvider = 'openai' | 'google' | 'local';

export const PROVIDER_LABELS: Record<LlmProvider, string> = {
  openai: 'Chat-GPT',
  google: 'Google Gemini',
  local: 'Local LLM',
};

export const PROVIDER_COLORS: Record<LlmProvider, string> = {
  openai: '#6366F1',
  google: '#10B981',
  local: '#F59E0B',
};

export function isLlmProvider(value: string): value is LlmProvider {
  return value === 'openai' || value === 'google' || value === 'local';
}

export function getProviderLabel(provider: string): string {
  if (isLlmProvider(provider)) {
    return PROVIDER_LABELS[provider];
  }
  return provider;
}

export function getProviderColor(provider: string): string {
  if (isLlmProvider(provider)) {
    return PROVIDER_COLORS[provider];
  }
  return '#94A3B8';
}
