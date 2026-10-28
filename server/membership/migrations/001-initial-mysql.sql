-- Fresh, dedicated AENural database only. Review before importing.
-- Better Auth 1.7.14 generated schema plus application tables.
-- No DROP, data reset or remote connection is performed by the generator.
SET NAMES utf8mb4;

create table `user` (`id` varchar(36) not null primary key, `name` varchar(255) not null, `email` varchar(255) not null unique, `emailVerified` boolean not null, `image` text, `createdAt` timestamp(3) default CURRENT_TIMESTAMP(3) not null, `updatedAt` timestamp(3) default CURRENT_TIMESTAMP(3) not null);

create table `session` (`id` varchar(36) not null primary key, `expiresAt` timestamp(3) not null, `token` varchar(255) not null unique, `createdAt` timestamp(3) default CURRENT_TIMESTAMP(3) not null, `updatedAt` timestamp(3) not null, `ipAddress` text, `userAgent` text, `userId` varchar(36) not null references `user` (`id`) on delete cascade);

create table `account` (`id` varchar(36) not null primary key, `accountId` text not null, `providerId` text not null, `userId` varchar(36) not null references `user` (`id`) on delete cascade, `accessToken` text, `refreshToken` text, `idToken` text, `accessTokenExpiresAt` timestamp(3), `refreshTokenExpiresAt` timestamp(3), `scope` text, `password` text, `createdAt` timestamp(3) default CURRENT_TIMESTAMP(3) not null, `updatedAt` timestamp(3) not null);

create table `verification` (`id` varchar(36) not null primary key, `identifier` varchar(255) not null, `value` text not null, `expiresAt` timestamp(3) not null, `createdAt` timestamp(3) default CURRENT_TIMESTAMP(3) not null, `updatedAt` timestamp(3) default CURRENT_TIMESTAMP(3) not null);

create table `rateLimit` (`id` varchar(36) not null primary key, `key` varchar(255) not null unique, `count` integer not null, `lastRequest` bigint not null);

create index `session_userId_idx` on `session` (`userId`);

create index `account_userId_idx` on `account` (`userId`);

create index `verification_identifier_idx` on `verification` (`identifier`);

create table if not exists `aenural_operation_limits` (`id` varchar(128) primary key, `owner_id` varchar(36) not null references `user` (`id`) on delete cascade, `used` integer default 0 not null, `expires_at` varchar(32) not null);

create table if not exists `aenural_orders` (`id` varchar(128) primary key, `owner_id` varchar(36) not null references `user` (`id`) on delete cascade, `provider` varchar(32) not null, `provider_order_id` varchar(128) not null, `status` varchar(20) not null, `amount_minor` integer not null, `currency` varchar(3) not null, `test_mode` integer not null, `provider_updated_at` varchar(32) not null, `created_at` varchar(32) not null, constraint `aenural_orders_provider_unique` unique (`provider`, `provider_order_id`, `test_mode`));

create table if not exists `aenural_checkouts` (`id` varchar(36) primary key, `owner_id` varchar(36) not null references `user` (`id`) on delete cascade, `provider_id` varchar(128), `created_at` varchar(32) not null);

create table if not exists `aenural_webhooks` (`id` varchar(64) primary key, `processed_at` varchar(32) not null);

create table if not exists `aenural_daily_usage` (`id` varchar(80) primary key, `owner_id` varchar(36) not null references `user` (`id`) on delete cascade, `day` varchar(10) not null, `used` integer default 0 not null);

create table if not exists `aenural_caption_jobs` (`id` varchar(36) primary key, `owner_id` varchar(36) not null references `user` (`id`) on delete cascade, `video_id` varchar(36) not null, `day` varchar(10) not null, `duration_ms` integer not null, `quality` varchar(16) not null, `status` varchar(16) not null, `created_at` varchar(32) not null, constraint `aenural_video_day_unique` unique (`owner_id`, `video_id`, `day`));

create table if not exists `aenural_projects` (`id` varchar(36) primary key, `owner_id` varchar(36) not null references `user` (`id`) on delete cascade, `title` varchar(100) not null, `payload` longtext not null, `revision` integer default 1 not null, `created_at` varchar(32) not null, `updated_at` varchar(32) not null);

create table if not exists `aenural_activity` (`id` varchar(36) primary key, `owner_id` varchar(36) not null references `user` (`id`) on delete cascade, `action` varchar(24) not null, `project_id` varchar(36), `created_at` varchar(32) not null);

create index `aenural_orders_owner_idx` on `aenural_orders` (`owner_id`, `test_mode`);

create index `aenural_projects_owner_idx` on `aenural_projects` (`owner_id`, `updated_at`);

create index `aenural_activity_owner_idx` on `aenural_activity` (`owner_id`, `created_at`);

create index `aenural_checkouts_owner_idx` on `aenural_checkouts` (`owner_id`, `created_at`);
