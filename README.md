# Farrel Islami Putra · The Living Archive & Aethelgrad Universe (Astro V15.0-AETHELGRAD-OMEGA)

Portofolio rekayasa perangkat lunak, riset analisis data terbuka, konstelasi pengetahuan **The Data Atlas Crypt**, serta cabang dunia virtual mandiri **AETHELGRAD // THE INFINITE SPIRE** milik **Farrel Islami Putra** (Mahasiswa S1 Teknik Informatika, Universitas Komputer Indonesia / UNIKOM, angkatan 2026).

- **Profil GitHub Utama**: `https://github.com/Fryel23` (`@Fryel23`)
- **Arsip Eksperimen Awal**: `https://github.com/Fryel32` (`@Fryel32`)
- **Domain Publik**: `https://www.farrelislami.tech`

---

## 1. Ikhtisar Arsitektur V15.0 ("The Tree Trunk & Branch Architecture")

Situs ini dirancang dengan filosofi **Batang Utama & Ranting Mandiri (Trunk & Branch Architecture)** di atas **Astro 7**:

### I. THE TRUNK (Batang Utama · Portofolio & Eksplorasi Personal)

1. **Navigasi Primer 4-Item & Mega-Drawer 2 Kolom**:
   - Header utama menampilkan 4 menu primer: **Beranda** (`/`), **Proyek** (`/work`), **Tentang** (`/about`), dan **Kontak** (`/connect`), ditambah tombol **Eksplorasi ▾** (`#menu-dots`).
   - **Kolom 1 (Eksplorasi Interaktif & Arsip Personal)**: `Data Lab · AQI Explorer` (`/lab`), `CSV Explorer` (`/lab/csv`), `Game Deck` (`/archive/play`), `Off-screen & Hobi` (`/archive/off-screen`), `Credentials` (`/archive/credentials`), dan `Google Drive Docs`.
   - **Kolom 2 (Peta Pengetahuan & Gerbang Dunia Virtual)**: `The Data Atlas Crypt` (`/atlas`), `Metodologi ISPU P.14/2020` (`/lab/methodology`), `Indeks Arsip Personal` (`/archive`), serta Kartu Portal **Masuk Dunia: Aethelgrad ✦** (`data-portal-dive="/aethelgrad"`).
2. **Zero Meta-Documentation Leak**:
   - Halaman publik berfokus murni pada hasil karya analisis data, eksplorasi interaktif, dan dunia virtual, tanpa mengekspos catatan internal pembuatan website.
3. **The Data Atlas Crypt (`/atlas`) · Interactive Knowledge Constellation & Live Telemetry HUD**:
   - Berada di luar dunia game sebagai peta saraf pengetahuan 2D interaktif dengan **36 Knowledge Nodes & 52 Synapses** lintas 4 klaster disiplin (`DATA_SCIENCE`, `SOFTWARE_AI`, `QUANTITATIVE_SYSTEMS`, `COGNITIVE_STRATEGY`).
   - Dilengkapi **Live Performance Telemetry HUD** (`FPS`, `Frame Time ms`, `JS Heap Memory`, dan jumlah simpul aktif).

### II. THE BRANCH (`/aethelgrad` · `AETHELGRAD // THE INFINITE SPIRE`)

Dunia VR RPG & Gacha interaktif yang **100% terisolasi** dari proyek portofolio Farrel:
1. **VR Neural Dive Sequence & Smart Auth Gate**:
   - Transisi warp terowongan partikel menuju `/aethelgrad`.
   - Keamanan **Anti-Injection Shield**, **PBKDF2-HMAC-SHA512**, serta **Device Hardware Fingerprint Lock (1 Perangkat = 1 Akun)**.
   - Deteksi otomatis **Returning Hunter**: Pengunjung yang sudah memiliki akun pada perangkatnya langsung diarahkan ke tampilan **Login** (bukan Buat Akun) ketika kembali setelah logout.
2. **7-Layer Crisp Pixel SVG Paper-Doll Engine (`64x64`)**:
   - Merender karakter secara berlapis dari belakang ke depan (`Layer 0: Back Aura/Wings` -> `Layer 1: Base Body` -> `Layer 2: Chest Armor` -> `Layer 3: Head & Hair` -> `Layer 4: Helmet/Crown` -> `Layer 5: Off-Hand/Shield` -> `Layer 6: Main Weapon`).
   - Mengganti senjata, zirah, helm, perisai, atau sayap langsung mengubah wujud visual karakter secara instan!
3. **24 Original Heroes (`★1`–`★5`), 50 Equipment Items, & 12 Grimoire Bonds**:
   - Sistem Gacha dengan *Soft Pity* (35) & *Hard Pity* (50), sistem koleksi ala *Guardian Tales*, serta *Synthesis & Promotion Forge* ala *Pick Me Up! Infinite Gacha* (Awaken `★1 Han Islat` hingga `★5 Mythic`).
4. **The Code-Spell Sanctum (24 Tantangan Pemrograman) & Spire Colosseum (1v1 Auto-Battler)**:
   - Memecahkan tantangan algoritma memberikan **Astral Gems (💎)** dan **Arcane Code Buff** permanen yang memperkuat karakter saat bertarung 1v1 di **Spire Colosseum Live Leaderboard**.

---

## 2. Perintah Pengembangan, Build, & Verifikasi Otomatis

```bash
npm install
npx astro dev --background
npm run build

# Jalankan rangkaian verifikasi otomatis:
node scripts/test-lab-core.mjs
node scripts/test-csv-explorer.mjs
node scripts/test-content-integrity.mjs
node scripts/test-v13-ts-parity.mjs
node scripts/test-v14-ux-architecture.mjs
node scripts/test-v15-aethelgrad-world.mjs
node scripts/audit-v13-zero-debt.mjs
```
