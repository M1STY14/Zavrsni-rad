import React from 'react';
import '../App.css';
import showcase from '../myfinesspallogo.png'
import { count } from 'd3';

const Home = () => {
  const [test, countTest] = React.useState(0);
  const naslov = React.useRef(null);

  const updateTest = () => {
    countTest(test + 1);
  }

  React.useEffect(() => {
    //nesto
  }, []);

  return (
    <>
      <div className="text_section">
        <h1 className="naslov_zavrsnog_rada" ref={naslov}>Vizualizacija Merkle stabla u stvarnim sustavima</h1>
        <h1>kao što su:</h1>
        <div className="Scroller">
          <span>
            <div style={{ color: "#f7931a" }}>Bitcoin</div>
            <div style={{ color: "#6e5494" }}>Git</div>
            <div style={{ color: "#58d033" }}>BitTorrent</div>
          </span>
        </div>
        <button onClick={updateTest}>Test</button>
        <p>
          <br />Ova aplikacija vizualizira Merkle stablo koristeći React<br /> i D3.js. Korisnici mogu unijeti niz podataka, a aplikacija<br /> će generirati i prikazati odgovarajuće Merkle stablo.
        </p>
      </div>
      <div className="Visualization_showcase">
        <img src={showcase} alt="Merkle Tree Visualization" />
      </div>
      <div className="main_footer">
        <p>Leo Kocijan &copy; 2025</p>
        <p>All rights reserved.</p>
      </div>
    </>
  );
}
export default Home;