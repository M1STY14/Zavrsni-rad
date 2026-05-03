import React, { useEffect, useState } from 'react';
import { useLang, useT } from '../i18n/index.jsx';

const SYSTEM_COLORS = {
  general: '#00d4ff',
  bitcoin: '#f7931a',
  git: '#6e5494',
  bittorrent: '#58d033',
};

export default function InfoModal({ open, onClose, phase, activeSystemId }) {
  const { lang } = useLang();
  const t = useT();
  const [tab, setTab] = useState('general');

  // When the modal opens, default the tab to the active system
  // (general while landing).
  useEffect(() => {
    if (!open) return;
    if (phase === 'exploring' && activeSystemId) {
      setTab(activeSystemId);
    } else {
      setTab('general');
    }
  }, [open, phase, activeSystemId]);

  if (!open) return null;

  const tabs = ['general', 'bitcoin', 'git', 'bittorrent'];

  return (
    <div className="info-modal-backdrop" onClick={onClose}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="info-modal-header">
          <h2 className="info-modal-title">{t('info.title')}</h2>
          <button
            className="info-modal-close"
            onClick={onClose}
            title={t('buttons.close')}
            aria-label={t('buttons.close')}
          >
            &times;
          </button>
        </div>

        <div className="info-modal-tabs" role="tablist">
          {tabs.map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={`info-modal-tab ${tab === id ? 'info-modal-tab-active' : ''}`}
              onClick={() => setTab(id)}
              style={
                tab === id
                  ? {
                      borderColor: SYSTEM_COLORS[id],
                      color: SYSTEM_COLORS[id],
                      background: `${SYSTEM_COLORS[id]}1f`,
                    }
                  : undefined
              }
            >
              {t(`info.tabs.${id}`)}
            </button>
          ))}
        </div>

        <div className="info-modal-body">
          <TabContent tab={tab} lang={lang} t={t} />

          <a
            href="https://github.com/"
            onClick={(e) => e.preventDefault()}
            className="info-doc-link"
            title="ARCHITECTURE.md"
          >
            {t('info.full_doc_link')}
          </a>
        </div>

        <div className="info-modal-footer">
          <p>{t('info.footer_line1')}</p>
          <p>{t('info.footer_line2')}</p>
        </div>
      </div>
    </div>
  );
}

function TabContent({ tab, lang, t }) {
  if (tab === 'general') return <GeneralContent lang={lang} t={t} />;
  if (tab === 'bitcoin') return <BitcoinContent lang={lang} t={t} />;
  if (tab === 'git') return <GitContent lang={lang} t={t} />;
  if (tab === 'bittorrent') return <BittorrentContent lang={lang} t={t} />;
  return null;
}

function Card({ accent, title, children }) {
  return (
    <div className="info-card" style={accent ? { borderColor: `${accent}40` } : undefined}>
      <h3
        style={{
          color: accent || '#00d4ff',
          fontSize: '1.25rem',
          marginBottom: '0.7rem',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="info-section">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

// ------- GENERAL TAB -------

function GeneralContent({ lang, t }) {
  if (lang === 'hr') {
    return (
      <>
        <Card accent="#00d4ff" title="Što je Merkle stablo?">
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
        </Card>

        <Card accent="#667eea" title="Što ova aplikacija radi?">
          <p>
            Aplikacija dohvaća stvarne podatke iz tri sustava (Bitcoin, Git, BitTorrent), gradi
            odgovarajuće Merkle stablo i prikazuje ga kao 3D fraktalnu strukturu pomoću Three.js.
            Klikom na list pokreće se animirani Merkle dokaz: aplikacija označava put od lista do
            korijena, prikazuje sestrinske hashove na svakoj razini i ponovno hashira korak po
            korak kako bi pokazala da rezultat odgovara korijenu.
          </p>
        </Card>

        <Card accent="#f7931a" title="Tri sustava">
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
        </Card>
      </>
    );
  }

  return (
    <>
      <Card accent="#00d4ff" title="What is a Merkle tree?">
        <p>
          A Merkle tree is a binary tree built over a dataset by hashing each leaf's data
          and recursively hashing the concatenation of every two children. A single bit change
          anywhere in the input propagates to the root, so one hash <em>commits to</em> the
          integrity of the entire dataset.
        </p>
        <p style={{ marginTop: '0.6rem' }}>
          The headline benefit: proving that a specific leaf is in the tree only requires
          <code> log₂(n) </code>
          sibling hashes along the path to the root, regardless of dataset size. This is what
          enables <strong>SPV-style</strong> verification — light clients check membership
          without downloading the whole dataset.
        </p>
      </Card>

      <Card accent="#667eea" title="What does this app do?">
        <p>
          The app pulls real data from three systems (Bitcoin, Git, BitTorrent), builds the
          corresponding Merkle tree, and renders it as a 3D fractal structure via Three.js.
          Clicking a leaf triggers an animated Merkle proof: the path from the leaf to the
          root is highlighted, the sibling hashes used at each level are surfaced, and the
          rehash is replayed step by step until it matches the root.
        </p>
      </Card>

      <Card accent="#f7931a" title="The three systems">
        <ul className="info-apps-list" style={{ marginTop: 0 }}>
          <li style={{ background: 'rgba(247, 147, 26, 0.1)', borderLeftColor: '#f7931a' }}>
            <strong style={{ color: '#f7931a' }}>Bitcoin:</strong> the Merkle root in the block
            header commits to every transaction in the block.
          </li>
          <li style={{ background: 'rgba(110, 84, 148, 0.1)', borderLeftColor: '#6e5494' }}>
            <strong style={{ color: '#6e5494' }}>Git:</strong> commit → tree → blob is already
            a Merkle DAG; every SHA-1 commits to the entire directory state below it.
          </li>
          <li style={{ background: 'rgba(88, 208, 51, 0.1)', borderLeftColor: '#58d033' }}>
            <strong style={{ color: '#58d033' }}>BitTorrent:</strong> piece hashes guarantee
            integrity of files as they arrive over a peer-to-peer swarm.
          </li>
        </ul>
        <p style={{ marginTop: '0.6rem', fontSize: '0.85rem', opacity: 0.7 }}>
          Open a system tab to see the exact data flow and limitations.
        </p>
      </Card>
    </>
  );
}

// ------- BITCOIN TAB -------

function BitcoinContent({ lang, t }) {
  const accent = '#f7931a';
  if (lang === 'hr') {
    return (
      <Card accent={accent} title="Bitcoin">
        <Section title={t('info.sections.overview')}>
          <p>
            Bitcoin blok sadrži uređenu listu transakcija. Zaglavlje bloka uključuje{' '}
            <strong>Merkle korijen</strong> svih txid-ova — jedan hash koji commitira na cijeli
            sadržaj bloka. Svatko s tim korijenom i kratkim dokazom može provjeriti da je
            određena transakcija u bloku, bez preuzimanja ostalih (mehanizam{' '}
            <em>Simplified Payment Verification</em>, SPV).
          </p>
        </Section>

        <Section title={t('info.sections.dataflow')}>
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
        </Section>

        <Section title={t('info.sections.limitations')}>
          <ul>
            <li>
              <strong>Pojednostavljenje hashiranja:</strong> aplikacija koristi{' '}
              <em>jednostruki</em> SHA-256 nad <em>hex</em> konkatenacijom djece. Stvarni
              Bitcoin koristi <em>dvostruki</em> SHA-256 nad <em>byte-reversed</em> binarnim
              oblikom. Korijen koji ova aplikacija ispiše neće biti identičan stvarnom korijenu
              iz zaglavlja bloka — struktura i mehanika dokaza su iste, samo bytewise rezultati
              razlikuju.
            </li>
            <li>
              Pravilo dupliciranja zadnjeg lista za neparan broj listova je implementirano kao
              kod stvarnog Bitcoina.
            </li>
            <li>Render je ograničen na 4 razine; sve dublje učitava se na klik.</li>
            <li>
              Cache podržava 16 najnovijih blokova. Nakon evikcije, expand zahtijeva ponovno
              učitavanje bloka.
            </li>
          </ul>
        </Section>

        <Section title={t('info.sections.proof')}>
          <p>
            Klikom na list (transakciju) frontend traverzira stablo do korijena, prikupljajući
            jednog brata po razini. Dokaz je <code>O(log n)</code> hashova — za blok od 4096
            transakcija ~12 hashova (≈384 B). Verifikacija ponovno hashira put prema gore;
            animacija prati svaki korak i pokazuje da rezultat odgovara korijenu.
          </p>
        </Section>
      </Card>
    );
  }

  return (
    <Card accent={accent} title="Bitcoin">
      <Section title={t('info.sections.overview')}>
        <p>
          A Bitcoin block contains an ordered list of transactions. The block header includes a{' '}
          <strong>Merkle root</strong> of every txid — a single hash that commits to the block's
          contents. Anyone holding the root and a short proof can verify a single transaction is
          in the block without downloading the rest (this is what powers <em>Simplified Payment
          Verification</em>, SPV).
        </p>
      </Section>

      <Section title={t('info.sections.dataflow')}>
        <ul>
          <li>Frontend posts a block height or hash to <code>/api/bitcoin/...</code>.</li>
          <li>
            Server calls <code>mempool.space/api/block/&lt;hash&gt;/txids</code> to fetch the
            ordered txid list.
          </li>
          <li>
            Leaves are hashed, then parents are built with{' '}
            <code>SHA-256(hexL + hexR)</code> all the way to the root.
          </li>
          <li>
            The full tree is cached in memory (LRU, 16 entries). Only the top 4 levels are
            shipped to the client; deeper subtrees become <em>collapsed</em> placeholders
            tagged with their leaf count.
          </li>
          <li>
            Clicking a collapsed placeholder hits <code>/expand-subtree</code>, which returns
            the next 4 levels from the cached tree.
          </li>
        </ul>
      </Section>

      <Section title={t('info.sections.limitations')}>
        <ul>
          <li>
            <strong>Hashing simplification:</strong> the app uses <em>single</em> SHA-256 over
            the <em>hex-string</em> concatenation of the two children. Real Bitcoin uses{' '}
            <em>double</em> SHA-256 over the <em>byte-reversed binary</em> form. The root this
            app produces will not byte-match the merkle root in the actual block header — the
            structure and proof mechanics are identical, only the bytewise result differs.
          </li>
          <li>
            Bitcoin's odd-leaf rule (duplicate the last hash if a level has an odd count) is
            implemented exactly.
          </li>
          <li>
            Render depth is capped at 4 levels; anything deeper loads on demand via{' '}
            <code>/expand-subtree</code>.
          </li>
          <li>
            The server cache holds 16 most-recent blocks. After eviction, expansion requires
            re-fetching the block.
          </li>
        </ul>
      </Section>

      <Section title={t('info.sections.proof')}>
        <p>
          Clicking a leaf walks the tree from leaf to root, collecting one sibling per level.
          The proof is <code>O(log n)</code> hashes — for a 4096-tx block that's ~12 hashes
          (≈384 bytes). Verification rehashes upward; the animated panel replays each step and
          shows the final value matching the root.
        </p>
      </Section>
    </Card>
  );
}

// ------- GIT TAB -------

function GitContent({ lang, t }) {
  const accent = '#9b7fc6';
  if (lang === 'hr') {
    return (
      <Card accent={accent} title="Git">
        <Section title={t('info.sections.overview')}>
          <p>
            Git repozitorij je već <strong>Merkle DAG</strong>. Svaki commit referencira tree
            (root direktorij), svaki tree referencira blobove (sadržaj datoteka) i poddirektorije.
            Sve reference su preko SHA-1 hashova; promjena jednog bajta u bilo kojem blobu
            mijenja SHA-1 svakog roditelja sve do commita. To je upravo Merkle svojstvo.
          </p>
        </Section>

        <Section title={t('info.sections.dataflow')}>
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
        </Section>

        <Section title={t('info.sections.limitations')}>
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
        </Section>

        <Section title={t('info.sections.proof')}>
          <p>
            "Dokaz" članstva datoteke u commitu je put blob → roditeljski tree → … → commit.
            Sestrinski čvorovi su ostali unosi u svakom tree-u. Stvarna Git provjera kombinira
            način + tip + ime + sha za svaki unos i hashira točno onako kako Git radi — to se
            razlikuje od pojednostavljenog{' '}
            <code>SHA-256(hexL + hexR)</code> u animaciji dokaza, pa je animacija ovdje
            ilustrativna a ne bytewise vjerna.
          </p>
        </Section>
      </Card>
    );
  }

  return (
    <Card accent={accent} title="Git">
      <Section title={t('info.sections.overview')}>
        <p>
          A Git repository is already a <strong>Merkle DAG</strong>. Every commit references a
          tree (the root directory); every tree references blobs (file contents) and
          sub-trees. Every reference is by SHA-1 hash; if one byte of any blob changes, every
          parent SHA-1 up to the commit changes too. That is the Merkle property.
        </p>
      </Section>

      <Section title={t('info.sections.dataflow')}>
        <ul>
          <li>User submits a GitHub URL or a local path (empty falls back to a demo).</li>
          <li>
            URL → <code>git clone --filter=blob:none --no-checkout</code> into a temp
            directory. <em>Blobless</em> means only commit/tree objects are downloaded, not
            file contents. Clones are reused on subsequent calls.
          </li>
          <li>
            Local path → server validates with <code>git rev-parse --git-dir</code>.
          </li>
          <li>
            <code>git cat-file -p &lt;commit&gt;</code> yields the tree SHA, parents, and
            message; <code>git ls-tree</code> recursively walks the directory hierarchy.
          </li>
          <li>
            Neighbor commits: parent comes from the commit header; child via{' '}
            <code>git log --ancestry-path &lt;commit&gt;..HEAD</code>.
          </li>
        </ul>
      </Section>

      <Section title={t('info.sections.limitations')}>
        <ul>
          <li>
            Render caps: ≤ 4 directories deep, ≤ 12 entries per directory. Anything beyond is
            collapsed into <code>... N more</code>.
          </li>
          <li>Submodules are not specially handled.</li>
          <li>
            Hashes shown in the Git tab are the <strong>real</strong> SHA-1s — they match{' '}
            <code>git ls-tree</code> output exactly.
          </li>
          <li>
            A demo fallback kicks in when the default empty path can't be resolved (e.g. the
            server isn't run from a git repo).
          </li>
        </ul>
      </Section>

      <Section title={t('info.sections.proof')}>
        <p>
          A "proof" of file membership in a commit is the path blob → parent tree → … →
          commit; the siblings are the other entries in each tree. Git's actual verification
          hashes <code>mode + type + name + sha</code> for every entry exactly the way Git
          does — that differs from the simplified{' '}
          <code>SHA-256(hexL + hexR)</code> used by the proof animation, so the animation here
          is illustrative rather than bytewise faithful.
        </p>
      </Section>
    </Card>
  );
}

// ------- BITTORRENT TAB -------

function BittorrentContent({ lang, t }) {
  const accent = '#58d033';
  if (lang === 'hr') {
    return (
      <Card accent={accent} title="BitTorrent">
        <Section title={t('info.sections.overview')}>
          <p>
            <code>.torrent</code> datoteka opisuje sadržaj podijeljen u komade fiksne veličine.
            Svaki komad ima hash; primatelj provjerava komade tokom prijenosa. U{' '}
            <strong>BitTorrent v1</strong> (gotovo svi torrenti koji su danas u upotrebi),
            <code> .torrent</code> sprema <em>plain</em> konkateniranu listu 20-bajtnih SHA-1
            hashova — bez stabla. <strong>BitTorrent v2 (BEP 52, 2020.)</strong> koristi
            per-file Merkle stabla (32-bajtne BLAKE2b hashove nad blokovima fiksne veličine) i
            sprema samo per-file korijen u metapodatke.
          </p>
        </Section>

        <Section title={t('info.sections.dataflow')}>
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
        </Section>

        <Section title={t('info.sections.limitations')}>
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
        </Section>

        <Section title={t('info.sections.proof')}>
          <p>
            Ista <code>O(log n)</code> struktura dokaza kao u ostalim sustavima. U v2 torrentu
            per-file Merkle korijen je upravo ono što je objavljeno u metapodacima, pa peer može
            verificirati bilo koji komad u <code>log₂(n)</code> hash-eva. Animacija ovdje
            demonstrira taj mehanizam na konstruiranom v1-stilu stabla.
          </p>
        </Section>
      </Card>
    );
  }

  return (
    <Card accent={accent} title="BitTorrent">
      <Section title={t('info.sections.overview')}>
        <p>
          A <code>.torrent</code> file describes a payload split into fixed-size pieces. Each
          piece has a hash; the receiver verifies pieces as they arrive. In{' '}
          <strong>BitTorrent v1</strong> (almost every torrent in the wild), the{' '}
          <code>.torrent</code> stores a <em>flat</em> concatenated list of 20-byte SHA-1
          piece hashes — there is no tree. <strong>BitTorrent v2 (BEP 52, 2020)</strong> uses
          per-file Merkle trees (32-byte BLAKE2b hashes over fixed-size blocks) and only
          stores the per-file root in the metadata.
        </p>
      </Section>

      <Section title={t('info.sections.dataflow')}>
        <ul>
          <li>
            User pastes a <code>.torrent</code> URL or picks a demo (empty → first demo loads).
          </li>
          <li>
            Server downloads the file (10 MB cap, 15 s timeout, follows redirects).
          </li>
          <li>
            A custom <strong>bencode</strong> decoder parses the file: dicts (<code>d…e</code>),
            lists (<code>l…e</code>), integers (<code>i…e</code>), and length-prefixed strings
            (<code>&lt;n&gt;:&lt;bytes&gt;</code>).
          </li>
          <li>
            The <code>info.pieces</code> field is one long byte string — every 20 bytes is one
            piece's SHA-1. The decoder slices it into the piece-hash array.
          </li>
          <li>
            The first 64 piece hashes are taken as leaves and{' '}
            <code>createMerkleTree</code> builds a Merkle tree on top.
          </li>
          <li>
            Demo torrents use hand-authored representative piece hashes.
          </li>
        </ul>
      </Section>

      <Section title={t('info.sections.limitations')}>
        <ul>
          <li>
            <strong>The Merkle tree shown here is constructed for visualization purposes.</strong>{' '}
            Real v1 torrents <em>don't</em> organize their piece hashes into a Merkle tree —
            they store a flat list. v2 (BEP 52) is the version that genuinely uses Merkle
            trees, but the parser here treats every torrent as v1.
          </li>
          <li>
            Display is capped at 64 pieces; large torrents (a real Ubuntu ISO has ~22,000
            pieces) are truncated for the visualization.
          </li>
          <li>
            Demo torrents use placeholder hashes that aren't computed from actual file bytes.
          </li>
          <li>Downloads are limited to 10 MB and 15 s.</li>
        </ul>
      </Section>

      <Section title={t('info.sections.proof')}>
        <p>
          Same <code>O(log n)</code> proof structure as the other systems. In a v2 torrent the
          per-file Merkle root is exactly what's published in the metadata, so a peer can
          verify any piece against the root in <code>log₂(n)</code> hashes — that is the
          protocol-level use case. The animation here demonstrates that mechanic on the
          constructed v1-style tree.
        </p>
      </Section>
    </Card>
  );
}
