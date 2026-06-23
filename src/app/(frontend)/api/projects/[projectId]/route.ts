import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { archiveProject, deleteProject, getProject, moveProject, renameProject, unarchiveProject } from "@/lib/projects/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    return apiError(error);
  }
}

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  teamId: z.string().nullable().optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const body = patchSchema.parse(await request.json());
    if (body.name !== undefined) await renameProject(projectId, body.name);
    if (body.teamId !== undefined) await moveProject(projectId, body.teamId);
    if (body.archived === true) await archiveProject(projectId);
    if (body.archived === false) await unarchiveProject(projectId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 422 });
    }
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    await deleteProject(projectId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
