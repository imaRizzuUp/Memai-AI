<div align="center">
</div>

# Memai AI

**Memai AI** adalah studio pengeditan gambar bertenaga Artificial Intelligence yang dirancang untuk membebaskan imajinasi visualmu. Aplikasi ini mengubah caramu berinteraksi dengan foto—bukan sekadar filter, melainkan manipulasi realitas penuh.

Bayangkan memiliki kemampuan Photoshop profesional, namun dikendalikan hanya dengan kata-kata dan intuisi. Ingin menghapus mantan dari foto liburan? Mengganti pakaian kasual menjadi jas formal? Atau mengubah taman belakang rumah menjadi permukaan bulan? Memai AI mewujudkannya dengan presisi tinggi menggunakan kekuatan Google Gemini API.

## 🚀 Fitur Utama

Aplikasi ini dilengkapi dengan serangkaian alat manipulasi gambar canggih:

* **Generative Edit (Magic Edit)**: Hapus objek, ganti baju, atau ubah elemen spesifik dalam foto hanya dengan menyeleksi area dan mengetik perintah teks.
* **Auto Detect Objects**: Tidak perlu seleksi manual yang rumit. AI akan otomatis memindai dan membuat kotak seleksi (bounding box) pada objek-objek penting (orang, barang, aksesoris) untuk pengeditan instan.
* **Magic Ratio (Outpainting)**: Merasa fotomu terlalu sempit? Perluas kanvas gambar ke rasio aspek apa pun (16:9, 4:3, dll.) dan biarkan AI mengisi ruang kosong tersebut secara natural dan realistis.
* **AI Upscale**: Tingkatkan resolusi gambar yang pecah atau buram menjadi tajam dan jernih (hingga 5x lipat).
* **Gallery Management**: Simpan semua proyek kreatifmu secara lokal dan akses kembali kapan saja.
* **Dukungan Bahasa**: Antarmuka tersedia penuh dalam Bahasa Indonesia dan Inggris.

## 🛠️ Cara Menjalankan (Run Locally)

Ikuti langkah-langkah berikut untuk menjalankan aplikasi ini di komputermu sendiri.

**Prasyarat:** Node.js telah terinstal.

1.  **Instal Dependensi:**
    Buka terminal di folder proyek dan jalankan:
    ```bash
    npm install
    ```

2.  **Konfigurasi API Key:**
    Buat file `.env.local` di akar proyek, lalu tambahkan API Key Gemini kamu:
    ```env
    GEMINI_API_KEY=paste_kunci_api_kamu_disini
    ```
    *(Kamu bisa mendapatkan API key di [Google AI Studio](https://aistudio.google.com/))*

3.  **Jalankan Aplikasi:**
    Mulai server pengembangan lokal:
    ```bash
    npm run dev
    ```

4.  **Buka di Browser:**
    Akses aplikasi melalui tautan yang muncul di terminal (biasanya `http://localhost:3000`).

## 🎮 Panduan Singkat

1.  **Upload**: Klik "Proyek Baru" dan unggah fotomu.
2.  **Edit**:
    * Gunakan **Auto Detect** untuk memilih objek secara cepat.
    * Gunakan **Draw Manually** untuk menyeleksi area bebas.
    * Ketik perintahmu (contoh: "ganti baju menjadi jaket kulit hitam" atau "hapus orang ini").
3.  **Expand & Enhance**: Gunakan **Magic Ratio** untuk memperlebar foto atau **Upscale** untuk mempertajamnya.
4.  **Download**: Unduh hasil karyamu dalam resolusi tinggi.

---
*Powered by React, Vite, & Google Gemini API.*
