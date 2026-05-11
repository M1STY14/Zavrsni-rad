import React from 'react';

const hr = {
    hero: {
        title_line1: 'Vizualizacija Merkle stabla',
        title_line2: 'u stvarnim sustavima',
        such_as: 'kao što su:',
        description:
            'Ova aplikacija vizualizira Merkle stabla koristeći React i Three.js. Istraži kako se Merkle stabla koriste u modernim distribuiranim sustavima za osiguravanje integriteta podataka.',
        start: 'Počni istraživati',
    },
    footer: {
        rights: 'Sva prava pridržana.',
    },
    controls: {
        title: 'Kontrole',
        rotate: 'Klik i povuci — Rotacija',
        zoom: 'Kotačić — Zumiranje',
        pan: 'Strelice — Pomak',
        proof: 'Klik na list — Prikaz dokaza',
    },
    panel: {
        title: 'Merkle stablo',
        expand_title: 'Proširi',
        collapse_title: 'Sažmi',
        generate: 'Generiraj',
        loading: 'Učitavanje…',
        clear: 'Obriši',
        root_hash: 'Korijenski hash',
    },
    modals: {
        cloning_title: 'Kloniranje repozitorija…',
        cloning_hint: 'Za veće repozitorije ovo može potrajati nekoliko sekundi',
        fetching_title: 'Dohvat bloka s mempool.space',
        fetching_hint:
            'Izgradnja Merkle stabla — veliki blokovi mogu imati tisuće transakcija',
    },
    buttons: {
        back_home: 'Natrag na početnu',
        about: 'O projektu',
        language: 'Jezik',
        close: 'Zatvori',
    },
    errors: {
        fill_one: 'Molimo ispunite barem jedno polje.',
        server: 'Greška pri spajanju na poslužitelj',
    },
    proof: {
        title: 'Merkle dokaz',
        selected_leaf: 'Odabrani list',
        proof_path: 'Put dokaza',
        step_count: (n) => `${n} ${n === 1 ? 'korak' : n < 5 ? 'koraka' : 'koraka'}`,
        node: 'Čvor',
        sibling: 'Brat',
        sibling_left: 'lijevo',
        sibling_right: 'desno',
        parent: 'Roditelj',
        root: 'Korijen',
        verified: 'Dokaz potvrđen',
        failed: 'Provjera neuspješna',
        legend_leaf: 'Odabrani list',
        legend_path: 'Put dokaza',
        legend_sibling: 'Brat (dokaz)',
        git_chain_title: 'Git lanac stabala',
        git_chain_count: (n) => `${n} ${n === 1 ? 'stablo' : n < 5 ? 'stabla' : 'stabala'} + commit`,
        git_tree_at: 'stablo u',
        git_root_path: '(korijen)',
        git_entries_count: (n, name) => `sadrži ${n} ${n === 1 ? 'stavku' : n < 5 ? 'stavke' : 'stavki'} (uklj. ${name})`,
        git_sha1_bytes: (n) => `SHA-1 od ${n} bajtova`,
        git_matches: 'podudara',
        git_mismatch: 'ne podudara',
        git_references_root: 'referencira korijensko stablo',
        git_commit_label: 'commit',
        git_legend_blob: 'blob',
        git_legend_tree: 'stablo na putu',
        git_legend_commit: 'commit',
        hint_internal_node: 'Unutarnji čvorovi nemaju zasebne dokaze — kliknite list za generiranje dokaza.',
        hint_max_depth: 'Dosegnut limit dubine prikaza. Kliknite "… više" placeholder za proširenje skraćene grane.',
        banner_truncated: 'Ovaj blok ima mnogo transakcija — prikazane su samo gornje razine. Kliknite bilo koji "… više" placeholder za proširenje dublje grane.',
    },
    systems: {
        bitcoin: {
            name: 'Bitcoin',
            description: 'Vizualizacija Merkle stabala izgrađenih iz transakcija u Bitcoin blokovima',
            hint: 'Unesi visinu ili hash stvarnog Bitcoin bloka (dohvaća se s mempool.space), ili vlastiti popis transakcija.',
            inputs: {
                blockHeight: { label: 'Visina bloka', placeholder: 'npr. 800000' },
                blockHash: { label: 'Hash bloka', placeholder: '0000000000…' },
                transactions: {
                    label: 'Popis transakcija (odvojen zarezima)',
                    placeholder: 'tx1, tx2, tx3, tx4…',
                },
            },
        },
        git: {
            name: 'Git',
            description: 'Vizualizacija Merkle stabala iz objekata Git repozitorija',
            hint: 'Zalijepi GitHub URL ili lokalnu putanju. Ostavi prazno za vizualizaciju ovog projekta na HEAD-u.',
            inputs: {
                repoPath: { label: 'Putanja repozitorija', placeholder: 'GitHub URL ili lokalna putanja' },
                commitHash: { label: 'Hash commita', placeholder: 'HEAD ili SHA commita…' },
            },
        },
        bittorrent: {
            name: 'BitTorrent',
            description: 'Vizualizacija Merkle stabala koja se koriste za provjeru komada u BitTorrentu',
            hint: 'Zalijepi URL .torrent datoteke ili odaberi demo torrent.',
            inputs: {
                torrentUrl: {
                    label: 'URL torrenta',
                    placeholder: 'https://example.com/file.torrent',
                },
                demo: {
                    label: 'Demo torrent',
                    options: {
                        '': 'Odaberi demo torrent…',
                        'ubuntu-24.04-desktop': 'Ubuntu 24.04 Desktop (8 komada)',
                        'sintel-trailer': 'Sintel Trailer (5 komada)',
                        'sample-multi': 'Multi-file projekt (6 komada)',
                    },
                },
            },
        },
    },
    info: {
        title: 'O projektu',
        tabs: {
            general: 'Općenito',
            bitcoin: 'Bitcoin',
            git: 'Git',
            bittorrent: 'BitTorrent',
        },
        full_doc_link: 'Pročitaj punu arhitekturnu referencu (ARCHITECTURE.md)',
        sections: {
            overview: 'Pregled',
            dataflow: 'Tok podataka',
            limitations: 'Poznata ograničenja',
            proof: 'Generiranje i provjera dokaza',
        },
        footer_line1: 'Leo Kocijan © 2025',
        footer_line2: 'Završni rad — Vizualizacija Merkle stabala u stvarnim sustavima',

        general: {
            what_is_merkle_title: 'Što je Merkle stablo?',
            what_is_merkle: (
                <>
                    <p>
                        Merkle stablo je binarno stablo izgrađeno preko skupa podataka tako da se svaki list
                        zamijeni hashom dijela podataka, a svaki unutarnji čvor hashom konkatenacije svoja
                        dva djeteta. Promjena bilo kojeg jedinog bita u izvornim podacima propagira se sve do
                        korijena, pa jedan hash <em>commitira</em> integritet cijelog skupa.
                    </p>
                    <p style={{ marginTop: '0.6rem' }}>
                        Glavna korist: dokaz da je određeni list u stablu zahtijeva samo <code>log₂(n)</code>{' '}
                        hashova (sestrinske čvorove uz put do korijena), neovisno koliko je velik skup
                        podataka. To omogućuje takozvani <strong>SPV</strong> stil verifikacije —
                        laki klijenti provjeravaju članstvo bez preuzimanja cijelog skupa.
                    </p>
                </>
            ),
            what_app_does_title: 'Što ova aplikacija radi?',
            what_app_does: (
                <p>
                    Aplikacija dohvaća stvarne podatke iz tri sustava (Bitcoin, Git, BitTorrent), gradi
                    odgovarajuće Merkle stablo i prikazuje ga kao 3D fraktalnu strukturu pomoću Three.js.
                    Klikom na list pokreće se animirani Merkle dokaz: aplikacija označava put od lista do
                    korijena, prikazuje sestrinske hashove na svakoj razini i ponovno hashira korak po
                    korak kako bi pokazala da rezultat odgovara korijenu.
                </p>
            ),
            three_systems_title: 'Tri sustava',
            three_systems: (
                <>
                    <ul className="info-apps-list" style={{ marginTop: 0 }}>
                        <li style={{ background: 'rgba(247, 147, 26, 0.1)', borderLeftColor: '#f7931a' }}>
                            <strong style={{ color: '#f7931a' }}>Bitcoin:</strong> Merkle korijen u zaglavlju
                            bloka commitira sve transakcije bloka.
                        </li>
                        <li style={{ background: 'rgba(110, 84, 148, 0.1)', borderLeftColor: '#6e5494' }}>
                            <strong style={{ color: '#6e5494' }}>Git:</strong> commit → tree → blob već je
                            Merkle DAG; svaki SHA-1 commitira cjelokupno stablo direktorija.
                        </li>
                        <li style={{ background: 'rgba(88, 208, 51, 0.1)', borderLeftColor: '#58d033' }}>
                            <strong style={{ color: '#58d033' }}>BitTorrent:</strong> hashovi komada
                            osiguravaju integritet datoteka tijekom prijenosa peer-to-peer.
                        </li>
                    </ul>
                    <p style={{ marginTop: '0.6rem', fontSize: '0.85rem', opacity: 0.7 }}>
                        Otvori karticu pojedinog sustava da vidiš točan tok podataka i ograničenja.
                    </p>
                </>
            ),
            tree_vs_dag_title: 'Merkle stablo nasuprot Merkle DAG-u',
            tree_vs_dag: (
                <>
                    <p>
                        Iako sva tri sustava posjeduju "Merkle svojstvo" (promjena na bilo kojem listu mijenja
                        korijen), <strong>strukture nisu iste</strong> — i to mijenja oblik dokaza.
                    </p>
                    <p style={{ marginTop: '0.6rem' }}>
                        <strong>Bitcoin i BitTorrent</strong> grade <em>klasično binarno Merkle stablo</em>{' '}
                        iznad ravne liste vrijednosti (txid-ovi, hashovi komada). Svaki unutarnji čvor ima
                        točno dva djeteta; roditelj se računa kao <code>hash(lijevi || desni)</code>. Dokaz je{' '}
                        <code>O(log n)</code> hash-eva — samo bratski hash na svakoj razini puta od lista do
                        korijena.
                    </p>
                    <p style={{ marginTop: '0.6rem' }}>
                        <strong>Git</strong> nije binarno stablo, već <em>Merkle DAG tipiziranih objekata</em>:
                        tree objekti (popisi direktorija) povezuju blob objekte (sadržaj datoteka). Hash tree
                        objekta računa se nad <em>cijelom serijaliziranom listom unosa</em> (mode, ime, dijete
                        sha) — ne nad parovima. Zato dokaz da blob pripada commitu mora prikazati{' '}
                        <em>cijelu listu unosa</em> svakog tree-a na putu, ne samo bratski hash. To je{' '}
                        <code>O(dubina × stupanj)</code> bajtova, ali dokazuje i točan put datoteke u repozitoriju.
                    </p>
                    <p style={{ marginTop: '0.6rem' }}>
                        Vizualizacija pokušava jezgrovito prikazati ovu razliku: Bitcoin/BitTorrent kartica
                        pokazuje par-i-hashiraj, Git kartica pokazuje rekonstrukciju cijelog tree objekta i
                        usporedbu izračunatog SHA-1 sa onim koji git navodi.
                    </p>
                </>
            ),
        },

        bitcoin: {
            overview: (
                <p>
                    Bitcoin blok sadrži uređenu listu transakcija. Zaglavlje bloka uključuje{' '}
                    <strong>Merkle korijen</strong> svih txid-ova — jedan hash koji commitira na cijeli
                    sadržaj bloka. Svatko s tim korijenom i kratkim dokazom može provjeriti da je
                    određena transakcija u bloku, bez preuzimanja ostalih (mehanizam{' '}
                    <em>Simplified Payment Verification</em>, SPV).
                </p>
            ),
            dataflow: (
                <ul>
                    <li>Frontend šalje visinu ili hash bloka prema <code>/api/bitcoin/...</code>.</li>
                    <li>
                        Poslužitelj poziva <code>mempool.space/api/block/&lt;hash&gt;/txids</code> za listu
                        txid-ova.
                    </li>
                    <li>
                        Listovi se hashiraju, a roditelji se grade po pravilu{' '}
                        <code>SHA-256(hexL + hexR)</code> dok se ne dobije korijen.
                    </li>
                    <li>
                        Cijelo stablo se cache-ira u memoriji (LRU, 16 unosa). Klijentu se šalju samo
                        gornje 4 razine; dublji podstablovi su <em>collapsed</em> placeholderi s brojem
                        transakcija.
                    </li>
                    <li>
                        Klikom na collapsed čvor poziva se <code>/expand-subtree</code>, koji vraća
                        sljedeće 4 razine iz cache-a.
                    </li>
                </ul>
            ),
            limitations: (
                <ul>
                    <li>
                        <strong>Dva načina hashiranja:</strong> kada se učita stvarni blok preko visine ili
                        hash-a, aplikacija koristi <em>stvaran Bitcoin algoritam</em> —{' '}
                        <code>SHA-256(SHA-256(left_bin || right_bin))</code> nad txid-ovima u internom
                        redoslijedu bajtova. Korijen koji se prikaže odgovara byte-for-byte onome u zaglavlju
                        bloka. Kada korisnik upiše vlastitu listu transakcija, koristi se <em>didaktička</em>{' '}
                        varijanta — jednostruki SHA-256 nad hex konkatenacijom — jer korisnički unos nisu
                        stvarni txid-ovi.
                    </li>
                    <li>
                        Pravilo dupliciranja zadnjeg lista za neparan broj listova je implementirano kao
                        kod stvarnog Bitcoina, u oba načina.
                    </li>
                    <li>Render je ograničen na 4 razine; sve dublje učitava se na klik.</li>
                    <li>
                        Cache podržava 16 najnovijih blokova. Nakon evikcije, dokaz zahtijeva ponovno
                        učitavanje bloka.
                    </li>
                </ul>
            ),
            proof: (
                <p>
                    Klikom na list (transakciju) klijent zatraži dokaz od poslužitelja, koji ga generira
                    iz cache-iranog cijelog stabla. Dokaz je <code>O(log n)</code> hash-eva — za blok od
                    4096 transakcija ~12 hash-eva (≈384 B). Klijent zatim <strong>sam ponovno izračuna</strong>{' '}
                    put prema gore koristeći Web Crypto (dvostruki SHA-256 nad binarnim parovima u
                    internom redoslijedu) i provjeri da rezultat odgovara navedenom korijenu — animacija
                    korak-po-korak vodi kroz tu provjeru.
                </p>
            ),
        },

        git: {
            overview: (
                <p>
                    Git repozitorij je već <strong>Merkle DAG</strong>. Svaki commit referencira tree
                    (root direktorij), svaki tree referencira blobove (sadržaj datoteka) i poddirektorije.
                    Sve reference su preko SHA-1 hashova; promjena jednog bajta u bilo kojem blobu
                    mijenja SHA-1 svakog roditelja sve do commita. To je upravo Merkle svojstvo.
                </p>
            ),
            dataflow: (
                <ul>
                    <li>
                        Korisnik unese GitHub URL ili lokalnu putanju (ili ostavi prazno za demo).
                    </li>
                    <li>
                        URL → <code>git clone --filter=blob:none --no-checkout</code> u privremeni
                        direktorij. <em>Blobless</em> klon dohvaća samo commit/tree objekte, ne i sadržaj
                        datoteka. Klonovi se ponovno koriste.
                    </li>
                    <li>
                        Lokalna putanja → poslužitelj validira pomoću <code>git rev-parse --git-dir</code>.
                    </li>
                    <li>
                        <code>git cat-file -p &lt;commit&gt;</code> daje SHA tree-a, roditelje i poruku;{' '}
                        <code>git ls-tree</code> rekurzivno prolazi hijerarhiju.
                    </li>
                    <li>
                        Susjedni commiti: roditelj iz zaglavlja commita; dijete preko{' '}
                        <code>git log --ancestry-path</code>.
                    </li>
                </ul>
            ),
            limitations: (
                <ul>
                    <li>
                        Render limiti: ≤ 4 razine dubine, ≤ 12 unosa po direktoriju. Sve preko toga prikazuje
                        se kao <code>... N more</code>.
                    </li>
                    <li>Submoduli se ne tretiraju posebno.</li>
                    <li>
                        Hashovi prikazani u Git kartici su <strong>stvarni</strong> SHA-1 (poklapaju se s{' '}
                        <code>git ls-tree</code>).
                    </li>
                    <li>
                        Demo fallback se aktivira kada zadana prazna putanja ne može biti razriješena (npr.
                        poslužitelj nije pokrenut iz git repozitorija).
                    </li>
                </ul>
            ),
            proof: (
                <p>
                    Dokaz da blob pripada commitu sastoji se od: sadržaja commit objekta, lanca tree
                    objekata od roditelja blob-a do root tree-a (svaki s punom listom unosa), i sha
                    blob-a. Klijent <strong>sam</strong> rekonstruira binarnu serijalizaciju svakog
                    tree-a (<code>&lt;mode&gt; &lt;ime&gt;\0&lt;binarni hash&gt;</code>, sortirano po
                    git-ovom pravilu, prefiksirano sa <code>tree &lt;veličina&gt;\0</code>), izračuna
                    SHA-1 i provjeri da odgovara hash-u koji git navodi. Na kraju hashira commit objekt
                    i provjeri da referencira root tree. Ovaj dokaz je byte-for-byte vjeran git-ovom
                    internom formatu — animacija pokazuje stvarne hash-eve, ne ilustrativne.
                </p>
            ),
        },

        bittorrent: {
            overview: (
                <p>
                    <code>.torrent</code> datoteka opisuje sadržaj podijeljen u komade fiksne veličine.
                    Svaki komad ima hash; primatelj provjerava komade tokom prijenosa. U{' '}
                    <strong>BitTorrent v1</strong> (gotovo svi torrenti koji su danas u upotrebi),
                    <code> .torrent</code> sprema <em>plain</em> konkateniranu listu 20-bajtnih SHA-1
                    hashova — bez stabla. <strong>BitTorrent v2 (BEP 52, 2020.)</strong> koristi
                    per-file Merkle stabla (32-bajtne BLAKE2b hashove nad blokovima fiksne veličine) i
                    sprema samo per-file korijen u metapodatke.
                </p>
            ),
            dataflow: (
                <ul>
                    <li>
                        Korisnik zalijepi URL <code>.torrent</code> datoteke ili odabere demo (prazno →
                        prvi demo).
                    </li>
                    <li>
                        Poslužitelj preuzima datoteku (limit 10 MB, timeout 15 s, prati redirekcije).
                    </li>
                    <li>
                        Vlastiti <strong>bencode</strong> dekoder parsira datoteku: dictove
                        (<code>d…e</code>), liste (<code>l…e</code>), integere (<code>i…e</code>) i
                        length-prefixed stringove (<code>&lt;n&gt;:&lt;bytes&gt;</code>).
                    </li>
                    <li>
                        Polje <code>info.pieces</code> je dugačak byte string — svakih 20 bajtova je SHA-1
                        jednog komada. Dekoder ih dijeli u listu hashova komada.
                    </li>
                    <li>
                        Prvih 64 hasheva komada koriste se kao listovi i{' '}
                        <code>createMerkleTree</code> gradi stablo iznad njih.
                    </li>
                    <li>
                        Demo torrenti koriste ručno odabrane reprezentativne hashove.
                    </li>
                </ul>
            ),
            limitations: (
                <ul>
                    <li>
                        <strong>Stablo prikazano ovdje je konstruirano za vizualizaciju.</strong> Stvarni
                        v1 torrenti <em>ne</em> organiziraju hash-eve komada u Merkle stablo — drže ih u
                        ravnoj listi. v2 (BEP 52) je verzija koja stvarno koristi Merkle stabla, ali
                        parser ovdje sve tretira kao v1.
                    </li>
                    <li>
                        Prikaz je ograničen na 64 komada; veliki torrenti (Ubuntu ISO ima ~22 000 komada)
                        su skraćeni.
                    </li>
                    <li>
                        Demo torrenti koriste placeholder hash-eve koji nisu izračunati iz stvarnih
                        bajtova.
                    </li>
                    <li>Preuzimanja ograničena na 10 MB i 15 s.</li>
                </ul>
            ),
            proof: (
                <p>
                    Ista <code>O(log n)</code> struktura dokaza kao u ostalim sustavima. U v2 torrentu
                    per-file Merkle korijen je upravo ono što je objavljeno u metapodacima, pa peer može
                    verificirati bilo koji komad u <code>log₂(n)</code> hash-eva. Animacija ovdje
                    demonstrira taj mehanizam na konstruiranom v1-stilu stabla.
                </p>
            ),
        },
    },
};

export default hr;
