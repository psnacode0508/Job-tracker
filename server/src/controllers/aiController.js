import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import AiUsage from '../models/AiUsage.js';
import { generateCompletion } from '../services/llm.js';
import ApiError from '../errors/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROMPTS_DIR = path.resolve(__dirname, '../../prompts');

const MAX_INPUT_CHARS = 6000;
const ALLOWED_TONES = ['formal', 'confident', 'concise'];

// Cache loaded prompt files in memory
const promptCache = new Map();

/**
 * Reads a system prompt file from server/prompts/
 */
async function loadPromptFile(filename) {
  if (promptCache.has(filename)) {
    return promptCache.get(filename);
  }
  const filePath = path.join(PROMPTS_DIR, filename);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    promptCache.set(filename, content);
    return content;
  } catch (error) {
    throw new Error(`Failed to load system prompt file "${filename}": ${error.message}`);
  }
}

/**
 * Validates common text input against the shared 6,000-character limit.
 */
function validateTextInput(text, fieldName = 'text') {
  if (text === undefined || text === null || typeof text !== 'string') {
    return `${fieldName} is required and must be a string`;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return `${fieldName} cannot be empty`;
  }
  if (trimmed.length > MAX_INPUT_CHARS) {
    return `${fieldName} exceeds maximum allowed limit of ${MAX_INPUT_CHARS.toLocaleString()} characters (received ${trimmed.length.toLocaleString()})`;
  }
  return null;
}

/**
 * Validates the schema of extracted job data.
 */
function isValidExtraction(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;

  const validCompany = obj.company === null || typeof obj.company === 'string';
  const validRole = obj.role === null || typeof obj.role === 'string';
  const validLocation = obj.location === null || typeof obj.location === 'string';
  const validSkills = Array.isArray(obj.skills);
  const validMinYears =
    obj.minYears === null || (typeof obj.minYears === 'number' && !isNaN(obj.minYears));
  const validSalaryRange = obj.salaryRange === null || typeof obj.salaryRange === 'string';

  return (
    validCompany &&
    validRole &&
    validLocation &&
    validSkills &&
    validMinYears &&
    validSalaryRange
  );
}

/**
 * POST /api/ai/summarize
 * Generates a 5-bullet summary of a job description.
 */
export async function summarizeJob(req, res, next) {
  try {
    const { jobDescription } = req.body || {};
    const validationError = validateTextInput(jobDescription, 'jobDescription');
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    // Optional query or body temperature override (default 0.2)
    let temperature = 0.2;
    const tempOverride = req.body?.temperature ?? req.query?.temperature;
    if (tempOverride !== undefined && !isNaN(parseFloat(tempOverride))) {
      temperature = Math.max(0, Math.min(2, parseFloat(tempOverride)));
    }

    const systemPrompt = await loadPromptFile('summarize.system.txt');
    const completion = await generateCompletion({
      systemPrompt,
      userMessage: jobDescription.trim(),
      temperature,
    });

    // Save usage tracking record
    await AiUsage.create({
      userId: req.user._id,
      endpoint: '/api/ai/summarize',
      model: completion.model,
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      durationMs: completion.durationMs,
      costUsd: completion.costUsd,
    });

    console.log(
      `[AI Summarize] User: ${req.user._id} | Model: ${completion.model} | Latency: ${completion.durationMs}ms | Tokens: ${completion.inputTokens}in/${completion.outputTokens}out | Cost: $${completion.costUsd}`
    );

    return res.status(200).json({
      summary: completion.text.trim(),
      usage: {
        model: completion.model,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        durationMs: completion.durationMs,
        costUsd: completion.costUsd,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/ai/rewrite
 * Rewrites a resume bullet point in the specified tone under 30 words.
 */
export async function rewriteBullet(req, res, next) {
  try {
    const { text, tone } = req.body || {};

    const textError = validateTextInput(text, 'text');
    if (textError) {
      return res.status(400).json({ success: false, message: textError });
    }

    if (!tone || typeof tone !== 'string' || !ALLOWED_TONES.includes(tone.toLowerCase().trim())) {
      return res.status(400).json({
        success: false,
        message: `Tone must be one of: ${ALLOWED_TONES.map((t) => `'${t}'`).join(', ')}`,
      });
    }

    const selectedTone = tone.toLowerCase().trim();
    const systemPrompt = await loadPromptFile('rewrite.system.txt');
    const userMessage = `Tone: ${selectedTone}\nOriginal Bullet Point:\n${text.trim()}`;

    const completion = await generateCompletion({
      systemPrompt,
      userMessage,
      temperature: 0.2,
    });

    // Strip enclosing quotation marks if present
    let rewritten = completion.text.trim();
    if (
      (rewritten.startsWith('"') && rewritten.endsWith('"')) ||
      (rewritten.startsWith("'") && rewritten.endsWith("'"))
    ) {
      rewritten = rewritten.slice(1, -1).trim();
    }

    const wordCount = rewritten.split(/\s+/).filter(Boolean).length;

    // Save usage tracking record
    await AiUsage.create({
      userId: req.user._id,
      endpoint: '/api/ai/rewrite',
      model: completion.model,
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      durationMs: completion.durationMs,
      costUsd: completion.costUsd,
    });

    console.log(
      `[AI Rewrite] User: ${req.user._id} | Tone: ${selectedTone} | Words: ${wordCount} | Latency: ${completion.durationMs}ms | Cost: $${completion.costUsd}`
    );

    return res.status(200).json({
      rewritten,
      tone: selectedTone,
      wordCount,
      usage: {
        model: completion.model,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        durationMs: completion.durationMs,
        costUsd: completion.costUsd,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/ai/extract
 * Extracts structured JSON job details with automatic single retry on format failure.
 */
export async function extractJobDetails(req, res, next) {
  try {
    const { jobDescription } = req.body || {};
    const validationError = validateTextInput(jobDescription, 'jobDescription');
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const systemPrompt = await loadPromptFile('extract.system.txt');

    let extractedData = null;
    let lastCompletion = null;
    let parseOrValidationError = null;
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        lastCompletion = await generateCompletion({
          systemPrompt,
          userMessage: jobDescription.trim(),
          temperature: 0,
          jsonMode: true,
        });

        // Track usage for every attempt
        await AiUsage.create({
          userId: req.user._id,
          endpoint: '/api/ai/extract',
          model: lastCompletion.model,
          inputTokens: lastCompletion.inputTokens,
          outputTokens: lastCompletion.outputTokens,
          durationMs: lastCompletion.durationMs,
          costUsd: lastCompletion.costUsd,
        });

        // Clean possible markdown code fences
        let rawText = lastCompletion.text.trim();
        if (rawText.startsWith('```json')) {
          rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (rawText.startsWith('```')) {
          rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(rawText);

        if (isValidExtraction(parsed)) {
          extractedData = {
            company: parsed.company ?? null,
            role: parsed.role ?? null,
            location: parsed.location ?? null,
            skills: Array.isArray(parsed.skills) ? parsed.skills : [],
            minYears: typeof parsed.minYears === 'number' ? parsed.minYears : null,
            salaryRange: parsed.salaryRange ?? null,
          };
          break; // Successfully parsed and validated
        } else {
          parseOrValidationError = 'Extracted JSON failed schema validation (missing or invalid key types)';
          console.warn(`[AI Extract] Attempt ${attempt} failed schema validation.`);
        }
      } catch (err) {
        parseOrValidationError = `JSON parsing failed: ${err.message}`;
        console.warn(`[AI Extract] Attempt ${attempt} error: ${err.message}`);
      }
    }

    if (!extractedData) {
      console.error(
        `[AI Extract] All ${maxAttempts} extraction attempts failed for user ${req.user._id}: ${parseOrValidationError}`
      );
      return res.status(502).json({
        success: false,
        message: `Failed to extract valid structured job data after ${maxAttempts} attempts: ${parseOrValidationError}`,
      });
    }

    console.log(
      `[AI Extract] User: ${req.user._id} | Company: "${extractedData.company}" | Role: "${extractedData.role}" | Skills: ${extractedData.skills.length} | Latency: ${lastCompletion.durationMs}ms`
    );

    return res.status(200).json({
      data: extractedData,
      usage: {
        model: lastCompletion.model,
        inputTokens: lastCompletion.inputTokens,
        outputTokens: lastCompletion.outputTokens,
        durationMs: lastCompletion.durationMs,
        costUsd: lastCompletion.costUsd,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/ai/usage
 * Aggregates today's (UTC 00:00:00) AI usage and cost for authenticated user.
 */
export async function getAiUsage(req, res, next) {
  try {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const records = await AiUsage.find({
      userId: req.user._id,
      createdAt: { $gte: startOfToday },
    }).sort({ createdAt: -1 });

    const totalCalls = records.length;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostUsd = 0;
    const endpointBreakdown = {};

    for (const record of records) {
      const inTokens = record.inputTokens || 0;
      const outTokens = record.outputTokens || 0;
      const cost = record.costUsd || 0;

      totalInputTokens += inTokens;
      totalOutputTokens += outTokens;
      totalCostUsd += cost;

      if (!endpointBreakdown[record.endpoint]) {
        endpointBreakdown[record.endpoint] = {
          calls: 0,
          tokens: 0,
          costUsd: 0,
        };
      }
      endpointBreakdown[record.endpoint].calls += 1;
      endpointBreakdown[record.endpoint].tokens += inTokens + outTokens;
      endpointBreakdown[record.endpoint].costUsd = Number(
        (endpointBreakdown[record.endpoint].costUsd + cost).toFixed(8)
      );
    }

    const totalTokens = totalInputTokens + totalOutputTokens;

    return res.status(200).json({
      success: true,
      data: {
        period: 'today_utc',
        since: startOfToday.toISOString(),
        totalCalls,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        totalCostUsd: Number(totalCostUsd.toFixed(8)),
        endpointBreakdown,
        recentCalls: records.slice(0, 25).map((r) => ({
          id: r._id,
          endpoint: r.endpoint,
          model: r.model,
          inputTokens: r.inputTokens,
          outputTokens: r.outputTokens,
          durationMs: r.durationMs,
          costUsd: r.costUsd,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

export default {
  summarizeJob,
  rewriteBullet,
  extractJobDetails,
  getAiUsage,
};
