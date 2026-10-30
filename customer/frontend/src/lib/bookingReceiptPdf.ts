import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';

export type ElectronicTicket = {
  code: string;
  seat: string;
  seatType: string;
  price: number;
  status: string;
  issuedAt: string;
  checkedInAt: string | null;
  qrPayload: string;
};

export type BookingDetail = {
  id: number;
  code: string;
  status: string;
  total_amount: number;
  created_at: string;
  ticket_price: number;
  movie_title: string;
  poster_url: string | null;
  age_rating: string;
  format: string;
  duration_minutes: number;
  starts_at: string;
  ends_at: string;
  screen_name: string;
  theater_name: string;
  theater_address: string;
  city: string;
  seats: Array<{ label: string; row: string; number: number; type: string; price: number }>;
  seats_display: string;
  tickets: ElectronicTicket[];
  customer?: { fullName: string; email: string; phone: string };
  receipt?: { documentCode: string; generatedAt: string; currency: string; dataSource: string };
  order: null | {
    id: number;
    code: string;
    channel: string;
    subtotal: number;
    discountAmount: number;
    voucherCode: string | null;
    totalAmount: number;
    paymentMethod: string;
    amountReceived: number;
    status: string;
    createdAt: string;
  };
  payments: Array<{ method: string; amount: number; referenceCode: string; createdAt: string }>;
  concessions: Array<{ type?: string; code: string; name: string; quantity: number; unitPrice: number; total: number }>;
};

export type BookingReceiptResult = 'downloaded' | 'shared' | 'cancelled';

const NAVY = '#0d1b2e';
const BLUE = '#173f68';
const GOLD = '#e7ac2d';
const TEXT = '#20364d';
const MUTED = '#718398';
const BORDER = '#dce5ee';
const PALE = '#f5f8fb';

function money(value: number | string | null | undefined) {
  return `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} đ`;
}

function dateTime(value: string | null | undefined) {
  if (!value) return '---';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false,
  }).format(date);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PAID: 'Đã thanh toán', PENDING: 'Chờ thanh toán', CANCELLED: 'Đã hủy', EXPIRED: 'Đã hết hạn',
    VALID: 'Sẵn sàng sử dụng', USED: 'Đã soát vé',
  };
  return labels[status] || status || '---';
}

function channelLabel(channel?: string) {
  return channel === 'POS' ? 'Mua trực tiếp tại quầy' : channel === 'ONLINE' ? 'Website Aurora' : channel || '---';
}

function paymentLabel(method?: string) {
  const labels: Record<string, string> = {
    CASH: 'Tiền mặt', CARD: 'Thẻ ngân hàng', TRANSFER: 'Chuyển khoản', QR_VNPAY: 'VNPAY QR',
  };
  return method ? labels[method] || method : '---';
}

function safeFilePart(value: string) {
  return value.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'order';
}

function labelValue(label: string, value: string, options: { accent?: boolean } = {}): TableCell {
  return {
    stack: [
      { text: label.toUpperCase(), color: MUTED, fontSize: 7, bold: true, characterSpacing: 0.6 },
      { text: value || '---', color: options.accent ? GOLD : TEXT, fontSize: options.accent ? 12 : 9, bold: true, margin: [0, 4, 0, 0] },
    ],
    margin: [8, 7, 8, 7],
    fillColor: '#ffffff',
  };
}

function sectionTitle(title: string, note?: string): Content {
  return {
    columns: [
      { text: title, color: NAVY, fontSize: 12, bold: true },
      { text: note || '', color: MUTED, fontSize: 7.5, alignment: 'right', margin: [0, 3, 0, 0] },
    ],
    margin: [0, 9, 0, 5],
  };
}

function ticketCard(ticket: ElectronicTicket): Content {
  return {
    unbreakable: true,
    margin: [0, 0, 0, 6],
    table: {
      widths: ['*', 112],
      body: [[
        {
          stack: [
            { text: 'AURORA CINEMA - VÉ ĐIỆN TỬ', color: GOLD, fontSize: 7.5, bold: true, characterSpacing: 1 },
            {
              columns: [
                { stack: [{ text: 'GHẾ', color: MUTED, fontSize: 7 }, { text: ticket.seat, color: NAVY, fontSize: 27, bold: true }] },
                { stack: [{ text: 'TRẠNG THÁI', color: MUTED, fontSize: 7 }, { text: statusLabel(ticket.status), color: ticket.status === 'VALID' ? '#167254' : MUTED, fontSize: 9, bold: true, margin: [0, 5, 0, 0] }], alignment: 'right' },
              ],
              margin: [0, 10, 0, 9],
            },
            {
              table: {
                widths: ['*', '*'],
                body: [
                  [labelValue('Mã vé', ticket.code), labelValue('Loại ghế', ticket.seatType)],
                  [labelValue('Giá vé', money(ticket.price)), labelValue('Phát hành', dateTime(ticket.issuedAt))],
                ],
              },
              layout: { hLineColor: () => BORDER, vLineColor: () => BORDER, hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
            },
          ],
          margin: [10, 8, 10, 8],
        },
        {
          stack: [
            { qr: ticket.qrPayload, fit: 88, foreground: NAVY, background: '#ffffff', alignment: 'center' },
            { text: 'Quét mã tại cổng soát vé', color: MUTED, fontSize: 7, alignment: 'center', margin: [0, 6, 0, 0] },
          ],
          margin: [9, 9, 9, 7],
          fillColor: PALE,
        },
      ]],
    },
    layout: {
      hLineColor: () => BORDER, vLineColor: () => BORDER,
      hLineWidth: () => 0.8, vLineWidth: () => 0.8,
      paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
    },
  };
}

export function buildBookingReceiptDocument(detail: BookingDetail): TDocumentDefinitions {
  const orderCode = detail.order?.code || detail.code;
  const generatedAt = detail.receipt?.generatedAt || new Date().toISOString();
  const paymentMethod = paymentLabel(detail.order?.paymentMethod || detail.payments[0]?.method);
  const ticketTotal = detail.tickets.reduce((sum, ticket) => sum + Number(ticket.price || 0), 0);
  const concessionTotal = detail.concessions.reduce((sum, item) => sum + Number(item.total || 0), 0);

  const content: Content[] = [
    {
      table: {
        widths: ['*', 145],
        body: [[
          {
            stack: [
              { text: 'AURORA CINEMA', color: GOLD, fontSize: 10, bold: true, characterSpacing: 1.8 },
              { text: 'VÉ ĐIỆN TỬ & XÁC NHẬN ĐƠN HÀNG', color: '#ffffff', fontSize: 18, bold: true, margin: [0, 7, 0, 5] },
              { text: 'Vui lòng xuất trình từng mã QR tại cổng soát vé.', color: '#c9d7e6', fontSize: 8.5 },
            ],
            margin: [15, 11, 11, 11],
            fillColor: NAVY,
          },
          {
            stack: [
              { text: 'MÃ ĐẶT VÉ', color: '#a9bdd1', fontSize: 7, bold: true },
              { text: detail.code, color: GOLD, fontSize: 12, bold: true, margin: [0, 4, 0, 9] },
              { text: `Lập lúc ${dateTime(generatedAt)}`, color: '#c9d7e6', fontSize: 7.5 },
            ],
            margin: [11, 13, 11, 11],
            fillColor: BLUE,
          },
        ]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 9],
    },
    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: `${detail.age_rating || 'P'}  •  ${detail.format || '2D'}  •  ${detail.duration_minutes} phút`, color: GOLD, fontSize: 8, bold: true },
            { text: detail.movie_title, color: '#ffffff', fontSize: 20, bold: true, margin: [0, 6, 0, 10] },
            {
              columns: [
                { width: '*', stack: [{ text: 'SUẤT CHIẾU', color: '#91a7bc', fontSize: 7, bold: true }, { text: dateTime(detail.starts_at), color: '#ffffff', fontSize: 10, bold: true, margin: [0, 3, 0, 0] }] },
                { width: '*', stack: [{ text: 'RẠP / PHÒNG', color: '#91a7bc', fontSize: 7, bold: true }, { text: `${detail.theater_name} / ${detail.screen_name}`, color: '#ffffff', fontSize: 10, bold: true, margin: [0, 3, 0, 0] }] },
                { width: 105, stack: [{ text: 'TRẠNG THÁI', color: '#91a7bc', fontSize: 7, bold: true }, { text: statusLabel(detail.status), color: '#baf3d8', fontSize: 9, bold: true, margin: [0, 3, 0, 0] }] },
              ],
            },
            { text: `${detail.theater_address}${detail.city ? ` • ${detail.city}` : ''}`, color: '#a9bbcd', fontSize: 8, margin: [0, 9, 0, 0] },
          ],
          margin: [15, 10, 15, 10],
          fillColor: '#123151',
        }]],
      },
      layout: 'noBorders',
    },
    sectionTitle('Thông tin đơn hàng', `Nguồn dữ liệu: ${detail.receipt?.dataSource || 'aurora_db'}`),
    {
      table: {
        widths: ['*', '*', '*'],
        body: [
          [labelValue('Mã đơn hàng', orderCode, { accent: true }), labelValue('Kênh bán', channelLabel(detail.order?.channel)), labelValue('Phương thức', paymentMethod)],
          [labelValue('Người đặt', detail.customer?.fullName || 'Khách hàng Aurora'), labelValue('Email', detail.customer?.email || '---'), labelValue('Số điện thoại', detail.customer?.phone || '---')],
          [labelValue('Ngày đặt', dateTime(detail.order?.createdAt || detail.created_at)), labelValue('Ghế', detail.seats_display || detail.tickets.map(item => item.seat).join(', ')), labelValue('Tổng thanh toán', money(detail.total_amount), { accent: true })],
        ],
      },
      layout: { hLineColor: () => BORDER, vLineColor: () => BORDER, hLineWidth: () => 0.7, vLineWidth: () => 0.7 },
    },
    sectionTitle('Vé của bạn', `${detail.tickets.length} vé điện tử - Mỗi ghế có một QR riêng`),
    ...detail.tickets.map(ticketCard),
    sectionTitle('Chi tiết thanh toán'),
    {
      columns: [
        {
          width: '*',
          table: {
            widths: ['*', 95],
            body: [
              [{ text: 'NỘI DUNG', style: 'tableHead' }, { text: 'THÀNH TIỀN', style: 'tableHead', alignment: 'right' }],
              [{ text: `${detail.tickets.length} vé xem phim`, style: 'tableText' }, { text: money(ticketTotal), style: 'tableText', alignment: 'right' }],
              ...detail.concessions.map(item => ([
                { text: `${item.name}  × ${item.quantity}`, style: 'tableText' },
                { text: money(item.total), style: 'tableText', alignment: 'right' },
              ] as TableCell[])),
              ...(detail.concessions.length ? [] : [[{ text: 'Không có bắp nước / hàng hóa', color: MUTED, fontSize: 8 }, { text: money(concessionTotal), color: MUTED, fontSize: 8, alignment: 'right' }]] as TableCell[][]),
              [{ text: 'Tạm tính', bold: true, color: TEXT, fontSize: 8.5 }, { text: money(detail.order?.subtotal ?? ticketTotal + concessionTotal), bold: true, color: TEXT, fontSize: 8.5, alignment: 'right' }],
              [{ text: `Giảm giá${detail.order?.voucherCode ? ` (${detail.order.voucherCode})` : ''}`, color: MUTED, fontSize: 8.5 }, { text: `- ${money(detail.order?.discountAmount || 0)}`, color: MUTED, fontSize: 8.5, alignment: 'right' }],
              [{ text: 'TỔNG THANH TOÁN', color: NAVY, bold: true, fontSize: 10, fillColor: '#fff7df', margin: [5, 6, 5, 6] }, { text: money(detail.total_amount), color: GOLD, bold: true, fontSize: 12, alignment: 'right', fillColor: '#fff7df', margin: [5, 5, 5, 5] }],
            ],
          },
          layout: { hLineColor: () => BORDER, vLineColor: () => BORDER, hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
        },
        {
          width: 168,
          margin: [10, 0, 0, 0],
          stack: [
            { text: 'ĐỐI SOÁT THANH TOÁN', color: NAVY, fontSize: 8, bold: true, margin: [0, 0, 0, 8] },
            ...((detail.payments.length ? detail.payments : [{ method: detail.order?.paymentMethod || '', amount: detail.total_amount, referenceCode: orderCode, createdAt: detail.order?.createdAt || detail.created_at }]).map(payment => ({
              stack: [
                { text: paymentLabel(payment.method), color: TEXT, fontSize: 9, bold: true },
                { text: money(payment.amount), color: GOLD, fontSize: 11, bold: true, margin: [0, 3, 0, 4] },
                { text: payment.referenceCode || orderCode, color: MUTED, fontSize: 7.2 },
                { text: dateTime(payment.createdAt), color: MUTED, fontSize: 7.2, margin: [0, 2, 0, 0] },
              ],
              margin: [9, 8, 9, 8],
              fillColor: PALE,
            } as Content))),
          ],
        },
      ],
    },
    {
      text: 'BẢO MẬT VÉ: Mỗi QR chỉ dùng cho một ghế và được soát một lần. Không chia sẻ file hoặc ảnh QR với người khác.',
      color: MUTED,
      fontSize: 7.3,
      bold: true,
      margin: [0, 7, 0, 0],
    },
  ];

  return {
    pageSize: 'A4',
    pageMargins: [30, 24, 30, 32],
    info: {
      title: `Vé điện tử Aurora - ${detail.code}`,
      author: 'Aurora Cinema',
      subject: `Chi tiết đơn hàng ${orderCode}`,
      keywords: 'Aurora Cinema, vé điện tử, đơn hàng',
    },
    content,
    defaultStyle: { font: 'Roboto', color: TEXT, fontSize: 9 },
    styles: {
      tableHead: { color: '#ffffff', fillColor: BLUE, bold: true, fontSize: 7.5, margin: [5, 5, 5, 5] },
      tableText: { color: TEXT, fontSize: 8.5, margin: [5, 4, 5, 4] },
    },
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: 'Aurora Cinema • Vé điện tử được tạo từ aurora_db', color: MUTED, fontSize: 7 },
        { text: `Trang ${currentPage}/${pageCount}`, color: MUTED, fontSize: 7, alignment: 'right' },
      ],
      margin: [30, 8, 30, 0],
    }),
  };
}

export async function saveBookingReceiptPdf(detail: BookingDetail): Promise<BookingReceiptResult> {
  const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  pdfMake.addVirtualFileSystem(pdfFonts);
  const fileName = `Aurora-${safeFilePart(detail.order?.code || detail.code)}.pdf`;
  const blob = await pdfMake.createPdf(buildBookingReceiptDocument(detail)).getBlob();
  const file = new File([blob], fileName, { type: 'application/pdf' });
  const sharePayload: ShareData = {
    files: [file],
    title: `Vé điện tử Aurora - ${detail.movie_title}`,
    text: `Đơn hàng ${detail.order?.code || detail.code}`,
  };
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches;

  if (coarsePointer && navigator.share && (!navigator.canShare || navigator.canShare(sharePayload))) {
    try {
      await navigator.share(sharePayload);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Fall through to a direct download if file sharing is unavailable.
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return 'downloaded';
}
