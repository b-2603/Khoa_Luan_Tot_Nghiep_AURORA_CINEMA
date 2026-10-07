USE aurora_db;

CREATE TABLE IF NOT EXISTS movie_allocation_tasks (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    allocation_id BIGINT UNSIGNED NOT NULL,
    task_key VARCHAR(60) NOT NULL,
    task_name VARCHAR(180) NOT NULL,
    task_description VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    updated_by VARCHAR(120) NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uq_allocation_task (allocation_id, task_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS movie_allocation_briefings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    allocation_id BIGINT UNSIGNED NOT NULL,
    message VARCHAR(500) NOT NULL,
    recipient_count INT UNSIGNED NOT NULL DEFAULT 0,
    sent_by VARCHAR(120) NOT NULL,
    sent_at DATETIME NOT NULL,
    UNIQUE KEY uq_allocation_briefing (allocation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS movie_allocation_screen_preparations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    allocation_id BIGINT UNSIGNED NOT NULL,
    screen_id BIGINT UNSIGNED NOT NULL,
    preparation_status VARCHAR(20) NOT NULL DEFAULT 'ready',
    content_playback_checked TINYINT(1) NOT NULL DEFAULT 0,
    projector_checked TINYINT(1) NOT NULL DEFAULT 0,
    sound_checked TINYINT(1) NOT NULL DEFAULT 0,
    auditorium_checked TINYINT(1) NOT NULL DEFAULT 0,
    safety_checked TINYINT(1) NOT NULL DEFAULT 0,
    note VARCHAR(500) NOT NULL,
    prepared_by VARCHAR(120) NOT NULL,
    prepared_at DATETIME NOT NULL,
    UNIQUE KEY uq_allocation_prepared_screen (allocation_id, screen_id),
    KEY idx_preparation_allocation (allocation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

ALTER TABLE movie_allocation_briefings
    ADD COLUMN IF NOT EXISTS recipient_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER message;

ALTER TABLE movie_allocation_screen_preparations
    ADD COLUMN IF NOT EXISTS content_playback_checked TINYINT(1) NOT NULL DEFAULT 0 AFTER preparation_status,
    ADD COLUMN IF NOT EXISTS projector_checked TINYINT(1) NOT NULL DEFAULT 0 AFTER content_playback_checked,
    ADD COLUMN IF NOT EXISTS sound_checked TINYINT(1) NOT NULL DEFAULT 0 AFTER projector_checked,
    ADD COLUMN IF NOT EXISTS auditorium_checked TINYINT(1) NOT NULL DEFAULT 0 AFTER sound_checked,
    ADD COLUMN IF NOT EXISTS safety_checked TINYINT(1) NOT NULL DEFAULT 0 AFTER auditorium_checked;
