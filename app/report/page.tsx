import "./report.scss";
import { buildPortReportLines } from "../lib/report";
import { getPortReport, getPorts } from "../lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReportPageProps = {
  searchParams?: Promise<{
    port?: string;
  }>;
};

function parsePortId(value: string | undefined): number | null {
  if (!value) return null;

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const params = await searchParams;
  const ports = getPorts();
  const selectedPortId = parsePortId(params?.port) ?? ports[0]?.id ?? null;
  const report = selectedPortId ? getPortReport(selectedPortId) : null;
  const reportLines = report ? buildPortReportLines(report) : [];

  return (
    <body>
      <header>
        <div className="logo">
          <img src="/portalis_report.webp" alt="portalis logo" />
        </div>

        <div className="companies">
          <img className="seaglobal" src="/seaglobal.svg" alt="sea global logo" />
          <img className="slipform" src="/slipform.webp" alt="slipform logo" />
        </div>
      </header>

      <main className="report-page">
        <section className="report-search">
          <div>
            <p className="eyebrow">Port documentation</p>
            <h1>Create port report</h1>
            <p className="subtitle">
              Select a seeded port and generate a DOCX or PDF with the data currently stored for it.
            </p>
          </div>

          <form className="report-form" action="/report">
            <label>
              Port
              <select name="port" defaultValue={selectedPortId ?? ""} required>
                {ports.map((port) => (
                  <option key={port.id} value={port.id}>
                    {port.name}
                    {port.unlocode ? ` (${port.unlocode})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit">Show report</button>
          </form>
        </section>

        {report ? (
          <section className="report-preview">
            <div className="report-actions">
              <a href={`/report/docx?port=${report.port.id}`}>Create DOCX</a>
              <a href={`/report/pdf?port=${report.port.id}`}>Create PDF</a>
            </div>

            <div className="report-document">
              {reportLines.map((line, index) => {
                if (line === "") {
                  return <div key={`${index}-space`} className="report-space" />;
                }

                if (index === 0) {
                  return <h2 key={`${index}-${line}`}>{line}</h2>;
                }

                if (!line.startsWith("-")) {
                  return <h3 key={`${index}-${line}`}>{line}</h3>;
                }

                return <p key={`${index}-${line}`}>{line}</p>;
              })}
            </div>
          </section>
        ) : (
          <section className="report-preview">
            <div className="report-document">
              <h2>No port data available</h2>
              <p>The database does not contain any ports yet.</p>
            </div>
          </section>
        )}
      </main>
      <a className="go-back-button" href="/">
        Go back
        </a>
    </body>
  );
}