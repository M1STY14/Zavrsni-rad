import axios from "axios";

const API_URL = "http://localhost:4000"; // backend URL

export async function generateTree(leaves) {
    const res = await axios.post(`${API_URL}/generate-tree`, { leaves });
    return res.data;
}

export async function getProof(leaf) {
    const res = await axios.get(`${API_URL}/proof/${leaf}`);
    return res.data;
}

export async function getBitcoinBlock() {
    const res = await axios.get(`${API_URL}/bitcoin-block`);
    return res.data;
}
