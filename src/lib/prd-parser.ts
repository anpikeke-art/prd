import { z } from 'zod';

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(''),
});

const subFeatureSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(''),
  tasks: z.array(taskSchema).min(1),
});

const featureSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(''),
  priority: z.enum(['P0', 'P1', 'P2']).optional().default('P0'),
  acceptance_criteria: z.array(z.string().min(1)).min(1),
  sub_features: z.array(subFeatureSchema).min(1),
});

export const prdResponseSchema = z.object({
  overview: z.string().min(1),
  problem_statement: z.string().min(1).optional().default(''),
  non_functional_requirements: z.array(z.string()).optional().default([]),
  architecture_text: z.string().min(1),
  features: z.array(featureSchema).min(1),
});

export const featureExtractSchema = z.object({
  features: z.array(featureSchema).min(1),
});

export function parseJson(text: string) {
  return JSON.parse(text) as unknown;
}
