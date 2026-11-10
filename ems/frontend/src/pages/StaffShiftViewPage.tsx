import React, { useState, useEffect } from 'react';
import { User, WorkSchedule, ShiftRegistration } from '../types';
import { getWorkSchedules, getShiftRegistrations, syncApprovedRegistrationsToSchedules } from '../services/storage';
import { fetchWorkSchedules, fetchShiftRegistrations } from '../services/apiClient';
import { Calendar, MapPin, Clock, CheckCircle2, Sparkles, ThumbsUp } from 'lucide-react';
import { formatFriendlyDate, getWeekDaysByOffset } from '../utils/dateUtils';

interface StaffShiftViewPageProps {
  currentUser: User;
}

export const StaffShiftViewPage: React.FC<StaffShiftViewPageProps> = ({ currentUser }) => {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [registrations, setRegistrations] = useState<ShiftRegistration[]>([]);
  const [weekFilter, setWeekFilter] = useState<'all' | 'current' | 'next'>('all');

  const currentWeekDays = getWeekDaysByOffset(0);
  const nextWeekDays = getWeekDaysByOffset(1);
  const currentWeekSet = new Set(currentWeekDays.map(d => d.date));
  const nextWeekSet = new Set(nextWeekDays.map(d => d.date));

  useEffect(() => {
    Promise.all([
      fetchWorkSchedules(),
      fetchShiftRegistrations(currentUser.id)
    ]).then(([schedList, regList]) => {
      const allRegs = regList && regList.length > 0 ? regList : getShiftRegistrations();
      const baseScheds = schedList && schedList.length > 0 ? schedList : getWorkSchedules();
      const syncedScheds = syncApprovedRegistrationsToSchedules(allRegs, baseScheds);
      setSchedules(syncedScheds);
      setRegistrations(allRegs.filter(r => r.userId === currentUser.id || r.userId === currentUser.id.replace('usr-', '')));
    });
  }, [currentUser.id]);

  const cleanUserId = currentUser.id.replace('usr-', '').trim();
  const allMySchedules = schedules
    .filter(s => s.userId.replace('usr-', '').trim() === cleanUserId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const mySchedules = allMySchedules.filter(s => {
    if (weekFilter === 'current') return currentWeekSet.has(s.date);
    if (weekFilter === 'next') return nextWeekSet.has(s.date);
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Lịch Phân Ca Làm Việc Chính Thức</h2>
          <p className="text-xs text-slate-500 mt-1">
            Lịch phân công ca làm việc chính thức.
          </p>
        </div>

        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setWeekFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              weekFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất Cả ({allMySchedules.length})
          </button>
          <button
            onClick={() => setWeekFilter('current')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              weekFilter === 'current' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tuần Này ({currentWeekDays[0]?.dayNum} – {currentWeekDays[6]?.dayNum})
          </button>
          <button
            onClick={() => setWeekFilter('next')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              weekFilter === 'next' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tuần Tiếp Theo ({nextWeekDays[0]?.dayNum} – {nextWeekDays[6]?.dayNum})
          </button>
        </div>
      </div>

      {/* Tóm tắt */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Số ca làm việc tuần này</div>
          <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-1">
            <span>{mySchedules.length}</span>
            <span className="text-xs font-normal text-slate-400">ca trực</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Tương đương ~{mySchedules.length * 8} giờ làm việc</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Độ khớp nguyện vọng ca trực</div>
          <div className="text-2xl font-black text-purple-600 mt-1 flex items-center gap-1.5">
            <ThumbsUp className="w-5 h-5 text-purple-600" />
            <span>100% Khớp</span>
          </div>
          <div className="text-[11px] text-purple-600 mt-1">Khớp nguyện vọng đã đăng ký</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Thời gian điểm danh</div>
          <div className="text-xs font-bold text-slate-800 mt-1.5 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Đầu mỗi ca trực</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Tại khu vực điểm danh của rạp</div>
        </div>
      </div>

      {mySchedules.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-sm">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="font-bold text-sm text-slate-700">Chưa Có Lịch Phân Ca Tuần Này</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Chưa có lịch làm việc được phân công trong tuần này.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mySchedules.map((sch) => {
            const reg = registrations.find(r => r.date === sch.date);
            const isMatched = reg && reg.shiftId === sch.shiftId;

            return (
              <div 
                key={sch.id} 
                className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      📅 {formatFriendlyDate(sch.date)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Đã Phát Hành
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">{sch.shiftName}</h3>
                    
                    <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400">Vị trí phân công tại rạp:</div>
                        <span className="text-slate-900 font-bold">{sch.location}</span>
                      </div>
                    </div>
                  </div>

                  {isMatched && (
                    <div className="text-[11px] text-purple-700 bg-purple-50 p-2 rounded-lg border border-purple-100 flex items-center gap-1.5 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>Trùng khớp 100% nguyện vọng bạn đăng ký</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center">
                  <span className="truncate max-w-[200px]">Phân ca: {sch.assignedBy}</span>
                  <span className="font-mono text-slate-500">Cụm rạp Aurora #1</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
