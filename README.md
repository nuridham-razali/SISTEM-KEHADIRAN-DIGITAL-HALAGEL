# Halagel Kehadiran - Halagel (M) Sdn Bhd (Android)

Sistem Kehadiran Pekerja Digital & Geofens GPS rasmi yang dibina untuk **Halagel (M) Sdn Bhd**, dibangunkan semula sebagai aplikasi asli **Android (Kotlin + Jetpack Compose + Material 3)** dengan CameraX, GPS Geofens, Pengesahan Wajah Biometrik, Peta Interaktif Pejabat, dan Portal Pentadbir.

---

## 1. Ciri-Ciri Utama Sistem

| Ciri Sistem | Butiran Pelaksanaan |
|---|---|
| **Identiti & Tema Jenama** | Tema moden gelap Halagel Emerald (`#059669` / `#34D399`) berpandukan Material Design 3, animasi imbasan biometrik, kad terperinci, dan susun atur responsif. |
| **Papan Pemuka Kakitangan (Dashboard)** | Nama staf, ID Staf, Jabatan, semakan radius pejabat masa nyata melalui formula Haversine, rekod masuk/keluar, dan status kehadiran harian. |
| **Peta Interaktif Geofens GPS & Radius** | Peta interaktif memaparkan koordinat pejabat, penanda radius sempadan meter, lokasi pengguna semasa, dan status kehadiran automatik (Di Dalam / Di Luar Radius). |
| **Aliran Kehadiran 3-Langkah** | 1. Semakan Lokasi GPS Geofens<br>2. Pengesahan Wajah Biometrik Kamera Swafoto (CameraX)<br>3. Pengesahan & Penyimpanan Rekod Kehadiran Rasmi. |
| **Pendaftaran Wajah Biometrik** | Pengaktifan CameraX dengan panduan bujur muka untuk pendaftaran profil biometrik kakitangan. |
| **Portal Pentadbir (Admin Dashboard)** | Pengurusan Pejabat (tambah, padam, kemas kini radius & koordinat melalui peta), Pengurusan Kakitangan (tambah, padam, import pukal), Pemantauan Rekod Kehadiran, dan Eksport Data Gaji. |
| **Navigasi & Kebolehgunaan** | Disepadukan dengan sokongan `BackHandler` untuk pengendalian butang kembali Android secara lancar di semua tab dan modal dialog. |

---

## 2. Maklumat Log Masuk Contoh

| Peranan | Emel / ID Pengguna | Kata Laluan |
|---|---|---|
| **Kakitangan (Kilang)** | `EMP101` | `Password123!` atau `admin123` |
| **Pentadbir (Admin)** | `ADMIN` | `admin123` |
| **Staf Baharu (Jualan)** | `EMP103` | `Password123!` |

*(Terdapat juga butang pilihan pantas "Akaun Demo Rasmi" di skrin log masuk untuk kemudahan pengujian).*

---

## 3. Struktur Projek Android

- **Bahasa & Rangka Kerja:** Kotlin 2.0+ & Jetpack Compose (Material 3)
- **Kamera:** CameraX (`androidx.camera.camera2`, `camera-lifecycle`, `camera-view`)
- **Lokasi & Geofens:** Android Location Provider & Pengiraan Formula Haversine
- **Modul Utama:** `/app/src/main/java/com/example/MainActivity.kt`
- **Ujian Unit & Integrasi:** `/app/src/test/java/com/example/` (Robolectric JVM Testing)

