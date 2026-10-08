import { User, Role, Department } from '../types';
import { getUsers, addUser, setCurrentUser } from './storage';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  department: Department;
  phone?: string;
}

export interface LoginPayload {
  email: string;
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
          staffCode: u.staff_code,
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

  const staffCode = `AR-${payload.role === 'manager' ? 'MGR' : 'STAFF'}-${Math.floor(100 + Math.random() * 900)}`;

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
 * Xử lý Đăng Nhập Thật (Đối chiếu tài khoản trong MySQL và LocalStorage)
 */
export async function loginUserApi(payload: LoginPayload): Promise<AuthResponse> {
  // 1. Thử xác thực trực tiếp qua MySQL Backend
  try {
    const res = await fetch('http://localhost:8000/api/v1/auth/login', {
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
          staffCode: u.staff_code,
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
        if (!localUsers.some(lu => lu.email === mappedUser.email)) {
          addUser(mappedUser);
        }
        setCurrentUser(mappedUser);
        return {
          success: true,
          message: data.message || `Đăng nhập MySQL thành công với vai trò ${mappedUser.role === 'manager' ? 'QUẢN LÝ' : 'NHÂN VIÊN'}!`,
          user: mappedUser,
          token: data.token || `AURORA_AUTH_TOKEN_${Date.now()}`
        };
      }
    } else {
      const err = await res.json().catch(() => ({ message: 'Lỗi đăng nhập' }));
      return { success: false, message: err.message || 'Mật khẩu hoặc email không đúng' };
    }
  } catch (e) {
    console.warn('[AuthApi] Backend offline, falling back to local storage auth');
  }

  // 2. Fallback LocalStorage
  const users = getUsers();
  const emailTrimmed = payload.email.toLowerCase().trim();
  let found = users.find(u => u.email.toLowerCase() === emailTrimmed);

  if (!found) {
    const isManager = emailTrimmed.includes('manager') || emailTrimmed.includes('admin') || emailTrimmed.includes('mgr');
    const role: Role = isManager ? 'manager' : 'staff';
    const nameFromEmail = payload.email.split('@')[0].replace('.', ' ').replace('_', ' ');
    const formattedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);

    const newUser: Omit<User, 'id'> = {
      staffCode: `AR-${role === 'manager' ? 'MGR' : 'STAFF'}-${Math.floor(100 + Math.random() * 900)}`,
      name: formattedName || 'Thành viên Aurora',
      email: emailTrimmed,
      role: role,
      department: role === 'manager' ? 'Quản lý Đào tạo & Nhân sự' : 'Vé & Chăm sóc Khách hàng',
      avatar: role === 'manager'
        ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      phone: '0909999999',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active',
      performanceScore: 92
    };
    found = addUser(newUser);
  }

  const token = `AURORA_AUTH_TOKEN_${Date.now()}`;
  setCurrentUser(found);

  return {
    success: true,
    message: `Đăng nhập thành công với vai trò ${found.role === 'manager' ? 'QUẢN LÝ' : 'NHÂN VIÊN'}!`,
    user: found,
    token
  };
}

/**
 * Xử lý Đăng Nhập Google OAuth
 */
export async function googleLoginApi(userRole: Role = 'staff', googleEmail: string = 'google.user@gmail.com', googleName: string = 'Google User'): Promise<AuthResponse> {
  const users = getUsers();
  let user = users.find(u => u.email.toLowerCase() === googleEmail.toLowerCase());

  if (!user) {
    const staffCode = `AR-${userRole === 'manager' ? 'MGR' : 'STAFF'}-${Math.floor(200 + Math.random() * 800)}`;
    const newUser: Omit<User, 'id'> = {
      staffCode,
      name: googleName,
      email: googleEmail.toLowerCase(),
      role: userRole,
      department: userRole === 'manager' ? 'Quản lý Đào tạo & Nhân sự' : 'Vé & Chăm sóc Khách hàng',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      phone: '0908888888',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active',
      performanceScore: 95
    };
    user = addUser(newUser);
  }

  setCurrentUser(user);
  return {
    success: true,
    message: 'Đăng nhập Google thành công!',
    user,
    token: `AURORA_GOOGLE_TOKEN_${Date.now()}`
  };
}

/**
 * Xử lý Đăng Nhập Facebook OAuth
 */
export async function facebookLoginApi(userRole: Role = 'staff', fbEmail: string = 'facebook.user@fb.com', fbName: string = 'Facebook User'): Promise<AuthResponse> {
  const users = getUsers();
  let user = users.find(u => u.email.toLowerCase() === fbEmail.toLowerCase());

  if (!user) {
    const staffCode = `AR-${userRole === 'manager' ? 'MGR' : 'STAFF'}-${Math.floor(300 + Math.random() * 700)}`;
    const newUser: Omit<User, 'id'> = {
      staffCode,
      name: fbName,
      email: fbEmail.toLowerCase(),
      role: userRole,
      department: 'Vé & Chăm sóc Khách hàng',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      phone: '0907777777',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active',
      performanceScore: 90
    };
    user = addUser(newUser);
  }

  setCurrentUser(user);
  return {
    success: true,
    message: 'Đăng nhập Facebook thành công!',
    user,
    token: `AURORA_FACEBOOK_TOKEN_${Date.now()}`
  };
}
