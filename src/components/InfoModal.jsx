import React from 'react';

export default function InfoModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="info-modal-backdrop" onClick={onClose}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="info-modal-header">
          <h2 className="info-modal-title">O projektu</h2>
          <button className="info-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="info-modal-body">
          <div className="info-card">
            <h3 style={{
              background: 'linear-gradient(135deg, #00d4ff 0%, #667eea 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: '1.4rem',
              marginBottom: '0.8rem'
            }}>
              Sto su Merkle stabla?
            </h3>
            <p>
              Merkle stabla su kriptografske strukture podataka koje omogucuju ucinkovito i sigurno
              provjeravanje integriteta velikih skupova podataka. Koriste se u distribuiranim sustavima
              poput Bitcoina, Gita i BitTorrenta za osiguravanje da podaci nisu izmijenjeni.
            </p>
          </div>

          <div className="info-card">
            <h3 style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: '1.4rem',
              marginBottom: '0.8rem'
            }}>
              O aplikaciji
            </h3>
            <p style={{ marginBottom: '1rem' }}>
              Ova aplikacija omogucava interaktivnu vizualizaciju Merkle stabala koristeci moderne
              web tehnologije. Korisnici mogu istrazivati kako Merkle stabla funkcioniraju
              u stvarnim sustavima.
            </p>
            <div className="info-tech-grid">
              <div className="info-tech-item" style={{ background: 'rgba(0, 212, 255, 0.1)', borderColor: 'rgba(0, 212, 255, 0.2)' }}>
                <strong style={{ color: '#00d4ff' }}>React</strong>
                <span>UI biblioteka</span>
              </div>
              <div className="info-tech-item" style={{ background: 'rgba(102, 126, 234, 0.1)', borderColor: 'rgba(102, 126, 234, 0.2)' }}>
                <strong style={{ color: '#667eea' }}>Three.js</strong>
                <span>3D vizualizacija</span>
              </div>
              <div className="info-tech-item" style={{ background: 'rgba(118, 75, 162, 0.1)', borderColor: 'rgba(118, 75, 162, 0.2)' }}>
                <strong style={{ color: '#764ba2' }}>Vite</strong>
                <span>Build tool</span>
              </div>
            </div>
          </div>

          <div className="info-card">
            <h3 style={{
              background: 'linear-gradient(135deg, #f7931a 0%, #ff9500 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: '1.4rem',
              marginBottom: '0.8rem'
            }}>
              Primjene u stvarnom svijetu
            </h3>
            <ul className="info-apps-list">
              <li style={{ background: 'rgba(247, 147, 26, 0.1)', borderLeftColor: '#f7931a' }}>
                <strong style={{ color: '#f7931a' }}>Bitcoin:</strong> Verifikacija transakcija u blokovima
              </li>
              <li style={{ background: 'rgba(110, 84, 148, 0.1)', borderLeftColor: '#6e5494' }}>
                <strong style={{ color: '#6e5494' }}>Git:</strong> Integritet commit history
              </li>
              <li style={{ background: 'rgba(88, 208, 51, 0.1)', borderLeftColor: '#58d033' }}>
                <strong style={{ color: '#58d033' }}>BitTorrent:</strong> Verifikacija dijelova datoteka
              </li>
            </ul>
          </div>
        </div>

        <div className="info-modal-footer">
          <p>Leo Kocijan &copy; 2025</p>
          <p>Zavrsni rad - Vizualizacija Merkle stabala</p>
        </div>
      </div>
    </div>
  );
}
