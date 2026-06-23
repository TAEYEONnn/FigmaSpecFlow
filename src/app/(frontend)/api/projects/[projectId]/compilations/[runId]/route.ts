import { NextResponse } from "next/server";
import { AppError, apiError } from "@/lib/api/response";
import { getCompilationRun } from "@/lib/projects/service";
import { getAuthContext } from "@/lib/auth/context";
import { requireProjectAccess } from "@/lib/access/project-scope";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; runId: string }> },
) {
  try {
    const { projectId, runId } = await params;
    const auth = await getAuthContext();
    if (!auth) throw new AppError("UNAUTHORIZED", "로그인이 필요합니다.");
    await requireProjectAccess(projectId, auth.userId).catch(() => {
      throw new AppError("FORBIDDEN", "이 프로젝트에 접근할 수 없습니다.");
    });
    const run = await getCompilationRun(projectId, runId);
    if (!run) {
      return NextResponse.json({ error: "정리 기록을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ run });
  } catch (error) {
    return apiError(error);
  }
}
