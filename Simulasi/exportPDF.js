/* =========================================================
   exportPDF.js — Generator PDF Proposal Simulasi (BCA Insurance)
   Membutuhkan: jsPDF (UMD) + jspdf-autotable (via CDN)
   Dipanggil melalui: window.exportProposalPDF(data)
   ========================================================= */
(function () {
  "use strict";

  // --- Kandidat path logo (dicoba berurutan) ---
  const LOGO_OJK_PATHS = [
    "/assets/logoOJK.png",
    "../public/assets/logoOJK.png",
    "../assets/logoOJK.png",
    "public/assets/logoOJK.png",
    "assets/logoOJK.png",
  ];
  const LOGO_BCAI_PATHS = [
    "/assets/logoBCAI.png",
    "../public/assets/logoBCAI.png",
    "../assets/logoBCAI.png",
    "public/assets/logoBCAI.png",
    "assets/logoBCAI.png",
  ];

  // --- PALET WARNA BCA INSURANCE ---
  const C = {
    biru: [0, 96, 175], // #0060AF biru BCA primer
    biruTua: [4, 60, 110], // #043C6E untuk teks/aksen gelap
    biruMuda: [40, 180, 232], // #28b4e8 aksen biru muda
    biruSoft: [232, 243, 251], // latar baris lembut (striped)
    biruSoft2: [244, 249, 253], // latar baris alternatif
    ink: [55, 65, 81], // teks utama
    muted: [120, 132, 148], // teks sekunder
    hijau: [4, 120, 87], // nett premium
    hijauBg: [235, 250, 244],
    merah: [190, 40, 55], // diskon
    garis: [222, 231, 240],
    putih: [255, 255, 255],
  };

  // ---------- HELPERS DOM ----------
  const $ = (id) => document.getElementById(id);
  const val = (id) => {
    const n = $(id);
    return n ? (n.value || "").trim() : "";
  };
  const isOn = (id) => !!($(id) && $(id).checked);

  function fmtTanggal(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
  function rupiah(n) {
    return "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(Number(n) || 0));
  }
  function num2(n) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(n) || 0);
  }

  function loadImage(paths) {
    const tryOne = (src) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            const c = document.createElement("canvas");
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            c.getContext("2d").drawImage(img, 0, 0);
            resolve({
              dataURL: c.toDataURL("image/png"),
              w: img.naturalWidth,
              h: img.naturalHeight,
            });
          } catch (_) {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = src;
      });
    return (async () => {
      for (const p of paths) {
        const r = await tryOne(p);
        if (r) return r;
      }
      return null;
    })();
  }

  // Gambar rounded rect terisi (untuk banner & kartu)
  function fillRound(doc, x, y, w, h, r, rgb) {
    doc.setFillColor(...rgb);
    doc.roundedRect(x, y, w, h, r, r, "F");
  }

  // ---------- MAIN ----------
  window.exportProposalPDF = async function (data) {
    data = data || {};
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      alert("Library jsPDF tidak termuat. Cek koneksi / urutan <script>.");
      return;
    }

    const [logoOJK, logoBCAI] = await Promise.all([
      loadImage(LOGO_OJK_PATHS),
      loadImage(LOGO_BCAI_PATHS),
    ]);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 15;
    const contentW = pageW - marginX * 2;

    // ---------- HEADER: pita biru tipis + logo ----------
    fillRound(doc, 0, 0, pageW, 3, 0, C.biru); // aksen strip atas
    let headerBottom = 12;
    const logoH = 12;
    if (logoBCAI) {
      const w = (logoBCAI.w / logoBCAI.h) * logoH;
      doc.addImage(logoBCAI.dataURL, "PNG", marginX, 8, w, logoH);
      headerBottom = Math.max(headerBottom, 8 + logoH);
    }
    if (logoOJK) {
      const w = (logoOJK.w / logoOJK.h) * logoH;
      doc.addImage(logoOJK.dataURL, "PNG", pageW - marginX - w, 8, w, logoH);
      headerBottom = Math.max(headerBottom, 8 + logoH);
    }

    let y = headerBottom + 5;
    doc.setDrawColor(...C.garis);
    doc.setLineWidth(0.3);
    doc.line(marginX, y, pageW - marginX, y);
    y += 9;

    // ---------- JUDUL ----------
    const nama = data.nama || val("nama-tertanggung") || "-";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...C.biruTua);
    doc.text("Estimasi Perhitungan Premi Asuransi", pageW / 2, y, { align: "center" });
    y += 6.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...C.biru);
    y += 9;

    // ---------- INFO TERTANGGUNG ----------
    const tsi = data.tsi || {};
    const okupasi = data.okupasi
      ? `${data.okupasi.nama}${data.okupasi.kode ? " / " + data.okupasi.kode : ""}`
      : "-";
    const pMulai = fmtTanggal(data.periodeMulai || val("periode-mulai"));
    const pAkhir = fmtTanggal(data.periodeAkhir || val("periode-akhir"));
    const periode = pMulai ? `${pMulai} s/d ${pAkhir || "-"} (1 tahun)` : "TBA (1 tahun)";

    doc.autoTable({
      startY: y,
      theme: "plain",
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9.5, cellPadding: 1.5, textColor: C.ink, lineWidth: 0 },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: "bold", textColor: C.muted },
        1: { cellWidth: 4, textColor: C.muted },
        2: { cellWidth: "auto" },
      },
      body: [
        ["Nama Tertanggung", ":", nama],
        ["Alamat Resiko", ":", data.alamat || val("alamat") || "-"],
        ["Okupasi", ":", okupasi],
        ["Periode Asuransi", ":", periode],
      ],
    });
    y = doc.lastAutoTable.finalY + 5;

    // ---------- TABEL TSI (lembut, tanpa grid kaku) ----------
    doc.autoTable({
      startY: y,
      theme: "grid",
      margin: { left: marginX, right: marginX },
      tableLineColor: C.garis,
      tableLineWidth: 0.1,
      headStyles: {
        fillColor: C.biru,
        textColor: C.putih,
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "center",
        cellPadding: 2.5,
        lineWidth: 0,
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
        textColor: C.ink,
        halign: "right",
        lineColor: C.garis,
        lineWidth: 0.1,
      },
      columnStyles: { 0: { halign: "left", textColor: C.muted } },
      head: [["TSI", "Building", "Content", "Stock", "Machine", "Total"]],
      body: [
        [
          "",
          rupiah(tsi.bangunan),
          rupiah(tsi.content),
          rupiah(tsi.stok),
          rupiah(tsi.mesin),
          rupiah(tsi.total),
        ],
      ],
      didParseCell: (hd) => {
        if (hd.section === "body" && hd.column.index === 5) {
          hd.cell.styles.fontStyle = "bold";
          hd.cell.styles.textColor = C.biruTua;
          hd.cell.styles.fillColor = C.biruSoft;
        }
      },
    });
    y = doc.lastAutoTable.finalY + 9;

    // =========================================================
    //  PERHITUNGAN
    // =========================================================
    const totalTsi = Number(tsi.total) || 0;
    const akuisisi = Number(data.akuisisi ?? getAkuisisiFromDOM()) || 0;
    const akuisisiFactor = akuisisi / 100;
    const adminFee = (neto) => (neto >= 5_000_000 ? 35_000 : 25_000);
    const cov = data.coverage || {};

    const rowsProp = [];
    const rateFlexas = Number(cov.flexas ?? parseFloat(val("rate-flexas"))) || 0;
    rowsProp.push(makeRow("FLEXAS", rateFlexas, totalTsi));
    if (isOn("toggle-rsmdcc")) rowsProp.push(makeRow("RSMDCC", pick(cov.rsmdcc, "rate-rsmdcc"), totalTsi));
    if (isOn("toggle-others")) rowsProp.push(makeRow("OTHERS", pick(cov.others, "rate-others"), totalTsi));
    if (isOn("toggle-tsfwd")) rowsProp.push(makeRow("TSFWD", pick(cov.tsfwd, "rate-tsfwd"), totalTsi));

    const eqOn = isOn("toggle-eqvet");
    const rowEqvet = eqOn ? makeRow("EQVET", pick(cov.eqvet, "rate-eqvet"), totalTsi) : null;

    const propGross = rowsProp.reduce((s, r) => s + r.premi, 0);
    const propDiskon = propGross * akuisisiFactor;
    const propNeto = propGross - propDiskon;
    const propAdmin = adminFee(propNeto);

    let eqGross = 0, eqDiskon = 0, eqNeto = 0, eqAdmin = 0;
    if (eqOn) {
      eqGross = rowEqvet.premi;
      eqDiskon = eqGross * akuisisiFactor;
      eqNeto = eqGross - eqDiskon;
      eqAdmin = adminFee(eqNeto);
    }

    const rows = eqOn ? [...rowsProp, rowEqvet] : rowsProp;
    const gross = propGross + eqGross;
    const diskon = propDiskon + eqDiskon;
    const admin = propAdmin + eqAdmin;
    const nett = propNeto + propAdmin + eqNeto + eqAdmin;

    const extraOn = isOn("toggle-rsmdcc") || isOn("toggle-others") || isOn("toggle-tsfwd");
    let judulOpsi = "FLEXAS ONLY";
    if (eqOn) judulOpsi = "PROPERTY ALL RISK & GEMPA BUMI (EQVET)";
    else if (extraOn) judulOpsi = "PROPERTY ALL RISK";

    // ---------- BANNER JUDUL OPSI (rounded, gradasi manual) ----------
    const bannerH = 9;
    fillRound(doc, marginX, y, contentW, bannerH, 2.2, C.biru);
    // aksen strip kiri biru muda
    fillRound(doc, marginX, y, 2.5, bannerH, 1.2, C.biruMuda);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...C.putih);
    doc.text(judulOpsi, marginX + 6, y + bannerH / 2 + 1.4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Opsi Coverage", pageW - marginX - 4, y + bannerH / 2 + 1.2, { align: "right" });
    y += bannerH + 1.5;

    // ---------- TABEL OPSI (striped lembut) ----------
    const body = rows.map((r) => [
      r.label,
      "Rp. " + num2(totalTsi),
      `${r.rate} ‰`,
      "Rp. " + num2(r.premi),
    ]);

    const ringkas = [
      ["GROSS PREMIUM", "", "", "Rp. " + num2(gross)],
      ["DISCOUNT", "", `${akuisisi.toFixed(1)} %`, "- Rp. " + num2(diskon)],
      ["ADMIN FEE", "", "", "Rp. " + num2(admin)],
      ["NETT PREMIUM", "", "", "Rp. " + num2(nett)],
    ];

    doc.autoTable({
      startY: y,
      theme: "plain",
      margin: { left: marginX, right: marginX },
      styles: {
        fontSize: 9,
        cellPadding: { top: 2.4, bottom: 2.4, left: 4, right: 4 },
        textColor: C.ink,
        lineWidth: 0,
      },
      headStyles: {
        fillColor: C.biruTua,
        textColor: C.putih,
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: { top: 2.2, bottom: 2.2, left: 4, right: 4 },
      },
      columnStyles: {
        0: { cellWidth: 42, fontStyle: "bold", textColor: C.biruTua },
        1: { cellWidth: 46, halign: "right" },
        2: { cellWidth: 26, halign: "center", textColor: C.muted },
        3: { halign: "right", fontStyle: "bold" },
      },
      head: [["Jaminan", "Sum Insured", "Rate", "Premi"]],
      body: [...body, ...ringkas],
      didParseCell: (hd) => {
        const rowIdx = hd.row.index;
        const isSummary = rowIdx >= body.length;

        // Zebra lembut untuk baris jaminan
        if (!isSummary && hd.section === "body") {
          hd.cell.styles.fillColor = rowIdx % 2 === 0 ? C.biruSoft2 : C.putih;
        }

        if (isSummary) {
          const label = ringkas[rowIdx - body.length][0];
          if (label === "NETT PREMIUM") {
            hd.cell.styles.fillColor = C.hijauBg;
            hd.cell.styles.textColor = C.hijau;
            hd.cell.styles.fontStyle = "bold";
            hd.cell.styles.fontSize = 10;
          } else if (label === "DISCOUNT") {
            hd.cell.styles.fillColor = C.putih;
            if (hd.column.index === 3) hd.cell.styles.textColor = C.merah;
          } else {
            hd.cell.styles.fillColor = C.biruSoft;
            hd.cell.styles.textColor = C.biruTua;
          }
        }
      },
      // Garis pemisah tipis hanya horizontal
      didDrawCell: (hd) => {
        if (hd.column.index === 0) {
          doc.setDrawColor(...C.garis);
          doc.setLineWidth(0.1);
          doc.line(hd.cell.x, hd.cell.y + hd.cell.height, marginX + contentW, hd.cell.y + hd.cell.height);
        }
      },
    });
    y = doc.lastAutoTable.finalY + 11;

    // =========================================================
    //  HALAMAN 2: CATATAN & DETAIL COVERAGE
    // =========================================================
    doc.addPage();
    fillRound(doc, 0, 0, pageW, 3, 0, C.biru);
    y = 16;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...C.biruTua);
    doc.text("Catatan", marginX, y);
    y += 5.5;

        // Hitung masa berlaku: 14 hari dari tanggal cetak
    const tglBerlaku = new Date();
    tglBerlaku.setDate(tglBerlaku.getDate() + 14);
    const tglBerlakuStr = tglBerlaku.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const notes = [
      "Perhitungan premi di atas merupakan estimasi perhitungan dengan kondisi penggunaan bangunan digunakan sebagai Okupasi yang disebutkan di atas, tidak ada okupasi dengan resiko yang lebih tinggi di sekitarnya.",
      "Tidak ada proses pembangunan, renovasi, hot work dan instalasi pada bangunan.",
      "Lokasi bebas banjir.",
      "Rate dan T&C dapat berubah sesuai dengan hasil akseptasi dari Analis kami.",
      `Estimasi perhitungan ini berlaku selama 14 (empat belas) hari sejak tanggal cetak, yaitu sampai dengan ${tglBerlakuStr}.`,
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.ink);
    const noteW = contentW - 5;
    notes.forEach((n) => {
      // bullet biru muda
      doc.setFillColor(...C.biruMuda);
      doc.circle(marginX + 1.2, y - 1.2, 0.8, "F");
      const lines = doc.splitTextToSize(n, noteW);
      doc.text(lines, marginX + 4, y);
      y += lines.length * 4 + 2;
    });
    y += 4;

    // DETAIL COVERAGE
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...C.biruTua);
    doc.text("Detail Coverage", marginX, y);
    y += 3;

    doc.autoTable({
      startY: y,
      theme: "plain",
      margin: { left: marginX, right: marginX },
      headStyles: {
        fillColor: C.biru,
        textColor: C.putih,
        fontSize: 9,
        fontStyle: "bold",
        cellPadding: 2.5,
      },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: C.ink, valign: "top", lineWidth: 0 },
      columnStyles: { 0: { cellWidth: 48, fontStyle: "bold", textColor: C.biruTua } },
      head: [["Jaminan", "Cakupan Risiko"]],
      body: [
        ["FLEXAS (Kebakaran)", "Fire, Lightning, Explosion, Falling of Aircraft, and Smoke"],
        ["TSFWD (Banjir)", "Typhoon, Storm, Flood, and Water Damage"],
        ["RSMDCC (Kerusuhan)", "Riot, Strike, Malicious Damage and Civil Commotion"],
        ["Other Losses", "Impact by Own Vehicle"],
        ["EQVET (Gempa Bumi)", "Earthquake, Volcanic Eruption, and Tsunami"],
      ],
      didParseCell: (hd) => {
        if (hd.section === "body") {
          hd.cell.styles.fillColor = hd.row.index % 2 === 0 ? C.biruSoft2 : C.putih;
        }
      },
    });
    y = doc.lastAutoTable.finalY + 9;

    // PENGECUALIAN UMUM (kotak lembut)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...C.biruTua);
    doc.text("Pengecualian Umum", marginX, y);
    y += 4;

    const excl =
      "Perang, invasi, tindakan musuh asing, perang saudara, pembangkitan militer, nuklir, pemberontakan, revolusi, radioaktif, pemuaian, terorisme, penghentian pekerjaan total/parsial, tindakan yang disengaja / kelalaian tertanggung.";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.ink);
    const exclLines = doc.splitTextToSize(excl, contentW - 8);
    const boxH = exclLines.length * 3.8 + 6;
    fillRound(doc, marginX, y, contentW, boxH, 2, C.biruSoft2);
    doc.text(exclLines, marginX + 4, y + 5);

    // ---------- FOOTER SEMUA HALAMAN ----------
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      // garis footer
      doc.setDrawColor(...C.garis);
      doc.setLineWidth(0.2);
      doc.line(marginX, pageH - 12, pageW - marginX, pageH - 12);
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      const stamp = new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      doc.text(`Dicetak: ${stamp}`, marginX, pageH - 8);
      doc.setTextColor(...C.biru);
      doc.text("PT Asuransi Umum BCA", pageW / 2, pageH - 8, { align: "center" });
      doc.setTextColor(...C.muted);
      doc.text(`Halaman ${i} dari ${totalPages}`, pageW - marginX, pageH - 8, { align: "right" });
    }

    // ---------- SIMPAN ----------
    const safeNama = nama.replace(/[\/\\:*?"<>|]/g, "").trim() || "Tertanggung";
    doc.save(`Simulasi Premi a.n. ${safeNama}.pdf`);
  };

  // ---------- HELPERS PERHITUNGAN ----------
  function makeRow(label, rate, tsi) {
    const r = Number(rate) || 0;
    return { label, rate: r, premi: (Number(tsi) || 0) * (r / 1000) };
  }
  function pick(fromData, domId) {
    if (fromData != null) return Number(fromData) || 0;
    return parseFloat(val(domId)) || 0;
  }
  function getAkuisisiFromDOM() {
    const v = parseFloat(val("akuisisi"));
    return isNaN(v) ? 0 : v;
  }
})();
