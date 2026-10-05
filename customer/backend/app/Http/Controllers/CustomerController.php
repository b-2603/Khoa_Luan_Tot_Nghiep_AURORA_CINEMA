<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class CustomerController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->publicUser($request->session()->get('user_id'))]);
    }

    public function movies(Request $request): JsonResponse
    {
        $query = DB::table('movies')->select([
            'id', 'title', 'description', 'duration_minutes', 'age_rating', 'format',
            'poster_url', 'trailer_url', 'status', 'release_date',
        ])->orderBy('release_date');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return response()->json(['movies' => $query->get()->map(fn ($movie) => [
            'id' => $movie->id, 'title' => $movie->title, 'description' => $movie->description,
            'durationMinutes' => $movie->duration_minutes, 'ageRating' => $movie->age_rating,
            'format' => $movie->format, 'posterUrl' => $movie->poster_url, 'trailerUrl' => $movie->trailer_url,
            'status' => $movie->status, 'releaseDate' => $movie->release_date,
        ])]);
    }

    public function movieDetail(int $movie): JsonResponse
    {
        $item = DB::table('movies')->where('id', $movie)->first();
        if (!$item) return response()->json(['message' => 'Không tìm thấy phim.'], 404);

        return response()->json(['movie' => [
            'id' => $item->id, 'title' => $item->title, 'description' => $item->description,
            'durationMinutes' => $item->duration_minutes, 'ageRating' => $item->age_rating,
            'format' => $item->format, 'posterUrl' => $item->poster_url, 'trailerUrl' => $item->trailer_url,
            'status' => $item->status, 'releaseDate' => $item->release_date,
        ]]);
    }

    public function theaters(): JsonResponse
    {
        $theaters = DB::table('theaters')->orderBy('name')->get();
        $screens = DB::table('screens')->orderBy('name')->get()->groupBy('theater_id');
        $showtimes = $this->showtimesQuery()->get()->groupBy('theater_id');

        return response()->json(['theaters' => $theaters->map(fn ($theater) => [
            'id' => $theater->id, 'name' => $theater->name, 'address' => $theater->address,
            'city' => $theater->city, 'screens' => ($screens[$theater->id] ?? collect())->values(),
            'showtimes' => ($showtimes[$theater->id] ?? collect())->values(),
        ])]);
    }

    public function showtimes(Request $request): JsonResponse
    {
        $query = $this->showtimesQuery();

        if ($request->filled('theater_id')) {
            $query->where('screens.theater_id', (int) $request->input('theater_id'));
        }
        if ($request->filled('date')) {
            $query->whereDate('showtimes.starts_at', $request->string('date')->toString());
        }

        return response()->json(['showtimes' => $query->orderBy('showtimes.starts_at')->get()]);
    }

    public function seats(int $showtime): JsonResponse
    {
        $item = DB::table('showtimes')->where('id', $showtime)->where('status', 'OPEN')->first();
        if (!$item) return response()->json(['message' => 'Suất chiếu không tồn tại hoặc đã đóng.'], 404);

        $seats = DB::table('seats')->select('seats.*')->selectRaw(
            "CASE WHEN EXISTS (SELECT 1 FROM booking_seats bs INNER JOIN bookings b ON b.id = bs.booking_id WHERE bs.seat_id = seats.id AND bs.showtime_id = ? AND b.status NOT IN ('CANCELLED', 'EXPIRED')) THEN 0 ELSE 1 END AS is_available",
            [$showtime]
        )->where('screen_id', $item->screen_id)
            ->orderBy('seat_row')->orderBy('seat_number')->get();

        return response()->json(['showtime_id' => $showtime, 'seats' => $seats]);
    }

    public function createBooking(Request $request): JsonResponse
    {
        $userId = $request->session()->get('user_id');
        if (!$userId) return response()->json(['message' => 'Vui lòng đăng nhập để đặt vé.'], 401);

        $data = $request->validate([
            'showtimeId' => ['required', 'integer'],
            'seatIds' => ['required', 'array', 'min:1'],
            'seatIds.*' => ['integer'],
        ]);

        try {
            $booking = DB::transaction(function () use ($data, $userId): array {
                $showtime = DB::table('showtimes')->where('id', $data['showtimeId'])
                    ->where('status', 'OPEN')->lockForUpdate()->first();
                if (!$showtime) throw new \RuntimeException('Suất chiếu không còn mở.');

                $seatIds = array_values(array_unique(array_map('intval', $data['seatIds'])));
                $validSeats = DB::table('seats')->where('screen_id', $showtime->screen_id)
                    ->whereIn('id', $seatIds)->lockForUpdate()->get();
                if ($validSeats->count() !== count($seatIds)) throw new \RuntimeException('Ghế đã chọn không hợp lệ.');

                $taken = DB::table('booking_seats')->where('showtime_id', $showtime->id)
                    ->whereIn('seat_id', $seatIds)->lockForUpdate()->exists();
                if ($taken) throw new \RuntimeException('Một hoặc nhiều ghế vừa được đặt bởi khách khác.');

                $bookingId = DB::table('bookings')->insertGetId([
                    'user_id' => $userId, 'showtime_id' => $showtime->id,
                    'booking_code' => 'AUR-'.strtoupper(Str::random(8)),
                    'total_amount' => $showtime->ticket_price * count($seatIds),
                    'status' => 'PENDING', 'created_at' => now(), 'updated_at' => now(),
                ]);
                foreach ($validSeats as $seat) {
                    DB::table('booking_seats')->insert([
                        'booking_id' => $bookingId, 'showtime_id' => $showtime->id,
                        'seat_id' => $seat->id, 'price' => $showtime->ticket_price,
                    ]);
                }
                return ['id' => $bookingId, 'code' => DB::table('bookings')->where('id', $bookingId)->value('booking_code'),
                    'totalAmount' => $showtime->ticket_price * count($seatIds), 'seatIds' => $seatIds];
            });
            return response()->json(['booking' => $booking], 201);
        } catch (\RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 409);
        }
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fullName' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:180'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        if (DB::table('users')->where('email', $data['email'])->exists()) {
            return response()->json(['message' => 'Email đã được sử dụng.'], 422);
        }

        $id = DB::table('users')->insertGetId([
            'full_name' => $data['fullName'], 'email' => $data['email'],
            'password_hash' => Hash::make($data['password']), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $request->session()->put('user_id', $id);

        return response()->json(['user' => $this->publicUser($id)], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $user = DB::table('users')->where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password_hash)) {
            return response()->json(['message' => 'Email hoặc mật khẩu không đúng.'], 401);
        }

        $request->session()->put('user_id', $user->id);
        return response()->json(['user' => $this->publicUser($user->id)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['user' => null]);
    }

    private function getOauthConfig(string $provider): array
    {
        $dbConfigs = [];
        try {
            if (Schema::hasTable('system_configs')) {
                $rows = DB::table('system_configs')->where('config_key', 'like', 'oauth_%')->get();
                foreach ($rows as $row) {
                    $dbConfigs[$row->config_key] = $row->config_value;
                }
            }
        } catch (\Throwable $e) {
            // Ignore DB error and fallback to config/env
        }

        $settings = config("oauth.{$provider}") ?? [];
        $clientId = !empty($dbConfigs["oauth_{$provider}_client_id"]) ? $dbConfigs["oauth_{$provider}_client_id"] : ($settings['client_id'] ?? '');
        $clientSecret = !empty($dbConfigs["oauth_{$provider}_client_secret"]) ? $dbConfigs["oauth_{$provider}_client_secret"] : ($settings['client_secret'] ?? '');
        $redirectUri = !empty($dbConfigs["oauth_{$provider}_redirect_uri"]) ? $dbConfigs["oauth_{$provider}_redirect_uri"] : ($settings['redirect_uri'] ?? '');

        $sandboxVal = $dbConfigs['oauth_sandbox_enabled'] ?? env('OAUTH_SANDBOX_ENABLED', '1');
        $sandboxEnabled = ($sandboxVal === '1' || $sandboxVal === 'true' || $sandboxVal === true || $sandboxVal === 1);

        $isLive = (!empty($clientId) && !empty($clientSecret) && !str_contains($clientId, 'demo'));
        $isSandbox = !$isLive && $sandboxEnabled;

        return [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
            'graph_version' => $settings['graph_version'] ?? 'v25.0',
            'is_live' => $isLive,
            'is_sandbox' => $isSandbox,
            'configured' => $isLive || $isSandbox,
        ];
    }

    public function oauthStart(Request $request): JsonResponse
    {
        $provider = $request->string('provider')->toString();
        if (!in_array($provider, ['google', 'facebook'], true)) {
            return response()->json(['message' => 'Nhà cung cấp OAuth không hợp lệ.'], 422);
        }

        $settings = $this->getOauthConfig($provider);
        if (empty($settings['configured'])) {
            return response()->json(['message' => 'Đăng nhập '.ucfirst($provider).' chưa được cấu hình trên máy chủ.'], 503);
        }

        $this->ensureOauthSchema();
        $state = Str::random(64);
        $pending = ['state' => $state, 'created_at' => now()->timestamp, 'is_sandbox' => !empty($settings['is_sandbox'])];
        $pending['attempt_id'] = DB::table('oauth_login_attempts')->insertGetId([
            'provider' => $provider, 'state_hash' => hash('sha256', $state), 'status' => 'started',
            'ip_address_hash' => hash('sha256', ($request->ip() ?? '').'|'.env('OAUTH_AUDIT_SALT', 'aurora-cinema')),
            'user_agent' => Str::limit((string) $request->userAgent(), 255, ''), 'created_at' => now(),
        ]);

        if (!empty($settings['is_live'])) {
            if ($provider === 'google') {
                $pending['code_verifier'] = Str::random(96);
                $url = 'https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query([
                    'client_id' => $settings['client_id'], 'redirect_uri' => $settings['redirect_uri'],
                    'response_type' => 'code', 'scope' => 'openid email profile', 'state' => $state,
                    'code_challenge' => rtrim(strtr(base64_encode(hash('sha256', $pending['code_verifier'], true)), '+/', '-_'), '='),
                    'code_challenge_method' => 'S256',
                    'prompt' => 'select_account',
                ]);
            } else {
                $version = preg_match('/^v\d+\.\d+$/', $settings['graph_version']) ? $settings['graph_version'] : 'v25.0';
                $url = "https://www.facebook.com/{$version}/dialog/oauth?".http_build_query([
                    'client_id' => $settings['client_id'], 'redirect_uri' => $settings['redirect_uri'],
                    'response_type' => 'code', 'scope' => 'email,public_profile', 'state' => $state,
                ]);
            }
        } else {
            $url = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php?'.http_build_query([
                'action' => 'oauth_consent',
                'provider' => $provider,
                'state' => $state,
            ]);
        }

        $request->session()->put("oauth.{$provider}", $pending);
        return response()->json(['provider' => $provider, 'authorizationUrl' => $url]);
    }

    public function oauthStatus(): JsonResponse
    {
        return response()->json(['providers' => collect(['google', 'facebook'])->mapWithKeys(function (string $provider): array {
            $settings = $this->getOauthConfig($provider);
            return [$provider => [
                'configured' => !empty($settings['configured']),
                'mode' => !empty($settings['is_live']) ? 'live' : 'sandbox'
            ]];
        })]);
    }

    public function oauthCallback(Request $request)
    {
        $provider = $request->string('provider')->toString();
        if (!in_array($provider, ['google', 'facebook'], true)) {
            return $this->oauthRedirect('error', '', 'Nhà cung cấp đăng nhập không hợp lệ.');
        }
        $pending = $request->session()->pull("oauth.{$provider}");
        $attemptId = (int) ($pending['attempt_id'] ?? 0);
        if ($request->filled('error')) {
            $this->finishOauthAttempt($attemptId, 'failed', null, null, 'access_denied', 'Khách hàng hủy hoặc từ chối đăng nhập.');
            return $this->oauthRedirect('error', $provider, 'Bạn đã hủy hoặc từ chối yêu cầu đăng nhập.');
        }
        if (!$pending || !$request->filled('state') || !hash_equals((string) $pending['state'], $request->string('state')->toString())
            || now()->timestamp - (int) $pending['created_at'] > 600) {
            $this->finishOauthAttempt($attemptId, 'failed', null, null, 'invalid_state', 'Phiên OAuth không hợp lệ hoặc đã hết hạn.');
            return $this->oauthRedirect('error', $provider, 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.');
        }

        try {
            $settings = config("oauth.{$provider}");
            if ($provider === 'google') {
                $token = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                    'client_id' => $settings['client_id'], 'client_secret' => $settings['client_secret'],
                    'redirect_uri' => $settings['redirect_uri'], 'code' => $request->string('code')->toString(),
                    'grant_type' => 'authorization_code', 'code_verifier' => $pending['code_verifier'] ?? '',
                ])->throw()->json();
                $profile = Http::withToken($token['access_token'])
                    ->get('https://openidconnect.googleapis.com/v1/userinfo')->throw()->json();
                if (array_key_exists('email_verified', $profile) && !$profile['email_verified']) {
                    throw new \RuntimeException('Email Google chưa được xác minh.');
                }
                $identity = ['id' => $profile['sub'] ?? '', 'email' => $profile['email'] ?? '',
                    'name' => $profile['name'] ?? '', 'avatar' => $profile['picture'] ?? ''];
            } else {
                $version = preg_match('/^v\d+\.\d+$/', $settings['graph_version']) ? $settings['graph_version'] : 'v25.0';
                $token = Http::asForm()->post("https://graph.facebook.com/{$version}/oauth/access_token", [
                    'client_id' => $settings['client_id'], 'client_secret' => $settings['client_secret'],
                    'redirect_uri' => $settings['redirect_uri'], 'code' => $request->string('code')->toString(),
                ])->throw()->json();
                $profile = Http::get("https://graph.facebook.com/{$version}/me", [
                    'fields' => 'id,name,email,picture.type(large)', 'access_token' => $token['access_token'],
                ])->throw()->json();
                $identity = ['id' => $profile['id'] ?? '', 'email' => $profile['email'] ?? '',
                    'name' => $profile['name'] ?? '', 'avatar' => $profile['picture']['data']['url'] ?? ''];
            }

            $userId = $this->loginSocialIdentity($provider, $identity);
            $request->session()->regenerate();
            $request->session()->put('user_id', $userId);
            $this->finishOauthAttempt($attemptId, 'succeeded', $userId, (string) $identity['id']);
            return $this->oauthRedirect('success', $provider);
        } catch (\Throwable $exception) {
            report($exception);
            $this->finishOauthAttempt($attemptId, 'failed', null, null, 'oauth_callback_failed', $exception->getMessage());
            return $this->oauthRedirect('error', $provider, $exception instanceof \RuntimeException
                ? $exception->getMessage() : 'Không thể xác thực tài khoản mạng xã hội. Vui lòng thử lại.');
        }
    }

    private function loginSocialIdentity(string $provider, array $identity): int
    {
        $email = strtolower(trim((string) ($identity['email'] ?? '')));
        $providerId = trim((string) ($identity['id'] ?? ''));
        if ($providerId === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \RuntimeException('Tài khoản mạng xã hội chưa cung cấp email hợp lệ cho Aurora.');
        }

        $this->ensureOauthSchema();
        return DB::transaction(function () use ($provider, $identity, $email, $providerId): int {
            $account = DB::table('oauth_accounts')->where('provider', $provider)
                ->where('provider_user_id', $providerId)->lockForUpdate()->first();
            $userId = $account?->user_id;
            if (!$userId) {
                $userId = DB::table('users')->where('email', $email)->lockForUpdate()->value('id');
            }
            if (!$userId) {
                $name = Str::limit(trim((string) ($identity['name'] ?? '')) ?: Str::before($email, '@'), 120, '');
                $newUser = [
                    'full_name' => $name, 'email' => $email, 'password_hash' => Hash::make(Str::random(64)),
                    'created_at' => now(), 'updated_at' => now(),
                ];
                if (Schema::hasColumn('users', 'username')) $newUser['username'] = $this->uniqueOauthUsername($provider, $providerId);
                if (Schema::hasColumn('users', 'role')) $newUser['role'] = 'customer';
                if (Schema::hasColumn('users', 'status')) $newUser['status'] = 'active';
                if (Schema::hasColumn('users', 'last_login')) $newUser['last_login'] = now();
                if (Schema::hasColumn('users', 'theater_id')) $newUser['theater_id'] = 1;
                $userId = DB::table('users')->insertGetId($newUser);
            }

            $user = DB::table('users')->where('id', $userId)->lockForUpdate()->first();
            if (!$user || (isset($user->role) && $user->role !== 'customer')) throw new \RuntimeException('Liên kết OAuth không thuộc tài khoản khách hàng hợp lệ.');
            if (isset($user->status) && $user->status !== 'active') throw new \RuntimeException('Tài khoản Aurora đang bị khóa hoặc ngừng hoạt động.');

            $otherIdentity = DB::table('oauth_accounts')->where('user_id', $userId)
                ->where('provider', $provider)->where('provider_user_id', '<>', $providerId)->exists();
            if ($otherIdentity) throw new \RuntimeException('Tài khoản Aurora này đã liên kết với một tài khoản '.ucfirst($provider).' khác.');

            DB::table('oauth_accounts')->upsert([[
                'user_id' => $userId, 'provider' => $provider, 'provider_user_id' => $providerId,
                'provider_email' => $email, 'provider_name' => Str::limit((string) ($identity['name'] ?? ''), 120, ''),
                'avatar_url' => Str::limit((string) ($identity['avatar'] ?? ''), 500, ''),
                'created_at' => now(), 'updated_at' => now(), 'last_login_at' => now(),
            ]], ['provider', 'provider_user_id'], ['provider_email', 'provider_name', 'avatar_url', 'updated_at', 'last_login_at']);
            $loginUpdate = ['updated_at' => now()];
            if (Schema::hasColumn('users', 'last_login')) $loginUpdate['last_login'] = now();
            DB::table('users')->where('id', $userId)->update($loginUpdate);
            return (int) $userId;
        });
    }

    private function uniqueOauthUsername(string $provider, string $providerId): string
    {
        $base = Str::limit($provider.'_'.preg_replace('/[^a-zA-Z0-9]/', '', $providerId), 50, '');
        for ($attempt = 0; $attempt < 20; $attempt++) {
            $candidate = $attempt === 0 ? $base : Str::limit($base, 50, '').'_'.substr(sha1($providerId.'|'.$attempt), 0, 8);
            if (!DB::table('users')->where('username', $candidate)->exists()) return $candidate;
        }
        throw new \RuntimeException('Không thể tạo tên tài khoản Aurora duy nhất.');
    }

    private function finishOauthAttempt(int $attemptId, string $status, ?int $userId = null, ?string $providerUserId = null, ?string $errorCode = null, ?string $message = null): void
    {
        if ($attemptId <= 0) return;
        DB::table('oauth_login_attempts')->where('id', $attemptId)->update([
            'status' => $status, 'user_id' => $userId, 'provider_user_id' => $providerUserId,
            'error_code' => $errorCode, 'error_message' => $message ? Str::limit($message, 255, '') : null,
            'completed_at' => now(),
        ]);
    }

    private function ensureOauthSchema(): void
    {
        DB::statement("CREATE TABLE IF NOT EXISTS oauth_accounts (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
            provider ENUM('google','facebook') NOT NULL, provider_user_id VARCHAR(191) NOT NULL,
            provider_email VARCHAR(180) NULL, provider_name VARCHAR(120) NULL, avatar_url VARCHAR(500) NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NULL DEFAULT NULL,
            last_login_at TIMESTAMP NULL DEFAULT NULL,
            UNIQUE KEY uq_oauth_provider_identity (provider, provider_user_id),
            UNIQUE KEY uq_oauth_user_provider (user_id, provider), KEY idx_oauth_provider_email (provider_email),
            CONSTRAINT fk_oauth_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci");
        DB::statement("CREATE TABLE IF NOT EXISTS oauth_login_attempts (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, provider ENUM('google','facebook') NOT NULL,
            user_id BIGINT UNSIGNED NULL, provider_user_id VARCHAR(191) NULL, state_hash CHAR(64) NOT NULL,
            status ENUM('started','succeeded','failed') NOT NULL DEFAULT 'started', error_code VARCHAR(60) NULL,
            error_message VARCHAR(255) NULL, ip_address_hash CHAR(64) NULL, user_agent VARCHAR(255) NULL,
            created_at DATETIME NOT NULL, completed_at DATETIME NULL,
            KEY idx_oauth_attempt_provider_status (provider, status, created_at), KEY idx_oauth_attempt_user (user_id, created_at),
            CONSTRAINT fk_oauth_attempt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci");
    }

    private function oauthRedirect(string $status, string $provider, string $message = '')
    {
        $parameters = array_filter(['oauth' => $status, 'provider' => $provider, 'message' => $message], fn ($value) => $value !== '');
        return redirect()->away(rtrim((string) config('oauth.frontend_url'), '/').'/?'.http_build_query($parameters));
    }

    private function publicUser(?int $id): ?array
    {
        if (!$id) return null;
        $user = DB::table('users')->where('id', $id)->first();
        return $user ? ['id' => $user->id, 'fullName' => $user->full_name, 'email' => $user->email,
            'membershipLevel' => $user->membership_level, 'points' => $user->points] : null;
    }

    private function showtimesQuery()
    {
        return DB::table('showtimes')
            ->join('screens', 'screens.id', '=', 'showtimes.screen_id')
            ->join('movies', 'movies.id', '=', 'showtimes.movie_id')
            ->select([
                'showtimes.id', 'showtimes.movie_id', 'screens.theater_id', 'showtimes.screen_id',
                'screens.name as screen_name', 'movies.title as movie_title', 'showtimes.starts_at',
                'showtimes.ends_at', 'showtimes.ticket_price', 'showtimes.status',
            ])
            ->where('showtimes.status', 'OPEN');
    }
}
