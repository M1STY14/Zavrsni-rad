import React from 'react';
import '../App.css';

const About = () => {
    return (
        <div className="text_section">
            <h1 style={{ marginBottom: '2rem' }}>O projektu</h1>

            <div style={{
                maxWidth: '900px',
                margin: '0 auto',
                display: 'grid',
                gap: '2rem'
            }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '20px',
                    padding: '2.5rem',
                    textAlign: 'left'
                }}>
                    <h2 style={{
                        fontSize: '1.8rem',
                        marginBottom: '1rem',
                        background: 'linear-gradient(135deg, #00d4ff 0%, #667eea 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        Što su Merkle stabla?
                    </h2>
                    <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'rgba(255,255,255,0.85)' }}>
                        Merkle stabla su kriptografske strukture podataka koje omogućuju učinkovito i sigurno
                        provjeravanje integriteta velikih skupova podataka. Koriste se u distribuiranim sustavima
                        poput Bitcoina, Gita i BitTorrenta za osiguravanje da podaci nisu izmijenjeni.
                    </p>
                </div>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '20px',
                    padding: '2.5rem',
                    textAlign: 'left'
                }}>
                    <h2 style={{
                        fontSize: '1.8rem',
                        marginBottom: '1rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        O aplikaciji
                    </h2>
                    <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'rgba(255,255,255,0.85)', marginBottom: '1rem' }}>
                        Ova aplikacija omogućava interaktivnu vizualizaciju Merkle stabala koristeći moderne
                        web tehnologije - React 19 i D3.js. Korisnici mogu istraživati kako Merkle stabla funkcioniraju
                        u stvarnim sustavima.
                    </p>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        marginTop: '1.5rem'
                    }}>
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(0, 212, 255, 0.1)',
                            borderRadius: '12px',
                            border: '1px solid rgba(0, 212, 255, 0.2)'
                        }}>
                            <strong style={{ color: '#00d4ff' }}>React 19</strong>
                            <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>Moderna UI biblioteka</p>
                        </div>
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(102, 126, 234, 0.1)',
                            borderRadius: '12px',
                            border: '1px solid rgba(102, 126, 234, 0.2)'
                        }}>
                            <strong style={{ color: '#667eea' }}>D3.js</strong>
                            <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>Vizualizacija podataka</p>
                        </div>
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(118, 75, 162, 0.1)',
                            borderRadius: '12px',
                            border: '1px solid rgba(118, 75, 162, 0.2)'
                        }}>
                            <strong style={{ color: '#764ba2' }}>Vite</strong>
                            <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>Build tool</p>
                        </div>
                    </div>
                </div>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '20px',
                    padding: '2.5rem',
                    textAlign: 'left'
                }}>
                    <h2 style={{
                        fontSize: '1.8rem',
                        marginBottom: '1rem',
                        background: 'linear-gradient(135deg, #f7931a 0%, #ff9500 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        Primjene u stvarnom svijetu
                    </h2>
                    <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        display: 'grid',
                        gap: '1rem'
                    }}>
                        <li style={{
                            padding: '1rem 1.5rem',
                            background: 'rgba(247, 147, 26, 0.1)',
                            borderLeft: '4px solid #f7931a',
                            borderRadius: '8px'
                        }}>
                            <strong style={{ color: '#f7931a' }}>Bitcoin:</strong> Verifikacija transakcija u blokovima
                        </li>
                        <li style={{
                            padding: '1rem 1.5rem',
                            background: 'rgba(110, 84, 148, 0.1)',
                            borderLeft: '4px solid #6e5494',
                            borderRadius: '8px'
                        }}>
                            <strong style={{ color: '#6e5494' }}>Git:</strong> Integritet commit history
                        </li>
                        <li style={{
                            padding: '1rem 1.5rem',
                            background: 'rgba(88, 208, 51, 0.1)',
                            borderLeft: '4px solid #58d033',
                            borderRadius: '8px'
                        }}>
                            <strong style={{ color: '#58d033' }}>BitTorrent:</strong> Verifikacija dijelova datoteka
                        </li>
                    </ul>
                </div>
            </div>

            <div className="main_footer" style={{ marginTop: '4rem' }}>
                <p>Leo Kocijan &copy; 2025</p>
                <p>Završni rad - Vizualizacija Merkle stabala</p>
            </div>
        </div>
    );
}

export default About;