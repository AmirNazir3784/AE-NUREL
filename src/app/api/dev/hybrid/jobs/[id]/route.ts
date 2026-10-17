import { hybridApi } from "../../../../../../../server/hybrid/api.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { return hybridApi.status(request, (await params).id); }
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) { return hybridApi.cancel(request, (await params).id); }
export async function OPTIONS(request: Request, { params }: { params: Promise<{ id: string }> }) { return hybridApi.status(request, (await params).id); }
