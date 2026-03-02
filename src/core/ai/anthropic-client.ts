import Anthropic from '@anthropic-ai/sdk';
import { EnrichmentError } from '../../shared/errors.js';

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AnthropicClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async createMessage(
    systemPrompt: string,
    messages: AnthropicMessage[],
    model: string = 'claude-sonnet-4-5-20250929',
    maxTokens: number = 2048,
  ): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      });

      const textBlock = response.content.find(block => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new EnrichmentError('No text content in response');
      }
      return textBlock.text;
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new EnrichmentError(
          `API error (${error.status}): ${error.message}`,
          undefined,
          error,
        );
      }
      throw error;
    }
  }
}
