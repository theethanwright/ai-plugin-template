import { z } from "zod";

export const DataSchema = z.object({
    text: z.string(),
    css: z.array(z.string()),
    colors: z.array(z.string()),
    screenshot: z.instanceof(Buffer)  // Note: zod does not support Buffer directly, so we use z.instanceof
});
