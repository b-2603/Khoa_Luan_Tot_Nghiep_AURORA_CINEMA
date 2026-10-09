<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Laravel\Socialite\Facades\Socialite;
use App\Models\User;

class AuthController extends Controller
{
    /**
     * 1. ĐĂNG KÝ BẰNG EMAIL + MẬT KHẨU (Email Registration)
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6|confirmed', // Kiểm tra password_confirmation
            'role' => 'required|in:staff,manager',
            'department' => 'required|string',
            'phone' => 'nullable|string'
        ], [
            'email.required' => 'Vui lòng nhập địa chỉ Email.',
            'email.email' => 'Email không đúng định dạng.',
            'email.unique' => 'Địa chỉ Email này đã tồn tại trên hệ thống.',
            'password.required' => 'Vui lòng nhập mật khẩu.',
            'password.min' => 'Mật khẩu phải có tối thiểu 6 ký tự.',
            'password.confirmed' => 'Xác nhận mật khẩu không trùng khớp.'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Dữ liệu đăng ký không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $role = $request->role;
        $staffCode = 'AR-' . ($role === 'manager' ? 'MGR' : 'STAFF') . '-' . rand(100, 999);

        // Tạo User mới - Password được Hash bảo mật, KHÔNG lưu plaintext
        $user = User::create([
            'staff_code' => $staffCode,
            'name' => trim($request->name),
            'email' => strtolower(trim($request->email)),
            'password' => Hash::make($request->password),
            'role' => $role,
            'department' => $request->department,
            'phone' => $request->phone ?? '0901234567',
            'avatar' => $role === 'manager'
                ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
                : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            'join_date' => now()->toDateString(),
            'status' => 'active',
            'performance_score' => 90
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.',
            'data' => [
                'user' => $user,
                'token' => 'Bearer_Token_EMS_' . md5($user->email . time())
            ]
        ], 201);
    }

    /**
     * 2. ĐĂNG NHẬP BẰNG EMAIL + MẬT KHẨU (Email Login)
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string'
        ], [
            'email.required' => 'Vui lòng nhập Email.',
            'email.email' => 'Email không đúng định dạng.',
            'password.required' => 'Vui lòng nhập Mật khẩu.'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Vui lòng kiểm tra lại định dạng dữ liệu.',
                'errors' => $validator->errors()
            ], 422);
        }

        $email = strtolower(trim($request->email));
        $user = User::where('email', $email)->first();

        // 1. Kiểm tra tài khoản có tồn tại hay không
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tài khoản Email không tồn tại trong hệ thống.'
            ], 404);
        }

        // 2. Kiểm tra mật khẩu (Hash::check)
        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Mật khẩu nhập vào không chính xác.'
            ], 401);
        }

        // 3. Kiểm tra trạng thái tài khoản (status)
        if (isset($user->status) && $user->status !== 'active') {
            return response()->json([
                'status' => 'error',
                'message' => 'Tài khoản của bạn đã bị khóa hoặc tạm ngưng hoạt động.'
            ], 403);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Đăng nhập thành công!',
            'data' => [
                'user' => $user,
                'token' => 'Bearer_Token_EMS_' . md5($user->email . time())
            ]
        ]);
    }

    /**
     * 3. GOOGLE OAUTH REDIRECT & CALLBACK (Laravel Socialite)
     */
    public function googleRedirect()
    {
        try {
            return Socialite::driver('google')->redirect();
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không thể kết nối đến Google OAuth: ' . $e->getMessage()
            ], 500);
        }
    }

    public function googleCallback(Request $request)
    {
        try {
            if ($request->has('error') || $request->has('denied')) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Đăng nhập Google đã bị hủy bởi người dùng.'
                ], 400);
            }

            $googleUser = Socialite::driver('google')->user();
            return $this->processSocialAuthUser($googleUser, 'google');

        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Lỗi xác thực OAuth từ Google: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * 4. FACEBOOK OAUTH REDIRECT & CALLBACK (Laravel Socialite)
     */
    public function facebookRedirect()
    {
        try {
            return Socialite::driver('facebook')->redirect();
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không thể kết nối đến Facebook OAuth: ' . $e->getMessage()
            ], 500);
        }
    }

    public function facebookCallback(Request $request)
    {
        try {
            if ($request->has('error') || $request->has('error_code')) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Đăng nhập Facebook đã bị hủy bởi người dùng.'
                ], 400);
            }

            $facebookUser = Socialite::driver('facebook')->user();
            return $this->processSocialAuthUser($facebookUser, 'facebook');

        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Lỗi xác thực OAuth từ Facebook: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * HÀM XỬ LÝ LIÊN KẾT TÀI KHOẢN & KHÔNG TẠO TRÙNG EMAIL (Account Linking Logic)
     */
    protected function processSocialAuthUser($socialUser, string $provider)
    {
        $socialId = $socialUser->getId();
        $name = $socialUser->getName() ?? $socialUser->getNickname() ?? 'Mạng xã hội User';
        $email = $socialUser->getEmail() ? strtolower(trim($socialUser->getEmail())) : null;
        $avatar = $socialUser->getAvatar() ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

        $providerIdColumn = $provider === 'google' ? 'google_id' : 'facebook_id';

        // 1. Kiểm tra nếu Provider ID đã tồn tại -> Đăng nhập ngay
        $existingByProvider = User::where($providerIdColumn, $socialId)->first();
        if ($existingByProvider) {
            if (isset($existingByProvider->status) && $existingByProvider->status !== 'active') {
                return response()->json(['status' => 'error', 'message' => 'Tài khoản của bạn đã bị tạm khóa.'], 403);
            }
            return response()->json([
                'status' => 'success',
                'message' => "Đăng nhập thành công bằng tài khoản {$provider}!",
                'data' => [
                    'user' => $existingByProvider,
                    'token' => "Bearer_Token_EMS_{$provider}_" . md5($existingByProvider->email . time())
                ]
            ]);
        }

        // 2. Nếu Provider ID chưa có nhưng EMAIL đã tồn tại -> LIÊN KẾT TÀI KHOẢN HẠN CHẾ TRÙNG LẶP
        if ($email) {
            $existingByEmail = User::where('email', $email)->first();
            if ($existingByEmail) {
                // Liên kết ID vào User hiện tại, KHÔNG tạo User mới trùng lặp!
                $existingByEmail->$providerIdColumn = $socialId;
                if (empty($existingByEmail->avatar)) {
                    $existingByEmail->avatar = $avatar;
                }
                $existingByEmail->save();

                return response()->json([
                    'status' => 'success',
                    'message' => "Đã liên kết thành công tài khoản {$provider} với Email {$email} hiện tại!",
                    'data' => [
                        'user' => $existingByEmail,
                        'token' => "Bearer_Token_EMS_{$provider}_" . md5($existingByEmail->email . time())
                    ]
                ]);
            }
        }

        // 3. Nếu chưa có cả Provider ID lẫn Email -> Tạo User mới và lưu Provider ID
        $role = 'staff';
        $staffCode = 'AR-STAFF-' . rand(100, 999);

        $newUser = User::create([
            'staff_code' => $staffCode,
            'name' => $name,
            'email' => $email ?? "{$provider}_{$socialId}@auroracinema.vn",
            'password' => Hash::make(bin2hex(random_bytes(16))), // Mật khẩu ngẫu nhiên bảo mật, không lưu plaintext/OAuth pass
            $providerIdColumn => $socialId,
            'avatar' => $avatar,
            'role' => $role,
            'department' => 'Vé & Chăm sóc Khách hàng',
            'phone' => '0901234567',
            'join_date' => now()->toDateString(),
            'status' => 'active',
            'performance_score' => 90
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Tạo tài khoản mới thành công qua {$provider}!",
            'data' => [
                'user' => $newUser,
                'token' => "Bearer_Token_EMS_{$provider}_" . md5($newUser->email . time())
            ]
        ], 201);
    }
}
