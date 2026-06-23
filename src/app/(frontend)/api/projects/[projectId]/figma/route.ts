import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, apiError } from "@/lib/api/response";
import { recommendFigmaComponents } from "@/lib/figma/recommend";
import type { FigmaLibrary } from "@/lib/figma/types";
import { getProject } from "@/lib/projects/service";
import { getAuthContext } from "@/lib/auth/context";
import { requireProjectAccess } from "@/lib/access/project-scope";

const figmaVariantSchema = z.object({
  property: z.string(),
  values: z.array(z.string()),
});

const figmaComponentSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().default(""),
  variants: z.array(figmaVariantSchema).optional(),
});

const figmaVariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  resolvedType: z.enum(["COLOR", "FLOAT", "STRING", "BOOLEAN"]),
  valuesByMode: z.record(z.string(), z.unknown()),
});

const bodySchema = z.object({
  fileKey: z.string().min(1),
  fileName: z.string().default("Figma Library"),
  components: z.array(figmaComponentSchema).default([]),
  variables: z.array(figmaVariableSchema).default([]),
  screenIds: z.array(z.string()).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const auth = await getAuthContext();
    if (!auth) throw new AppError("UNAUTHORIZED", "로그인이 필요합니다.");
    await requireProjectAccess(projectId, auth.userId).catch(() => {
      throw new AppError("FORBIDDEN", "이 프로젝트에 접근할 수 없습니다.");
    });
    const project = await getProject(projectId);
    if (!project?.document) {
      return NextResponse.json({ error: "정리된 문서가 없습니다." }, { status: 404 });
    }

    const body = bodySchema.parse(await request.json());
    const library: FigmaLibrary = {
      fileKey: body.fileKey,
      fileName: body.fileName,
      components: body.components,
      variables: body.variables,
      fetchedAt: new Date().toISOString(),
    };

    const screens = body.screenIds
      ? project.document.screens.filter((s) => body.screenIds!.includes(s.id))
      : project.document.screens;

    const recommendations = await recommendFigmaComponents(screens, library);
    return NextResponse.json({ recommendations, libraryName: library.fileName });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력 형식을 확인해 주세요." }, { status: 422 });
    }
    return apiError(error);
  }
}
