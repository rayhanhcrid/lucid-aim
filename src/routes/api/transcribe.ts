import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return Response.json({ error: "Transkripsi belum aktif di server." }, { status: 503 });
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json({ error: "Format kiriman tidak valid." }, { status: 400 });
        }

        const file = form.get("audio");
        if (!(file instanceof File) || file.size < 2048) {
          return Response.json(
            { error: "Rekamannya kependekan atau kosong. Coba rekam ulang ya." },
            { status: 400 },
          );
        }
        if (file.size > 20 * 1024 * 1024) {
          return Response.json(
            { error: "Rekamannya kepanjangan. Coba bagi jadi beberapa bagian." },
            { status: 413 },
          );
        }

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("file", file, "recording.wav");
        upstream.append("language", "id");

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: upstream,
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          console.error("transcription failed", res.status, detail);
          const message =
            res.status === 429
              ? "Lagi ramai. Tunggu sebentar lalu coba lagi."
              : res.status === 402
                ? "Kuota AI habis. Tambahkan kredit dulu ya."
                : "Gagal mengubah suara jadi teks. Coba lagi sebentar lagi.";
          return Response.json({ error: message }, { status: res.status });
        }

        const data = (await res.json()) as { text?: string };
        return Response.json({ text: (data.text ?? "").trim() });
      },
    },
  },
});