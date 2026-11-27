import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import './VietnameseDateInput.css';

export function formatVietnameseDate(value?: string | null, emptyText = 'Chưa chọn ngày') {
  if (!value) return emptyText;
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return String(value);
}

export function parseVietnameseDate(value: string) {
  const match = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText), month = Number(monthText), year = Number(yearText);
  const candidate = new Date(year, month - 1, day, 12, 0, 0);
  if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return null;
  return `${yearText}-${monthText}-${dayText}`;
}

function maskDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/');
}

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  ariaLabel?: string;
};

export function VietnameseDateInput({ value, onChange, className = '', disabled = false, required = false, min, max, ariaLabel }: DateInputProps) {
  const normalized = value ? formatVietnameseDate(value, '') : '';
  const [draft, setDraft] = useState(normalized);
  const pickerRef = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(normalized), [normalized]);

  const commit = () => {
    if (!draft) { if (value) onChange(''); return; }
    const parsed = parseVietnameseDate(draft);
    if (parsed) onChange(parsed);
    else setDraft(normalized);
  };
  const openPicker = () => {
    const picker = pickerRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!picker || disabled) return;
    if (picker.showPicker) picker.showPicker(); else picker.click();
  };

  return <span className={`vi-date-control ${disabled ? 'disabled' : ''}`}>
    <input type="text" className={className} value={draft} disabled={disabled} required={required} inputMode="numeric" autoComplete="off" maxLength={10} placeholder="dd/mm/yyyy" aria-label={ariaLabel} onChange={event=>setDraft(maskDate(event.target.value))} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();commit();}}}/>
    <button type="button" onClick={openPicker} disabled={disabled} aria-label={`Mở lịch${ariaLabel ? `: ${ariaLabel}` : ''}`}><CalendarDays size={16}/></button>
    <input ref={pickerRef} className="vi-date-native" type="date" value={value || ''} min={min} max={max} tabIndex={-1} aria-hidden="true" onChange={event=>onChange(event.target.value)}/>
  </span>;
}

type DateTimeInputProps = Omit<DateInputProps, 'min' | 'max'>;

function formatVietnameseDateTime(value: string) {
  const match = String(value || '').replace(' ', 'T').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}` : '';
}

function parseVietnameseDateTime(value: string) {
  const match = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  if (!parseVietnameseDate(`${day}/${month}/${year}`) || Number(hour) > 23 || Number(minute) > 59) return null;
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function VietnameseDateTimeInput({ value, onChange, className = '', disabled = false, required = false, ariaLabel }: DateTimeInputProps) {
  const normalized = formatVietnameseDateTime(value);
  const [draft, setDraft] = useState(normalized);
  const pickerRef = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(normalized), [normalized]);
  const commit = () => {
    if (!draft) { if (value) onChange(''); return; }
    const parsed = parseVietnameseDateTime(draft);
    if (parsed) onChange(parsed); else setDraft(normalized);
  };
  const openPicker = () => {
    const picker = pickerRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!picker || disabled) return;
    if (picker.showPicker) picker.showPicker(); else picker.click();
  };
  return <span className={`vi-date-control ${disabled ? 'disabled' : ''}`}>
    <input type="text" className={className} value={draft} disabled={disabled} required={required} inputMode="numeric" autoComplete="off" placeholder="dd/mm/yyyy hh:mm" aria-label={ariaLabel} onChange={event=>setDraft(event.target.value.replace(/[^0-9/: ]/g,'').slice(0,16))} onBlur={commit}/>
    <button type="button" onClick={openPicker} disabled={disabled} aria-label={`Mở lịch và giờ${ariaLabel ? `: ${ariaLabel}` : ''}`}><CalendarDays size={16}/></button>
    <input ref={pickerRef} className="vi-date-native" type="datetime-local" value={value || ''} tabIndex={-1} aria-hidden="true" onChange={event=>onChange(event.target.value)}/>
  </span>;
}
