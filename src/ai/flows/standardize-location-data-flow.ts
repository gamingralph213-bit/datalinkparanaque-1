'use server';
/**
 * @fileOverview An AI agent for standardizing free-text location entries in Parañaque City land records.
 *
 * - standardizeLocationData - A function that handles the standardization process.
 * - StandardizeLocationDataInput - The input type for the standardizeLocationData function.
 * - StandardizeLocationDataOutput - The return type for the standardizeLocationData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StandardizeLocationDataInputSchema = z.object({
  locationText: z
    .string()
    .describe('Free-text location entry from Parañaque City land records.'),
});
export type StandardizeLocationDataInput = z.infer<
  typeof StandardizeLocationDataInputSchema
>;

const StandardizeLocationDataOutputSchema = z.object({
  standardizedLocation: z
    .string()
    .describe(
      'Standardized format of the location entry, suitable for Parañaque City land records.'
    ),
});
export type StandardizeLocationDataOutput = z.infer<
  typeof StandardizeLocationDataOutputSchema
>;

export async function standardizeLocationData(
  input: StandardizeLocationDataInput
): Promise<StandardizeLocationDataOutput> {
  return standardizeLocationDataFlow(input);
}

const standardizeLocationDataPrompt = ai.definePrompt({
  name: 'standardizeLocationDataPrompt',
  input: {schema: StandardizeLocationDataInputSchema},
  output: {schema: StandardizeLocationDataOutputSchema},
  prompt: `You are an expert in standardizing location entries for Parañaque City land records.
Your task is to take a free-text location entry and convert it into a standardized, clean format.
Focus on identifying key geographical information relevant to land records within Parañaque City and present it clearly.

Location Entry: {{{locationText}}}`,
});

const standardizeLocationDataFlow = ai.defineFlow(
  {
    name: 'standardizeLocationDataFlow',
    inputSchema: StandardizeLocationDataInputSchema,
    outputSchema: StandardizeLocationDataOutputSchema,
  },
  async (input) => {
    const {output} = await standardizeLocationDataPrompt(input);
    return output!;
  }
);
