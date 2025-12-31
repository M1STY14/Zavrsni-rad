import React, { useState, useEffect } from 'react';
import '../App.css';
import VisualizacijaStabla from '../components/VisualizacijaStabla.jsx';
import VisualizacijaStabla3D from '../components/VisualizacijaStabla3D.jsx';
import { getBitcoinBlock } from '../api.js';

const Visualizations = () => {
    const [rootHash, setRootHash] = useState(null);
    const [data, setData] = useState(null);
    const [blockNum, setBlockHeight] = useState('');
    const [blockHash, setBlockHash] = useState('');
    const [transactionList, setTransactionList] = useState('');
    const [singleTransaction, setSingleTransaction] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [view3D, setView3D] = useState(true); // Default to 3D view

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            let res;
            if (blockNum) {
                res = await fetch(`/api/block-by-height/${blockNum}`).then(r => r.json());
            } else if (blockHash) {
                res = await fetch(`/api/block/${blockHash}`).then(r => r.json());
            } else if (transactionList) {
                const txs = transactionList.split(',').map(s => s.trim());
                res = await fetch('/api/merkle-from-list', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ transactions: txs })
                }).then(r => r.json());
            } else if (singleTransaction) {
                res = await fetch('/api/merkle-proof', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ txid: singleTransaction })
                }).then(r => r.json());
            }

            if (res && !res.error) {
                setData(res.tree || res.proof);
                setRootHash(res.rootHash);
            } else {
                setError(res?.error || 'Greška pri obradi podataka');
            }
        } catch (error) {
            console.error("Error processing input:", error);
            setError('Greška pri povezivanju sa serverom');
        } finally {
            setLoading(false);
        }
    };

    const clearInputs = () => {
        setBlockHeight('');
        setBlockHash('');
        setTransactionList('');
        setSingleTransaction('');
        setData(null);
        setRootHash(null);
        setError(null);
    };

    return (
        <>
            <div className='text_section' style={{ minHeight: 'auto', paddingTop: '140px', paddingBottom: '40px' }}>
                <h1 style={{ marginBottom: '0.5rem' }}>Vizualizacije Merkle stabla</h1>
                <p style={{ fontSize: '1rem', opacity: 0.8 }}>
                    Istražite Merkle stabla kroz različite izvore podataka
                </p>
            </div>

            <div className="InputContainer">
                <div style={{
                    marginBottom: '1rem',
                    padding: '1rem 1.5rem',
                    background: 'rgba(0, 212, 255, 0.08)',
                    border: '1px solid rgba(0, 212, 255, 0.2)',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.9)',
                    textAlign: 'center'
                }}>
                    💡 <strong>Savjet:</strong> Za testiranje, pokušajte Bitcoin blok <strong>100000</strong> ili <strong>500000</strong>, ili unesite vlastite transakcije (npr: tx1, tx2, tx3, tx4)
                </div>

                <div className="BitcoinInputs">
                    <label>
                        Broj Bitcoin bloka
                        <input
                            type="number"
                            min="0"
                            max="100000000"
                            value={blockNum}
                            onChange={(e) => setBlockHeight(e.target.value)}
                            placeholder="100000 ili 500000"
                        />
                    </label>
                    <label>
                        Hash Bitcoin bloka
                        <input
                            type="text"
                            value={blockHash}
                            onChange={(e) => setBlockHash(e.target.value)}
                            placeholder="0000000000..."
                        />
                    </label>
                    <label>
                        Popis transakcija (odvojene zarezom)
                        <input
                            type="text"
                            value={transactionList}
                            onChange={(e) => setTransactionList(e.target.value)}
                            placeholder="tx1, tx2, tx3, tx4..."
                        />
                    </label>
                    <label>
                        Pojedinačna transakcija (za dokaz)
                        <input
                            type="text"
                            value={singleTransaction}
                            onChange={(e) => setSingleTransaction(e.target.value)}
                            placeholder="Prvo generiraj stablo"
                            disabled={!rootHash}
                            title={!rootHash ? "Prvo generirajte stablo koristeći 'Popis transakcija'" : "Unesite transakciju iz generiranog stabla"}
                        />
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Učitavanje...' : 'Generiraj stablo'}
                    </button>
                    <button
                        onClick={clearInputs}
                        style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                            border: '2px solid rgba(255,255,255,0.2)'
                        }}
                    >
                        Očisti
                    </button>
                    <button
                        onClick={() => setView3D(!view3D)}
                        style={{
                            background: view3D
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                : 'linear-gradient(135deg, rgba(102,126,234,0.3) 0%, rgba(118,75,162,0.3) 100%)',
                            border: '2px solid rgba(102,126,234,0.5)'
                        }}
                    >
                        {view3D ? '🌐 3D Prikaz' : '📊 2D Prikaz'}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{
                    padding: '1rem 2rem',
                    background: 'rgba(255, 100, 100, 0.15)',
                    border: '2px solid rgba(255, 100, 100, 0.3)',
                    borderRadius: '12px',
                    color: '#ff6b6b',
                    marginBottom: '2rem',
                    maxWidth: '600px',
                    margin: '2rem auto'
                }}>
                    {error}
                </div>
            )}

            {rootHash && (
                <div style={{
                    padding: '1.5rem 2rem',
                    background: 'rgba(0, 212, 255, 0.1)',
                    border: '2px solid rgba(0, 212, 255, 0.3)',
                    borderRadius: '12px',
                    maxWidth: '900px',
                    margin: '2rem auto',
                    wordBreak: 'break-all'
                }}>
                    <strong style={{ color: '#00d4ff' }}>Root Hash:</strong>
                    <br />
                    <code style={{ fontSize: '0.9rem', color: '#e6e6e6', fontFamily: 'monospace' }}>
                        {rootHash}
                    </code>
                </div>
            )}

            <div className="Visualization-canvas" style={{
                background: view3D ? '#000' : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 248, 255, 0.95) 100%)'
            }}>
                {data ? (
                    view3D ? (
                        <VisualizacijaStabla3D data={data} />
                    ) : (
                        <VisualizacijaStabla data={data} />
                    )
                ) : (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: view3D ? '#00d4ff' : '#666'
                    }}>
                        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <p style={{ marginTop: '1.5rem', fontSize: '1.2rem', color: view3D ? '#00d4ff' : '#999' }}>
                            Unesi podatke i generiraj Merkle stablo
                        </p>
                        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                            {view3D ? '🌐 3D prikaz aktivan' : '📊 2D prikaz aktivan'}
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}

export default Visualizations;