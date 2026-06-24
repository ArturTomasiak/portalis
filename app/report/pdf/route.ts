import { NextResponse } from "next/server";
import { createPdfBuffer, safeFileName } from "../../lib/report";
import { getPortReport } from "../../lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePortId(request: Request): number | null {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("port"));

  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(request: Request) {
  const portId = parsePortId(request);

  if (!portId) {
    return NextResponse.json({ error: "Missing or invalid port id." }, { status: 400 });
  }

  const report = getPortReport(portId);

  if (!report) {
    return NextResponse.json({ error: "Port not found." }, { status: 404 });
  }

  const buffer = createPdfBuffer(report);
  const filename = `${safeFileName(report.port.name)}-port-report.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}