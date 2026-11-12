# Day 10 AI Interview Questions & Concepts

---

## 1. Tokens, Context Window, Knowledge Cutoff & Hallucinations

A token is a sub-word text chunk (~4 characters). The context window is the maximum combined token capacity (input prompt plus output) the model can process in one call. Knowledge cutoff is the date after which training data ends.
Hallucinations occur because LLMs predict statistically plausible tokens, not facts. Reduce hallucinations using low temperature, grounding prompts with system constraints, few-shot examples, JSON schema enforcement, and Retrieval-Augmented Generation (RAG).

---

## 2. Temperature Control & Zero-Temperature Use Cases

Temperature scales the softmax probability distribution over predicted tokens. Higher values (0.7–1.0) flatten the distribution, introducing lexical diversity and creativity. Lower values sharpen probabilities, selecting the highest-probability tokens.
Use temperature 0 for deterministic, factual tasks requiring strict schema compliance—such as structured JSON data extraction (`/api/ai/extract`), code generation, or classification—where reproducibility and zero creative drift are mandatory.

---

## 3. Model Selection Strategy & Cost Control

Choose models based on task complexity: lightweight models (Gemini 2.5 Flash, GPT-4o-mini) for high-frequency extraction, summarization, and classification; frontier models (GPT-4o, Claude 3.5 Sonnet) for deep reasoning or multi-step logic.
Control costs by selecting cost-effective flash models, enforcing hard input character limits (e.g., 6,000 chars), pruning verbose system prompts, caching static prompts, and logging per-request token usage in a database (`AiUsage`) with strict budget thresholds.
