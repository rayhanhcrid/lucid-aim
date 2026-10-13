import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requestTxParse } from "./finance-ai.server";
import type { ParsedTx } from "./finance-parse";

const RequestSchema = z.object({
  text: z.string().trim().min(1).max(500),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accounts: z
    .array(
      z.object({
        id: z.string().max(40),
        name: z.string().max(60),
        type: z.enum(["bank", "ewallet", "cash", "investment"]),
      }),
    )
    .max(50),
  categories: z
    .array(
      z.object({
        id: z.string().max(40),
        name: z.string().max(40),
        type: z.enum(["income", "expense"]),
      }),
    )
    .max(100),
});

export type ParseTxResult = { items: ParsedTx[]; error: string | null };

/**
 * Kalimat bebas → transaksi, lewat Lovable AI. Hanya kalimat itu sendiri plus
 * nama akun & kategori yang dikirim — tanpa saldo atau riwayat transaksi.
 */
export const parseTransactionText = createServerFn({ method: "POST" })
  .validator((input: unknown) => RequestSchema.parse(input))
  .handler(async ({ data }): Promise<ParseTxResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { items: [], error: "NO_KEY" };

    try {
      return { items: await requestTxParse(apiKey, data), error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN";
      console.error("transaction parse failed:", message);
      return { items: [], error: message };
    }
  });
