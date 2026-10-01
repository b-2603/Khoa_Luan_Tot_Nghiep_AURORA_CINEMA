-- ========================================================
-- AURORA CINEMA - CLEANUP LEGACY TABLES
-- Chỉ xóa các bảng TMS/legacy trùng lặp hoặc không còn dùng.
-- Giữ lại các bảng chuẩn dùng chung trong aurora_db.
-- ========================================================

USE `aurora_db`;

-- Legacy link / bridge tables không còn dùng trong mô hình gộp
DROP TABLE IF EXISTS `tms_screen_customer_links`;
DROP TABLE IF EXISTS `tms_schedule_customer_links`;
DROP TABLE IF EXISTS `tms_movie_catalog_links`;
DROP TABLE IF EXISTS `tms_staff_shift_assignments`;
DROP TABLE IF EXISTS `tms_service_staff_links`;

-- Legacy planning / allocation tables đã bị gộp
DROP TABLE IF EXISTS `tms_movie_plans`;
DROP TABLE IF EXISTS `tms_movie_allocations`;
DROP TABLE IF EXISTS `tms_theater_movie_allocations`;

-- Legacy duplicate tables đã được gộp vào bảng chuẩn chung
DROP TABLE IF EXISTS `tms_audit_logs`;
DROP TABLE IF EXISTS `tms_customers`;
DROP TABLE IF EXISTS `tms_movies`;
DROP TABLE IF EXISTS `tms_pos_devices`;
DROP TABLE IF EXISTS `tms_pricing_policies`;
DROP TABLE IF EXISTS `tms_products`;
DROP TABLE IF EXISTS `tms_refunds`;
DROP TABLE IF EXISTS `tms_revenue_logs`;
DROP TABLE IF EXISTS `tms_schedules`;
DROP TABLE IF EXISTS `tms_screens`;
DROP TABLE IF EXISTS `tms_staff_shifts`;
DROP TABLE IF EXISTS `tms_system_configs`;
DROP TABLE IF EXISTS `tms_ticket_types`;
DROP TABLE IF EXISTS `tms_transactions`;
DROP TABLE IF EXISTS `tms_users`;
DROP TABLE IF EXISTS `tms_vouchers`;

-- ========================================================
-- Giữ lại các bảng chuẩn dùng chung:
-- users, theaters, screens, movies, showtimes, staff_shifts,
-- ticket_types, products, vouchers, customers, transactions,
-- refunds, revenue_logs, audit_logs, system_configs.
-- ========================================================
