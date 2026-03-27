import { collectChatResponse, resolveModel } from '../backend/chat-service.js';

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
      },
    );

    return {
      output,
    };
  }
}
