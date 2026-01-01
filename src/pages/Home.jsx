import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css';
import BackgroundVisualization3D from '../components/BackgroundVisualization3D';

const Home = () => {
  const naslov = React.useRef(null);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    // Add floating animation on mount
    const title = naslov.current;
    if (title) {
      title.style.animation = 'fadeInUp 1s ease-out';
    }

    // Handle window resize for mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Fixed 3D background layer */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0
      }}>
        <BackgroundVisualization3D isMobile={isMobile} />
      </div>

      {/* Content layer */}
      <div className="text_section" style={{ position: 'relative', zIndex: 1 }}>
        <h1 className="naslov_zavrsnog_rada" ref={naslov}>
          Vizualizacija Merkle stabla
          <br />
          u stvarnim sustavima
        </h1>

        <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 500, opacity: 0.9 }}>
          kao što su:
        </h1>

        <div className="Scroller">
          <span>
            <div style={{
              background: 'linear-gradient(135deg, #f7931a 0%, #ff9500 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Bitcoin</div>
            <div style={{
              background: 'linear-gradient(135deg, #6e5494 0%, #9b59b6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Git</div>
            <div style={{
              background: 'linear-gradient(135deg, #58d033 0%, #7bed9f 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>BitTorrent</div>
          </span>
        </div>

        <p style={{ marginTop: '2rem', fontSize: '1.15rem', maxWidth: '800px' }}>
          Ova aplikacija vizualizira Merkle stablo koristeći React i D3.js.
          Istraži kako se Merkle stabla koriste u modernim distribuiranim sustavima
          za osiguravanje integriteta podataka.
        </p>

        <Link to="/visualizations">
          <button style={{ marginTop: '2rem' }}>
            Počni istraživati
          </button>
        </Link>
      </div>

      <div className="main_footer" style={{ position: 'relative', zIndex: 1 }}>
        <p>Leo Kocijan &copy; 2025</p>
        <p>All rights reserved.</p>
      </div>
    </div>
  );
}

export default Home;