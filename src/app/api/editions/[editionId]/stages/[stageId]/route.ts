import { NextResponse } from "next/server";
import { deleteStage } from "@/modules/editions/service";
import { assertEditionAdminAccess } from "@/server/api/edition-access";
import { createApiHandler } from "@/server/api/handler";

type RouteParams = {
  editionId: string;
  stageId: string;
};

export const DELETE = createApiHandler<RouteParams>(
  async ({ params, auth }) => {
    const editionId = Array.isArray(params.editionId)
      ? params.editionId[0]
      : params.editionId;
    const stageId = Array.isArray(params.stageId)
      ? params.stageId[0]
      : params.stageId;

    const edition = await assertEditionAdminAccess(editionId, auth);

    await deleteStage(edition.id, stageId);

    return new NextResponse(null, { status: 204 });
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);
