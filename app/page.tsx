import "./landing.scss";

export default function Home() {
  return (
    <body>
        <header>
            <div className="logo">
                <img src="/portalis.webp" alt="portalis logo"/>
            </div>
            <div className="companies">
                <img src="/seaglobal.svg" alt="sea global logo"/>
                <img className="slipform" src="/slipform.webp" alt="slipform logo" />
            </div>
        </header>
        <main>
            <div className="section primary">
                <div className="cta">
                    <img src="/portalis_search.webp" alt="portalis logo"/>
                    <p>Portalis Search analyzes ports against key criteria such as storage capacity, berth depth, quay specifications, crane availability, vessel limitations, and distance to the offshore location. The result is a clear list of ports that meet your storage, berth, and lifting requirements, ranked by proximity and operational suitability.</p>
                </div>
                <div className="quote">
                    <p>Identify the most suitable ports for your offshore project with a ranked shortlist based on your operational requirements.</p>
                </div>
                <a href="/search">portalis search</a>
            </div>
            <div className="section secondary">
                <div className="cta">
                    <img src="/portalis_report.webp" alt="portalis logo"/>
                    <p>The Portalis Report provides detailed port specifications, operational constraints, infrastructure data, contact points, weather forecast and references for further verification. It also identifies who to contact for pricing, availability, and non-public operational information. Each report is convertable to .docx as well as .pdf.</p>
                    <a href="/report">portalis report</a>
                </div>
                <div className="quote">
                    <p>Structured, project-specific port report prepared for offshore wind farm planning, logistics, and decision-making.</p>
                </div>
            </div>
        </main>
    </body>
  );
}
