// Print Invoice + Packing Slip helpers.
// Opens a new window with self-contained HTML that auto-triggers print().
// No PDF lib needed — users can "Save as PDF" via browser dialog.

import { formatRupiah } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/order-status";

type OrderItem = {
  product_name: string;
  product_image: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
  sku?: string | null;
};

type Order = {
  order_number: string;
  created_at: string;
  full_name: string;
  whatsapp: string;
  email: string | null;
  address: string;
  city: string;
  province: string;
  postal_code: string | null;
  notes: string | null;
  subtotal: number;
  shipping_cost: number;
  total: number;
  status: string;
  tracking_number: string | null;
  shipped_courier?: string | null;
  voucher_code?: string | null;
  voucher_discount?: number;
  membership_discount?: number;
  order_items: OrderItem[];
};

function escape(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const BASE_CSS = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; margin: 0; padding: 24px; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 18px; }
  .brand { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
  .tagline { font-size: 10px; color: #555; }
  .meta { text-align: right; font-size: 11px; }
  .meta .num { font-family: ui-monospace, monospace; font-size: 14px; font-weight: 700; }
  h2 { font-size: 13px; margin: 18px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { padding: 7px 6px; text-align: left; border-bottom: 1px solid #eee; vertical-align: top; }
  th { background: #f3f4f6; font-weight: 700; font-size: 11px; text-transform: uppercase; }
  td.r, th.r { text-align: right; }
  td.c, th.c { text-align: center; }
  .sku { display: inline-block; background: #f3f4f6; border: 1px solid #ddd; padding: 2px 6px; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700; border-radius: 4px; margin-right: 6px; }
  .totals { margin-top: 8px; margin-left: auto; width: 280px; }
  .totals .row { display: flex; justify-content: space-between; padding: 3px 0; }
  .totals .grand { font-size: 14px; font-weight: 800; border-top: 2px solid #111; padding-top: 6px; margin-top: 4px; }
  .col2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .box { border: 1px solid #ddd; padding: 10px; border-radius: 6px; }
  .label { font-size: 9px; text-transform: uppercase; color: #777; letter-spacing: 0.5px; }
  .note { background: #fffbea; border: 1px solid #fbe7a0; padding: 10px; border-radius: 6px; margin-top: 12px; font-size: 11px; }
  .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #888; }
  .qty-big { font-size: 14px; font-weight: 700; }
`;

function autoPrintScript() {
  return `<script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 200); });</script>`;
}

export function printInvoice(order: Order, opts?: { brandName?: string; brandTagline?: string }) {
  const brand = opts?.brandName ?? "SERBAKU";
  const tagline = opts?.brandTagline ?? "Grosir Resmi";
  const date = new Date(order.created_at).toLocaleString("id-ID");

  const rows = order.order_items
    .map(
      (it) => `
        <tr>
          <td>
            ${it.sku ? `<span class="sku">${escape(it.sku)}</span>` : ""}
            ${escape(it.product_name)}
          </td>
          <td class="c">${it.quantity} pcs</td>
          <td class="r">${formatRupiah(it.unit_price)}</td>
          <td class="r">${formatRupiah(it.subtotal)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${escape(order.order_number)}</title>
    <style>${BASE_CSS}</style></head><body>
    <div class="header">
      <div>
        <div class="brand">${escape(brand)}</div>
        <div class="tagline">${escape(tagline)}</div>
      </div>
      <div class="meta">
        <div class="label">No. Invoice</div>
        <div class="num">${escape(order.order_number)}</div>
        <div style="margin-top:4px">${escape(date)}</div>
        <div style="margin-top:4px"><b>Status:</b> ${escape(STATUS_LABEL[order.status] ?? order.status)}</div>
      </div>
    </div>

    <div class="col2">
      <div class="box">
        <div class="label">Ditagihkan ke</div>
        <div style="font-weight:700;margin-top:2px">${escape(order.full_name)}</div>
        <div>${escape(order.whatsapp)}</div>
        ${order.email ? `<div>${escape(order.email)}</div>` : ""}
        <div style="margin-top:6px">${escape(order.address)}</div>
        <div>${escape(order.city)}, ${escape(order.province)} ${escape(order.postal_code ?? "")}</div>
      </div>
      <div class="box">
        <div class="label">Pengiriman</div>
        ${order.shipped_courier ? `<div><b>Kurir:</b> ${escape(order.shipped_courier)}</div>` : ""}
        ${order.tracking_number ? `<div><b>No. Resi:</b> ${escape(order.tracking_number)}</div>` : `<div style="color:#888">Belum ada resi</div>`}
      </div>
    </div>

    <h2>Daftar Produk</h2>
    <table>
      <thead><tr><th>Produk</th><th class="c">Qty</th><th class="r">Harga</th><th class="r">Subtotal</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${formatRupiah(order.subtotal)}</span></div>
      ${
        order.voucher_discount && order.voucher_discount > 0
          ? `<div class="row"><span>Voucher ${escape(order.voucher_code ?? "")}</span><span>-${formatRupiah(order.voucher_discount)}</span></div>`
          : ""
      }
      ${
        order.membership_discount && order.membership_discount > 0
          ? `<div class="row"><span>Diskon Member</span><span>-${formatRupiah(order.membership_discount)}</span></div>`
          : ""
      }
      <div class="row"><span>Ongkir</span><span>${order.shipping_cost > 0 ? formatRupiah(order.shipping_cost) : "—"}</span></div>
      <div class="row grand"><span>TOTAL</span><span>${formatRupiah(order.total)}</span></div>
    </div>

    ${order.notes ? `<div class="note"><b>Catatan Customer:</b> ${escape(order.notes)}</div>` : ""}

    <div class="footer">Terima kasih telah berbelanja di ${escape(brand)}. Invoice ini dicetak otomatis dari sistem.</div>
    ${autoPrintScript()}
  </body></html>`;

  openPrintWindow(html);
}

export function printPackingSlip(order: Order, opts?: { brandName?: string }) {
  const brand = opts?.brandName ?? "SERBAKU";
  const date = new Date(order.created_at).toLocaleString("id-ID");
  const totalQty = order.order_items.reduce((acc, it) => acc + it.quantity, 0);

  const rows = order.order_items
    .map(
      (it) => `
        <tr>
          <td>${it.sku ? `<span class="sku">${escape(it.sku)}</span>` : ""}</td>
          <td>${escape(it.product_name)}</td>
          <td class="r qty-big">${it.quantity} pcs</td>
          <td class="c">☐</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Packing Slip ${escape(order.order_number)}</title>
    <style>${BASE_CSS}</style></head><body>
    <div class="header">
      <div>
        <div class="brand">${escape(brand)} — PACKING SLIP</div>
        <div class="tagline">Lembar pengambilan barang gudang</div>
      </div>
      <div class="meta">
        <div class="label">No. Pesanan</div>
        <div class="num">${escape(order.order_number)}</div>
        <div style="margin-top:4px">${escape(date)}</div>
      </div>
    </div>

    <div class="col2">
      <div class="box">
        <div class="label">Penerima</div>
        <div style="font-weight:700;font-size:14px;margin-top:2px">${escape(order.full_name)}</div>
        <div>${escape(order.whatsapp)}</div>
        <div style="margin-top:6px">${escape(order.address)}</div>
        <div>${escape(order.city)}, ${escape(order.province)} ${escape(order.postal_code ?? "")}</div>
      </div>
      <div class="box">
        <div class="label">Ringkasan</div>
        <div style="margin-top:2px"><b>Total Item:</b> <span class="qty-big">${totalQty} pcs</span></div>
        <div><b>Jenis Produk:</b> ${order.order_items.length}</div>
        ${order.shipped_courier ? `<div><b>Kurir:</b> ${escape(order.shipped_courier)}</div>` : ""}
      </div>
    </div>

    <h2>Item untuk Dipacking</h2>
    <table>
      <thead><tr><th style="width:90px">Kode</th><th>Produk</th><th class="r" style="width:100px">Qty</th><th class="c" style="width:50px">Cek</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    ${order.notes ? `<div class="note"><b>Catatan Customer:</b> ${escape(order.notes)}</div>` : ""}

    <div class="footer">Dipacking oleh: __________________ &nbsp;&nbsp; Dicek oleh: __________________ &nbsp;&nbsp; Tanggal: __________________</div>
    ${autoPrintScript()}
  </body></html>`;

  openPrintWindow(html);
}

function openPrintWindow(html: string) {
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) {
    alert("Pop-up diblokir. Izinkan pop-up untuk mencetak.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
