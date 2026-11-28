import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Search,X} from 'lucide-react';
import './EmojiPicker.css';

const GROUPS=[
 ['Gần đây','😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😎 🤩 🥳 😢 😭 😡 👍 ❤️ 🎉'],
 ['Cảm xúc','😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫣 🤭 🫢 🫡 🤫 🫠 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕'],
 ['Cử chỉ','👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 👃 🧠 🫀 🫁 👀 👁️ 👅 👄 🫦'],
 ['Người','👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 👷 💂 🕵️ 👩‍⚕️ 👨‍🎓 👩‍🏫 👨‍⚖️ 👩‍🌾 👨‍🍳 👩‍🔧 👨‍🏭 👩‍💼 👨‍🔬 👩‍💻 👨‍🎤 👩‍🎨 👨‍✈️ 👩‍🚀 👨‍🚒 🧕 🤵 👰 🤰 🧑‍🍼 👼 🎅 🦸 🦹 🧙 🧚 🧛 🧜 🧝 🧞 🧟 💆 💇 🚶 🧍 🧎 🏃 💃 🕺 👯 🧖 🧗 🤺 🏇 ⛷️ 🏂 🏌️ 🏄 🚣 🏊 ⛹️ 🏋️ 🚴 🤸 🤼 🤽 🤾 🤹 🧘'],
 ['Động vật','🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🪲 🐞 🦗 🪳 🕷️ 🦂 🐢 🐍 🦎 🐙 🦑 🦐 🦀 🐠 🐟 🐡 🐬 🐳 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🦙 🐐 🦌 🐕 🐈 🪶 🐓 🦃 🦚 🦜 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐿️ 🦔'],
 ['Ăn uống','🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🌭 🍔 🍟 🍕 🥪 🥙 🧆 🌮 🌯 🥗 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 ☕ 🫖 🍵 🧃 🥤 🧋 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🍾 🧊'],
 ['Hoạt động','⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🥍 🏏 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 🎯 🪄 🎮 🕹️ 🎰 🎲 🧩 🧸 🪅 🪩 🪆 ♟️ 🎨 🧵 🪡 🧶 🎭 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🪗 🎸 🎻 🎬 🎪 🎟️ 🏆 🥇 🥈 🥉 🏅 🎖️'],
 ['Du lịch','🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚜 🏍️ 🛵 🚲 🛴 🚨 🚥 🚧 ⚓ ⛵ 🚤 🛳️ ✈️ 🛫 🛬 🪂 🚁 🚀 🛸 🚉 🚆 🚇 🚊 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛺ 🌁 🌃 🏙️ 🌄 🌅 🌆 🌇 🌉 ♨️'],
 ['Vật thể','⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💽 💾 💿 📀 🧮 🎥 📷 📸 📹 📞 ☎️ 📺 📻 🎙️ ⏱️ ⏰ ⌛ 🔋 🔌 💡 🔦 🕯️ 🧯 🛒 💎 ⚖️ 🧰 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪚 🔩 ⚙️ 🧱 ⛓️ 🧲 🔫 💣 🧨 🪓 🔪 🛡️ 🚬 ⚰️ 🪦 ⚱️ 🔮 📿 🧿 💈 ⚗️ 🔭 🔬 🩹 🩺 💊 💉 🩸 🚪 🪑 🛏️ 🛋️ 🚿 🛁 🧴 🧹 🧺 🧻 🧼 🪥 🧽 🧷 🧹 🔑 🗝️ 🎁 🎈 🎀 🎊 🎉 🪅 ✉️ 📩 📦 📜 📋 📌 📍 📎 ✏️ 📝 📚 🔖'],
 ['Biểu tượng','❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 ❗ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿ 🅿️ 🛗 🛂 🛃 🛄 🛅'],
 ['Cờ','🏁 🚩 🎌 🏴 🏳️ 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️ 🇻🇳 🇺🇸 🇬🇧 🇫🇷 🇩🇪 🇮🇹 🇯🇵 🇰🇷 🇨🇳 🇹🇭 🇸🇬 🇦🇺 🇨🇦 🇧🇷 🇮🇳 🇪🇸 🇵🇹 🇳🇱 🇷🇺 🇺🇦 🇪🇺 🇺🇳']
] as const;

export const QUICK_EMOJIS=['👍','❤️','😂','😮','😢','🎉'];
const recentEmojis=()=>{try{const value=JSON.parse(localStorage.getItem('aurora-recent-emojis')||'[]');return Array.isArray(value)?value.filter(item=>typeof item==='string').slice(0,24):[]}catch{return[]}};

export default function EmojiPicker({onSelect,onClose}:{onSelect:(emoji:string)=>void;onClose:()=>void}){
 const [group,setGroup]=useState(0),[query,setQuery]=useState('');
 const searchRef=useRef<HTMLInputElement>(null);
 const groups=useMemo<Array<readonly [string,string]>>(()=>GROUPS.map((item,index)=>index===0?[item[0],[...recentEmojis(),...QUICK_EMOJIS].filter((emoji,position,list)=>list.indexOf(emoji)===position).join(' ')] as const:item),[]);
 const allEmojis=useMemo(()=>groups.flatMap(item=>item[1].split(' ')).filter((emoji,index,list)=>emoji&&list.indexOf(emoji)===index),[groups]);
 const emojis=useMemo(()=>groups[group][1].split(' ').filter(Boolean),[group,groups]);
 const normalizedQuery=query.trim();
 const shown=normalizedQuery?allEmojis.filter(emoji=>emoji.includes(normalizedQuery)):emojis;

 useEffect(()=>{
  searchRef.current?.focus();
  const handleKeyDown=(event:globalThis.KeyboardEvent)=>{if(event.key==='Escape')onClose()};
  document.addEventListener('keydown',handleKeyDown);
  return()=>document.removeEventListener('keydown',handleKeyDown);
 },[onClose]);

 const selectEmoji=(emoji:string)=>{const recent=[emoji,...recentEmojis().filter(item=>item!==emoji)].slice(0,24);localStorage.setItem('aurora-recent-emojis',JSON.stringify(recent));onSelect(emoji)};
 const picker=<div className="emoji-picker-backdrop" onMouseDown={onClose}>
  <section className="emoji-picker" role="dialog" aria-modal="true" aria-label="Chọn biểu tượng cảm xúc" onMouseDown={event=>event.stopPropagation()}>
   <header>
    <div><b>Biểu tượng cảm xúc</b><small>Chọn emoji để bày tỏ cảm xúc</small></div>
    <button type="button" onClick={onClose} aria-label="Đóng bộ chọn emoji"><X/></button>
   </header>
   <label className="emoji-search"><Search/><input ref={searchRef} value={query} onChange={event=>setQuery(event.target.value)} placeholder="Dán emoji để tìm nhanh..."/><kbd>ESC</kbd></label>
   <nav aria-label="Danh mục emoji">{groups.map((item,index)=><button type="button" className={index===group&&!normalizedQuery?'active':''} aria-label={item[0]} aria-selected={index===group&&!normalizedQuery} onClick={()=>{setGroup(index);setQuery('')}} title={item[0]} key={item[0]}><span>{item[1].split(' ')[0]}</span><small>{item[0]}</small></button>)}</nav>
   <div className="emoji-section-title"><b>{normalizedQuery?'Kết quả tìm kiếm':groups[group][0]}</b><span>{shown.length} emoji</span></div>
   <div className="emoji-grid">{shown.length?shown.map((emoji,index)=><button type="button" onClick={()=>selectEmoji(emoji)} aria-label={`Chọn ${emoji}`} title={emoji} key={`${emoji}-${index}`}>{emoji}</button>):<div className="emoji-empty"><Search/><b>Không tìm thấy emoji</b><span>Hãy dán một emoji khác vào ô tìm kiếm.</span></div>}</div>
   <footer><span>Nhấp emoji để chọn</span><span><kbd>ESC</kbd> Đóng</span></footer>
  </section>
 </div>;
 return createPortal(picker,document.body);
}
