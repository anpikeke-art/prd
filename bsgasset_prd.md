# BSGAsset

## 1. Ringkasan & Latar Belakang

BSGAsset adalah aplikasi web untuk membantu perusahaan mengelola, memantau, dan mengendalikan aset logistik maupun perangkat IT secara terpusat. Aset yang dikelola mencakup laptop, komputer, printer, proyektor, dan alat kerja lain yang dimiliki perusahaan.

Saat ini pengelolaan aset dilakukan menggunakan Excel/Google Sheet dan belum ada sistem terpusat. Kondisi ini menyebabkan data aset sulit dilacak, riwayat penggunaan tidak lengkap, serta meningkatkan risiko aset hilang, rusak, atau disalahgunakan.

BSGAsset akan menyediakan sistem berbasis web dengan dua jenis pengguna:

- **Admin**: memiliki hak akses penuh untuk mengelola data aset, stok, lokasi, kondisi, transaksi peminjaman/pengembalian, audit log, notifikasi stok menipis, dan laporan.
- **Staff**: dapat melihat aset yang tersedia, mengajukan peminjaman, serta melakukan proses pengembalian tanpa mengubah data master.

Skala penggunaan awal:

- Jumlah aset: **<100 aset**
- Jumlah user: **<20 user**
- Jumlah role: **Admin dan Staff**

Tech stack yang sudah ditentukan:

- Frontend: **Next.js**
- Backend: **Next.js Route Handlers**
- Database: **PostgreSQL**
- Realtime: **Server-Sent Events / SSE**
- Auth: **auth_ready: true**

Deadline pengembangan versi awal adalah **<1 bulan**, sehingga MVP harus fokus pada fitur inti yang langsung menyelesaikan masalah utama: **aset sering hilang**.

---

## 2. Masalah yang Diselesaikan

### Masalah Utama

Perusahaan sering mengalami kehilangan aset karena pencatatan aset, lokasi, peminjaman, dan pengembalian masih dilakukan secara manual melalui Excel/Google Sheet atau belum terdokumentasi dengan baik.

### Pain Point Saat Ini

1. **Data aset tersebar dan tidak terstruktur**
   - Data aset saat ini dikelola melalui Excel/Google Sheet.
   - Tidak ada sistem yang memastikan data aset selalu mutakhir.

2. **Riwayat peminjaman tidak lengkap**
   - Sulit mengetahui siapa yang terakhir memakai aset.
   - Sulit melacak kapan aset dipinjam dan dikembalikan.

3. **Status aset tidak real-time**
   - Staff tidak selalu mengetahui aset mana yang tersedia.
   - Admin sulit mengetahui lokasi dan kondisi aset terkini.

4. **Risiko kehilangan aset tinggi**
   - Tidak ada workflow approval yang baku.
   - Tidak ada audit log untuk perubahan data aset dan transaksi.

5. **Laporan manual memakan waktu**
   - Manajemen membutuhkan laporan aset berdasarkan tanggal, lokasi, kategori, atau status.
   - Admin membutuhkan export laporan untuk analisis dan dokumentasi.

---

## 3. Tujuan (Goals)

1. **Mengurangi kehilangan aset**
   - Sistem harus dapat mencatat peminjam, waktu pengajuan, waktu pengambilan, waktu pengembalian, lokasi, dan kondisi aset.

2. **Menyediakan data aset terpusat**
   - Semua aset memiliki data lengkap: kode aset, nama aset, kategori, lokasi penyimpanan, jumlah stok, kondisi, dan status ketersediaan.

3. **Membakukan proses peminjaman**
   - Semua peminjaman wajib melalui approval Admin.
   - Tidak ada aset yang dapat dipinjam langsung tanpa persetujuan.

4. **Meningkatkan akuntabilitas penggunaan aset**
   - Setiap transaksi harus memiliki riwayat yang jelas.
   - Setiap perubahan penting harus tercatat dalam audit log.

5. **Memudahkan Admin membuat laporan**
   - Laporan dapat difilter berdasarkan tanggal, lokasi, kategori, dan status aset.
   - Laporan dapat diekspor dalam format PDF untuk manajemen dan Excel/CSV untuk Admin.

6. **Menyediakan sistem yang sederhana**
   - BSGAsset harus lebih sederhana dibanding solusi sejenis.
   - Fokus pada workflow aset masuk, aset keluar, peminjaman, pengembalian, stok, kondisi, lokasi, audit, dan laporan.

---

## 4. Non-Goals (di luar scope versi ini)

1. **Tidak ada integrasi hardware tracking**
   - Lokasi aset tidak dilacak menggunakan GPS, RFID, BLE, IoT, atau hardware tracking lain.
   - Lokasi aset di versi ini diinput manual oleh Admin/Staff sesuai hak akses.

2. **Tidak ada scan barcode/QR di MVP**
   - Pencarian dan identifikasi aset dilakukan melalui kode aset dan daftar aset.
   - QR/barcode dapat dipertimbangkan setelah MVP.

3. **Tidak ada peminjaman tanpa approval**
   - Semua peminjaman wajib melalui approval Admin.
   - Tidak ada exception untuk kategori aset tertentu pada versi ini.

4. **Tidak ada workflow perbaikan aset yang kompleks**
   - Sistem hanya menandai aset sebagai Rusak dan menyimpan riwayat kerusakan.
   - Proses vendor repair, estimasi biaya, sparepart, dan approval perbaikan tidak termasuk MVP.

5. **Tidak ada integrasi WhatsApp/Telegram pada MVP**
   - Notifikasi stok menipis dan notifikasi workflow ditampilkan di dalam aplikasi.
   - Integrasi WhatsApp/Telegram dapat menjadi pengembangan lanjutan karena jawaban klarifikasi menyebut “WhatsApp/Telegram” sekaligus “di dalam aplikasi saja”. Untuk MVP, scope dikunci ke in-app notification.

6. **Tidak ada migrasi otomatis dari Excel/Google Sheet**
   - Data lama akan dimasukkan secara manual sesuai jawaban klarifikasi.
   - Import massal Excel/CSV tidak termasuk MVP kecuali diputuskan sebagai enhancement.

7. **Tidak ada multi-company/multi-tenant**
   - Sistem diasumsikan digunakan oleh satu perusahaan/organisasi.

8. **Tidak ada mobile app native**
   - Aplikasi berbasis web responsif.
   - Tidak ada aplikasi Android/iOS native pada versi ini.

9. **Tidak ada integrasi ERP/accounting**
   - Nilai depresiasi aset, pembukuan, dan integrasi ke sistem finance tidak termasuk MVP.

---

## 5. Target User / Persona

### 5.1 Admin

**Deskripsi:**  
Pengguna internal yang bertanggung jawab mengelola aset perusahaan, memverifikasi peminjaman, mencatat pengambilan dan pengembalian, memperbarui stok, mengelola lokasi, mengecek kondisi aset, dan membuat laporan.

**Kebutuhan utama:**

- Mengelola data aset secara CRUD.
- Mencatat barang masuk dan keluar.
- Melihat semua aset dan statusnya.
- Memproses approval peminjaman.
- Mencatat waktu pengambilan barang.
- Mencatat waktu pengembalian barang.
- Mengubah kondisi aset menjadi Baik atau Rusak.
- Melihat seluruh riwayat peminjaman.
- Mengelola lokasi aset.
- Menerima notifikasi stok menipis di dalam aplikasi.
- Mengekspor laporan PDF untuk manajemen.
- Mengekspor laporan Excel/CSV untuk kebutuhan Admin.
- Melihat audit log perubahan data dan transaksi.

**Batasan akses:**

- Admin memiliki akses penuh ke data master aset, transaksi, laporan, lokasi, dan audit log.

---

### 5.2 Staff

**Deskripsi:**  
Pengguna internal yang membutuhkan aset perusahaan untuk bekerja dan hanya dapat menggunakan sistem untuk melihat ketersediaan aset, mengajukan peminjaman, dan melakukan pengembalian.

**Kebutuhan utama:**

- Melihat daftar aset yang tersedia.
- Melihat detail dasar aset.
- Mengajukan peminjaman aset.
- Melihat status pengajuan sendiri.
- Mengajukan proses pengembalian aset.

**Batasan akses:**

- Staff tidak dapat membuat, mengubah, atau menghapus data master aset.
- Staff tidak dapat mengubah stok aset.
- Staff tidak dapat mengubah kondisi aset secara final.
- Staff tidak dapat menyetujui peminjaman.
- Staff tidak dapat melihat seluruh riwayat semua user, kecuali riwayat miliknya sendiri.
- Staff tidak dapat mengakses audit log.

---

### 5.3 Manajemen

**Deskripsi:**  
Pihak yang membutuhkan laporan aset untuk evaluasi dan pengambilan keputusan.

**Kebutuhan utama:**

- Melihat laporan dalam bentuk dashboard.
- Menerima laporan PDF berdasarkan periode, lokasi, kategori, atau status aset.

**Batasan akses:**

- Asumsi: Manajemen tidak memiliki role login khusus di MVP.
- Laporan untuk manajemen dibuat atau diekspor oleh Admin.

---

## 6. User Stories & Use Cases

### US-01: Admin mengelola data aset

**Sebagai Admin, saya ingin menambah, melihat, mengubah, dan menghapus data aset, supaya data aset perusahaan terdokumentasi secara terpusat.**

Acceptance Criteria:

- Admin dapat membuat aset baru dengan field minimal:
  - kode aset
  - nama aset
  - kategori
  - lokasi penyimpanan
  - jumlah stok
  - kondisi
  - status ketersediaan
- Kode aset wajib unik.
- Admin dapat mengubah data aset.
- Admin dapat menghapus aset hanya jika tidak sedang dipinjam.
- Setiap create, update, dan delete tercatat di audit log.
- Staff tidak dapat mengakses fungsi create, update, atau delete aset.

---

### US-02: Admin mencatat barang masuk

**Sebagai Admin, saya ingin mencatat barang masuk, supaya stok aset bertambah dan riwayat perubahan stok terdokumentasi.**

Acceptance Criteria:

- Admin dapat memilih aset dan menambahkan jumlah stok.
- Sistem mencatat tanggal, jumlah, Admin pencatat, dan catatan opsional.
- Jumlah stok aset bertambah sesuai input.
- Perubahan stok tercatat di audit log.
- Jika input jumlah kurang dari atau sama dengan 0, sistem menolak transaksi.

---

### US-03: Admin mencatat barang keluar

**Sebagai Admin, saya ingin mencatat barang keluar, supaya stok aset berkurang untuk kebutuhan penghapusan, kehilangan, rusak berat, atau alasan operasional lain.**

Acceptance Criteria:

- Admin dapat memilih aset dan mengurangi stok.
- Admin wajib mengisi alasan barang keluar.
- Sistem menolak transaksi jika jumlah keluar lebih besar dari stok tersedia.
- Sistem mencatat tanggal, jumlah, Admin pencatat, dan alasan.
- Perubahan stok tercatat di audit log.

---

### US-04: Staff melihat daftar aset tersedia

**Sebagai Staff, saya ingin melihat daftar aset yang tersedia, supaya saya dapat memilih aset yang bisa dipinjam.**

Acceptance Criteria:

- Staff dapat melihat daftar aset dengan status tersedia.
- Staff dapat memfilter berdasarkan kategori dan lokasi.
- Staff dapat mencari aset berdasarkan kode aset atau nama aset.
- Staff tidak melihat tombol edit/hapus aset.
- Aset dengan status Dipinjam atau Rusak tidak dapat diajukan untuk peminjaman.

---

### US-05: Staff mengajukan peminjaman

**Sebagai Staff, saya ingin mengajukan peminjaman aset, supaya saya dapat menggunakan aset perusahaan secara resmi dan tercatat.**

Acceptance Criteria:

- Staff dapat mengajukan peminjaman untuk aset yang tersedia.
- Semua pengajuan memiliki status awal `Menunggu Approval`.
- Staff wajib mengisi kebutuhan/purpose dan estimasi tanggal pengembalian.
- Sistem mencatat waktu pengajuan otomatis.
- Staff tidak dapat mengajukan aset yang sedang Dipinjam atau Rusak.
- Staff dapat melihat status pengajuannya sendiri.

---

### US-06: Admin menyetujui atau menolak peminjaman

**Sebagai Admin, saya ingin memverifikasi pengajuan peminjaman, supaya hanya peminjaman yang valid yang dapat diproses.**

Acceptance Criteria:

- Admin dapat melihat daftar pengajuan dengan status `Menunggu Approval`.
- Admin dapat menyetujui atau menolak pengajuan.
- Jika disetujui, status transaksi berubah menjadi `Disetujui`.
- Jika ditolak, Admin wajib mengisi alasan penolakan.
- Staff dapat melihat status disetujui/ditolak untuk pengajuannya.
- Keputusan approval tercatat di audit log.

---

### US-07: Admin mencatat waktu pengambilan barang

**Sebagai Admin, saya ingin mencatat waktu pengambilan barang setelah pengajuan disetujui, supaya sistem mengetahui aset sudah benar-benar digunakan.**

Acceptance Criteria:

- Admin dapat mencatat pengambilan hanya untuk transaksi berstatus `Disetujui`.
- Saat pengambilan dicatat, status transaksi berubah menjadi `Dipinjam`.
- Status aset berubah menjadi `Dipinjam`.
- Sistem mencatat waktu pengambilan aktual.
- Aset yang sudah berstatus Dipinjam tidak dapat diajukan oleh Staff lain.
- Pencatatan pengambilan tercatat di audit log.

---

### US-08: Staff mengajukan pengembalian aset

**Sebagai Staff, saya ingin mengajukan pengembalian aset, supaya Admin dapat memeriksa dan menutup transaksi peminjaman.**

Acceptance Criteria:

- Staff dapat mengajukan pengembalian untuk aset yang sedang dipinjam olehnya.
- Sistem mencatat waktu pengajuan pengembalian.
- Status transaksi berubah menjadi `Menunggu Pemeriksaan Pengembalian`.
- Staff tidak dapat mengajukan pengembalian aset yang bukan sedang dipinjam olehnya.
- Admin menerima notifikasi in-app bahwa ada pengembalian yang perlu diperiksa.

---

### US-09: Admin memeriksa dan menyelesaikan pengembalian

**Sebagai Admin, saya ingin memeriksa kondisi aset saat dikembalikan, supaya kondisi akhir aset tercatat dan status aset diperbarui.**

Acceptance Criteria:

- Admin dapat membuka transaksi pengembalian yang menunggu pemeriksaan.
- Admin wajib memilih kondisi akhir aset:
  - Baik
  - Rusak
- Admin dapat menambahkan catatan kondisi.
- Sistem mencatat waktu pengembalian aktual.
- Jika kondisi Baik, status aset menjadi `Tersedia`.
- Jika kondisi Rusak, status aset menjadi `Rusak` dan tidak bisa dipinjam.
- Riwayat kondisi tersimpan pada transaksi.
- Pemeriksaan pengembalian tercatat di audit log.

---

### US-10: Admin mengelola lokasi aset

**Sebagai Admin, saya ingin mengelola lokasi aset secara manual, supaya lokasi penyimpanan aset selalu terdokumentasi.**

Acceptance Criteria:

- Admin dapat membuat, mengubah, dan menghapus data lokasi.
- Admin dapat mengubah lokasi penyimpanan aset.
- Sistem menolak penghapusan lokasi yang masih digunakan aset aktif.
- Perubahan lokasi tercatat di audit log.
- Staff hanya dapat melihat lokasi aset, tidak dapat mengubahnya.

---

### US-11: Admin menerima notifikasi stok menipis

**Sebagai Admin, saya ingin menerima notifikasi stok menipis di dalam aplikasi, supaya saya dapat segera melakukan pengadaan atau pengecekan aset.**

Acceptance Criteria:

- Admin dapat melihat notifikasi in-app saat stok aset berada di bawah ambang batas minimum.
- Ambang batas minimum dapat disimpan per aset.
- Notifikasi muncul di dashboard Admin.
- Notifikasi stok menipis tidak dikirim ke WhatsApp/Telegram pada MVP.
- Notifikasi tercatat dengan timestamp.

---

### US-12: Admin melihat riwayat peminjaman

**Sebagai Admin, saya ingin melihat seluruh riwayat peminjaman, supaya saya dapat melacak penggunaan aset dan mengurangi risiko kehilangan.**

Acceptance Criteria:

- Admin dapat melihat riwayat semua transaksi.
- Riwayat dapat difilter berdasarkan:
  - tanggal
  - aset
  - peminjam
  - status transaksi
  - lokasi
  - kategori
- Riwayat menampilkan minimal:
  - nama peminjam
  - kode aset
  - waktu pengajuan
  - waktu approval/penolakan
  - waktu pengambilan
  - waktu pengajuan pengembalian
  - waktu pengembalian aktual
  - kondisi akhir
  - status transaksi
- Staff hanya dapat melihat riwayat peminjamannya sendiri.

---

### US-13: Admin membuat laporan

**Sebagai Admin, saya ingin membuat laporan aset berdasarkan tanggal, lokasi, kategori, dan status, supaya laporan dapat digunakan oleh manajemen dan operasional.**

Acceptance Criteria:

- Admin dapat melihat dashboard laporan.
- Admin dapat memfilter laporan berdasarkan:
  - tanggal
  - lokasi
  - kategori
  - status aset
- Admin dapat mengekspor PDF untuk manajemen.
- Admin dapat mengekspor Excel/CSV untuk kebutuhan Admin.
- Laporan menampilkan ringkasan jumlah aset, aset tersedia, aset dipinjam, aset rusak, dan aset hilang/barang keluar jika dicatat.
- Staff tidak dapat mengakses menu laporan global.

---

### US-14: Admin melihat audit log

**Sebagai Admin, saya ingin melihat audit log, supaya setiap perubahan data aset, stok, status, dan transaksi dapat ditelusuri.**

Acceptance Criteria:

- Audit log mencatat:
  - user pelaku
  - role pelaku
  - aksi
  - entitas yang diubah
  - ID entitas
  - nilai sebelum perubahan
  - nilai sesudah perubahan
  - timestamp
- Admin dapat memfilter audit log berdasarkan user, tanggal, aksi, dan entitas.
- Staff tidak dapat mengakses audit log.
- Audit log tidak dapat dihapus melalui UI MVP.

---

## 7. Functional Requirements

### 7.1 Modul Autentikasi & Role Access

**Prioritas:** P0

**Deskripsi:**  
Sistem menggunakan mekanisme autentikasi yang sudah tersedia (`auth_ready: true`) dan membatasi akses berdasarkan role Admin dan Staff.

Requirements:

- Sistem harus mengenali user yang login.
- Sistem harus menyimpan role user: Admin atau Staff.
- Menu dan aksi harus dibatasi sesuai role.
- Staff tidak boleh mengakses endpoint Admin.
- Admin dapat mengakses seluruh modul operasional.

Acceptance Criteria:

- User tanpa login tidak dapat mengakses aplikasi.
- Admin dapat membuka menu aset, lokasi, transaksi, laporan, notifikasi, dan audit log.
- Staff hanya dapat membuka daftar aset tersedia, pengajuan peminjaman, pengembalian, dan riwayat pribadi.
- Request API dari Staff ke endpoint Admin ditolak dengan status 403.
- Request tanpa autentikasi ditolak dengan status 401.

---

### 7.2 Modul Manajemen Aset

**Prioritas:** P0

**Deskripsi:**  
Admin dapat mengelola data master aset secara lengkap.

Data minimal aset:

- jenis pencatatan (`unik` atau `stok`)
- kode aset
- nama aset
- kategori
- lokasi penyimpanan
- jumlah stok
- kondisi
- status ketersediaan
- minimum stok
- created_at
- updated_at

Status aset:

- `Tersedia`
- `Dipinjam`
- `Rusak`
- `Tidak Aktif`

Kondisi aset:

- `Baik`
- `Rusak`

Requirements:

- Admin dapat membuat aset baru.
- Admin dapat melihat daftar semua aset.
- Admin dapat mengubah data aset.
- Admin dapat menghapus atau menonaktifkan aset.
- Staff hanya dapat melihat aset yang tersedia.
- Aset bertipe `unik` wajib memiliki kode aset unik per unit dan jumlah stok `1`.
- Aset bertipe `stok` boleh memiliki jumlah stok lebih dari `1`.
- Kode aset harus unik.
- Status aset harus otomatis berubah berdasarkan transaksi peminjaman/pengembalian.

Acceptance Criteria:

- Sistem menolak pembuatan aset dengan kode aset duplikat.
- Sistem menolak input jumlah stok selain `1` untuk aset bertipe `unik`.
- Sistem menolak penghapusan aset yang sedang dipinjam.
- Perubahan data aset tercatat di audit log.
- Aset Rusak tidak muncul sebagai aset yang bisa dipinjam Staff.
- Aset Dipinjam tidak bisa dipinjam oleh user lain.

---

### 7.3 Modul Kategori Aset

**Prioritas:** P1

**Deskripsi:**  
Admin dapat mengelola kategori aset seperti Laptop, Komputer, Printer, Proyektor, atau kategori lain.

Requirements:

- Admin dapat membuat kategori.
- Admin dapat mengubah nama kategori.
- Admin dapat menghapus kategori jika belum digunakan.
- Kategori digunakan sebagai filter aset dan laporan.

Acceptance Criteria:

- Sistem menolak penghapusan kategori yang masih digunakan oleh aset.
- Staff dapat memfilter aset berdasarkan kategori.
- Laporan dapat difilter berdasarkan kategori.

---

### 7.4 Modul Lokasi Aset

**Prioritas:** P0

**Deskripsi:**  
Sistem mencatat lokasi penyimpanan aset secara manual. Tidak ada integrasi hardware tracking atau scan QR/barcode pada MVP.

Requirements:

- Admin dapat membuat lokasi.
- Admin dapat mengubah lokasi.
- Admin dapat menghapus lokasi jika tidak digunakan.
- Admin dapat mengubah lokasi aset.
- Staff dapat melihat lokasi aset tersedia.

Acceptance Criteria:

- Lokasi aset tersimpan pada data aset.
- Perubahan lokasi tercatat di audit log.
- Sistem menolak penghapusan lokasi yang masih dipakai aset aktif.
- Lokasi dapat digunakan sebagai filter laporan.

---

### 7.5 Modul Barang Masuk & Barang Keluar

**Prioritas:** P0

**Deskripsi:**  
Admin dapat mencatat penambahan atau pengurangan stok aset.

Requirements:

- Admin dapat mencatat barang masuk.
- Admin dapat mencatat barang keluar.
- Barang keluar wajib memiliki alasan.
- Sistem memperbarui jumlah stok setelah transaksi.
- Sistem memicu notifikasi stok menipis jika stok di bawah minimum.
- Untuk aset bertipe `unik`, barang masuk berarti menambahkan unit baru dengan kode aset baru, sedangkan barang keluar berarti menonaktifkan atau mengeluarkan unit spesifik tersebut.
- Untuk aset bertipe `stok`, barang masuk dan keluar mengubah jumlah stok pada record aset yang sama.

Acceptance Criteria:

- Jumlah barang masuk harus lebih dari 0.
- Jumlah barang keluar harus lebih dari 0.
- Sistem menolak barang keluar jika stok tidak cukup.
- Sistem menolak barang keluar untuk aset `unik` jika unit yang dipilih masih aktif dipinjam atau belum diproses Admin.
- Setiap perubahan stok tercatat di audit log.
- Riwayat stok dapat dilihat Admin.

---

### 7.6 Modul Pengajuan Peminjaman

**Prioritas:** P0

**Deskripsi:**  
Staff dapat mengajukan peminjaman aset yang tersedia. Semua peminjaman wajib approval Admin.

Status transaksi peminjaman:

- `Menunggu Approval`
- `Disetujui`
- `Ditolak`
- `Dipinjam`
- `Menunggu Pemeriksaan Pengembalian`
- `Selesai`
- `Selesai dengan Kerusakan`
- `Dibatalkan`

Requirements:

- Staff dapat memilih aset tersedia.
- Staff wajib mengisi tujuan peminjaman.
- Staff wajib mengisi estimasi tanggal pengembalian.
- Sistem mencatat waktu pengajuan.
- Transaksi masuk ke daftar approval Admin.
- Satu transaksi peminjaman hanya berisi satu aset.
- Staff dapat membatalkan pengajuan miliknya sendiri selama status masih `Menunggu Approval`.

Acceptance Criteria:

- Staff tidak dapat meminjam aset Dipinjam.
- Staff tidak dapat meminjam aset Rusak.
- Staff tidak dapat mengubah data master aset saat mengajukan peminjaman.
- Staff dapat membatalkan pengajuan sendiri sebelum disetujui Admin.
- Sistem menolak pembatalan jika status pengajuan sudah `Disetujui`, `Dipinjam`, atau selesai.
- Setelah pengajuan dibuat, status transaksi adalah `Menunggu Approval`.
- Admin menerima notifikasi in-app untuk pengajuan baru.

---

### 7.7 Modul Approval Peminjaman

**Prioritas:** P0

**Deskripsi:**  
Admin memverifikasi semua pengajuan peminjaman.

Requirements:

- Admin dapat melihat daftar pengajuan menunggu approval.
- Admin dapat menyetujui pengajuan.
- Admin dapat menolak pengajuan dengan alasan.
- Sistem mencatat waktu approval/penolakan.
- Sistem mencatat Admin yang melakukan approval/penolakan.

Acceptance Criteria:

- Pengajuan yang ditolak wajib memiliki alasan.
- Pengajuan yang disetujui berubah status menjadi `Disetujui`.
- Pengajuan yang ditolak berubah status menjadi `Ditolak`.
- Approval tercatat di audit log.
- Staff dapat melihat hasil approval pada riwayat pribadi.

---

### 7.8 Modul Pengambilan Aset

**Prioritas:** P0

**Deskripsi:**  
Setelah disetujui, Admin mencatat waktu pengambilan barang.

Requirements:

- Admin dapat mencatat pengambilan untuk transaksi `Disetujui`.
- Sistem mencatat waktu pengambilan aktual.
- Status transaksi berubah menjadi `Dipinjam`.
- Status aset berubah menjadi `Dipinjam`.

Acceptance Criteria:

- Sistem menolak pencatatan pengambilan untuk transaksi yang belum disetujui.
- Setelah aset diambil, aset tidak dapat diajukan oleh Staff lain.
- Pengambilan tercatat di audit log.

---

### 7.9 Modul Pengembalian Aset

**Prioritas:** P0

**Deskripsi:**  
Staff mengajukan pengembalian, lalu Admin memeriksa kondisi fisik aset dan menyelesaikan transaksi.

Requirements:

- Staff dapat mengajukan pengembalian untuk aset yang dipinjamnya.
- Admin memeriksa kondisi aset.
- Admin mencatat kondisi akhir.
- Admin mencatat waktu pengembalian aktual.
- Admin dapat menandai aset Baik atau Rusak.

Acceptance Criteria:

- Staff tidak dapat mengembalikan aset milik transaksi user lain.
- Jika aset Baik, status transaksi menjadi `Selesai` dan status aset menjadi `Tersedia`.
- Jika aset Rusak, status transaksi menjadi `Selesai dengan Kerusakan` dan status aset menjadi `Rusak`.
- Kondisi akhir dan catatan pemeriksaan tersimpan di riwayat.
- Pengembalian tercatat di audit log.

---

### 7.10 Modul Riwayat Peminjaman

**Prioritas:** P0

**Deskripsi:**  
Sistem menyimpan riwayat lengkap peminjaman dan pengembalian aset.

Requirements:

- Admin dapat melihat semua riwayat.
- Staff hanya dapat melihat riwayat miliknya sendiri.
- Riwayat menyimpan:
  - nama peminjam
  - kode aset
  - waktu pengajuan
  - waktu approval/penolakan
  - waktu pengambilan
  - waktu pengajuan pengembalian
  - waktu pengembalian aktual
  - kondisi akhir
  - status transaksi
  - alasan penolakan jika ada
  - catatan kerusakan jika ada

Acceptance Criteria:

- Riwayat transaksi tidak hilang meskipun aset dinonaktifkan.
- Riwayat dapat difilter oleh Admin.
- Staff tidak dapat melihat riwayat user lain.
- Semua perubahan status transaksi tercatat dengan timestamp.

---

### 7.11 Modul Notifikasi In-App

**Prioritas:** P0

**Deskripsi:**  
Sistem menyediakan notifikasi di dalam aplikasi untuk Admin dan Staff.

Jenis notifikasi MVP:

- Pengajuan peminjaman baru untuk Admin.
- Hasil approval untuk Staff.
- Pengajuan pengembalian untuk Admin.
- Stok menipis untuk Admin.

Requirements:

- Sistem membuat notifikasi saat event penting terjadi.
- Notifikasi dapat ditandai sudah dibaca.
- Notifikasi ditampilkan di dashboard atau notification center.
- Realtime notification menggunakan SSE.

Acceptance Criteria:

- Admin menerima notifikasi saat Staff membuat pengajuan peminjaman.
- Staff menerima notifikasi saat pengajuan disetujui atau ditolak.
- Admin menerima notifikasi saat Staff mengajukan pengembalian.
- Admin menerima notifikasi saat stok berada di bawah minimum.
- Jika koneksi SSE terputus, notifikasi tetap dapat dilihat setelah halaman direfresh.

---

### 7.12 Modul Laporan & Dashboard

**Prioritas:** P0 untuk dashboard dasar, P1 untuk export lengkap

**Deskripsi:**  
Admin dapat melihat ringkasan aset dan membuat laporan untuk operasional serta manajemen.

Requirements P0:

- Dashboard Admin menampilkan:
  - total aset
  - total aset tersedia
  - total aset dipinjam
  - total aset rusak
  - stok menipis
  - jumlah transaksi aktif
- Dashboard dapat difilter minimal berdasarkan tanggal dan status.

Requirements P1:

- Laporan dapat difilter berdasarkan tanggal, lokasi, kategori, dan status aset.
- Export PDF untuk manajemen.
- Export Excel/CSV untuk Admin.

Acceptance Criteria:

- Admin dapat melihat dashboard setelah login.
- Staff tidak dapat melihat dashboard global.
- PDF berisi ringkasan dan detail laporan sesuai filter.
- CSV/Excel berisi data yang dapat diolah ulang oleh Admin.
- Filter laporan menghasilkan data sesuai parameter yang dipilih.

---

### 7.13 Modul Audit Log

**Prioritas:** P0

**Deskripsi:**  
Audit log wajib tersedia untuk mencatat perubahan data aset, status, stok, lokasi, dan transaksi.

Requirements:

- Sistem mencatat setiap aksi penting.
- Audit log menyimpan before-after value untuk update.
- Audit log hanya dapat dilihat Admin.
- Audit log tidak dapat diedit atau dihapus melalui UI.

Event minimal yang harus dicatat:

- Create/update/delete aset.
- Perubahan stok.
- Perubahan lokasi.
- Pengajuan peminjaman.
- Approval/penolakan.
- Pengambilan aset.
- Pengajuan pengembalian.
- Pemeriksaan pengembalian.
- Perubahan kondisi aset.
- Export laporan.

Acceptance Criteria:

- Setiap event audit memiliki user, role, aksi, entitas, entity_id, timestamp.
- Untuk update, sistem menyimpan nilai sebelum dan sesudah.
- Staff tidak dapat mengakses audit log.
- Audit log dapat difilter oleh Admin.

---

### 7.14 Modul Input Manual Data Awal

**Prioritas:** P0

**Deskripsi:**  
Karena data aset lama perlu dimigrasikan melalui input manual, sistem harus mendukung Admin untuk memasukkan data aset awal satu per satu.

Requirements:

- Admin dapat input aset baru melalui form.
- Form harus cukup sederhana agar cocok untuk jumlah aset awal <100.
- Tidak ada kewajiban import otomatis dari Excel/Google Sheet pada MVP.

Acceptance Criteria:

- Admin dapat menyelesaikan input aset manual tanpa bantuan teknis.
- Validasi field wajib tersedia.
- Sistem menampilkan error jika data tidak valid.
- Data aset yang sudah diinput langsung muncul di daftar aset.

---

## 8. Non-Functional Requirements

### 8.1 Performance

- Untuk skala awal <100 aset dan <20 user, halaman daftar aset harus load dalam waktu maksimal **2 detik** pada koneksi kantor normal.
- Operasi create/update aset dan transaksi harus selesai maksimal **3 detik**.
- Dashboard Admin harus load maksimal **3 detik**.
- Export PDF/CSV untuk data <1.000 baris harus selesai maksimal **10 detik**.

### 8.2 Security

- Semua endpoint harus memvalidasi autentikasi.
- Semua endpoint Admin harus memvalidasi role Admin.
- Staff tidak boleh mengakses data user lain.
- Password dan mekanisme login mengikuti sistem auth yang sudah siap.
- Input user harus divalidasi untuk mencegah SQL injection, XSS, dan invalid payload.
- Audit log tidak dapat diedit atau dihapus dari UI.
- Export laporan hanya dapat dilakukan Admin.

### 8.3 Availability

- Target availability aplikasi selama jam kerja: **99%**.
- Jika SSE gagal, aplikasi tetap berjalan dengan fallback refresh manual.
- Data transaksi tidak boleh hilang ketika notifikasi realtime gagal.

### 8.4 Scalability

- MVP dioptimalkan untuk <100 aset dan <20 user.
- Struktur database harus tetap memungkinkan peningkatan ke ribuan aset di masa depan.
- Pagination wajib tersedia untuk daftar aset, transaksi, dan audit log meskipun data awal kecil.

### 8.5 Reliability & Data Integrity

- Status aset dan status transaksi harus konsisten.
- Operasi approval, pengambilan, dan pengembalian harus menggunakan transaksi database agar tidak terjadi partial update.
- Kode aset harus unik.
- Perubahan stok tidak boleh menghasilkan nilai negatif.
- Timestamp harus disimpan konsisten menggunakan timezone server yang disepakati.

### 8.6 Usability

- UI harus sederhana karena salah satu diferensiasi utama BSGAsset adalah lebih sederhana dari solusi sejenis.
- Workflow utama harus dapat dipahami tanpa training panjang:
  - input aset
  - ajukan pinjam
  - approve
  - catat pengambilan
  - ajukan pengembalian
  - cek kondisi
  - selesai
- Form harus memiliki validasi dan pesan error yang jelas.

---

## 9. Edge Cases & Error Handling

### 9.1 Aset dipinjam bersamaan oleh dua Staff

**Kasus:** Dua Staff membuka halaman aset yang sama saat status masih Tersedia, lalu mengajukan peminjaman hampir bersamaan.

Handling:

- Sistem harus melakukan validasi status aset saat submit, bukan hanya saat halaman dibuka.
- Jika aset sudah tidak tersedia, pengajuan kedua ditolak.
- Pesan error: “Aset sudah tidak tersedia untuk dipinjam.”

---

### 9.2 Admin menyetujui pengajuan tetapi aset sudah tidak tersedia

**Kasus:** Ada kondisi data berubah sebelum Admin approve.

Handling:

- Saat approval, sistem cek ulang status aset.
- Jika aset tidak tersedia, approval ditolak.
- Admin melihat pesan: “Aset tidak dapat disetujui karena status saat ini bukan Tersedia.”

---

### 9.3 Staff mencoba mengembalikan aset milik user lain

**Kasus:** Staff memanipulasi URL/API untuk mengakses transaksi user lain.

Handling:

- Backend memvalidasi ownership transaksi.
- Jika bukan miliknya, sistem mengembalikan 403.
- Event percobaan akses tidak sah dicatat di audit/security log jika tersedia.

---

### 9.4 Aset rusak saat dikembalikan

**Kasus:** Admin menemukan kerusakan fisik saat pemeriksaan.

Handling:

- Admin memilih kondisi akhir `Rusak`.
- Sistem mengubah status aset menjadi `Rusak`.
- Sistem menutup transaksi sebagai `Selesai dengan Kerusakan`.
- Aset tidak muncul di daftar aset tersedia untuk Staff.
- Catatan kerusakan wajib diisi.

---

### 9.5 Admin menghapus aset yang sedang dipinjam

**Kasus:** Admin mencoba menghapus aset aktif.

Handling:

- Sistem menolak penghapusan.
- Pesan error: “Aset sedang dipinjam dan tidak dapat dihapus.”
- Admin dapat menonaktifkan aset hanya setelah transaksi selesai.

---

### 9.6 Stok barang keluar melebihi stok tersedia

**Kasus:** Admin mencatat barang keluar lebih besar dari stok.

Handling:

- Sistem menolak transaksi.
- Stok tidak berubah.
- Pesan error: “Jumlah keluar melebihi stok tersedia.”

---

### 9.7 Stok menipis setelah barang keluar

**Kasus:** Setelah pencatatan barang keluar, stok berada di bawah minimum.

Handling:

- Sistem membuat notifikasi in-app untuk Admin.
- Notifikasi muncul di dashboard Admin.
- Jika SSE aktif, notifikasi muncul realtime.
- Jika SSE gagal, notifikasi muncul setelah refresh.

---

### 9.8 Koneksi SSE terputus

**Kasus:** Notifikasi realtime tidak masuk karena koneksi SSE terputus.

Handling:

- UI menampilkan indikator koneksi realtime terputus jika memungkinkan.
- Sistem mencoba reconnect otomatis.
- Notifikasi tetap tersimpan di database.
- User dapat melihat notifikasi setelah refresh.

---

### 9.9 Data aset manual tidak lengkap

**Kasus:** Admin memasukkan data aset awal tetapi field wajib kosong.

Handling:

- Sistem menolak submit.
- Field wajib ditandai.
- Pesan error spesifik, misalnya “Kode aset wajib diisi.”

---

### 9.10 Kode aset duplikat

**Kasus:** Admin memasukkan kode aset yang sudah ada.

Handling:

- Sistem menolak penyimpanan.
- Pesan error: “Kode aset sudah digunakan.”
- Tidak ada data duplikat tersimpan.

---

### 9.11 Staff mencoba mengakses endpoint Admin

**Kasus:** Staff mengakses URL laporan, audit log, atau CRUD aset.

Handling:

- Backend mengembalikan 403.
- UI redirect ke halaman tidak berwenang.
- Tidak ada data Admin yang dikirim ke frontend.

---

### 9.12 Export laporan gagal

**Kasus:** PDF/CSV gagal dibuat karena query error atau timeout.

Handling:

- Sistem menampilkan pesan error.
- Tidak membuat file rusak.
- Admin dapat mencoba ulang dengan filter data lebih kecil.
- Error dicatat di log aplikasi.

---

### 9.13 Pengajuan peminjaman dibatalkan sebelum approval

**Kasus:** Staff berubah pikiran sebelum Admin approve.

Handling:

- Asumsi: MVP menyediakan status `Dibatalkan` untuk transaksi yang masih `Menunggu Approval`.
- Staff dapat membatalkan pengajuan miliknya sendiri hanya sebelum approval.
- Setelah disetujui, pembatalan hanya dapat dilakukan oleh Admin.

---

### 9.14 Pengembalian tanpa pemeriksaan Admin

**Kasus:** Staff menganggap aset sudah dikembalikan, tetapi Admin belum memeriksa.

Handling:

- Status transaksi tetap `Menunggu Pemeriksaan Pengembalian`.
- Status aset belum menjadi Tersedia.
- Aset belum bisa dipinjam user lain sampai Admin menyelesaikan pemeriksaan.

---

## 10. Success Metrics / KPI

### KPI Utama

1. **Penurunan jumlah aset hilang**
   - Target: jumlah aset yang dicatat sebagai hilang/barang keluar karena kehilangan turun minimal **50% dalam 6 bulan** setelah implementasi dibanding periode 6 bulan sebelum implementasi.
   - Data sumber: transaksi barang keluar dengan alasan kehilangan dan laporan aset.

### KPI Operasional

2. **Kelengkapan data aset**
   - Target: **100% aset aktif** memiliki kode aset, nama aset, kategori, lokasi, stok, kondisi, dan status ketersediaan.

3. **Transaksi peminjaman tercatat**
   - Target: **100% peminjaman aset** dilakukan melalui sistem dan memiliki status transaksi.

4. **Approval tercatat**
   - Target: **100% pengajuan peminjaman** memiliki keputusan Admin: disetujui atau ditolak.

5. **Pengembalian tercatat**
   - Target: **100% transaksi Dipinjam** memiliki waktu pengembalian aktual atau masih tercatat sebagai transaksi aktif.

6. **Audit log coverage**
   - Target: **100% perubahan data aset, stok, lokasi, status, dan transaksi** tercatat di audit log.

7. **Kecepatan pencarian aset**
   - Target: Staff dapat menemukan aset tersedia dalam waktu maksimal **30 detik** melalui pencarian/filter.

8. **Adopsi Admin**
   - Target: minimal **90% aktivitas pengelolaan aset** dilakukan melalui BSGAsset dalam 1 bulan pertama setelah go-live.

9. **SLA performa halaman utama**
   - Target: halaman daftar aset dan dashboard load di bawah **3 detik** untuk 95% request pada skala awal.

---

## 11. Dependencies & Constraints

### Dependencies

1. **Auth system**
   - Sistem autentikasi sudah tersedia (`auth_ready: true`).
   - BSGAsset bergantung pada data user dan role dari auth system.

2. **Database PostgreSQL**
   - Semua data aset, transaksi, audit log, notifikasi, dan laporan disimpan di PostgreSQL.

3. **Next.js frontend dan backend**
   - Frontend menggunakan Next.js.
   - Backend menggunakan Next.js Route Handlers.

4. **SSE untuk realtime**
   - Notifikasi realtime menggunakan Server-Sent Events.
   - SSE hanya untuk delivery realtime, bukan sumber kebenaran data.

5. **Input data manual**
   - Data aset lama dari Excel/Google Sheet dimigrasikan melalui input manual oleh Admin.

### Constraints

1. **Deadline <1 bulan**
   - Scope MVP harus fokus pada fitur P0.
   - Fitur P1/P2 dapat dikerjakan jika masih ada waktu setelah P0 stabil.

2. **Skala awal kecil**
   - Sistem didesain untuk <100 aset dan <20 user pada fase awal.
   - Namun struktur data tetap dibuat rapi agar bisa berkembang.

3. **Semua peminjaman wajib approval**
   - Tidak ada auto-approve pada versi ini.

4. **Lokasi aset input manual**
   - “Real-time location” dalam konteks MVP berarti lokasi terkini yang dicatat manual di sistem, bukan tracking fisik otomatis.

5. **Notifikasi MVP hanya in-app**
   - Klarifikasi menyebut WhatsApp/Telegram dan juga “di dalam aplikasi saja”.
   - Untuk MVP, notifikasi dikunci ke in-app agar sesuai deadline <1 bulan.

6. **Laporan**
   - PDF digunakan untuk manajemen.
   - Dashboard tersedia untuk ringkasan.
   - Excel/CSV digunakan untuk Admin.

---

## 12. Keputusan Final (dikunci untuk MVP)

Semua poin di bawah ini adalah keputusan final agar AI agent tidak perlu menebak atau meminta klarifikasi ulang.

1. **Manajemen tidak memiliki role login khusus di MVP**
   - Laporan untuk manajemen dibuat atau diekspor oleh Admin dalam format PDF.

2. **“Real-time lokasi” berarti lokasi terkini yang dicatat manual di sistem**
   - Tidak ada tracking fisik otomatis pada MVP.

3. **Notifikasi MVP hanya in-app**
   - WhatsApp/Telegram masuk P2, bukan MVP.

4. **Aset hilang dicatat melalui transaksi barang keluar**
   - Alasan barang keluar wajib menyediakan opsi `Hilang`.
   - Jika perlu, Admin dapat menandai aset menjadi `Tidak Aktif` setelah kasus selesai.

5. **Model aset yang dipakai adalah hybrid**
   - Aset bernilai tinggi atau unit unik memakai **kode aset unik per unit**.
   - Aset yang memang dikelola sebagai stok memakai **jumlah stok** pada satu record aset.

6. **Import otomatis dari Excel/CSV tidak termasuk MVP**
   - Data awal diinput manual oleh Admin.

7. **Satu transaksi peminjaman hanya untuk satu aset**
   - Jika nanti dibutuhkan multi-aset, itu masuk enhancement setelah MVP.

8. **Minimum stok dihitung per aset**
   - Bukan global per kategori.

9. **Lampiran foto kondisi aset tidak wajib di MVP**
   - Boleh ditambahkan belakangan sebagai enhancement.

10. **Template laporan tidak memakai format perusahaan khusus di MVP**
    - Gunakan format standar yang mudah dibaca manajemen.

11. **Staff boleh membatalkan pengajuan sendiri hanya sebelum approval**
    - Setelah approval, pembatalan hanya bisa dilakukan Admin.

12. **Kategori aset non-IT tetap boleh dipakai**
    - Selama masih bisa dimodelkan sebagai aset unik atau aset stok.

13. **Timezone default adalah Asia/Jakarta**
    - Kecuali tim menyepakati timezone lain.

14. **Role user dibaca dari sistem auth yang sudah tersedia**
    - BSGAsset tidak mendefinisikan sistem auth baru.

---

## 13. Milestone / Prioritas Rilis

### Rilis MVP — Target <1 bulan

#### Week 1: Foundation & Data Master

Fitur:

- Setup project Next.js frontend/backend.
- Setup PostgreSQL schema.
- Integrasi auth dan role access.
- Modul manajemen aset.
- Modul lokasi aset.
- Input manual data aset awal.
- Audit log dasar untuk create/update/delete aset.

Prioritas:

- P0 Autentikasi & role access.
- P0 Manajemen aset.
- P0 Lokasi aset.
- P0 Input manual data awal.
- P0 Audit log dasar.

---

#### Week 2: Workflow Peminjaman

Fitur:

- Staff melihat daftar aset tersedia.
- Staff mengajukan peminjaman.
- Admin approval/penolakan.
- Admin mencatat waktu pengambilan.
- Status aset otomatis menjadi Dipinjam.
- Riwayat transaksi dasar.

Prioritas:

- P0 Pengajuan peminjaman.
- P0 Approval peminjaman.
- P0 Pengambilan aset.
- P0 Riwayat peminjaman.

---

#### Week 3: Workflow Pengembalian, Stok, Notifikasi

Fitur:

- Staff mengajukan pengembalian.
- Admin memeriksa kondisi aset.
- Status aset menjadi Tersedia atau Rusak.
- Barang masuk dan barang keluar.
- Minimum stok dan notifikasi stok menipis.
- Notifikasi in-app menggunakan SSE.
- Audit log lengkap untuk transaksi.

Prioritas:

- P0 Pengembalian aset.
- P0 Barang masuk/keluar.
- P0 Notifikasi in-app.
- P0 Audit log transaksi.

---

#### Week 4: Dashboard, Laporan, Hardening, UAT

Fitur:

- Dashboard Admin dasar.
- Filter laporan berdasarkan tanggal/status.
- Export CSV/Excel untuk Admin.
- Export PDF untuk manajemen jika waktu memungkinkan.
- Testing role access.
- Testing edge cases.
- UAT dengan Admin dan Staff.
- Bug fixing.

Prioritas:

- P0 Dashboard dasar.
- P1 Export PDF.
- P1 Export Excel/CSV.
- P1 Filter laporan lengkap berdasarkan lokasi/kategori/status/tanggal.

---

### Prioritas P0

- Autentikasi dan role access.
- CRUD aset.
- Lokasi aset manual.
- Input manual data awal.
- Pengajuan peminjaman.
- Approval Admin wajib.
- Pencatatan pengambilan.
- Pengembalian dan pemeriksaan kondisi.
- Status aset otomatis.
- Riwayat peminjaman.
- Barang masuk/keluar.
- Audit log wajib.
- Notifikasi in-app dasar.
- Dashboard Admin dasar.

### Prioritas P1

- Kategori aset CRUD.
- Export PDF untuk manajemen.
- Export Excel/CSV untuk Admin.
- Filter laporan lengkap.
- Peningkatan tampilan dashboard.
- Pagination dan advanced filter audit log.

### Prioritas P2

- Integrasi WhatsApp/Telegram.
- Scan QR/barcode.
- Import Excel/CSV.
- Lampiran foto kondisi aset.
- Workflow perbaikan aset.
- Role Manajemen terpisah.
- Mobile app native.
- Integrasi ERP/accounting.

---

## 14. Catatan Konsistensi Final

Audit konsistensi internal sudah dilakukan dan seluruh keputusan ambigu sudah dikunci untuk MVP.

### 14.1 Notifikasi

- MVP menggunakan **notifikasi in-app saja**.
- WhatsApp/Telegram tetap ada di roadmap P2.

### 14.2 Model aset

- Aset bernilai tinggi memakai **kode aset unik per unit**.
- Aset stok memakai **jumlah stok** pada record yang sama.
- Ini adalah model hybrid final yang dipakai oleh agent.

### 14.3 Transaksi peminjaman

- **Satu transaksi hanya untuk satu aset**.
- Multi-aset adalah enhancement setelah MVP.

### 14.4 Aset hilang

- Aset hilang dicatat lewat barang keluar dengan alasan `Hilang`.
- Jika perlu, Admin dapat menonaktifkan aset setelah proses investigasi selesai.

### 14.5 Open question yang sudah ditutup

- Staff boleh membatalkan pengajuan sendiri hanya sebelum approval.
- Minimum stok dihitung per aset.
- Foto kondisi aset tidak wajib di MVP.
- Template laporan menggunakan format standar, bukan template khusus perusahaan.

## 15. Agent Execution Brief

Bagian ini ditulis khusus agar AI agent langsung bisa mengeksekusi tanpa perlu interpretasi tambahan.

### Aturan keras

- Jangan meminta klarifikasi untuk keputusan yang sudah dikunci di section 12 dan 14.
- Terapkan role access ketat: Admin penuh, Staff terbatas.
- Pertahankan model transaksi satu aset per transaksi.
- Gunakan in-app notification saja pada MVP.
- Semua perubahan data penting harus masuk audit log.
- Jangan menambahkan QR/barcode, WhatsApp/Telegram, mobile app native, atau integrasi ERP/accounting ke MVP.
- Jika ada konflik antara narasi umum dan keputusan final, ikuti keputusan final.

### Urutan implementasi yang disarankan

1. Auth dan role access.
2. Master aset dan lokasi.
3. Pengajuan pinjam, approval, pengambilan.
4. Pengembalian, pemeriksaan kondisi, status aset.
5. Barang masuk/keluar dan notifikasi stok menipis.
6. Riwayat, laporan, audit log, export.
7. Hardening, validation, dan edge cases.

### Output yang harus dianggap selesai

- Admin bisa mengelola aset dan lokasi.
- Staff bisa ajukan pinjam dan pengembalian.
- Approval dan pengambilan berjalan benar.
- Status aset berubah otomatis sesuai transaksi.
- Notifikasi stok menipis muncul in-app.
- Laporan dan audit log dapat dipakai tanpa penjelasan tambahan.
