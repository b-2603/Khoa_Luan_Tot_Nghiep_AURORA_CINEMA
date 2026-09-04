<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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

    public function oauthStart(Request $request): JsonResponse
    {
        $provider = $request->string('provider')->toString();
        if (!in_array($provider, ['google', 'facebook'], true)) {
            return response()->json(['message' => 'Nhà cung cấp OAuth không hợp lệ.'], 422);
        }
        return response()->json(['provider' => $provider, 'message' => 'OAuth chưa được cấu hình.']);
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
