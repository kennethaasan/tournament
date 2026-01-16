import { NextResponse } from "next/server";
import {
  createStage,
  listStages,
  reorderStages,
} from "@/modules/editions/service";
import { assertEditionAdminAccess } from "@/server/api/edition-access";
import { createApiHandler } from "@/server/api/handler";

type CreateStageBody = {
  name: string;
  stage_type: "group" | "bracket";
  groups?: Array<{
    code: string;
    name?: string | null;
  }>;
};

type RouteParams = {
  editionId: string;
};

type ReorderStagesBody = {
  stage_ids: string[];
};

export const POST = createApiHandler<RouteParams>(
  async ({ request, params, auth }) => {
    const editionId = Array.isArray(params.editionId)
      ? params.editionId[0]
      : params.editionId;
    const edition = await assertEditionAdminAccess(editionId, auth);

    const payload = (await request.json()) as CreateStageBody;

    const stageType =
      payload.stage_type === "bracket" ? "knockout" : payload.stage_type;

    const result = await createStage({
      editionId: edition.id,
      name: payload.name,
      stageType,
      groups: payload.groups?.map((group) => ({
        code: group.code,
        name: group.name,
      })),
    });

    return NextResponse.json(
      {
        id: result.id,
        edition_id: result.editionId,
        name: result.name,
        stage_type: result.stageType === "knockout" ? "bracket" : "group",
        order: result.orderIndex,
        published_at: result.publishedAt
          ? result.publishedAt.toISOString()
          : null,
        groups: result.groups.map((group) => ({
          id: group.id,
          code: group.code,
          name: group.name,
          standings: [],
        })),
      },
      { status: 201 },
    );
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

export const GET = createApiHandler<RouteParams>(
  async ({ params, auth }) => {
    const editionId = Array.isArray(params.editionId)
      ? params.editionId[0]
      : params.editionId;
    const edition = await assertEditionAdminAccess(editionId, auth);

    const stages = await listStages(edition.id);

    return NextResponse.json(
      {
        stages: stages.map((stage) => ({
          id: stage.id,
          edition_id: stage.editionId,
          name: stage.name,
          stage_type: stage.stageType === "knockout" ? "bracket" : "group",
          order: stage.orderIndex,
          published_at: stage.publishedAt
            ? stage.publishedAt.toISOString()
            : null,
          groups: stage.groups.map((group) => ({
            id: group.id,
            code: group.code,
            name: group.name,
            standings: [],
          })),
        })),
      },
      { status: 200 },
    );
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

export const PATCH = createApiHandler<RouteParams>(
  async ({ request, params, auth }) => {
    const editionId = Array.isArray(params.editionId)
      ? params.editionId[0]
      : params.editionId;
    const edition = await assertEditionAdminAccess(editionId, auth);
    const payload = (await request.json()) as ReorderStagesBody;

    const stages = await reorderStages(edition.id, payload.stage_ids ?? []);

    return NextResponse.json(
      {
        stages: stages.map((stage) => ({
          id: stage.id,
          edition_id: stage.editionId,
          name: stage.name,
          stage_type: stage.stageType === "knockout" ? "bracket" : "group",
          order: stage.orderIndex,
          published_at: stage.publishedAt
            ? stage.publishedAt.toISOString()
            : null,
          groups: stage.groups.map((group) => ({
            id: group.id,
            code: group.code,
            name: group.name,
            standings: [],
          })),
        })),
      },
      { status: 200 },
    );
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);
