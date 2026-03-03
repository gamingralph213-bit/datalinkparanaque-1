'use server';
/**
 * @fileOverview This flow analyzes raw land record data to suggest PIN-based calibration rules.
 *
 * - suggestCalibrationRules - A function that suggests calibration rules based on input data.
 * - SuggestCalibrationRulesInput - The input type for the suggestCalibrationRules function.
 * - SuggestedCalibrationRule - The return type for a single suggested rule.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LandRecordSchema = z.object({
  date: z.string().optional(),
  arpNo: z.string().optional(),
  pin: z.string().describe('The Property Identification Number (PIN).'),
  type: z.string().optional(),
  acctName: z.string().optional(),
  location: z.string().optional(),
  kind: z.string().optional(),
  au: z.string().optional(),
  landArea: z.number().optional(),
  marketValue: z.number().optional(),
  assessedValue: z.number().optional(),
});

const SuggestCalibrationRulesInputSchema = z.object({
  records: z.array(LandRecordSchema).describe('An array of raw land record data.'),
});
export type SuggestCalibrationRulesInput = z.infer<typeof SuggestCalibrationRulesInputSchema>;

const SuggestedCalibrationRuleSchema = z.object({
  pinPattern: z
    .string()
    .describe(
      "A PIN pattern using 'x' as a wildcard (e.g., '124-00-001-010-x-x')."
    ),
  barangay: z.string().optional().describe('Suggested Barangay name for the pattern.'),
  section: z.string().optional().describe('Suggested Section name for the pattern.'),
});
export type SuggestedCalibrationRule = z.infer<typeof SuggestedCalibrationRuleSchema>;

const SuggestCalibrationRulesOutputSchema = z.object({
  rules: z
    .array(SuggestedCalibrationRuleSchema)
    .describe('An array of suggested calibration rules.'),
});
export type SuggestCalibrationRulesOutput = z.infer<
  typeof SuggestCalibrationRulesOutputSchema
>;

export async function suggestCalibrationRules(
  input: SuggestCalibrationRulesInput
): Promise<SuggestCalibrationRulesOutput> {
  return suggestCalibrationRulesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCalibrationRulesPrompt',
  input: { schema: SuggestCalibrationRulesInputSchema },
  output: { schema: SuggestCalibrationRulesOutputSchema },
  prompt: `You are an AI assistant specialized in analyzing land record data.
Your task is to review the provided raw land records and identify common patterns in the 'PIN' field, particularly in relation to the 'Location' field which often contains Barangay and Section information.

The PIN format is typically: (Parañaque City Index)-(District Code)-(Barangay Code)-(Section Code)-(Lot Number)-(Suffix).

Analyze the 'PIN' and 'Location' fields for patterns. For each identified common PIN prefix, suggest a corresponding 'Barangay' and 'Section' value that is frequently associated with that PIN prefix. Use the 'x' character as a wildcard for the Lot Number and Suffix parts of the PIN pattern if the Barangay and Section are consistent across different lot numbers for that prefix.

Return the suggestions in a JSON array of objects, where each object has a 'pinPattern', 'barangay', and 'section' field.

Example Input Record:
{
  "pin": "124-00-001-010-002-0000",
  "location": "HAVANA ST PH 3 BF HOMES",
  "barangay": "BF HOMES",
  "section": "PH 3"
}

Example Output Rule:
{
  "pinPattern": "124-00-001-010-x-x",
  "barangay": "BF HOMES",
  "section": "PH 3"
}

Focus on identifying patterns that would be useful for calibration, combining information from the location field to infer Barangay and Section if they are not explicitly provided as separate fields but can be derived from 'Location'. If explicit 'Barangay' and 'Section' fields are present in the input, prioritize those.

Raw Land Records:
{{{JSON.stringify records}}}
`,
});

const suggestCalibrationRulesFlow = ai.defineFlow(
  {
    name: 'suggestCalibrationRulesFlow',
    inputSchema: SuggestCalibrationRulesInputSchema,
    outputSchema: SuggestCalibrationRulesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
