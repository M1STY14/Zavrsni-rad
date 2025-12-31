import React, { useState, useEffect } from 'react';
import '../App.css';
import VisualizacijaStabla from '../komponente/VisualizacijaStabla.jsx';
import { getBitcoinBlock } from '../api.js'

const Visualizations = () => {
    const [rootHash, setRootHash] = useState(null);
    const [data, setData] = useState(null);
    const [blockNum, setBlockHeight] = useState('');
    const [blockHash, setBlockHash] = useState('');
    const [transactionList, setTransactionList] = useState('');
    const [singleTransaction, setSingleTransaction] = useState('');

    const handleSubmit = async () => {
        try {
            let res;
            //ako je unesen broj bloka
            if (blockNum) {
                res = await fetch(`/api/block-by-height/${blockNum}`).then(r => r.json());
            } else if (blockHash) { // ako je unesen hash bloka
                res = await fetch(`/api/block/${blockHash}`).then(r => r.json());
            } else if (transactionList) { // ako je unesen popis transakcija
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

            if (res) {
                setData(res.tree || res.proof);  // ako vraća proof, možeš ga posebno vizualizirati
                setRootHash(res.rootHash);
            }
        } catch (error) {
            console.error("Error processing input:", error);
        }
    };


    return (
        <>
            <div className='text_section'>
                <h1>Vizualizacije Merkle stabla</h1>
                <p>Ovdje možete pronaći različite vizualizacije povezanih s Merkle stablima.</p>
            </div>
            <div className="InputContainer">
                <div className="BitcoinInputs">
                    <label>
                        Broj bloka <input type="number" min="0" max="100000000" value={blockNum} onChange={(e) => setBlockHeight(e.target.value)} />
                    </label>
                    <label>
                        Hash bloka <input type="text" value={blockHash} onChange={(e) => setBlockHash(e.target.value)} />
                    </label>
                    <label>
                        Popis transakcija <input type="text" value={transactionList} onChange={(e) => setTransactionList(e.target.value)} />
                    </label>
                    <label>
                        Transakcija <input type="text" value={singleTransaction} onChange={(e) => setSingleTransaction(e.target.value)} />
                    </label>
                </div>
            </div>
            <button onClick={handleSubmit}>Generiraj</button>
            {rootHash && <p>Root Hash: {rootHash}</p>}
            <div className="Visualization-canvas">
                {data ? (<VisualizacijaStabla data={data} />) : (<p>Nema podataka za prikaz</p>)}
            </div>
        </>
    );
}

export default Visualizations;