// services/questionService.ts
import { privateAxios, publicAxios } from "../../../utils/axios";

const BASE = "/coding/questions/test/submit"; // matches your Flask blueprint prefix

export const questionService = {
  // Fetch a specific question
  getQuestion: async (collection: string, questionId: string) => {
    try {
      const response = await publicAxios.get(`${BASE}/${collection}/${questionId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching question:", error);
      throw error;
    }
  },

  // Run code (custom input). Calls backend: POST /coding/questions/:collection/:id/run
  runCode: async (
    collection: string,
    questionId: string,
    source_code: string,
    language: string,
    stdin: string
  ) => {
    try {
      const response = await privateAxios.post(
        `${BASE}/${collection}/${questionId}/run`,
        {
          source_code,
          language,
          stdin,
          wait: true // synchronous by default to return result immediately
        }
      );
      // response.data shape:
      // { question_id, language_id, result: { token, status, stdout, stderr, compile_output, message, time, memory } }
      return response.data;
    } catch (error) {
      console.error("Error running code:", error);
      throw error;
    }
  },

  // Submit code (official submission against hidden testcases).
  // Backend endpoint expected: POST /coding/questions/:collection/:id/submit
  submitCode: async (
    collection: string,
    questionId: string,
    source_code: string,
    language: string
  ) => {
    try {
      const response = await privateAxios.post(`${BASE}/${collection}/${questionId}/submit`, {
        source_code,
        language
      });
      // response shape depends on backend (you may return token or submission record)
      return response.data;
    } catch (error) {
      console.error("Error submitting code:", error);
      throw error;
    }
  }
};
