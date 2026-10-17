import { hybridApi } from "../../../../../../server/hybrid/api.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return hybridApi.capabilities(request); }
export async function POST(request: Request) { return hybridApi.submit(request); }
export async function OPTIONS(request: Request) { return hybridApi.capabilities(request); }
