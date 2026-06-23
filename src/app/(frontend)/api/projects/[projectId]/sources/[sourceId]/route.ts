import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { deleteSource, updateSource } from "@/lib/projects/service";
import { extractPdfText, pdfResultToSourceText } from "@/lib/sources/pdf-extract";
import { validateSourceInput } from "@/lib/sources/source-input";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  fileSize: z.number().optional(),
  isPdfBase64: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; sourceId: string }> },
) {
  try {
    const { projectId, sourceId } = await params;
    const body = patchSchema.parse(await request.json());

    if (body.content !== undefined) {
      let text = body.content;
      if (body.isPdfBase64) {
        const buffer = Buffer.from(body.content, "base64");
        const result = extractPdfText(buffer);
        text = pdfResultToSourceText(result);
        if (!text.trim()) {
          return NextResponse.json(
            { error: "PDF에서 텍스트를 추출할 수 없습니다. 텍스트 기반 PDF인지 확인해 주세요." },
            { status: 422 },
          );
        }
      }
      const validated = validateSourceInput({ text, fileSize: body.fileSize });
      body.content = validated.text;
    }

    const source = await updateSource(projectId, sourceId, { name: body.name, content: body.content });
    return NextResponse.json({ source });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력 형식을 확인해 주세요." }, { status: 422 });
    }
    if (error instanceof Error && /입력|100,000|10MB|TXT|PDF/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; sourceId: string }> },
) {
  try {
    const { projectId, sourceId } = await params;
    await deleteSource(projectId, sourceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
