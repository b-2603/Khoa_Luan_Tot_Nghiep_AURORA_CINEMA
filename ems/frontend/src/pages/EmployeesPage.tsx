import React, { useState, useEffect, useRef } from 'react';
import { User, Department, Role } from '../types';
import { getUsers } from '../services/storage';
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee } from '../services/apiClient';
import { 
  getEnrolledFace, saveEnrolledFace, removeEnrolledFace, 
  startWebcamStream, extractFaceFromVideo, getAvailableCameras, 
  FaceFeatures 
} from '../services/biometrics';
import { 
  Search, Filter, Eye, X, Star, UserPlus, 
  Edit3, Trash2, CheckCircle2, AlertTriangle, 
  Phone, Mail, Shield, Building, Award, UserCheck, 
  UserX, RefreshCw, Camera, Sparkles, Check
} from 'lucide-react';

// 4 Nghiệp vụ chuẩn cho nhân viên chi nhánh rạp Aurora Cinema
export const BRANCH_POSITIONS = [
  { id: 'Box ticket', title: 'Box ticket', desc: 'Nhân viên bán vé', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'Concession', title: 'Concession', desc: 'Nhân viên bán bắp nước', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'Usher', title: 'Usher', desc: 'Nhân viên dọn rạp', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'Processing', title: 'Processing', desc: 'Nhân viên chế biến', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
];

export function normalizeBranchDept(dept?: string): string {
  if (!dept) return 'Box ticket';
  const d = dept.toLowerCase();
  if (d.includes('vé') || d.includes('box') || d.includes('ticket')) return 'Box ticket';
  if (d.includes('bắp') || d.includes('concession') || d.includes('nước')) return 'Concession';
  if (d.includes('dọn') || d.includes('soát') || d.includes('usher') || d.includes('kỹ thuật')) return 'Usher';
  if (d.includes('chế biến') || d.includes('processing') || d.includes('bếp')) return 'Processing';
  return dept;
}

export function getBranchDeptMeta(dept?: string) {
  const norm = normalizeBranchDept(dept);
  const found = BRANCH_POSITIONS.find(b => b.id === norm);
  if (found) return found;
  return { id: norm, title: norm, desc: '', badge: 'bg-slate-50 text-slate-700 border-slate-200' };
}

interface EmployeesPageProps {
  initialAddModal?: boolean;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({ initialAddModal }) => {
  const [users, setUsers] = useState<User[]>(getUsers());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(Boolean(initialAddModal));
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Face ID Manager Modal State (Quản lý đăng ký Face ID cho nhân viên)
  const [faceModalUser, setFaceModalUser] = useState<User | null>(null);
  const [enrolledFaceForUser, setEnrolledFaceForUser] = useState<FaceFeatures | null>(null);
  const [capturedFacePreview, setCapturedFacePreview] = useState<string | null>(null);
  const [faceCameraReady, setFaceCameraReady] = useState(false);
  const [faceCameraError, setFaceCameraError] = useState(false);
  const [faceCameraErrorMessage, setFaceCameraErrorMessage] = useState('');
  const [activeFaceCameraName, setActiveFaceCameraName] = useState('');
  const [availableFaceCameras, setAvailableFaceCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedFaceCameraId, setSelectedFaceCameraId] = useState<string>('');
  const [faceVersion, setFaceVersion] = useState(0);

  const faceVideoRef = useRef<HTMLVideoElement | null>(null);
  const faceMediaStreamRef = useRef<MediaStream | null>(null);

  // Face ID state & refs cho Modal Thêm Nhân Viên Mới
  const [addFace, setAddFace] = useState<FaceFeatures | null>(null);
  const [isAddCameraActive, setIsAddCameraActive] = useState(false);
  const addVideoRef = useRef<HTMLVideoElement | null>(null);
  const addStreamRef = useRef<MediaStream | null>(null);

  // Face ID state & refs cho Modal Chỉnh Sửa Nhân Viên
  const [editFace, setEditFace] = useState<FaceFeatures | null>(null);
  const [isEditCameraActive, setIsEditCameraActive] = useState(false);
  const editVideoRef = useRef<HTMLVideoElement | null>(null);
  const editStreamRef = useRef<MediaStream | null>(null);

  // Toast feedback
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states - Add
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addDept, setAddDept] = useState<Department>('Box ticket');
  const [addScore, setAddScore] = useState(90);
  const [addPassword, setAddPassword] = useState('123456');

  // Form states - Edit
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDept, setEditDept] = useState<Department>('Box ticket');
  const [editStatus, setEditStatus] = useState<'active' | 'leave' | 'inactive'>('active');
  const [editScore, setEditScore] = useState(90);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchEmployees();
      if (data && data.length > 0) {
        setUsers(data);
      }
    } catch {
      setUsers(getUsers());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers Quản lý Đăng ký Face ID cho nhân viên
  const handleOpenFaceModal = (u: User) => {
    setFaceModalUser(u);
    setEnrolledFaceForUser(getEnrolledFace(u.id));
    setCapturedFacePreview(null);
    setFaceCameraReady(false);
    setFaceCameraError(false);
  };

  const handleCloseFaceModal = () => {
    if (faceMediaStreamRef.current) {
      faceMediaStreamRef.current.getTracks().forEach(t => t.stop());
      faceMediaStreamRef.current = null;
    }
    setFaceModalUser(null);
    setCapturedFacePreview(null);
    setFaceCameraReady(false);
  };

  const initFaceCamera = async (targetDeviceId?: string) => {
    setFaceCameraError(false);
    setFaceCameraReady(false);
    setFaceCameraErrorMessage('');

    await new Promise(r => setTimeout(r, 120));
    const video = faceVideoRef.current;
    if (!video) return;

    const devId = targetDeviceId || selectedFaceCameraId;
    const res = await startWebcamStream(video, devId || undefined);
    if (res.stream) {
      faceMediaStreamRef.current = res.stream;
      setActiveFaceCameraName(res.activeCameraName || 'Webcam máy tính này');
      setFaceCameraReady(true);
      setFaceCameraError(false);

      getAvailableCameras().then(cams => {
        setAvailableFaceCameras(cams);
      });
    } else {
      setFaceCameraError(true);
      setFaceCameraErrorMessage(res.error || 'Không thể kết nối camera của thiết bị này.');
    }
  };

  useEffect(() => {
    if (faceModalUser) {
      initFaceCamera();
    } else {
      if (faceMediaStreamRef.current) {
        faceMediaStreamRef.current.getTracks().forEach(t => t.stop());
        faceMediaStreamRef.current = null;
      }
      setFaceCameraReady(false);
    }

    return () => {
      if (faceMediaStreamRef.current) {
        faceMediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [faceModalUser]);

  const handleCaptureFaceForEmployee = async () => {
    const video = faceVideoRef.current;
    if (!video || !faceCameraReady || !faceModalUser) {
      alert('Camera chưa sẵn sàng!');
      return;
    }

    const face = await extractFaceFromVideo(video);
    if (!face) {
      alert('Chưa nhận diện được khuôn mặt thật. Hãy yêu cầu nhân viên nhìn thẳng vào giữa vòng tròn, bỏ tay/vật che ra và thử lại!');
      return;
    }

    saveEnrolledFace(faceModalUser.id, face);
    setEnrolledFaceForUser(face);
    setFaceVersion(v => v + 1);
    setCapturedFacePreview(face.capturedImage);
    showNotification('success', `Đã chụp và kích hoạt Face ID thành công cho nhân viên ${faceModalUser.name} (${faceModalUser.staffCode})!`);
  };

  const handleRemoveFaceForEmployee = () => {
    if (!faceModalUser) return;
    if (window.confirm(`Bạn có chắc muốn xóa dữ liệu Face ID của nhân viên ${faceModalUser.name}? Nhân viên sẽ không thể quét mặt để điểm danh cho đến khi được kích hoạt lại.`)) {
      removeEnrolledFace(faceModalUser.id);
      setEnrolledFaceForUser(null);
      setFaceVersion(v => v + 1);
      showNotification('success', `Đã xóa dữ liệu Face ID của ${faceModalUser.name}.`);
    }
  };

  // 1. Chỉ lọc danh sách NHÂN VIÊN CHI NHÁNH CỤM RẠP (không hiện nhân viên văn phòng / Manager / HR)
  const branchStaffUsers = users.filter(u => {
    if (u.role === 'manager') return false;
    if (u.department === 'Quản lý Đào tạo & Nhân sự') return false;
    if (u.email && (u.email.toLowerCase().includes('manager') || u.email.toLowerCase().includes('huong.pham'))) return false;
    if (u.name && (u.name.toLowerCase().includes('manager') || u.name.toLowerCase().includes('thu hương') || u.name.toLowerCase().includes('văn phòng'))) return false;
    return true;
  });

  // 2. Bộ lọc tìm kiếm, nghiệp vụ chi nhánh và trạng thái làm việc
  const filteredUsers = branchStaffUsers.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.staffCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));
    
    const userDept = normalizeBranchDept(u.department);
    const matchesDept = selectedDept === 'all' || userDept === selectedDept || u.department === selectedDept;
    const matchesStatus = selectedStatus === 'all' || u.status === selectedStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  // ==========================================
  // Handlers Face ID cho Modal Thêm Nhân Viên Mới
  // ==========================================
  const handleStartAddCamera = async () => {
    setIsAddCameraActive(true);
    await new Promise(r => setTimeout(r, 120));
    const video = addVideoRef.current;
    if (!video) return;
    const res = await startWebcamStream(video);
    if (res.stream) {
      addStreamRef.current = res.stream;
    } else {
      setIsAddCameraActive(false);
      alert(res.error || 'Không thể mở camera trên thiết bị!');
    }
  };

  const handleStopAddCamera = () => {
    if (addStreamRef.current) {
      addStreamRef.current.getTracks().forEach(t => t.stop());
      addStreamRef.current = null;
    }
    setIsAddCameraActive(false);
  };

  const handleCaptureAddFace = async () => {
    const video = addVideoRef.current;
    if (!video) return;
    const face = await extractFaceFromVideo(video);
    if (!face) {
      alert('Chưa nhận diện được khuôn mặt! Vui lòng nhìn thẳng vào giữa khung và thử lại.');
      return;
    }
    setAddFace(face);
    handleStopAddCamera();
    showNotification('success', 'Đã chụp & trích xuất khuôn mặt Face ID thành công!');
  };

  const handleOpenAddModal = () => {
    handleStopAddCamera();
    handleStopEditCamera();
    setAddName('');
    setAddEmail('');
    setAddPhone('');
    setAddDept('Box ticket');
    setAddScore(90);
    setAddPassword('8888');
    setAddFace(null);
    setIsAddCameraActive(false);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    handleStopAddCamera();
    setIsAddModalOpen(false);
    setAddFace(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim()) {
      showNotification('error', 'Vui lòng nhập đầy đủ Họ Tên và Email.');
      return;
    }

    const code = addPhone.trim() || '0901234567';
    const avatar = addFace?.capturedImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    try {
      const created = await createEmployee({
        staffCode: code,
        name: addName.trim(),
        email: addEmail.trim(),
        role: 'staff',
        department: addDept,
        avatar,
        phone: addPhone.trim() || '0901234567',
        joinDate: new Date().toISOString().split('T')[0],
        status: 'active',
        performanceScore: addScore
      });

      if (addFace) {
        saveEnrolledFace(created.id, addFace);
        setFaceVersion(v => v + 1);
      }

      setUsers(prev => [created, ...prev.filter(u => u.id !== created.id)]);
      handleCloseAddModal();
      showNotification('success', `Đã thêm thành công nhân sự ${created.name} (${created.staffCode})${addFace ? ' và kích hoạt Face ID' : ''}!`);
    } catch {
      showNotification('error', 'Có lỗi xảy ra khi tạo nhân sự. Vui lòng thử lại.');
    }
  };

  // ==========================================
  // Handlers Face ID cho Modal Chỉnh Sửa Nhân Viên
  // ==========================================
  const handleStartEditCamera = async () => {
    setIsEditCameraActive(true);
    await new Promise(r => setTimeout(r, 120));
    const video = editVideoRef.current;
    if (!video) return;
    const res = await startWebcamStream(video);
    if (res.stream) {
      editStreamRef.current = res.stream;
    } else {
      setIsEditCameraActive(false);
      alert(res.error || 'Không thể mở camera trên thiết bị!');
    }
  };

  const handleStopEditCamera = () => {
    if (editStreamRef.current) {
      editStreamRef.current.getTracks().forEach(t => t.stop());
      editStreamRef.current = null;
    }
    setIsEditCameraActive(false);
  };

  const handleCaptureEditFace = async () => {
    const video = editVideoRef.current;
    if (!video || !editingUser) return;
    const face = await extractFaceFromVideo(video);
    if (!face) {
      alert('Chưa nhận diện được khuôn mặt! Vui lòng nhìn thẳng vào giữa khung và thử lại.');
      return;
    }
    setEditFace(face);
    saveEnrolledFace(editingUser.id, face);
    setFaceVersion(v => v + 1);
    handleStopEditCamera();
    showNotification('success', `Đã cập nhật dữ liệu Face ID mới cho ${editingUser.name}!`);
  };

  const handleRemoveEditFace = () => {
    if (!editingUser) return;
    if (window.confirm(`Xác nhận xóa dữ liệu Face ID của nhân viên ${editingUser.name}?`)) {
      removeEnrolledFace(editingUser.id);
      setEditFace(null);
      setFaceVersion(v => v + 1);
      showNotification('success', `Đã xóa Face ID của ${editingUser.name}.`);
    }
  };

  const handleOpenEditModal = (u: User) => {
    handleStopAddCamera();
    handleStopEditCamera();
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPhone(u.phone || '');
    setEditDept(normalizeBranchDept(u.department) as Department);
    setEditStatus(u.status || 'active');
    setEditScore(u.performanceScore || 90);
    setEditFace(getEnrolledFace(u.id));
    setIsEditCameraActive(false);
  };

  const handleCloseEditModal = () => {
    handleStopEditCamera();
    setEditingUser(null);
    setEditFace(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim() || !editEmail.trim()) {
      showNotification('error', 'Vui lòng không để trống Họ Tên và Email.');
      return;
    }

    try {
      const updated = await updateEmployee(editingUser.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        department: editDept,
        role: 'staff',
        status: editStatus,
        performanceScore: editScore
      });

      if (updated) {
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updated } : u));
        showNotification('success', `Đã cập nhật thông tin nhân viên ${updated.name} thành công!`);
      } else {
        showNotification('success', `Đã lưu cập nhật thông tin nhân viên.`);
        loadData();
      }
      handleCloseEditModal();
    } catch {
      showNotification('error', 'Lỗi khi cập nhật thông tin nhân viên.');
    }
  };

  // Action: Delete Employee
  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    try {
      await deleteEmployee(deletingUser.id);
      setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
      showNotification('success', `Đã xóa nhân viên ${deletingUser.name} khỏi hệ thống.`);
      setDeletingUser(null);
    } catch {
      showNotification('error', 'Không thể xóa nhân viên này.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quản Lý & Hồ Sơ Nhân Sự Chi Nhánh</h2>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách nhân viên vận hành chi nhánh rạp ({filteredUsers.length} nhân sự)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            title="Làm mới danh sách"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#f4c04a] hover:bg-[#ffd166] text-[#0d1b2e] font-black text-xs rounded-xl shadow-sm hover:shadow transition transform active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#0d1b2e]" />
            <span>+ Thêm Nhân Viên & Cấp Tài Khoản</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar - Tối ưu 3 cột: Tìm kiếm, Nghiệp vụ, Trạng thái (đã loại bỏ Chức vụ) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm theo Tên, SĐT, Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#f4c04a] shadow-xs"
          />
        </div>

        <div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#f4c04a] shadow-xs"
          >
            <option value="all">🍿 Tất cả Nghiệp vụ</option>
            <option value="Box ticket">1. Box ticket: Nhân viên bán vé</option>
            <option value="Concession">2. Concession: Nhân viên bán bắp nước</option>
            <option value="Usher">3. Usher: Nhân viên dọn rạp</option>
            <option value="Processing">4. Processing: Nhân viên chế biến</option>
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#f4c04a] shadow-xs"
          >
            <option value="all">🟢 Tất cả Trạng thái</option>
            <option value="active">Đang làm việc (Active)</option>
            <option value="leave">Nghỉ phép (Leave)</option>
            <option value="inactive">Tạm ngưng (Inactive)</option>
          </select>
        </div>
      </div>

      {/* Employees Table - Đã bỏ cột Chức Vụ, Bộ phận -> Nghiệp Vụ */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 uppercase font-bold text-[10px] text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Mã & Họ Tên</th>
                <th className="px-4 py-3.5">Nghiệp Vụ</th>
                <th className="px-4 py-3.5">Trạng Thái</th>
                <th className="px-4 py-3.5">Liên Hệ</th>
                <th className="px-4 py-3.5 text-center">Đánh Giá (KPI)</th>
                <th className="px-4 py-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Không tìm thấy nhân viên chi nhánh nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const meta = getBranchDeptMeta(u.department);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <img 
                            src={u.avatar} 
                            alt={u.name} 
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 shrink-0" 
                          />
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {getEnrolledFace(u.id) ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  ✓ Face ID
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Chưa Face ID
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-amber-700 font-semibold">{u.staffCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex items-center w-fit text-[10px] font-black px-2 py-0.5 rounded border ${meta.badge}`}>
                            {meta.title}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">{meta.desc}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {u.status === 'leave' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Nghỉ phép
                          </span>
                        ) : u.status === 'inactive' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Tạm ngưng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đang làm việc
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-[11px] font-medium text-slate-800">{u.email}</div>
                        <div className="text-[10px] text-slate-500">{u.phone}</div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-amber-700">
                        <div className="inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>{u.performanceScore || 90} / 100</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút Đăng ký / Quản lý Face ID */}
                          <button
                            onClick={() => handleOpenFaceModal(u)}
                            title={getEnrolledFace(u.id) ? 'Quản lý / Cập nhật Face ID' : 'Chụp đăng ký Face ID cho nhân viên này'}
                            className={`p-1.5 rounded-lg transition border cursor-pointer ${
                              getEnrolledFace(u.id)
                                ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 shadow-xs'
                            }`}
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>

                          {/* Nút Xem */}
                          <button
                            onClick={() => setViewingUser(u)}
                            title="Xem chi tiết hồ sơ"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Nút Sửa */}
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            title="Chỉnh sửa thông tin"
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition border border-amber-200/60 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Nút Xóa */}
                          <button
                            onClick={() => setDeletingUser(u)}
                            title="Xóa nhân sự"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition border border-rose-200/60 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MODAL XEM CHI TIẾT HỒ SƠ */}
      {/* ========================================================================= */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setViewingUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4">
              <img 
                src={viewingUser.avatar} 
                alt={viewingUser.name} 
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-amber-500/30" 
              />
              <div>
                <h3 className="font-extrabold text-base text-slate-900">{viewingUser.name}</h3>
                <span className="text-xs font-mono text-amber-700 font-bold">{viewingUser.staffCode}</span>
                <div className="text-xs text-slate-500 mt-0.5">
                  Nghiệp vụ: <strong className="text-slate-800">{getBranchDeptMeta(viewingUser.department).title}</strong> ({getBranchDeptMeta(viewingUser.department).desc})
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Nghiệp vụ chi nhánh:</span>
                <span className="font-bold text-slate-900">
                  {getBranchDeptMeta(viewingUser.department).title} - {getBranchDeptMeta(viewingUser.department).desc}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Trạng thái làm việc:</span>
                <span className="font-bold text-slate-900">
                  {viewingUser.status === 'leave' ? 'Nghỉ phép' : viewingUser.status === 'inactive' ? 'Tạm ngưng' : 'Đang làm việc'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Email công vụ:</span>
                <span className="font-bold text-slate-900">{viewingUser.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Số điện thoại:</span>
                <span className="font-bold text-slate-900">{viewingUser.phone}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Ngày gia nhập:</span>
                <span className="font-bold text-slate-900">{viewingUser.joinDate}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Đánh giá Năng lực (KPI):</span>
                <span className="font-bold text-amber-700 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  {viewingUser.performanceScore || 90} / 100
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  const u = viewingUser;
                  setViewingUser(null);
                  handleOpenEditModal(u);
                }}
                className="flex-1 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl transition border border-amber-200"
              >
                Chỉnh Sửa Hồ Sơ
              </button>
              <button
                onClick={() => setViewingUser(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MODAL THÊM NHÂN VIÊN MỚI */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Thêm Hồ Sơ Nhân Viên Mới</h3>
                <p className="text-xs text-slate-500">Tạo tài khoản và phân bổ bộ phận làm việc tại cụm rạp</p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Họ và Tên Nhân Viên *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn Hoàng"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Đăng Nhập *</label>
                  <input
                    type="email"
                    required
                    placeholder="hoangnv@aurora.vn"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số Điện Thoại</label>
                  <input
                    type="text"
                    placeholder="0901234567"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nghiệp Vụ Chi Nhánh *</label>
                <select
                  value={addDept}
                  onChange={(e) => setAddDept(e.target.value as Department)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition"
                >
                  <option value="Box ticket">1. Box ticket: Nhân viên bán vé</option>
                  <option value="Concession">2. Concession: Nhân viên bán bắp nước</option>
                  <option value="Usher">3. Usher: Nhân viên dọn rạp</option>
                  <option value="Processing">4. Processing: Nhân viên chế biến</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Điểm KPI Khởi Tạo (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={addScore}
                    onChange={(e) => setAddScore(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mật Khẩu Ban Đầu</label>
                  <input
                    type="text"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-[11px] focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Khu vực Đăng Ký Sinh Trắc Học Face ID Ngay Trong Modal */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-xs">Đăng Ký Sinh Trắc Học Face ID</div>
                      <p className="text-[10px] text-slate-500">Kích hoạt nhận diện khuôn mặt điểm danh cho nhân sự này</p>
                    </div>
                  </div>
                  {addFace ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã có Face ID
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                      Chưa thiết lập
                    </span>
                  )}
                </div>

                {/* Khung Camera trực tiếp nếu đang bật */}
                {isAddCameraActive && (
                  <div className="relative bg-slate-950 rounded-2xl overflow-hidden h-52 flex items-center justify-center border-2 border-purple-500/80 shadow-lg">
                    <video
                      ref={addVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100 block"
                    />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-32 h-40 rounded-[45%] border-2 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.7)]" />
                    </div>
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/80 backdrop-blur-sm rounded-full text-[10px] font-semibold text-white">
                      Nhìn thẳng vào giữa khung tròn
                    </div>
                    <div className="absolute bottom-2 inset-x-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={handleCaptureAddFace}
                        className="flex-1 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" /> Chụp & Sử Dụng Khuôn Mặt
                      </button>
                      <button
                        type="button"
                        onClick={handleStopAddCamera}
                        className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                )}

                {/* Hiển thị khuôn mặt mẫu đã chụp trực tiếp từ camera */}
                {!isAddCameraActive && addFace && (
                  <div className="flex items-center justify-between p-2.5 bg-white border border-emerald-200 rounded-xl shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={addFace.capturedImage}
                        alt="Ảnh Face ID mẫu"
                        className="w-10 h-10 rounded-lg object-cover ring-2 ring-emerald-400 shadow-sm"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          Đã quét Face ID thành công
                        </div>
                        <div className="text-[10px] text-slate-500">Vector 128 chiều sẵn sàng quét điểm danh</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleStartAddCamera}
                        title="Chụp lại bằng camera"
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3 text-purple-600" /> Quét lại
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddFace(null)}
                        title="Xóa khuôn mặt này"
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Nút Đăng ký Face ID trực tiếp bằng Camera */}
                {!isAddCameraActive && !addFace && (
                  <button
                    type="button"
                    onClick={handleStartAddCamera}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Bật Camera Quét Face ID
                  </button>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  Tạo Nhân Viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL CHỈNH SỬA NHÂN VIÊN */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Chỉnh Sửa Hồ Sơ Nhân Viên</h3>
                <p className="text-xs text-slate-500">Mã nhân sự: <span className="font-mono font-bold text-amber-700">{editingUser.staffCode}</span></p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Họ và Tên Nhân Viên *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Công Vụ *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số Điện Thoại</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nghiệp Vụ Chi Nhánh *</label>
                <select
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value as Department)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition"
                >
                  <option value="Box ticket">1. Box ticket: Nhân viên bán vé</option>
                  <option value="Concession">2. Concession: Nhân viên bán bắp nước</option>
                  <option value="Usher">3. Usher: Nhân viên dọn rạp</option>
                  <option value="Processing">4. Processing: Nhân viên chế biến</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trạng Thái Làm Việc</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'leave' | 'inactive')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  >
                    <option value="active">🟢 Đang làm việc</option>
                    <option value="leave">🟡 Nghỉ phép</option>
                    <option value="inactive">⚪ Tạm ngưng hoạt động</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Điểm KPI Năng Lực (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editScore}
                    onChange={(e) => setEditScore(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Khu vực Quản lý / Chỉnh sửa Sinh Trắc Học Face ID Ngay Trong Modal */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-xs">Dữ Liệu Sinh Trắc Học Face ID</div>
                      <p className="text-[10px] text-slate-500">Chỉnh sửa hoặc cập nhật lại mẫu khuôn mặt quét điểm danh</p>
                    </div>
                  </div>
                  {editFace ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã có Face ID
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Chưa đăng ký
                    </span>
                  )}
                </div>

                {/* Khung Camera trực tiếp nếu đang bật để quét lại */}
                {isEditCameraActive && (
                  <div className="relative bg-slate-950 rounded-2xl overflow-hidden h-52 flex items-center justify-center border-2 border-purple-500/80 shadow-lg">
                    <video
                      ref={editVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100 block"
                    />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-32 h-40 rounded-[45%] border-2 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.7)]" />
                    </div>
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/80 backdrop-blur-sm rounded-full text-[10px] font-semibold text-white">
                      Nhìn thẳng vào giữa khung tròn
                    </div>
                    <div className="absolute bottom-2 inset-x-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={handleCaptureEditFace}
                        className="flex-1 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" /> Chụp & Cập Nhật Face ID
                      </button>
                      <button
                        type="button"
                        onClick={handleStopEditCamera}
                        className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                )}

                {/* Hiển thị khuôn mặt hiện tại đã đăng ký */}
                {!isEditCameraActive && editFace && (
                  <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={editFace.capturedImage}
                        alt="Ảnh Face ID mẫu"
                        className="w-10 h-10 rounded-lg object-cover ring-2 ring-emerald-400 shadow-sm"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Mẫu khuôn mặt đang hoạt động
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Cập nhật: {new Date(editFace.timestamp).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleStartEditCamera}
                        title="Chụp lại bằng camera"
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3 text-purple-600" /> Quét lại
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveEditFace}
                        title="Xóa Face ID của nhân viên này"
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Nếu nhân viên chưa có Face ID */}
                {!isEditCameraActive && !editFace && (
                  <button
                    type="button"
                    onClick={handleStartEditCamera}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Bật Camera Quét Face ID
                  </button>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL XÁC NHẬN XÓA NHÂN VIÊN */}
      {/* ========================================================================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-rose-200 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-center space-y-4">
            <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
              <Trash2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-extrabold text-base text-slate-900">Xác Nhận Xóa Nhân Sự?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Hành động này sẽ xóa hoàn toàn tài khoản và hồ sơ nhân sự sau:
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã Nhân Viên:</span>
                <span className="font-mono font-bold text-amber-700">{deletingUser.staffCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Họ và Tên:</span>
                <span className="font-bold text-slate-900">{deletingUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bộ phận:</span>
                <span className="text-slate-700">{deletingUser.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-700">{deletingUser.email}</span>
              </div>
            </div>

            <p className="text-[11px] text-rose-600 font-medium">
              Thao tác này không thể hoàn tác sau khi thực hiện.
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUẢN LÝ ĐĂNG KÝ / CẬP NHẬT FACE ID CHO NHÂN VIÊN */}
      {faceModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 text-purple-800 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Đăng Ký Sinh Trắc Học Face ID</h3>
                  <p className="text-xs text-slate-500">
                    Nhân viên: <strong className="text-slate-900">{faceModalUser.name}</strong> ({faceModalUser.staffCode})
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseFaceModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trạng thái hiện tại của Face ID */}
            <div className="mb-3 flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-slate-600 font-medium">Trạng thái dữ liệu Face ID:</span>
              {enrolledFaceForUser ? (
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã có Face ID trong hệ thống
                </span>
              ) : (
                <span className="font-bold text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Chưa đăng ký Face ID
                </span>
              )}
            </div>

            {/* Camera Source Selector & Indicator */}
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Camera: <strong className="text-purple-700">{activeFaceCameraName || 'Camera thiết bị'}</strong></span>
              </div>

              {availableFaceCameras.length > 1 && (
                <select
                  value={selectedFaceCameraId}
                  onChange={(e) => {
                    setSelectedFaceCameraId(e.target.value);
                    initFaceCamera(e.target.value);
                  }}
                  className="bg-slate-100 text-slate-800 text-[11px] font-medium px-2 py-1 rounded-lg border border-slate-300 focus:outline-none cursor-pointer"
                  title="Chọn thiết bị camera trên máy"
                >
                  {availableFaceCameras.map((cam, idx) => (
                    <option key={cam.deviceId || idx} value={cam.deviceId}>
                      📷 {cam.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Camera Viewport or Captured Photo Preview */}
            {capturedFacePreview ? (
              <div className="relative bg-slate-950 rounded-2xl overflow-hidden p-6 flex flex-col items-center justify-center border-2 border-emerald-500 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                <div className="relative mb-3">
                  <img
                    src={capturedFacePreview}
                    alt="Ảnh Face ID vừa chụp"
                    className="w-36 h-44 rounded-[40%] object-cover ring-4 ring-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.7)]"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg ring-2 ring-white">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-emerald-400 font-extrabold text-sm flex items-center justify-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Đã Kích Hoạt Face ID Thành Công!
                  </div>
                  <p className="text-slate-300 text-xs mt-1">
                    Dữ liệu khuôn mặt mẫu của <strong className="text-white">{faceModalUser?.name}</strong> ({faceModalUser?.staffCode}) đã được kích hoạt trong hệ thống.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative bg-slate-950 rounded-2xl overflow-hidden h-64 flex items-center justify-center border-2 border-slate-800 shadow-inner">
                <video
                  ref={faceVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100 block"
                />

                {/* Error if camera blocked */}
                {faceCameraError && (
                  <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center z-20">
                    <AlertTriangle className="w-10 h-10 text-amber-500 mb-2" />
                    <span className="text-xs text-rose-300 font-semibold mb-2 leading-relaxed max-w-sm">
                      {faceCameraErrorMessage || 'Không thể truy cập camera!'}
                    </span>
                    <button
                      type="button"
                      onClick={() => initFaceCamera()}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Thử Lại Kết Nối Camera
                    </button>
                  </div>
                )}

                {/* Neon oval frame */}
                {!faceCameraError && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                    <div className="w-44 h-52 rounded-[45%] border-2 border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.8)]" />
                  </div>
                )}

                {/* Instruction tag */}
                {!faceCameraError && (
                  <div className="absolute bottom-2.5 px-3 py-1 bg-slate-900/85 backdrop-blur-md rounded-full text-[11px] font-semibold text-white border border-slate-700/80 z-20 text-center">
                    Nhìn thẳng chính diện vào camera
                  </div>
                )}
              </div>
            )}



            {/* Existing face thumbnail preview if any */}
            {!capturedFacePreview && enrolledFaceForUser && (
              <div className="mt-3 p-2.5 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <img
                    src={enrolledFaceForUser.capturedImage}
                    alt="Mặt mẫu hiện tại"
                    className="w-10 h-10 rounded-lg object-cover ring-1 ring-purple-300 shrink-0"
                  />
                  <div>
                    <div className="font-bold text-purple-900">Mặt mẫu Face ID đang lưu</div>
                    <div className="text-[10px] text-purple-600">Đã đăng ký ngày: {new Date(enrolledFaceForUser.timestamp).toLocaleDateString('vi-VN')}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFaceForEmployee}
                  className="px-2.5 py-1 text-rose-600 hover:bg-rose-100 rounded-lg font-bold text-[11px] transition cursor-pointer"
                >
                  Xóa Face ID
                </button>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-4">
              {capturedFacePreview ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedFacePreview(null);
                      initFaceCamera();
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-purple-600" />
                    Chụp Lại Ảnh Khác
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseFaceModal}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Hoàn Tất & Đóng
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCloseFaceModal}
                    className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Đóng
                  </button>

                  <button
                    type="button"
                    onClick={handleCaptureFaceForEmployee}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-amber-300" />
                    {enrolledFaceForUser ? 'Chụp Lại Bằng Webcam Máy Này' : 'Chụp Bằng Webcam Máy Này'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
