import z from "zod";

const envSchema = z.object({
    BOT_TOKEN: z.string(),
    API_BASE_URL: z.string().default("http://localhost:8080"),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error("Invalid environment variables:", JSON.stringify(z.treeifyError(result.error)));
        process.exit(1);
    }

    return result.data;
}

export const env = validateEnv();
