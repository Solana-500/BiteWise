
import { supabase } from '../lib/supabase';

export async function getAiMealRecommendation() {
  const { data, error } = await supabase.functions.invoke(
    'ai-recommend-meal',
    {
      body: {},
    }
  );

  if (error) {
    console.error('AI recommendation error:', error);
    throw error;
  }

  return data.recommendation as string;
}
