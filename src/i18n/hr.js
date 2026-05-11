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
    },
};

export default hr;
