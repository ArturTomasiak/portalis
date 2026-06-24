import "./search.scss";

const months = [
  "jan", "feb", "mar",
  "apr", "may", "jun",
  "jul", "aug", "sep",
  "oct", "nov", "dec",
];


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
            <form className="search">
            <div className="column">
                <div className="field">
                    <label className="titile">Enter offshore coordinates:</label>
                    <div className="coordinates">
                        <input type="text" aria-label="Latitude degrees" />
                        <span>°</span>
                        <input type="text" aria-label="Latitude minutes" />
                        <span>&apos;</span>
                        <span>N</span>
                        <input type="text" aria-label="Longitude degrees" />
                        <span>°</span>
                        <input type="text" aria-label="Longitude minutes" />
                        <span>&apos;</span>
                        <span>E</span>
                    </div>
                </div>
                <div className="field">
                    <label>Minimum number of berths:</label>
                    <input className="small-input" type="number" defaultValue={0} />
                </div>
                <div className="field">
                    <label>Storage area:</label>
                    <div className="unit-input">
                        <input className="small-input" type="number" defaultValue={0} />
                        <span>m²</span>
                    </div>
                </div>
                <div className="field">
                    <label>Vessels:</label>
                    <select className="vessel-select">
                        <option value="Chipolbrok Pacific">Chipolbrok Pacific</option>
                        <option value="Vessel 2">Vessel 2</option>
                        <option value="Vessel 3">Vessel 3</option>
                    </select>
                    <button className="plus-btn" type="button">
                        +
                    </button>
                </div>
            </div>
            <div className="column">
                <label className="title">Crane requirements:</label>
                <div className="field">
                    <label>Min quantity</label>
                    <input className="small-input" type="number" defaultValue={0} />
                </div>
                <div className="field">
                    <label>Min lifting capacity</label>
                    <div className="user-input">
                        <input className="small-input" type="number" defaultValue={0} />
                        <span>T</span>
                    </div>
                </div>
                <div className="field">
                    <label>Min outreach</label>
                    <div className="unit-input">
                        <input className="small-input" type="number" defaultValue={0} />
                        <span>m</span>
                    </div>
                </div>
                <div className="field">
                    <label>Min hook height</label>
                    <div className="unit-input">
                        <input className="small-input" type="number" defaultValue={0} />
                        <span>m</span>
                    </div>
                </div>
            </div>
            <div className="column">
                <label className="title">Required operational period:</label>
                <div className="months">
                    {months.map((month) => (
                        <label key={month}>
                        <input
                            type="checkbox"
                            name="month"
                            value={month}
                            defaultChecked
                        />
                        <span>{month}</span>
                        </label>
                    ))}
                </div>
                <button className="seach-btn" type="submit">Search</button>
            </div>
            </form>
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
