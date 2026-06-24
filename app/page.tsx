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
            <h1>The tool for maritime logistics analysis.</h1>
            <p>Make maritime logistics research effortless. Our platform helps you evaluate and rank ports against your specific requirements, while an integrated report builder turns publicly available data into clear, decision-ready insights.</p>
            <a href="/finder">finder</a>
            <br></br>
            <a href="/rapport">rapport</a>
        </main>
    </body>
  );
}
