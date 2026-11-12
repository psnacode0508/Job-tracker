/**
 * LLM Service
 * Encapsulates multi-provider LLM API interactions (Gemini REST and OpenAI REST),
 * token estimation, execution latency measurement, and cost calculation.
 */

const PRICING_RATES = {
  // Pricing per 1,000,000 (1M) tokens: [inputCost, outputCost]
  'gemini-2.5-flash': { input: 0.15, output: 0.60 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  default: { input: 0.15, output: 0.60 },
};

/**
 * Calculates USD cost from token counts and model pricing.
 */
function calculateCost(model, inputTokens, outputTokens) {
  const normalizedModel = (model || '').toLowerCase();
  const pricing =
    PRICING_RATES[normalizedModel] ||
    Object.entries(PRICING_RATES).find(([key]) => normalizedModel.includes(key))?.[1] ||
    PRICING_RATES.default;

  const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1000000;
  return Number(cost.toFixed(8));
}

/**
 * Sanitizes sensitive API keys from error messages and URLs.
 */
function sanitizeErrorMessage(message, apiKey) {
  if (!message || typeof message !== 'string') return 'Unknown LLM completion error';
  let clean = message;
  if (apiKey) {
    clean = clean.split(apiKey).join('[REDACTED_KEY]');
  }
  // Strip Google API key query params from URL strings
  clean = clean.replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED_KEY]');
  return clean;
}

/**
 * Executes an LLM completion request against Gemini or OpenAI.
 *
 * @param {Object} options
 * @param {string} options.systemPrompt - System instruction / prompt rules
 * @param {string} options.userMessage - User prompt / content to process
 * @param {number} [options.temperature=0.2] - Sampling temperature
 * @param {boolean} [options.jsonMode=false] - Enforce structured JSON output
 * @returns {Promise<{ text: string, model: string, inputTokens: number, outputTokens: number, durationMs: number, costUsd: number }>}
 */
export async function generateCompletion({
  systemPrompt = '',
  userMessage = '',
  temperature = 0.2,
  jsonMode = false,
}) {
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase().trim();
  const apiKey = process.env.LLM_API_KEY;

  if (!apiKey || apiKey === 'your_llm_api_key_here') {
    throw new Error('LLM_API_KEY environment variable is not configured');
  }

  const model =
    process.env.LLM_MODEL ||
    (provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini');

  const startTime = Date.now();

  try {
    let text = '';
    let inputTokens = 0;
    let outputTokens = 0;

    if (provider === 'gemini') {
      // 1. Google Gemini REST API generateContent
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [{ text: userMessage }],
          },
        ],
        ...(systemPrompt
          ? {
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
            }
          : {}),
        generationConfig: {
          temperature,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(
          `Gemini API request failed with status ${response.status}: ${errorBody}`
        );
      }

      const data = await response.json();
      text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Usage metadata extraction
      if (data?.usageMetadata) {
        inputTokens = data.usageMetadata.promptTokenCount || 0;
        outputTokens = data.usageMetadata.candidatesTokenCount || 0;
      }
    } else if (provider === 'openai') {
      // 2. OpenAI REST API chat/completions
      const endpoint = 'https://api.openai.com/v1/chat/completions';

      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: userMessage });

      const requestBody = {
        model,
        messages,
        temperature,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(
          `OpenAI API request failed with status ${response.status}: ${errorBody}`
        );
      }

      const data = await response.json();
      text = data?.choices?.[0]?.message?.content || '';

      // Usage metadata extraction
      if (data?.usage) {
        inputTokens = data.usage.prompt_tokens || 0;
        outputTokens = data.usage.completion_tokens || 0;
      }
    } else {
      throw new Error(`Unsupported LLM_PROVIDER: "${provider}". Expected "gemini" or "openai"`);
    }

    // Safe fallback token estimation if provider did not return counts
    if (!inputTokens) {
      inputTokens = Math.max(1, Math.ceil((systemPrompt.length + userMessage.length) / 4));
    }
    if (!outputTokens) {
      outputTokens = Math.max(1, Math.ceil(text.length / 4));
    }

    const durationMs = Date.now() - startTime;
    const costUsd = calculateCost(model, inputTokens, outputTokens);

    return {
      text,
      model,
      inputTokens,
      outputTokens,
      durationMs,
      costUsd,
    };
  } catch (error) {
    const cleanError = sanitizeErrorMessage(error.message, apiKey);
    throw new Error(cleanError);
  }
}

export default {
  generateCompletion,
};
