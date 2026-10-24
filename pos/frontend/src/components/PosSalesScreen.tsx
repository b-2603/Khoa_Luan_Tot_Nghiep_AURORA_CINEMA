import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Armchair, Banknote, CalendarDays, Check, ChevronDown, ChevronRight, CircleDollarSign, Clock3, Coffee,
  CreditCard, Film, Gift, ImageIcon, LoaderCircle, LockKeyhole, Minus, Package, Plus, Printer, QrCode, RotateCcw, Search, ShoppingCart, Ticket, Trash2, UserCheck,
} from 'lucide-react';
import type { PosUser } from '../App';

const API_URL = 'http://localhost/AURORA%20CINEMA/pos/backend/public/api.php';

type Showtime = {
  id: number;
  movie_id: number;
  movie_title: string;
  age_rating: string;
  format: string;
  screen_name: string;
  theater_name: string;
  starts_at: string;
  ticket_price: number;
  ends_at?: string;
  total_seats: number;
  booked_seats: number;
  available_seats: number;
  default_ticket_type_id: number;
  ticket_options: TicketOption[];
};

type MovieCatalog = {
  id: number;
  title: string;
  age_rating: string;
  format: string;
  showtime_count: number;
  first_showtime: string;
  last_showtime: string;
  available_seats: number;
};

type Seat = { id: number; row: string; number: number; type: string; available: boolean };
type SeatLayout = { version:number; columns:number; aisle_after:number; rows:Array<{row:string;seat_count:number;seat_type:string}> };
type TicketOption = { id:number; code:string; name:string; description?:string; price:number };
type Combo = { id:number; code:string; name:string; description?:string; unit?:string; image_url?:string; price:number; member_price:number; category:string; sales_area?:'concession'|'merchandise'; stock_quantity:number; reorder_level?:number };
type Member = { id:number; full_name:string; phone?:string; email?:string; card_number?:string };
type ReceiptItem = {code:string;name:string;quantity:number;unit?:string;unit_price:number;line_total:number};
type Receipt = { code: string; total: number; subtotal?:number; discount?:number; amount_received: number; change: number; payment_method: string; items?:ReceiptItem[]; cashier_name?:string; counter?:string; theater_name?:string; created_at?:string };
type SalesWorkspace = 'box_ticket'|'concession'|'merchandise';
type TicketFlowStep = 'movies'|'seats'|'ticket_types'|'order';

const money = (value: number) => `${Math.round(value).toLocaleString('vi-VN')} đ`;
const time = (value: string) => new Date(value.replace(' ', 'T')).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const dateLabel = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });

export default function PosSalesScreen({
  user,
  cinemaName = 'AURORA CINEMA',
  staffName = 'Nguyễn Trần Thái Bảo',
  counter = 'AURORA BOX 02',
  onBackToDashboard,
  onSessionExpired,
}: {
  user?: PosUser;
  cinemaName?: string;
  staffName?: string;
  counter?: string;
  onBackToDashboard: () => void;
  onSessionExpired: (message?: string) => void;
}) {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [movies, setMovies] = useState<MovieCatalog[]>([]);
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [ticketFlowStep, setTicketFlowStep] = useState<TicketFlowStep>('movies');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatLayout,setSeatLayout]=useState<SeatLayout>({version:1,columns:12,aisle_after:6,rows:[]});
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [seatTicketTypes,setSeatTicketTypes]=useState<Record<number,number>>({});
  const [ticketOptions,setTicketOptions]=useState<TicketOption[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [comboQuantities, setComboQuantities] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [workspace,setWorkspace]=useState<SalesWorkspace>(user?.capabilities?.sell_tickets?'box_ticket':user?.capabilities?.sell_concessions?'concession':'merchandise');
  const [ticketMode,setTicketMode]=useState<'sales'|'redeem'>('sales');
  const [bookingCode,setBookingCode]=useState('');
  const [booking,setBooking]=useState<Record<string,unknown>|null>(null);
  const [memberQuery,setMemberQuery]=useState('');
  const [memberResults,setMemberResults]=useState<Member[]>([]);
  const [selectedMember,setSelectedMember]=useState<Member|null>(null);
  const [productSearch,setProductSearch]=useState('');
  const [productCategory,setProductCategory]=useState('all');
  const [seatHoldExpiresAt,setSeatHoldExpiresAt]=useState('');
  const seatHoldQueue=useRef<Promise<void>>(Promise.resolve());

  async function readApiResponse(response: Response) {
    const result = await response.json();
    if (response.status === 401 || result.code === 'SHIFT_AUTHORIZATION_REQUIRED') onSessionExpired(result.message);
    return result;
  }

  async function loadCatalog(date = '',area:SalesWorkspace=workspace) {
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API_URL}?action=sales_catalog&area=${area}${date ? `&date=${date}` : ''}`, { credentials: 'include' });
      const result = await readApiResponse(response);
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải dữ liệu bán hàng.');
      const data = result.data;
      if(area==='box_ticket'){
        setDates(data.dates || []);setSelectedDate(data.selected_date || date || '');setMovies(data.movies || []);setShowtimes(data.showtimes || []);
        setSelectedShowtime(current=>current&&(data.showtimes||[]).some((item:Showtime)=>item.id===current.id)?current:null);
      }
      setCombos(current=>{const merged=new Map<string,Combo>();current.forEach(product=>{if((comboQuantities[product.code]||0)>0)merged.set(product.code,product)});(data.combos||[]).forEach((product:Combo)=>merged.set(product.code,product));return Array.from(merged.values())});
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Không thể tải dữ liệu bán hàng.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadCatalog('',workspace); }, [workspace]);

  useEffect(() => {
    if (!selectedShowtime) { setSeats([]); setSelectedSeats([]); setSeatTicketTypes({});setTicketOptions([]);return; }
    setLoadingSeats(true); setSelectedSeats([]);setSeatTicketTypes({});setError('');
    fetch(`${API_URL}?action=sales_seats&showtime_id=${selectedShowtime.id}`, { credentials: 'include' })
      .then(async response => { const result = await readApiResponse(response); if (!response.ok || !result.success) throw new Error(result.message); return result.data; })
      .then(data=>{setSeats(data.seats as Seat[]);setSeatLayout(data.layout||{version:1,columns:12,aisle_after:6,rows:[]});setTicketOptions(data.ticket_options||selectedShowtime.ticket_options||[]);})
      .catch(requestError => setError(requestError instanceof Error ? requestError.message : 'Không thể tải sơ đồ ghế.'))
      .finally(() => setLoadingSeats(false));
  }, [selectedShowtime]);

  useEffect(()=>{if(!selectedShowtime||selectedSeats.length===0)return;const timer=window.setInterval(()=>syncSeatHold(selectedShowtime.id,selectedSeats),4*60*1000);return()=>window.clearInterval(timer)},[selectedShowtime,selectedSeats]);

  const visibleMovies = useMemo(() => movies.filter(item => item.title.toLowerCase().includes(search.trim().toLowerCase())), [movies, search]);
  const movieShowtimes = useMemo(() => showtimes.filter(item => item.movie_id === selectedMovieId), [selectedMovieId, showtimes]);
  const seatRows = useMemo(() => {
    const grouped = new Map<string, Seat[]>();
    seats.forEach(seat => {
      const rowSeats = grouped.get(seat.row) || [];
      rowSeats.push(seat);
      grouped.set(seat.row, rowSeats);
    });
    return Array.from(grouped.entries()).map(([row, rowSeats]) => [row, rowSeats.sort((a, b) => a.number - b.number)] as const);
  }, [seats]);
  const selectedSeatObjects = seats.filter(seat => selectedSeats.includes(seat.id));
  const defaultTicket=ticketOptions.find(option=>option.id===selectedShowtime?.default_ticket_type_id)||ticketOptions.find(option=>option.code==='TICKET_REGULAR')||ticketOptions.find(option=>option.code!=='TICKET_COUPLE');
  const coupleTicket=ticketOptions.find(option=>option.code==='TICKET_COUPLE');
  const ticketForSeat=(seat:Seat)=>seat.type==='COUPLE'&&coupleTicket?coupleTicket:ticketOptions.find(option=>option.id===seatTicketTypes[seat.id])||defaultTicket;
  // Giá trong tms_showtime_ticket_types là giá bán cuối cùng do TMS ban hành.
  // Loại ghế chỉ dùng để trình bày và kiểm tra vé ghế đôi, không cộng thêm phụ thu tại frontend.
  const seatPriceForOption=(_seat:Seat,ticket?:TicketOption)=>Number(ticket?.price||0);
  const seatPrice=(seat:Seat)=>seatPriceForOption(seat,ticketForSeat(seat));
  const ticketTotal = selectedSeatObjects.reduce((sum, seat) => sum + seatPrice(seat), 0);
  const productPrice=(combo:Combo)=>selectedMember?Number(combo.member_price):Number(combo.price);
  const comboSubtotal = combos.reduce((sum, combo) => sum + combo.price * (comboQuantities[combo.code] || 0), 0);
  const comboTotal = combos.reduce((sum, combo) => sum + productPrice(combo) * (comboQuantities[combo.code] || 0), 0);
  const memberDiscount=comboSubtotal-comboTotal;
  const total = ticketTotal + comboTotal;
  const received = paymentMethod === 'CASH' ? Number(amountReceived || 0) : total;
  const change = Math.max(0, received - total);
  const productCategories=useMemo(()=>Array.from(new Set(combos.map(product=>product.category))).sort(),[combos]);
  const visibleProducts=useMemo(()=>combos.filter(product=>(productCategory==='all'||product.category===productCategory)&&(`${product.name} ${product.code} ${product.category}`).toLowerCase().includes(productSearch.trim().toLowerCase())),[combos,productCategory,productSearch]);
  const cartProducts=useMemo(()=>combos.filter(product=>(comboQuantities[product.code]||0)>0),[combos,comboQuantities]);
  const cartCount=cartProducts.reduce((sum,product)=>sum+(comboQuantities[product.code]||0),0);
  const unifiedCartCount=selectedSeats.length+cartCount;
  const cashSuggestions=useMemo(()=>{if(total<=0)return[];const values=[total,Math.ceil(total/10000)*10000,Math.ceil(total/50000)*50000,Math.ceil(total/100000)*100000];return Array.from(new Set(values)).slice(0,4)},[total]);

  function syncSeatHold(showtimeId:number,seatIds:number[]){
    seatHoldQueue.current=seatHoldQueue.current.then(async()=>{const response=await fetch(`${API_URL}?action=sales_seat_hold`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({showtime_id:showtimeId,seat_ids:seatIds})});const result=await readApiResponse(response);if(!response.ok||!result.success)throw new Error(result.message||'Không thể giữ ghế.');setSeatHoldExpiresAt(result.data?.expires_at||'')}).catch(requestError=>{setError(requestError instanceof Error?requestError.message:'Không thể giữ ghế trong aurora_db.')});
  }

  function toggleSeat(seat: Seat) {
    if (!seat.available||!selectedShowtime) return;
    setSelectedSeats(current => {let next=current;if(current.includes(seat.id)){setSeatTicketTypes(types=>{const nextTypes={...types};delete nextTypes[seat.id];return nextTypes});next=current.filter(id => id !== seat.id)}else if(current.length<12){const initialType=seat.type==='COUPLE'&&coupleTicket?coupleTicket.id:defaultTicket?.id||0;setSeatTicketTypes(types=>({...types,[seat.id]:initialType}));next=[...current,seat.id]}syncSeatHold(selectedShowtime.id,next);return next});
  }

  function clearOrder() { if(selectedShowtime)syncSeatHold(selectedShowtime.id,[]);setSelectedMovieId(null);setSelectedShowtime(null);setTicketFlowStep('movies');setSelectedSeats([]);setSeatTicketTypes({});setComboQuantities({});setAmountReceived('');setPaymentOpen(false);setReceipt(null);setError('');setSelectedMember(null);setMemberQuery('');setMemberResults([]);setSeatHoldExpiresAt(''); }

  function chooseMovie(movieId:number){
    if(selectedShowtime)syncSeatHold(selectedShowtime.id,[]);setSelectedMovieId(movieId);setSelectedShowtime(null);setSelectedSeats([]);setSeatTicketTypes({});setSeatHoldExpiresAt('');setTicketFlowStep('movies');setError('');
  }

  function chooseShowtime(showtime:Showtime){
    if(selectedShowtime&&selectedShowtime.id!==showtime.id)syncSeatHold(selectedShowtime.id,[]);setSelectedShowtime(showtime);setSelectedSeats([]);setSeatTicketTypes({});setSeatHoldExpiresAt('');setTicketFlowStep('seats');setError('');
  }

  function confirmSeats(){
    if(selectedSeats.length===0){setError('Vui lòng chọn ít nhất một ghế trước khi tiếp tục.');return;}
    setTicketFlowStep('ticket_types');setError('');
  }

  function finishTicketTypes(){
    if(selectedSeatObjects.some(seat=>!ticketForSeat(seat))){setError('Vui lòng chọn loại vé cho tất cả ghế.');return;}
    setTicketFlowStep('order');setError('');
  }

  async function lookupMember(){if(memberQuery.trim().length<3)return;setSubmitting(true);setError('');try{const response=await fetch(`${API_URL}?action=member_lookup&q=${encodeURIComponent(memberQuery.trim())}`,{credentials:'include'});const result=await readApiResponse(response);if(!response.ok||!result.success)throw new Error(result.message);setMemberResults(result.data||[]);if(!(result.data||[]).length)setError('Không tìm thấy thành viên Aurora phù hợp.');}catch(requestError){setError(requestError instanceof Error?requestError.message:'Không thể tra cứu thành viên.');}finally{setSubmitting(false)}}

  async function submitOrder() {
    if (ticketFlowStep !== 'order') { setError('Vui lòng hoàn tất chọn ghế và loại vé trước khi thanh toán.'); return; }
    if (!selectedShowtime || selectedSeats.length === 0) { setError('Vui lòng chọn suất chiếu và ít nhất một ghế.'); return; }
    if (paymentMethod === 'CASH' && received < total) { setError('Số tiền khách đưa chưa đủ.'); return; }
    setSubmitting(true); setError('');
    try {
      await seatHoldQueue.current;
      const response = await fetch(`${API_URL}?action=sales_order`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ showtime_id: selectedShowtime.id, seat_ids: selectedSeats, tickets:selectedSeatObjects.map(seat=>({seat_id:seat.id,ticket_type_id:ticketForSeat(seat)?.id||0})),combos: Object.entries(comboQuantities).filter(([, quantity]) => quantity > 0).map(([code, quantity]) => ({ code, quantity })), customer_id:selectedMember?.id||null, payment_method: paymentMethod, amount_received: received }) });
      const result = await readApiResponse(response);
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể hoàn tất giao dịch.');
      setReceipt(result.data);setPaymentOpen(false);setSelectedSeats([]);setSeatTicketTypes({});setComboQuantities({});setAmountReceived('');
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Không thể hoàn tất giao dịch.'); }
    finally { setSubmitting(false); }
  }

  async function submitProductOrder(){
    if(total<=0){setError('Vui lòng chọn ít nhất một sản phẩm.');return;}if(paymentMethod==='CASH'&&received<total){setError('Số tiền khách đưa chưa đủ.');return;}setSubmitting(true);setError('');
    try{const response=await fetch(`${API_URL}?action=product_order`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({sales_area:workspace,items:Object.entries(comboQuantities).filter(([,q])=>q>0).map(([code,quantity])=>({code,quantity})),customer_id:selectedMember?.id||null,payment_method:paymentMethod,amount_received:received})});const result=await readApiResponse(response);if(!response.ok||!result.success)throw new Error(result.message);setReceipt(result.data);setPaymentOpen(false);setComboQuantities({});setAmountReceived('');await loadCatalog(selectedDate,workspace);}catch(requestError){setError(requestError instanceof Error?requestError.message:'Không thể hoàn tất đơn hàng.');}finally{setSubmitting(false);}
  }

  async function submitCurrentOrder(){if(selectedSeats.length>0){await submitOrder();return;}await submitProductOrder()}

  function openPayment(){
    if(selectedSeats.length>0&&ticketFlowStep!=='order'){setWorkspace('box_ticket');setError('Vui lòng hoàn tất loại vé trước khi thanh toán.');return;}
    if(total<=0){setError('Giỏ hàng chưa có sản phẩm để thanh toán.');return;}
    setError('');setPaymentOpen(true);
  }

  async function lookupBooking(){setSubmitting(true);setError('');setBooking(null);try{const response=await fetch(`${API_URL}?action=online_booking_lookup&code=${encodeURIComponent(bookingCode.trim())}`,{credentials:'include'});const result=await readApiResponse(response);if(!response.ok||!result.success)throw new Error(result.message);setBooking(result.data);}catch(requestError){setError(requestError instanceof Error?requestError.message:'Không tìm thấy vé.');}finally{setSubmitting(false);}}
  async function redeemBooking(){setSubmitting(true);setError('');try{const response=await fetch(`${API_URL}?action=online_booking_redeem`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:bookingCode.trim()})});const result=await readApiResponse(response);if(!response.ok||!result.success)throw new Error(result.message);setBooking(current=>current?{...current,can_redeem:false,redeemed_at:result.data.redeemed_at}:current);}catch(requestError){setError(requestError instanceof Error?requestError.message:'Không thể đổi vé.');}finally{setSubmitting(false);}}

  function updateProductQuantity(product:Combo,delta:number){setError('');setComboQuantities(current=>{const next=Math.max(0,Math.min(product.stock_quantity,(current[product.code]||0)+delta));return{...current,[product.code]:next}})}
  function startNewProductOrder(){clearOrder();void loadCatalog(selectedDate,workspace)}

  const memberToolbar=<div className={`pos-member-toolbar ${selectedMember?'selected':''}`}><span><UserCheck size={17}/><b>Thành viên Aurora</b></span>{selectedMember?<div className="member-toolbar-selected"><span><b>{selectedMember.full_name}</b><small>{selectedMember.card_number||selectedMember.phone||selectedMember.email}</small></span><button type="button" onClick={()=>{setSelectedMember(null);setMemberQuery('');setMemberResults([])}}>Bỏ chọn</button></div>:<div className="member-toolbar-search"><input value={memberQuery} onChange={e=>setMemberQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void lookupMember()}}} placeholder="SĐT, email hoặc mã thẻ"/><button type="button" disabled={submitting||memberQuery.trim().length<3} onClick={()=>void lookupMember()}><Search size={14}/>Tra cứu</button>{memberResults.length>0&&<div className="member-toolbar-results">{memberResults.map(member=><button type="button" key={member.id} onClick={()=>{setSelectedMember(member);setMemberResults([])}}><UserCheck size={15}/><span><b>{member.full_name}</b><small>{member.phone||member.email} · {member.card_number||'Aurora Member'}</small></span></button>)}</div>}</div>}</div>;

  const operationMenu=[
    {key:'box_ticket' as SalesWorkspace,label:'Box Ticket',description:'Bán và đổi vé',icon:Ticket,granted:user?.role==='admin'||Boolean(user?.capabilities?.sell_tickets)},
    {key:'concession' as SalesWorkspace,label:'Concession',description:'Bắp nước & combo',icon:Coffee,granted:user?.role==='admin'||Boolean(user?.capabilities?.sell_concessions)},
    {key:'merchandise' as SalesWorkspace,label:'Merchandise',description:'Sản phẩm điện ảnh',icon:Gift,granted:user?.role==='admin'||Boolean(user?.capabilities?.sell_merchandise)},
  ];
  const topMenu=<div className="pos-operation-toolbar"><nav className="pos-operation-menu" aria-label="Khu vực nghiệp vụ POS">{operationMenu.map(item=>{const Icon=item.icon;return <button type="button" key={item.key} className={workspace===item.key?'active':''} disabled={!item.granted} title={item.granted?item.description:'Chưa được Admin Rạp cấp quyền trong phiên này'} onClick={()=>{setTicketMode('sales');setWorkspace(item.key);setError('')}}><span><Icon size={19}/></span><span><b>{item.label}</b><small>{item.granted?item.description:'Chưa được cấp quyền'}</small></span>{item.granted?<Check className="access-check" size={15}/>:<LockKeyhole className="access-lock" size={15}/>}</button>})}</nav>{memberToolbar}</div>;

  const paymentPage=paymentOpen?<div className="pos-sales-layout pos-payment-page">
    <header className="pos-sales-header pos-sales-header-sales"><div className="pos-sales-header-left"><button type="button" className="pos-btn pos-btn-secondary btn-sm" disabled={submitting} onClick={()=>{setPaymentOpen(false);setError('')}}><ArrowLeft size={16}/>Quay lại giỏ hàng</button><div><strong className="pos-sales-branch">{cinemaName} / {counter}</strong><span className="pos-sales-caption">Thanh toán tại quầy</span></div></div><div className="pos-sales-header-right"><span className="pos-sales-user"><UserCheck size={16}/>{staffName}</span></div></header>
    <main className="payment-page-main">
    <section className="pos-payment-dialog payment-page-card" aria-labelledby="pos-payment-title">
      <header className="payment-dialog-head"><div><span><CircleDollarSign size={20}/></span><div><small>THANH TOÁN TẠI QUẦY</small><h2 id="pos-payment-title">Thanh toán đơn hàng</h2><p>Kiểm tra tổng tiền, chọn phương thức và xác nhận giao dịch.</p></div></div></header>
      <div className="payment-dialog-content">
        <div className="payment-dialog-main">
          <div className="payment-section-title"><span>BƯỚC 1</span><div><h3>Chọn phương thức thanh toán</h3><p>Giao dịch chỉ được ghi vào aurora_db sau khi xác nhận.</p></div></div>
          <div className="payment-method-grid">{([['CASH','Tiền mặt','Nhập số tiền khách đưa',Banknote],['CARD','Thẻ','Thanh toán qua máy POS',CreditCard],['TRANSFER','Chuyển khoản','Quét mã và xác nhận',QrCode]] as const).map(([method,label,description,Icon])=><button type="button" key={method} className={paymentMethod===method?'active':''} onClick={()=>{setPaymentMethod(method);setError('')}}><span><Icon size={22}/></span><div><b>{label}</b><small>{description}</small></div>{paymentMethod===method&&<Check size={18}/>}</button>)}</div>
          <div className="payment-method-panel">
            {paymentMethod==='CASH'?<><div className="payment-section-title compact"><span>BƯỚC 2</span><div><h3>Nhận tiền từ khách</h3><p>Nhập số tiền thực nhận để hệ thống tính tiền thừa.</p></div></div><label className="payment-cash-field"><span>Tiền khách đưa</span><div><input autoFocus type="number" min="0" step="1000" value={amountReceived} onChange={event=>{setAmountReceived(event.target.value);setError('')}} placeholder="0"/><b>đ</b></div></label><div className="payment-cash-suggestions">{cashSuggestions.map(value=><button type="button" key={value} onClick={()=>setAmountReceived(String(value))}>{value===total?'Vừa đủ':money(value)}</button>)}</div><div className={`payment-change ${received>=total&&total>0?'ready':'due'}`}><span>{received>=total?'Tiền thừa trả khách':'Còn thiếu'}</span><strong>{money(received>=total?change:total-received)}</strong></div></>:paymentMethod==='CARD'?<div className="payment-external-note"><span><CreditCard size={27}/></span><div><b>Sẵn sàng thanh toán thẻ</b><p>Thực hiện giao dịch trên máy POS, sau đó nhấn “Xác nhận thanh toán” để ghi nhận đơn.</p></div></div>:<div className="payment-external-note transfer"><span><QrCode size={27}/></span><div><b>Xác nhận chuyển khoản</b><p>Kiểm tra giao dịch đã thành công với đúng số tiền <strong>{money(total)}</strong> trước khi xác nhận.</p></div></div>}
          </div>
        </div>
        <aside className="payment-order-summary"><div className="payment-summary-icon"><ShoppingCart size={22}/></div><small>TỔNG THANH TOÁN</small><strong>{money(total)}</strong><span>{unifiedCartCount} sản phẩm trong giỏ</span><dl>{ticketTotal>0&&<div><dt>Vé xem phim</dt><dd>{money(ticketTotal)}</dd></div>}{comboSubtotal>0&&<div><dt>Bắp nước & hàng hóa</dt><dd>{money(comboSubtotal)}</dd></div>}{memberDiscount>0&&<div className="discount"><dt>Ưu đãi thành viên</dt><dd>-{money(memberDiscount)}</dd></div>}<div className="total"><dt>Tổng cộng</dt><dd>{money(total)}</dd></div></dl>{selectedMember&&<div className="payment-member"><UserCheck size={17}/><span><small>Thành viên Aurora</small><b>{selectedMember.full_name}</b></span></div>}</aside>
      </div>
      {error&&<div className="pos-sales-error payment-dialog-error">{error}</div>}
      <footer className="payment-dialog-actions"><button type="button" className="payment-cancel" disabled={submitting} onClick={()=>{setPaymentOpen(false);setError('')}}>Quay lại giỏ hàng</button><button type="button" className="payment-confirm" disabled={submitting||total<=0||(paymentMethod==='CASH'&&received<total)} onClick={()=>void submitCurrentOrder()}>{submitting?<LoaderCircle className="spin-icon"/>:<Check size={19}/>}<span><small>{submitting?'Đang ghi nhận giao dịch':'Xác nhận thanh toán'}</small><b>{money(total)}</b></span></button></footer>
    </section>
    </main>
  </div>:null;

  if(paymentOpen)return paymentPage;

  if(workspace!=='box_ticket') return <div className="pos-sales-layout role-workspace">
    <header className="pos-sales-header pos-sales-header-sales"><div className="pos-sales-header-left"><button type="button" className="pos-btn pos-btn-secondary btn-sm" onClick={()=>{clearOrder();onBackToDashboard()}}><ArrowLeft size={16}/> Ca làm việc</button><div><strong className="pos-sales-branch">{cinemaName} / {counter}</strong><span className="pos-sales-caption">{user?.counter_role_name||'Nhân viên POS'}</span></div></div><div className="pos-sales-header-right"><span className="pos-sales-user"><UserCheck size={16}/>{staffName}</span></div></header>
    {topMenu}<main className="role-workspace-main">
      <section className="product-workspace product-sales-pro">
        <div className="product-catalog">
          <div className="product-catalog-heading"><div className="role-panel-title"><span className="role-panel-icon">{workspace==='merchandise'?<Gift size={22}/>:<Package size={22}/>}</span><div><small>{workspace==='merchandise'?'MERCHANDISE':'CONCESSION'}</small><h1>{workspace==='merchandise'?'Danh mục sản phẩm điện ảnh':'Danh mục bắp nước & combo'}</h1><p>Giá, nhóm hàng và tồn kho được đồng bộ theo rạp từ aurora_db.</p></div></div><div className="catalog-summary"><b>{combos.length}</b><span>Sản phẩm đang bán</span></div></div>
          <div className="product-toolbar"><label><Search size={17}/><input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Tìm tên hoặc mã sản phẩm..."/></label><div className="product-category-tabs"><button className={productCategory==='all'?'active':''} onClick={()=>setProductCategory('all')}>Tất cả</button>{productCategories.map(category=><button key={category} className={productCategory===category?'active':''} onClick={()=>setProductCategory(category)}>{category}</button>)}</div></div>
          {loading?<div className="product-empty-state"><LoaderCircle className="spin-icon"/><b>Đang tải danh mục</b><span>Đồng bộ giá và tồn kho từ aurora_db...</span></div>:visibleProducts.length===0?<div className="product-empty-state"><Package/><b>{combos.length?'Không tìm thấy sản phẩm':'Chưa có hàng hóa sẵn sàng bán'}</b><span>{combos.length?'Thử từ khóa hoặc danh mục khác.':'Admin Tổng cần phát hành Phân bố rạp để cấp quyền bán và tồn đầu kỳ cho POS này.'}</span></div>:<div className="product-grid">{visibleProducts.map(product=>{const quantity=comboQuantities[product.code]||0;return <article key={product.code} className={quantity?'selected':''}><div className="product-card-image">{product.image_url?<img src={product.image_url} alt={product.name}/>:<ImageIcon/>}<span className={product.stock_quantity<=Number(product.reorder_level||10)?'low':''}>{product.stock_quantity<=Number(product.reorder_level||10)?'Sắp hết':`Còn ${product.stock_quantity}`}</span></div><div className="product-card-body"><small>{product.category} · {product.code}</small><h3>{product.name}</h3><p>{product.description||`Đơn vị: ${product.unit||'Sản phẩm'}`}</p><div className="product-card-price"><strong>{money(productPrice(product))}</strong>{selectedMember&&<del>{money(product.price)}</del>}</div><div className="product-quantity"><button aria-label="Giảm số lượng" disabled={!quantity} onClick={()=>updateProductQuantity(product,-1)}><Minus/></button><b>{quantity}</b><button aria-label="Tăng số lượng" disabled={quantity>=product.stock_quantity} onClick={()=>updateProductQuantity(product,1)}><Plus/></button></div></div></article>})}</div>}
        </div>
        <aside className="product-checkout">
          <header className="checkout-heading"><div><small>GIỎ HÀNG DÙNG CHUNG</small><h2>Chi tiết đơn hàng</h2></div><span><ShoppingCart/>{unifiedCartCount}</span></header>
          {receipt?<div className="product-receipt-detail"><div className="receipt-check"><Check/></div><h3>Thanh toán thành công</h3><p>Đơn hàng đã được lưu và tồn kho đã cập nhật.</p><code>{receipt.code}</code><div className="receipt-lines">{receipt.items?.map((item,index)=><div key={`${item.code}-${index}`}><span>{item.name}<small>{item.quantity} × {money(item.unit_price)}</small></span><b>{money(item.line_total)}</b></div>)}</div><dl><div><dt>Tổng thanh toán</dt><dd>{money(receipt.total)}</dd></div>{Number(receipt.discount||0)>0&&<div><dt>Ưu đãi thành viên</dt><dd>-{money(Number(receipt.discount))}</dd></div>}<div><dt>Tiền khách đưa</dt><dd>{money(receipt.amount_received)}</dd></div><div className="receipt-change"><dt>Tiền thừa</dt><dd>{money(receipt.change)}</dd></div></dl><small>{receipt.cashier_name} · {receipt.counter}</small><button className="pos-pay-button" onClick={startNewProductOrder}><Plus/>TẠO ĐƠN MỚI</button></div>:<>
            {selectedShowtime&&selectedSeatObjects.length>0&&<section className="workspace-ticket-cart"><header><span><Ticket size={15}/>Vé xem phim</span><b>{selectedSeatObjects.length}</b></header><div className="workspace-ticket-showtime"><strong>{selectedShowtime.movie_title}</strong><small>{time(selectedShowtime.starts_at)} · {selectedShowtime.screen_name}{seatHoldExpiresAt?` · Giữ đến ${time(seatHoldExpiresAt)}`:''}</small></div>{selectedSeatObjects.map(seat=><article key={seat.id}><span><Armchair size={14}/>{seat.row}{seat.number}</span><div><b>{ticketForSeat(seat)?.name||'Chưa hoàn tất loại vé'}</b><small>{seat.type==='VIP'?'Ghế VIP':seat.type==='COUPLE'?'Ghế đôi':'Ghế thường'}</small></div><strong>{money(seatPrice(seat))}</strong></article>)}</section>}
            <div className="checkout-cart">{cartProducts.length===0?<div className="checkout-empty"><ShoppingCart/><b>Chưa có sản phẩm bán kèm</b><span>Vé đã chọn vẫn được giữ khi chọn bắp nước.</span></div>:cartProducts.map(product=><div className="checkout-item" key={product.code}><div><b>{product.name}</b><small>{money(productPrice(product))} / {product.unit||'sản phẩm'}</small></div><div className="checkout-item-actions"><button onClick={()=>updateProductQuantity(product,-1)}><Minus/></button><span>{comboQuantities[product.code]}</span><button onClick={()=>updateProductQuantity(product,1)}><Plus/></button><button className="remove" title="Xóa khỏi đơn" onClick={()=>setComboQuantities(current=>({...current,[product.code]:0}))}><Trash2/></button></div><strong>{money(productPrice(product)*comboQuantities[product.code])}</strong></div>)}</div>
            <div className="checkout-totals cart-total-only"><div className="grand"><span>TỔNG CỘNG</span><b>{money(total)}</b></div></div>
            {error&&<div className="pos-sales-error">{error}</div>}<button className="pos-pay-button cart-payment-button" disabled={submitting||total<=0} onClick={openPayment}>{selectedSeats.length>0&&ticketFlowStep!=='order'?<Ticket/>:<CreditCard/>}{selectedSeats.length>0&&ticketFlowStep!=='order'?'HOÀN TẤT LOẠI VÉ':'THANH TOÁN'}<ChevronRight size={18}/></button>
          </>}
        </aside>
      </section>
    </main></div>;

  const currentMovie=movies.find(movie=>movie.id===selectedMovieId);
  return <div className="pos-sales-layout pos-ticket-redesign">
    <header className="pos-sales-header pos-sales-header-sales">
      <div className="pos-sales-header-left"><button type="button" className="pos-btn pos-btn-secondary btn-sm" onClick={()=>{clearOrder();onBackToDashboard()}}><ArrowLeft size={16}/>Ca làm việc</button><div><strong className="pos-sales-branch">{cinemaName} / {counter}</strong><span className="pos-sales-caption">Quầy vé · Giao dịch trực tiếp</span></div></div>
      <div className="pos-sales-header-right"><span className="pos-sales-user"><UserCheck size={16}/>{staffName}</span><button type="button" className="pos-icon-btn" title="Làm mới giao dịch" onClick={clearOrder}><RotateCcw size={17}/></button></div>
    </header>
    {topMenu}
    {ticketMode==='redeem'?<main className="role-workspace-main ticket-service-workspace"><section className="redeem-panel"><div className="role-panel-title"><QrCode size={24}/><div><small>BOX TICKET</small><h1>Đổi vé online</h1><p>Tra cứu mã đặt vé đã thanh toán và xác nhận giao vé cho khách.</p></div><button type="button" className="ticket-return-button" onClick={()=>setTicketMode('sales')}><Ticket size={16}/>Bán vé tại quầy</button></div><div className="booking-search"><input value={bookingCode} onChange={e=>setBookingCode(e.target.value.toUpperCase())} placeholder="Nhập mã đặt vé, ví dụ AUR-8F2K9M"/><button onClick={()=>void lookupBooking()} disabled={submitting||bookingCode.trim().length<5}><Search size={17}/>Tra cứu</button></div>{error&&<div className="pos-sales-error">{error}</div>}{booking&&<article className="booking-result"><header><span>{String(booking.booking_code)}</span><b>{booking.redeemed_at?'Đã đổi vé':'Sẵn sàng đổi vé'}</b></header><h2>{String(booking.movie_title)}</h2><dl><div><dt>Suất chiếu</dt><dd>{String(booking.starts_at)}</dd></div><div><dt>Phòng / ghế</dt><dd>{String(booking.screen_name)} · {String(booking.seats)}</dd></div><div><dt>Khách hàng</dt><dd>{String(booking.customer_name||'Khách online')}</dd></div><div><dt>Tổng tiền</dt><dd>{money(Number(booking.total_amount))}</dd></div></dl><button className="pos-pay-button" disabled={!booking.can_redeem||submitting} onClick={()=>void redeemBooking()}><Check size={18}/>{booking.redeemed_at?'VÉ ĐÃ ĐƯỢC XÁC NHẬN':'XÁC NHẬN ĐỔI VÉ'}</button></article>}</section></main>:<>
      <main className="pos-sales-workspace ticket-workspace">
        <section className={`pos-sales-catalog ticket-stage ${ticketFlowStep==='seats'?'seat-map-stage':''}`}>
          {ticketFlowStep==='movies'&&<>
            <div className="ticket-stage-head"><div><span className="pos-eyebrow">BOX TICKET · {selectedMovieId?'BƯỚC 02':'BƯỚC 01'}</span><h1>{selectedMovieId?'Chọn suất chiếu':'Chọn phim'}</h1><p>{selectedMovieId?'Các suất còn mở trong ngày đã chọn.':'Chọn phim khách muốn xem để hiển thị danh sách suất chiếu.'}</p></div><div className="box-ticket-tools"><button type="button" onClick={()=>setTicketMode('redeem')}><QrCode size={15}/>Đổi vé online</button>{!selectedMovieId&&<label className="pos-search"><Search size={16}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Tìm tên phim..."/></label>}</div></div>
            <div className="pos-date-tabs ticket-date-tabs">{dates.map(date=><button type="button" className={selectedDate===date?'active':''} key={date} onClick={()=>{clearOrder();setSelectedDate(date);void loadCatalog(date)}}><CalendarDays size={14}/>{dateLabel(date)}</button>)}</div>
            {loading?<div className="ticket-loading"><LoaderCircle className="spin-icon"/><b>Đang tải lịch chiếu</b><span>Dữ liệu được đồng bộ từ aurora_db</span></div>:!selectedMovieId?<div className="movie-choice-grid">{visibleMovies.map((movie,index)=><button type="button" key={movie.id} className="movie-choice-card" onClick={()=>chooseMovie(movie.id)}><span className={`movie-monogram tone-${index%5}`}><Film size={25}/><b>{movie.title.slice(0,1)}</b></span><span className="movie-choice-copy"><small>{movie.age_rating} · {movie.format}</small><strong>{movie.title}</strong><em><Clock3 size={13}/>{movie.showtime_count} suất · từ {time(movie.first_showtime)}</em></span><span className="movie-choice-meta"><b>{movie.available_seats}</b><small>ghế trống</small><ChevronRight size={18}/></span></button>)}{visibleMovies.length===0&&<div className="ticket-loading"><Film/><b>Không tìm thấy phim</b><span>Thử từ khóa khác hoặc chọn ngày chiếu khác.</span></div>}</div>:<>
              <button type="button" className="ticket-back-link" onClick={()=>{setSelectedMovieId(null);setSelectedShowtime(null)}}><ArrowLeft size={15}/>Danh sách phim</button>
              <div className="chosen-movie-banner"><span><Film size={24}/></span><div><small>{currentMovie?.age_rating} · {currentMovie?.format}</small><h2>{currentMovie?.title}</h2><p>{dateLabel(selectedDate)} · {movieShowtimes.length} suất đang mở</p></div></div>
              <div className="showtime-choice-grid">{movieShowtimes.map(showtime=><button type="button" key={showtime.id} onClick={()=>chooseShowtime(showtime)}><span className="showtime-clock"><b>{time(showtime.starts_at)}</b><small>{showtime.ends_at?`Kết thúc ${time(showtime.ends_at)}`:'Suất trong ngày'}</small></span><span className="showtime-room"><b>{showtime.screen_name}</b><small>{showtime.format} · {showtime.age_rating}</small></span><span className="showtime-seats"><b>{showtime.available_seats}</b><small>/ {showtime.total_seats} ghế trống</small></span><span className="showtime-price"><b>{money(showtime.ticket_price)}</b><small>từ</small></span><ChevronRight size={18}/></button>)}</div>
            </>}
          </>}

          {ticketFlowStep==='seats'&&selectedShowtime&&<>
            <div className="ticket-stage-head"><div><span className="pos-eyebrow">BOX TICKET · BƯỚC 03</span><h1>Chọn ghế</h1><p>{selectedShowtime.movie_title} · {time(selectedShowtime.starts_at)} · {selectedShowtime.screen_name}</p></div><button type="button" className="ticket-back-link inline" onClick={()=>{syncSeatHold(selectedShowtime.id,[]);setSelectedShowtime(null);setSelectedSeats([]);setSeatHoldExpiresAt('');setTicketFlowStep('movies')}}><ArrowLeft size={15}/>Đổi suất</button></div>
            {loadingSeats?<div className="ticket-loading"><LoaderCircle className="spin-icon"/><b>Đang tải sơ đồ ghế</b><span>Kiểm tra trạng thái ghế theo thời gian thực...</span></div>:<div className="seat-stage aurora-seat-map"><div className="aurora-cinema-screen"><span>MÀN HÌNH CHIẾU</span><small>Tất cả ghế đều hướng về màn hình</small></div><div className="aurora-seat-rows">{seatRows.map(([row,rowSeats])=>{const isCoupleRow=rowSeats.every(seat=>seat.type==='COUPLE');const columns=Math.max(1,Number(seatLayout.columns||12));const coupleOffset=isCoupleRow?Math.floor((columns-rowSeats.length*2)/2)+1:1;const template=`repeat(${columns},minmax(34px,1fr))`;return <div className={`aurora-seat-row ${isCoupleRow?'couple-row':''}`} key={row}><b className="aurora-row-label">{row}</b><div className="aurora-seat-row-grid" style={{gridTemplateColumns:template}}>{rowSeats.map(seat=>{const columnStart=seat.type==='COUPLE'?coupleOffset+(seat.number-1)*2:seat.number;return <button type="button" key={seat.id} style={{gridColumn:`${columnStart} / span ${seat.type==='COUPLE'?2:1}`}} disabled={!seat.available} className={`aurora-seat aurora-seat-${seat.type.toLowerCase()} ${selectedSeats.includes(seat.id)?'selected':''}`} onClick={()=>toggleSeat(seat)} title={`${seat.row}${seat.number} · ${seat.type} · ${seat.available?'Còn trống':'Đã bán'}`}><span>{seat.row}{seat.number}</span></button>})}</div><b className="aurora-row-label">{row}</b></div>})}</div><div className="aurora-seat-legend"><span><i className="standard"/>Ghế thường</span><span><i className="vip"/>Ghế VIP</span><span><i className="couple"/>Ghế đôi</span><span><i className="selected"/>Đang chọn</span><span><i className="occupied"/>Đã bán</span></div></div>}
            <div className="ticket-stage-action"><div><span>Đã chọn <b>{selectedSeats.length}</b> ghế</span><strong>{selectedSeatObjects.map(seat=>`${seat.row}${seat.number}`).join(', ')||'Chưa chọn ghế'}</strong></div><button type="button" disabled={selectedSeats.length===0} onClick={confirmSeats}><Check size={17}/>XÁC NHẬN GHẾ<ChevronRight size={17}/></button></div>
          </>}

          {ticketFlowStep==='ticket_types'&&selectedShowtime&&<>
            <div className="ticket-stage-head"><div><span className="pos-eyebrow">BOX TICKET · BƯỚC 04</span><h1>Chọn loại vé</h1><p>Giá bán chính thức do TMS ban hành cho suất chiếu này.</p></div><button type="button" className="ticket-back-link inline" onClick={()=>setTicketFlowStep('seats')}><ArrowLeft size={15}/>Sửa ghế</button></div>
            <div className="ticket-type-list compact-ticket-types">{selectedSeatObjects.map(seat=>{const selectedTicket=ticketForSeat(seat);const availableTypes=seat.type==='COUPLE'?(coupleTicket?[coupleTicket]:[]):ticketOptions.filter(option=>option.code!=='TICKET_COUPLE');return <article className="ticket-type-select-row" key={seat.id}><div className={`ticket-seat-identity ${seat.type.toLowerCase()}`}><span><Armchair size={17}/></span><div><small>{seat.type==='COUPLE'?'GHẾ ĐÔI':seat.type==='VIP'?'GHẾ VIP':'GHẾ THƯỜNG'}</small><b>{seat.row}{seat.number}</b></div></div><label className="ticket-type-select"><span>Loại vé</span><div><select aria-label={`Loại vé cho ghế ${seat.row}${seat.number}`} value={selectedTicket?.id||''} disabled={seat.type==='COUPLE'} onChange={event=>setSeatTicketTypes(current=>({...current,[seat.id]:Number(event.target.value)}))}>{availableTypes.map(option=><option key={option.id} value={option.id}>{option.name} — {money(seatPriceForOption(seat,option))}</option>)}</select><ChevronDown size={16}/></div>{seat.type==='COUPLE'&&<small>Loại vé cố định cho ghế đôi</small>}</label><div className="ticket-selected-price"><small>THÀNH TIỀN</small><strong>{money(seatPrice(seat))}</strong></div></article>})}</div>
            <div className="ticket-stage-action"><div><span>Tạm tính <b>{selectedSeats.length}</b> vé</span><strong>{money(ticketTotal)}</strong></div><button type="button" onClick={finishTicketTypes}><Check size={17}/>XONG<ChevronRight size={17}/></button></div>
          </>}

          {ticketFlowStep==='order'&&<div className="order-ready-stage"><span><Check size={26}/></span><small>ĐÃ THÊM VÉ VÀO GIỎ HÀNG</small><h1>Vé đã sẵn sàng</h1><p>Kiểm tra vé và sản phẩm trong giỏ hàng bên phải, sau đó nhấn “Thanh toán” để tiếp tục.</p><div><button type="button" onClick={()=>setTicketFlowStep('ticket_types')}><ArrowLeft size={15}/>Điều chỉnh vé</button></div></div>}
          {error&&ticketFlowStep!=='order'&&<div className="pos-sales-error stage-error">{error}</div>}
        </section>

        <aside className="pos-sales-order order-checkout live-pos-cart"><div className="live-cart-head"><div><span className="pos-eyebrow">GIỎ HÀNG HIỆN TẠI</span><h2>Chi tiết đơn hàng</h2></div><span><ShoppingCart size={16}/>{selectedSeats.length+cartCount}</span></div>{receipt?<div className="pos-receipt"><div className="pos-receipt-icon"><Check size={22}/></div><div className="pos-receipt-success">Thanh toán thành công</div><p>Vé, sản phẩm và giao dịch đã được ghi nhận trong aurora_db.</p><code>{receipt.code}</code><div className="pos-receipt-items">{receipt.items?.map((item,index)=><div key={`${item.code}-${index}`}><span>{item.name} × {item.quantity}</span><b>{money(item.line_total)}</b></div>)}</div><div className="pos-receipt-total"><span>Tổng thanh toán</span><b>{money(receipt.total)}</b></div><div className="pos-receipt-meta"><span>{receipt.cashier_name} · {receipt.counter}</span><span>{receipt.created_at}</span></div><button type="button" className="pos-btn pos-btn-primary" onClick={()=>{clearOrder();setSeats([]);setTicketOptions([]);void loadCatalog(selectedDate)}}><Printer size={16}/>GIAO DỊCH MỚI</button></div>:<div className="live-cart-body">
          {selectedShowtime&&<div className="live-cart-showtime"><span><Film size={18}/></span><div><b>{selectedShowtime.movie_title}</b><small>{time(selectedShowtime.starts_at)} · {selectedShowtime.screen_name} · {selectedShowtime.format}</small></div></div>}
          <section className="live-cart-section"><header><span><Ticket size={15}/>Vé xem phim</span><b>{selectedSeats.length}</b></header>{selectedSeatObjects.length?<div className="live-cart-lines">{selectedSeatObjects.map(seat=><article key={seat.id}><span className={`cart-seat-badge ${seat.type.toLowerCase()}`}><Armchair size={14}/>{seat.row}{seat.number}</span><div><b>{ticketForSeat(seat)?.name||'Chưa chọn loại vé'}</b><small>{seat.type==='COUPLE'?'Ghế đôi':seat.type==='VIP'?'Ghế VIP':'Ghế thường'}</small></div><strong>{money(seatPrice(seat))}</strong></article>)}</div>:<div className="live-cart-empty"><Armchair size={21}/><span><b>Chưa có vé trong giỏ</b><small>Chọn ghế trên sơ đồ để thêm vé.</small></span></div>}</section>
          {cartProducts.length>0&&<section className="live-cart-section"><header><span><Package size={15}/>Bắp nước & hàng hóa</span><b>{cartCount}</b></header><div className="live-cart-lines product-lines">{cartProducts.map(product=><article key={product.code}><span className={`cart-product-icon ${product.sales_area||'concession'}`}>{product.sales_area==='merchandise'?<Gift size={15}/>:<Coffee size={15}/>}</span><div><b>{product.name}</b><small>{money(productPrice(product))} / {product.unit||'sản phẩm'}</small></div><div className="cart-line-quantity"><button type="button" aria-label={`Giảm ${product.name}`} onClick={()=>updateProductQuantity(product,-1)}><Minus size={11}/></button><b>{comboQuantities[product.code]}</b><button type="button" aria-label={`Tăng ${product.name}`} disabled={(comboQuantities[product.code]||0)>=product.stock_quantity} onClick={()=>updateProductQuantity(product,1)}><Plus size={11}/></button></div><strong>{money(productPrice(product)*comboQuantities[product.code])}</strong><button type="button" className="cart-line-remove" title="Xóa sản phẩm" onClick={()=>setComboQuantities(current=>({...current,[product.code]:0}))}><Trash2 size={13}/></button></article>)}</div></section>}
          {ticketFlowStep!=='order'&&<div className="live-cart-notice"><LockKeyhole size={16}/><span><b>Giỏ hàng đang cập nhật</b><small>{selectedSeats.length?'Ghế đang được giữ trong 10 phút. Hoàn tất loại vé để thanh toán.':'Vé đã chọn sẽ xuất hiện ngay tại đây.'}</small></span></div>}
          <div className="live-cart-totals cart-total-only"><div className="grand"><span>TỔNG CỘNG</span><b>{money(total)}</b></div></div>
          {error&&<div className="pos-sales-error">{error}</div>}{ticketFlowStep==='order'?<button type="button" className="pos-pay-button cart-payment-button" disabled={submitting||!selectedShowtime||selectedSeats.length===0||total<=0} onClick={openPayment}><CreditCard size={18}/>THANH TOÁN<ChevronRight size={18}/></button>:<button type="button" className="live-cart-disabled" disabled><ShoppingCart size={16}/>{selectedSeats.length?'HOÀN TẤT CHỌN VÉ ĐỂ THANH TOÁN':'CHỌN GHẾ ĐỂ THÊM VÉ'}</button>}
        </div>}</aside>
      </main>
    </>}
  </div>;
}
