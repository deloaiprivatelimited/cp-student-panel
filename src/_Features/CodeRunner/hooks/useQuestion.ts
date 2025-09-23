import { useState, useEffect } from 'react';
import { questionService } from '../services/api';
import type { Question } from '../types';


export function useQuestion(collection: string, questionId: string) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch question from API
        const data = await questionService.getQuestion(collection, questionId);
        setQuestion(data);
      } catch (err) {
        console.error('Error fetching question:', err);
        setError(err instanceof Error ? err.message : 'Failed to load question');
      } finally {
        setLoading(false);
      }
    };

    if (collection && questionId) {
      fetchQuestion();
    }
  }, [collection, questionId]);

  return { question, loading, error };
}