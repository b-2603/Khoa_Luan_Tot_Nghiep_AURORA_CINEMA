<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

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

    public function theaters(): JsonResponse
    {
        $theaters = DB::table('theaters')->orderBy('name')->get();
        $screens = DB::table('screens')->orderBy('name')->get()->groupBy('theater_id');

        return response()->json(['theaters' => $theaters->map(fn ($theater) => [
            'id' => $theater->id, 'name' => $theater->name, 'address' => $theater->address,
            'city' => $theater->city, 'screens' => ($screens[$theater->id] ?? collect())->values(),
        ])]);
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
}
