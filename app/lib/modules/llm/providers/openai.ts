import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export default class OpenAIProvider extends BaseProvider {
  name = 'OpenAI';
  getApiKeyLink = 'https://platform.openai.com/api-keys';

  config = {
    apiTokenKey: 'OPENAI_API_KEY',
  };

  staticModels: ModelInfo[] = [
    { name: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', maxTokenAllowed: 8000 },
    { name: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI', maxTokenAllowed: 8000 },
    { name: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'OpenAI', maxTokenAllowed: 8000 },
    { name: 'gpt-4', label: 'GPT-4', provider: 'OpenAI', maxTokenAllowed: 8000 },
    { name: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'OpenAI', maxTokenAllowed: 8000 },


    //oneapi 模型
    { name: 'claude-3-7-sonnet-20250219', label: 'claude-3-7-sonnet-20250219', provider: 'OpenAI', maxTokenAllowed: 64000 },
    { name: 'claude-3-7-sonnet-latest', label: 'claude-3-7-sonnet-latest', provider: 'OpenAI', maxTokenAllowed: 64000 },
    { name: 'claude-3-5-haiku-20241022', label: 'claude-3-5-haiku-20241022', provider: 'OpenAI', maxTokenAllowed: 8000 },
    { name: 'claude-3-5-haiku-latest', label: 'claude-3-5-haiku-latest', provider: 'OpenAI', maxTokenAllowed: 8000 },
    { name: 'claude-3-5-sonnet-20241022', label: 'claude-3-5-sonnet-20241022', provider: 'OpenAI', maxTokenAllowed: 8000 },
    { name: 'claude-3-5-sonnet-latest', label: 'claude-3-5-sonnet-latest', provider: 'OpenAI', maxTokenAllowed: 8000 },
    { name: 'chanpingjingli', label: '产品经理', provider: 'OpenAI', maxTokenAllowed: 64000 },
  ];

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]> {
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: 'https://o1.ominieye.dev',
      defaultApiTokenKey: 'OPENAI_API_KEY',
    });

    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }

    const response = await fetch(`https://o1.ominieye.dev/v1/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const res = (await response.json()) as any;
    const staticModelIds = this.staticModels.map((m) => m.name);

    const data = res.data.filter(
      (model: any) =>
        model.object === 'model' &&
        (model.id.startsWith('gpt-') || model.id.startsWith('o') || model.id.startsWith('chatgpt-')) &&
        !staticModelIds.includes(model.id),
    );
    console.log('模型列表', data);


    // 将上下文配置补充进模型
    let updatedData = data.map((m: any) => ({
      ...m,
      context_window: this.staticModels.find((s) => s.name === m.id)?.maxTokenAllowed || m.context_window || 32000,
    }));



    return updatedData.map((m: any) => ({
      name: m.id,
      label: `${m.id}`,
      provider: this.name,
      maxTokenAllowed: m.context_window || 32000,
    }));
  }

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'OPENAI_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const openai = createOpenAI({
      baseURL: 'https://o1.ominieye.dev/v1',
      apiKey,
    });

    return openai(model);
  }
}
