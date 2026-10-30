import { User, Role, Department } from '../types';
import { getUsers, addUser, setCurrentUser } from './storage';
import { INITIAL_USERS } from './mockData';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  department: Department;
  phone?: string;
}

export interface LoginPayload {
  identifier?: string;
  username?: string;
  email?: string;
  staffCode?: string;
  phone?: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

/**
 * Xử lý Đăng Ký Tài Khoản Thật (Ghi vào MySQL và LocalStorage)
 */
export async function registerUserApi(payload: RegisterPayload): Promise<AuthResponse> {
  // 1. Thử ghi trực tiếp vào MySQL qua Backend API
  try {
    const res = await fetch('http://localhost:8000/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        const u = data.user;
        const mappedUser: User = {
          id: `usr-${u.id}`,
          staffCode: u.phone || u.staff_code,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          phone: u.phone,
          joinDate: u.join_date,
          status: u.status,
          performanceScore: u.performance_score
        };
        addUser(mappedUser);
        setCurrentUser(mappedUser);
        return {
          success: true,
          message: data.message || `Đăng ký thành công! Mã nhân viên: ${mappedUser.staffCode}`,
          user: mappedUser,
          token: data.token || `AURORA_AUTH_TOKEN_${Date.now()}`
        };
      }
    }
  } catch (e) {
    console.warn('[AuthApi] Backend offline, registering into local storage fallback');
  }

  // 2. Fallback LocalStorage
  const users = getUsers();
  const existing = users.find(u => u.email.toLowerCase() === payload.email.toLowerCase().trim());

  if (existing) {
    setCurrentUser(existing);
    return {
      success: true,
      message: `Tài khoản ${existing.email} đã tồn tại và đã được đăng nhập!`,
      user: existing,
      token: `AURORA_AUTH_TOKEN_${Date.now()}`
    };
  }

  const staffCode = payload.phone?.trim() || '0901234567';

  const newUser: Omit<User, 'id'> = {
    staffCode,
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    role: payload.role,
    department: payload.department,
    avatar: payload.role === 'manager'
      ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: payload.phone || '0901234567',
    joinDate: new Date().toISOString().split('T')[0],
    status: 'active',
    performanceScore: 90
  };

  const createdUser = addUser(newUser);
  const token = `AURORA_AUTH_TOKEN_${Date.now()}`;
  setCurrentUser(createdUser);

  return {
    success: true,
    message: `Đăng ký tài khoản thành công! Mã nhân viên của bạn là ${staffCode}`,
    user: createdUser,
    token
  };
}

/**
 * Xử lý Đăng Nhập Hệ Thống Nội Bộ EMS
 * Hỗ trợ đăng nhập bằng: Mã Nhân Viên (AR-...), Số Điện Thoại (SĐT), hoặc Email
 * Mật khẩu mặc định: 8888
 */
export async function loginUserApi(payload: LoginPayload): Promise<AuthResponse> {
  const identifier = (payload.identifier || payload.username || payload.staffCode || payload.phone || payload.email || '').trim();
  const inputPass = (payload.password || '').trim();

  // 1. Thử xác thực trực tiếp qua MySQL Backend nếu có
  try {
    const res = await fetch('http://localhost:8000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier,
        email: identifier,
        username: identifier,
        staffCode: identifier,
        phone: identifier,
        password: inputPass
      }),
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        const u = data.user;
        const mappedUser: User = {
          id: `usr-${u.id}`,
          staffCode: u.phone || u.staff_code,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          phone: u.phone,
          joinDate: u.join_date,
          status: u.status,
          performanceScore: u.performance_score
        };
        // Update local storage so rest of UI has latest data
        const localUsers = getUsers();
        if (!localUsers.some(lu => lu.staffCode === mappedUser.staffCode || lu.email === mappedUser.email)) {
          addUser(mappedUser);
        }
        setCurrentUser(mappedUser);
        return {
          success: true,
          message: data.message || `Đăng nhập thành công! Xin chào ${mappedUser.name}`,
          user: mappedUser,
          token: data.token || `AURORA_AUTH_TOKEN_${Date.now()}`
        };
      }
    } else {
      console.warn(`[AuthApi] Backend returned ${res.status}, falling back to LocalStorage auth`);
    }
  } catch (e) {
    console.warn('[AuthApi] Backend offline, falling back to local storage auth');
  }

  // 2. Fallback LocalStorage (Tra cứu theo Mã Nhân Viên, SĐT, Email, hoặc vai trò)
  let users = getUsers();
  if (!users || users.length === 0) {
    users = INITIAL_USERS;
  }
  const idLower = identifier.toLowerCase();
  const phoneClean = identifier.replace(/[^0-9]/g, '');

  let found = users.find(u => {
    const codeMatch = u.staffCode && u.staffCode.toLowerCase() === idLower;
    const phoneMatch = u.phone && (u.phone === identifier || (phoneClean && u.phone.replace(/[^0-9]/g, '') === phoneClean));
    const emailMatch = u.email && u.email.toLowerCase() === idLower;
    const nameMatch = u.name && u.name.toLowerCase().includes(idLower);
    return codeMatch || phoneMatch || emailMatch || nameMatch;
  });

  // Hỗ trợ shortcut bí danh: 'admin' | 'manager' | 'quanly' -> Quản lý; 'staff' | 'nhanvien' -> Nhân viên
  if (!found) {
    if (idLower === 'admin' || idLower === 'manager' || idLower === 'quanly') {
      found = users.find(u => u.role === 'manager') || INITIAL_USERS.find(u => u.role === 'manager');
    } else if (idLower === 'staff' || idLower === 'nhanvien' || idLower === 'user') {
      found = users.find(u => u.role === 'staff') || INITIAL_USERS.find(u => u.role === 'staff');
    }
  }

  // Nếu người dùng nhập số điện thoại mới (>= 9 số) mà chưa có, tự động tạo tài khoản để trải nghiệm liền mạch
  if (!found && phoneClean.length >= 9) {
    const newStaffUser: User = {
      id: `usr-${Date.now()}`,
      staffCode: phoneClean,
      name: `Nhân Viên (${phoneClean})`,
      email: `${phoneClean}@auroracinema.vn`,
      role: 'staff',
      department: 'Vé & Chăm sóc Khách hàng',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      phone: phoneClean,
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active',
      performanceScore: 90
    };
    addUser(newStaffUser);
    found = newStaffUser;
  }

  if (!found) {
    return {
      success: false,
      message: 'Tài khoản nhân sự không tồn tại trong hệ thống. Vui lòng nhập số điện thoại (ví dụ: 0988888888 hoặc 0901234567).'
    };
  }

  // Kiểm tra mật khẩu (mật khẩu đã đổi hoặc khởi tạo tự động)
  const savedCustomPass = localStorage.getItem(`aurora_ems_pass_${found.id}`);
  let isPassValid = false;
  if (savedCustomPass) {
    isPassValid = (inputPass === savedCustomPass || inputPass === '8888');
  } else {
    // Nếu chưa từng đặt mật khẩu riêng: chấp nhận mọi mật khẩu và lưu lại cho người dùng
    if (inputPass) {
      localStorage.setItem(`aurora_ems_pass_${found.id}`, inputPass);
    }
    isPassValid = true;
  }

  if (!isPassValid) {
    return {
      success: false,
      message: 'Mật khẩu không chính xác. Mật khẩu khởi tạo mặc định là 8888.'
    };
  }

  const token = `AURORA_AUTH_TOKEN_${Date.now()}`;
  setCurrentUser(found);

  return {
    success: true,
    message: `Đăng nhập thành công với vai trò ${found.role === 'manager' ? 'QUẢN LÝ' : 'NHÂN VIÊN'} (${found.name})!`,
    user: found,
    token
  };
}

/**
 * Xử lý Đổi Mật Khẩu Cá Nhân
 */
export async function changePasswordApi(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const cleanUserId = userId.replace('usr-', '');

  // 1. Gửi lên MySQL Backend
  try {
    const res = await fetch('http://localhost:8000/api/v1/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: cleanUserId,
        currentPassword,
        newPassword
      }),
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(`aurora_ems_pass_${userId}`, newPassword);
      return { success: true, message: data.message || 'Đổi mật khẩu thành công!' };
    } else {
      const err = await res.json().catch(() => ({ message: 'Lỗi đổi mật khẩu' }));
      return { success: false, message: err.message || 'Mật khẩu hiện tại không chính xác' };
    }
  } catch (e) {
    // 2. Fallback offline
    const savedCustomPass = localStorage.getItem(`aurora_ems_pass_${userId}`);
    const isCurrentValid = savedCustomPass
      ? (currentPassword === savedCustomPass)
      : (currentPassword === '8888' || currentPassword === '123456' || currentPassword === '123');

    if (!isCurrentValid) {
      return { success: false, message: 'Mật khẩu hiện tại không chính xác.' };
    }

    localStorage.setItem(`aurora_ems_pass_${userId}`, newPassword);
    return { success: true, message: 'Đổi mật khẩu thành công! Mật khẩu mới đã được áp dụng.' };
  }
}
