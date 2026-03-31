CREATE DATABASE IF NOT EXISTS campus_recruitment;
USE campus_recruitment;

-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Mar 31, 2026 at 01:42 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `campus_recruitment`
--

-- --------------------------------------------------------

--
-- Table structure for table `cache`
--

CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cache_locks`
--

CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `company`
--

CREATE TABLE `company` (
  `company_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `website` varchar(255) DEFAULT NULL,
  `established_year` smallint(5) UNSIGNED DEFAULT NULL,
  `postal_address` text DEFAULT NULL,
  `street` varchar(255) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `state` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `pincode` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `landline` varchar(255) DEFAULT NULL,
  `employee_count` int(11) DEFAULT NULL,
  `sector` varchar(255) DEFAULT NULL,
  `sectors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`sectors`)),
  `annual_turnover` varchar(255) DEFAULT NULL,
  `social_media` varchar(255) DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `allow_nirf_sharing` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `company`
--

INSERT INTO `company` (`company_id`, `name`, `website`, `established_year`, `postal_address`, `street`, `city`, `state`, `country`, `pincode`, `phone`, `landline`, `employee_count`, `sector`, `sectors`, `annual_turnover`, `social_media`, `logo_path`, `allow_nirf_sharing`, `created_at`, `updated_at`) VALUES
(1, 'Demo Technologies Pvt Ltd', 'https://example.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Technology', NULL, NULL, NULL, NULL, 0, '2026-03-28 11:25:40', '2026-03-28 11:25:40');

-- --------------------------------------------------------

--
-- Table structure for table `company_document`
--

CREATE TABLE `company_document` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `company_id` bigint(20) UNSIGNED NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `mime_type` varchar(255) NOT NULL,
  `size` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contact_person`
--

CREATE TABLE `contact_person` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `company_id` bigint(20) UNSIGNED NOT NULL,
  `employer_company_name` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `designation` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `mobile_no` varchar(255) NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `declaration`
--

CREATE TABLE `declaration` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `job_id` bigint(20) UNSIGNED NOT NULL,
  `agreed` tinyint(1) NOT NULL DEFAULT 0,
  `agreed_at` timestamp NULL DEFAULT NULL,
  `agreed_by_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `authorised_signatory_name` varchar(255) DEFAULT NULL,
  `authorised_signatory_designation` varchar(255) DEFAULT NULL,
  `authorised_signatory_date` date DEFAULT NULL,
  `typed_signature` varchar(255) DEFAULT NULL,
  `rti_nirf_consent` tinyint(1) NOT NULL DEFAULT 0,
  `aipc_guidelines` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`aipc_guidelines`)),
  `declaration_text` longtext DEFAULT NULL,
  `aipc_guidelines_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`aipc_guidelines_json`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `declaration`
--

INSERT INTO `declaration` (`id`, `job_id`, `agreed`, `agreed_at`, `agreed_by_user_id`, `authorised_signatory_name`, `authorised_signatory_designation`, `authorised_signatory_date`, `typed_signature`, `rti_nirf_consent`, `aipc_guidelines`, `declaration_text`, `aipc_guidelines_json`, `created_at`, `updated_at`) VALUES
(1, 1, 1, '2026-03-28 11:39:43', 2, NULL, NULL, NULL, NULL, 0, NULL, NULL, '{\"aipc_guidelines_agreement\":true,\"shortlisting_assurance\":true,\"information_verification\":true,\"sharing_consent\":true,\"final_confirmation\":true}', '2026-03-28 11:31:36', '2026-03-28 11:39:43'),
(2, 2, 1, '2026-03-29 20:05:27', 2, NULL, NULL, NULL, NULL, 1, '{\"aipc_guidelines_agreement\":false,\"shortlisting_assurance\":false,\"information_verification\":false,\"sharing_consent\":false,\"final_confirmation\":false}', NULL, '[]', '2026-03-28 12:13:24', '2026-03-29 20:05:27'),
(3, 3, 1, '2026-03-28 22:10:52', 2, NULL, NULL, NULL, NULL, 0, NULL, NULL, '{\"aipc_guidelines_agreement\":true,\"shortlisting_assurance\":true,\"information_verification\":true,\"sharing_consent\":true,\"final_confirmation\":true}', '2026-03-28 22:10:21', '2026-03-28 22:10:52'),
(4, 4, 1, '2026-03-28 22:11:42', 2, NULL, NULL, NULL, NULL, 0, NULL, NULL, '{\"aipc_guidelines_agreement\":true,\"shortlisting_assurance\":true,\"information_verification\":true,\"sharing_consent\":true,\"final_confirmation\":true}', '2026-03-28 22:10:57', '2026-03-28 22:11:42');

-- --------------------------------------------------------

--
-- Table structure for table `eligibility`
--

CREATE TABLE `eligibility` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `job_id` bigint(20) UNSIGNED NOT NULL,
  `global_min_cgpa` varchar(255) DEFAULT NULL,
  `global_max_backlogs` varchar(255) DEFAULT NULL,
  `min_cgpa` decimal(3,2) DEFAULT NULL,
  `gender` enum('All','Male','Female','Others') NOT NULL DEFAULT 'All',
  `slp_requirement` text DEFAULT NULL,
  `disciplines_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`disciplines_json`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `global_allow_backlogs` tinyint(1) NOT NULL DEFAULT 1,
  `high_school_percentage` varchar(255) DEFAULT NULL,
  `gender_filter` varchar(255) NOT NULL DEFAULT 'All'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `eligibility`
--

INSERT INTO `eligibility` (`id`, `job_id`, `global_min_cgpa`, `global_max_backlogs`, `min_cgpa`, `gender`, `slp_requirement`, `disciplines_json`, `created_at`, `updated_at`, `global_allow_backlogs`, `high_school_percentage`, `gender_filter`) VALUES
(1, 1, NULL, NULL, NULL, 'All', NULL, '[{\"course\":\"B.Tech\",\"discipline\":\"Computer Science & Engineering\",\"min_cgpa\":7,\"min_hires\":3,\"criteria\":\"10th and 12th Marks\",\"allow_backlogs\":false,\"max_backlogs\":0,\"gender\":\"All\"},{\"course\":\"B.Tech\",\"discipline\":\"Mathematics & Computing\",\"min_cgpa\":7,\"min_hires\":3,\"criteria\":\"10th and 12th Marks\",\"allow_backlogs\":false,\"max_backlogs\":0,\"gender\":\"All\"},{\"course\":\"B.Tech\",\"discipline\":\"Data Analytics\",\"min_cgpa\":7,\"min_hires\":3,\"criteria\":\"10th and 12th Marks\",\"allow_backlogs\":false,\"max_backlogs\":0,\"gender\":\"All\"}]', '2026-03-28 11:31:36', '2026-03-28 11:34:28', 1, NULL, 'All'),
(2, 2, '7', NULL, NULL, 'All', NULL, '[{\"course\":\"B.Tech \\/ Dual Degree (JEE Advanced)\",\"discipline\":\"Chemical Engineering\",\"min_cgpa\":\"7\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":true},{\"course\":\"B.Tech \\/ Dual Degree (JEE Advanced)\",\"discipline\":\"Civil Engineering\",\"min_cgpa\":\"7\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":true},{\"course\":\"B.Tech \\/ Dual Degree (JEE Advanced)\",\"discipline\":\"Computer Science & Engineering\",\"min_cgpa\":\"7\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":true},{\"course\":\"B.Tech \\/ Dual Degree (JEE Advanced)\",\"discipline\":\"Electrical Engineering\",\"min_cgpa\":\"7\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":true},{\"course\":\"B.Tech \\/ Dual Degree (JEE Advanced)\",\"discipline\":\"Electronics & Communication Engineering\",\"min_cgpa\":\"7\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":true},{\"course\":\"B.Tech \\/ Dual Degree (JEE Advanced)\",\"discipline\":\"Engineering Physics\",\"min_cgpa\":\"7\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":true},{\"course\":\"B.Tech \\/ Dual Degree (JEE Advanced)\",\"discipline\":\"Mechanical Engineering\",\"min_cgpa\":\"7\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":true},{\"course\":\"B.Tech \\/ Dual Degree (JEE Advanced)\",\"discipline\":\"Mining Engineering\",\"min_cgpa\":\"7\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":true},{\"course\":\"B.Tech \\/ Dual Degree (JEE Advanced)\",\"discipline\":\"Petroleum Engineering\",\"min_cgpa\":\"7\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":true},{\"course\":\"B.Tech \\/ Dual Degree (JEE Advanced)\",\"discipline\":\"Mathematics & Computing\",\"min_cgpa\":\"7\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":true},{\"course\":\"B.Tech \\/ Dual Degree (JEE Advanced)\",\"discipline\":\"Data Analytics\",\"min_cgpa\":\"7\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":true},{\"course\":\"B.Tech \\/ Dual Degree (JEE Advanced)\",\"discipline\":\"Mineral Engineering\",\"min_cgpa\":\"7\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":true},{\"course\":\"B.Tech \\/ Dual Degree (JEE Advanced)\",\"discipline\":\"Mining Machinery Engineering\",\"min_cgpa\":\"7\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":true},{\"course\":\"Integrated M.Tech (JEE Advanced)\",\"discipline\":\"Mathematics & Computing\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"Integrated M.Tech (JEE Advanced)\",\"discipline\":\"Applied Geology\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"Integrated M.Tech (JEE Advanced)\",\"discipline\":\"Applied Geophysics\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Tech GATE (2-year)\",\"discipline\":\"Earthquake Science (Applied Geophysics)\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Tech GATE (2-year)\",\"discipline\":\"Chemical Engg.\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Tech GATE (2-year)\",\"discipline\":\"Power System Engg - Dawr\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Tech GATE (2-year)\",\"discipline\":\"CSE - CSE Electronics\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Tech GATE (2-year)\",\"discipline\":\"Communication & Signal Processing\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Tech GATE (2-year)\",\"discipline\":\"Mechanical Engineering (Mining Machinery Engineering)\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Tech GATE (2-year)\",\"discipline\":\"Power Metallurgy\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Tech GATE (2-year)\",\"discipline\":\"Optical Communication - RF & VLSI Design\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Tech GATE (2-year)\",\"discipline\":\"Mineral Engg\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Tech GATE (2-year)\",\"discipline\":\"Environmental Sc. - Fuel &\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Tech GATE (2-year)\",\"discipline\":\"Industrial Engg & Mgmt, Data Analytics\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Tech GATE (2-year)\",\"discipline\":\"Machine Design\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Tech GATE (2-year)\",\"discipline\":\"Thermal Engg\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Tech GATE (2-year)\",\"discipline\":\"Mining Engg - Geomatics, Tunneling\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Tech GATE (2-year)\",\"discipline\":\"Petroleum Engg\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Tech GATE (2-year)\",\"discipline\":\"Pharmaceutical Sc. & Engg\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Sc JAM (2-yr)\",\"discipline\":\"Physics\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Sc JAM (2-yr)\",\"discipline\":\"Chemistry\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Sc JAM (2-yr)\",\"discipline\":\"Mathematics & Computing\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Sc.Tech JAM (3-yr)\",\"discipline\":\"Applied Geology\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.Sc.Tech JAM (3-yr)\",\"discipline\":\"Applied Geophysics\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"MBA (CAT)\",\"discipline\":\"Business Analytics\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"MBA (CAT)\",\"discipline\":\"Finance\\/Mktg\\/HR\\/Ops\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"PhD (GATE\\/NET)\",\"discipline\":\"All Engineering Departments\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"PhD (GATE\\/NET)\",\"discipline\":\"All Science Departments\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"PhD (GATE\\/NET)\",\"discipline\":\"Management Studies\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"PhD (GATE\\/NET)\",\"discipline\":\"Humanities & Social Sciences\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false},{\"course\":\"M.A. Digital Humanities & Social Sciences\",\"discipline\":\"Digital Humanities & Social Sciences\",\"min_cgpa\":\"0.0\",\"max_backlogs\":\"0\",\"allow_backlogs\":false,\"selected\":false}]', '2026-03-28 12:13:24', '2026-03-29 20:05:05', 1, '90', 'All'),
(3, 3, NULL, NULL, NULL, 'All', NULL, '[{\"course\":\"B.Tech\",\"discipline\":\"Computer Science & Engineering\",\"min_cgpa\":7,\"min_hires\":3,\"criteria\":\"10th and 12th Marks\",\"allow_backlogs\":false,\"max_backlogs\":0,\"gender\":\"All\"},{\"course\":\"B.Tech\",\"discipline\":\"Mathematics & Computing\",\"min_cgpa\":7,\"min_hires\":3,\"criteria\":\"10th and 12th Marks\",\"allow_backlogs\":false,\"max_backlogs\":0,\"gender\":\"All\"},{\"course\":\"B.Tech\",\"discipline\":\"Data Analytics\",\"min_cgpa\":7,\"min_hires\":3,\"criteria\":\"10th and 12th Marks\",\"allow_backlogs\":false,\"max_backlogs\":0,\"gender\":\"All\"}]', '2026-03-28 22:10:21', '2026-03-28 22:10:21', 1, NULL, 'All'),
(4, 4, NULL, NULL, NULL, 'All', NULL, '[{\"course\":\"B.Tech\",\"discipline\":\"Computer Science & Engineering\",\"min_cgpa\":7,\"min_hires\":3,\"criteria\":\"10th and 12th Marks\",\"allow_backlogs\":false,\"max_backlogs\":0,\"gender\":\"All\"},{\"course\":\"B.Tech\",\"discipline\":\"Mathematics & Computing\",\"min_cgpa\":7,\"min_hires\":3,\"criteria\":\"10th and 12th Marks\",\"allow_backlogs\":false,\"max_backlogs\":0,\"gender\":\"All\"},{\"course\":\"B.Tech\",\"discipline\":\"Data Analytics\",\"min_cgpa\":7,\"min_hires\":3,\"criteria\":\"10th and 12th Marks\",\"allow_backlogs\":false,\"max_backlogs\":0,\"gender\":\"All\"}]', '2026-03-28 22:10:57', '2026-03-28 22:10:57', 1, NULL, 'All');

-- --------------------------------------------------------

--
-- Table structure for table `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `hiring_stage`
--

CREATE TABLE `hiring_stage` (
  `stage_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hiring_stage`
--

INSERT INTO `hiring_stage` (`stage_id`, `name`, `created_at`, `updated_at`) VALUES
(1, 'Pre-Placement Talk', '2026-03-28 11:25:40', '2026-03-28 11:25:40'),
(2, 'Resume Shortlisting', '2026-03-28 11:25:40', '2026-03-28 11:25:40'),
(3, 'Online/Written Test', '2026-03-28 11:25:40', '2026-03-28 11:25:40'),
(4, 'Group Discussion', '2026-03-28 11:25:40', '2026-03-28 11:25:40'),
(5, 'Any Other Round', '2026-03-28 11:25:40', '2026-03-28 11:25:40'),
(6, 'Personal/Technical Interview', '2026-03-28 11:25:40', '2026-03-28 11:25:40');

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) UNSIGNED NOT NULL,
  `reserved_at` int(10) UNSIGNED DEFAULT NULL,
  `available_at` int(10) UNSIGNED NOT NULL,
  `created_at` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_application`
--

CREATE TABLE `job_application` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `job_id` bigint(20) UNSIGNED NOT NULL,
  `candidate_name` varchar(255) NOT NULL,
  `candidate_email` varchar(255) NOT NULL,
  `current_stage_id` bigint(20) UNSIGNED DEFAULT NULL,
  `status` enum('selected','rejected','in progress') NOT NULL DEFAULT 'in progress',
  `is_draft` tinyint(1) NOT NULL DEFAULT 0,
  `draft_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`draft_payload`)),
  `edit_count` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `is_withdrawn` tinyint(1) NOT NULL DEFAULT 0,
  `application_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_batches`
--

CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_document`
--

CREATE TABLE `job_document` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `job_id` bigint(20) UNSIGNED NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `mime_type` varchar(255) NOT NULL,
  `size` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_profile`
--

CREATE TABLE `job_profile` (
  `job_id` bigint(20) UNSIGNED NOT NULL,
  `parent_job_id` bigint(20) UNSIGNED DEFAULT NULL,
  `company_id` bigint(20) UNSIGNED NOT NULL,
  `cycle_id` bigint(20) UNSIGNED NOT NULL,
  `job_type` enum('INF','JNF') NOT NULL,
  `status` enum('draft','pending','submitted') NOT NULL DEFAULT 'draft',
  `last_completed_step` int(11) NOT NULL DEFAULT 0,
  `profile_name` varchar(255) NOT NULL,
  `job_designation` varchar(255) DEFAULT NULL,
  `place_of_posting` varchar(255) DEFAULT NULL,
  `description` text NOT NULL,
  `location` varchar(255) NOT NULL,
  `work_mode` varchar(20) NOT NULL DEFAULT 'offline',
  `offline_job_location` varchar(255) DEFAULT NULL,
  `expected_hires` varchar(255) DEFAULT NULL,
  `min_hires` varchar(255) DEFAULT NULL,
  `required_skills` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`required_skills`)),
  `training_period` varchar(255) DEFAULT NULL,
  `bond` varchar(255) DEFAULT NULL,
  `registration_link` varchar(255) DEFAULT NULL,
  `joining_month` varchar(255) DEFAULT NULL,
  `onboarding_procedure` text DEFAULT NULL,
  `additional_info` text DEFAULT NULL,
  `additional_info_1000` text DEFAULT NULL,
  `num_employees` varchar(255) DEFAULT NULL,
  `job_categories` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`job_categories`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `has_psychometric_test` tinyint(1) NOT NULL DEFAULT 0,
  `has_medical_test` tinyint(1) NOT NULL DEFAULT 0,
  `other_screening_details` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `job_profile`
--

INSERT INTO `job_profile` (`job_id`, `parent_job_id`, `company_id`, `cycle_id`, `job_type`, `status`, `last_completed_step`, `profile_name`, `job_designation`, `place_of_posting`, `description`, `location`, `work_mode`, `offline_job_location`, `expected_hires`, `min_hires`, `required_skills`, `training_period`, `bond`, `registration_link`, `joining_month`, `onboarding_procedure`, `additional_info`, `additional_info_1000`, `num_employees`, `job_categories`, `created_at`, `updated_at`, `has_psychometric_test`, `has_medical_test`, `other_screening_details`) VALUES
(1, NULL, 1, 1, 'JNF', 'submitted', 4, 'Software Engineer', 'Software Developer Engineer- I', NULL, 'Need a well skilled student ready to work', '', 'online', NULL, '20', NULL, '[\"Python\",\"Java\",\"C++\",\"Communication\",\"Problem Solving\"]', '1 month', '2 years', NULL, 'June', 'Need to do this and that', NULL, NULL, NULL, '[\"Software\\/IT\",\"Education\\/Ed Tech\"]', '2026-03-28 11:31:36', '2026-03-28 11:39:43', 1, 1, NULL),
(2, NULL, 1, 1, 'JNF', 'pending', 2, 'Untitled Profile', NULL, NULL, '', '', 'offline', NULL, NULL, NULL, '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', '2026-03-28 12:13:24', '2026-03-29 20:05:27', 0, 0, NULL),
(3, NULL, 1, 1, 'JNF', 'pending', 0, 'Software Engineer Profile 2', 'Software Developer Engineer- I', NULL, 'Need a well skilled student ready to work', '', 'online', NULL, '20', NULL, '[\"Python\",\"Java\",\"C++\",\"Communication\",\"Problem Solving\"]', '1 month', '2 years', NULL, 'June', 'Need to do this and that', NULL, NULL, NULL, '[\"Software\\/IT\",\"Education\\/Ed Tech\"]', '2026-03-28 22:10:21', '2026-03-28 22:10:52', 1, 1, NULL),
(4, NULL, 1, 1, 'JNF', 'pending', 3, 'Software Engineer Profile 3', 'Software Developer Engineer- I', NULL, 'Need a well skilled student ready to work', '', 'online', NULL, '20', NULL, '[\"Python\",\"Java\",\"C++\",\"Communication\",\"Problem Solving\"]', '1 month', '2 years', NULL, 'June', 'Need to do this and that', NULL, NULL, NULL, '[\"Software\\/IT\",\"Education\\/Ed Tech\"]', '2026-03-28 22:10:57', '2026-03-28 22:11:42', 1, 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `job_stage`
--

CREATE TABLE `job_stage` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `job_id` bigint(20) UNSIGNED NOT NULL,
  `stage_id` bigint(20) UNSIGNED NOT NULL,
  `selection_mode` varchar(255) DEFAULT NULL,
  `test_type` varchar(255) DEFAULT NULL,
  `interview_mode` varchar(255) DEFAULT NULL,
  `sequence` int(10) UNSIGNED NOT NULL,
  `duration` varchar(255) DEFAULT NULL,
  `infrastructure_requirements` text DEFAULT NULL,
  `start_time` timestamp NULL DEFAULT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `job_stage`
--

INSERT INTO `job_stage` (`id`, `job_id`, `stage_id`, `selection_mode`, `test_type`, `interview_mode`, `sequence`, `duration`, `infrastructure_requirements`, `start_time`, `end_time`, `created_at`, `updated_at`) VALUES
(37, 1, 1, 'Offline', 'Group Discussion', 'On-campus', 1, 'Half day', 'Auditorium', NULL, NULL, '2026-03-28 11:39:43', '2026-03-28 11:39:43'),
(38, 1, 2, 'Online', 'Technical', 'On-campus', 2, '2 days', NULL, NULL, NULL, '2026-03-28 11:39:43', '2026-03-28 11:39:43'),
(39, 1, 3, 'Hybrid', 'Written', 'On-campus', 3, '1 hour', 'Rooms and invigilators', NULL, NULL, '2026-03-28 11:39:43', '2026-03-28 11:39:43'),
(40, 1, 6, 'Offline', 'Personal Interview', 'On-campus', 4, '1 day', 'Rooms and helpers', NULL, NULL, '2026-03-28 11:39:43', '2026-03-28 11:39:43'),
(45, 3, 1, 'Offline', 'Group Discussion', 'On-campus', 1, 'Half day', 'Auditorium', NULL, NULL, '2026-03-28 22:10:52', '2026-03-28 22:10:52'),
(46, 3, 2, 'Online', 'Technical', 'On-campus', 2, '2 days', NULL, NULL, NULL, '2026-03-28 22:10:52', '2026-03-28 22:10:52'),
(47, 3, 3, 'Hybrid', 'Written', 'On-campus', 3, '1 hour', 'Rooms and invigilators', NULL, NULL, '2026-03-28 22:10:52', '2026-03-28 22:10:52'),
(48, 3, 6, 'Offline', 'Personal Interview', 'On-campus', 4, '1 day', 'Rooms and helpers', NULL, NULL, '2026-03-28 22:10:52', '2026-03-28 22:10:52'),
(77, 4, 1, 'Offline', 'Group Discussion', 'On-campus', 1, 'Half day', 'Auditorium', NULL, NULL, '2026-03-28 22:11:42', '2026-03-28 22:11:42'),
(78, 4, 2, 'Online', 'Technical', 'On-campus', 2, '2 days', NULL, NULL, NULL, '2026-03-28 22:11:42', '2026-03-28 22:11:42'),
(79, 4, 3, 'Hybrid', 'Written', 'On-campus', 3, '1 hour', 'Rooms and invigilators', NULL, NULL, '2026-03-28 22:11:42', '2026-03-28 22:11:42'),
(80, 4, 6, 'Offline', 'Personal Interview', 'On-campus', 4, '1 day', 'Rooms and helpers', NULL, NULL, '2026-03-28 22:11:42', '2026-03-28 22:11:42'),
(95, 2, 1, 'Offline', 'PPT', 'On-campus', 1, NULL, NULL, NULL, NULL, '2026-03-29 20:05:27', '2026-03-29 20:05:27'),
(96, 2, 2, 'Offline', 'Shortlisting', 'On-campus', 2, NULL, NULL, NULL, NULL, '2026-03-29 20:05:27', '2026-03-29 20:05:27'),
(97, 2, 3, 'Offline', 'Coding', 'On-campus', 3, NULL, NULL, NULL, NULL, '2026-03-29 20:05:27', '2026-03-29 20:05:27'),
(98, 2, 4, 'Offline', 'GD', 'On-campus', 4, NULL, NULL, NULL, NULL, '2026-03-29 20:05:27', '2026-03-29 20:05:27');

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '0001_01_01_000000_create_users_table', 1),
(2, '0001_01_01_000001_create_cache_table', 1),
(3, '0001_01_01_000002_create_jobs_table', 1),
(4, '2026_03_24_000001_create_recruitment_schema', 1),
(5, '2026_03_24_000002_add_edit_and_withdraw_to_job_application', 1),
(6, '2026_03_24_000003_add_company_profile_fields', 1),
(7, '2026_03_24_000004_add_company_address_contact_fields', 1),
(8, '2026_03_25_000001_job_company_application_enhancements', 1),
(9, '2026_03_27_104859_add_missing_company_fields', 1),
(10, '2026_03_27_110656_update_company_and_job_fields', 1),
(11, '2026_03_28_065023_add_status_to_job_profile_table', 1),
(12, '2026_03_28_070740_update_salary_table_for_inf_jnf', 1),
(13, '2026_03_28_134303_update_salary_table_for_multiple_salaries', 1),
(14, '2026_03_28_140140_update_job_and_stages_for_enhanced_selection', 1),
(15, '2026_03_29_113308_add_parent_job_id_to_job_profile_table', 2),
(16, '2026_03_29_130932_add_global_allow_backlogs_to_eligibility_table', 3),
(17, '2026_03_30_010408_add_missing_columns_to_recruitment_tables', 4),
(18, '2026_03_30_010523_normalize_recruitment_schema_tables', 5),
(19, '2026_03_30_011000_add_extra_columns_to_company_table', 6);

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `recruitment_cycle`
--

CREATE TABLE `recruitment_cycle` (
  `cycle_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `recruitment_cycle`
--

INSERT INTO `recruitment_cycle` (`cycle_id`, `name`, `start_date`, `end_date`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Placement 2026', '2026-01-01', '2026-12-31', 1, '2026-03-28 11:25:40', '2026-03-28 11:25:40');

-- --------------------------------------------------------

--
-- Table structure for table `salary`
--

CREATE TABLE `salary` (
  `salary_id` bigint(20) UNSIGNED NOT NULL,
  `job_id` bigint(20) UNSIGNED NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'INR',
  `salaries_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`salaries_json`)),
  `additional_components` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`additional_components`)),
  `ctc_lpa` decimal(10,2) DEFAULT NULL,
  `fixed_component` decimal(10,2) DEFAULT NULL,
  `joining_bonus` decimal(10,2) DEFAULT NULL,
  `retention_bonus` decimal(10,2) DEFAULT NULL,
  `variable_component` decimal(10,2) DEFAULT NULL,
  `esops` decimal(10,2) DEFAULT NULL,
  `stocks_options` decimal(10,2) DEFAULT NULL,
  `stipend` varchar(255) DEFAULT NULL,
  `internship_duration` varchar(255) DEFAULT NULL,
  `different_structure_per_programme` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `salary`
--

INSERT INTO `salary` (`salary_id`, `job_id`, `currency`, `salaries_json`, `additional_components`, `ctc_lpa`, `fixed_component`, `joining_bonus`, `retention_bonus`, `variable_component`, `esops`, `stocks_options`, `stipend`, `internship_duration`, `different_structure_per_programme`, `created_at`, `updated_at`) VALUES
(1, 1, 'INR', '[{\"course\":\"B.Tech\",\"discipline\":\"Computer Science & Engineering\",\"ctc_lpa\":65,\"fixed_component\":64,\"monthly_take_home\":5,\"joining_bonus\":20000,\"retention_bonus\":10000,\"bond_deductions\":0,\"esops_vest_period\":null,\"relocation_allowance\":0,\"additional_joining_bonus\":0,\"additional_retention_bonus\":0,\"additional_bond_deductions\":0,\"additional_esops_vest_period\":null,\"additional_relocation_allowance\":0},{\"course\":\"B.Tech\",\"discipline\":\"Mathematics & Computing\",\"ctc_lpa\":65,\"fixed_component\":64,\"monthly_take_home\":5,\"joining_bonus\":20000,\"retention_bonus\":10000,\"bond_deductions\":0,\"esops_vest_period\":null,\"relocation_allowance\":0,\"additional_joining_bonus\":0,\"additional_retention_bonus\":0,\"additional_bond_deductions\":0,\"additional_esops_vest_period\":null,\"additional_relocation_allowance\":0},{\"course\":\"B.Tech\",\"discipline\":\"Data Analytics\",\"ctc_lpa\":65,\"fixed_component\":64,\"monthly_take_home\":5,\"joining_bonus\":20000,\"retention_bonus\":10000,\"bond_deductions\":0,\"esops_vest_period\":null,\"relocation_allowance\":0,\"additional_joining_bonus\":0,\"additional_retention_bonus\":0,\"additional_bond_deductions\":0,\"additional_esops_vest_period\":null,\"additional_relocation_allowance\":0}]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-03-28 11:31:36', '2026-03-28 11:35:21'),
(2, 2, 'INR', '[{\"programme\":\"B.Tech \\/ Dual Degree (JEE Advanced)\",\"ctc_annual\":\"50\",\"base_fixed\":\"48\",\"monthly_take_home\":\"4\",\"selected\":true},{\"programme\":\"Integrated M.Tech (JEE Advanced)\",\"ctc_annual\":null,\"base_fixed\":null,\"monthly_take_home\":null,\"selected\":false},{\"programme\":\"M.Tech GATE (2-year)\",\"ctc_annual\":null,\"base_fixed\":null,\"monthly_take_home\":null,\"selected\":false},{\"programme\":\"M.Sc JAM (2-yr)\",\"ctc_annual\":null,\"base_fixed\":null,\"monthly_take_home\":null,\"selected\":false},{\"programme\":\"M.Sc.Tech JAM (3-yr)\",\"ctc_annual\":null,\"base_fixed\":null,\"monthly_take_home\":null,\"selected\":false},{\"programme\":\"MBA (CAT)\",\"ctc_annual\":null,\"base_fixed\":null,\"monthly_take_home\":null,\"selected\":false},{\"programme\":\"PhD (GATE\\/NET)\",\"ctc_annual\":null,\"base_fixed\":null,\"monthly_take_home\":null,\"selected\":false},{\"programme\":\"M.A. Digital Humanities & Social Sciences\",\"ctc_annual\":null,\"base_fixed\":null,\"monthly_take_home\":null,\"selected\":false}]', '{\"global\":{\"joining_bonus\":null,\"retention_bonus\":null,\"bond_deductions\":null,\"esops_vest_period\":null,\"relocation_allowance\":null}}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-03-28 12:13:24', '2026-03-29 20:05:27'),
(3, 3, 'INR', '[{\"course\":\"B.Tech\",\"discipline\":\"Computer Science & Engineering\",\"ctc_lpa\":65,\"fixed_component\":64,\"monthly_take_home\":5,\"joining_bonus\":20000,\"retention_bonus\":10000,\"bond_deductions\":0,\"esops_vest_period\":null,\"relocation_allowance\":0,\"additional_joining_bonus\":0,\"additional_retention_bonus\":0,\"additional_bond_deductions\":0,\"additional_esops_vest_period\":null,\"additional_relocation_allowance\":0},{\"course\":\"B.Tech\",\"discipline\":\"Mathematics & Computing\",\"ctc_lpa\":65,\"fixed_component\":64,\"monthly_take_home\":5,\"joining_bonus\":20000,\"retention_bonus\":10000,\"bond_deductions\":0,\"esops_vest_period\":null,\"relocation_allowance\":0,\"additional_joining_bonus\":0,\"additional_retention_bonus\":0,\"additional_bond_deductions\":0,\"additional_esops_vest_period\":null,\"additional_relocation_allowance\":0},{\"course\":\"B.Tech\",\"discipline\":\"Data Analytics\",\"ctc_lpa\":65,\"fixed_component\":64,\"monthly_take_home\":5,\"joining_bonus\":20000,\"retention_bonus\":10000,\"bond_deductions\":0,\"esops_vest_period\":null,\"relocation_allowance\":0,\"additional_joining_bonus\":0,\"additional_retention_bonus\":0,\"additional_bond_deductions\":0,\"additional_esops_vest_period\":null,\"additional_relocation_allowance\":0}]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-03-28 22:10:21', '2026-03-28 22:10:21'),
(4, 4, 'INR', '[{\"course\":\"B.Tech\",\"discipline\":\"Computer Science & Engineering\",\"ctc_lpa\":65,\"fixed_component\":64,\"monthly_take_home\":5,\"joining_bonus\":20000,\"retention_bonus\":10000,\"bond_deductions\":0,\"esops_vest_period\":null,\"relocation_allowance\":0,\"additional_joining_bonus\":0,\"additional_retention_bonus\":0,\"additional_bond_deductions\":0,\"additional_esops_vest_period\":null,\"additional_relocation_allowance\":0},{\"course\":\"B.Tech\",\"discipline\":\"Mathematics & Computing\",\"ctc_lpa\":65,\"fixed_component\":64,\"monthly_take_home\":5,\"joining_bonus\":20000,\"retention_bonus\":10000,\"bond_deductions\":0,\"esops_vest_period\":null,\"relocation_allowance\":0,\"additional_joining_bonus\":0,\"additional_retention_bonus\":0,\"additional_bond_deductions\":0,\"additional_esops_vest_period\":null,\"additional_relocation_allowance\":0},{\"course\":\"B.Tech\",\"discipline\":\"Data Analytics\",\"ctc_lpa\":65,\"fixed_component\":64,\"monthly_take_home\":5,\"joining_bonus\":20000,\"retention_bonus\":10000,\"bond_deductions\":0,\"esops_vest_period\":null,\"relocation_allowance\":0,\"additional_joining_bonus\":0,\"additional_retention_bonus\":0,\"additional_bond_deductions\":0,\"additional_esops_vest_period\":null,\"additional_relocation_allowance\":0}]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, '2026-03-28 22:10:57', '2026-03-28 22:10:57');

-- --------------------------------------------------------

--
-- Table structure for table `salary_document`
--

CREATE TABLE `salary_document` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `salary_id` bigint(20) UNSIGNED NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `mime_type` varchar(255) NOT NULL,
  `size` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `role` enum('admin','recruiter') NOT NULL DEFAULT 'recruiter',
  `company_id` bigint(20) UNSIGNED DEFAULT NULL,
  `is_approved` tinyint(1) NOT NULL DEFAULT 0,
  `portal_type` enum('INF','JNF') NOT NULL DEFAULT 'JNF'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `email_verified_at`, `password`, `remember_token`, `created_at`, `updated_at`, `role`, `company_id`, `is_approved`, `portal_type`) VALUES
(1, 'Placement Admin', '24je0900@iitism.ac.in', NULL, '$2y$12$hyzj8cExcAcxCqLVvvLg3e0Z.inebg.XtElT9DBxjbyNSX4.zzrcq', NULL, '2026-03-28 11:25:40', '2026-03-28 11:25:40', 'admin', 1, 1, 'JNF'),
(2, 'Demo Recruiter', 'recruiter@demo.com', NULL, '$2y$12$jT.VwYnh7HrZL/V3FkDGPuFbmBuEnH2rhvjNd3FNlztte4Uc9KWeO', NULL, '2026-03-28 11:25:40', '2026-03-28 11:25:40', 'recruiter', 1, 1, 'JNF');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cache`
--
ALTER TABLE `cache`
  ADD PRIMARY KEY (`key`),
  ADD KEY `cache_expiration_index` (`expiration`);

--
-- Indexes for table `cache_locks`
--
ALTER TABLE `cache_locks`
  ADD PRIMARY KEY (`key`),
  ADD KEY `cache_locks_expiration_index` (`expiration`);

--
-- Indexes for table `company`
--
ALTER TABLE `company`
  ADD PRIMARY KEY (`company_id`);

--
-- Indexes for table `company_document`
--
ALTER TABLE `company_document`
  ADD PRIMARY KEY (`id`),
  ADD KEY `company_document_company_id_foreign` (`company_id`);

--
-- Indexes for table `contact_person`
--
ALTER TABLE `contact_person`
  ADD PRIMARY KEY (`id`),
  ADD KEY `contact_person_company_id_foreign` (`company_id`);

--
-- Indexes for table `declaration`
--
ALTER TABLE `declaration`
  ADD PRIMARY KEY (`id`),
  ADD KEY `declaration_job_id_foreign` (`job_id`);

--
-- Indexes for table `eligibility`
--
ALTER TABLE `eligibility`
  ADD PRIMARY KEY (`id`),
  ADD KEY `eligibility_job_id_foreign` (`job_id`);

--
-- Indexes for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Indexes for table `hiring_stage`
--
ALTER TABLE `hiring_stage`
  ADD PRIMARY KEY (`stage_id`),
  ADD UNIQUE KEY `hiring_stage_name_unique` (`name`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `jobs_queue_index` (`queue`);

--
-- Indexes for table `job_application`
--
ALTER TABLE `job_application`
  ADD PRIMARY KEY (`id`),
  ADD KEY `job_application_job_id_foreign` (`job_id`),
  ADD KEY `job_application_current_stage_id_foreign` (`current_stage_id`);

--
-- Indexes for table `job_batches`
--
ALTER TABLE `job_batches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `job_document`
--
ALTER TABLE `job_document`
  ADD PRIMARY KEY (`id`),
  ADD KEY `job_document_job_id_foreign` (`job_id`);

--
-- Indexes for table `job_profile`
--
ALTER TABLE `job_profile`
  ADD PRIMARY KEY (`job_id`),
  ADD KEY `job_profile_company_id_foreign` (`company_id`),
  ADD KEY `job_profile_cycle_id_foreign` (`cycle_id`),
  ADD KEY `job_profile_parent_job_id_foreign` (`parent_job_id`);

--
-- Indexes for table `job_stage`
--
ALTER TABLE `job_stage`
  ADD PRIMARY KEY (`id`),
  ADD KEY `job_stage_job_id_foreign` (`job_id`),
  ADD KEY `job_stage_stage_id_foreign` (`stage_id`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`email`);

--
-- Indexes for table `recruitment_cycle`
--
ALTER TABLE `recruitment_cycle`
  ADD PRIMARY KEY (`cycle_id`);

--
-- Indexes for table `salary`
--
ALTER TABLE `salary`
  ADD PRIMARY KEY (`salary_id`),
  ADD KEY `salary_job_id_foreign` (`job_id`);

--
-- Indexes for table `salary_document`
--
ALTER TABLE `salary_document`
  ADD PRIMARY KEY (`id`),
  ADD KEY `salary_document_salary_id_foreign` (`salary_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sessions_user_id_index` (`user_id`),
  ADD KEY `sessions_last_activity_index` (`last_activity`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`),
  ADD KEY `users_company_id_foreign` (`company_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `company`
--
ALTER TABLE `company`
  MODIFY `company_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `company_document`
--
ALTER TABLE `company_document`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `contact_person`
--
ALTER TABLE `contact_person`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `declaration`
--
ALTER TABLE `declaration`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `eligibility`
--
ALTER TABLE `eligibility`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hiring_stage`
--
ALTER TABLE `hiring_stage`
  MODIFY `stage_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `job_application`
--
ALTER TABLE `job_application`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `job_document`
--
ALTER TABLE `job_document`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `job_profile`
--
ALTER TABLE `job_profile`
  MODIFY `job_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `job_stage`
--
ALTER TABLE `job_stage`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=99;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `recruitment_cycle`
--
ALTER TABLE `recruitment_cycle`
  MODIFY `cycle_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `salary`
--
ALTER TABLE `salary`
  MODIFY `salary_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `salary_document`
--
ALTER TABLE `salary_document`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `company_document`
--
ALTER TABLE `company_document`
  ADD CONSTRAINT `company_document_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `company` (`company_id`) ON DELETE CASCADE;

--
-- Constraints for table `contact_person`
--
ALTER TABLE `contact_person`
  ADD CONSTRAINT `contact_person_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `company` (`company_id`) ON DELETE CASCADE;

--
-- Constraints for table `declaration`
--
ALTER TABLE `declaration`
  ADD CONSTRAINT `declaration_job_id_foreign` FOREIGN KEY (`job_id`) REFERENCES `job_profile` (`job_id`) ON DELETE CASCADE;

--
-- Constraints for table `eligibility`
--
ALTER TABLE `eligibility`
  ADD CONSTRAINT `eligibility_job_id_foreign` FOREIGN KEY (`job_id`) REFERENCES `job_profile` (`job_id`) ON DELETE CASCADE;

--
-- Constraints for table `job_application`
--
ALTER TABLE `job_application`
  ADD CONSTRAINT `job_application_current_stage_id_foreign` FOREIGN KEY (`current_stage_id`) REFERENCES `job_stage` (`id`),
  ADD CONSTRAINT `job_application_job_id_foreign` FOREIGN KEY (`job_id`) REFERENCES `job_profile` (`job_id`) ON DELETE CASCADE;

--
-- Constraints for table `job_document`
--
ALTER TABLE `job_document`
  ADD CONSTRAINT `job_document_job_id_foreign` FOREIGN KEY (`job_id`) REFERENCES `job_profile` (`job_id`) ON DELETE CASCADE;

--
-- Constraints for table `job_profile`
--
ALTER TABLE `job_profile`
  ADD CONSTRAINT `job_profile_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `company` (`company_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `job_profile_cycle_id_foreign` FOREIGN KEY (`cycle_id`) REFERENCES `recruitment_cycle` (`cycle_id`),
  ADD CONSTRAINT `job_profile_parent_job_id_foreign` FOREIGN KEY (`parent_job_id`) REFERENCES `job_profile` (`job_id`) ON DELETE SET NULL;

--
-- Constraints for table `job_stage`
--
ALTER TABLE `job_stage`
  ADD CONSTRAINT `job_stage_job_id_foreign` FOREIGN KEY (`job_id`) REFERENCES `job_profile` (`job_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `job_stage_stage_id_foreign` FOREIGN KEY (`stage_id`) REFERENCES `hiring_stage` (`stage_id`);

--
-- Constraints for table `salary`
--
ALTER TABLE `salary`
  ADD CONSTRAINT `salary_job_id_foreign` FOREIGN KEY (`job_id`) REFERENCES `job_profile` (`job_id`) ON DELETE CASCADE;

--
-- Constraints for table `salary_document`
--
ALTER TABLE `salary_document`
  ADD CONSTRAINT `salary_document_salary_id_foreign` FOREIGN KEY (`salary_id`) REFERENCES `salary` (`salary_id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `company` (`company_id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
