import { collectChatResponse, resolveModel } from '../backend/chat-service.js';

// Temperature is pinned to 0.2 (not 0) because several free OpenRouter models
// silently ignore temperature=0 and sample stochastically anyway. 0.2 trims the
// sampling tail without surprising the audience with obvious non-determinism.
const EVAL_TEMPERATURE = 0.2;

export default class CourseAssistantProvider {
  id() {
    return 'mlops-course-assistant';
  }

  async callApi(prompt, context) {
    const output = await collectChatResponse(
      {
        message: prompt,
        history: Array.isArray(context?.vars?.history)
          ? context.vars.history
          : [],
      },
      {
        apiKey: process.env.OPENROUTER_API_KEY,
        model: resolveModel(process.env),
        temperature: EVAL_TEMPERATURE,
      },
    );

    return {
      output,
    };
  }
}
