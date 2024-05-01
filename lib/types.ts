import { z } from "zod";

export const CompletionRequestBody = z.object({
  layers: z.array(z.string()),
  systemRole: z.string(),
});

export type CompletionRequestBodyType = z.infer<typeof CompletionRequestBody>;
