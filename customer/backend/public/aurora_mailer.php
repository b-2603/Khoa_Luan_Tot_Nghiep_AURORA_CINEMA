<?php
/**
 * Aurora Cinema HTML E-Ticket Emailer (Pure PHP SMTP SSL/TLS — Zero dependencies).
 * Sends a Galaxy-Cinema-inspired confirmation email with QR code, ticket details,
 * and "Có thể bạn quan tâm" movie recommendations directly from aurora_db.
 */

function aurora_smtp_read($fp) {
    $data = '';
    while ($line = fgets($fp, 515)) {
        $data .= $line;
        if (isset($line[3]) && $line[3] === ' ') break;
    }
    return $data;
}

function aurora_smtp_cmd($fp, $cmd, $expectedCodes = array(250)) {
    if ($cmd !== null) {
        fwrite($fp, $cmd . "\r\n");
    }
    $resp = aurora_smtp_read($fp);
    $code = (int)substr(trim($resp), 0, 3);
    return array('ok' => in_array($code, $expectedCodes, true), 'code' => $code, 'response' => trim($resp));
}

function aurora_smtp_send_html($toEmail, $toName, $subject, $htmlBody) {
    $host = trim((string)aurora_env('SMTP_HOST', 'smtp.gmail.com'));
    $port = (int)aurora_env('SMTP_PORT', '465');
    $user = trim((string)aurora_env('SMTP_USERNAME', ''));
    $pass = str_replace(' ', '', trim((string)aurora_env('SMTP_PASSWORD', '')));
    $fromEmail = trim((string)aurora_env('MAIL_FROM_ADDRESS', $user !== '' ? $user : 'no-reply@auroracinema.local'));
    $fromName = trim((string)aurora_env('MAIL_FROM_NAME', 'Aurora Cinema'));

    if ($user === '' || $pass === '' || $toEmail === '') {
        return array('ok' => false, 'reason' => 'SMTP_NOT_CONFIGURED');
    }

    $context = stream_context_create(array(
        'ssl' => array(
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        )
    ));
    $target = ($port === 465 ? 'ssl://' : 'tcp://') . $host . ':' . $port;
    $errno = 0; $errstr = '';
    $fp = @stream_socket_client($target, $errno, $errstr, 12, STREAM_CLIENT_CONNECT, $context);
    if (!$fp) {
        return array('ok' => false, 'reason' => 'CONNECT_FAILED: ' . $errstr);
    }
    stream_set_timeout($fp, 12);

    $greet = aurora_smtp_cmd($fp, null, array(220));
    if (!$greet['ok']) { fclose($fp); return array('ok' => false, 'reason' => $greet['response']); }

    $ehlo = aurora_smtp_cmd($fp, 'EHLO localhost', array(250));
    if (!$ehlo['ok']) { fclose($fp); return array('ok' => false, 'reason' => $ehlo['response']); }

    if ($port !== 465) {
        $tls = aurora_smtp_cmd($fp, 'STARTTLS', array(220));
        if (!$tls['ok'] || !@stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            fclose($fp);
            return array('ok' => false, 'reason' => 'STARTTLS_FAILED');
        }
        aurora_smtp_cmd($fp, 'EHLO localhost', array(250));
    }

    $auth = aurora_smtp_cmd($fp, 'AUTH LOGIN', array(334));
    if (!$auth['ok']) { fclose($fp); return array('ok' => false, 'reason' => $auth['response']); }
    $u = aurora_smtp_cmd($fp, base64_encode($user), array(334));
    if (!$u['ok']) { fclose($fp); return array('ok' => false, 'reason' => $u['response']); }
    $p = aurora_smtp_cmd($fp, base64_encode($pass), array(235));
    if (!$p['ok']) { fclose($fp); return array('ok' => false, 'reason' => $p['response']); }

    $mf = aurora_smtp_cmd($fp, 'MAIL FROM:<' . $fromEmail . '>', array(250));
    if (!$mf['ok']) { fclose($fp); return array('ok' => false, 'reason' => $mf['response']); }
    $rt = aurora_smtp_cmd($fp, 'RCPT TO:<' . $toEmail . '>', array(250, 251));
    if (!$rt['ok']) { fclose($fp); return array('ok' => false, 'reason' => $rt['response']); }
    $dt = aurora_smtp_cmd($fp, 'DATA', array(354));
    if (!$dt['ok']) { fclose($fp); return array('ok' => false, 'reason' => $dt['response']); }

    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $encodedFrom = '=?UTF-8?B?' . base64_encode($fromName) . '?= <' . $fromEmail . '>';
    $encodedTo = $toName !== '' ? ('=?UTF-8?B?' . base64_encode($toName) . '?= <' . $toEmail . '>') : ('<' . $toEmail . '>');
    $b64Body = chunk_split(base64_encode($htmlBody));

    $headers = array(
        'Date: ' . date('r'),
        'From: ' . $encodedFrom,
        'To: ' . $encodedTo,
        'Subject: ' . $encodedSubject,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64'
    );
    $message = implode("\r\n", $headers) . "\r\n\r\n" . $b64Body . "\r\n.";
    $sent = aurora_smtp_cmd($fp, $message, array(250));
    aurora_smtp_cmd($fp, 'QUIT', array(221));
    fclose($fp);

    return array('ok' => $sent['ok'], 'reason' => $sent['ok'] ? 'SENT' : $sent['response']);
}

function aurora_send_booking_eticket_email($db, $bookingId) {
    $bookingId = (int)$bookingId;
    if ($bookingId < 1) return array('ok' => false, 'reason' => 'INVALID_BOOKING');

    $sql = "SELECT b.id, b.booking_code, b.total_amount, b.status,
                   st.starts_at, st.ends_at,
                   m.id AS movie_id, m.title AS movie_title, m.format, m.age_rating, m.duration_minutes,
                   sc.name AS screen_name,
                   t.name AS theater_name, t.address AS theater_address, t.city,
                   u.full_name, u.email
            FROM bookings b
            INNER JOIN showtimes st ON st.id = b.showtime_id
            INNER JOIN movies m ON m.id = st.movie_id
            INNER JOIN screens sc ON sc.id = st.screen_id
            INNER JOIN theaters t ON t.id = sc.theater_id
            INNER JOIN users u ON u.id = b.user_id
            WHERE b.id = {$bookingId} LIMIT 1";
    $res = $db->query($sql);
    if (!$res || !($b = $res->fetch_assoc())) return array('ok' => false, 'reason' => 'NOT_FOUND');
    if (empty($b['email']) || strtoupper((string)$b['status']) !== 'PAID') {
        return array('ok' => false, 'reason' => 'NOT_ELIGIBLE');
    }

    // Fetch issued tickets
    $tickets = function_exists('aurora_booking_tickets_list') ? aurora_booking_tickets_list($db, $bookingId) : array();
    $seatLabels = array();
    foreach ($tickets as $tk) $seatLabels[] = $tk['seat'];
    $seatsStr = count($seatLabels) ? implode(', ', $seatLabels) : '—';
    $primaryQrData = count($tickets) ? $tickets[0]['qrPayload'] : ('AURORA|BOOKING|' . $b['booking_code']);
    $primaryTicketCode = count($tickets) ? $tickets[0]['code'] : $b['booking_code'];
    $qrImgUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=6&data=' . rawurlencode($primaryQrData);

    // Format date & time like Galaxy Cinema ("Fri, 27/11/2026" & "14:00")
    $ts = strtotime((string)$b['starts_at']);
    $dayMap = array('Sun' => 'CN', 'Mon' => 'Th 2', 'Tue' => 'Th 3', 'Wed' => 'Th 4', 'Thu' => 'Th 5', 'Fri' => 'Th 6', 'Sat' => 'Th 7');
    $dow = isset($dayMap[date('D', $ts)]) ? $dayMap[date('D', $ts)] : date('D', $ts);
    $dateStr = $dow . ', ' . date('d/m/Y', $ts);
    $timeStr = date('H:i', $ts);
    $totalFmt = number_format((float)$b['total_amount'], 0, ',', '.') . 'đ';
    $frontendUrl = rtrim((string)aurora_env('CUSTOMER_FRONTEND_URL', 'http://localhost:3000'), '/');

    // Fetch 4 recommended now_showing movies from aurora_db
    $recHtml = '';
    $curMovieId = (int)$b['movie_id'];
    $recRes = $db->query("SELECT id, title, genre, poster_url, age_rating FROM movies WHERE UPPER(status)='NOW_SHOWING' AND id <> {$curMovieId} ORDER BY is_hot DESC, id DESC LIMIT 4");
    $recCards = array();
    if ($recRes) {
        while ($m = $recRes->fetch_assoc()) {
            $poster = htmlspecialchars((string)($m['poster_url'] ?: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400'), ENT_QUOTES, 'UTF-8');
            $mTitle = htmlspecialchars((string)$m['title'], ENT_QUOTES, 'UTF-8');
            $mGenre = htmlspecialchars((string)($m['genre'] ?: 'Phim chiếu rạp'), ENT_QUOTES, 'UTF-8');
            $mAge = htmlspecialchars((string)($m['age_rating'] ?: 'P'), ENT_QUOTES, 'UTF-8');
            $recCards[] = '<td width="25%" valign="top" style="padding:0 6px;">'
                . '<a href="' . $frontendUrl . '" style="text-decoration:none;color:#0d1b2e;display:block;">'
                . '<img src="' . $poster . '" alt="' . $mTitle . '" width="132" height="188" style="width:100%;max-width:136px;height:188px;object-fit:cover;border-radius:8px;display:block;border:1px solid #e2e8f0;" />'
                . '<div style="margin-top:8px;font-size:12.5px;font-weight:700;color:#0d1b2e;line-height:1.35;">' . $mTitle . '</div>'
                . '<div style="margin-top:3px;font-size:11px;color:#64748b;">' . $mGenre . '</div>'
                . '<div style="margin-top:4px;display:inline-block;font-size:10px;font-weight:700;color:#d97706;border:1px solid #f59e0b;border-radius:4px;padding:1px 5px;">' . $mAge . '</div>'
                . '</a></td>';
        }
    }
    if (count($recCards)) {
        $recHtml = '<tr><td style="padding:28px 20px 10px;text-align:center;">'
            . '<div style="font-size:17px;font-weight:900;color:#0d1b2e;letter-spacing:0.6px;text-transform:uppercase;">CÓ THỂ BẠN QUAN TÂM</div>'
            . '<div style="font-size:12px;color:#64748b;margin:6px auto 18px;max-width:480px;line-height:1.5;">Aurora Cinema luôn cập nhật các bộ phim bom tấn và suất chiếu mới nhất mỗi ngày.</div>'
            . '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' . implode('', $recCards) . '</tr></table>'
            . '</td></tr>';
    }

    // Extra ticket codes list when booking has multiple seats
    $extraTicketsHtml = '';
    if (count($tickets) > 1) {
        $rows = '';
        foreach ($tickets as $tk) {
            $rows .= '<tr>'
                . '<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:700;color:#0d1b2e;">Ghế ' . htmlspecialchars($tk['seat'], ENT_QUOTES, 'UTF-8') . '</td>'
                . '<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;font-family:monospace;color:#0d1b2e;">' . htmlspecialchars($tk['code'], ENT_QUOTES, 'UTF-8') . '</td>'
                . '<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:right;color:#475569;">' . number_format((float)$tk['price'], 0, ',', '.') . 'đ</td>'
                . '</tr>';
        }
        $extraTicketsHtml = '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:14px auto 0;max-width:420px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">' . $rows . '</table>';
    }

    $movieEsc = htmlspecialchars((string)$b['movie_title'], ENT_QUOTES, 'UTF-8');
    $formatEsc = htmlspecialchars((string)($b['format'] ?: '2D Digital'), ENT_QUOTES, 'UTF-8');
    $theaterEsc = htmlspecialchars((string)$b['theater_name'], ENT_QUOTES, 'UTF-8');
    $screenEsc = htmlspecialchars((string)$b['screen_name'], ENT_QUOTES, 'UTF-8');
    $addrEsc = htmlspecialchars(trim((string)$b['theater_address'] . ($b['city'] ? ', ' . $b['city'] : '')), ENT_QUOTES, 'UTF-8');
    $codeEsc = htmlspecialchars((string)$b['booking_code'], ENT_QUOTES, 'UTF-8');
    $ticketCodeEsc = htmlspecialchars((string)$primaryTicketCode, ENT_QUOTES, 'UTF-8');
    $seatCount = max(1, count($seatLabels));

    $html = '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8" /></head>'
        . '<body style="margin:0;padding:0;background:#ffffff;font-family:\'Segoe UI\',Arial,Helvetica,sans-serif;color:#1e293b;">'
        . '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;padding:18px 12px;">'
        . '<tr><td align="center">'
        . '<table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;">'
        // Top Navbar
        . '<tr><td style="padding:12px 16px 16px;border-bottom:2px solid #0d1b2e;">'
        . '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
        . '<td align="left" style="font-size:19px;font-weight:900;color:#0d1b2e;letter-spacing:0.6px;">'
        . '<span style="display:inline-block;background:#0d1b2e;color:#f4c04a;width:28px;height:28px;line-height:28px;text-align:center;border-radius:7px;margin-right:8px;font-size:15px;">★</span>AURORA <span style="color:#d97706;">CINEMA</span></td>'
        . '<td align="right" style="font-size:11.5px;font-weight:700;">'
        . '<a href="' . $frontendUrl . '" style="color:#0d1b2e;text-decoration:none;margin-left:14px;">TRANG CHỦ</a>'
        . '<a href="' . $frontendUrl . '" style="color:#0d1b2e;text-decoration:none;margin-left:14px;">LỊCH CHIẾU</a>'
        . '<a href="' . $frontendUrl . '" style="color:#0d1b2e;text-decoration:none;margin-left:14px;">ƯU ĐÃI</a>'
        . '</td></tr></table>'
        . '</td></tr>'
        // Main Ticket Card
        . '<tr><td style="background:#f8fafc;padding:32px 26px;text-align:center;border-radius:0 0 12px 12px;">'
        . '<div style="width:54px;height:54px;line-height:54px;border-radius:50%;border:2.5px solid #22c55e;color:#22c55e;font-size:28px;font-weight:700;margin:0 auto 14px;">✓</div>'
        . '<h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0d1b2e;">Chúc mừng! Bạn đã đặt vé thành công!</h1>'
        . '<div style="font-size:16px;font-weight:800;color:#0d1b2e;margin-bottom:4px;">' . $movieEsc . '</div>'
        . '<div style="font-size:13px;color:#64748b;margin-bottom:4px;">' . $formatEsc . ' (' . $seatCount . ' vé) · Ghế: <strong style="color:#0d1b2e;">' . htmlspecialchars($seatsStr, ENT_QUOTES, 'UTF-8') . '</strong></div>'
        . '<div style="font-size:12.5px;color:#64748b;margin-bottom:22px;"><strong>' . $theaterEsc . '</strong> · ' . $addrEsc . '</div>'
        // 3-Column Date / Time / Screen
        . '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:460px;margin:0 auto 22px;">'
        . '<tr>'
        . '<td width="33%" align="center" style="padding:6px;">'
        . '<div style="font-size:12px;color:#64748b;font-weight:700;">Ngày:</div>'
        . '<div style="font-size:14.5px;font-weight:800;color:#ea580c;margin-top:3px;">' . $dateStr . '</div>'
        . '</td>'
        . '<td width="33%" align="center" style="padding:6px;">'
        . '<div style="font-size:12px;color:#64748b;font-weight:700;">Thời gian:</div>'
        . '<div style="font-size:14.5px;font-weight:800;color:#ea580c;margin-top:3px;">' . $timeStr . '</div>'
        . '</td>'
        . '<td width="34%" align="center" style="padding:6px;">'
        . '<div style="font-size:12px;color:#64748b;font-weight:700;">Rạp &amp; Phòng:</div>'
        . '<div style="font-size:14.5px;font-weight:800;color:#ea580c;margin-top:3px;">' . $screenEsc . '</div>'
        . '</td>'
        . '</tr></table>'
        // QR Code Box
        . '<div style="display:inline-block;background:#ffffff;padding:12px;border-radius:12px;border:1px solid #e2e8f0;">'
        . '<img src="' . $qrImgUrl . '" alt="QR Check-in" width="176" height="176" style="display:block;width:176px;height:176px;" />'
        . '</div>'
        // Orange Ticket Code Pill
        . '<div style="margin-top:16px;">'
        . '<span style="display:inline-block;background:#f97316;color:#ffffff;font-size:13.5px;font-weight:800;padding:9px 22px;border-radius:6px;letter-spacing:0.6px;">MÃ VÉ: ' . $ticketCodeEsc . '</span>'
        . '</div>'
        . '<div style="margin-top:10px;font-size:12px;color:#475569;">Mã đặt vé: <strong>' . $codeEsc . '</strong> · Tổng thanh toán: <strong style="color:#0d1b2e;">' . $totalFmt . '</strong></div>'
        . $extraTicketsHtml
        . '<div style="margin-top:16px;font-size:11.5px;color:#64748b;font-style:italic;">* Quý khách quét QR code vào rạp nhanh hơn. Giao dịch đã hoàn thành sẽ không hoàn hủy trong mọi trường hợp.</div>'
        . '</td></tr>'
        // Recommended Movies
        . $recHtml
        // Footer
        . '<tr><td style="padding:20px 16px 8px;">'
        . '<div style="background:#f8fafc;border-radius:10px;padding:18px;text-align:center;">'
        . '<div style="font-size:12px;font-weight:700;color:#ea580c;">' . $frontendUrl . '</div>'
        . '<div style="font-size:15px;font-weight:800;color:#0d1b2e;margin:4px 0;">Hệ thống Rạp Chiếu Phim Aurora Cinema</div>'
        . '<div style="font-size:11.5px;color:#64748b;">Xem lịch chiếu - Đặt vé online - Cập nhật tin tức &amp; khuyến mãi mới nhất</div>'
        . '</div>'
        . '<p style="font-size:10.5px;color:#94a3b8;line-height:1.6;margin:14px 4px 0;">'
        . 'Email này được gửi tự động từ hệ thống đặt vé trực tuyến Aurora Cinema. Mọi thắc mắc về giao dịch vui lòng liên hệ quầy chăm sóc khách hàng tại rạp hoặc mục Hỗ trợ trên website.'
        . '</p>'
        . '</td></tr>'
        . '</table></td></tr></table></body></html>';

    $subject = 'Chúc mừng bạn đặt vé thành công! - ' . $b['movie_title'] . ' (' . $b['booking_code'] . ')';
    return aurora_smtp_send_html($b['email'], (string)$b['full_name'], $subject, $html);
}

