import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requestWeeklyAdvice } from "./review.server";

const SummarySchema = z.object({
  skorMingguIni: z.number(),
  skorMingguLalu: z.number(),
  kebiasaanTerkuat: z.array(z.string()).max(10),
  kebiasaanTerlemah: z.array(z.string()).max(10),
  rataMood: z.number().nullable(),
  rataEnergi: z.number().nullable(),
  jumlahJurnal: z.number(),
  tujuanMingguanBelumSelesai: z.array(z.string()).max(10),
  polaHarian: z.array(z.string()).max(7),
});

export const getWeeklyAdvice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SummarySchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { advice: "", error: "NO_KEY" as const };

    try {
      const advice = await requestWeeklyAdvice(apiKey, data);
      if (!advice) return { advice: "", error: "EMPTY" as const };
      return { advice, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN";
      console.error("weekly advice failed:", message);
      return { advice: "", error: message };
    }
  });