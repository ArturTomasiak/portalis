import "./finder.scss";

export default function Home() {
  return (
    <body>
        <header>
            <div className="logo">
                <img src="/portalis_report.webp" alt="portalis logo"/>
            </div>
            <div className="companies">
                <img className="seaglobal" src="/seaglobal.svg" alt="sea global logo"/>
                <img className="slipform" src="/slipform.webp" alt="slipform logo" />
            </div>
        </header>
        <main>
            <div className="search">

            </div>
            <div className="results">
                <div className="title">
                    <h1>List of ports meeting requirements:</h1>
                    <p className="subtitle">from closest to offshore coordinates to furthest</p>
                </div>

            </div>
        </main>
    </body>
  );
}
