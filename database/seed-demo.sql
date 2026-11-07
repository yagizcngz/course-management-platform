-- E-Kurs: schema and demo data for SQL Server, safe to run more than once.
--   sqlcmd -S localhost\SQLEXPRESS -E -C -Q "CREATE DATABASE EdTechDB"   (if it does not exist)
--   sqlcmd -S localhost\SQLEXPRESS -E -C -d EdTechDB -i database\seed-demo.sql
-- The schema part only applies migrations the database has not seen; the data part is skipped
-- when demo_admin already exists. Running the API in Development seeds the same data itself.
-- sqlcmd starts with QUOTED_IDENTIFIER off; the filtered unique indexes need it on.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO
IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260714095030_InitialCreate'
)
BEGIN
    CREATE TABLE [Courses] (
        [Id] int NOT NULL IDENTITY,
        [Title] nvarchar(max) NOT NULL,
        [MaxCapacity] int NOT NULL,
        CONSTRAINT [PK_Courses] PRIMARY KEY ([Id])
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260714095030_InitialCreate'
)
BEGIN
    CREATE TABLE [Students] (
        [Id] int NOT NULL IDENTITY,
        [FirstName] nvarchar(max) NOT NULL,
        [LastName] nvarchar(max) NOT NULL,
        [StudentNumber] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_Students] PRIMARY KEY ([Id])
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260714095030_InitialCreate'
)
BEGIN
    CREATE TABLE [Enrollments] (
        [Id] int NOT NULL IDENTITY,
        [StudentId] int NOT NULL,
        [CourseId] int NOT NULL,
        [Grade] decimal(5,2) NOT NULL,
        CONSTRAINT [PK_Enrollments] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Enrollments_Courses_CourseId] FOREIGN KEY ([CourseId]) REFERENCES [Courses] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_Enrollments_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id]) ON DELETE CASCADE
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260714095030_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Enrollments_CourseId] ON [Enrollments] ([CourseId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260714095030_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Enrollments_StudentId] ON [Enrollments] ([StudentId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260714095030_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260714095030_InitialCreate', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260715103439_AddCourseTable'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260715103439_AddCourseTable', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260716070427_AddUsersTable'
)
BEGIN
    DECLARE @var nvarchar(max);
    SELECT @var = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Enrollments]') AND [c].[name] = N'Grade');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [Enrollments] DROP CONSTRAINT ' + @var + ';');
    ALTER TABLE [Enrollments] ALTER COLUMN [Grade] decimal(18,2) NOT NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260716070427_AddUsersTable'
)
BEGIN
    CREATE TABLE [Users] (
        [Id] int NOT NULL IDENTITY,
        [Username] nvarchar(max) NOT NULL,
        [Password] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260716070427_AddUsersTable'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Password', N'Username') AND [object_id] = OBJECT_ID(N'[Users]'))
        SET IDENTITY_INSERT [Users] ON;
    EXEC(N'INSERT INTO [Users] ([Id], [Password], [Username])
    VALUES (1, N''password123'', N''admin'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Password', N'Username') AND [object_id] = OBJECT_ID(N'[Users]'))
        SET IDENTITY_INSERT [Users] OFF;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260716070427_AddUsersTable'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260716070427_AddUsersTable', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260717061244_AddUserRoleColumn'
)
BEGIN
    ALTER TABLE [Users] ADD [Role] nvarchar(max) NOT NULL DEFAULT N'';
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260717061244_AddUserRoleColumn'
)
BEGIN
    EXEC(N'UPDATE [Users] SET [Role] = N''User''
    WHERE [Id] = 1;
    SELECT @@ROWCOUNT');
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260717061244_AddUserRoleColumn'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260717061244_AddUserRoleColumn', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260717073226_AddCourseDetails'
)
BEGIN
    ALTER TABLE [Courses] ADD [Category] nvarchar(max) NOT NULL DEFAULT N'';
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260717073226_AddCourseDetails'
)
BEGIN
    ALTER TABLE [Courses] ADD [Instructor] nvarchar(max) NOT NULL DEFAULT N'';
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260717073226_AddCourseDetails'
)
BEGIN
    ALTER TABLE [Courses] ADD [Price] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260717073226_AddCourseDetails'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260717073226_AddCourseDetails', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260719204144_AddEnrollmentDate'
)
BEGIN
    ALTER TABLE [Enrollments] ADD [EnrollmentDate] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260719204144_AddEnrollmentDate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260719204144_AddEnrollmentDate', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260721055359_MakeStudentNumberUnique'
)
BEGIN
    DECLARE @var1 nvarchar(max);
    SELECT @var1 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Students]') AND [c].[name] = N'StudentNumber');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [Students] DROP CONSTRAINT ' + @var1 + ';');
    ALTER TABLE [Students] ALTER COLUMN [StudentNumber] nvarchar(450) NOT NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260721055359_MakeStudentNumberUnique'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Students_StudentNumber] ON [Students] ([StudentNumber]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260721055359_MakeStudentNumberUnique'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260721055359_MakeStudentNumberUnique', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260721061839_AddEmailToStudent'
)
BEGIN
    ALTER TABLE [Students] ADD [Email] nvarchar(max) NOT NULL DEFAULT N'';
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260721061839_AddEmailToStudent'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260721061839_AddEmailToStudent', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260721062442_AddDateToStudent'
)
BEGIN
    ALTER TABLE [Students] ADD [Date] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260721062442_AddDateToStudent'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260721062442_AddDateToStudent', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260721181831_AddStudentProfileFields'
)
BEGIN
    ALTER TABLE [Students] ADD [AboutMe] nvarchar(max) NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260721181831_AddStudentProfileFields'
)
BEGIN
    ALTER TABLE [Students] ADD [ProfilePictureUrl] nvarchar(max) NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260721181831_AddStudentProfileFields'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260721181831_AddStudentProfileFields', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260722054531_AddUserIdToStudent'
)
BEGIN
    ALTER TABLE [Students] ADD [UserId] int NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260722054531_AddUserIdToStudent'
)
BEGIN
    CREATE INDEX [IX_Students_UserId] ON [Students] ([UserId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260722054531_AddUserIdToStudent'
)
BEGIN
    ALTER TABLE [Students] ADD CONSTRAINT [FK_Students_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260722054531_AddUserIdToStudent'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260722054531_AddUserIdToStudent', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260722061553_AddProfileFieldsToUser'
)
BEGIN
    EXEC(N'DELETE FROM [Users]
    WHERE [Id] = 1;
    SELECT @@ROWCOUNT');
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260722061553_AddProfileFieldsToUser'
)
BEGIN
    ALTER TABLE [Users] ADD [AboutMe] nvarchar(max) NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260722061553_AddProfileFieldsToUser'
)
BEGIN
    ALTER TABLE [Users] ADD [ProfilePictureUrl] nvarchar(max) NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260722061553_AddProfileFieldsToUser'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260722061553_AddProfileFieldsToUser', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260722074231_AddCourseDescription'
)
BEGIN
    ALTER TABLE [Courses] ADD [Description] nvarchar(max) NOT NULL DEFAULT N'';
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260722074231_AddCourseDescription'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260722074231_AddCourseDescription', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260722084500_AddImageUrlToCourse'
)
BEGIN
    ALTER TABLE [Courses] ADD [ImageUrl] nvarchar(max) NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260722084500_AddImageUrlToCourse'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260722084500_AddImageUrlToCourse', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260723063250_AddSoftDeleteAndTeachers'
)
BEGIN
    ALTER TABLE [Students] ADD [DeletedAt] datetime2 NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260723063250_AddSoftDeleteAndTeachers'
)
BEGIN
    ALTER TABLE [Students] ADD [IsDeleted] bit NOT NULL DEFAULT CAST(0 AS bit);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260723063250_AddSoftDeleteAndTeachers'
)
BEGIN
    ALTER TABLE [Enrollments] ADD [DeletedAt] datetime2 NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260723063250_AddSoftDeleteAndTeachers'
)
BEGIN
    ALTER TABLE [Enrollments] ADD [IsDeleted] bit NOT NULL DEFAULT CAST(0 AS bit);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260723063250_AddSoftDeleteAndTeachers'
)
BEGIN
    ALTER TABLE [Courses] ADD [DeletedAt] datetime2 NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260723063250_AddSoftDeleteAndTeachers'
)
BEGIN
    ALTER TABLE [Courses] ADD [IsDeleted] bit NOT NULL DEFAULT CAST(0 AS bit);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260723063250_AddSoftDeleteAndTeachers'
)
BEGIN
    CREATE TABLE [Teachers] (
        [Id] int NOT NULL IDENTITY,
        [FirstName] nvarchar(max) NOT NULL,
        [LastName] nvarchar(max) NOT NULL,
        [Email] nvarchar(max) NOT NULL,
        [Branch] nvarchar(max) NULL,
        [Date] datetime2 NOT NULL,
        [ProfilePictureUrl] nvarchar(max) NULL,
        [AboutMe] nvarchar(max) NULL,
        [UserId] int NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_Teachers] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Teachers_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260723063250_AddSoftDeleteAndTeachers'
)
BEGIN
    CREATE INDEX [IX_Teachers_UserId] ON [Teachers] ([UserId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260723063250_AddSoftDeleteAndTeachers'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260723063250_AddSoftDeleteAndTeachers', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260723081441_AddTeacherIdToCourse'
)
BEGIN
    ALTER TABLE [Courses] ADD [TeacherId] int NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260723081441_AddTeacherIdToCourse'
)
BEGIN
    CREATE INDEX [IX_Courses_TeacherId] ON [Courses] ([TeacherId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260723081441_AddTeacherIdToCourse'
)
BEGIN
    ALTER TABLE [Courses] ADD CONSTRAINT [FK_Courses_Teachers_TeacherId] FOREIGN KEY ([TeacherId]) REFERENCES [Teachers] ([Id]) ON DELETE SET NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260723081441_AddTeacherIdToCourse'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260723081441_AddTeacherIdToCourse', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260723095241_AddNameFieldsToUser'
)
BEGIN
    ALTER TABLE [Users] ADD [FirstName] nvarchar(max) NOT NULL DEFAULT N'';
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260723095241_AddNameFieldsToUser'
)
BEGIN
    ALTER TABLE [Users] ADD [LastName] nvarchar(max) NOT NULL DEFAULT N'';
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260723095241_AddNameFieldsToUser'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260723095241_AddNameFieldsToUser', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260724070027_AddTeacherNumber'
)
BEGIN
    ALTER TABLE [Teachers] ADD [TeacherNumber] nvarchar(max) NOT NULL DEFAULT N'';
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260724070027_AddTeacherNumber'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260724070027_AddTeacherNumber', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727063949_AddEmailToUser'
)
BEGIN
    ALTER TABLE [Users] ADD [Email] nvarchar(max) NOT NULL DEFAULT N'';
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727063949_AddEmailToUser'
)
BEGIN
    UPDATE Users SET Email = Username + '@ekurs.com' WHERE Email = ''
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727063949_AddEmailToUser'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260727063949_AddEmailToUser', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727082606_AddUserSettings'
)
BEGIN
    ALTER TABLE [Users] ADD [IsProfilePublic] bit NOT NULL DEFAULT CAST(0 AS bit);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727082606_AddUserSettings'
)
BEGIN
    ALTER TABLE [Users] ADD [ReceiveEmailNotifications] bit NOT NULL DEFAULT CAST(0 AS bit);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727082606_AddUserSettings'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260727082606_AddUserSettings', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727083240_AddPhase2Entities'
)
BEGIN
    CREATE TABLE [Categories] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(max) NOT NULL,
        [Description] nvarchar(max) NULL,
        CONSTRAINT [PK_Categories] PRIMARY KEY ([Id])
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727083240_AddPhase2Entities'
)
BEGIN
    CREATE TABLE [SystemSettings] (
        [Id] int NOT NULL IDENTITY,
        [SettingKey] nvarchar(max) NOT NULL,
        [SettingValue] nvarchar(max) NOT NULL,
        [Description] nvarchar(max) NULL,
        CONSTRAINT [PK_SystemSettings] PRIMARY KEY ([Id])
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727083240_AddPhase2Entities'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260727083240_AddPhase2Entities', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727120222_AddCreatedAtAndFeatured'
)
BEGIN
    EXEC sp_rename N'[Teachers].[Date]', N'CreatedAt', 'COLUMN';
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727120222_AddCreatedAtAndFeatured'
)
BEGIN
    EXEC sp_rename N'[Students].[Date]', N'CreatedAt', 'COLUMN';
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727120222_AddCreatedAtAndFeatured'
)
BEGIN
    ALTER TABLE [Courses] ADD [CreatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727120222_AddCreatedAtAndFeatured'
)
BEGIN
    ALTER TABLE [Courses] ADD [IsFeatured] bit NOT NULL DEFAULT CAST(0 AS bit);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727120222_AddCreatedAtAndFeatured'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260727120222_AddCreatedAtAndFeatured', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727124138_AddStudentDashboardFeatures'
)
BEGIN
    ALTER TABLE [Enrollments] ADD [Status] nvarchar(max) NOT NULL DEFAULT N'';
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727124138_AddStudentDashboardFeatures'
)
BEGIN
    CREATE TABLE [Announcements] (
        [Id] int NOT NULL IDENTITY,
        [Title] nvarchar(max) NOT NULL,
        [Content] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_Announcements] PRIMARY KEY ([Id])
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260727124138_AddStudentDashboardFeatures'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260727124138_AddStudentDashboardFeatures', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260728063959_AddTeachingRequests'
)
BEGIN
    CREATE TABLE [TeachingRequests] (
        [Id] int NOT NULL IDENTITY,
        [CourseId] int NOT NULL,
        [TeacherId] int NOT NULL,
        [Status] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_TeachingRequests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_TeachingRequests_Courses_CourseId] FOREIGN KEY ([CourseId]) REFERENCES [Courses] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_TeachingRequests_Teachers_TeacherId] FOREIGN KEY ([TeacherId]) REFERENCES [Teachers] ([Id]) ON DELETE CASCADE
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260728063959_AddTeachingRequests'
)
BEGIN
    CREATE INDEX [IX_TeachingRequests_CourseId] ON [TeachingRequests] ([CourseId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260728063959_AddTeachingRequests'
)
BEGIN
    CREATE INDEX [IX_TeachingRequests_TeacherId] ON [TeachingRequests] ([TeacherId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260728063959_AddTeachingRequests'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260728063959_AddTeachingRequests', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260729121714_AddSupportRequests'
)
BEGIN
    CREATE TABLE [SupportRequests] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NULL,
        [Name] nvarchar(max) NOT NULL,
        [Email] nvarchar(max) NOT NULL,
        [Phone] nvarchar(max) NULL,
        [Message] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [IsResolved] bit NOT NULL,
        [ReplyMessage] nvarchar(max) NULL,
        [RepliedAt] datetime2 NULL,
        CONSTRAINT [PK_SupportRequests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SupportRequests_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260729121714_AddSupportRequests'
)
BEGIN
    CREATE INDEX [IX_SupportRequests_UserId] ON [SupportRequests] ([UserId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260729121714_AddSupportRequests'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260729121714_AddSupportRequests', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260729130148_AddIsDeletedByAdminToRequests'
)
BEGIN
    ALTER TABLE [TeachingRequests] ADD [IsDeletedByAdmin] bit NOT NULL DEFAULT CAST(0 AS bit);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260729130148_AddIsDeletedByAdminToRequests'
)
BEGIN
    ALTER TABLE [SupportRequests] ADD [IsDeletedByAdmin] bit NOT NULL DEFAULT CAST(0 AS bit);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260729130148_AddIsDeletedByAdminToRequests'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260729130148_AddIsDeletedByAdminToRequests', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103154912_AddWalletAndLessons'
)
BEGIN
    DROP INDEX [IX_Enrollments_StudentId] ON [Enrollments];
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103154912_AddWalletAndLessons'
)
BEGIN
    DECLARE @var2 nvarchar(max);
    SELECT @var2 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Users]') AND [c].[name] = N'Username');
    IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [Users] DROP CONSTRAINT ' + @var2 + ';');
    ALTER TABLE [Users] ALTER COLUMN [Username] nvarchar(450) NOT NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103154912_AddWalletAndLessons'
)
BEGIN
    ALTER TABLE [Users] ADD [Balance] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103154912_AddWalletAndLessons'
)
BEGIN
    CREATE TABLE [Lessons] (
        [Id] int NOT NULL IDENTITY,
        [CourseId] int NOT NULL,
        [Title] nvarchar(max) NOT NULL,
        [Description] nvarchar(max) NULL,
        [VideoUrl] nvarchar(max) NULL,
        [Order] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_Lessons] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Lessons_Courses_CourseId] FOREIGN KEY ([CourseId]) REFERENCES [Courses] ([Id]) ON DELETE CASCADE
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103154912_AddWalletAndLessons'
)
BEGIN
    CREATE TABLE [WalletTransactions] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [Type] nvarchar(max) NOT NULL,
        [CourseId] int NULL,
        [Description] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_WalletTransactions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WalletTransactions_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103154912_AddWalletAndLessons'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Users_Username] ON [Users] ([Username]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103154912_AddWalletAndLessons'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Enrollments_StudentId_CourseId] ON [Enrollments] ([StudentId], [CourseId]) WHERE [IsDeleted] = 0');
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103154912_AddWalletAndLessons'
)
BEGIN
    CREATE INDEX [IX_Lessons_CourseId] ON [Lessons] ([CourseId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103154912_AddWalletAndLessons'
)
BEGIN
    CREATE INDEX [IX_WalletTransactions_UserId_CreatedAt] ON [WalletTransactions] ([UserId], [CreatedAt]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103154912_AddWalletAndLessons'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103154912_AddWalletAndLessons', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103162858_AddWalletRelatedTransaction'
)
BEGIN
    ALTER TABLE [WalletTransactions] ADD [RelatedTransactionId] int NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103162858_AddWalletRelatedTransaction'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103162858_AddWalletRelatedTransaction', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105151003_AddTeacherApplications'
)
BEGIN
    CREATE TABLE [TeacherApplications] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [Branch] nvarchar(max) NOT NULL,
        [AboutMe] nvarchar(max) NOT NULL,
        [Status] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ReviewedAt] datetime2 NULL,
        CONSTRAINT [PK_TeacherApplications] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_TeacherApplications_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105151003_AddTeacherApplications'
)
BEGIN
    CREATE INDEX [IX_TeacherApplications_UserId] ON [TeacherApplications] ([UserId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105151003_AddTeacherApplications'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261105151003_AddTeacherApplications', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105151832_AddCourseLevel'
)
BEGIN
    ALTER TABLE [Courses] ADD [Level] nvarchar(max) NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105151832_AddCourseLevel'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261105151832_AddCourseLevel', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105163348_AddCourseSubCategory'
)
BEGIN
    ALTER TABLE [Courses] ADD [SubCategory] nvarchar(max) NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105163348_AddCourseSubCategory'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261105163348_AddCourseSubCategory', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105170332_BoundCourseLevelAndSubCategory'
)
BEGIN
    DECLARE @var3 nvarchar(max);
    SELECT @var3 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Courses]') AND [c].[name] = N'SubCategory');
    IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [Courses] DROP CONSTRAINT ' + @var3 + ';');
    ALTER TABLE [Courses] ALTER COLUMN [SubCategory] nvarchar(100) NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105170332_BoundCourseLevelAndSubCategory'
)
BEGIN
    DECLARE @var4 nvarchar(max);
    SELECT @var4 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Courses]') AND [c].[name] = N'Level');
    IF @var4 IS NOT NULL EXEC(N'ALTER TABLE [Courses] DROP CONSTRAINT ' + @var4 + ';');
    ALTER TABLE [Courses] ALTER COLUMN [Level] nvarchar(20) NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105170332_BoundCourseLevelAndSubCategory'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261105170332_BoundCourseLevelAndSubCategory', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105222159_AddLessonCompletions'
)
BEGIN
    CREATE TABLE [LessonCompletions] (
        [Id] int NOT NULL IDENTITY,
        [StudentId] int NOT NULL,
        [LessonId] int NOT NULL,
        [CompletedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_LessonCompletions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_LessonCompletions_Lessons_LessonId] FOREIGN KEY ([LessonId]) REFERENCES [Lessons] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_LessonCompletions_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id]) ON DELETE CASCADE
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105222159_AddLessonCompletions'
)
BEGIN
    CREATE INDEX [IX_LessonCompletions_LessonId] ON [LessonCompletions] ([LessonId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105222159_AddLessonCompletions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_LessonCompletions_StudentId_LessonId] ON [LessonCompletions] ([StudentId], [LessonId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105222159_AddLessonCompletions'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261105222159_AddLessonCompletions', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105231712_UniqueWalletRelations'
)
BEGIN
    DECLARE @var5 nvarchar(max);
    SELECT @var5 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[WalletTransactions]') AND [c].[name] = N'Type');
    IF @var5 IS NOT NULL EXEC(N'ALTER TABLE [WalletTransactions] DROP CONSTRAINT ' + @var5 + ';');
    ALTER TABLE [WalletTransactions] ALTER COLUMN [Type] nvarchar(450) NOT NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105231712_UniqueWalletRelations'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_WalletTransactions_RelatedTransactionId_Type] ON [WalletTransactions] ([RelatedTransactionId], [Type]) WHERE [RelatedTransactionId] IS NOT NULL');
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105231712_UniqueWalletRelations'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261105231712_UniqueWalletRelations', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    DECLARE @var6 nvarchar(max);
    SELECT @var6 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Users]') AND [c].[name] = N'Role');
    IF @var6 IS NOT NULL EXEC(N'ALTER TABLE [Users] DROP CONSTRAINT ' + @var6 + ';');
    ALTER TABLE [Users] ALTER COLUMN [Role] nvarchar(450) NOT NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    ALTER TABLE [Users] ADD [DeletedAt] datetime2 NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    ALTER TABLE [Users] ADD [FeaturedBadges] nvarchar(400) NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    DELETE FROM SystemSettings WHERE SettingKey IN ('ADMIN_CODE', 'TEACHER_CODE')
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    UPDATE Users SET DeletedAt = SYSUTCDATETIME() WHERE Role = 'Deleted' AND DeletedAt IS NULL
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    CREATE TABLE [DirectMessages] (
        [Id] int NOT NULL IDENTITY,
        [SenderId] int NOT NULL,
        [RecipientId] int NOT NULL,
        [Body] nvarchar(2000) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ReadAt] datetime2 NULL,
        CONSTRAINT [PK_DirectMessages] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DirectMessages_Users_RecipientId] FOREIGN KEY ([RecipientId]) REFERENCES [Users] ([Id]),
        CONSTRAINT [FK_DirectMessages_Users_SenderId] FOREIGN KEY ([SenderId]) REFERENCES [Users] ([Id])
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    CREATE TABLE [ForumThreads] (
        [Id] int NOT NULL IDENTITY,
        [Topic] nvarchar(32) NOT NULL,
        [Title] nvarchar(160) NOT NULL,
        [AuthorId] int NULL,
        [CreatedAt] datetime2 NOT NULL,
        [LastActivityAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ForumThreads] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ForumThreads_Users_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [Users] ([Id])
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    CREATE TABLE [Friendships] (
        [Id] int NOT NULL IDENTITY,
        [RequesterId] int NOT NULL,
        [AddresseeId] int NOT NULL,
        [Status] nvarchar(16) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Friendships] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Friendships_Users_AddresseeId] FOREIGN KEY ([AddresseeId]) REFERENCES [Users] ([Id]),
        CONSTRAINT [FK_Friendships_Users_RequesterId] FOREIGN KEY ([RequesterId]) REFERENCES [Users] ([Id])
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    CREATE TABLE [ForumPosts] (
        [Id] int NOT NULL IDENTITY,
        [ThreadId] int NOT NULL,
        [AuthorId] int NULL,
        [Body] nvarchar(4000) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ForumPosts] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ForumPosts_ForumThreads_ThreadId] FOREIGN KEY ([ThreadId]) REFERENCES [ForumThreads] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ForumPosts_Users_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [Users] ([Id])
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    CREATE TABLE [ForumPostLikes] (
        [PostId] int NOT NULL,
        [UserId] int NOT NULL,
        CONSTRAINT [PK_ForumPostLikes] PRIMARY KEY ([PostId], [UserId]),
        CONSTRAINT [FK_ForumPostLikes_ForumPosts_PostId] FOREIGN KEY ([PostId]) REFERENCES [ForumPosts] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ForumPostLikes_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    CREATE INDEX [IX_Users_Role] ON [Users] ([Role]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    CREATE INDEX [IX_DirectMessages_RecipientId_ReadAt] ON [DirectMessages] ([RecipientId], [ReadAt]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    CREATE INDEX [IX_DirectMessages_SenderId_RecipientId_CreatedAt] ON [DirectMessages] ([SenderId], [RecipientId], [CreatedAt]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    CREATE INDEX [IX_ForumPostLikes_UserId] ON [ForumPostLikes] ([UserId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    CREATE INDEX [IX_ForumPosts_AuthorId] ON [ForumPosts] ([AuthorId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    CREATE INDEX [IX_ForumPosts_ThreadId] ON [ForumPosts] ([ThreadId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    CREATE INDEX [IX_ForumThreads_AuthorId] ON [ForumThreads] ([AuthorId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    CREATE INDEX [IX_ForumThreads_Topic_LastActivityAt] ON [ForumThreads] ([Topic], [LastActivityAt]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    CREATE INDEX [IX_Friendships_AddresseeId] ON [Friendships] ([AddresseeId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Friendships_RequesterId_AddresseeId] ON [Friendships] ([RequesterId], [AddresseeId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106083436_AddCommunityAndFeaturedBadges'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261106083436_AddCommunityAndFeaturedBadges', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107090609_AddCourseCompletions'
)
BEGIN
    CREATE TABLE [CourseCompletions] (
        [Id] int NOT NULL IDENTITY,
        [StudentId] int NOT NULL,
        [CourseId] int NOT NULL,
        [Category] nvarchar(max) NOT NULL,
        [Title] nvarchar(max) NOT NULL,
        [CompletedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_CourseCompletions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CourseCompletions_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id]) ON DELETE CASCADE
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107090609_AddCourseCompletions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CourseCompletions_StudentId_CourseId] ON [CourseCompletions] ([StudentId], [CourseId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107090609_AddCourseCompletions'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261107090609_AddCourseCompletions', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107141143_AddCourseRatings'
)
BEGIN
    CREATE TABLE [CourseRatings] (
        [Id] int NOT NULL IDENTITY,
        [CourseId] int NOT NULL,
        [StudentId] int NOT NULL,
        [Stars] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_CourseRatings] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_CourseRatings_Stars] CHECK ([Stars] BETWEEN 1 AND 5),
        CONSTRAINT [FK_CourseRatings_Courses_CourseId] FOREIGN KEY ([CourseId]) REFERENCES [Courses] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_CourseRatings_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id]) ON DELETE CASCADE
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107141143_AddCourseRatings'
)
BEGIN
    CREATE INDEX [IX_CourseRatings_CourseId] ON [CourseRatings] ([CourseId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107141143_AddCourseRatings'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CourseRatings_StudentId_CourseId] ON [CourseRatings] ([StudentId], [CourseId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107141143_AddCourseRatings'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261107141143_AddCourseRatings', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107141333_AddCourseFacets'
)
BEGIN
    ALTER TABLE [Lessons] ADD [DurationSeconds] int NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107141333_AddCourseFacets'
)
BEGIN
    ALTER TABLE [Courses] ADD [Language] nvarchar(8) NOT NULL DEFAULT N'tr';
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107141333_AddCourseFacets'
)
BEGIN
    ALTER TABLE [Courses] ADD [SubtitleLanguages] nvarchar(64) NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107141333_AddCourseFacets'
)
BEGIN
    ALTER TABLE [Courses] ADD [Topic] nvarchar(60) NULL;
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107141333_AddCourseFacets'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261107141333_AddCourseFacets', N'10.0.9');
END;
GO
COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107141859_AddBranchChangeRequests'
)
BEGIN
    CREATE TABLE [BranchChangeRequests] (
        [Id] int NOT NULL IDENTITY,
        [TeacherId] int NOT NULL,
        [CurrentBranch] nvarchar(400) NULL,
        [RequestedBranch] nvarchar(400) NOT NULL,
        [Status] nvarchar(16) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ReviewedAt] datetime2 NULL,
        CONSTRAINT [PK_BranchChangeRequests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_BranchChangeRequests_Teachers_TeacherId] FOREIGN KEY ([TeacherId]) REFERENCES [Teachers] ([Id]) ON DELETE CASCADE
    );
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107141859_AddBranchChangeRequests'
)
BEGIN
    CREATE INDEX [IX_BranchChangeRequests_Status_CreatedAt] ON [BranchChangeRequests] ([Status], [CreatedAt]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107141859_AddBranchChangeRequests'
)
BEGIN
    CREATE INDEX [IX_BranchChangeRequests_TeacherId] ON [BranchChangeRequests] ([TeacherId]);
END;
GO
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261107141859_AddBranchChangeRequests'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261107141859_AddBranchChangeRequests', N'10.0.9');
END;
GO
COMMIT;
GO


GO

-- E-Kurs demo data. Generated by database/export-seed.ps1; do not edit by hand.
-- Demo accounts: demo_admin, demo_teacher, demo_student; password: Demo-2026! (development only).
IF NOT EXISTS (SELECT 1 FROM [Users] WHERE [Username] = N'demo_admin')
BEGIN
SET NOCOUNT ON;
BEGIN TRANSACTION;
-- Categories (19)
SET IDENTITY_INSERT [Categories] ON;
INSERT INTO [Categories] ([Id], [Name], [Description]) VALUES
(1, N'Yazılım', N'Programlama dilleri, web ve backend geliştirme, veri yapıları ve algoritmalar. Sıfırdan başlayanlardan profesyonel geliştiricilere kadar, proje odaklı ve uygulamalı yazılım eğitimleri.'),
(2, N'Matematik', N'Temel matematikten analiz, geometri ve ayrık matematiğe uzanan konular. Kavramı önce sezgiyle, sonra ispat ve bol soru çözümüyle pekiştiren, sınavlara ve mühendisliğe hazırlayan dersler.'),
(3, N'Fen Bilimleri', N'Fizik, kimya, biyoloji ve astronomi. Deney mantığı, gözlem ve modelleme ile doğa olaylarını anlamayı amaçlayan, lise ve üniversite hazırlık düzeyinde fen eğitimleri.'),
(4, N'Coğrafya', N'Fiziki coğrafya, jeomorfoloji, iklim bilgisi, Türkiye coğrafyası, harita okuma ve Coğrafi Bilgi Sistemleri (CBS). Yeryüzünü şekillendiren süreçleri ve mekânsal düşünmeyi öğreten dersler.'),
(5, N'Sosyal Bilimler', N'Tarih, Cumhuriyet tarihi ve toplum bilimleri. Olayları kaynaklarıyla, neden-sonuç ilişkisi içinde okuyan; eleştirel düşünmeyi ve yorum gücünü geliştiren eğitimler.'),
(6, N'Yabancı Dil', N'İngilizce ve Almanca başta olmak üzere A1''den B2''ye seviyeli dil eğitimleri. Dinleme, konuşma, okuma ve yazma becerilerini günlük hayat ve iş senaryolarıyla birlikte geliştirir.'),
(7, N'Tasarım', N'UI/UX, grafik tasarım ve tipografi. Kullanıcı araştırmasından prototiplemeye, görsel hiyerarşiden marka kimliğine kadar dijital ve basılı ürünler için tasarım eğitimleri.'),
(8, N'Sanat', N'Karakalem, desen, renk kuramı ve sanat tarihi. Gözlem yeteneğini ve el becerisini geliştiren, sanat eserlerini dönem ve bağlamıyla okumayı öğreten atölye dersleri.'),
(9, N'Müzik', N'Piyano, gitar ve temel müzik teorisi. Nota okumadan ritim ve armoniye, ilk parçadan sahne performansına kadar seviyeli enstrüman eğitimleri.'),
(10, N'Spor', N'Beden eğitimi, fonksiyonel antrenman ve sağlıklı yaşam. Doğru teknik, sakatlıktan korunma ve sürdürülebilir bir antrenman alışkanlığı kazandıran programlar.'),
(11, N'Veri Bilimi & Yapay Zeka', N'Veri analizi, istatistiksel modelleme, makine öğrenmesi ve derin öğrenme. Python ile veriyi temizlemekten model kurup sonuçlarını dürüstçe yorumlamaya kadar uygulamalı veri bilimi eğitimleri.'),
(12, N'Ekonomi & Finans', N'Mikro ve makroekonomi, para politikası, muhasebe ve kişisel finans. Piyasaları, finansal tabloları ve ekonomik haberleri bilinçli okumayı öğreten dersler.'),
(13, N'Edebiyat & Felsefe', N'Türk ve dünya edebiyatı, felsefenin büyük soruları, mantık ve eleştirel düşünme. Metni dikkatle okumayı, argüman kurmayı ve kendi yorumunu yazmayı öğreten dersler.'),
(14, N'Fotoğrafçılık & Sinema', N'Dijital fotoğrafçılık, sinema dili, film analizi ve kısa film yapımı. Işığı, kadrajı ve kurguyu anlayarak görüntüyle hikâye anlatmayı öğreten atölyeler.'),
(15, N'Türk Dili ve Edebiyatı', N'Türkçe dil bilgisi, paragraf ve anlam bilgisi, metin analizi, kompozisyon, Cumhuriyet dönemi edebiyatı ve Osmanlı Türkçesi paleografyası. Anadil bilincini, etkili sözlü ve yazılı iletişimi ile zengin edebiyat geleneğimizi akademik derinlikle kazandıran dersler.'),
(16, N'Psikoloji & Bilişsel Bilimler', N'Gelişim psikolojisi, bilişsel modeller, zihin felsefesi, sosyal psikoloji, deneysel desenler ve davranışsal araştırma yöntemleri. İnsan davranışını, düşünme süreçlerini ve zihnin biyolojik ile hesaplamalı temellerini bilimsel yöntemlerle inceleyen dersler.'),
(17, N'Hukuk & Kamu Yönetimi', N'Anayasa ve idare hukuku, borçlar ve ticaret hukuku, bilişim ve kişisel verilerin korunması hukuku. Kuralları gerekçeleriyle okuyan, somut olay çözümüyle pekiştiren ve kamu yönetiminin işleyişini anlatan dersler.'),
(18, N'Mühendislik & Robotik', N'Gömülü sistemler, elektronik, robotik, kontrol sistemleri ve CAD ile mekanik tasarım. Devreyi kurup kodlayan, mekanizmayı çizip üreten, proje odaklı mühendislik atölyeleri.'),
(19, N'Genel', N'Etkili çalışma teknikleri, zaman yönetimi ve genel kültür. Her alandaki öğrenmeyi destekleyen, branşlar arası beceri eğitimleri.');
SET IDENTITY_INSERT [Categories] OFF;
-- Users (96)
SET IDENTITY_INSERT [Users] ON;
INSERT INTO [Users] ([Id], [Username], [Password], [Role], [AboutMe], [ProfilePictureUrl], [FirstName], [LastName], [Email], [IsProfilePublic], [ReceiveEmailNotifications], [Balance], [DeletedAt], [FeaturedBadges]) VALUES
(2, N'emre.aydin', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Kıdemli backend geliştirici. Bilgisayar Mühendisliği lisansını ODTÜ''de tamamladı; on iki yıldır fintech ve e-ticaret şirketlerinde .NET, Java ve dağıtık sistemler üzerine çalışıyor. Ölçeklenebilir API tasarımı, temiz mimari ve test odaklı geliştirme konularında ekiplere mentorluk yapıyor. Derslerinde her konuyu gerçek bir proje üzerinde, kod incelemesi yaparak anlatıyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=emre.aydin&backgroundColor=ece4d2', N'Emre', N'Aydın', N'emre.aydin@edtech.example', 1, 1, 7204.40, NULL, NULL),
(3, N'zeynep.arslan', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Algoritmalar ve ayrık matematik eğitmeni. Boğaziçi Üniversitesi Matematik bölümünden mezun, Bilgisayar Bilimleri yüksek lisansını kombinatoryal optimizasyon üzerine yaptı. Uluslararası programlama yarışmalarında takım koçluğu yapıyor. Soyut kavramları görselleştirerek ve adım adım çözümlerle anlatmasıyla tanınıyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=zeynep.arslan&backgroundColor=ece4d2', N'Zeynep', N'Arslan', N'zeynep.arslan@edtech.example', 1, 1, 4125.80, NULL, NULL),
(4, N'mehmet.ozturk', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Yirmi yıllık deneyime sahip matematik öğretmeni. Hacettepe Üniversitesi Matematik Eğitimi mezunu; lise ve üniversite hazırlık düzeyinde geometri, analiz ve problem çözme dersleri veriyor. Hazırladığı soru bankaları birçok dershanede kullanılıyor. Öğrencinin önce "neden"i kavramasını, sonra pratiği hızlandırmasını hedefliyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=mehmet.ozturk&backgroundColor=ece4d2', N'Mehmet', N'Öztürk', N'mehmet.ozturk@edtech.example', 1, 1, 3389.40, NULL, NULL),
(5, N'elif.sahin', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Moleküler biyolog ve kimya eğitmeni. İstanbul Üniversitesi Biyoloji bölümünden sonra genetik üzerine doktora yaptı; üç yıl üniversite laboratuvarında araştırma görevlisi olarak çalıştı. Hücre biyolojisi, genetik ve organik kimya konularını günlük hayattan ve laboratuvardan örneklerle anlatıyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=elif.sahin&backgroundColor=ece4d2', N'Elif', N'Şahin', N'elif.sahin@edtech.example', 1, 1, 5453.70, NULL, NULL),
(6, N'can.yildiz', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Fizik öğretmeni ve amatör astronom. İTÜ Fizik Mühendisliği mezunu; on yıldır lise ve üniversite hazırlık fiziği öğretiyor. Gözlemevlerinde halk günleri düzenliyor, gökyüzü gözlem kampları yönetiyor. Mekanikten optiğe kadar her konuyu basit deney düzenekleri ve simülasyonlarla canlandırıyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=can.yildiz&backgroundColor=ece4d2', N'Can', N'Yıldız', N'can.yildiz@edtech.example', 1, 1, 873.60, NULL, NULL),
(7, N'ayse.demir', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Fiziki coğrafya ve jeomorfoloji uzmanı. Ankara Üniversitesi DTCF Coğrafya bölümünde doktorasını karst jeomorfolojisi üzerine yaptı. On beş yıldır arazi çalışmaları yürütüyor; Toroslar ve İç Anadolu''da yer şekillerinin oluşumunu inceleyen projelerde yer aldı. Derslerinde fotoğraf, profil çizimi ve arazi gözlemlerini birlikte kullanıyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ayse.demir&backgroundColor=ece4d2', N'Ayşe', N'Demir', N'ayse.demir@edtech.example', 1, 1, 5452.30, NULL, NULL),
(8, N'burak.kaya', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Harita mühendisi ve CBS uzmanı. Yıldız Teknik Üniversitesi Harita Mühendisliği mezunu; belediyeler ve afet yönetimi kurumları için mekânsal analiz projelerinde çalıştı. QGIS ve uzaktan algılama eğitimleri veriyor. Türkiye coğrafyasını haritalar ve gerçek veri setleri üzerinden okumayı öğretiyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=burak.kaya&backgroundColor=ece4d2', N'Burak', N'Kaya', N'burak.kaya@edtech.example', 1, 1, 1258.60, NULL, NULL),
(9, N'selin.koc', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Tarihçi ve sosyal bilimler eğitmeni. Hacettepe Üniversitesi Tarih bölümünde Osmanlı modernleşmesi üzerine yüksek lisans yaptı; arşiv belgeleriyle çalışma konusunda deneyimli. Tarihi ezber yerine kaynak okuma, neden-sonuç ilişkisi ve tartışma üzerinden öğretiyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=selin.koc&backgroundColor=ece4d2', N'Selin', N'Koç', N'selin.koc@edtech.example', 1, 1, 3669.40, NULL, NULL),
(10, N'merve.celik', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'CELTA sertifikalı İngilizce öğretmeni. Ankara Üniversitesi İngiliz Dili ve Edebiyatı mezunu; iki yıl Londra''da dil okulunda öğretmenlik yaptı. Başlangıç seviyesinden iş İngilizcesine kadar iletişim odaklı dersler veriyor; konuşma pratiğine ve doğru telaffuza özel önem veriyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=merve.celik&backgroundColor=ece4d2', N'Merve', N'Çelik', N'merve.celik@edtech.example', 1, 1, 2866.50, NULL, NULL),
(11, N'hakan.polat', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Almanca öğretmeni ve çevirmen. Münih''te büyüdü, İstanbul Üniversitesi Alman Dili ve Edebiyatı bölümünü bitirdi. Goethe-Institut sınavlarına hazırlık ve Almanya''da eğitim/iş hayatına uyum dersleri veriyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=hakan.polat&backgroundColor=ece4d2', N'Hakan', N'Polat', N'hakan.polat@edtech.example', 1, 1, 0.00, NULL, NULL),
(12, N'deniz.aksoy', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Ürün tasarımcısı. Bilkent Grafik Tasarım mezunu; ajans ve teknoloji şirketlerinde on yıl boyunca mobil uygulama ve web ürünleri tasarladı. Kullanıcı araştırması, Figma ile prototipleme, tasarım sistemleri ve tipografi konularında atölyeler yürütüyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=deniz.aksoy&backgroundColor=ece4d2', N'Deniz', N'Aksoy', N'deniz.aksoy@edtech.example', 1, 1, 1468.60, NULL, NULL),
(13, N'leyla.erdem', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Ressam ve sanat tarihi eğitmeni. Mimar Sinan Güzel Sanatlar Üniversitesi Resim bölümü mezunu; eserleri karma ve kişisel sergilerde yer aldı. Karakalem, desen ve renk kuramı atölyeleri veriyor; sanat tarihini eserlerin önünde durup bakmayı öğreterek anlatıyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=leyla.erdem&backgroundColor=ece4d2', N'Leyla', N'Erdem', N'leyla.erdem@edtech.example', 1, 1, 10661.00, NULL, NULL),
(14, N'ozan.gunes', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Piyanist ve gitar eğitmeni. İstanbul Üniversitesi Devlet Konservatuvarı piyano bölümü mezunu; oda müziği ve caz gruplarıyla konserler veriyor. On yıldır her yaştan öğrenciye nota okuma, armoni ve enstrüman tekniği öğretiyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ozan.gunes&backgroundColor=ece4d2', N'Ozan', N'Güneş', N'ozan.gunes@edtech.example', 1, 1, 6503.70, NULL, NULL),
(15, N'kerem.tan', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Beden eğitimi öğretmeni ve sertifikalı kuvvet-kondisyon antrenörü. Marmara Üniversitesi Spor Bilimleri mezunu; amatör kulüplerde atletizm antrenörlüğü yaptı. Doğru hareket tekniği, sakatlık önleme ve sürdürülebilir antrenman planlaması üzerine dersler veriyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=kerem.tan&backgroundColor=ece4d2', N'Kerem', N'Tan', N'kerem.tan@edtech.example', 1, 1, 3564.40, NULL, NULL),
(16, N'gizem.ucar', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Eğitim bilimci ve öğrenme koçu. Boğaziçi Üniversitesi Rehberlik ve Psikolojik Danışmanlık mezunu, eğitim psikolojisi üzerine yüksek lisans yaptı. Etkili çalışma yöntemleri, zaman yönetimi ve sınav kaygısıyla başa çıkma konularında öğrencilere ve velilere seminerler veriyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=gizem.ucar&backgroundColor=ece4d2', N'Gizem', N'Uçar', N'gizem.ucar@edtech.example', 1, 1, 2585.10, NULL, NULL),
(17, N'selim.karaca', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Analiz ve lineer cebir öğretim görevlisi. ODTÜ Matematik bölümünde fonksiyonel analiz üzerine doktora yaptı; on yıldır mühendislik fakültelerinde Calculus ve Lineer Cebir dersleri veriyor. Tanımı ve teoremi önce bir resimle, sonra ispatla anlatmayı seviyor; derslerinde her kavramı mühendislikteki bir uygulamaya bağlıyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=selim.karaca&backgroundColor=ece4d2', N'Selim', N'Karaca', N'selim.karaca@edtech.example', 1, 1, 1468.60, NULL, NULL),
(18, N'nazli.ergin', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'İstatistikçi ve veri bilimci. Hacettepe Üniversitesi İstatistik bölümünü bitirdi, Bayesçi yöntemler üzerine yüksek lisans yaptı. Sağlık ve perakende sektörlerinde deney tasarımı ve tahmin modelleri kurdu. Olasılığı zar ve kartlarla, istatistiği gerçek veri setleriyle öğretiyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=nazli.ergin&backgroundColor=ece4d2', N'Nazlı', N'Ergin', N'nazli.ergin@edtech.example', 1, 1, 0.00, NULL, NULL),
(19, N'baris.ozkan', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Makine öğrenmesi mühendisi. Sabancı Üniversitesi Bilgisayar Mühendisliği mezunu; görüntü işleme ve öneri sistemleri üzerine sekiz yıl çalıştı, açık kaynak ML kütüphanelerine katkı veriyor. Modelleri kara kutu olarak değil, matematiğini ve hatalarını göstererek anlatıyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=baris.ozkan&backgroundColor=ece4d2', N'Barış', N'Özkan', N'baris.ozkan@edtech.example', 1, 1, 7555.10, NULL, NULL),
(20, N'irem.yalcin', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Veri analisti ve görselleştirme uzmanı. İTÜ Endüstri Mühendisliği mezunu; e-ticaret ve medya şirketlerinde SQL, Python ve pano tasarımıyla karar destek sistemleri kurdu. Veriden doğru soruyu sormayı ve sonucu herkesin anlayacağı bir grafikle anlatmayı öğretiyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=irem.yalcin&backgroundColor=ece4d2', N'İrem', N'Yalçın', N'irem.yalcin@edtech.example', 1, 1, 2307.90, NULL, NULL),
(21, N'tolga.sezer', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Ekonomist. Bilkent Üniversitesi İktisat bölümünde lisans ve yüksek lisansını tamamladı; bir yatırım bankasında makroekonomik araştırma bölümünde yedi yıl çalıştı. Arz-talepten para politikasına kadar ekonomiyi günlük haberler ve güncel verilerle okumayı öğretiyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=tolga.sezer&backgroundColor=ece4d2', N'Tolga', N'Sezer', N'tolga.sezer@edtech.example', 1, 1, 4894.40, NULL, NULL),
(22, N'ceren.aktas', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Serbest muhasebeci mali müşavir ve finans eğitmeni. Marmara Üniversitesi İşletme mezunu; KOBİ''lere muhasebe ve finansal planlama danışmanlığı veriyor. Bilanço okumayı, bütçe yapmayı ve yatırım kararlarını sade bir dille, örnek tablolar üzerinden anlatıyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ceren.aktas&backgroundColor=ece4d2', N'Ceren', N'Aktaş', N'ceren.aktas@edtech.example', 1, 1, 3285.80, NULL, NULL),
(23, N'orhan.yesil', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Edebiyat öğretmeni ve deneme yazarı. İstanbul Üniversitesi Türk Dili ve Edebiyatı bölümünde Cumhuriyet dönemi romanı üzerine yüksek lisans yaptı. Yazıları edebiyat dergilerinde yayımlanıyor. Metni yüksek sesle okumayı, satır arasını tartışmayı ve öğrencinin kendi yorumunu yazmasını önemsiyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=orhan.yesil&backgroundColor=ece4d2', N'Orhan', N'Yeşil', N'orhan.yesil@edtech.example', 1, 1, 908.60, NULL, NULL),
(24, N'ece.bulut', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Felsefe eğitmeni. Boğaziçi Üniversitesi Felsefe bölümünden sonra bilgi felsefesi üzerine doktora yaptı. Antik Yunan''dan çağdaş felsefeye büyük soruları, klasik metinlerden kısa bölümler okuyarak ve argümanları adım adım çözümleyerek tartışıyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ece.bulut&backgroundColor=ece4d2', N'Ece', N'Bulut', N'ece.bulut@edtech.example', 1, 1, 2026.50, NULL, NULL),
(25, N'cem.oral', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Belgesel fotoğrafçısı. Mimar Sinan Güzel Sanatlar Üniversitesi Fotoğraf bölümü mezunu; çalışmaları ulusal dergilerde ve sergilerde yer aldı. Pozlama üçgeninden kompozisyona, sokak fotoğrafından düzenlemeye kadar teknik bilgiyi bakmayı öğrenmekle birlikte veriyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=cem.oral&backgroundColor=ece4d2', N'Cem', N'Oral', N'cem.oral@edtech.example', 1, 1, 1467.90, NULL, NULL),
(26, N'asli.tuna', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Yönetmen ve senarist. Kadir Has Üniversitesi Sinema ve Televizyon bölümünü bitirdi; kısa filmleri ulusal festivallerde gösterildi. Film analizi ve kısa film yapımı atölyeleri yürütüyor; senaryodan kurguya bir filmin nasıl kurulduğunu sahne sahne gösteriyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=asli.tuna&backgroundColor=ece4d2', N'Aslı', N'Tuna', N'asli.tuna@edtech.example', 1, 1, 839.30, NULL, NULL),
(27, N'onur.balci', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Sosyolog. ODTÜ Sosyoloji bölümünde kentleşme ve göç üzerine doktora yaptı; saha araştırmalarında görüşme ve gözlem yöntemleriyle çalışıyor. Toplumsal olayları kavramlar ve gündelik hayattan örneklerle birlikte okumayı öğretiyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=onur.balci&backgroundColor=ece4d2', N'Onur', N'Balcı', N'onur.balci@edtech.example', 1, 1, 7515.20, NULL, NULL),
(28, N'sena.yurt', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'İspanyolca öğretmeni ve çevirmen. Ankara Üniversitesi İspanyol Dili ve Edebiyatı mezunu; Madrid''de bir yıl Erasmus, iki yıl dil okulunda öğretmenlik yaptı. DELE sınavlarına hazırlık ve iletişim odaklı başlangıç dersleri veriyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=sena.yurt&backgroundColor=ece4d2', N'Sena', N'Yurt', N'sena.yurt@edtech.example', 1, 1, 1118.60, NULL, NULL),
(29, N'hatice.sonmez', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'İstanbul Üniversitesi Türk Dili ve Edebiyatı Bölümünden mezun olduktan sonra Marmara Üniversitesinde pedagojik formasyon eğitimini tamamladı. On dört yıldır ortaöğretim ve lise düzeyinde Türkçe öğretmenliği yapmaktadır. Çalışmalarında özellikle YKS ve LGS Türkçe hazırlığı, paragrafta yapı ve anlam bilgisi, sözcükte ve cümlede anlam konularına odaklanır. Derslerinde ezbere dayalı yöntemler yerine metin çözümleme, soru kalıplarını mantıksal olarak analiz etme ve akademik kompozisyon kurgulama tekniklerini uygulamalı biçimde işler.', N'https://api.dicebear.com/9.x/notionists/svg?seed=hatice.sonmez&backgroundColor=ece4d2', N'Hatice', N'Sönmez', N'hatice.sonmez@edtech.example', 1, 1, 1537.90, NULL, NULL),
(30, N'kemal.erol', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Boğaziçi Üniversitesi Türk Dili ve Edebiyatı Bölümünden lisans, Ankara Üniversitesinden yeni Türk edebiyatı alanında yüksek lisans derecesini aldı. On altı yıldır üniversite ve araştırma kurumlarında edebiyat tarihi ve Osmanlı Türkçesi dersleri vermektedir. Uzmanlık alanları arasında erken ve geç Cumhuriyet dönemi Türk edebiyatı, edebi akımlar ve Osmanlı paleografyası yer alır. Eğitimlerinde matbu ve rîka hatlı arşiv belgeleri üzerinden metin okuma çalışmaları yürütür; edebi eserleri dönemin toplumsal ve kültürel bağlamıyla ele alır.', N'https://api.dicebear.com/9.x/notionists/svg?seed=kemal.erol&backgroundColor=ece4d2', N'Kemal', N'Erol', N'kemal.erol@edtech.example', 1, 1, 4335.80, NULL, NULL),
(31, N'derya.oktem', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Hacettepe Üniversitesi Ankara Devlet Konservatuvarı Tiyatro Bölümünden mezun oldu. On sekiz yıl boyunca Devlet Tiyatrolarında oyuncu ve TRT radyolarında seslendirme sanatçısı olarak görev yaptı. Bireysel ve kurumsal düzeyde diksiyon, doğru nefes, fonetik, artikülasyon ve sahne konuşması eğitimleri vermektedir. Derslerinde diyafram kullanımını teknik egzersizlerle pekiştirir; katılımcıların konuşma kayıtlarını çözümleyerek vurgu, tonlama, beden dili ve ikna edici hitabet becerilerini birebir uygulamalarla geliştirir.', N'https://api.dicebear.com/9.x/notionists/svg?seed=derya.oktem&backgroundColor=ece4d2', N'Derya', N'Öktem', N'derya.oktem@edtech.example', 1, 1, 0.00, NULL, NULL),
(32, N'aylin.kara', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Orta Doğu Teknik Üniversitesi Psikoloji Bölümünü tamamladıktan sonra Ege Üniversitesinde gelişim psikolojisi alanında yüksek lisans yaptı. On iki yıldır gelişim psikolojisi ve sosyal psikoloji alanlarında akademik araştırmalar yürütmekte ve dersler vermektedir. Çocukluktan yetişkinliğe bilişsel değişim, bağlanma kuramları ve grup dinamikleri üzerine yoğunlaşır. Derslerinde klasik kuramsal yaklaşımları çağdaş ampirik araştırmalarla birleştirir; katılımcılara vaka çözümlemeleri ve gözlem protokolleri üzerinden analitik bakış kazandırır.', N'https://api.dicebear.com/9.x/notionists/svg?seed=aylin.kara&backgroundColor=ece4d2', N'Aylin', N'Kara', N'aylin.kara@edtech.example', 1, 1, 0.00, NULL, NULL),
(33, N'volkan.sener', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'İstanbul Teknik Üniversitesindeki mühendislik lisansının ardından Boğaziçi Üniversitesi Bilişsel Bilim yüksek lisans programını tamamladı. On yıldır bilişsel bilim, nörobilişsel modelleme ve deneysel araştırma yöntemleri konularında dersler vermektedir. İnsan belleği, dikkat mekanizmaları ve karar verme süreçlerinin deneysel yollarla incelenmesi üzerine çalışır. Eğitimlerinde katılımcılara hipotez kurma, bilgisayarlı deney tasarımı ve toplanan davranışsal verilerin istatistiksel olarak modellenmesi adımlarını uygulamalı olarak aktarır.', N'https://api.dicebear.com/9.x/notionists/svg?seed=volkan.sener&backgroundColor=ece4d2', N'Volkan', N'Şener', N'volkan.sener@edtech.example', 1, 1, 4195.80, NULL, NULL),
(34, N'serkan.yavuz', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Ankara Üniversitesi Hukuk Fakültesinden mezun oldu, kamu hukuku alanında yüksek lisansını tamamladı. On beş yıl serbest avukatlık ve kamu kurumlarında hukuk müşavirliği yaptı. Anayasa yargısı, idari işlemler, sözleşmeler ve kişisel verilerin korunması konularında eğitimler verir. Derslerinde her kuralı gerekçesi ve güncel mahkeme kararlarıyla birlikte anlatır, katılımcılara somut olay çözme alışkanlığı kazandırır.', N'https://api.dicebear.com/9.x/notionists/svg?seed=serkan.yavuz&backgroundColor=ece4d2', N'Serkan', N'Yavuz', N'serkan.yavuz@edtech.example', 1, 1, 5698.00, NULL, NULL),
(35, N'melis.korkut', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'İstanbul Teknik Üniversitesi Kontrol ve Otomasyon Mühendisliğinden mezun oldu, mekatronik alanında yüksek lisans yaptı. Endüstriyel otomasyon ve otonom mobil robot projelerinde on yıl Ar-Ge mühendisi olarak çalıştı. Gömülü yazılım, devre tasarımı, ROS ve CAD konularında atölye eğitimleri verir. Derslerinde her kavramı çalışan bir prototip üzerinde gösterir; katılımcılar kursu kendi kurdukları bir devre veya mekanizmayla bitirir.', N'https://api.dicebear.com/9.x/notionists/svg?seed=melis.korkut&backgroundColor=ece4d2', N'Melis', N'Korkut', N'melis.korkut@edtech.example', 1, 1, 4336.50, NULL, NULL),
(36, N'kaan.ersoy', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'Teacher', N'Hacettepe Üniversitesi Bilgisayar Mühendisliğinden mezun oldu. Bir bankanın siber güvenlik ekibinde sızma testi uzmanı, ardından bir oyun stüdyosunda mobil ve oyun geliştirici olarak çalıştı; son altı yıldır bulut altyapısı ve DevOps danışmanlığı yapıyor. Derslerinde güvenli kod, otomasyon ve yayına alma süreçlerini gerçek projeler üzerinden anlatır, her bölümü yayında çalışan küçük bir uygulamayla bitirir.', N'https://api.dicebear.com/9.x/notionists/svg?seed=kaan.ersoy&backgroundColor=ece4d2', N'Kaan', N'Ersoy', N'kaan.ersoy@edtech.example', 1, 1, 4756.50, NULL, NULL),
(37, N'ali.vural', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Ali Vural, E-Kurs''ta Yazılım ve Spor alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ali.vural&backgroundColor=ece4d2', N'Ali', N'Vural', N'ali.vural@ogrenci.example', 1, 1, 152.00, NULL, NULL),
(38, N'ayse.korkmaz', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Ayşe Korkmaz, E-Kurs''ta Sanat ve Coğrafya alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ayse.korkmaz&backgroundColor=ece4d2', N'Ayşe', N'Korkmaz', N'ayse.korkmaz@ogrenci.example', 1, 1, 605.00, NULL, NULL),
(39, N'berk.altun', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Berk Altun, E-Kurs''ta Fen Bilimleri ve Müzik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=berk.altun&backgroundColor=ece4d2', N'Berk', N'Altun', N'berk.altun@ogrenci.example', 1, 1, 204.00, NULL, NULL),
(40, N'buse.yilmaz', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Buse Yılmaz, E-Kurs''ta Veri Bilimi & Yapay Zeka ve Sosyal Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=buse.yilmaz&backgroundColor=ece4d2', N'Buse', N'Yılmaz', N'buse.yilmaz@ogrenci.example', 1, 1, 1053.00, NULL, NULL),
(41, N'can.erdogan', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Can Erdoğan, E-Kurs''ta Sosyal Bilimler ve Hukuk & Kamu Yönetimi alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=can.erdogan&backgroundColor=ece4d2', N'Can', N'Erdoğan', N'can.erdogan@ogrenci.example', 1, 1, 202.00, NULL, NULL),
(42, N'defne.kurt', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Defne Kurt, E-Kurs''ta Yabancı Dil ve Edebiyat & Felsefe alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=defne.kurt&backgroundColor=ece4d2', N'Defne', N'Kurt', N'defne.kurt@ogrenci.example', 1, 1, 505.00, NULL, NULL),
(43, N'efe.sahin', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Efe Şahin, E-Kurs''ta Yazılım ve Matematik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=efe.sahin&backgroundColor=ece4d2', N'Efe', N'Şahin', N'efe.sahin@ogrenci.example', 1, 1, 304.00, NULL, NULL),
(44, N'elif.ozdemir', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Elif Özdemir, E-Kurs''ta Coğrafya ve Ekonomi & Finans alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=elif.ozdemir&backgroundColor=ece4d2', N'Elif', N'Özdemir', N'elif.ozdemir@ogrenci.example', 1, 1, 353.00, NULL, NULL),
(45, N'emir.aslan', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Emir Aslan, E-Kurs''ta Yazılım ve Spor alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=emir.aslan&backgroundColor=ece4d2', N'Emir', N'Aslan', N'emir.aslan@ogrenci.example', 1, 1, 152.00, NULL, NULL),
(46, N'ezgi.dogan', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Ezgi Doğan, E-Kurs''ta Sanat ve Coğrafya alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ezgi.dogan&backgroundColor=ece4d2', N'Ezgi', N'Doğan', N'ezgi.dogan@ogrenci.example', 1, 1, 605.00, NULL, NULL),
(47, N'furkan.kilic', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Furkan Kılıç, E-Kurs''ta Fen Bilimleri ve Müzik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=furkan.kilic&backgroundColor=ece4d2', N'Furkan', N'Kılıç', N'furkan.kilic@ogrenci.example', 1, 1, 954.00, NULL, NULL),
(48, N'gamze.cetin', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Gamze Çetin, E-Kurs''ta Veri Bilimi & Yapay Zeka ve Sosyal Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=gamze.cetin&backgroundColor=ece4d2', N'Gamze', N'Çetin', N'gamze.cetin@ogrenci.example', 1, 1, 53.00, NULL, NULL),
(49, N'hakan.koc', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Hakan Koç, E-Kurs''ta Sosyal Bilimler ve Hukuk & Kamu Yönetimi alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=hakan.koc&backgroundColor=ece4d2', N'Hakan', N'Koç', N'hakan.koc@ogrenci.example', 1, 1, 202.00, NULL, NULL),
(50, N'ipek.aydin', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'İpek Aydın, E-Kurs''ta Yabancı Dil ve Edebiyat & Felsefe alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ipek.aydin&backgroundColor=ece4d2', N'İpek', N'Aydın', N'ipek.aydin@ogrenci.example', 1, 1, 505.00, NULL, NULL),
(51, N'kaan.ozturk', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Kaan Öztürk, E-Kurs''ta Yazılım ve Matematik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=kaan.ozturk&backgroundColor=ece4d2', N'Kaan', N'Öztürk', N'kaan.ozturk@ogrenci.example', 1, 1, 304.00, NULL, NULL),
(52, N'lara.gunes', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Lara Güneş, E-Kurs''ta Coğrafya ve Ekonomi & Finans alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=lara.gunes&backgroundColor=ece4d2', N'Lara', N'Güneş', N'lara.gunes@ogrenci.example', 1, 1, 353.00, NULL, NULL),
(53, N'mert.yildirim', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Mert Yıldırım, E-Kurs''ta Yazılım ve Spor alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=mert.yildirim&backgroundColor=ece4d2', N'Mert', N'Yıldırım', N'mert.yildirim@ogrenci.example', 1, 1, 152.00, NULL, NULL),
(54, N'nehir.acar', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Nehir Acar, E-Kurs''ta Sanat ve Coğrafya alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=nehir.acar&backgroundColor=ece4d2', N'Nehir', N'Acar', N'nehir.acar@ogrenci.example', 1, 1, 1355.00, NULL, NULL),
(55, N'ozan.tekin', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Ozan Tekin, E-Kurs''ta Fen Bilimleri ve Müzik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ozan.tekin&backgroundColor=ece4d2', N'Ozan', N'Tekin', N'ozan.tekin@ogrenci.example', 1, 1, 204.00, NULL, NULL),
(56, N'pelin.sari', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Pelin Sarı, E-Kurs''ta Veri Bilimi & Yapay Zeka ve Sosyal Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=pelin.sari&backgroundColor=ece4d2', N'Pelin', N'Sarı', N'pelin.sari@ogrenci.example', 1, 1, 53.00, NULL, NULL),
(57, N'rana.ucar', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Rana Uçar, E-Kurs''ta Sosyal Bilimler ve Hukuk & Kamu Yönetimi alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=rana.ucar&backgroundColor=ece4d2', N'Rana', N'Uçar', N'rana.ucar@ogrenci.example', 1, 1, 202.00, NULL, NULL),
(58, N'sarp.keskin', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Sarp Keskin, E-Kurs''ta Yabancı Dil ve Edebiyat & Felsefe alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=sarp.keskin&backgroundColor=ece4d2', N'Sarp', N'Keskin', N'sarp.keskin@ogrenci.example', 1, 1, 505.00, NULL, NULL),
(59, N'selin.avci', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Selin Avcı, E-Kurs''ta Yazılım ve Matematik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=selin.avci&backgroundColor=ece4d2', N'Selin', N'Avcı', N'selin.avci@ogrenci.example', 1, 1, 304.00, NULL, NULL),
(60, N'tuna.bozkurt', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Tuna Bozkurt, E-Kurs''ta Coğrafya ve Ekonomi & Finans alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=tuna.bozkurt&backgroundColor=ece4d2', N'Tuna', N'Bozkurt', N'tuna.bozkurt@ogrenci.example', 1, 1, 353.00, NULL, NULL),
(61, N'umut.cakir', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Umut Çakır, E-Kurs''ta Yazılım ve Spor alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=umut.cakir&backgroundColor=ece4d2', N'Umut', N'Çakır', N'umut.cakir@ogrenci.example', 1, 1, 1152.00, NULL, NULL),
(62, N'yaren.polat', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Yaren Polat, E-Kurs''ta Sanat ve Coğrafya alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=yaren.polat&backgroundColor=ece4d2', N'Yaren', N'Polat', N'yaren.polat@ogrenci.example', 1, 1, 605.00, NULL, NULL),
(63, N'yusuf.demirci', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Yusuf Demirci, E-Kurs''ta Fen Bilimleri ve Müzik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=yusuf.demirci&backgroundColor=ece4d2', N'Yusuf', N'Demirci', N'yusuf.demirci@ogrenci.example', 1, 1, 204.00, NULL, NULL),
(64, N'zehra.kaya', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Zehra Kaya, E-Kurs''ta Veri Bilimi & Yapay Zeka ve Sosyal Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=zehra.kaya&backgroundColor=ece4d2', N'Zehra', N'Kaya', N'zehra.kaya@ogrenci.example', 1, 1, 53.00, NULL, NULL),
(65, N'asli.tan', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Aslı Tan, E-Kurs''ta Sosyal Bilimler ve Edebiyat & Felsefe alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=asli.tan&backgroundColor=ece4d2', N'Aslı', N'Tan', N'asli.tan@ogrenci.example', 1, 1, 353.00, NULL, NULL),
(66, N'baris.oral', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Barış Oral, E-Kurs''ta Sanat ve Yabancı Dil alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=baris.oral&backgroundColor=ece4d2', N'Barış', N'Oral', N'baris.oral@ogrenci.example', 1, 1, 403.00, NULL, NULL),
(67, N'cansu.eren', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Cansu Eren, E-Kurs''ta Yazılım ve Genel alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=cansu.eren&backgroundColor=ece4d2', N'Cansu', N'Eren', N'cansu.eren@ogrenci.example', 1, 1, 403.00, NULL, NULL),
(68, N'deniz.sezer', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Deniz Sezer, E-Kurs''ta Fen Bilimleri ve Veri Bilimi & Yapay Zeka alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=deniz.sezer&backgroundColor=ece4d2', N'Deniz', N'Sezer', N'deniz.sezer@ogrenci.example', 1, 1, 1103.00, NULL, NULL),
(69, N'ece.gurel', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Ece Gürel, E-Kurs''ta Coğrafya ve Ekonomi & Finans alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ece.gurel&backgroundColor=ece4d2', N'Ece', N'Gürel', N'ece.gurel@ogrenci.example', 1, 1, 353.00, NULL, NULL),
(70, N'ferhat.ates', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Ferhat Ateş, E-Kurs''ta Tasarım ve Sosyal Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ferhat.ates&backgroundColor=ece4d2', N'Ferhat', N'Ateş', N'ferhat.ates@ogrenci.example', 1, 1, 203.00, NULL, NULL),
(71, N'gizem.ozkan', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Gizem Özkan, E-Kurs''ta Genel ve Türk Dili ve Edebiyatı alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=gizem.ozkan&backgroundColor=ece4d2', N'Gizem', N'Özkan', N'gizem.ozkan@ogrenci.example', 1, 1, 353.00, NULL, NULL),
(72, N'halil.bulut', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Halil Bulut, E-Kurs''ta Yazılım ve Psikoloji & Bilişsel Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=halil.bulut&backgroundColor=ece4d2', N'Halil', N'Bulut', N'halil.bulut@ogrenci.example', 1, 1, 353.00, NULL, NULL),
(73, N'irem.coskun', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'İrem Coşkun, E-Kurs''ta Spor ve Ekonomi & Finans alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=irem.coskun&backgroundColor=ece4d2', N'İrem', N'Coşkun', N'irem.coskun@ogrenci.example', 1, 1, 203.00, NULL, NULL),
(74, N'kerem.yavuz', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Kerem Yavuz, E-Kurs''ta Matematik ve Fotoğrafçılık & Sinema alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=kerem.yavuz&backgroundColor=ece4d2', N'Kerem', N'Yavuz', N'kerem.yavuz@ogrenci.example', 1, 1, 203.00, NULL, NULL),
(75, N'leyla.sen', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Leyla Şen, E-Kurs''ta Coğrafya ve Türk Dili ve Edebiyatı alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=leyla.sen&backgroundColor=ece4d2', N'Leyla', N'Şen', N'leyla.sen@ogrenci.example', 1, 1, 953.00, NULL, NULL),
(76, N'murat.aksoy', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Murat Aksoy, E-Kurs''ta Yabancı Dil ve Psikoloji & Bilişsel Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=murat.aksoy&backgroundColor=ece4d2', N'Murat', N'Aksoy', N'murat.aksoy@ogrenci.example', 1, 1, 253.00, NULL, NULL),
(77, N'nil.karaca', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Nil Karaca, E-Kurs''ta Müzik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=nil.karaca&backgroundColor=ece4d2', N'Nil', N'Karaca', N'nil.karaca@ogrenci.example', 1, 1, 203.00, NULL, NULL),
(78, N'onur.toprak', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Onur Toprak, E-Kurs''ta Yazılım ve Matematik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=onur.toprak&backgroundColor=ece4d2', N'Onur', N'Toprak', N'onur.toprak@ogrenci.example', 1, 1, 453.00, NULL, NULL),
(79, N'pinar.kaplan', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Pınar Kaplan, E-Kurs''ta Fen Bilimleri ve Veri Bilimi & Yapay Zeka alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=pinar.kaplan&backgroundColor=ece4d2', N'Pınar', N'Kaplan', N'pinar.kaplan@ogrenci.example', 1, 1, 403.00, NULL, NULL),
(80, N'riza.uysal', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Rıza Uysal, E-Kurs''ta Sosyal Bilimler ve Edebiyat & Felsefe alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=riza.uysal&backgroundColor=ece4d2', N'Rıza', N'Uysal', N'riza.uysal@ogrenci.example', 1, 1, 453.00, NULL, NULL),
(81, N'sena.bilgin', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Sena Bilgin, E-Kurs''ta Sanat ve Müzik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=sena.bilgin&backgroundColor=ece4d2', N'Sena', N'Bilgin', N'sena.bilgin@ogrenci.example', 1, 1, 353.00, NULL, NULL),
(82, N'tolga.eker', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Tolga Eker, E-Kurs''ta Yazılım ve Matematik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=tolga.eker&backgroundColor=ece4d2', N'Tolga', N'Eker', N'tolga.eker@ogrenci.example', 1, 1, 1403.00, NULL, NULL),
(83, N'ufuk.sonmez', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Ufuk Sönmez, E-Kurs''ta Fen Bilimleri ve Veri Bilimi & Yapay Zeka alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ufuk.sonmez&backgroundColor=ece4d2', N'Ufuk', N'Sönmez', N'ufuk.sonmez@ogrenci.example', 1, 1, 53.00, NULL, NULL),
(84, N'vildan.ergin', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Vildan Ergin, E-Kurs''ta Sosyal Bilimler ve Edebiyat & Felsefe alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=vildan.ergin&backgroundColor=ece4d2', N'Vildan', N'Ergin', N'vildan.ergin@ogrenci.example', 1, 1, 253.00, NULL, NULL),
(85, N'yigit.cinar', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Yiğit Çınar, E-Kurs''ta Sanat ve Yabancı Dil alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=yigit.cinar&backgroundColor=ece4d2', N'Yiğit', N'Çınar', N'yigit.cinar@ogrenci.example', 1, 1, 403.00, NULL, NULL),
(86, N'zeynep.unal', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Zeynep Ünal, E-Kurs''ta Genel ve Türk Dili ve Edebiyatı alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=zeynep.unal&backgroundColor=ece4d2', N'Zeynep', N'Ünal', N'zeynep.unal@ogrenci.example', 1, 1, 353.00, NULL, NULL),
(87, N'alp.kocak', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Alp Koçak, E-Kurs''ta Veri Bilimi & Yapay Zeka ve Sosyal Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=alp.kocak&backgroundColor=ece4d2', N'Alp', N'Koçak', N'alp.kocak@ogrenci.example', 1, 1, 203.00, NULL, NULL),
(88, N'beril.tas', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Beril Taş, E-Kurs''ta Genel ve Ekonomi & Finans alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=beril.tas&backgroundColor=ece4d2', N'Beril', N'Taş', N'beril.tas@ogrenci.example', 1, 1, 203.00, NULL, NULL),
(89, N'cem.gok', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Cem Gök, E-Kurs''ta Matematik ve Sosyal Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=cem.gok&backgroundColor=ece4d2', N'Cem', N'Gök', N'cem.gok@ogrenci.example', 1, 1, 1203.00, NULL, NULL),
(90, N'duru.ozer', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Duru Özer, E-Kurs''ta Coğrafya ve Türk Dili ve Edebiyatı alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=duru.ozer&backgroundColor=ece4d2', N'Duru', N'Özer', N'duru.ozer@ogrenci.example', 1, 1, 453.00, NULL, NULL),
(91, N'eren.yalcin', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Eren Yalçın, E-Kurs''ta Yabancı Dil ve Psikoloji & Bilişsel Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=eren.yalcin&backgroundColor=ece4d2', N'Eren', N'Yalçın', N'eren.yalcin@ogrenci.example', 1, 1, 353.00, NULL, NULL),
(92, N'feyza.akin', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Feyza Akın, E-Kurs''ta Spor ve Müzik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=feyza.akin&backgroundColor=ece4d2', N'Feyza', N'Akın', N'feyza.akin@ogrenci.example', 1, 1, 253.00, NULL, NULL),
(93, N'goktug.sari', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Göktuğ Sarı, E-Kurs''ta Matematik ve Coğrafya alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=goktug.sari&backgroundColor=ece4d2', N'Göktuğ', N'Sarı', N'goktug.sari@ogrenci.example', 1, 1, 153.00, NULL, NULL),
(94, N'hilal.durmaz', N'$2a$11$tzvNPheFX5YDxoUhmhKfpeF/CcveRlH/QYaYFXmxlYOngLxWIiFvS', N'User', N'Hilal Durmaz, E-Kurs''ta Coğrafya ve Veri Bilimi & Yapay Zeka alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=hilal.durmaz&backgroundColor=ece4d2', N'Hilal', N'Durmaz', N'hilal.durmaz@ogrenci.example', 1, 1, 153.00, NULL, NULL),
(95, N'demo_admin', N'$2a$11$6i2LHCPgwEtx8/CvT.rsuOKMeNdZREhxgocpdVKsVU0vbaWgKNery', N'Admin', N'Demo Admin, E-Kurs platform yöneticisi. Kurs kataloğunu ve kategorileri düzenliyor, eğitmen başvurularını değerlendiriyor, duyuruları yayımlıyor ve destek taleplerini yanıtlıyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=demo_admin&backgroundColor=ece4d2', N'Demo', N'Admin', N'demo_admin@example.test', 1, 1, 0.00, NULL, NULL),
(96, N'demo_teacher', N'$2a$11$uSeTtbIzjyuKLV/9cJYGsO/8CB9ZmJp9f79bPkQd5Y19FTkjoPTUe', N'Teacher', N'Demo Teacher, platformumuzda Yazılım alanında ders veren eğitmenimizdir. Uzmanlık alanı: Programlama dilleri, web ve backend geliştirme, veri yapıları ve algoritmalar. Sıfırdan başlayanlardan profesyonel geliştiricilere kadar, proje odaklı ve uygulamalı yazılım eğitimleri. Derslerinde konuyu adım adım kurar, her bölümü örnek ve alıştırmalarla pekiştirir; öğrencilerinin sorularına ders sonrasında da yanıt verir.', N'https://api.dicebear.com/9.x/notionists/svg?seed=demo_teacher&backgroundColor=ece4d2', N'Demo', N'Teacher', N'demo_teacher@example.test', 1, 1, 0.00, NULL, NULL),
(97, N'demo_student', N'$2a$11$UTGmNkWQa.XLmzNxHulAJu.Eu.QGLS3pFyjby6LVBm2kvHjfylUN6', N'User', N'Demo Student, E-Kurs''ta Yazılım ve Matematik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=demo_student&backgroundColor=ece4d2', N'Demo', N'Student', N'demo_student@example.test', 1, 1, 1555.00, NULL, NULL);
SET IDENTITY_INSERT [Users] OFF;
-- Teachers (36)
SET IDENTITY_INSERT [Teachers] ON;
INSERT INTO [Teachers] ([Id], [FirstName], [LastName], [Email], [Branch], [CreatedAt], [ProfilePictureUrl], [AboutMe], [UserId], [IsDeleted], [DeletedAt], [TeacherNumber]) VALUES
(1, N'Emre', N'Aydın', N'emre.aydin@edtech.example', N'Yazılım', '2026-01-11T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=emre.aydin&backgroundColor=ece4d2', N'Kıdemli backend geliştirici. Bilgisayar Mühendisliği lisansını ODTÜ''de tamamladı; on iki yıldır fintech ve e-ticaret şirketlerinde .NET, Java ve dağıtık sistemler üzerine çalışıyor. Ölçeklenebilir API tasarımı, temiz mimari ve test odaklı geliştirme konularında ekiplere mentorluk yapıyor. Derslerinde her konuyu gerçek bir proje üzerinde, kod incelemesi yaparak anlatıyor.', 2, 0, NULL, N'260000001'),
(2, N'Zeynep', N'Arslan', N'zeynep.arslan@edtech.example', N'Yazılım, Matematik', '2025-12-31T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=zeynep.arslan&backgroundColor=ece4d2', N'Algoritmalar ve ayrık matematik eğitmeni. Boğaziçi Üniversitesi Matematik bölümünden mezun, Bilgisayar Bilimleri yüksek lisansını kombinatoryal optimizasyon üzerine yaptı. Uluslararası programlama yarışmalarında takım koçluğu yapıyor. Soyut kavramları görselleştirerek ve adım adım çözümlerle anlatmasıyla tanınıyor.', 3, 0, NULL, N'260000002'),
(3, N'Mehmet', N'Öztürk', N'mehmet.ozturk@edtech.example', N'Matematik', '2025-12-20T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=mehmet.ozturk&backgroundColor=ece4d2', N'Yirmi yıllık deneyime sahip matematik öğretmeni. Hacettepe Üniversitesi Matematik Eğitimi mezunu; lise ve üniversite hazırlık düzeyinde geometri, analiz ve problem çözme dersleri veriyor. Hazırladığı soru bankaları birçok dershanede kullanılıyor. Öğrencinin önce "neden"i kavramasını, sonra pratiği hızlandırmasını hedefliyor.', 4, 0, NULL, N'260000003'),
(4, N'Elif', N'Şahin', N'elif.sahin@edtech.example', N'Fen Bilimleri', '2025-12-09T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=elif.sahin&backgroundColor=ece4d2', N'Moleküler biyolog ve kimya eğitmeni. İstanbul Üniversitesi Biyoloji bölümünden sonra genetik üzerine doktora yaptı; üç yıl üniversite laboratuvarında araştırma görevlisi olarak çalıştı. Hücre biyolojisi, genetik ve organik kimya konularını günlük hayattan ve laboratuvardan örneklerle anlatıyor.', 5, 0, NULL, N'260000004'),
(5, N'Can', N'Yıldız', N'can.yildiz@edtech.example', N'Fen Bilimleri', '2025-11-28T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=can.yildiz&backgroundColor=ece4d2', N'Fizik öğretmeni ve amatör astronom. İTÜ Fizik Mühendisliği mezunu; on yıldır lise ve üniversite hazırlık fiziği öğretiyor. Gözlemevlerinde halk günleri düzenliyor, gökyüzü gözlem kampları yönetiyor. Mekanikten optiğe kadar her konuyu basit deney düzenekleri ve simülasyonlarla canlandırıyor.', 6, 0, NULL, N'260000005'),
(6, N'Ayşe', N'Demir', N'ayse.demir@edtech.example', N'Coğrafya', '2025-11-17T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=ayse.demir&backgroundColor=ece4d2', N'Fiziki coğrafya ve jeomorfoloji uzmanı. Ankara Üniversitesi DTCF Coğrafya bölümünde doktorasını karst jeomorfolojisi üzerine yaptı. On beş yıldır arazi çalışmaları yürütüyor; Toroslar ve İç Anadolu''da yer şekillerinin oluşumunu inceleyen projelerde yer aldı. Derslerinde fotoğraf, profil çizimi ve arazi gözlemlerini birlikte kullanıyor.', 7, 0, NULL, N'260000006'),
(7, N'Burak', N'Kaya', N'burak.kaya@edtech.example', N'Coğrafya', '2026-01-10T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=burak.kaya&backgroundColor=ece4d2', N'Harita mühendisi ve CBS uzmanı. Yıldız Teknik Üniversitesi Harita Mühendisliği mezunu; belediyeler ve afet yönetimi kurumları için mekânsal analiz projelerinde çalıştı. QGIS ve uzaktan algılama eğitimleri veriyor. Türkiye coğrafyasını haritalar ve gerçek veri setleri üzerinden okumayı öğretiyor.', 8, 0, NULL, N'260000007'),
(8, N'Selin', N'Koç', N'selin.koc@edtech.example', N'Sosyal Bilimler', '2025-12-30T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=selin.koc&backgroundColor=ece4d2', N'Tarihçi ve sosyal bilimler eğitmeni. Hacettepe Üniversitesi Tarih bölümünde Osmanlı modernleşmesi üzerine yüksek lisans yaptı; arşiv belgeleriyle çalışma konusunda deneyimli. Tarihi ezber yerine kaynak okuma, neden-sonuç ilişkisi ve tartışma üzerinden öğretiyor.', 9, 0, NULL, N'260000008'),
(9, N'Merve', N'Çelik', N'merve.celik@edtech.example', N'Yabancı Dil', '2025-12-19T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=merve.celik&backgroundColor=ece4d2', N'CELTA sertifikalı İngilizce öğretmeni. Ankara Üniversitesi İngiliz Dili ve Edebiyatı mezunu; iki yıl Londra''da dil okulunda öğretmenlik yaptı. Başlangıç seviyesinden iş İngilizcesine kadar iletişim odaklı dersler veriyor; konuşma pratiğine ve doğru telaffuza özel önem veriyor.', 10, 0, NULL, N'260000009'),
(10, N'Hakan', N'Polat', N'hakan.polat@edtech.example', N'Yabancı Dil', '2025-12-08T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=hakan.polat&backgroundColor=ece4d2', N'Almanca öğretmeni ve çevirmen. Münih''te büyüdü, İstanbul Üniversitesi Alman Dili ve Edebiyatı bölümünü bitirdi. Goethe-Institut sınavlarına hazırlık ve Almanya''da eğitim/iş hayatına uyum dersleri veriyor.', 11, 0, NULL, N'260000010'),
(11, N'Deniz', N'Aksoy', N'deniz.aksoy@edtech.example', N'Tasarım', '2025-11-27T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=deniz.aksoy&backgroundColor=ece4d2', N'Ürün tasarımcısı. Bilkent Grafik Tasarım mezunu; ajans ve teknoloji şirketlerinde on yıl boyunca mobil uygulama ve web ürünleri tasarladı. Kullanıcı araştırması, Figma ile prototipleme, tasarım sistemleri ve tipografi konularında atölyeler yürütüyor.', 12, 0, NULL, N'260000011'),
(12, N'Leyla', N'Erdem', N'leyla.erdem@edtech.example', N'Sanat', '2025-11-16T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=leyla.erdem&backgroundColor=ece4d2', N'Ressam ve sanat tarihi eğitmeni. Mimar Sinan Güzel Sanatlar Üniversitesi Resim bölümü mezunu; eserleri karma ve kişisel sergilerde yer aldı. Karakalem, desen ve renk kuramı atölyeleri veriyor; sanat tarihini eserlerin önünde durup bakmayı öğreterek anlatıyor.', 13, 0, NULL, N'260000012'),
(13, N'Ozan', N'Güneş', N'ozan.gunes@edtech.example', N'Müzik', '2026-01-09T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=ozan.gunes&backgroundColor=ece4d2', N'Piyanist ve gitar eğitmeni. İstanbul Üniversitesi Devlet Konservatuvarı piyano bölümü mezunu; oda müziği ve caz gruplarıyla konserler veriyor. On yıldır her yaştan öğrenciye nota okuma, armoni ve enstrüman tekniği öğretiyor.', 14, 0, NULL, N'260000013'),
(14, N'Kerem', N'Tan', N'kerem.tan@edtech.example', N'Spor', '2025-12-29T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=kerem.tan&backgroundColor=ece4d2', N'Beden eğitimi öğretmeni ve sertifikalı kuvvet-kondisyon antrenörü. Marmara Üniversitesi Spor Bilimleri mezunu; amatör kulüplerde atletizm antrenörlüğü yaptı. Doğru hareket tekniği, sakatlık önleme ve sürdürülebilir antrenman planlaması üzerine dersler veriyor.', 15, 0, NULL, N'260000014'),
(15, N'Gizem', N'Uçar', N'gizem.ucar@edtech.example', N'Genel', '2025-12-18T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=gizem.ucar&backgroundColor=ece4d2', N'Eğitim bilimci ve öğrenme koçu. Boğaziçi Üniversitesi Rehberlik ve Psikolojik Danışmanlık mezunu, eğitim psikolojisi üzerine yüksek lisans yaptı. Etkili çalışma yöntemleri, zaman yönetimi ve sınav kaygısıyla başa çıkma konularında öğrencilere ve velilere seminerler veriyor.', 16, 0, NULL, N'260000015'),
(16, N'Selim', N'Karaca', N'selim.karaca@edtech.example', N'Matematik', '2025-12-07T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=selim.karaca&backgroundColor=ece4d2', N'Analiz ve lineer cebir öğretim görevlisi. ODTÜ Matematik bölümünde fonksiyonel analiz üzerine doktora yaptı; on yıldır mühendislik fakültelerinde Calculus ve Lineer Cebir dersleri veriyor. Tanımı ve teoremi önce bir resimle, sonra ispatla anlatmayı seviyor; derslerinde her kavramı mühendislikteki bir uygulamaya bağlıyor.', 17, 0, NULL, N'260000016'),
(17, N'Nazlı', N'Ergin', N'nazli.ergin@edtech.example', N'Matematik, Veri Bilimi & Yapay Zeka', '2025-11-26T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=nazli.ergin&backgroundColor=ece4d2', N'İstatistikçi ve veri bilimci. Hacettepe Üniversitesi İstatistik bölümünü bitirdi, Bayesçi yöntemler üzerine yüksek lisans yaptı. Sağlık ve perakende sektörlerinde deney tasarımı ve tahmin modelleri kurdu. Olasılığı zar ve kartlarla, istatistiği gerçek veri setleriyle öğretiyor.', 18, 0, NULL, N'260000017'),
(18, N'Barış', N'Özkan', N'baris.ozkan@edtech.example', N'Veri Bilimi & Yapay Zeka, Yazılım', '2025-11-15T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=baris.ozkan&backgroundColor=ece4d2', N'Makine öğrenmesi mühendisi. Sabancı Üniversitesi Bilgisayar Mühendisliği mezunu; görüntü işleme ve öneri sistemleri üzerine sekiz yıl çalıştı, açık kaynak ML kütüphanelerine katkı veriyor. Modelleri kara kutu olarak değil, matematiğini ve hatalarını göstererek anlatıyor.', 19, 0, NULL, N'260000018'),
(19, N'İrem', N'Yalçın', N'irem.yalcin@edtech.example', N'Veri Bilimi & Yapay Zeka', '2026-01-08T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=irem.yalcin&backgroundColor=ece4d2', N'Veri analisti ve görselleştirme uzmanı. İTÜ Endüstri Mühendisliği mezunu; e-ticaret ve medya şirketlerinde SQL, Python ve pano tasarımıyla karar destek sistemleri kurdu. Veriden doğru soruyu sormayı ve sonucu herkesin anlayacağı bir grafikle anlatmayı öğretiyor.', 20, 0, NULL, N'260000019'),
(20, N'Tolga', N'Sezer', N'tolga.sezer@edtech.example', N'Ekonomi & Finans', '2025-12-28T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=tolga.sezer&backgroundColor=ece4d2', N'Ekonomist. Bilkent Üniversitesi İktisat bölümünde lisans ve yüksek lisansını tamamladı; bir yatırım bankasında makroekonomik araştırma bölümünde yedi yıl çalıştı. Arz-talepten para politikasına kadar ekonomiyi günlük haberler ve güncel verilerle okumayı öğretiyor.', 21, 0, NULL, N'260000020'),
(21, N'Ceren', N'Aktaş', N'ceren.aktas@edtech.example', N'Ekonomi & Finans', '2025-12-17T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=ceren.aktas&backgroundColor=ece4d2', N'Serbest muhasebeci mali müşavir ve finans eğitmeni. Marmara Üniversitesi İşletme mezunu; KOBİ''lere muhasebe ve finansal planlama danışmanlığı veriyor. Bilanço okumayı, bütçe yapmayı ve yatırım kararlarını sade bir dille, örnek tablolar üzerinden anlatıyor.', 22, 0, NULL, N'260000021'),
(22, N'Orhan', N'Yeşil', N'orhan.yesil@edtech.example', N'Edebiyat & Felsefe', '2025-12-06T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=orhan.yesil&backgroundColor=ece4d2', N'Edebiyat öğretmeni ve deneme yazarı. İstanbul Üniversitesi Türk Dili ve Edebiyatı bölümünde Cumhuriyet dönemi romanı üzerine yüksek lisans yaptı. Yazıları edebiyat dergilerinde yayımlanıyor. Metni yüksek sesle okumayı, satır arasını tartışmayı ve öğrencinin kendi yorumunu yazmasını önemsiyor.', 23, 0, NULL, N'260000022'),
(23, N'Ece', N'Bulut', N'ece.bulut@edtech.example', N'Edebiyat & Felsefe', '2025-11-25T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=ece.bulut&backgroundColor=ece4d2', N'Felsefe eğitmeni. Boğaziçi Üniversitesi Felsefe bölümünden sonra bilgi felsefesi üzerine doktora yaptı. Antik Yunan''dan çağdaş felsefeye büyük soruları, klasik metinlerden kısa bölümler okuyarak ve argümanları adım adım çözümleyerek tartışıyor.', 24, 0, NULL, N'260000023'),
(24, N'Cem', N'Oral', N'cem.oral@edtech.example', N'Fotoğrafçılık & Sinema', '2025-11-14T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=cem.oral&backgroundColor=ece4d2', N'Belgesel fotoğrafçısı. Mimar Sinan Güzel Sanatlar Üniversitesi Fotoğraf bölümü mezunu; çalışmaları ulusal dergilerde ve sergilerde yer aldı. Pozlama üçgeninden kompozisyona, sokak fotoğrafından düzenlemeye kadar teknik bilgiyi bakmayı öğrenmekle birlikte veriyor.', 25, 0, NULL, N'260000024'),
(25, N'Aslı', N'Tuna', N'asli.tuna@edtech.example', N'Fotoğrafçılık & Sinema', '2026-01-07T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=asli.tuna&backgroundColor=ece4d2', N'Yönetmen ve senarist. Kadir Has Üniversitesi Sinema ve Televizyon bölümünü bitirdi; kısa filmleri ulusal festivallerde gösterildi. Film analizi ve kısa film yapımı atölyeleri yürütüyor; senaryodan kurguya bir filmin nasıl kurulduğunu sahne sahne gösteriyor.', 26, 0, NULL, N'260000025'),
(26, N'Onur', N'Balcı', N'onur.balci@edtech.example', N'Sosyal Bilimler', '2025-12-27T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=onur.balci&backgroundColor=ece4d2', N'Sosyolog. ODTÜ Sosyoloji bölümünde kentleşme ve göç üzerine doktora yaptı; saha araştırmalarında görüşme ve gözlem yöntemleriyle çalışıyor. Toplumsal olayları kavramlar ve gündelik hayattan örneklerle birlikte okumayı öğretiyor.', 27, 0, NULL, N'260000026'),
(27, N'Sena', N'Yurt', N'sena.yurt@edtech.example', N'Yabancı Dil', '2025-12-16T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=sena.yurt&backgroundColor=ece4d2', N'İspanyolca öğretmeni ve çevirmen. Ankara Üniversitesi İspanyol Dili ve Edebiyatı mezunu; Madrid''de bir yıl Erasmus, iki yıl dil okulunda öğretmenlik yaptı. DELE sınavlarına hazırlık ve iletişim odaklı başlangıç dersleri veriyor.', 28, 0, NULL, N'260000027'),
(28, N'Hatice', N'Sönmez', N'hatice.sonmez@edtech.example', N'Türk Dili ve Edebiyatı', '2025-12-05T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=hatice.sonmez&backgroundColor=ece4d2', N'İstanbul Üniversitesi Türk Dili ve Edebiyatı Bölümünden mezun olduktan sonra Marmara Üniversitesinde pedagojik formasyon eğitimini tamamladı. On dört yıldır ortaöğretim ve lise düzeyinde Türkçe öğretmenliği yapmaktadır. Çalışmalarında özellikle YKS ve LGS Türkçe hazırlığı, paragrafta yapı ve anlam bilgisi, sözcükte ve cümlede anlam konularına odaklanır. Derslerinde ezbere dayalı yöntemler yerine metin çözümleme, soru kalıplarını mantıksal olarak analiz etme ve akademik kompozisyon kurgulama tekniklerini uygulamalı biçimde işler.', 29, 0, NULL, N'260000028'),
(29, N'Kemal', N'Erol', N'kemal.erol@edtech.example', N'Türk Dili ve Edebiyatı', '2025-11-24T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=kemal.erol&backgroundColor=ece4d2', N'Boğaziçi Üniversitesi Türk Dili ve Edebiyatı Bölümünden lisans, Ankara Üniversitesinden yeni Türk edebiyatı alanında yüksek lisans derecesini aldı. On altı yıldır üniversite ve araştırma kurumlarında edebiyat tarihi ve Osmanlı Türkçesi dersleri vermektedir. Uzmanlık alanları arasında erken ve geç Cumhuriyet dönemi Türk edebiyatı, edebi akımlar ve Osmanlı paleografyası yer alır. Eğitimlerinde matbu ve rîka hatlı arşiv belgeleri üzerinden metin okuma çalışmaları yürütür; edebi eserleri dönemin toplumsal ve kültürel bağlamıyla ele alır.', 30, 0, NULL, N'260000029'),
(30, N'Derya', N'Öktem', N'derya.oktem@edtech.example', N'Türk Dili ve Edebiyatı, Genel', '2025-11-13T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=derya.oktem&backgroundColor=ece4d2', N'Hacettepe Üniversitesi Ankara Devlet Konservatuvarı Tiyatro Bölümünden mezun oldu. On sekiz yıl boyunca Devlet Tiyatrolarında oyuncu ve TRT radyolarında seslendirme sanatçısı olarak görev yaptı. Bireysel ve kurumsal düzeyde diksiyon, doğru nefes, fonetik, artikülasyon ve sahne konuşması eğitimleri vermektedir. Derslerinde diyafram kullanımını teknik egzersizlerle pekiştirir; katılımcıların konuşma kayıtlarını çözümleyerek vurgu, tonlama, beden dili ve ikna edici hitabet becerilerini birebir uygulamalarla geliştirir.', 31, 0, NULL, N'260000030'),
(31, N'Aylin', N'Kara', N'aylin.kara@edtech.example', N'Psikoloji & Bilişsel Bilimler', '2026-01-06T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=aylin.kara&backgroundColor=ece4d2', N'Orta Doğu Teknik Üniversitesi Psikoloji Bölümünü tamamladıktan sonra Ege Üniversitesinde gelişim psikolojisi alanında yüksek lisans yaptı. On iki yıldır gelişim psikolojisi ve sosyal psikoloji alanlarında akademik araştırmalar yürütmekte ve dersler vermektedir. Çocukluktan yetişkinliğe bilişsel değişim, bağlanma kuramları ve grup dinamikleri üzerine yoğunlaşır. Derslerinde klasik kuramsal yaklaşımları çağdaş ampirik araştırmalarla birleştirir; katılımcılara vaka çözümlemeleri ve gözlem protokolleri üzerinden analitik bakış kazandırır.', 32, 0, NULL, N'260000031'),
(32, N'Volkan', N'Şener', N'volkan.sener@edtech.example', N'Psikoloji & Bilişsel Bilimler', '2025-12-26T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=volkan.sener&backgroundColor=ece4d2', N'İstanbul Teknik Üniversitesindeki mühendislik lisansının ardından Boğaziçi Üniversitesi Bilişsel Bilim yüksek lisans programını tamamladı. On yıldır bilişsel bilim, nörobilişsel modelleme ve deneysel araştırma yöntemleri konularında dersler vermektedir. İnsan belleği, dikkat mekanizmaları ve karar verme süreçlerinin deneysel yollarla incelenmesi üzerine çalışır. Eğitimlerinde katılımcılara hipotez kurma, bilgisayarlı deney tasarımı ve toplanan davranışsal verilerin istatistiksel olarak modellenmesi adımlarını uygulamalı olarak aktarır.', 33, 0, NULL, N'260000032'),
(33, N'Serkan', N'Yavuz', N'serkan.yavuz@edtech.example', N'Hukuk & Kamu Yönetimi', '2025-12-15T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=serkan.yavuz&backgroundColor=ece4d2', N'Ankara Üniversitesi Hukuk Fakültesinden mezun oldu, kamu hukuku alanında yüksek lisansını tamamladı. On beş yıl serbest avukatlık ve kamu kurumlarında hukuk müşavirliği yaptı. Anayasa yargısı, idari işlemler, sözleşmeler ve kişisel verilerin korunması konularında eğitimler verir. Derslerinde her kuralı gerekçesi ve güncel mahkeme kararlarıyla birlikte anlatır, katılımcılara somut olay çözme alışkanlığı kazandırır.', 34, 0, NULL, N'260000033'),
(34, N'Melis', N'Korkut', N'melis.korkut@edtech.example', N'Mühendislik & Robotik', '2025-12-04T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=melis.korkut&backgroundColor=ece4d2', N'İstanbul Teknik Üniversitesi Kontrol ve Otomasyon Mühendisliğinden mezun oldu, mekatronik alanında yüksek lisans yaptı. Endüstriyel otomasyon ve otonom mobil robot projelerinde on yıl Ar-Ge mühendisi olarak çalıştı. Gömülü yazılım, devre tasarımı, ROS ve CAD konularında atölye eğitimleri verir. Derslerinde her kavramı çalışan bir prototip üzerinde gösterir; katılımcılar kursu kendi kurdukları bir devre veya mekanizmayla bitirir.', 35, 0, NULL, N'260000034'),
(35, N'Kaan', N'Ersoy', N'kaan.ersoy@edtech.example', N'Yazılım', '2025-11-23T17:49:37.5240774', N'https://api.dicebear.com/9.x/notionists/svg?seed=kaan.ersoy&backgroundColor=ece4d2', N'Hacettepe Üniversitesi Bilgisayar Mühendisliğinden mezun oldu. Bir bankanın siber güvenlik ekibinde sızma testi uzmanı, ardından bir oyun stüdyosunda mobil ve oyun geliştirici olarak çalıştı; son altı yıldır bulut altyapısı ve DevOps danışmanlığı yapıyor. Derslerinde güvenli kod, otomasyon ve yayına alma süreçlerini gerçek projeler üzerinden anlatır, her bölümü yayında çalışan küçük bir uygulamayla bitirir.', 36, 0, NULL, N'260000035'),
(36, N'Demo', N'Teacher', N'demo_teacher@example.test', N'Yazılım', '2025-12-12T17:49:43.1035657', N'https://api.dicebear.com/9.x/notionists/svg?seed=demo_teacher&backgroundColor=ece4d2', N'Demo Teacher, platformumuzda Yazılım alanında ders veren eğitmenimizdir. Uzmanlık alanı: Programlama dilleri, web ve backend geliştirme, veri yapıları ve algoritmalar. Sıfırdan başlayanlardan profesyonel geliştiricilere kadar, proje odaklı ve uygulamalı yazılım eğitimleri. Derslerinde konuyu adım adım kurar, her bölümü örnek ve alıştırmalarla pekiştirir; öğrencilerinin sorularına ders sonrasında da yanıt verir.', 96, 0, NULL, N'260000036');
SET IDENTITY_INSERT [Teachers] OFF;
-- Students (59)
SET IDENTITY_INSERT [Students] ON;
INSERT INTO [Students] ([Id], [FirstName], [LastName], [StudentNumber], [Email], [CreatedAt], [AboutMe], [ProfilePictureUrl], [UserId], [DeletedAt], [IsDeleted]) VALUES
(1, N'Ali', N'Vural', N'260000001', N'ali.vural@ogrenci.example', '2026-05-11T17:49:39.1921552', N'Ali Vural, E-Kurs''ta Yazılım ve Spor alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ali.vural&backgroundColor=ece4d2', 37, NULL, 0),
(2, N'Ayşe', N'Korkmaz', N'260000002', N'ayse.korkmaz@ogrenci.example', '2026-04-04T17:49:39.1921552', N'Ayşe Korkmaz, E-Kurs''ta Sanat ve Coğrafya alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ayse.korkmaz&backgroundColor=ece4d2', 38, NULL, 0),
(3, N'Berk', N'Altun', N'260000003', N'berk.altun@ogrenci.example', '2026-02-26T17:49:39.1921552', N'Berk Altun, E-Kurs''ta Fen Bilimleri ve Müzik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=berk.altun&backgroundColor=ece4d2', 39, NULL, 0),
(4, N'Buse', N'Yılmaz', N'260000004', N'buse.yilmaz@ogrenci.example', '2026-01-20T17:49:39.1921552', N'Buse Yılmaz, E-Kurs''ta Veri Bilimi & Yapay Zeka ve Sosyal Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=buse.yilmaz&backgroundColor=ece4d2', 40, NULL, 0),
(5, N'Can', N'Erdoğan', N'260000005', N'can.erdogan@ogrenci.example', '2025-12-14T17:49:39.1921552', N'Can Erdoğan, E-Kurs''ta Sosyal Bilimler ve Hukuk & Kamu Yönetimi alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=can.erdogan&backgroundColor=ece4d2', 41, NULL, 0),
(6, N'Defne', N'Kurt', N'260000006', N'defne.kurt@ogrenci.example', '2026-05-06T17:49:39.1921552', N'Defne Kurt, E-Kurs''ta Yabancı Dil ve Edebiyat & Felsefe alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=defne.kurt&backgroundColor=ece4d2', 42, NULL, 0),
(7, N'Efe', N'Şahin', N'260000007', N'efe.sahin@ogrenci.example', '2026-03-30T17:49:39.1921552', N'Efe Şahin, E-Kurs''ta Yazılım ve Matematik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=efe.sahin&backgroundColor=ece4d2', 43, NULL, 0),
(8, N'Elif', N'Özdemir', N'260000008', N'elif.ozdemir@ogrenci.example', '2026-02-21T17:49:39.1921552', N'Elif Özdemir, E-Kurs''ta Coğrafya ve Ekonomi & Finans alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=elif.ozdemir&backgroundColor=ece4d2', 44, NULL, 0),
(9, N'Emir', N'Aslan', N'260000009', N'emir.aslan@ogrenci.example', '2026-01-15T17:49:39.1921552', N'Emir Aslan, E-Kurs''ta Yazılım ve Spor alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=emir.aslan&backgroundColor=ece4d2', 45, NULL, 0),
(10, N'Ezgi', N'Doğan', N'260000010', N'ezgi.dogan@ogrenci.example', '2025-12-09T17:49:39.1921552', N'Ezgi Doğan, E-Kurs''ta Sanat ve Coğrafya alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ezgi.dogan&backgroundColor=ece4d2', 46, NULL, 0),
(11, N'Furkan', N'Kılıç', N'260000011', N'furkan.kilic@ogrenci.example', '2026-05-01T17:49:39.1921552', N'Furkan Kılıç, E-Kurs''ta Fen Bilimleri ve Müzik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=furkan.kilic&backgroundColor=ece4d2', 47, NULL, 0),
(12, N'Gamze', N'Çetin', N'260000012', N'gamze.cetin@ogrenci.example', '2026-03-25T17:49:39.1921552', N'Gamze Çetin, E-Kurs''ta Veri Bilimi & Yapay Zeka ve Sosyal Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=gamze.cetin&backgroundColor=ece4d2', 48, NULL, 0),
(13, N'Hakan', N'Koç', N'260000013', N'hakan.koc@ogrenci.example', '2026-02-16T17:49:39.1921552', N'Hakan Koç, E-Kurs''ta Sosyal Bilimler ve Hukuk & Kamu Yönetimi alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=hakan.koc&backgroundColor=ece4d2', 49, NULL, 0),
(14, N'İpek', N'Aydın', N'260000014', N'ipek.aydin@ogrenci.example', '2026-01-10T17:49:39.1921552', N'İpek Aydın, E-Kurs''ta Yabancı Dil ve Edebiyat & Felsefe alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ipek.aydin&backgroundColor=ece4d2', 50, NULL, 0),
(15, N'Kaan', N'Öztürk', N'260000015', N'kaan.ozturk@ogrenci.example', '2025-12-04T17:49:39.1921552', N'Kaan Öztürk, E-Kurs''ta Yazılım ve Matematik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=kaan.ozturk&backgroundColor=ece4d2', 51, NULL, 0),
(16, N'Lara', N'Güneş', N'260000016', N'lara.gunes@ogrenci.example', '2026-04-26T17:49:39.1921552', N'Lara Güneş, E-Kurs''ta Coğrafya ve Ekonomi & Finans alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=lara.gunes&backgroundColor=ece4d2', 52, NULL, 0),
(17, N'Mert', N'Yıldırım', N'260000017', N'mert.yildirim@ogrenci.example', '2026-03-20T17:49:39.1921552', N'Mert Yıldırım, E-Kurs''ta Yazılım ve Spor alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=mert.yildirim&backgroundColor=ece4d2', 53, NULL, 0),
(18, N'Nehir', N'Acar', N'260000018', N'nehir.acar@ogrenci.example', '2026-02-11T17:49:39.1921552', N'Nehir Acar, E-Kurs''ta Sanat ve Coğrafya alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=nehir.acar&backgroundColor=ece4d2', 54, NULL, 0),
(19, N'Ozan', N'Tekin', N'260000019', N'ozan.tekin@ogrenci.example', '2026-01-05T17:49:39.1921552', N'Ozan Tekin, E-Kurs''ta Fen Bilimleri ve Müzik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ozan.tekin&backgroundColor=ece4d2', 55, NULL, 0),
(20, N'Pelin', N'Sarı', N'260000020', N'pelin.sari@ogrenci.example', '2025-11-29T17:49:39.1921552', N'Pelin Sarı, E-Kurs''ta Veri Bilimi & Yapay Zeka ve Sosyal Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=pelin.sari&backgroundColor=ece4d2', 56, NULL, 0),
(21, N'Rana', N'Uçar', N'260000021', N'rana.ucar@ogrenci.example', '2026-04-21T17:49:39.1921552', N'Rana Uçar, E-Kurs''ta Sosyal Bilimler ve Hukuk & Kamu Yönetimi alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=rana.ucar&backgroundColor=ece4d2', 57, NULL, 0),
(22, N'Sarp', N'Keskin', N'260000022', N'sarp.keskin@ogrenci.example', '2026-03-15T17:49:39.1921552', N'Sarp Keskin, E-Kurs''ta Yabancı Dil ve Edebiyat & Felsefe alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=sarp.keskin&backgroundColor=ece4d2', 58, NULL, 0),
(23, N'Selin', N'Avcı', N'260000023', N'selin.avci@ogrenci.example', '2026-02-06T17:49:39.1921552', N'Selin Avcı, E-Kurs''ta Yazılım ve Matematik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=selin.avci&backgroundColor=ece4d2', 59, NULL, 0),
(24, N'Tuna', N'Bozkurt', N'260000024', N'tuna.bozkurt@ogrenci.example', '2025-12-31T17:49:39.1921552', N'Tuna Bozkurt, E-Kurs''ta Coğrafya ve Ekonomi & Finans alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=tuna.bozkurt&backgroundColor=ece4d2', 60, NULL, 0),
(25, N'Umut', N'Çakır', N'260000025', N'umut.cakir@ogrenci.example', '2025-11-24T17:49:39.1921552', N'Umut Çakır, E-Kurs''ta Yazılım ve Spor alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=umut.cakir&backgroundColor=ece4d2', 61, NULL, 0),
(26, N'Yaren', N'Polat', N'260000026', N'yaren.polat@ogrenci.example', '2026-04-16T17:49:39.1921552', N'Yaren Polat, E-Kurs''ta Sanat ve Coğrafya alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=yaren.polat&backgroundColor=ece4d2', 62, NULL, 0),
(27, N'Yusuf', N'Demirci', N'260000027', N'yusuf.demirci@ogrenci.example', '2026-03-10T17:49:39.1921552', N'Yusuf Demirci, E-Kurs''ta Fen Bilimleri ve Müzik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=yusuf.demirci&backgroundColor=ece4d2', 63, NULL, 0),
(28, N'Zehra', N'Kaya', N'260000028', N'zehra.kaya@ogrenci.example', '2026-02-01T17:49:39.1921552', N'Zehra Kaya, E-Kurs''ta Veri Bilimi & Yapay Zeka ve Sosyal Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=zehra.kaya&backgroundColor=ece4d2', 64, NULL, 0),
(29, N'Aslı', N'Tan', N'260000029', N'asli.tan@ogrenci.example', '2025-12-26T17:49:40.5751557', N'Aslı Tan, E-Kurs''ta Sosyal Bilimler ve Edebiyat & Felsefe alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=asli.tan&backgroundColor=ece4d2', 65, NULL, 0),
(30, N'Barış', N'Oral', N'260000030', N'baris.oral@ogrenci.example', '2025-11-19T17:49:40.5751557', N'Barış Oral, E-Kurs''ta Sanat ve Yabancı Dil alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=baris.oral&backgroundColor=ece4d2', 66, NULL, 0),
(31, N'Cansu', N'Eren', N'260000031', N'cansu.eren@ogrenci.example', '2026-04-11T17:49:40.5751557', N'Cansu Eren, E-Kurs''ta Yazılım ve Genel alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=cansu.eren&backgroundColor=ece4d2', 67, NULL, 0),
(32, N'Deniz', N'Sezer', N'260000032', N'deniz.sezer@ogrenci.example', '2026-03-05T17:49:40.5751557', N'Deniz Sezer, E-Kurs''ta Fen Bilimleri ve Veri Bilimi & Yapay Zeka alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=deniz.sezer&backgroundColor=ece4d2', 68, NULL, 0),
(33, N'Ece', N'Gürel', N'260000033', N'ece.gurel@ogrenci.example', '2026-01-27T17:49:40.5751557', N'Ece Gürel, E-Kurs''ta Coğrafya ve Ekonomi & Finans alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ece.gurel&backgroundColor=ece4d2', 69, NULL, 0),
(34, N'Ferhat', N'Ateş', N'260000034', N'ferhat.ates@ogrenci.example', '2025-12-21T17:49:40.5751557', N'Ferhat Ateş, E-Kurs''ta Tasarım ve Sosyal Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ferhat.ates&backgroundColor=ece4d2', 70, NULL, 0),
(35, N'Gizem', N'Özkan', N'260000035', N'gizem.ozkan@ogrenci.example', '2025-11-14T17:49:40.5751557', N'Gizem Özkan, E-Kurs''ta Genel ve Türk Dili ve Edebiyatı alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=gizem.ozkan&backgroundColor=ece4d2', 71, NULL, 0),
(36, N'Halil', N'Bulut', N'260000036', N'halil.bulut@ogrenci.example', '2026-04-06T17:49:40.5751557', N'Halil Bulut, E-Kurs''ta Yazılım ve Psikoloji & Bilişsel Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=halil.bulut&backgroundColor=ece4d2', 72, NULL, 0),
(37, N'İrem', N'Coşkun', N'260000037', N'irem.coskun@ogrenci.example', '2026-02-28T17:49:40.5751557', N'İrem Coşkun, E-Kurs''ta Spor ve Ekonomi & Finans alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=irem.coskun&backgroundColor=ece4d2', 73, NULL, 0),
(38, N'Kerem', N'Yavuz', N'260000038', N'kerem.yavuz@ogrenci.example', '2026-01-22T17:49:40.5751557', N'Kerem Yavuz, E-Kurs''ta Matematik ve Fotoğrafçılık & Sinema alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=kerem.yavuz&backgroundColor=ece4d2', 74, NULL, 0),
(39, N'Leyla', N'Şen', N'260000039', N'leyla.sen@ogrenci.example', '2025-12-16T17:49:40.5751557', N'Leyla Şen, E-Kurs''ta Coğrafya ve Türk Dili ve Edebiyatı alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=leyla.sen&backgroundColor=ece4d2', 75, NULL, 0),
(40, N'Murat', N'Aksoy', N'260000040', N'murat.aksoy@ogrenci.example', '2026-05-08T17:49:40.5751557', N'Murat Aksoy, E-Kurs''ta Yabancı Dil ve Psikoloji & Bilişsel Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=murat.aksoy&backgroundColor=ece4d2', 76, NULL, 0),
(41, N'Nil', N'Karaca', N'260000041', N'nil.karaca@ogrenci.example', '2026-04-01T17:49:40.5751557', N'Nil Karaca, E-Kurs''ta Müzik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=nil.karaca&backgroundColor=ece4d2', 77, NULL, 0),
(42, N'Onur', N'Toprak', N'260000042', N'onur.toprak@ogrenci.example', '2026-02-23T17:49:40.5751557', N'Onur Toprak, E-Kurs''ta Yazılım ve Matematik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=onur.toprak&backgroundColor=ece4d2', 78, NULL, 0),
(43, N'Pınar', N'Kaplan', N'260000043', N'pinar.kaplan@ogrenci.example', '2026-01-17T17:49:40.5751557', N'Pınar Kaplan, E-Kurs''ta Fen Bilimleri ve Veri Bilimi & Yapay Zeka alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=pinar.kaplan&backgroundColor=ece4d2', 79, NULL, 0),
(44, N'Rıza', N'Uysal', N'260000044', N'riza.uysal@ogrenci.example', '2025-12-11T17:49:40.5751557', N'Rıza Uysal, E-Kurs''ta Sosyal Bilimler ve Edebiyat & Felsefe alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=riza.uysal&backgroundColor=ece4d2', 80, NULL, 0),
(45, N'Sena', N'Bilgin', N'260000045', N'sena.bilgin@ogrenci.example', '2026-05-03T17:49:40.5751557', N'Sena Bilgin, E-Kurs''ta Sanat ve Müzik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=sena.bilgin&backgroundColor=ece4d2', 81, NULL, 0),
(46, N'Tolga', N'Eker', N'260000046', N'tolga.eker@ogrenci.example', '2026-03-27T17:49:40.5751557', N'Tolga Eker, E-Kurs''ta Yazılım ve Matematik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=tolga.eker&backgroundColor=ece4d2', 82, NULL, 0),
(47, N'Ufuk', N'Sönmez', N'260000047', N'ufuk.sonmez@ogrenci.example', '2026-02-18T17:49:40.5751557', N'Ufuk Sönmez, E-Kurs''ta Fen Bilimleri ve Veri Bilimi & Yapay Zeka alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=ufuk.sonmez&backgroundColor=ece4d2', 83, NULL, 0),
(48, N'Vildan', N'Ergin', N'260000048', N'vildan.ergin@ogrenci.example', '2026-01-12T17:49:40.5751557', N'Vildan Ergin, E-Kurs''ta Sosyal Bilimler ve Edebiyat & Felsefe alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=vildan.ergin&backgroundColor=ece4d2', 84, NULL, 0),
(49, N'Yiğit', N'Çınar', N'260000049', N'yigit.cinar@ogrenci.example', '2025-12-06T17:49:40.5751557', N'Yiğit Çınar, E-Kurs''ta Sanat ve Yabancı Dil alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=yigit.cinar&backgroundColor=ece4d2', 85, NULL, 0),
(50, N'Zeynep', N'Ünal', N'260000050', N'zeynep.unal@ogrenci.example', '2026-04-28T17:49:40.5751557', N'Zeynep Ünal, E-Kurs''ta Genel ve Türk Dili ve Edebiyatı alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=zeynep.unal&backgroundColor=ece4d2', 86, NULL, 0),
(51, N'Alp', N'Koçak', N'260000051', N'alp.kocak@ogrenci.example', '2026-03-22T17:49:40.5751557', N'Alp Koçak, E-Kurs''ta Veri Bilimi & Yapay Zeka ve Sosyal Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=alp.kocak&backgroundColor=ece4d2', 87, NULL, 0),
(52, N'Beril', N'Taş', N'260000052', N'beril.tas@ogrenci.example', '2026-02-13T17:49:40.5751557', N'Beril Taş, E-Kurs''ta Genel ve Ekonomi & Finans alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=beril.tas&backgroundColor=ece4d2', 88, NULL, 0),
(53, N'Cem', N'Gök', N'260000053', N'cem.gok@ogrenci.example', '2026-01-07T17:49:40.5751557', N'Cem Gök, E-Kurs''ta Matematik ve Sosyal Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=cem.gok&backgroundColor=ece4d2', 89, NULL, 0),
(54, N'Duru', N'Özer', N'260000054', N'duru.ozer@ogrenci.example', '2025-12-01T17:49:40.5751557', N'Duru Özer, E-Kurs''ta Coğrafya ve Türk Dili ve Edebiyatı alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=duru.ozer&backgroundColor=ece4d2', 90, NULL, 0),
(55, N'Eren', N'Yalçın', N'260000055', N'eren.yalcin@ogrenci.example', '2026-04-23T17:49:40.5751557', N'Eren Yalçın, E-Kurs''ta Yabancı Dil ve Psikoloji & Bilişsel Bilimler alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=eren.yalcin&backgroundColor=ece4d2', 91, NULL, 0),
(56, N'Feyza', N'Akın', N'260000056', N'feyza.akin@ogrenci.example', '2026-03-17T17:49:40.5751557', N'Feyza Akın, E-Kurs''ta Spor ve Müzik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=feyza.akin&backgroundColor=ece4d2', 92, NULL, 0),
(57, N'Göktuğ', N'Sarı', N'260000057', N'goktug.sari@ogrenci.example', '2026-02-08T17:49:40.5751557', N'Göktuğ Sarı, E-Kurs''ta Matematik ve Coğrafya alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=goktug.sari&backgroundColor=ece4d2', 93, NULL, 0),
(58, N'Hilal', N'Durmaz', N'260000058', N'hilal.durmaz@ogrenci.example', '2026-01-02T17:49:40.5751557', N'Hilal Durmaz, E-Kurs''ta Coğrafya ve Veri Bilimi & Yapay Zeka alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=hilal.durmaz&backgroundColor=ece4d2', 94, NULL, 0),
(59, N'Demo', N'Student', N'260000059', N'demo_student@example.test', '2026-04-21T17:49:43.2023552', N'Demo Student, E-Kurs''ta Yazılım ve Matematik alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor.', N'https://api.dicebear.com/9.x/notionists/svg?seed=demo_student&backgroundColor=ece4d2', 97, NULL, 0);
SET IDENTITY_INSERT [Students] OFF;
-- Courses (104)
SET IDENTITY_INSERT [Courses] ON;
INSERT INTO [Courses] ([Id], [Title], [MaxCapacity], [Category], [Instructor], [Price], [Description], [ImageUrl], [DeletedAt], [IsDeleted], [TeacherId], [CreatedAt], [IsFeatured], [Level], [SubCategory], [Language], [SubtitleLanguages], [Topic]) VALUES
(1, N'İleri Seviye C# ve .NET API', 40, N'Yazılım', N'Demo Teacher', 1499.00, N'C# dilinin ileri özelliklerini ve ASP.NET Core ile üretim kalitesinde REST API geliştirmeyi öğrenin. Async/await, LINQ, generic yapılar, bağımlılık enjeksiyonu, EF Core, JWT kimlik doğrulama ve katmanlı mimariyi tek bir proje üzerinden kuruyoruz. Temel C# bilen ve backend geliştiriciliğe adım atmak isteyenler için. Kurs sonunda test edilmiş, belgelenmiş bir API''yi baştan sona yazabileceksiniz.', NULL, NULL, 0, 36, '2026-05-01T17:49:37.5240774', 0, N'Advanced', N'Web Geliştirme (Frontend & Backend)', N'tr', N'en', N'C# / .NET'),
(2, N'Java', 40, N'Yazılım', N'Demo Teacher', 999.00, N'Java ile nesne yönelimli programlamayı sıfırdan öğrenin. Sınıflar, kalıtım, arayüzler, koleksiyonlar, istisna yönetimi ve akışlar (Streams) konularını küçük uygulamalarla işliyoruz. Programlamaya yeni başlayanlar ve üniversitede Java dersi alan öğrenciler için uygundur.', NULL, NULL, 0, 36, '2026-04-14T17:49:37.5240774', 0, N'Beginner', N'Web Geliştirme (Frontend & Backend)', N'tr', N'en,de', N'Java'),
(3, N'Veri Yapıları', 50, N'Yazılım', N'Demo Teacher', 899.00, N'Yazılımın temelini oluşturan veri yapılarını hem kavramsal hem de kod düzeyinde öğrenin. Diziler, bağlı listeler, yığın ve kuyruklar, ağaçlar, hash tabloları ve graflar; her birinin zaman ve bellek maliyetleriyle birlikte. Teknik mülakatlara hazırlananlar ve bilgisayar mühendisliği öğrencileri için.', NULL, NULL, 0, 36, '2026-03-28T17:49:37.5240774', 0, N'Intermediate', N'Veri Yapıları & Algoritmalar', N'tr', N'en', N'Algoritmalar'),
(4, N'Algoritmalar', 50, N'Yazılım', N'Zeynep Arslan', 999.00, N'Problem çözme becerinizi sistematik hale getirin. Sıralama ve arama, böl ve yönet, açgözlü algoritmalar, dinamik programlama ve graf algoritmalarını örnek problemlerle çalışıyoruz. Veri yapılarını bilen ve yarışma programlamasına ya da mülakatlara hazırlanan öğrenciler için.', NULL, NULL, 0, 2, '2026-03-11T17:49:37.5240774', 0, N'Intermediate', N'Veri Yapıları & Algoritmalar', N'tr', N'en', N'Algoritmalar'),
(5, N'React ile Modern Web Geliştirme', 45, N'Yazılım', N'Emre Aydın', 1299.00, N'React 19 ve TypeScript ile hızlı, erişilebilir ve bakımı kolay arayüzler geliştirin. Bileşen tasarımı, hook''lar, durum yönetimi, veri çekme, yönlendirme ve form işlemleri; bitirme projesi olarak bir kurs kataloğu uygulaması. HTML, CSS ve temel JavaScript bilen geliştiriciler için.', NULL, NULL, 0, 1, '2026-02-22T17:49:37.5240774', 0, N'Intermediate', N'Web Geliştirme (Frontend & Backend)', N'tr', N'en', N'React'),
(6, N'Matematik', 60, N'Matematik', N'Mehmet Öztürk', 699.00, N'Lise matematiğinin temel konularını sağlam bir zemine oturtun: sayılar, denklemler, fonksiyonlar, polinomlar, üstel ve logaritmik ifadeler. Her konu sezgisel anlatım, çözümlü örnek ve seviyeli soru setleriyle ilerler. Üniversite sınavına hazırlanan ve eksiklerini kapatmak isteyen öğrenciler için.', NULL, NULL, 0, 3, '2026-02-05T17:49:37.5240774', 0, N'Beginner', N'TYT-AYT Matematik', N'tr', N'en,de', N'YKS'),
(7, N'Matematik Geometri', 60, N'Matematik', N'Mehmet Öztürk', 749.00, N'Üçgenlerden çembere, katı cisimlerden analitik geometriye uzanan kapsamlı bir geometri kursu. Şekil çizerek düşünmeyi, yardımcı eleman kullanmayı ve ispat mantığını öğrenirsiniz. Sınav hazırlığındaki lise öğrencileri ve geometride kendini zayıf hissedenler için.', NULL, NULL, 0, 3, '2026-04-29T17:49:37.5240774', 0, N'Intermediate', N'Geometri & Trigonometri', N'tr', N'en', N'YKS'),
(8, N'Ayrık Matematik', 50, N'Matematik', N'Zeynep Arslan', 849.00, N'Bilgisayar bilimlerinin matematiksel temeli: mantık, ispat teknikleri, kümeler, bağıntılar, kombinatorik, graf teorisi ve özyineleme. Her konu yazılımdaki karşılığıyla birlikte anlatılır. Bilgisayar ve yazılım mühendisliği öğrencileri ile algoritmalara sağlam bir temel isteyenler için.', NULL, NULL, 0, 2, '2026-04-12T17:49:37.5240774', 0, N'Intermediate', N'Lineer Cebir & Soyut Matematik', N'tr', N'en', N'Üniversite Matematiği'),
(9, N'Fizik', 60, N'Fen Bilimleri', N'Can Yıldız', 799.00, N'Mekanikten elektriğe, dalgalardan optiğe lise fiziğinin tamamı. Formül ezberi yerine olayın arkasındaki modeli kurmayı, birim analizini ve grafik yorumlamayı öğretiyoruz. Basit deneyler ve simülasyonlarla desteklenen dersler; sınav hazırlığındaki öğrenciler için.', NULL, NULL, 0, 5, '2026-03-26T17:49:37.5240774', 0, N'Intermediate', N'Klasik & Kuantum Fiziği', N'tr', N'en', N'YKS'),
(10, N'Kimya', 60, N'Fen Bilimleri', N'Elif Şahin', 749.00, N'Atomun yapısından kimyasal tepkimelere, asit-bazdan organik kimyaya temel kimya. Konular laboratuvar örnekleri ve günlük hayattan bağlantılarla işlenir; mol hesapları adım adım pekiştirilir. Lise öğrencileri ve sağlık bilimlerine hazırlananlar için.', NULL, NULL, 0, 4, '2026-03-09T17:49:37.5240774', 0, N'Intermediate', N'Genel & Organik Kimya', N'tr', N'en,de', N'YKS'),
(11, N'Biyoloji', 60, N'Fen Bilimleri', N'Elif Şahin', 749.00, N'Hücreden ekosisteme canlıların yapısını ve işleyişini öğrenin. Hücre biyolojisi, kalıtım, insan fizyolojisi ve ekoloji konuları güncel araştırmalardan örneklerle anlatılır. Lise öğrencileri ve tıp, eczacılık gibi bölümlere hazırlananlar için.', NULL, NULL, 0, 4, '2026-02-20T17:49:37.5240774', 0, N'Beginner', N'Moleküler Biyoloji & Genetik', N'tr', N'en', N'YKS'),
(12, N'Astronomiye Giriş', 80, N'Fen Bilimleri', N'Can Yıldız', 599.00, N'Gökyüzünü okumayı öğrenin: takımyıldızlar, Güneş Sistemi, yıldızların yaşamı ve evrenin büyük ölçekli yapısı. Teleskop seçimi ve basit gözlem planlama dersleriyle birlikte. Ön bilgi gerekmez; meraklı her yaştan öğrenci için.', NULL, NULL, 0, 5, '2026-02-03T17:49:37.5240774', 0, N'Beginner', N'Astronomi & Astrofizik', N'tr', N'en', N'Astronomi'),
(13, N'Fiziki Coğrafya', 60, N'Coğrafya', N'Ayşe Demir', 699.00, N'Yeryüzünü şekillendiren doğal sistemleri bir bütün olarak inceleyin: Dünya''nın şekli ve hareketleri, iklim elemanları, su döngüsü, toprak ve bitki örtüsü. Harita, grafik ve uydu görüntüleriyle zenginleştirilmiş dersler; lise öğrencileri ve coğrafyaya ilgi duyan herkes için.', NULL, NULL, 0, 6, '2026-04-27T17:49:37.5240774', 0, N'Beginner', N'Fiziki Coğrafya & Jeomorfoloji', N'tr', N'en', N'Fiziki Coğrafya'),
(14, N'Jeomorfoloji', 40, N'Coğrafya', N'Ayşe Demir', 799.00, N'Dağlar, vadiler, kıyılar ve mağaralar nasıl oluşur? İç ve dış kuvvetlerin yer şekilleri üzerindeki etkisini, Türkiye''den arazi örnekleriyle inceleyin. Topoğrafik profil çizimi ve fotoğraf yorumlama alıştırmaları içerir. Coğrafya öğrencileri ve ileri düzey lise öğrencileri için.', NULL, NULL, 0, 6, '2026-04-10T17:49:37.5240774', 0, N'Advanced', N'Fiziki Coğrafya & Jeomorfoloji', N'tr', N'en,de', N'Fiziki Coğrafya'),
(15, N'Türkiye Coğrafyası', 60, N'Coğrafya', N'Burak Kaya', 749.00, N'Türkiye''nin konumunu, yer şekillerini, iklimini, nüfusunu ve ekonomik faaliyetlerini bölge bölge inceleyin. Güncel istatistikler ve tematik haritalarla Türkiye''yi mekânsal bir bakışla okumayı öğrenirsiniz. Sınavlara hazırlanan öğrenciler ve Türkiye''yi daha yakından tanımak isteyenler için.', NULL, NULL, 0, 7, '2026-03-24T17:49:37.5240774', 0, N'Intermediate', N'Türkiye Coğrafyası & Jeopolitik', N'tr', N'en', N'KPSS'),
(16, N'Harita Bilgisi ve CBS', 35, N'Coğrafya', N'Burak Kaya', 999.00, N'Harita okumadan mekânsal analize: ölçek, projeksiyon, koordinat sistemleri ve izohips okuma ile başlayıp QGIS kullanarak Coğrafi Bilgi Sistemleri ile kendi tematik haritalarınızı üretin. Coğrafya ve şehir planlama öğrencileri, harita ile çalışan profesyoneller için.', NULL, NULL, 0, 7, '2026-03-07T17:49:37.5240774', 0, N'Intermediate', N'CBS & Harita Okuma', N'tr', N'en', N'CBS'),
(17, N'Coğrafya', 60, N'Coğrafya', N'Ayşe Demir', 599.00, N'Fiziki, beşerî ve ekonomik coğrafyanın temel kavramlarını tek kursta toplayan genel bir başlangıç. Doğa ile insan arasındaki etkileşimi harita okuma ve güncel örneklerle inceleyin. Lise öğrencileri ve coğrafyaya yeni başlayanlar için.', NULL, NULL, 0, 6, '2026-02-18T17:49:37.5240774', 0, N'Beginner', N'Fiziki Coğrafya & Jeomorfoloji', N'tr', N'en', N'YKS'),
(18, N'Tarih', 60, N'Sosyal Bilimler', N'Selin Koç', 649.00, N'İlk çağ uygarlıklarından Osmanlı''ya ve yakın çağa uzanan bir tarih yolculuğu. Olayları kaynaklarıyla birlikte okumayı, dönemler arası bağlantı kurmayı ve neden-sonuç ilişkisini yorumlamayı öğrenirsiniz. Lise öğrencileri ve tarih meraklıları için.', NULL, NULL, 0, 8, '2026-02-01T17:49:37.5240774', 0, N'Beginner', N'Türk & Dünya Tarihi', N'tr', N'en,de', N'YKS'),
(19, N'Cumhuriyet Tarihi', 60, N'Sosyal Bilimler', N'Selin Koç', 599.00, N'Millî Mücadele''den günümüze Türkiye Cumhuriyeti''nin kuruluşu ve gelişimi. İnkılaplar, dış politika ve toplumsal dönüşüm, dönemin belgeleri ve basınından örneklerle ele alınır. Üniversite İnkılap Tarihi dersine ve sınavlara hazırlananlar için.', NULL, NULL, 0, 8, '2026-04-25T17:49:37.5240774', 0, N'Intermediate', N'Türk & Dünya Tarihi', N'tr', N'en', N'KPSS'),
(20, N'İngilizce A1-A2', 30, N'Yabancı Dil', N'Merve Çelik', 799.00, N'Sıfırdan başlayanlar için iletişim odaklı İngilizce. Kendinizi tanıtmaktan alışverişe, yol tarifinden geçmiş deneyimleri anlatmaya kadar günlük durumlarda konuşabilecek düzeye gelirsiniz. Temel dilbilgisi, sık kullanılan 1000 kelime ve bol konuşma pratiği.', NULL, NULL, 0, 9, '2026-04-08T17:49:37.5240774', 0, N'Beginner', N'Genel İngilizce (A1–C1)', N'en', N'tr', N'A1-A2'),
(21, N'İngilizce', 30, N'Yabancı Dil', N'Merve Çelik', 899.00, N'B1-B2 seviyesine ulaşmak isteyenler için kapsamlı İngilizce. Akıcı konuşma, akademik okuma, e-posta ve rapor yazma becerilerini geliştirirken ileri dilbilgisi yapılarını bağlam içinde öğrenirsiniz. Temel İngilizcesi olan öğrenciler ve iş hayatında İngilizce kullananlar için.', NULL, NULL, 0, 9, '2026-03-22T17:49:37.5240774', 0, N'Intermediate', N'Genel İngilizce (A1–C1)', N'en', N'tr', N'B1-B2'),
(22, N'Almanca A1', 25, N'Yabancı Dil', N'Hakan Polat', 849.00, N'Almancaya sağlam bir başlangıç. Telaffuz, artikeller, temel cümle yapısı ve günlük konuşma kalıplarıyla Goethe A1 sınavına hazırlanırsınız. Almanya''da eğitim veya çalışma planlayanlar için pratik bir giriş.', NULL, NULL, 0, 10, '2026-03-05T17:49:37.5240774', 0, N'Beginner', N'Almanca', N'de', N'en', N'A1-A2'),
(23, N'UI/UX Tasarımın Temelleri', 35, N'Tasarım', N'Deniz Aksoy', 1199.00, N'Kullanıcı ihtiyacından ekran tasarımına uzanan süreci uçtan uca öğrenin. Kullanıcı araştırması, bilgi mimarisi, wireframe, Figma ile prototipleme ve kullanılabilirlik testi; bitirme projesi olarak bir mobil uygulama akışı. Tasarıma geçmek isteyen geliştiriciler ve yeni başlayan tasarımcılar için.', NULL, NULL, 0, 11, '2026-02-16T17:49:37.5240774', 0, N'Beginner', N'UI/UX & Ürün Tasarımı', N'tr', N'en', N'UI/UX'),
(24, N'Grafik Tasarım ve Tipografi', 35, N'Tasarım', N'Deniz Aksoy', 999.00, N'Görsel iletişimin temel ilkelerini öğrenin: kompozisyon, renk, görsel hiyerarşi ve tipografi. Afiş, logo ve marka kimliği çalışmalarıyla portfolyonuza eklenecek işler üretirsiniz. Tasarıma ilgi duyan ve temel bir portfolyo oluşturmak isteyenler için.', NULL, NULL, 0, 11, '2026-01-30T17:49:37.5240774', 0, N'Intermediate', N'Grafik Tasarım & Tipografi', N'tr', N'en', N'Tipografi'),
(25, N'Karakalem ve Desen', 20, N'Sanat', N'Leyla Erdem', 699.00, N'Gözlemle çizim yapmayı temelden öğrenin. Çizgi, oran, perspektif, ışık-gölge ve doku çalışmalarıyla natürmort, mekân ve figür çizimine ilerliyoruz. Hiç çizim deneyimi olmayanlar ve güzel sanatlar sınavlarına hazırlananlar için.', NULL, NULL, 0, 12, '2026-04-23T17:49:37.5240774', 0, N'Beginner', N'Karakalem & Desen Atölyesi', N'tr', N'en', N'Çizim'),
(26, N'Sanat Tarihine Giriş', 80, N'Sanat', N'Leyla Erdem', 549.00, N'Mağara resimlerinden çağdaş sanata, eserleri dönemleri ve bağlamlarıyla birlikte okuyun. Rönesans, Barok, Empresyonizm ve modern sanat akımlarını başyapıtlar üzerinden inceliyor; bir eseri nasıl "bakarak" anlayacağınızı öğreniyoruz. Sanata meraklı herkes için.', NULL, NULL, 0, 12, '2026-04-06T17:49:37.5240774', 0, N'Beginner', N'Sanat Tarihi & Eser Analizi', N'tr', N'en,de', N'Sanat Tarihi'),
(27, N'Piyano Eğitimi', 15, N'Müzik', N'Ozan Güneş', 1099.00, N'Nota okumadan iki elle parça çalmaya, her seviyeye uygun piyano eğitimi. Doğru oturuş ve el pozisyonu, ritim, gam ve akorlarla tekniğinizi kurar; klasik ve popüler eserlerle repertuvar oluşturursunuz. Yeni başlayanlar ve ara verip yeniden başlamak isteyenler için.', NULL, NULL, 0, 13, '2026-03-20T17:49:37.5240774', 0, N'Beginner', N'Piyano & Klavye', N'tr', N'en', N'Enstrüman'),
(28, N'Gitar Eğitimi', 20, N'Müzik', N'Ozan Güneş', 899.00, N'Akustik gitarla temel akorlardan ritim kalıplarına, tab okumadan basit solo çalmaya. Sevdiğiniz şarkıları eşlik ederek çalabilecek düzeye gelirsiniz. Hiç gitar çalmamış olanlar için.', NULL, NULL, 0, 13, '2026-03-03T17:49:37.5240774', 0, N'Beginner', N'Gitar & Telli Çalgılar', N'tr', N'en', N'Enstrüman'),
(29, N'Beden Eğitimi', 40, N'Spor', N'Kerem Tan', 499.00, N'Temel motor becerilerden takım sporlarına, okul beden eğitimi müfredatının kuramsal ve uygulamalı içeriği. Isınma, esneklik, dayanıklılık ve oyun kuralları; sağlıklı yaşam alışkanlıklarıyla birlikte. Öğrenciler ve beden eğitimi öğretmen adayları için.', NULL, NULL, 0, 14, '2026-02-14T17:49:37.5240774', 0, N'Beginner', N'Fonksiyonel Antrenman & Kondisyon', N'tr', N'en', N'Antrenman'),
(30, N'Fonksiyonel Antrenman', 30, N'Spor', N'Kerem Tan', 599.00, N'Günlük hayatta daha güçlü ve sakatlıktan uzak olmak için fonksiyonel antrenman. Temel hareket kalıplarını doğru teknikle öğrenir, kendi seviyenize göre haftalık bir program kurarsınız. Ekipmansız ya da az ekipmanla, evde veya salonda uygulanabilir.', NULL, NULL, 0, 14, '2026-01-28T17:49:37.5240774', 0, N'Intermediate', N'Fonksiyonel Antrenman & Kondisyon', N'tr', N'en,de', N'Antrenman'),
(31, N'Etkili Çalışma Teknikleri', 100, N'Genel', N'Gizem Uçar', 399.00, N'Daha az sürede daha kalıcı öğrenmek için bilimsel çalışma yöntemleri. Aralıklı tekrar, kendini sınama, not alma teknikleri, zaman yönetimi ve sınav kaygısıyla başa çıkma. Her yaştan öğrenci ve kendini geliştirmek isteyen yetişkinler için.', NULL, NULL, 0, 15, '2026-04-21T17:49:37.5240774', 0, N'Beginner', N'Öğrenmeyi Öğrenme & Hafıza Teknikleri', N'tr', N'en', N'Verimli Çalışma'),
(32, N'Topluluk Önünde Konuşma', 40, N'Genel', N'Gizem Uçar', 549.00, N'Sunum yaparken heyecanı yönetmeyi, fikrini net bir yapıyla anlatmayı ve dinleyiciyi etkilemeyi öğrenin. Konuşma yapısı, ses ve beden dili, slayt tasarımı ve soru-cevap yönetimi; her derste kısa bir konuşma kaydı ve geri bildirim. Öğrenciler, akademisyenler ve iş hayatında sunum yapanlar için.', NULL, NULL, 0, 15, '2026-04-04T17:49:37.5240774', 0, N'Intermediate', NULL, N'tr', N'en', N'İletişim'),
(33, N'Temel Matematik', 80, N'Matematik', N'Mehmet Öztürk', 499.00, N'Matematikte eksiği olan herkes için sıfırdan sağlam bir temel: doğal sayılar, kesirler, ondalık sayılar, oran-orantı, yüzdeler ve cebire ilk adım. Her konu günlük hayattan örneklerle başlar, kısa alıştırmalarla pekişir. Ortaokul öğrencileri, sınava yeniden hazırlananlar ve matematiğe yeniden başlamak isteyen yetişkinler için.', NULL, NULL, 0, 3, '2026-03-18T17:49:37.5240774', 0, N'Beginner', N'TYT-AYT Matematik', N'tr', N'en', N'YKS'),
(34, N'Kalkülüs ve Analiz', 50, N'Matematik', N'Selim Karaca', 1099.00, N'Limit, türev ve integralin mantığını sezgiyle kurun, ardından teknikleri sistemli biçimde öğrenin. Değişim hızı, optimizasyon, alan ve hacim hesapları; diziler ve serilerle analize giriş. Üniversite birinci sınıf Calculus dersini alan mühendislik ve fen öğrencileri ile sınavda türev-integral konularını derinleştirmek isteyenler için.', NULL, NULL, 0, 16, '2026-03-01T17:49:37.5240774', 0, N'Advanced', N'Analiz & Kalkülüs', N'tr', N'en,de', N'Üniversite Matematiği'),
(35, N'Lineer Cebir', 50, N'Matematik', N'Selim Karaca', 999.00, N'Vektörler, matrisler ve doğrusal dönüşümlerle uzayı düşünmeyi öğrenin. Denklem sistemlerinden özdeğerlere kadar her kavram geometrik bir resimle ve bilgisayar grafikleri, veri bilimi ve mühendislikten uygulamalarla anlatılır. Mühendislik, fizik ve veri bilimi öğrencileri için.', NULL, NULL, 0, 16, '2026-02-12T17:49:37.5240774', 0, N'Advanced', N'Lineer Cebir & Soyut Matematik', N'tr', N'en', N'Üniversite Matematiği'),
(36, N'Olasılık ve İstatistik', 60, N'Matematik', N'Nazlı Ergin', 949.00, N'Belirsizliği ölçmeyi ve veriden güvenilir sonuç çıkarmayı öğrenin. Sayma, olasılık kuralları, rastgele değişkenler ve dağılımlardan güven aralığı ve hipotez testlerine uzanan bir yol; her konu gerçek bir veri seti ve basit bir simülasyonla desteklenir. Üniversite öğrencileri ve veri bilimine hazırlananlar için.', NULL, NULL, 0, 17, '2026-01-26T17:49:37.5240774', 0, N'Intermediate', N'Olasılık & İstatistik', N'tr', N'en', N'İstatistik'),
(37, N'Python', 60, N'Yazılım', N'Emre Aydın', 799.00, N'Programlamaya Python ile başlayın. Değişkenler, koşullar, döngüler, fonksiyonlar, veri yapıları, dosya işlemleri ve modüller; her bölüm küçük bir otomasyon projesiyle biter. Hiç kod yazmamış olanlar, veri bilimine veya backend geliştirmeye hazırlananlar için.', NULL, NULL, 0, 1, '2026-04-19T17:49:37.5240774', 0, N'Beginner', N'Veri Yapıları & Algoritmalar', N'tr', N'en', N'Python'),
(38, N'SQL ve Veritabanı Tasarımı', 50, N'Yazılım', N'Emre Aydın', 899.00, N'İlişkisel veritabanlarını tasarlamayı ve SQL ile veriyi sorgulamayı öğrenin. Tablolar, anahtarlar, normalizasyon, JOIN''ler, gruplama, alt sorgular, indeksler ve işlemler; örnek bir e-ticaret veritabanı üzerinden. Backend geliştiriciler ve veri analistleri için.', NULL, NULL, 0, 1, '2026-04-02T17:49:37.5240774', 0, N'Intermediate', N'Web Geliştirme (Frontend & Backend)', N'tr', N'en,de', N'SQL'),
(39, N'Python ile Veri Analizi', 50, N'Veri Bilimi & Yapay Zeka', N'İrem Yalçın', 1199.00, N'Ham veriyi temizleyip anlamlı bir hikâyeye dönüştürün. NumPy ve pandas ile veri işleme, eksik ve hatalı veriyle başa çıkma, gruplama ve birleştirme; Matplotlib ve seaborn ile görselleştirme. Temel Python bilen ve veriyle karar vermek isteyen herkes için; kurs bir analiz raporuyla biter.', NULL, NULL, 0, 19, '2026-03-16T17:49:37.5240774', 0, N'Beginner', N'Veri Analizi & Görselleştirme', N'tr', N'en', N'Python'),
(40, N'Makine Öğrenmesine Giriş', 40, N'Veri Bilimi & Yapay Zeka', N'Barış Özkan', 1499.00, N'Bir modelin veriden nasıl öğrendiğini matematiği ve kodu ile birlikte anlayın. Regresyon, sınıflandırma, karar ağaçları, kümeleme, model değerlendirme ve aşırı öğrenme; scikit-learn ile uçtan uca projeler. Python ve temel istatistik bilen, yapay zekâ alanına adım atmak isteyenler için.', NULL, NULL, 0, 18, '2026-02-27T17:49:37.5240774', 0, N'Intermediate', N'Makine Öğrenmesi', N'tr', N'en', N'Makine Öğrenmesi'),
(41, N'Derin Öğrenme ve Sinir Ağları', 35, N'Veri Bilimi & Yapay Zeka', N'Barış Özkan', 1699.00, N'Yapay sinir ağlarını sıfırdan kurarak derin öğrenmenin nasıl çalıştığını görün. Geri yayılım, evrişimli ağlar, dil modelleri ve dikkat mekanizması; PyTorch ile görüntü sınıflandırma ve metin projeleri. Makine öğrenmesi temellerini bilen ve lineer cebire aşina olan öğrenciler için.', NULL, NULL, 0, 18, '2026-02-10T17:49:37.5240774', 0, N'Advanced', N'Derin Öğrenme & NLP', N'tr', N'en', N'Makine Öğrenmesi'),
(42, N'Veri Görselleştirme ve Hikâye Anlatımı', 45, N'Veri Bilimi & Yapay Zeka', N'İrem Yalçın', 899.00, N'Sayıları ikna edici ve dürüst bir anlatıya dönüştürün. Algı ilkeleri, grafik türleri, renk ve tipografi seçimi, pano tasarımı ve sunum; kötü grafikleri düzelterek öğrenme. Analistler, araştırmacılar ve rapor hazırlayan herkes için.', NULL, NULL, 0, 19, '2026-01-24T17:49:37.5240774', 0, N'Intermediate', N'Veri Analizi & Görselleştirme', N'tr', N'en,de', N'Veri Görselleştirme'),
(43, N'Mikroekonomiye Giriş', 60, N'Ekonomi & Finans', N'Tolga Sezer', 749.00, N'Fiyatlar nasıl oluşur, firmalar nasıl karar verir, piyasalar ne zaman başarısız olur? Arz-talep, esneklik, tüketici ve üretici teorisi, piyasa yapıları ve dışsallıkları güncel haberlerden örneklerle inceleyin. İktisat ve işletme öğrencileri ile ekonomiyi anlamak isteyen herkes için.', NULL, NULL, 0, 20, '2026-04-17T17:49:37.5240774', 0, N'Beginner', N'Mikro & Makroekonomi', N'tr', N'en', N'Ekonomi Teorisi'),
(44, N'Makroekonomi ve Para Politikası', 60, N'Ekonomi & Finans', N'Tolga Sezer', 849.00, N'Enflasyon, faiz, büyüme ve döviz kuru arasındaki ilişkileri kavrayın. Milli gelir hesapları, merkez bankacılığı, maliye politikası ve dış ticaret; Türkiye ve dünya ekonomisinden güncel verilerle. Ekonomi haberlerini bilinçli okumak isteyenler için.', NULL, NULL, 0, 20, '2026-03-31T17:49:37.5240774', 0, N'Intermediate', N'Mikro & Makroekonomi', N'tr', N'en', N'Ekonomi Teorisi'),
(45, N'Kişisel Finans ve Yatırım', 80, N'Ekonomi & Finans', N'Ceren Aktaş', 699.00, N'Bütçe yapmaktan birikim ve yatırım kararlarına kadar paranızı bilinçli yönetin. Gelir-gider takibi, acil durum fonu, kredi ve borç yönetimi, faiz ve enflasyon, mevduat, fon, hisse ve tahvilin mantığı ile risk-getiri dengesi. Yatırım tavsiyesi değil, kendi kararınızı verebilmeniz için finansal okuryazarlık.', NULL, NULL, 0, 21, '2026-03-14T17:49:37.5240774', 0, N'Beginner', N'Finansal Piyasalar & Yatırım', N'tr', N'en', N'Yatırım'),
(46, N'Muhasebenin Temelleri', 50, N'Ekonomi & Finans', N'Ceren Aktaş', 799.00, N'İşletmenin dilini öğrenin: çift taraflı kayıt, hesap planı, yevmiye ve büyük defter, bilanço ve gelir tablosu. Küçük bir işletmenin bir yıllık kayıtlarını baştan sona tutarak finansal tabloları okumayı ve yorumlamayı öğrenirsiniz. İşletme öğrencileri ve girişimciler için.', NULL, NULL, 0, 21, '2026-02-25T17:49:37.5240774', 0, N'Beginner', N'Muhasebe & Kurumsal Finans', N'tr', N'en,de', N'Muhasebe'),
(47, N'Türk Edebiyatına Giriş', 60, N'Edebiyat & Felsefe', N'Orhan Yeşil', 649.00, N'Divan şiirinden Tanzimat''a, Millî Edebiyat''tan Cumhuriyet dönemi roman ve şiirine Türk edebiyatının ana dönemlerini temsilci metinlerle okuyun. Her derste bir metin yüksek sesle okunur, dönemi ve biçimiyle birlikte çözümlenir. Lise öğrencileri ve edebiyatı yeniden keşfetmek isteyen okurlar için.', NULL, NULL, 0, 22, '2026-02-08T17:49:37.5240774', 0, N'Beginner', N'Dünya Edebiyatı & Karşılaştırmalı Metinler', N'tr', N'en', N'Türk Edebiyatı'),
(48, N'Felsefeye Giriş', 70, N'Edebiyat & Felsefe', N'Ece Bulut', 599.00, N'Bilgi nedir, doğru eylem hangisidir, zihin nasıl çalışır? Felsefenin büyük sorularını Platon''dan Descartes''a, Kant''tan çağdaş düşünürlere kısa metin okumalarıyla tartışın. Argüman kurmayı ve değerlendirmeyi öğreten, ön bilgi gerektirmeyen bir giriş.', NULL, NULL, 0, 23, '2026-01-22T17:49:37.5240774', 0, N'Beginner', N'Klasik & Modern Felsefe', N'tr', N'en', N'Felsefe'),
(49, N'Mantık ve Eleştirel Düşünme', 70, N'Edebiyat & Felsefe', N'Ece Bulut', 549.00, N'Sağlam bir argümanı zayıf olandan ayırmayı öğrenin. Önerme mantığı, tümdengelim ve tümevarım, yaygın safsatalar, bilişsel yanlılıklar ve haber-kaynak değerlendirme; gündelik tartışmalardan örneklerle. Her yaştan öğrenci ve daha net düşünmek isteyen herkes için.', NULL, NULL, 0, 23, '2026-04-15T17:49:37.5240774', 0, N'Intermediate', N'Mantık & Eleştirel Düşünme', N'tr', N'en', N'Felsefe'),
(50, N'Dijital Fotoğrafçılığın Temelleri', 30, N'Fotoğrafçılık & Sinema', N'Cem Oral', 899.00, N'Otomatik moddan çıkın ve fotoğrafı bilerek çekin. Pozlama üçgeni, odak ve alan derinliği, ışık, kompozisyon ve renk; Lightroom ile temel düzenleme. Her derste bir çekim ödevi ve geri bildirim. Fotoğraf makinesi veya iyi bir telefonu olan yeni başlayanlar için.', NULL, NULL, 0, 24, '2026-03-29T17:49:37.5240774', 0, N'Beginner', N'Dijital Fotoğrafçılık & Işık', N'tr', N'en,de', N'Fotoğraf'),
(51, N'Sinema Dili ve Film Analizi', 60, N'Fotoğrafçılık & Sinema', N'Aslı Tuna', 749.00, N'Bir filmi izlemekten okumaya geçin. Çerçeve, kamera hareketi, ışık, kurgu, ses ve anlatı yapısını klasik ve çağdaş filmlerden sahneler üzerinden çözümleyin. Sinemaseverler ve sinema-televizyon öğrencileri için.', NULL, NULL, 0, 25, '2026-03-12T17:49:37.5240774', 0, N'Intermediate', N'Sinema Dili & Film Analizi', N'tr', N'en', N'Film Analizi'),
(52, N'Kısa Film Yapımı', 20, N'Fotoğrafçılık & Sinema', N'Aslı Tuna', 1199.00, N'Fikirden festivale bir kısa filmi baştan sona üretin. Senaryo, çekim planı, oyuncu yönetimi, telefonla ya da makineyle çekim, ses kaydı, kurgu ve renk düzenleme. Kurs sonunda 3-5 dakikalık kendi kısa filminiz hazır olur.', NULL, NULL, 0, 25, '2026-02-23T17:49:37.5240774', 0, N'Advanced', N'Senaryo & Kısa Film Yapımı', N'tr', N'en', N'Film Yapımı'),
(53, N'Sosyolojiye Giriş', 60, N'Sosyal Bilimler', N'Onur Balcı', 599.00, N'Toplumu bir arada tutan ve değiştiren güçleri inceleyin: kültür, aile, eğitim, kentleşme, göç ve eşitsizlik. Klasik kuramcılardan güncel araştırmalara, gündelik hayattan örneklerle sosyolojik bakış açısı kazanın. Lise ve üniversite öğrencileri için.', NULL, NULL, 0, 26, '2026-02-06T17:49:37.5240774', 0, N'Beginner', N'Sosyoloji & Toplum Bilimleri', N'tr', N'en', N'Sosyoloji'),
(54, N'İspanyolca A1', 25, N'Yabancı Dil', N'Sena Yurt', 799.00, N'İspanyolcaya iletişim odaklı bir başlangıç. Telaffuz, temel dilbilgisi ve günlük konuşma kalıplarıyla kendinizi tanıtır, ihtiyaçlarınızı anlatır, kısa diyaloglar kurarsınız. DELE A1 sınavına hazırlık için de uygundur.', NULL, NULL, 0, 27, '2026-04-30T17:49:37.5240774', 0, N'Beginner', N'İspanyolca & Fransızca', N'es', N'en,de', N'A1-A2'),
(55, N'Müzik Teorisi ve Kulak Eğitimi', 40, N'Müzik', N'Ozan Güneş', 699.00, N'Müziği okumayı, duymayı ve anlamayı öğrenin. Nota, ritim, aralıklar, gamlar, akorlar ve armoninin temelleri; her derste kulak eğitimi ve solfej alıştırmaları. Enstrüman çalan veya çalmak isteyen herkes için.', NULL, NULL, 0, 13, '2026-04-13T17:49:37.5240774', 0, N'Intermediate', N'Müzik Teorisi, Armoni & Solfej', N'tr', N'en', N'Müzik Teorisi'),
(56, N'Suluboya Atölyesi', 20, N'Sanat', N'Leyla Erdem', 749.00, N'Suyun ve rengin akışını kontrol etmeyi öğrenin. Malzeme seçimi, ıslak üzerine ıslak ve kuru fırça teknikleri, renk karışımları, ışık ve boşluk kullanımı; manzara, natürmort ve botanik çalışmalar. Çizim deneyimi olan veya olmayan herkes için.', NULL, NULL, 0, 12, '2026-03-27T17:49:37.5240774', 0, N'Intermediate', N'Renk Kuramı & Yağlıboya', N'tr', N'en', N'Çizim'),
(57, N'Yoga ve Mobilite', 40, N'Spor', N'Kerem Tan', 499.00, N'Esnekliği, eklem hareket açıklığını ve nefes farkındalığını geliştirin. Masa başında geçen günlerin etkisini azaltan, her seviyeye uygun yoga akışları ve mobilite rutinleri; evde ekipmansız uygulanabilir.', NULL, NULL, 0, 14, '2026-03-10T17:49:37.5240774', 0, N'Beginner', N'Zihin-Beden & Esneklik', N'tr', N'en', N'Mobilite'),
(58, N'TYT-AYT Türkçe Paragraf ve Anlam Bilgisi', 80, N'Türk Dili ve Edebiyatı', N'Hatice Sönmez', 749.00, N'YKS adayları için hazırlanan bu orta ve ileri düzey kursta öğrenciler paragraf sorularını süre baskısı altında doğru ve hızlı çözme becerisi kazanır. Ana düşünce, yardımcı düşünceler, anlatım teknikleri ve paragrafta yapı çözümlemeleri derinlemesine ele alınır. Sınavda zaman yönetimini sağlamak ve çeldirici seçenekleri hızla elemek isteyen lise son sınıf öğrencileri ile mezun adaylar hedeflenmektedir.', NULL, NULL, 0, 28, '2026-02-21T17:49:37.5240774', 0, N'Intermediate', N'Paragraf & Anlam Bilgisi', N'tr', N'en,de', N'YKS'),
(59, N'Türkçe Dil Bilgisi ve Yazım Kuralları', 80, N'Türk Dili ve Edebiyatı', N'Hatice Sönmez', 599.00, N'LGS ve TYT sınavlarına hazırlanan öğrenciler için tasarlanan bu başlangıç ve orta düzey eğitimde sözcük türleri, ekler, cümle ögeleri ve güncel TDK yazım kuralları sistematik olarak işlenir. Katılımcılar dil bilgisi sorularında kalıplaşmış hatalardan kurtulur ve kuralları metin üzerinde uygulayabilir. Sınavlarda tam net hedefleyen ve temel Türkçe bilgisini eksiksiz oturtmak isteyen tüm öğrenciler içindir.', NULL, NULL, 0, 28, '2026-02-04T17:49:37.5240774', 0, N'Beginner', N'Türkçe Dil Bilgisi & Yazım', N'tr', N'en', N'Dil Bilgisi'),
(60, N'Akademik Türkçe ve Kompozisyon', 40, N'Türk Dili ve Edebiyatı', N'Hatice Sönmez', 799.00, N'Üniversite öğrencileri ve tez yazım sürecindeki araştırmacılar için hazırlanan bu orta düzey kursta akademik dilin kuralları, metin yapısı ve kompozisyon geliştirme incelenir. Katılımcılar akademik bir makalenin veya denemenin argümantasyon yapısını kurabilir, intihalden kaçınarak kaynak gösterebilir ve akıcı metinler üretebilir. Bilimsel yazı dilini yetkinleştirmek isteyen tüm lisans ve lisansüstü öğrencilerine yöneliktir.', NULL, NULL, 0, 28, '2026-04-28T17:49:37.5240774', 0, N'Intermediate', N'Akademik Yazım & Hitabet', N'tr', N'en', N'Akademik Yazım'),
(61, N'Cumhuriyet Dönemi Türk Edebiyatı', 50, N'Türk Dili ve Edebiyatı', N'Kemal Erol', 899.00, N'Edebiyat fakültesi öğrencileri ve edebiyat meraklıları için tasarlanan bu ileri düzey kursta 1923 sonrasından günümüze Türk edebiyatının dönüşümü çözümlenir. Katılımcılar Garip, İkinci Yeni, Toplumcu Gerçekçilik gibi akımların kuramsal zeminini kavrar ve dönemin başat roman ile şiirlerini edebi kuramlar ışığında tahlil edebilir. Türk edebiyatının modernleşme sürecini derinlemesine incelemek isteyen araştırmacılara hitap eder.', NULL, NULL, 0, 29, '2026-04-11T17:49:37.5240774', 0, N'Advanced', N'Modern Türk Edebiyatı', N'tr', N'en', N'Türk Edebiyatı'),
(62, N'Osmanlı Türkçesi ve Metin Okumaları', 30, N'Türk Dili ve Edebiyatı', N'Kemal Erol', 1099.00, N'Tarih ve edebiyat araştırmacıları için hazırlanan bu ileri düzey eğitimde Osmanlı Türkçesiyle kaleme alınmış matbu ve el yazması metinlerin okunması öğretilir. Katılımcılar Arapça ve Farsça kökenli dil kurallarını öğrenir, rîka ve nesih hat türlerini ayırt edebilir ve arşiv belgelerini bağımsız olarak çözümleyebilir. Tarihsel kaynakları doğrudan orijinal metinlerinden okumayı amaçlayan araştırmacılar içindir.', NULL, NULL, 0, 29, '2026-03-25T17:49:37.5240774', 0, N'Advanced', N'Divan & Halk Edebiyatı', N'tr', N'en,de', N'Osmanlı Türkçesi'),
(63, N'Diksiyon ve Etkili Hitabet', 25, N'Türk Dili ve Edebiyatı', N'Derya Öktem', 849.00, N'Topluluk önünde konuşan profesyoneller ve öğrenciler için tasarlanan bu orta düzey uygulamalı atölyede sesin doğru kullanımı ve hitabet sanatı işlenir. Katılımcılar doğru diyafram nefesi almayı, Türkçenin ses ve vurgu kurallarını uygulamayı, heyecanlarını yöneterek ikna edici sunumlar yapmayı öğrenir. İletişim becerilerini güçlendirmek ve sahnede güvenle var olmak isteyen herkese yöneliktir.', NULL, NULL, 0, 30, '2026-03-08T17:49:37.5240774', 0, N'Intermediate', N'Akademik Yazım & Hitabet', N'tr', N'en', N'İletişim'),
(64, N'Psikolojiye Giriş', 60, N'Psikoloji & Bilişsel Bilimler', N'Aylin Kara', 799.00, N'Psikoloji bilimine ilgi duyanlar için hazırlanan bu başlangıç düzeyindeki kursta insan davranışı ve zihinsel süreçlerin temel kuramları incelenir. Katılımcılar biyolojik temellerden öğrenmeye, bellekten sosyal psikolojiye kadar ana psikoloji ekollerini kavrar ve insan davranışlarını bilimsel bir çerçevede değerlendirebilir. Zihnin işleyişini temel kavramlarla anlamak isteyen tüm meraklılara uygundur.', NULL, NULL, 0, 31, '2026-02-19T17:49:37.5240774', 0, N'Beginner', N'Davranış Bilimleri', N'tr', N'en', N'Psikoloji'),
(65, N'Gelişim Psikolojisi', 50, N'Psikoloji & Bilişsel Bilimler', N'Aylin Kara', 899.00, N'Eğitimciler ve psikoloji öğrencileri için geliştirilen bu orta düzey kursta doğumdan yetişkinliğe kadar bireyin zihinsel, duygusal ve sosyal gelişimi ele alınır. Katılımcılar Piaget, Vygotsky ve Erikson gibi öncü kuramcıların modellerini analiz edebilir ve gelişim evrelerindeki kilit dönüm noktalarını vaka örnekleri üzerinden yorumlayabilir. İnsan gelişiminin evrelerini derinlemesine öğrenmek isteyenlere yöneliktir.', NULL, NULL, 0, 31, '2026-02-02T17:49:37.5240774', 0, N'Intermediate', N'Gelişim & Sosyal Psikoloji', N'tr', N'en', N'Psikoloji'),
(66, N'Bilişsel Bilime Giriş', 50, N'Psikoloji & Bilişsel Bilimler', N'Volkan Şener', 949.00, N'Yapay zeka, bilişim ve psikoloji alanlarında çalışanlar için hazırlanan bu orta düzey kursta zihnin bilgi işleme süreçleri disiplinlerarası bir bakışla ele alınır. Katılımcılar sinirbilim, yapay zeka ve bilişsel psikolojinin kesişiminde zihinsel modeller kurabilir ve algı ile düşünme süreçlerini hesaplamalı yöntemlerle açıklayabilir. Zihnin çalışma mekanizmasını çok yönlü incelemek isteyenlere yöneliktir.', NULL, NULL, 0, 32, '2026-04-26T17:49:37.5240774', 0, N'Intermediate', N'Bilişsel Psikoloji & Nörobilim', N'tr', N'en,de', N'Bilişsel Bilim'),
(67, N'Araştırma Yöntemleri ve Deney Tasarımı', 30, N'Psikoloji & Bilişsel Bilimler', N'Volkan Şener', 1099.00, N'Davranış ve biliş bilimlerinde tez veya makale yazan araştırmacılar için hazırlanan bu ileri düzey kursta deneysel metodoloji ve veri analizi işlenir. Katılımcılar test edilebilir hipotezler kurgulayabilir, karıştırıcı değişkenleri kontrol eden laboratuvar deneyleri tasarlayabilir ve toplanan verileri doğru testlerle analiz edebilir. Bilimsel araştırmalarını bağımsız yürütmek isteyen lisansüstü öğrencilere hitap eder.', NULL, NULL, 0, 32, '2026-04-09T17:49:37.5240774', 0, N'Advanced', N'Deneysel Araştırma Yöntemleri', N'tr', N'en', N'Araştırma Yöntemleri'),
(68, N'YKS Tarih Soru Kampı', 80, N'Sosyal Bilimler', N'Selin Koç', 699.00, N'YKS adayları için hazırlanan bu orta düzey soru çözüm kampında TYT ve AYT Tarih konuları kronolojik testler ve kavram haritalarıyla taranır. Katılımcılar öncüllü ve haritalı tarih sorularını hızla analiz etme, tarihsel neden-sonuç bağlarını kurma ve çeldiricileri eleme becerisi edinir. Sınav öncesinde eksiklerini kapatmak ve soru çözüm pratiğini artırmak isteyen lise son sınıf öğrencileri içindir.', NULL, NULL, 0, 8, '2026-03-23T17:49:37.5240774', 0, N'Intermediate', N'Türk & Dünya Tarihi', N'tr', N'en', N'YKS'),
(69, N'Kent Sosyolojisi ve Saha Araştırması', 30, N'Sosyal Bilimler', N'Onur Balcı', 949.00, N'Sosyoloji ve şehir bölge planlama öğrencileri için hazırlanan bu ileri düzey uygulamalı kursta kentsel dönüşüm, göç ve mekânsal ayrışma kuramları ele alınır. Katılımcılar kentsel mekânda nitel araştırma teknikleri uygulayabilir, derinlemesine mülakat ve katılımcı gözlem verilerini kuramsal olarak yorumlayabilir. Kentsel dinamikleri doğrudan sahada araştırmayı hedefleyen araştırmacılara yöneliktir.', NULL, NULL, 0, 26, '2026-03-06T17:49:37.5240774', 0, N'Advanced', N'Sosyoloji & Toplum Bilimleri', N'tr', N'en', N'Sosyoloji'),
(70, N'Figma ile Prototipleme Atölyesi', 25, N'Tasarım', N'Deniz Aksoy', 1199.00, N'Dijital ürün tasarımcıları ve arayüz geliştiricileri için hazırlanan bu ileri düzey uygulamalı atölyede Figma üzerinde karmaşık etkileşimli prototipler üretilir. Katılımcılar değişkenler, akıllı animasyonlar ve bileşen setleri kullanarak gerçek uygulama deneyimi sunan prototipler inşa edebilir ve kullanıcı testlerine hazır hale getirebilir. Portfolyosuna güçlü projeler eklemek isteyen tasarımcılara yöneliktir.', NULL, NULL, 0, 11, '2026-02-17T17:49:37.5240774', 0, N'Advanced', N'UI/UX & Ürün Tasarımı', N'tr', N'en,de', N'Figma'),
(71, N'Marka Kimliği ve Logo Tasarımı', 30, N'Tasarım', N'Deniz Aksoy', 1099.00, N'Grafik tasarımcılar ve ajans çalışanları için kurgulanan bu orta düzey kursta bir markanın sıfırdan görsel kimliğinin tasarlanması adımları işlenir. Katılımcılar brief analizinden logo eskizine, renk paleti ve tipografi seçiminden marka rehberi hazırlamaya kadar tüm tasarım sürecini yürütebilir ve müşteriye sunabilir. Markalama alanında profesyonel standartlarda iş üretmek isteyen tasarımcılar içindir.', NULL, NULL, 0, 11, '2026-01-31T17:49:37.5240774', 0, N'Intermediate', N'Marka Kimliği & İllüstrasyon', N'tr', N'en', N'Marka Tasarımı'),
(72, N'Rönesans''tan Modernizme Sanat Tarihi', 50, N'Sanat', N'Leyla Erdem', 899.00, N'Sanat ve mimarlık öğrencileri ile kültür meraklıları için hazırlanan bu ileri düzey kursta Batı sanatının 14. yüzyıldan 20. yüzyıla kadar olan evrimi incelenir. Katılımcılar Rönesans, Barok, Romantizm ve Modernizm akımlarının felsefi arka planını kavrar, dönem eserlerini ikonografik ve biçimsel yöntemlerle çözümleyebilir. Görsel sanatların tarihsel gelişimini akademik derinlikle anlamak isteyenlere yöneliktir.', NULL, NULL, 0, 12, '2026-04-24T17:49:37.5240774', 0, N'Advanced', N'Sanat Tarihi & Eser Analizi', N'tr', N'en', N'Sanat Tarihi'),
(73, N'Armoni ve Beste Atölyesi', 20, N'Müzik', N'Ozan Güneş', 999.00, N'Müzisyenler ve prodüktörler için hazırlanan bu ileri düzey kursta tonal ve modal armoni kuralları uygulamalı olarak incelenir. Katılımcılar akor yürüyüşleri kurabilir, polifonik ses iletimi kurallarını uygulayabilir ve kendi melodilerini zengin armonik katmanlarla besteleyebilir. Temel müzik teorisine hâkim olup kendi özgün eserlerini profesyonel standartlarda düzenlemek isteyen müzisyenler içindir.', NULL, NULL, 0, 13, '2026-04-07T17:49:37.5240774', 0, N'Advanced', N'Müzik Teorisi, Armoni & Solfej', N'tr', N'en', N'Müzik Teorisi'),
(74, N'Sporcu Beslenmesi ve Performans', 60, N'Spor', N'Kerem Tan', 649.00, N'Aktif sporcular ve antrenörler için tasarlanan bu orta düzey kursta antrenman verimini ve toparlanmayı optimize eden beslenme stratejileri incelenir. Katılımcılar makro ve mikro besin ihtiyaçlarını branşlarına göre hesaplayabilir, yarışma öncesi ile sonrası beslenme protokolleri oluşturabilir ve ergojenik destekleri bilimsel temelde değerlendirebilir. Fiziksel performansını beslenmeyle artırmak isteyenlere yöneliktir.', NULL, NULL, 0, 14, '2026-03-21T17:49:37.5240774', 0, N'Intermediate', N'Beslenme & Sporcu Sağlığı', N'tr', N'en,de', N'Beslenme'),
(75, N'YKS ve LGS Sınav Stratejileri', 100, N'Genel', N'Gizem Uçar', 499.00, N'Merkezi sınavlara hazırlanan öğrenciler ve veliler için tasarlanan bu rehberlik odaklı başlangıç ve orta düzey kursta çalışma metodolojisi işlenir. Katılımcılar kişisel çalışma programı hazırlayabilir, deneme sınavı analizleriyle eksik noktalarını belirleyebilir ve sınav anı kaygısını yönetme tekniklerini uygulayabilir. YKS veya LGS maratonunu plansızlıktan kurtarıp verimli yürütmek isteyen tüm adaylara uygundur.', NULL, NULL, 0, 15, '2026-03-04T17:49:37.5240774', 0, N'Beginner', N'Zaman Yönetimi & Verimlilik', N'tr', N'en', N'YKS'),
(76, N'Hızlı Okuma ve Not Alma Teknikleri', 100, N'Genel', N'Gizem Uçar', 449.00, N'Öğrenciler ve yoğun okuma yapan çalışanlar için tasarlanan bu başlangıç düzeyindeki eğitimde okuma hızını ve anlama oranını artıran teknikler işlenir. Katılımcılar göz kaslarını geliştirerek iç seslendirmeyi azaltabilir, Cornell gibi yapılandırılmış not alma sistemlerini uygulayabilir ve bilgiyi kalıcı biçimde özetleyebilir. Okuma verimini katlayıp zamandan tasarruf etmek isteyen herkese uygundur.', NULL, NULL, 0, 15, '2026-02-15T17:49:37.5240774', 0, N'Beginner', N'Öğrenmeyi Öğrenme & Hafıza Teknikleri', N'tr', N'en', N'Verimli Çalışma'),
(77, N'Dünya Edebiyatından Klasikler', 50, N'Edebiyat & Felsefe', N'Orhan Yeşil', 799.00, N'Edebiyatseverler ve üniversite öğrencileri için hazırlanan bu orta düzey kursta Doğu ve Batı klasiklerinin temel yapıtları felsefi ve edebi açıdan tahlil edilir. Katılımcılar Dostoyevski, Goethe ve Kafka gibi yazarların metinlerindeki ana izlekleri çözümler, insanlık durumunu yansıtan anlatı tekniklerini karşılaştırmalı olarak değerlendirebilir. Klasik metinlerin derin katmanlarını keşfetmek isteyen okurlara yöneliktir.', NULL, NULL, 0, 22, '2026-01-29T17:49:37.5240774', 0, N'Intermediate', N'Dünya Edebiyatı & Karşılaştırmalı Metinler', N'tr', N'en', N'Dünya Edebiyatı'),
(78, N'Mobil Fotoğrafçılık ve Video Kurgu', 40, N'Fotoğrafçılık & Sinema', N'Cem Oral', 699.00, N'Sosyal medya içerik üreticileri ve görsel sanatlara merak duyanlar için hazırlanan bu başlangıç düzeyindeki uygulamalı eğitimde akıllı telefonla çekim ve kurgu işlenir. Katılımcılar doğal ışığı kullanmayı, kompozisyon kurallarını uygulamayı ve mobil kurgu uygulamalarıyla profesyonel videolar kurgulamayı öğrenir. Akıllı telefonunu yaratıcı bir prodüksiyon aracına dönüştürmek isteyen herkes içindir.', NULL, NULL, 0, 24, '2026-04-22T17:49:37.5240774', 0, N'Beginner', N'Video Kurgu & Renk Düzenleme', N'tr', N'en,de', N'Fotoğraf'),
(79, N'Genetik ve Moleküler Biyoloji', 40, N'Fen Bilimleri', N'Elif Şahin', 1099.00, N'Biyoloji, tıp ve biyomühendislik öğrencileri için kurgulanan bu ileri düzey kursta hücrenin moleküler mekanizmaları ve genetik regülasyon ayrıntılı olarak ele alınır. Katılımcılar DNA replikasyonu, gen ifadesi, epigenetik modifikasyonlar ve CRISPR gibi modern gen düzenleme tekniklerini kuramsal ve deneysel yönleriyle tahlil edebilir. Moleküler yaşam bilimlerinde sağlam bir altyapı kazanmak isteyen araştırmacılara yöneliktir.', NULL, NULL, 0, 4, '2026-04-05T17:49:37.5240774', 0, N'Advanced', N'Moleküler Biyoloji & Genetik', N'tr', N'en', N'Genetik'),
(80, N'LGS Fen Bilimleri Kampı', 100, N'Fen Bilimleri', N'Can Yıldız', 649.00, N'LGS sınavına hazırlanan 8. sınıf öğrencileri için tasarlanan bu orta düzey soru kampında MEB müfredatındaki tüm fen üniteleri yeni nesil sorularla taranır. Katılımcılar grafik ve tablo yorumlama, deney düzenekli soruları çözme ve zamanı kontrollü kullanma becerisi edinir. Fen bilimleri netlerini yükseltmek ve sınavda tam puan hedefleyen ortaokul son sınıf öğrencilerine yöneliktir.', NULL, NULL, 0, 5, '2026-03-19T17:49:37.5240774', 0, N'Intermediate', N'YKS Fen Bilimleri', N'tr', N'en', N'LGS'),
(81, N'Jeopolitik ve Beşeri Coğrafya', 50, N'Coğrafya', N'Burak Kaya', 899.00, N'Uluslararası ilişkiler, coğrafya ve kamu yönetimi öğrencileri için hazırlanan bu orta düzey kursta küresel güç dengeleri ile beşeri dinamiklerin etkileşimi incelenir. Katılımcılar nüfus hareketleri, enerji koridorları, sınır ihtilafları ve iklim göçlerini haritalar üzerinden mekânsal olarak analiz edebilir. Dünya siyasetini coğrafi gerçekler üzerinden okumak isteyen tüm araştırmacılara uygundur.', NULL, NULL, 0, 7, '2026-03-02T17:49:37.5240774', 0, N'Intermediate', N'Beşeri & Ekonomik Coğrafya', N'tr', N'en', N'Jeopolitik'),
(82, N'Anayasa Hukukuna Giriş', 60, N'Hukuk & Kamu Yönetimi', N'Serkan Yavuz', 699.00, N'Devletin temel yapısını, temel hak ve özgürlükleri ve anayasal denetimi sıfırdan öğrenin. Anayasa kavramından yasama, yürütme ve yargı organlarına, Anayasa Mahkemesine bireysel başvurudan seçim sistemlerine kadar konuları güncel kararlarla işliyoruz. Hukuk fakültesine hazırlananlar, kamu personeli adayları ve vatandaşlık bilgisini derinleştirmek isteyen herkes için.', NULL, NULL, 0, 33, '2026-02-13T17:49:37.5240774', 0, N'Beginner', N'Anayasa & İdare Hukuku', N'tr', N'en,de', N'Anayasa Hukuku'),
(83, N'İdare Hukuku ve Kamu Yönetimi', 50, N'Hukuk & Kamu Yönetimi', N'Serkan Yavuz', 849.00, N'İdarenin nasıl örgütlendiğini, işlemlerini hangi kurallara göre yaptığını ve bu işlemlere karşı hangi yollara başvurulabileceğini öğrenin. Merkezi ve yerinden yönetim, idari işlem ve sözleşmeler, kamu görevlileri ve idari yargı sistemi örnek kararlar üzerinden anlatılır. KPSS alan bilgisi ve kamu yönetimi sınavlarına hazırlananlar için uygundur.', NULL, NULL, 0, 33, '2026-01-27T17:49:37.5240774', 0, N'Intermediate', N'Anayasa & İdare Hukuku', N'tr', N'en', N'KPSS'),
(84, N'Borçlar ve Ticaret Hukukunun Temelleri', 50, N'Hukuk & Kamu Yönetimi', N'Serkan Yavuz', 899.00, N'Sözleşme kurmaktan şirket yönetmeye kadar günlük ve ticari hayatın hukuki temelini öğrenin. Borç ilişkisinin kaynakları, sözleşmelerin kurulması ve ifası, haksız fiil sorumluluğu, tacir kavramı, şirket türleri ve kıymetli evrak somut vakalarla işlenir. Girişimciler, işletme ve iktisat öğrencileri ile hukuka yeni başlayanlar için.', NULL, NULL, 0, 33, '2026-04-20T17:49:37.5240774', 0, N'Intermediate', N'Borçlar & Ticaret Hukuku', N'tr', N'en', N'Ticaret Hukuku'),
(85, N'KVKK ve Bilişim Hukuku', 40, N'Hukuk & Kamu Yönetimi', N'Serkan Yavuz', 949.00, N'Dijital dünyada veriyi hukuka uygun işlemeyi öğrenin. 6698 sayılı Kişisel Verilerin Korunması Kanunu, aydınlatma ve açık rıza, veri ihlali bildirimi, GDPR ile karşılaştırma, bilişim suçları ve e-ticaret mevzuatı uygulamalı örneklerle anlatılır. Yazılımcılar, ürün yöneticileri, uyum ve hukuk ekipleri için uygundur.', NULL, NULL, 0, 33, '2026-04-03T17:49:37.5240774', 0, N'Intermediate', N'Bilişim & Kişisel Veriler Hukuku', N'tr', N'en', N'KVKK'),
(86, N'Arduino ile Gömülü Sistemlere Giriş', 30, N'Mühendislik & Robotik', N'Melis Korkut', 899.00, N'Mikrodenetleyici programlamayı Arduino ile sıfırdan öğrenin. Dijital ve analog giriş-çıkışlar, sensör okuma, motor sürme, kesmeler ve seri haberleşme konularını her derste çalışan bir devre kurarak işliyoruz. Elektronik ve kodlamaya yeni başlayan öğrenciler ile kendi akıllı cihazını yapmak isteyen herkes için.', NULL, NULL, 0, 34, '2026-03-17T17:49:37.5240774', 0, N'Beginner', N'Gömülü Sistemler & Elektronik', N'tr', N'en,de', N'Arduino'),
(87, N'Temel Elektronik ve Devre Analizi', 40, N'Mühendislik & Robotik', N'Melis Korkut', 799.00, N'Elektroniğin temel yasalarını ve devre çözme yöntemlerini öğrenin. Ohm ve Kirchhoff yasaları, düğüm ve çevre analizi, kondansatör ve bobin, diyot ve transistör devreleri breadboard üzerinde kurulup ölçülerek anlatılır. Mühendislik öğrencileri ve gömülü sistemlere sağlam bir temelle başlamak isteyenler için.', NULL, NULL, 0, 34, '2026-02-28T17:49:37.5240774', 0, N'Beginner', N'Gömülü Sistemler & Elektronik', N'tr', N'en', N'Elektronik'),
(88, N'ROS ile Robotik ve Kontrol Sistemleri', 25, N'Mühendislik & Robotik', N'Melis Korkut', 1499.00, N'Otonom bir mobil robotun nasıl algıladığını, karar verdiğini ve hareket ettiğini öğrenin. Robot kinematiği, PID kontrol, ROS 2 düğümleri ve konuları, sensör füzyonu ve SLAM ile haritalama simülasyon ortamında adım adım kurulur. Python veya C++ bilen, kontrol ve robotik alanında uzmanlaşmak isteyen mühendislik öğrencileri için.', NULL, NULL, 0, 34, '2026-02-11T17:49:37.5240774', 0, N'Advanced', N'Robotik & Kontrol Sistemleri', N'tr', N'en', N'ROS'),
(89, N'SolidWorks ile CAD ve Mekanik Tasarım', 30, N'Mühendislik & Robotik', N'Melis Korkut', 1199.00, N'Bir parçayı çizimden üretime hazır hale getirmeyi öğrenin. Eskiz ve kısıtlar, katı modelleme, montaj, teknik resim, toleranslar ve basit mukavemet analizi gerçek bir robot kolu tasarımı üzerinden işlenir. Makine ve mekatronik öğrencileri, ürün geliştiriciler ve 3B yazıcıyla prototip üretmek isteyenler için uygundur.', NULL, NULL, 0, 34, '2026-01-25T17:49:37.5240774', 0, N'Intermediate', N'CAD & Mekanik Tasarım', N'tr', N'en', N'SolidWorks'),
(90, N'Siber Güvenlik ve Ağ Temelleri', 40, N'Yazılım', N'Kaan Ersoy', 1199.00, N'Ağların nasıl çalıştığını ve nasıl saldırıya uğradığını öğrenerek savunmayı kurun. TCP/IP, DNS ve HTTP, güvenlik duvarları, şifreleme, OWASP Top 10 açıkları ve temel sızma testi araçları laboratuvar ortamında uygulamalı olarak işlenir. Siber güvenliğe kariyer değiştirmek isteyenler ve güvenli kod yazmak isteyen geliştiriciler için.', NULL, NULL, 0, 35, '2026-04-18T17:49:37.5240774', 0, N'Beginner', N'Siber Güvenlik & Ağ', N'tr', N'en,de', N'Siber Güvenlik'),
(91, N'Flutter ile Mobil Uygulama Geliştirme', 40, N'Yazılım', N'Kaan Ersoy', 1299.00, N'Tek kod tabanıyla Android ve iOS uygulaması geliştirmeyi öğrenin. Dart dili, widget ağacı, durum yönetimi, REST API''den veri çekme, yerel depolama ve mağazaya yayın süreci, baştan sona geliştirilen bir alışveriş uygulamasıyla anlatılır. Temel programlama bilen ve ilk mobil uygulamasını yayınlamak isteyenler için.', NULL, NULL, 0, 35, '2026-04-01T17:49:37.5240774', 0, N'Intermediate', N'Mobil Uygulama Geliştirme', N'tr', N'en', N'Flutter'),
(92, N'Docker, Kubernetes ve DevOps', 35, N'Yazılım', N'Kaan Ersoy', 1499.00, N'Uygulamaları konteynerlere taşıyıp buluta otomatik olarak dağıtmayı öğrenin. Docker imajları, Compose, Kubernetes nesneleri, CI/CD hatları, altyapıyı kodla yönetme ve izleme konuları gerçek bir web servisinin yayına alınmasıyla işlenir. Backend geliştiriciler ve DevOps mühendisliğine geçmek isteyenler için.', NULL, NULL, 0, 35, '2026-03-15T17:49:37.5240774', 0, N'Advanced', N'Bulut Mimarisi & DevOps', N'tr', N'en', N'Docker'),
(93, N'Unity ile Oyun Geliştirme', 40, N'Yazılım', N'Kaan Ersoy', 1099.00, N'Unity ve C# ile ilk oyununuzu tasarlayıp yayınlayın. Sahne düzeni, fizik motoru, karakter kontrolü, animasyon, kullanıcı arayüzü ve ses konuları baştan sona geliştirilen iki boyutlu bir platform oyunu üzerinden anlatılır. Oyun geliştirmeye meraklı, temel programlama bilgisi olan herkes için.', NULL, NULL, 0, 35, '2026-02-26T17:49:37.5240774', 0, N'Beginner', N'Oyun Geliştirme', N'tr', N'en', N'Unity'),
(94, N'Büyük Veri ve Veri Mühendisliği', 35, N'Veri Bilimi & Yapay Zeka', N'Barış Özkan', 1599.00, N'Milyonlarca satırlık veriyi toplayan, dönüştüren ve analize hazırlayan veri hatlarını kurmayı öğrenin. Veri ambarı modelleme, Apache Spark ile dağıtık işleme, Kafka ile akan veri, Airflow ile iş akışı yönetimi ve veri kalitesi kontrolleri uygulamalı olarak işlenir. SQL ve Python bilen, veri mühendisi olmak isteyenler için.', NULL, NULL, 0, 18, '2026-02-09T17:49:37.5240774', 0, N'Advanced', N'Büyük Veri & Veri Mühendisliği', N'tr', N'en,de', N'Veri Mühendisliği'),
(95, N'Siyaset Bilimi ve Uluslararası İlişkilere Giriş', 60, N'Sosyal Bilimler', N'Onur Balcı', 749.00, N'Devlet, iktidar, demokrasi ve uluslararası sistemin nasıl işlediğini temel kavramlardan başlayarak öğrenin. Siyasi ideolojiler, seçim ve parti sistemleri, realizm ve liberalizm gibi uluslararası ilişkiler kuramları ile Birleşmiş Milletler ve AB gibi kurumlar güncel örneklerle işlenir. Siyaset bilimi ve uluslararası ilişkiler bölümüne hazırlananlar ile güncel olayları derinlemesine okumak isteyenler için.', NULL, NULL, 0, 26, '2026-01-23T17:49:37.5240774', 0, N'Beginner', N'Siyaset Bilimi & Uluslararası İlişkiler', N'tr', N'en', N'Uluslararası İlişkiler'),
(96, N'Hukukun Temel Kavramları ve Anayasa Bilgisi', 70, N'Sosyal Bilimler', N'Selin Koç', 649.00, N'Günlük hayatta karşılaştığınız hukuk kurallarını ve vatandaş olarak haklarınızı sade bir dille öğrenin. Hukukun kaynakları, hak ve ehliyet kavramları, yargı örgütü ile Türk anayasa tarihinin dönüm noktaları örnek olaylarla anlatılır. Lise ve üniversite öğrencileri, KPSS''ye hazırlananlar ve hukuka ilk adımını atmak isteyen herkes için uygundur.', NULL, NULL, 0, 8, '2026-04-16T17:49:37.5240774', 0, N'Beginner', N'Temel Hukuk & Anayasa', N'tr', N'en', N'KPSS'),
(97, N'Etik ve Estetiğe Giriş', 60, N'Edebiyat & Felsefe', N'Ece Bulut', 649.00, N'İyi bir eylemi ve güzel bir eseri ne belirler? Erdem etiği, ödev etiği ve faydacılık gibi ahlak kuramlarını güncel ikilemlerle tartışırken, Platon''dan Kant''a ve çağdaş düşünürlere uzanan estetik yaklaşımlarla sanat eserlerini değerlendirmeyi öğreneceksiniz. Felsefeye ilgi duyan, tartışma ve yazma becerisini geliştirmek isteyen herkes için.', NULL, NULL, 0, 23, '2026-03-30T17:49:37.5240774', 0, N'Intermediate', N'Etik & Estetik', N'tr', N'en', N'Felsefe'),
(98, N'Girişimcilik ve İş Stratejisi', 50, N'Ekonomi & Finans', N'Tolga Sezer', 999.00, N'Bir iş fikrini doğrulanmış bir iş modeline dönüştürmeyi öğrenin. Müşteri keşfi, iş modeli kanvası, rekabet analizi, birim ekonomisi, fiyatlandırma ve yatırımcı sunumu adım adım kendi fikriniz üzerinde uygulanır. Kendi işini kurmak isteyenler, girişim ekiplerinde çalışanlar ve kurumsal strateji ile ilgilenen öğrenciler için.', NULL, NULL, 0, 20, '2026-03-13T17:49:37.5240774', 0, N'Intermediate', N'Girişimcilik & Strateji', N'tr', N'en,de', N'Girişimcilik'),
(99, N'IELTS ve Akademik İngilizce', 25, N'Yabancı Dil', N'Merve Çelik', 1199.00, N'Yurt dışında eğitim ve iş başvuruları için IELTS Academic sınavına sistemli hazırlanın. Dört becerinin sınav formatı, puanlama ölçütleri, Writing Task 1 ve 2 kalıpları, akademik okuma stratejileri ve konuşma bölümü için deneme çalışmaları birebir geri bildirimle yapılır. B2 düzeyinde İngilizcesi olan ve hedef puanına ulaşmak isteyenler için.', NULL, NULL, 0, 9, '2026-02-24T17:49:37.5240774', 0, N'Advanced', N'Akademik & İş İngilizcesi (IELTS/TOEFL)', N'en', N'tr', N'IELTS'),
(100, N'Blender ile 3B Modelleme ve Animasyon', 30, N'Tasarım', N'Deniz Aksoy', 1099.00, N'Ücretsiz ve açık kaynak Blender ile üç boyutlu modelleme, malzeme, ışık ve animasyonu sıfırdan öğrenin. Basit nesnelerden ürün görselleştirmesine, kamera hareketinden kısa bir hareketli grafik sahnesine kadar her derste bitmiş bir çalışma üretirsiniz. Tasarımcılar, oyun ve video içerik üreticileri ile 3B dünyaya adım atmak isteyen herkes için.', NULL, NULL, 0, 11, '2026-02-07T17:49:37.5240774', 0, N'Beginner', N'3B Modelleme & Hareketli Grafik', N'tr', N'en', N'Blender'),
(101, N'Seramik ve Heykel Atölyesi', 15, N'Sanat', N'Leyla Erdem', 899.00, N'Kilin ve üç boyutlu formun diliyle tanışın. Elle şekillendirme yöntemleri, çömlekçi çarkına giriş, oranlı figür heykeli, sır ve pişirim süreçleri küçük gruplarla atölye ortamında uygulanır. Kurs sonunda kendi tasarladığınız bir kullanım objesi ve bir küçük heykelle ayrılırsınız. Daha önce deneyimi olmayan herkes katılabilir.', NULL, NULL, 0, 12, '2026-05-01T17:49:37.5240774', 0, N'Beginner', N'Heykel & Seramik', N'tr', N'en', N'Seramik'),
(102, N'Ableton ile Müzik Prodüksiyonu', 25, N'Müzik', N'Ozan Güneş', 1199.00, N'Bilgisayarınızda fikirden bitmiş bir parçaya ulaşın. Ableton Live ile ritim ve armoni yazmayı, sentezleyici ile ses tasarlamayı, örnekleme, düzenleme, miks ve mastering aşamalarını kendi parçanız üzerinde öğrenirsiniz. Temel müzik bilgisi olan ve kendi prodüksiyonlarını yapmak isteyen müzisyenler ile içerik üreticileri için.', NULL, NULL, 0, 13, '2026-04-14T17:49:37.5240774', 0, N'Intermediate', N'Müzik Prodüksiyonu & Ses Tasarımı', N'tr', N'en,de', N'Ableton Live'),
(103, N'Hareket Bilimi ve Sakatlıktan Korunma', 40, N'Spor', N'Kerem Tan', 699.00, N'Vücudunuzun nasıl hareket ettiğini anlayarak daha güvenli ve verimli antrenman yapın. Temel anatomi ve biyomekanik, hareket analizi, sık görülen spor sakatlıklarının nedenleri, ısınma ve önleyici egzersiz programları uygulamalı olarak işlenir. Düzenli spor yapanlar, antrenör adayları ve sakatlık sonrası güvenle spora dönmek isteyenler için.', NULL, NULL, 0, 14, '2026-03-28T17:49:37.5240774', 0, N'Intermediate', N'Hareket Bilimi & Sakatlık Önleme', N'tr', N'en', N'Mobilite'),
(104, N'Araştırma Yöntemleri ve Bilimsel Etik', 60, N'Genel', N'Gizem Uçar', 749.00, N'Bir araştırma sorusunu kurmaktan bulguları dürüstçe raporlamaya kadar bilimsel çalışmanın adımlarını öğrenin. Literatür taraması, nicel ve nitel yöntemler, örneklem, veri toplama araçları, kaynak gösterme, intihal ve araştırma etiği kurulları örnek projeler üzerinden anlatılır. Ödev, proje, tez veya TÜBİTAK projesi hazırlayan öğrenciler için.', NULL, NULL, 0, 15, '2026-03-11T17:49:37.5240774', 0, N'Intermediate', N'Araştırma Yöntemleri & Bilimsel Etik', N'tr', N'en', N'Araştırma Yöntemleri');
SET IDENTITY_INSERT [Courses] OFF;
-- Lessons (468)
SET IDENTITY_INSERT [Lessons] ON;
INSERT INTO [Lessons] ([Id], [CourseId], [Title], [Description], [VideoUrl], [Order], [CreatedAt], [IsDeleted], [DeletedAt], [DurationSeconds]) VALUES
(1, 1, N'C#''ta modern dil özellikleri', N'Record, pattern matching, nullable referans tipleri ve LINQ ile daha kısa, daha güvenli kod.', NULL, 1, '2026-11-07T17:49:38.3454053', 0, NULL, 300),
(2, 1, N'Async programlama', N'Task, async/await ve iptal belirteçleri; I/O ağırlıklı işlerde iş parçacığı tüketmeden çalışma.', NULL, 2, '2026-11-07T17:49:38.3607394', 0, NULL, 480),
(3, 1, N'ASP.NET Core ile REST API', N'Controller, routing, model doğrulama ve hata yönetimi middleware''i.', NULL, 3, '2026-11-07T17:49:38.3608633', 0, NULL, 660),
(4, 1, N'EF Core ve veri erişimi', N'DbContext, migration''lar, ilişkiler ve sorgu performansı.', NULL, 4, '2026-11-07T17:49:38.3609075', 0, NULL, 360),
(5, 1, N'Kimlik doğrulama ve yayın', N'JWT ile rol tabanlı yetkilendirme, ayar yönetimi ve uygulamayı yayına alma.', NULL, 5, '2026-11-07T17:49:38.3609633', 0, NULL, 540),
(6, 2, N'Java''ya giriş ve geliştirme ortamı', N'JDK kurulumu, ilk program, değişkenler ve kontrol yapıları.', NULL, 1, '2026-11-07T17:49:38.3904691', 0, NULL, 720),
(7, 2, N'Nesne yönelimli programlama', N'Sınıf, nesne, kapsülleme, kalıtım ve çok biçimlilik.', NULL, 2, '2026-11-07T17:49:38.3905605', 0, NULL, 420),
(8, 2, N'Koleksiyonlar ve generics', N'List, Set, Map ve tip güvenli veri yapıları.', NULL, 3, '2026-11-07T17:49:38.3906040', 0, NULL, 600),
(9, 2, N'İstisnalar ve Streams API', N'Hata yönetimi ve fonksiyonel tarzda veri işleme.', NULL, 4, '2026-11-07T17:49:38.3906487', 0, NULL, 300),
(10, 3, N'Karmaşıklık analizi', N'Big-O gösterimi ve bir yapının maliyetini okumak.', NULL, 1, '2026-11-07T17:49:38.4079582', 0, NULL, 1560),
(11, 3, N'Diziler, bağlı listeler, yığın ve kuyruk', N'Doğrusal yapılar ve hangi durumda hangisinin seçileceği.', NULL, 2, '2026-11-07T17:49:38.4080626', 0, NULL, 960),
(12, 3, N'Ağaçlar ve yığın (heap)', N'İkili arama ağacı, dengeli ağaçlar ve öncelik kuyrukları.', NULL, 3, '2026-11-07T17:49:38.4081118', 0, NULL, 1620),
(13, 3, N'Hash tabloları ve graflar', N'Çakışma çözümü, graf gösterimleri ve gezinme.', NULL, 4, '2026-11-07T17:49:38.4081560', 0, NULL, 1020),
(14, 4, N'Sıralama ve arama', N'Merge sort, quick sort ve ikili arama; doğruluk ve maliyet.', NULL, 1, '2026-11-07T17:49:38.4123011', 0, NULL, 1260),
(15, 4, N'Böl ve yönet, açgözlü yaklaşım', N'Problemi parçalamak ve yerel en iyi seçimin ne zaman işe yaradığı.', NULL, 2, '2026-11-07T17:49:38.4124268', 0, NULL, 1920),
(16, 4, N'Dinamik programlama', N'Alt problemler, memoization ve tablo doldurma.', NULL, 3, '2026-11-07T17:49:38.4125162', 0, NULL, 1320),
(17, 4, N'Graf algoritmaları', N'BFS, DFS, Dijkstra ve minimum yayılan ağaç.', NULL, 4, '2026-11-07T17:49:38.4125722', 0, NULL, 1980),
(18, 5, N'Bileşenler ve JSX', N'Props, bileşen bölme ve TypeScript ile tip güvenliği.', NULL, 1, '2026-11-07T17:49:38.4164503', 0, NULL, 960),
(19, 5, N'Hook''lar ve durum', N'useState, useEffect, özel hook''lar ve sık yapılan hatalar.', NULL, 2, '2026-11-07T17:49:38.4165324', 0, NULL, 1620),
(20, 5, N'Veri çekme ve yönlendirme', N'API''den veri alma, yükleme/hata durumları ve dosya tabanlı rotalar.', NULL, 3, '2026-11-07T17:49:38.4165788', 0, NULL, 1020),
(21, 5, N'Formlar ve erişilebilirlik', N'Kontrollü formlar, doğrulama ve klavye ile kullanılabilir arayüz.', NULL, 4, '2026-11-07T17:49:38.4166388', 0, NULL, 1680),
(22, 5, N'Bitirme projesi', N'Kurs kataloğu uygulamasını uçtan uca kurmak ve yayınlamak.', NULL, 5, '2026-11-07T17:49:38.4166917', 0, NULL, 1080),
(23, 6, N'Sayılar ve cebirsel ifadeler', N'Bölünebilme, üslü-köklü ifadeler ve çarpanlara ayırma.', NULL, 1, '2026-11-07T17:49:38.4207344', 0, NULL, 4140),
(24, 6, N'Denklemler ve eşitsizlikler', N'Birinci ve ikinci dereceden denklemler, mutlak değer.', NULL, 2, '2026-11-07T17:49:38.4208154', 0, NULL, 3300),
(25, 6, N'Fonksiyonlar', N'Tanım, grafik okuma, bileşke ve ters fonksiyon.', NULL, 3, '2026-11-07T17:49:38.4208635', 0, NULL, 4320),
(26, 6, N'Üstel ve logaritmik fonksiyonlar', N'Kurallar, grafikler ve gerçek hayat problemleri.', N'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', 4, '2026-11-07T17:49:38.4209070', 0, NULL, 3480),
(27, 7, N'Açılar ve üçgenler', N'Temel teoremler, benzerlik ve eşlik.', NULL, 1, '2026-11-07T17:49:38.4249093', 0, NULL, 2940),
(28, 7, N'Dörtgenler ve çokgenler', N'Alan ve çevre hesapları, özel dörtgenler.', NULL, 2, '2026-11-07T17:49:38.4249888', 0, NULL, 3960),
(29, 7, N'Çember ve daire', N'Teğet, kiriş, açı ve alan ilişkileri.', NULL, 3, '2026-11-07T17:49:38.4250346', 0, NULL, 3120),
(30, 7, N'Analitik geometri', N'Koordinat düzleminde doğru ve çember denklemleri.', NULL, 4, '2026-11-07T17:49:38.4250906', 0, NULL, 4140),
(31, 8, N'Önermeler mantığı ve ispat', N'Doğruluk tabloları, tümevarım ve çelişkiyle ispat.', NULL, 1, '2026-11-07T17:49:38.4291722', 0, NULL, 6540),
(32, 8, N'Kümeler, bağıntılar ve fonksiyonlar', N'Denklik bağıntıları ve sayılabilirlik.', NULL, 2, '2026-11-07T17:49:38.4292548', 0, NULL, 5100),
(33, 8, N'Kombinatorik', N'Permütasyon, kombinasyon, güvercin yuvası ilkesi.', NULL, 3, '2026-11-07T17:49:38.4293069', 0, NULL, 5520),
(34, 8, N'Graf teorisi', N'Euler ve Hamilton yolları, ağaçlar ve boyama.', NULL, 4, '2026-11-07T17:49:38.4293511', 0, NULL, 5940),
(35, 9, N'Hareket ve kuvvet', N'Newton yasaları, sürtünme ve serbest cisim diyagramları.', NULL, 1, '2026-11-07T17:49:38.4335251', 0, NULL, 300),
(36, 9, N'İş, enerji ve momentum', N'Korunum yasaları ve çarpışmalar.', NULL, 2, '2026-11-07T17:49:38.4336029', 0, NULL, 480),
(37, 9, N'Elektrik ve manyetizma', N'Devreler, Ohm yasası ve manyetik alan.', NULL, 3, '2026-11-07T17:49:38.4336471', 0, NULL, 660),
(38, 9, N'Dalgalar ve optik', N'Ses ve ışık dalgaları, kırılma ve mercekler.', NULL, 4, '2026-11-07T17:49:38.4336877', 0, NULL, 360),
(39, 10, N'Atom ve periyodik sistem', N'Elektron dizilimi ve periyodik özellikler.', NULL, 1, '2026-11-07T17:49:38.4381510', 0, NULL, 720),
(40, 10, N'Kimyasal bağlar ve tepkimeler', N'İyonik ve kovalent bağ, denkleştirme ve mol kavramı.', NULL, 2, '2026-11-07T17:49:38.4382296', 0, NULL, 420),
(41, 10, N'Asitler, bazlar ve tuzlar', N'pH, nötrleşme ve tampon çözeltiler.', NULL, 3, '2026-11-07T17:49:38.4382740', 0, NULL, 600),
(42, 10, N'Organik kimyaya giriş', N'Hidrokarbonlar ve fonksiyonel gruplar.', NULL, 4, '2026-11-07T17:49:38.4383158', 0, NULL, 300),
(43, 11, N'Hücre ve organeller', N'Hücre zarı, madde geçişi ve hücre bölünmesi.', NULL, 1, '2026-11-07T17:49:38.4426163', 0, NULL, 1680),
(44, 11, N'Kalıtım ve genetik', N'Mendel genetiği, DNA, gen ifadesi ve mutasyonlar.', NULL, 2, '2026-11-07T17:49:38.4426998', 0, NULL, 1080),
(45, 11, N'İnsan fizyolojisi', N'Sinir, dolaşım ve sindirim sistemleri.', NULL, 3, '2026-11-07T17:49:38.4427463', 0, NULL, 1740),
(46, 11, N'Ekoloji', N'Ekosistem, besin zinciri ve biyolojik çeşitlilik.', NULL, 4, '2026-11-07T17:49:38.4427873', 0, NULL, 1140),
(47, 12, N'Gök küresi ve takımyıldızlar', N'Yön bulma, gökyüzü haritaları ve mevsimsel değişim.', NULL, 1, '2026-11-07T17:49:38.4473373', 0, NULL, 1380),
(48, 12, N'Güneş Sistemi', N'Gezegenler, uydular ve küçük cisimler.', NULL, 2, '2026-11-07T17:49:38.4474154', 0, NULL, 2040),
(49, 12, N'Yıldızların yaşamı', N'Doğum, ana kol, kırmızı dev, beyaz cüce ve kara delik.', NULL, 3, '2026-11-07T17:49:38.4474597', 0, NULL, 1440),
(50, 12, N'Gözlem pratiği', N'Dürbün ve teleskopla gözlem, ışık kirliliği.', NULL, 4, '2026-11-07T17:49:38.4475114', 0, NULL, 2100),
(51, 13, N'Dünya''nın şekli ve hareketleri', N'Eksen eğikliği, mevsimler ve saat dilimleri.', NULL, 1, '2026-11-07T17:49:38.4521194', 0, NULL, 1080),
(52, 13, N'İklim bilgisi', N'Sıcaklık, basınç, rüzgâr ve yağış; iklim tipleri.', NULL, 2, '2026-11-07T17:49:38.4522150', 0, NULL, 1740),
(53, 13, N'Su döngüsü ve hidrografya', N'Akarsular, göller ve yeraltı suları.', NULL, 3, '2026-11-07T17:49:38.4522560', 0, NULL, 1140),
(54, 13, N'Toprak ve bitki örtüsü', N'Toprak oluşumu ve biyomlar.', NULL, 4, '2026-11-07T17:49:38.4522940', 0, NULL, 1800),
(55, 14, N'İç kuvvetler', N'Levha tektoniği, kıvrılma, kırılma, deprem ve volkanizma.', NULL, 1, '2026-11-07T17:49:38.4567512', 0, NULL, 3840),
(56, 14, N'Akarsu ve rüzgâr aşındırması', N'Vadi tipleri, delta ve kumul oluşumu.', NULL, 2, '2026-11-07T17:49:38.4568300', 0, NULL, 3000),
(57, 14, N'Karstik ve buzul şekilleri', N'Mağara, polye, sirk ve moren.', NULL, 3, '2026-11-07T17:49:38.4568744', 0, NULL, 4020),
(58, 14, N'Kıyı şekilleri', N'Falez, tombolo, lagün ve kıyı tipleri.', NULL, 4, '2026-11-07T17:49:38.4569158', 0, NULL, 3180),
(59, 14, N'Arazi çalışması', N'Topoğrafik profil çizimi ve yer şekli yorumlama.', NULL, 5, '2026-11-07T17:49:38.4569566', 0, NULL, 4200),
(60, 15, N'Konum ve yer şekilleri', N'Matematik ve özel konum, dağlar, ovalar ve platolar.', NULL, 1, '2026-11-07T17:49:38.4615752', 0, NULL, 4500),
(61, 15, N'İklim ve bitki örtüsü', N'İklim tipleri ve bölgesel farklar.', NULL, 2, '2026-11-07T17:49:38.4616533', 0, NULL, 3660),
(62, 15, N'Nüfus ve yerleşme', N'Nüfus dağılışı, göç ve kentleşme.', NULL, 3, '2026-11-07T17:49:38.4616974', 0, NULL, 2820),
(63, 15, N'Ekonomik faaliyetler', N'Tarım, sanayi, enerji ve turizm.', NULL, 4, '2026-11-07T17:49:38.4617378', 0, NULL, 3840),
(64, 16, N'Ölçek ve projeksiyonlar', N'Haritada uzaklık ve alan hesapları, projeksiyon türleri.', NULL, 1, '2026-11-07T17:49:38.4662527', 0, NULL, 5340),
(65, 16, N'Koordinat sistemleri', N'Enlem-boylam, UTM ve GPS ile konum belirleme.', NULL, 2, '2026-11-07T17:49:38.4663304', 0, NULL, 5760),
(66, 16, N'İzohips haritaları', N'Eş yükselti eğrileri, eğim ve profil çıkarma.', NULL, 3, '2026-11-07T17:49:38.4663745', 0, NULL, 6180),
(67, 16, N'CBS''ye giriş: QGIS', N'Vektör ve raster veri, katmanlar ve öznitelik tabloları.', NULL, 4, '2026-11-07T17:49:38.4664162', 0, NULL, 6600),
(68, 16, N'Mekânsal analiz', N'Tampon, çakıştırma ve tematik harita üretimi.', NULL, 5, '2026-11-07T17:49:38.4664576', 0, NULL, 5160),
(69, 17, N'Coğrafyanın konusu ve haritalar', N'Coğrafi bakış açısı ve harita okuma temelleri.', NULL, 1, '2026-11-07T17:49:38.4714044', 0, NULL, 300),
(70, 17, N'Doğal sistemler', N'Yer şekilleri, iklim ve su kaynakları.', NULL, 2, '2026-11-07T17:49:38.4714855', 0, NULL, 480),
(71, 17, N'Beşerî sistemler', N'Nüfus, yerleşme ve göç.', NULL, 3, '2026-11-07T17:49:38.4715296', 0, NULL, 660),
(72, 17, N'Küresel ortam', N'Bölgeler, ülkeler ve çevre sorunları.', NULL, 4, '2026-11-07T17:49:38.4715688', 0, NULL, 360),
(73, 18, N'Tarih bilimi ve ilk uygarlıklar', N'Kaynak türleri, Mezopotamya, Mısır ve Anadolu uygarlıkları.', NULL, 1, '2026-11-07T17:49:38.4762212', 0, NULL, 720),
(74, 18, N'İlk Türk devletleri ve İslam tarihi', N'Orta Asya''dan Anadolu''ya göçler.', N'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4', 2, '2026-11-07T17:49:38.4762984', 0, NULL, 420),
(75, 18, N'Osmanlı Devleti', N'Kuruluştan dağılmaya siyasi ve toplumsal yapı.', NULL, 3, '2026-11-07T17:49:38.4763426', 0, NULL, 600),
(76, 18, N'Yakın çağ', N'Sanayi Devrimi, ulus devletler ve dünya savaşları.', NULL, 4, '2026-11-07T17:49:38.4763846', 0, NULL, 300),
(77, 19, N'Millî Mücadele', N'Kongreler, TBMM''nin açılışı ve cepheler.', NULL, 1, '2026-11-07T17:49:38.4810715', 0, NULL, 1800),
(78, 19, N'Cumhuriyetin ilanı ve inkılaplar', N'Siyasi, hukuki ve toplumsal yenilikler.', NULL, 2, '2026-11-07T17:49:38.4811471', 0, NULL, 1200),
(79, 19, N'Atatürk dönemi dış politika', N'Lozan ve sonrası diplomasi.', NULL, 3, '2026-11-07T17:49:38.4812250', 0, NULL, 1860),
(80, 19, N'Çok partili hayata geçiş', N'1945 sonrası siyasi ve toplumsal gelişmeler.', NULL, 4, '2026-11-07T17:49:38.4812665', 0, NULL, 1260),
(81, 20, N'Tanışma ve günlük ifadeler', N'Selamlaşma, kendini tanıtma ve sayılar.', NULL, 1, '2026-11-07T17:49:38.4862984', 0, NULL, 1500),
(82, 20, N'Şimdiki ve geniş zaman', N'Rutinleri ve şu an olanları anlatmak.', NULL, 2, '2026-11-07T17:49:38.4864269', 0, NULL, 900),
(83, 20, N'Geçmiş zaman', N'Deneyimleri ve geçmiş olayları anlatmak.', NULL, 3, '2026-11-07T17:49:38.4864741', 0, NULL, 1560),
(84, 20, N'Gündelik hayat senaryoları', N'Alışveriş, yol tarifi ve restoranda sipariş.', NULL, 4, '2026-11-07T17:49:38.4865151', 0, NULL, 960),
(85, 21, N'Zamanların ileri kullanımı', N'Perfect ve continuous yapılar, anlatı zamanları.', NULL, 1, '2026-11-07T17:49:38.5064209', 0, NULL, 1200),
(86, 21, N'Koşul cümleleri ve edilgen yapı', N'Varsayımlar ve resmî anlatım.', NULL, 2, '2026-11-07T17:49:38.5064993', 0, NULL, 1860),
(87, 21, N'Okuma ve yazma', N'Makale okuma, e-posta ve kısa rapor yazımı.', NULL, 3, '2026-11-07T17:49:38.5065321', 0, NULL, 1260),
(88, 21, N'Akıcı konuşma', N'Tartışma, sunum ve fikir savunma pratiği.', NULL, 4, '2026-11-07T17:49:38.5065609', 0, NULL, 1920),
(89, 22, N'Alfabe ve telaffuz', N'Sesler, vurgu ve tanışma kalıpları.', NULL, 1, '2026-11-07T17:49:38.5114783', 0, NULL, 3540),
(90, 22, N'Artikeller ve isimler', N'der, die, das ve çoğul yapılar.', NULL, 2, '2026-11-07T17:49:38.5115564', 0, NULL, 2700),
(91, 22, N'Fiiller ve cümle yapısı', N'Fiil çekimi ve temel cümle düzeni.', NULL, 3, '2026-11-07T17:49:38.5116086', 0, NULL, 3720),
(92, 22, N'Gündelik konuşmalar', N'Alışveriş, randevu alma ve yol sorma.', NULL, 4, '2026-11-07T17:49:38.5116388', 0, NULL, 2880),
(93, 23, N'UX süreci ve kullanıcı araştırması', N'Görüşme, persona ve kullanıcı yolculuğu.', NULL, 1, '2026-11-07T17:49:38.5165990', 0, NULL, 4200),
(94, 23, N'Bilgi mimarisi ve wireframe', N'Ekran akışları ve düşük çözünürlüklü taslaklar.', NULL, 2, '2026-11-07T17:49:38.5166812', 0, NULL, 3360),
(95, 23, N'Figma ile arayüz tasarımı', N'Bileşenler, auto layout ve tasarım sistemi.', NULL, 3, '2026-11-07T17:49:38.5167158', 0, NULL, 4380),
(96, 23, N'Prototip ve kullanılabilirlik testi', N'Etkileşimli prototip ve geri bildirimle yineleme.', NULL, 4, '2026-11-07T17:49:38.5167579', 0, NULL, 3540),
(97, 24, N'Tasarım ilkeleri', N'Denge, kontrast, hizalama ve yakınlık.', NULL, 1, '2026-11-07T17:49:38.5217600', 0, NULL, 6000),
(98, 24, N'Renk kuramı', N'Renk uyumları ve marka renkleri.', NULL, 2, '2026-11-07T17:49:38.5218413', 0, NULL, 6420),
(99, 24, N'Tipografi', N'Yazı karakteri seçimi, eşleştirme ve okunabilirlik.', NULL, 3, '2026-11-07T17:49:38.5218824', 0, NULL, 4980),
(100, 24, N'Marka kimliği projesi', N'Logo, kartvizit ve afiş tasarımı.', NULL, 4, '2026-11-07T17:49:38.5219150', 0, NULL, 5400),
(101, 25, N'Çizgi ve oran', N'Kalem tutuşu, ölçü alma ve temel formlar.', NULL, 1, '2026-11-07T17:49:38.5269513', 0, NULL, 300),
(102, 25, N'Perspektif', N'Tek ve iki kaçış noktalı perspektif.', NULL, 2, '2026-11-07T17:49:38.5270285', 0, NULL, 480),
(103, 25, N'Işık ve gölge', N'Ton skalası, hacim ve doku.', NULL, 3, '2026-11-07T17:49:38.5270645', 0, NULL, 660),
(104, 25, N'Figür çizimi', N'İnsan oranları ve hareketli figür eskizleri.', NULL, 4, '2026-11-07T17:49:38.5270957', 0, NULL, 360),
(105, 26, N'Antik dünya ve Orta Çağ', N'Mısır, Yunan, Roma ve Bizans sanatı.', NULL, 1, '2026-11-07T17:49:38.5322689', 0, NULL, 720),
(106, 26, N'Rönesans ve Barok', N'Perspektifin doğuşu ve dramatik ışık.', NULL, 2, '2026-11-07T17:49:38.5323486', 0, NULL, 420),
(107, 26, N'19. yüzyıl ve Empresyonizm', N'Akademiden açık havaya resim.', NULL, 3, '2026-11-07T17:49:38.5323950', 0, NULL, 600),
(108, 26, N'Modern ve çağdaş sanat', N'Kübizmden kavramsal sanata.', NULL, 4, '2026-11-07T17:49:38.5324242', 0, NULL, 300),
(109, 27, N'Klavye ve nota okuma', N'Oturuş, el pozisyonu, porte ve nota değerleri.', NULL, 1, '2026-11-07T17:49:38.5375536', 0, NULL, 1920),
(110, 27, N'Ritim ve iki el koordinasyonu', N'Ölçü, tempo ve basit eşlikler.', NULL, 2, '2026-11-07T17:49:38.5376533', 0, NULL, 1320),
(111, 27, N'Gamlar ve akorlar', N'Majör-minör gamlar ve temel akor dizileri.', NULL, 3, '2026-11-07T17:49:38.5376896', 0, NULL, 1980),
(112, 27, N'İlk repertuvar', N'Klasik ve popüler eserlerden seçmeler.', NULL, 4, '2026-11-07T17:49:38.5377223', 0, NULL, 1380),
(113, 28, N'Gitarı tanımak ve akort', N'Tutuş, akort ve ilk akorlar.', NULL, 1, '2026-11-07T17:49:38.5433194', 0, NULL, 1620),
(114, 28, N'Ritim kalıpları', N'Tempo, tellere vuruş ve geçişler.', NULL, 2, '2026-11-07T17:49:38.5434001', 0, NULL, 1020),
(115, 28, N'Barre akorlar ve tab okuma', N'Klavye üzerinde akorları taşımak.', NULL, 3, '2026-11-07T17:49:38.5434350', 0, NULL, 1680),
(116, 28, N'Şarkı eşliği ve basit solo', N'Pentatonik gam ve doğaçlamaya giriş.', NULL, 4, '2026-11-07T17:49:38.5434771', 0, NULL, 1080),
(117, 29, N'Isınma ve esneklik', N'Dinamik ısınma ve germe teknikleri.', NULL, 1, '2026-11-07T17:49:38.5494929', 0, NULL, 1320),
(118, 29, N'Temel motor beceriler', N'Koşu, sıçrama, atma ve denge.', NULL, 2, '2026-11-07T17:49:38.5496190', 0, NULL, 1980),
(119, 29, N'Takım sporları', N'Basketbol, voleybol ve futbolun temel kuralları.', NULL, 3, '2026-11-07T17:49:38.5496618', 0, NULL, 1380),
(120, 29, N'Sağlıklı yaşam', N'Beslenme, uyku ve düzenli hareket.', NULL, 4, '2026-11-07T17:49:38.5497278', 0, NULL, 2040),
(121, 30, N'Hareket kalıpları', N'Squat, hinge, itme, çekme ve taşıma.', NULL, 1, '2026-11-07T17:49:38.5555097', 0, NULL, 3240),
(122, 30, N'Core ve denge', N'Gövde stabilitesi ve tek bacak çalışmaları.', NULL, 2, '2026-11-07T17:49:38.5556072', 0, NULL, 4260),
(123, 30, N'Kondisyon', N'Aralıklı antrenman ve dayanıklılık.', NULL, 3, '2026-11-07T17:49:38.5556390', 0, NULL, 3420),
(124, 30, N'Program yazma', N'Yüklenme, dinlenme ve ilerleme planı.', NULL, 4, '2026-11-07T17:49:38.5556671', 0, NULL, 4440),
(125, 31, N'Öğrenme nasıl çalışır?', N'Bellek, dikkat ve unutma eğrisi.', NULL, 1, '2026-11-07T17:49:38.5613037', 0, NULL, 3900),
(126, 31, N'Aralıklı tekrar ve kendini sınama', N'Kalıcı öğrenme için kanıtlanmış yöntemler.', NULL, 2, '2026-11-07T17:49:38.5614056', 0, NULL, 3060),
(127, 31, N'Not alma ve zaman yönetimi', N'Cornell yöntemi, Pomodoro ve haftalık plan.', NULL, 3, '2026-11-07T17:49:38.5615092', 0, NULL, 4080),
(128, 31, N'Sınav kaygısı', N'Kaygıyı tanımak ve sınav gününe hazırlık.', NULL, 4, '2026-11-07T17:49:38.5615462', 0, NULL, 3240),
(129, 32, N'Heyecanı tanımak', N'Sahne kaygısının nedenleri ve nefes teknikleri.', NULL, 1, '2026-11-07T17:49:38.5680457', 0, NULL, 4800),
(130, 32, N'Konuşmanın yapısı', N'Açılış, ana fikir, kanıt ve güçlü bir kapanış.', NULL, 2, '2026-11-07T17:49:38.5681293', 0, NULL, 5220),
(131, 32, N'Ses ve beden dili', N'Tempo, vurgu, duruş ve göz teması.', NULL, 3, '2026-11-07T17:49:38.5681667', 0, NULL, 5640),
(132, 32, N'Sade slaytlar', N'Bir slayt, bir fikir: görsel destek tasarlamak.', NULL, 4, '2026-11-07T17:49:38.5682123', 0, NULL, 6060),
(133, 32, N'Soru-cevap ve doğaçlama', N'Beklenmedik sorulara sakin ve kısa yanıt vermek.', NULL, 5, '2026-11-07T17:49:38.5682458', 0, NULL, 6480),
(134, 33, N'Sayılar ve dört işlem', N'Doğal ve tam sayılar, işlem önceliği ve zihinden işlem.', NULL, 1, '2026-11-07T17:49:38.5932627', 0, NULL, 300),
(135, 33, N'Kesirler ve ondalık sayılar', N'Genişletme, sadeleştirme ve kesirlerle işlemler.', NULL, 2, '2026-11-07T17:49:38.5933415', 0, NULL, 480),
(136, 33, N'Oran, orantı ve yüzdeler', N'Doğru-ters orantı, indirim ve faiz problemleri.', NULL, 3, '2026-11-07T17:49:38.5933786', 0, NULL, 660),
(137, 33, N'Bölünebilme, EBOB ve EKOK', N'Asal çarpanlar ve günlük hayat problemleri.', NULL, 4, '2026-11-07T17:49:38.5934101', 0, NULL, 360),
(138, 33, N'Cebire giriş', N'Değişken kavramı, ifadeler ve basit denklemler.', NULL, 5, '2026-11-07T17:49:38.5934446', 0, NULL, 540),
(139, 33, N'Problem çözme stratejileri', N'Tabloyla, şekille ve geriye doğru çalışarak çözmek.', NULL, 6, '2026-11-07T17:49:38.5934730', 0, NULL, 720),
(140, 34, N'Fonksiyonlar ve limit', N'Sezgisel limit, epsilon-delta tanımı ve süreklilik.', NULL, 1, '2026-11-07T17:49:38.6167428', 0, NULL, 720),
(141, 34, N'Türev ve türev kuralları', N'Değişim hızı, zincir kuralı ve kapalı türev.', NULL, 2, '2026-11-07T17:49:38.6168240', 0, NULL, 420),
(142, 34, N'Türevin uygulamaları', N'Ekstremum, optimizasyon ve grafik çizimi.', NULL, 3, '2026-11-07T17:49:38.6168637', 0, NULL, 600),
(143, 34, N'Belirli ve belirsiz integral', N'Riemann toplamları ve analizin temel teoremi.', NULL, 4, '2026-11-07T17:49:38.6168946', 0, NULL, 300),
(144, 34, N'İntegral teknikleri', N'Değişken değiştirme, kısmi integral ve basit kesirler.', NULL, 5, '2026-11-07T17:49:38.6169425', 0, NULL, 480),
(145, 34, N'İntegralin uygulamaları', N'Alan, dönel cisim hacmi ve yay uzunluğu.', NULL, 6, '2026-11-07T17:49:38.6169711', 0, NULL, 660),
(146, 34, N'Diziler ve seriler', N'Yakınsaklık testleri ve Taylor serileri.', NULL, 7, '2026-11-07T17:49:38.6169985', 0, NULL, 360),
(147, 35, N'Vektörler ve geometri', N'Vektör işlemleri, iç çarpım ve izdüşüm.', NULL, 1, '2026-11-07T17:49:38.6422301', 0, NULL, 2040),
(148, 35, N'Doğrusal denklem sistemleri', N'Gauss eliminasyonu ve basamak biçim.', NULL, 2, '2026-11-07T17:49:38.6423166', 0, NULL, 1440),
(149, 35, N'Matrisler ve determinant', N'Matris çarpımı, ters matris ve determinantın anlamı.', NULL, 3, '2026-11-07T17:49:38.6423519', 0, NULL, 2100),
(150, 35, N'Vektör uzayları', N'Alt uzay, taban, boyut ve rank.', NULL, 4, '2026-11-07T17:49:38.6423841', 0, NULL, 1500),
(151, 35, N'Doğrusal dönüşümler', N'Döndürme, yansıma ve ölçekleme matrisleri.', NULL, 5, '2026-11-07T17:49:38.6424220', 0, NULL, 900),
(152, 35, N'Özdeğerler ve özvektörler', N'Köşegenleştirme ve uygulamaları.', NULL, 6, '2026-11-07T17:49:38.6424538', 0, NULL, 1560),
(153, 35, N'Uygulamalar', N'En küçük kareler, PCA''ya giriş ve bilgisayar grafikleri.', NULL, 7, '2026-11-07T17:49:38.6424831', 0, NULL, 960),
(154, 36, N'Betimsel istatistik', N'Ortalama, medyan, varyans ve grafiklerle veri özeti.', NULL, 1, '2026-11-07T17:49:38.6493227', 0, NULL, 1740),
(155, 36, N'Olasılığın temelleri', N'Örnek uzay, koşullu olasılık ve Bayes teoremi.', NULL, 2, '2026-11-07T17:49:38.6494050', 0, NULL, 1140),
(156, 36, N'Rastgele değişkenler', N'Beklenen değer, varyans ve kesikli dağılımlar.', NULL, 3, '2026-11-07T17:49:38.6494410', 0, NULL, 1800),
(157, 36, N'Sürekli dağılımlar', N'Normal dağılım ve merkezi limit teoremi.', NULL, 4, '2026-11-07T17:49:38.6494716', 0, NULL, 1200),
(158, 36, N'Tahmin ve güven aralıkları', N'Örneklem dağılımı ve aralık tahmini.', NULL, 5, '2026-11-07T17:49:38.6495050', 0, NULL, 1860),
(159, 36, N'Hipotez testleri', N'p-değeri, t-testi ve sık yapılan yorum hataları.', NULL, 6, '2026-11-07T17:49:38.6495340', 0, NULL, 1260),
(160, 36, N'Korelasyon ve regresyon', N'İki değişken arasındaki ilişkiyi modellemek.', NULL, 7, '2026-11-07T17:49:38.6495772', 0, NULL, 1920),
(161, 37, N'Kurulum ve ilk program', N'Python, sanal ortamlar ve editör kurulumu.', NULL, 1, '2026-11-07T17:49:38.6565768', 0, NULL, 1440),
(162, 37, N'Değişkenler, koşullar ve döngüler', N'Temel veri tipleri ve akış kontrolü.', NULL, 2, '2026-11-07T17:49:38.6566521', 0, NULL, 2100),
(163, 37, N'Fonksiyonlar', N'Parametreler, dönüş değerleri ve kapsam.', NULL, 3, '2026-11-07T17:49:38.6566834', 0, NULL, 1500),
(164, 37, N'Listeler, sözlükler ve kümeler', N'Veri yapılarını seçmek ve dönüştürmek.', N'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', 4, '2026-11-07T17:49:38.6567113', 0, NULL, 900),
(165, 37, N'Dosyalar ve modüller', N'CSV/JSON okuma-yazma ve paket kullanımı.', NULL, 5, '2026-11-07T17:49:38.6567393', 0, NULL, 1560),
(166, 37, N'Mini proje: otomasyon', N'Bir klasördeki dosyaları düzenleyen betik yazmak.', NULL, 6, '2026-11-07T17:49:38.6567645', 0, NULL, 960),
(167, 38, N'İlişkisel model', N'Tablo, satır, birincil ve yabancı anahtar.', NULL, 1, '2026-11-07T17:49:38.6629747', 0, NULL, 2940),
(168, 38, N'Temel sorgular', N'SELECT, WHERE, ORDER BY ve sayfalama.', NULL, 2, '2026-11-07T17:49:38.6630519', 0, NULL, 3960),
(169, 38, N'JOIN ve gruplama', N'İç ve dış birleştirmeler, GROUP BY ve HAVING.', NULL, 3, '2026-11-07T17:49:38.6630881', 0, NULL, 3120),
(170, 38, N'Alt sorgular ve pencere fonksiyonları', N'Sıralama, kümülatif toplam ve CTE.', NULL, 4, '2026-11-07T17:49:38.6631168', 0, NULL, 4140),
(171, 38, N'Normalizasyon', N'Veri tekrarını önleyen şema tasarımı.', NULL, 5, '2026-11-07T17:49:38.6631424', 0, NULL, 3300),
(172, 38, N'İndeksler ve işlemler', N'Sorgu performansı, transaction ve kilitlenme.', NULL, 6, '2026-11-07T17:49:38.6631693', 0, NULL, 4320),
(173, 39, N'Veri bilimi süreci', N'Soru sormak, veri toplamak ve Jupyter ile çalışmak.', NULL, 1, '2026-11-07T17:49:38.6705702', 0, NULL, 3600),
(174, 39, N'NumPy temelleri', N'Diziler, vektörel işlemler ve yayınlama.', NULL, 2, '2026-11-07T17:49:38.6706558', 0, NULL, 2760),
(175, 39, N'pandas ile veri işleme', N'DataFrame, filtreleme, gruplama ve birleştirme.', NULL, 3, '2026-11-07T17:49:38.6706922', 0, NULL, 3780),
(176, 39, N'Veri temizleme', N'Eksik değerler, aykırı gözlemler ve tip dönüşümleri.', NULL, 4, '2026-11-07T17:49:38.6707281', 0, NULL, 2940),
(177, 39, N'Görselleştirme', N'Doğru grafiği seçmek ve okunur grafik tasarlamak.', NULL, 5, '2026-11-07T17:49:38.6707606', 0, NULL, 3960),
(178, 39, N'Analiz projesi', N'Gerçek bir veri setinden rapor hazırlamak.', NULL, 6, '2026-11-07T17:49:38.6707870', 0, NULL, 3120),
(179, 40, N'Makine öğrenmesi nedir?', N'Denetimli ve denetimsiz öğrenme, veri ayırma.', NULL, 1, '2026-11-07T17:49:38.6764761', 0, NULL, 5460),
(180, 40, N'Doğrusal ve lojistik regresyon', N'Kayıp fonksiyonu ve gradyan inişi.', NULL, 2, '2026-11-07T17:49:38.6765558', 0, NULL, 5880),
(181, 40, N'Karar ağaçları ve topluluk yöntemleri', N'Random forest ve gradient boosting.', NULL, 3, '2026-11-07T17:49:38.6765876', 0, NULL, 6300),
(182, 40, N'Model değerlendirme', N'Çapraz doğrulama, kesinlik, duyarlılık ve ROC.', NULL, 4, '2026-11-07T17:49:38.6766147', 0, NULL, 4860),
(183, 40, N'Kümeleme ve boyut indirgeme', N'k-means ve PCA.', NULL, 5, '2026-11-07T17:49:38.6766438', 0, NULL, 5280),
(184, 40, N'Uçtan uca proje', N'Özellik mühendisliği, model seçimi ve raporlama.', NULL, 6, '2026-11-07T17:49:38.6766686', 0, NULL, 5700),
(185, 41, N'Yapay nöron ve çok katmanlı ağ', N'Aktivasyon fonksiyonları ve ileri besleme.', NULL, 1, '2026-11-07T17:49:38.6837726', 0, NULL, 300),
(186, 41, N'Geri yayılım', N'Türev zinciri ve optimizasyon algoritmaları.', NULL, 2, '2026-11-07T17:49:38.6838512', 0, NULL, 480),
(187, 41, N'PyTorch ile eğitim döngüsü', N'Tensörler, veri yükleyiciler ve düzenlileştirme.', NULL, 3, '2026-11-07T17:49:38.6838845', 0, NULL, 660),
(188, 41, N'Evrişimli sinir ağları', N'Görüntü sınıflandırma ve transfer öğrenme.', NULL, 4, '2026-11-07T17:49:38.6839152', 0, NULL, 360),
(189, 41, N'Dil modelleri ve dikkat', N'Kelime gömmeleri ve Transformer mimarisi.', NULL, 5, '2026-11-07T17:49:38.6840207', 0, NULL, 540),
(190, 41, N'Sorumlu yapay zekâ', N'Önyargı, açıklanabilirlik ve değerlendirme.', NULL, 6, '2026-11-07T17:49:38.6840634', 0, NULL, 720),
(191, 42, N'Görsel algı', N'Göz neyi önce görür: konum, uzunluk, renk.', NULL, 1, '2026-11-07T17:49:38.6904740', 0, NULL, 720),
(192, 42, N'Doğru grafiği seçmek', N'Karşılaştırma, dağılım, ilişki ve zaman serisi.', NULL, 2, '2026-11-07T17:49:38.6905518', 0, NULL, 420),
(193, 42, N'Renk ve vurgu', N'Erişilebilir paletler ve dikkat yönetimi.', NULL, 3, '2026-11-07T17:49:38.6905818', 0, NULL, 600),
(194, 42, N'Pano tasarımı', N'Gösterge seçimi ve düzen.', NULL, 4, '2026-11-07T17:49:38.6906102', 0, NULL, 300),
(195, 42, N'Veriyle hikâye anlatmak', N'Bağlam, çatışma ve sonuç.', NULL, 5, '2026-11-07T17:49:38.6906517', 0, NULL, 480),
(196, 43, N'Kıtlık ve seçim', N'Fırsat maliyeti ve üretim olanakları eğrisi.', NULL, 1, '2026-11-07T17:49:38.6965906', 0, NULL, 900),
(197, 43, N'Arz, talep ve denge', N'Piyasa dengesi ve fiyat kontrolleri.', NULL, 2, '2026-11-07T17:49:38.6967012', 0, NULL, 1560),
(198, 43, N'Esneklik', N'Fiyat değişimlerine tüketicinin tepkisi.', NULL, 3, '2026-11-07T17:49:38.6967397', 0, NULL, 960),
(199, 43, N'Tüketici ve üretici kararları', N'Fayda, maliyet ve kâr maksimizasyonu.', NULL, 4, '2026-11-07T17:49:38.6967772', 0, NULL, 1620),
(200, 43, N'Piyasa yapıları', N'Tam rekabet, tekel ve oligopol.', NULL, 5, '2026-11-07T17:49:38.6968088', 0, NULL, 1020),
(201, 43, N'Piyasa başarısızlıkları', N'Dışsallıklar, kamu malları ve devlet müdahalesi.', NULL, 6, '2026-11-07T17:49:38.6968362', 0, NULL, 1680),
(202, 44, N'Milli gelir ve büyüme', N'GSYH nasıl ölçülür, neyi göstermez?', NULL, 1, '2026-11-07T17:49:38.7029657', 0, NULL, 1860),
(203, 44, N'Enflasyon', N'Nedenleri, ölçümü ve maliyetleri.', NULL, 2, '2026-11-07T17:49:38.7030426', 0, NULL, 1260),
(204, 44, N'Para ve merkez bankası', N'Para arzı, politika faizi ve aktarım mekanizması.', NULL, 3, '2026-11-07T17:49:38.7030739', 0, NULL, 1920),
(205, 44, N'Maliye politikası', N'Kamu harcamaları, vergiler ve bütçe açığı.', NULL, 4, '2026-11-07T17:49:38.7031012', 0, NULL, 1320),
(206, 44, N'Döviz kuru ve dış ticaret', N'Cari denge ve kur rejimleri.', NULL, 5, '2026-11-07T17:49:38.7031297', 0, NULL, 1980),
(207, 45, N'Bütçe ve nakit akışı', N'Gelir-gider takibi ve harcama alışkanlıkları.', NULL, 1, '2026-11-07T17:49:38.7088395', 0, NULL, 1560),
(208, 45, N'Borç ve kredi', N'Kredi kartı, faiz hesabı ve borç kapatma stratejileri.', NULL, 2, '2026-11-07T17:49:38.7089156', 0, NULL, 960),
(209, 45, N'Faiz, enflasyon ve reel getiri', N'Bileşik faiz ve paranın zaman değeri.', NULL, 3, '2026-11-07T17:49:38.7089497', 0, NULL, 1620),
(210, 45, N'Yatırım araçları', N'Mevduat, fon, hisse senedi ve tahvil.', NULL, 4, '2026-11-07T17:49:38.7089774', 0, NULL, 1020),
(211, 45, N'Risk ve çeşitlendirme', N'Risk profili ve portföy dağılımı.', NULL, 5, '2026-11-07T17:49:38.7090050', 0, NULL, 1680),
(212, 45, N'Uzun vadeli plan', N'Emeklilik birikimi ve hedef bazlı tasarruf.', NULL, 6, '2026-11-07T17:49:38.7090322', 0, NULL, 1080),
(213, 46, N'Muhasebenin temel kavramları', N'Varlık, kaynak ve temel muhasebe denklemi.', NULL, 1, '2026-11-07T17:49:38.7154407', 0, NULL, 4500),
(214, 46, N'Çift taraflı kayıt', N'Borç-alacak mantığı ve hesap planı.', NULL, 2, '2026-11-07T17:49:38.7155203', 0, NULL, 3660),
(215, 46, N'Yevmiye ve büyük defter', N'Günlük işlemleri kaydetmek.', NULL, 3, '2026-11-07T17:49:38.7155542', 0, NULL, 2820),
(216, 46, N'Gelir tablosu', N'Satışlar, giderler ve dönem kârı.', NULL, 4, '2026-11-07T17:49:38.7155828', 0, NULL, 3840),
(217, 46, N'Bilanço', N'Finansal durumu okumak.', NULL, 5, '2026-11-07T17:49:38.7156138', 0, NULL, 3000),
(218, 46, N'Oran analizi', N'Likidite, kârlılık ve borçluluk oranları.', NULL, 6, '2026-11-07T17:49:38.7156413', 0, NULL, 4020),
(219, 47, N'Edebiyat ve metin çözümleme', N'Tür, biçim, tema ve anlatıcı.', NULL, 1, '2026-11-07T17:49:38.7223025', 0, NULL, 3300),
(220, 47, N'Divan ve Halk edebiyatı', N'Gazel, koşma ve iki geleneğin dünyası.', NULL, 2, '2026-11-07T17:49:38.7223819', 0, NULL, 4320),
(221, 47, N'Tanzimat ve Servet-i Fünun', N'Batılılaşma ve yeni türlerin doğuşu.', NULL, 3, '2026-11-07T17:49:38.7224137', 0, NULL, 3480),
(222, 47, N'Millî Edebiyat', N'Dilde sadeleşme ve hikâyecilik.', NULL, 4, '2026-11-07T17:49:38.7224416', 0, NULL, 4500),
(223, 47, N'Cumhuriyet dönemi şiiri', N'Garip''ten İkinci Yeni''ye.', NULL, 5, '2026-11-07T17:49:38.7224736', 0, NULL, 3660),
(224, 47, N'Cumhuriyet dönemi romanı', N'Toplumcu gerçekçilikten modernizme.', NULL, 6, '2026-11-07T17:49:38.7225003', 0, NULL, 2820),
(225, 48, N'Felsefe nedir?', N'Soru sormak ve argüman kurmak.', NULL, 1, '2026-11-07T17:49:38.7282645', 0, NULL, 6120),
(226, 48, N'Bilgi felsefesi', N'Şüphecilik, akılcılık ve deneycilik.', NULL, 2, '2026-11-07T17:49:38.7283426', 0, NULL, 6540),
(227, 48, N'Varlık ve zihin', N'Zihin-beden problemi ve özgür irade.', NULL, 3, '2026-11-07T17:49:38.7283759', 0, NULL, 5100),
(228, 48, N'Ahlak felsefesi', N'Erdem, ödev ve sonuççu etik.', NULL, 4, '2026-11-07T17:49:38.7284024', 0, NULL, 5520),
(229, 48, N'Siyaset felsefesi', N'Adalet, özgürlük ve toplum sözleşmesi.', NULL, 5, '2026-11-07T17:49:38.7284316', 0, NULL, 5940),
(230, 48, N'Sanat ve güzellik', N'Estetik yargı ve sanatın anlamı.', NULL, 6, '2026-11-07T17:49:38.7284580', 0, NULL, 6360),
(231, 49, N'Argümanın yapısı', N'Öncül, sonuç ve geçerlilik.', NULL, 1, '2026-11-07T17:49:38.7357777', 0, NULL, 300),
(232, 49, N'Önerme mantığı', N'Bağlaçlar, doğruluk tabloları ve çıkarım kuralları.', NULL, 2, '2026-11-07T17:49:38.7358554', 0, NULL, 480),
(233, 49, N'Tümevarım ve olasılıklı akıl yürütme', N'Genelleme ve nedensellik.', NULL, 3, '2026-11-07T17:49:38.7358903', 0, NULL, 660),
(234, 49, N'Safsatalar', N'Adam karalama, korkuluk ve yanlış ikilem.', NULL, 4, '2026-11-07T17:49:38.7359175', 0, NULL, 360),
(235, 49, N'Bilişsel yanlılıklar', N'Doğrulama yanlılığı ve çapalama.', NULL, 5, '2026-11-07T17:49:38.7359473', 0, NULL, 540),
(236, 49, N'Kaynak değerlendirme', N'Haberi, veriyi ve iddiayı sınamak.', NULL, 6, '2026-11-07T17:49:38.7359731', 0, NULL, 720),
(237, 50, N'Makineyi tanımak', N'Sensör, objektif ve çekim modları.', NULL, 1, '2026-11-07T17:49:38.7418003', 0, NULL, 720),
(238, 50, N'Pozlama üçgeni', N'Diyafram, enstantane ve ISO dengesi.', NULL, 2, '2026-11-07T17:49:38.7418760', 0, NULL, 420),
(239, 50, N'Odak ve alan derinliği', N'Keskinlik ve arka plan bulanıklığı.', NULL, 3, '2026-11-07T17:49:38.7419069', 0, NULL, 600),
(240, 50, N'Işığı okumak', N'Doğal ışık, saatler ve yön.', NULL, 4, '2026-11-07T17:49:38.7419341', 0, NULL, 300),
(241, 50, N'Kompozisyon', N'Üçler kuralı, çizgiler ve çerçeveleme.', NULL, 5, '2026-11-07T17:49:38.7419636', 0, NULL, 480),
(242, 50, N'Düzenleme ve seçki', N'Lightroom ile renk, ton ve portfolyo seçimi.', NULL, 6, '2026-11-07T17:49:38.7419888', 0, NULL, 660),
(243, 51, N'Sinemanın dili', N'Plan, çekim ölçekleri ve kamera açıları.', NULL, 1, '2026-11-07T17:49:38.7492436', 0, NULL, 1020),
(244, 51, N'Mizansen', N'Işık, dekor, kostüm ve oyunculuk.', NULL, 2, '2026-11-07T17:49:38.7494041', 0, NULL, 1680),
(245, 51, N'Kamera hareketi', N'Pan, kaydırma ve uzun plan.', NULL, 3, '2026-11-07T17:49:38.7494612', 0, NULL, 1080),
(246, 51, N'Kurgu', N'Süreklilik kurgusu ve montaj kuramları.', NULL, 4, '2026-11-07T17:49:38.7494910', 0, NULL, 1740),
(247, 51, N'Ses ve müzik', N'Diegetik ses ve atmosfer.', NULL, 5, '2026-11-07T17:49:38.7495238', 0, NULL, 1140),
(248, 51, N'Film analizi yazmak', N'Bir sahneyi baştan sona çözümlemek.', NULL, 6, '2026-11-07T17:49:38.7495512', 0, NULL, 1800),
(249, 52, N'Fikir ve senaryo', N'Kısa film yapısı ve senaryo formatı.', NULL, 1, '2026-11-07T17:49:38.7559123', 0, NULL, 1980),
(250, 52, N'Ön hazırlık', N'Çekim listesi, storyboard ve mekân seçimi.', NULL, 2, '2026-11-07T17:49:38.7559912', 0, NULL, 1380),
(251, 52, N'Çekim', N'Kadraj, ışık ve oyuncu yönetimi.', NULL, 3, '2026-11-07T17:49:38.7560239', 0, NULL, 2040),
(252, 52, N'Ses kaydı', N'Mikrofon seçimi ve ortam sesi.', NULL, 4, '2026-11-07T17:49:38.7560515', 0, NULL, 1440),
(253, 52, N'Kurgu', N'Ritim, geçişler ve anlatı.', NULL, 5, '2026-11-07T17:49:38.7560827', 0, NULL, 2100),
(254, 52, N'Renk ve gösterim', N'Renk düzenleme ve festival başvurusu.', NULL, 6, '2026-11-07T17:49:38.7561088', 0, NULL, 1500),
(255, 53, N'Sosyolojik bakış', N'Bireysel sorundan toplumsal yapıya.', NULL, 1, '2026-11-07T17:49:38.7623510', 0, NULL, 1680),
(256, 53, N'Kültür ve toplumsallaşma', N'Değerler, normlar ve kimlik.', NULL, 2, '2026-11-07T17:49:38.7624284', 0, NULL, 1080),
(257, 53, N'Toplumsal tabakalaşma', N'Sınıf, statü ve eşitsizlik.', NULL, 3, '2026-11-07T17:49:38.7624862', 0, NULL, 1740),
(258, 53, N'Kent ve göç', N'Kentleşme ve göçün toplumsal etkileri.', NULL, 4, '2026-11-07T17:49:38.7625179', 0, NULL, 1140),
(259, 53, N'Araştırma yöntemleri', N'Anket, görüşme ve gözlem.', NULL, 5, '2026-11-07T17:49:38.7625461', 0, NULL, 1800),
(260, 54, N'Alfabe ve telaffuz', N'Sesler, vurgu ve selamlaşma.', NULL, 1, '2026-11-07T17:49:38.7702234', 0, NULL, 4200),
(261, 54, N'Ser ve estar', N'Kimlik, durum ve yer bildirmek.', NULL, 2, '2026-11-07T17:49:38.7702994', 0, NULL, 3360),
(262, 54, N'Düzenli fiiller', N'Şimdiki zaman çekimi ve günlük rutin.', NULL, 3, '2026-11-07T17:49:38.7703327', 0, NULL, 4380),
(263, 54, N'Sayılar, saat ve tarih', N'Randevu almak ve plan yapmak.', NULL, 4, '2026-11-07T17:49:38.7703598', 0, NULL, 3540),
(264, 54, N'Gündelik konuşmalar', N'Kafede, markette ve yolda.', NULL, 5, '2026-11-07T17:49:38.7703913', 0, NULL, 2700),
(265, 55, N'Nota ve ritim', N'Porte, anahtarlar ve ölçü.', NULL, 1, '2026-11-07T17:49:38.7938424', 0, NULL, 3000),
(266, 55, N'Aralıklar', N'Aralıkları tanımak ve duymak.', NULL, 2, '2026-11-07T17:49:38.7939300', 0, NULL, 4020),
(267, 55, N'Gamlar ve tonalite', N'Majör, minör ve donanımlar.', NULL, 3, '2026-11-07T17:49:38.7939800', 0, NULL, 3180),
(268, 55, N'Akorlar', N'Üç ve dört sesli akorlar.', NULL, 4, '2026-11-07T17:49:38.7940092', 0, NULL, 4200),
(269, 55, N'Armoniye giriş', N'Kadanslar ve akor dizileri.', NULL, 5, '2026-11-07T17:49:38.7940382', 0, NULL, 3360),
(270, 55, N'Kulak eğitimi', N'Dikte, solfej ve melodi tanıma.', NULL, 6, '2026-11-07T17:49:38.7940640', 0, NULL, 4380),
(271, 56, N'Malzemeyi tanımak', N'Kâğıt, fırça ve pigment seçimi.', NULL, 1, '2026-11-07T17:49:38.8032665', 0, NULL, 4920),
(272, 56, N'Temel teknikler', N'Düz, geçişli ve ıslak üzerine ıslak boyama.', NULL, 2, '2026-11-07T17:49:38.8033450', 0, NULL, 5340),
(273, 56, N'Renk karışımları', N'Sınırlı paletle uyumlu renkler.', NULL, 3, '2026-11-07T17:49:38.8033772', 0, NULL, 5760),
(274, 56, N'Işık ve beyaz alan', N'Kâğıdın beyazını korumak.', NULL, 4, '2026-11-07T17:49:38.8034047', 0, NULL, 6180),
(275, 56, N'Manzara ve botanik çalışmalar', N'Katman katman resim kurmak.', NULL, 5, '2026-11-07T17:49:38.8034395', 0, NULL, 6600),
(276, 57, N'Nefes ve duruş', N'Diyafram nefesi ve nötr omurga.', NULL, 1, '2026-11-07T17:49:38.8102014', 0, NULL, 300),
(277, 57, N'Kalça ve bel mobilitesi', N'Oturmanın etkilerini dengelemek.', NULL, 2, '2026-11-07T17:49:38.8102844', 0, NULL, 480),
(278, 57, N'Omuz ve göğüs açıklığı', N'Masa başı duruşuna karşı rutinler.', NULL, 3, '2026-11-07T17:49:38.8103262', 0, NULL, 660),
(279, 57, N'Denge ve güç akışları', N'Ayakta duruşlar ve geçişler.', NULL, 4, '2026-11-07T17:49:38.8103536', 0, NULL, 360),
(280, 57, N'Kişisel rutin', N'Haftalık mobilite programı kurmak.', NULL, 5, '2026-11-07T17:49:38.8103805', 0, NULL, 540),
(281, 58, N'Paragrafta ana düşünce ve konu tespiti', N'Metnin ana fikrini ilk okumada saptama ve anahtar kelimeleri doğru belirleme yöntemleri.', NULL, 1, '2026-11-07T17:49:38.8196593', 0, NULL, 720),
(282, 58, N'Yardımcı düşünceler ve olumsuz köklü sorular', N'Soru kökündeki ayrıntıları yakalama ve şıkları metinle eşleştirerek eleme adımları.', NULL, 2, '2026-11-07T17:49:38.8197509', 0, NULL, 420),
(283, 58, N'Paragrafın yapısı ve akışı bozan cümleler', N'Düşüncenin akışını bozan ifadeleri bulma, iki paragrafa bölme ve yer değiştirme teknikleri.', NULL, 3, '2026-11-07T17:49:38.8197856', 0, NULL, 600),
(284, 58, N'Süre yönetimi ve deneme stratejileri', N'YKS Türkçe testinde 40 soruyu kırk beş dakikada tamamlamaya yönelik süre ve odaklanma pratikleri.', NULL, 4, '2026-11-07T17:49:38.8198120', 0, NULL, 300),
(285, 59, N'Sözcükte yapı ve ek kök analizi', N'Yapım ve çekim eklerinin işlevleri ile sözcüğün yapısını doğru ayrıştırma yolları.', NULL, 1, '2026-11-07T17:49:38.8264868', 0, NULL, 1140),
(286, 59, N'Sözcük türleri ve eylemsiler', N'İsim, sıfat, zamir ve zarf ayrımları ile fiilimsilerin cümledeki görevlerini tanıma.', NULL, 2, '2026-11-07T17:49:38.8265635', 0, NULL, 1800),
(287, 59, N'Cümlenin ögeleri ve vurgu', N'Yüklem merkezli öge bulma sırası ve ara sözlerin öge tahlilindeki yerini kavrama.', NULL, 3, '2026-11-07T17:49:38.8265939', 0, NULL, 1200),
(288, 59, N'Yazım kuralları ve noktalama işaretleri', N'Büyük harflerin kullanımı, birleşik sözcükler ve sık karıştırılan noktalama kuralları.', NULL, 4, '2026-11-07T17:49:38.8266258', 0, NULL, 1860),
(289, 60, N'Akademik yazımın temel ilkeleri', N'Nesnel üslup, terim kullanımı ve akademik metin türlerinin yapısal özellikleri.', NULL, 1, '2026-11-07T17:49:38.8350161', 0, NULL, 2100),
(290, 60, N'Paragraf kurgusu ve argüman geliştirme', N'Giriş, gelişme ve sonuç paragraflarında tez cümlesini destekleyen kanıtları sıralama.', NULL, 2, '2026-11-07T17:49:38.8350951', 0, NULL, 1500),
(291, 60, N'Alıntılama ve kaynakça yönetimi', N'Doğrudan ve dolaylı aktarım kuralları ile akademik dürüstlük ilkelerini benimseme.', NULL, 3, '2026-11-07T17:49:38.8351400', 0, NULL, 900),
(292, 60, N'Metin düzenleme ve son okuma', N'Yazılan metni anlatım bozuklukları, akıcılık ve biçimsel tutarlılık açısından gözden geçirme.', NULL, 4, '2026-11-07T17:49:38.8351674', 0, NULL, 1560),
(293, 61, N'Milli Edebiyat zevkini sürdüren şiir ve nesir', N'Cumhuriyetin ilk yıllarında Anadolu teması ve memleket edebiyatı anlayışının analizi.', NULL, 1, '2026-11-07T17:49:38.8417001', 0, NULL, 1800),
(294, 61, N'Toplumcu gerçekçi roman ve öykü', N'Köy ve kasaba gerçekliğini işleyen yazarların tematik ve biçimsel yaklaşımları.', NULL, 2, '2026-11-07T17:49:38.8417800', 0, NULL, 1200),
(295, 61, N'Garip hareketi ve İkinci Yeni şiiri', N'Şiirde biçimsel devrimler, imge dünyası ve modern Türk şiirinin dönüşüm durakları.', NULL, 3, '2026-11-07T17:49:38.8418103', 0, NULL, 1860),
(296, 61, N'1980 sonrası Türk romanında postmodernizm', N'Üstkurmaca, metinlerarasılık ve çoğulcu anlatım tekniklerinin eserler üzerinden incelenmesi.', NULL, 4, '2026-11-07T17:49:38.8418360', 0, NULL, 1260),
(297, 62, N'Arapça ve Farsça unsurların gramer yapısı', N'Bablara göre kelime türetme, terkipler ve Osmanlı Türkçesinde sıkça geçen kalıplar.', NULL, 1, '2026-11-07T17:49:38.8508132', 0, NULL, 3900),
(298, 62, N'Matbu metin okumaları ve gazete çevirileri', N'Geç dönem Osmanlı basını ve edebi mecmualarından seçilmiş matbu metinlerin çözümlenmesi.', NULL, 2, '2026-11-07T17:49:38.8509149', 0, NULL, 3060),
(299, 62, N'Rîka hattına giriş ve harf bağlantıları', N'El yazısı belgelerin paleografik özellikleri, harf birleşimleri ve kısaltma işaretleri.', NULL, 3, '2026-11-07T17:49:38.8509484', 0, NULL, 4080),
(300, 62, N'Arşiv vesikaları ve ferman okuma pratiği', N'Osmanlı arşivlerindeki resmi yazışmalar, beratlar ve şeriyye sicili kayıtlarının transkripsiyonu.', NULL, 4, '2026-11-07T17:49:38.8509751', 0, NULL, 3240),
(301, 63, N'Diyafram nefesi ve sesin anatomisi', N'Doğru solunum tekniğiyle sesi yormadan gür ve net çıkarma çalışmaları.', NULL, 1, '2026-11-07T17:49:38.8576888', 0, NULL, 2700),
(302, 63, N'Fonetik kuralları ve doğru telaffuz', N'Türkçede açık ve kapalı e sesleri, daralma ve harflerin boğumlanma noktaları.', NULL, 2, '2026-11-07T17:49:38.8577706', 0, NULL, 3720),
(303, 63, N'Cümle vurgusu ve tonlama dinamikleri', N'Anlatıma duygu ve inandırıcılık katan tonlama iniş çıkışlarını metin üzerinde çalışma.', NULL, 3, '2026-11-07T17:49:38.8578032', 0, NULL, 2880),
(304, 63, N'Beden dili ve sahne heyecanını yönetme', N'Topluluk önünde konuşurken postür, el jestleri ve sahne stresini dengeleme pratikleri.', NULL, 4, '2026-11-07T17:49:38.8578528', 0, NULL, 3900),
(305, 64, N'Psikolojinin tarihi ve temel yaklaşımlar', N'Yapısalcılıktan davranışçılığa ve bilişsel devrime uzanan kuramsal akımların özeti.', NULL, 1, '2026-11-07T17:49:38.8679500', 0, NULL, 5580),
(306, 64, N'Davranışın biyolojik temelleri ve algı', N'Sinir sistemi, nörotransmitterler ve duyusal bilgilerin zihinde örgütlenme ilkeleri.', NULL, 2, '2026-11-07T17:49:38.8680521', 0, NULL, 6000),
(307, 64, N'Öğrenme kuramları ve bellek sistemleri', N'Klasik ve edimsel koşullanma ile kısa ve uzun süreli bellek yapıları.', NULL, 3, '2026-11-07T17:49:38.8680887', 0, NULL, 6420),
(308, 64, N'Sosyal psikoloji ve grup dinamikleri', N'Sosyal etki, uyma davranışı, tutumlar ve önyargıların oluşum mekanizmaları.', NULL, 4, '2026-11-07T17:49:38.8681165', 0, NULL, 4980),
(309, 65, N'Bilişsel gelişim kuramları', N'Piaget evreleri ve Vygotsky sosyokültürel yaklaşımının temel kavramları.', NULL, 1, '2026-11-07T17:49:38.8749971', 0, NULL, 300),
(310, 65, N'Bağlanma kuramı ve duygusal gelişim', N'Bowlby ve Ainsworth modelleri ışığında güvenli ve kaygılı bağlanma türleri.', NULL, 2, '2026-11-07T17:49:38.8750771', 0, NULL, 480),
(311, 65, N'Psikososyal gelişim ve kimlik arayışı', N'Erikson yaşam boyu gelişim evreleri ve ergenlikte kimlik kazanımı süreci.', NULL, 3, '2026-11-07T17:49:38.8751069', 0, NULL, 660),
(312, 65, N'Ahlak gelişimi ve yetişkinlik evreleri', N'Kohlberg ahlak kuramı ve yetişkinlikten yaşlılığa bilişsel ve sosyal değişimler.', NULL, 4, '2026-11-07T17:49:38.8751314', 0, NULL, 360),
(313, 66, N'Bilişsel bilimlerin disiplinlerarası temelleri', N'Felsefe, yapay zeka, dilbilim ve sinirbilimin zihin araştırmalarındaki ortak paydası.', NULL, 1, '2026-11-07T17:49:38.8836399', 0, NULL, 720),
(314, 66, N'Hesaplamalı zihin kuramı ve bilgi işleme', N'Zihinsel temsiller, sembolik sistemler ve bağlantıcı yapay sinir ağı yaklaşımları.', NULL, 2, '2026-11-07T17:49:38.8837837', 0, NULL, 420),
(315, 66, N'Dikkat ve görsel algının bilişsel modelleri', N'Seçici dikkat filtreleri, nesne tanıma kuramları ve görme sisteminin hesaplamalı yapısı.', NULL, 3, '2026-11-07T17:49:38.8838175', 0, NULL, 600),
(316, 66, N'Karar verme ve uslamlama süreçleri', N'Bilişsel yanılgılar, sezgisel yöntemler ve olasılıksal akıl yürütme mekanizmaları.', NULL, 4, '2026-11-07T17:49:38.8838435', 0, NULL, 300),
(317, 67, N'Bilimsel araştırma sorusu ve hipotez kurma', N'Bağımsız ve bağımlı değişkenleri tanımlama ve operasyonel hale getirme yolları.', NULL, 1, '2026-11-07T17:49:38.8906900', 0, NULL, 1260),
(318, 67, N'Deneysel desenler ve kontrol mekanizmaları', N'Gruplararası ve grupiçi desenler ile iç ve dış geçerliliği koruma teknikleri.', NULL, 2, '2026-11-07T17:49:38.8907612', 0, NULL, 1920),
(319, 67, N'Bilgisayarlı deney tasarımı ve veri toplama', N'Tepki süresi ve doğruluk ölçümlerini kaydeden deneysel yazılım protokolleri.', NULL, 3, '2026-11-07T17:49:38.8907893', 0, NULL, 1320),
(320, 67, N'Veri analizi ve araştırma raporu yazımı', N'Parametrik testler, varyans analizi ve APA formatında bilimsel raporlama kuralları.', NULL, 4, '2026-11-07T17:49:38.8908132', 0, NULL, 1980),
(321, 68, N'İlk Türk devletleri ve İslam tarihi soru analizi', N'Kültür ve medeniyet kavramları ile sık karşılaşılan öncüllü soru çözümleri.', NULL, 1, '2026-11-07T17:49:38.8983698', 0, NULL, 960),
(322, 68, N'Osmanlı Devleti siyasi ve askeri gelişmeler', N'Kuruluştan dağılmaya kadar antlaşmalar, ıslahatlar ve savaşların soru tahlilleri.', NULL, 2, '2026-11-07T17:49:38.8985796', 0, NULL, 1620),
(323, 68, N'Kurtuluş Savaşı ve cepheler', N'Kongreler süreci, muharebeler ve Mudanya ile Lozan antlaşmalarının odak noktaları.', NULL, 3, '2026-11-07T17:49:38.8986270', 0, NULL, 1020),
(324, 68, N'Atatürk ilkeleri ve inkılap tarihi pratikleri', N'İnkılapların ilkelerle eşleştirilmesi ve sınav tipi karma deneme çözümleri.', NULL, 4, '2026-11-07T17:49:38.8986564', 0, NULL, 1680),
(325, 69, N'Kent kuramları ve mekânın üretimi', N'Chicago ekolünden David Harvey ve Lefebvre kuramlarına kentsel mekân okumaları.', NULL, 1, '2026-11-07T17:49:38.9067832', 0, NULL, 1920),
(326, 69, N'Kentsel dönüşüm ve mutenalaştırma', N'Soylulaştırma süreçleri, soylulaştırmanın toplumsal etkileri ve mekânsal ayrışma.', NULL, 2, '2026-11-07T17:49:38.9068762', 0, NULL, 1320),
(327, 69, N'Saha araştırması metodolojisi ve etik', N'Kentte katılımcı gözlem yapma, yarı yapılandırılmış mülakat tasarımı ve saha etiği.', NULL, 3, '2026-11-07T17:49:38.9069088', 0, NULL, 1980),
(328, 69, N'Nitel verilerin kodlanması ve raporlama', N'Saha notları ile ses kayıtlarının tematik analizi ve araştırma raporu haline getirilmesi.', NULL, 4, '2026-11-07T17:49:38.9069569', 0, NULL, 1380),
(329, 70, N'Gelişmiş bileşenler ve varyant mimarisi', N'Bileşen özellikleri, yuvalama ve durum varyantlarıyla esnek arayüz elemanları kurma.', NULL, 1, '2026-11-07T17:49:38.9195843', 0, NULL, 3600),
(330, 70, N'Değişkenler ve koşullu mantık yapıları', N'String, boolean ve sayı değişkenleriyle çalışan dinamik sepet ve form prototipleri.', NULL, 2, '2026-11-07T17:49:38.9196743', 0, NULL, 2760),
(331, 70, N'Akıllı animasyonlar ve mikromimikler', N'Ekran geçişleri, sürükleme hareketleri ve mikro etkileşimlerin zamanlama ayarları.', NULL, 3, '2026-11-07T17:49:38.9197045', 0, NULL, 3780),
(332, 70, N'Kullanıcı testi hazırlığı ve paylaşım', N'Prototipi paylaşıma açma, test senaryoları belirleme ve geri bildirim toplama süreçleri.', NULL, 4, '2026-11-07T17:49:38.9197301', 0, NULL, 2940),
(333, 71, N'Tasarım briefi ve pazar araştırması', N'Müşteri beklentilerini anlama, rakip görsel analizi ve duygu panosu oluşturma.', NULL, 1, '2026-11-07T17:49:38.9262006', 0, NULL, 4260),
(334, 71, N'Logo eskizleri ve geometrik konstrüksiyon', N'Fikir geliştirme, ızgara sistemi üzerinde sembol inşası ve tipografik uyum.', NULL, 2, '2026-11-07T17:49:38.9262718', 0, NULL, 3420),
(335, 71, N'Renk teorisi ve tipografi hiyerarşisi', N'Kurumsal renk sistemleri, kontrast dengesi ve metin fontu eşleştirmeleri.', NULL, 3, '2026-11-07T17:49:38.9263002', 0, NULL, 4440),
(336, 71, N'Kurumsal kimlik kılavuzu hazırlama', N'Logo kullanım sınırları, basılı ve dijital materyal şablonları ile rehber teslimi.', NULL, 4, '2026-11-07T17:49:38.9263252', 0, NULL, 3600),
(337, 72, N'İtalyan ve Kuzey Rönesansı', N'Perspektifin keşfi, hümanizm etkisi ve Da Vinci, Michelangelo ile Dürer karşılaştırması.', NULL, 1, '2026-11-07T17:49:38.9349185', 0, NULL, 6240),
(338, 72, N'Barok sanat ve ışık gölge ustalığı', N'Dramatik aydınlatma, hareket algısı ve Caravaggio ile Bernini eserlerinin analizi.', NULL, 2, '2026-11-07T17:49:38.9350037', 0, NULL, 4800),
(339, 72, N'Neoklasisizm ve Romantizm çatışması', N'Akıl ile duygunun mücadelesi, Fransız Devrimi etkisi ve Goya ile Delacroix tahlilleri.', NULL, 3, '2026-11-07T17:49:38.9350382', 0, NULL, 5220),
(340, 72, N'Empresyonizmden Avangart akımlara geçiş', N'Işığın anlık kaydı, Kübizm, Soyut dışavurumculuk ve modern sanatın temelleri.', NULL, 4, '2026-11-07T17:49:38.9350648', 0, NULL, 5640),
(341, 73, N'Tonal armoni ve kadans yapıları', N'Dört sesli armonide akor bağlantıları, anahtarlar ve açık ile kapalı pozisyonlar.', NULL, 1, '2026-11-07T17:49:38.9416168', 0, NULL, 300),
(342, 73, N'Akor modülasyonları ve geçki teknikleri', N'Yakın ve uzak tonlara geçiş yolları, ortak akorlar ve kromatizm kullanımı.', NULL, 2, '2026-11-07T17:49:38.9416920', 0, NULL, 480),
(343, 73, N'Modal armoni ve modern tınılar', N'Dorian, Mixolydian ve Lydian modlarında armonik yürüyüşler ve melodi ilişkisi.', NULL, 3, '2026-11-07T17:49:38.9417236', 0, NULL, 660),
(344, 73, N'Beste kurgusu ve aranjman pratikleri', N'Motif geliştirme, form yapısı oluşturma ve orkestrasyon taslakları hazırlama.', NULL, 4, '2026-11-07T17:49:38.9417493', 0, NULL, 360),
(345, 74, N'Enerji sistemleri ve makro besin dengesi', N'Dayanıklılık ve kuvvet sporlarında karbonhidrat, protein ve yağ gereksinimleri.', NULL, 1, '2026-11-07T17:49:38.9503546', 0, NULL, 720),
(346, 74, N'Sıvı dengesi ve elektrolit yönetimi', N'Antrenman esnasında hidrasyon takibi, terleme testi ve toparlanma içecekleri.', NULL, 2, '2026-11-07T17:49:38.9504628', 0, NULL, 420),
(347, 74, N'Antrenman ve müsabaka zamanlaması', N'Müsabaka öncesi glikojen depolarını doldurma ve sonrası kas onarım öğünleri.', NULL, 3, '2026-11-07T17:49:38.9504944', 0, NULL, 600),
(348, 74, N'Kanıta dayalı takviyeler ve ergojenik destekler', N'Kreatin, kafein ve beta-alanin gibi desteklerin etki mekanizmaları ve güvenli kullanımı.', NULL, 4, '2026-11-07T17:49:38.9505194', 0, NULL, 300),
(349, 75, N'Kişisel çalışma programı ve hedef belirleme', N'Haftalık net takibi, konu tarama çizelgeleri ve gerçekçi çalışma hedefleri koyma.', NULL, 1, '2026-11-07T17:49:38.9570693', 0, NULL, 1380),
(350, 75, N'Deneme sınavı analizi ve eksik tamamlama', N'Doğru ve yanlış soru tahliliyle eksik konuları nokta atışı tespit etme yolları.', NULL, 2, '2026-11-07T17:49:38.9571424', 0, NULL, 2040),
(351, 75, N'Sınav turu taktiği ve zaman planlaması', N'Turlama tekniğiyle vakit kazandıran soru çözme disiplini ve odaklanma.', NULL, 3, '2026-11-07T17:49:38.9571708', 0, NULL, 1440),
(352, 75, N'Sınav kaygısı ve psikolojik dayanıklılık', N'Sınav stresini kontrol altında tutma, nefes pratikleri ve motivasyon yönetimi.', NULL, 4, '2026-11-07T17:49:38.9571957', 0, NULL, 2100),
(353, 76, N'Göz kası egzersizleri ve görme alanını genişletme', N'Göz sıçramalarını hızlandıran blok okuma çalışmaları ve satır takibi yöntemleri.', NULL, 1, '2026-11-07T17:49:38.9636239', 0, NULL, 1080),
(354, 76, N'İç seslendirmeyi azaltma ve kavrama', N'Metni zihinde kelime kelime tekrarlamadan kavramsal olarak anlama pratikleri.', NULL, 2, '2026-11-07T17:49:38.9637183', 0, NULL, 1740),
(355, 76, N'Cornell ve zihin haritası sistemleri', N'Derslerde ve kitap okurken bilgiyi hiyerarşik biçimde yapılandırarak kaydetme.', NULL, 3, '2026-11-07T17:49:38.9637481', 0, NULL, 1140),
(356, 76, N'Aktif hatırlama ve aralıklı tekrar', N'Notları periyodik gözden geçirme stratejileriyle uzun süreli hafızaya aktarma.', NULL, 4, '2026-11-07T17:49:38.9637743', 0, NULL, 1800),
(357, 77, N'Antik trajedi ve epik anlatı', N'Homeros destanları ve Sofokles tragedyalarında ahlak, kader ve kahramanlık temaları.', NULL, 1, '2026-11-07T17:49:38.9708078', 0, NULL, 2040),
(358, 77, N'Rus edebiyatında varoluşsal sancılar', N'Dostoyevski ve Tolstoy romanlarında vicdan, inanç ve toplumsal çatışmalar.', NULL, 2, '2026-11-07T17:49:38.9708824', 0, NULL, 1440),
(359, 77, N'Modernizmin habercisi Batı klasikleri', N'Goethe ve Flaubert üzerinden bireyin toplumla uyumsuzluğu ve arzu arayışı.', NULL, 3, '2026-11-07T17:49:38.9709119', 0, NULL, 2100),
(360, 77, N'20. yüzyıl yabancılaşması ve Kafkaesk dünya', N'Kafka ve Camus eserlerinde bürokrasi, saçma kavramı ve modern insan açmazı.', NULL, 4, '2026-11-07T17:49:38.9709368', 0, NULL, 1500),
(361, 78, N'Mobil kamera ayarları ve temel ışık kullanımı', N'Pozlama telafisi, odak kilidi, ızgara kullanımı ve pencere ışığından yararlanma.', NULL, 1, '2026-11-07T17:49:38.9773957', 0, NULL, 3300),
(362, 78, N'Fotoğrafta kompozisyon ve açı belirleme', N'Üçler kuralı, simetri, derinlik oluşturma ve yönlendirici çizgileri çerçeveye yerleştirme.', NULL, 2, '2026-11-07T17:49:38.9774680', 0, NULL, 4320),
(363, 78, N'Mobil video çekim teknikleri ve ses kaydı', N'Telefon hareketleri, sabit planlar, harici mikrofon ayarları ve rüzgar engelleme.', NULL, 3, '2026-11-07T17:49:38.9774975', 0, NULL, 3480),
(364, 78, N'CapCut ile mobil video kurgusu ve renk', N'Klip kesme, tempo ayarı, geçişler, metin animasyonları ve renk düzenleme adımları.', NULL, 4, '2026-11-07T17:49:38.9775225', 0, NULL, 4500),
(365, 79, N'Nükleik asit yapısı ve replikasyon mekanizması', N'DNA polimerazlar, helikaz, okazyaki parçacıkları ve hata düzeltme süreçleri.', NULL, 1, '2026-11-07T17:49:38.9843009', 0, NULL, 3960),
(366, 79, N'Transkripsiyon ve gen ifadesinin regülasyonu', N'RNA sentezi, promotor bölgeler, transkripsiyon faktörleri ve operon sistemleri.', NULL, 2, '2026-11-07T17:49:38.9843722', 0, NULL, 3120),
(367, 79, N'Translasyon ve protein katlanması', N'Ribozom mekaniği, tRNA eşleşmesi, translasyon sonrası modifikasyonlar ve şaperonlar.', NULL, 3, '2026-11-07T17:49:38.9844014', 0, NULL, 4140),
(368, 79, N'Rekombinant DNA teknolojisi ve gen düzenleme', N'Restriksiyon enzimleri, klonlama vektörleri, PCR analizi ve CRISPR-Cas9 prensipleri.', NULL, 4, '2026-11-07T17:49:38.9844275', 0, NULL, 3300),
(369, 80, N'Mevsimler ve iklim yeni nesil soru kalıpları', N'Dünyanın dönme ekseni, gölge boyu değişimleri ve iklim ile hava olayları analizi.', NULL, 1, '2026-11-07T17:49:38.9909606', 0, NULL, 5040),
(370, 80, N'DNA ve genetik kod tahlilleri', N'Nükleotid dizilimleri, mutasyon, modifikasyon, adaptasyon ve biyoteknoloji soruları.', NULL, 2, '2026-11-07T17:49:38.9910440', 0, NULL, 5460),
(371, 80, N'Basınç ünitesi ve deney düzenekleri', N'Katı, sıvı ve gaz basıncında değişkenlerin grafiğe dökülmesi ve deney yorumlama.', NULL, 3, '2026-11-07T17:49:38.9910758', 0, NULL, 5880),
(372, 80, N'Madde ve endüstri ile basit makineler', N'Periyodik tablo, fiziksel kimyasal değişimler ve makara kaldıraç kuvvet kazancı.', NULL, 4, '2026-11-07T17:49:38.9911016', 0, NULL, 6300),
(373, 81, N'Beşeri coğrafyanın temel ilkeleri ve nüfus', N'Dünya nüfus dağılışı, demografik dönüşüm modeli ve kentsel göç hareketleri.', NULL, 1, '2026-11-07T17:49:38.9981201', 0, NULL, 300),
(374, 81, N'Küresel enerji koridorları ve boğazlar', N'Petrol ve doğal gaz boru hatları, Hürmüz ve Malakka gibi kritik deniz geçitleri.', NULL, 2, '2026-11-07T17:49:38.9981928', 0, NULL, 480),
(375, 81, N'Sınırlar, jeopolitik teoriler ve çatışma bölgeleri', N'Kara ve kenar kuşak teorileri ışığında bölgesel egemenlik ve sınır anlaşmazlıkları.', NULL, 3, '2026-11-07T17:49:38.9982226', 0, NULL, 660),
(376, 81, N'İklim krizi, su güvenliği ve jeopolitik gelecek', N'Kuraklık kaynaklı göç dalgaları, sınır aşan sular ve geleceğin jeopolitik riskleri.', NULL, 4, '2026-11-07T17:49:38.9982492', 0, NULL, 360),
(377, 82, N'Anayasa kavramı ve anayasacılık', N'Anayasanın üstünlüğü, sert ve yumuşak anayasalar, Türk anayasa tarihinin kısa özeti.', NULL, 1, '2026-11-07T17:49:39.0053287', 0, NULL, 720),
(378, 82, N'Temel hak ve özgürlükler', N'Hakların sınıflandırılması, sınırlandırma ölçütleri ve ölçülülük ilkesi.', NULL, 2, '2026-11-07T17:49:39.0054062', 0, NULL, 420),
(379, 82, N'Devletin organları', N'Yasama, yürütme ve yargı; organlar arası ilişkiler ve hükümet sistemleri.', NULL, 3, '2026-11-07T17:49:39.0054373', 0, NULL, 600),
(380, 82, N'Anayasa yargısı ve bireysel başvuru', N'Norm denetimi, iptal davası, itiraz yolu ve bireysel başvurunun aşamaları.', NULL, 4, '2026-11-07T17:49:39.0054625', 0, NULL, 300),
(381, 83, N'İdarenin örgütlenmesi', N'Merkezi yönetim, taşra teşkilatı, mahalli idareler ve kamu tüzel kişileri.', NULL, 1, '2026-11-07T17:49:39.0123977', 0, NULL, 1500),
(382, 83, N'İdari işlem', N'İdari işlemin unsurları, hukuka aykırılık halleri ve geri alma.', NULL, 2, '2026-11-07T17:49:39.0124796', 0, NULL, 900),
(383, 83, N'Kamu görevlileri ve kamu hizmeti', N'Memurların hak ve yükümlülükleri, kamu hizmetinin ilkeleri ve yürütülme usulleri.', NULL, 3, '2026-11-07T17:49:39.0125098', 0, NULL, 1560),
(384, 83, N'İdari yargı ve idarenin sorumluluğu', N'İptal ve tam yargı davaları, dava açma süreleri, hizmet kusuru ve kusursuz sorumluluk.', NULL, 4, '2026-11-07T17:49:39.0125351', 0, NULL, 960),
(385, 84, N'Borç ilişkisi ve sözleşmenin kuruluşu', N'İcap ve kabul, şekil şartları, irade bozuklukları ve kesin hükümsüzlük.', NULL, 1, '2026-11-07T17:49:39.0199967', 0, NULL, 1200),
(386, 84, N'İfa, temerrüt ve sorumluluk', N'Borcun ifası, borçlu temerrüdü, haksız fiil ve sebepsiz zenginleşme.', NULL, 2, '2026-11-07T17:49:39.0200738', 0, NULL, 1860),
(387, 84, N'Tacir ve ticari işletme', N'Ticari işletme kavramı, ticaret sicili, ticaret unvanı ve haksız rekabet.', NULL, 3, '2026-11-07T17:49:39.0201038', 0, NULL, 1260),
(388, 84, N'Şirketler ve kıymetli evrak', N'Anonim ve limited şirketin kuruluşu ve organları; çek, bono ve poliçe.', NULL, 4, '2026-11-07T17:49:39.0201283', 0, NULL, 1920),
(389, 85, N'Kişisel veri ve işleme şartları', N'Kişisel ve özel nitelikli veri, işleme şartları, açık rıza ve aydınlatma yükümlülüğü.', NULL, 1, '2026-11-07T17:49:39.0270659', 0, NULL, 900),
(390, 85, N'Veri sorumlusunun yükümlülükleri', N'VERBİS kaydı, saklama-imha politikası, teknik ve idari tedbirler.', NULL, 2, '2026-11-07T17:49:39.0271478', 0, NULL, 1560),
(391, 85, N'Veri ihlali ve yurt dışına aktarım', N'İhlal bildirimi, Kurul kararları, yurt dışına aktarım ve GDPR ile farklar.', NULL, 3, '2026-11-07T17:49:39.0271776', 0, NULL, 960),
(392, 85, N'Bilişim suçları ve e-ticaret', N'Sisteme izinsiz erişim, verileri bozma, elektronik ticaret ve ticari ileti kuralları.', NULL, 4, '2026-11-07T17:49:39.0272033', 0, NULL, 1620),
(393, 86, N'Mikrodenetleyici ve geliştirme ortamı', N'Arduino kartı, IDE kurulumu, ilk program ve LED yakma.', NULL, 1, '2026-11-07T17:49:39.0347415', 0, NULL, 3000),
(394, 86, N'Giriş ve çıkışlar', N'Buton okuma, PWM ile parlaklık ayarı ve analog sensör değerleri.', NULL, 2, '2026-11-07T17:49:39.0348323', 0, NULL, 4020),
(395, 86, N'Motorlar ve sürücüler', N'DC motor, servo ve step motorları sürücü devreleriyle kontrol etme.', NULL, 3, '2026-11-07T17:49:39.0348720', 0, NULL, 3180),
(396, 86, N'Haberleşme ve proje', N'Seri port, I2C ve SPI ile sensör bağlama; mini hava istasyonu projesi.', NULL, 4, '2026-11-07T17:49:39.0349022', 0, NULL, 4200),
(397, 87, N'Akım, gerilim ve direnç', N'Ohm yasası, seri ve paralel bağlantı, multimetre ile ölçüm.', NULL, 1, '2026-11-07T17:49:39.0422214', 0, NULL, 3660),
(398, 87, N'Devre analiz yöntemleri', N'Kirchhoff yasaları, düğüm ve çevre analizi, Thevenin eşdeğeri.', NULL, 2, '2026-11-07T17:49:39.0423165', 0, NULL, 2820),
(399, 87, N'Kondansatör, bobin ve geçici durum', N'RC ve RL devreleri, zaman sabiti ve osiloskopla gözlem.', NULL, 3, '2026-11-07T17:49:39.0423496', 0, NULL, 3840),
(400, 87, N'Diyot ve transistör', N'Doğrultucu devreler, transistörü anahtar ve yükselteç olarak kullanma.', NULL, 4, '2026-11-07T17:49:39.0423971', 0, NULL, 3000),
(401, 88, N'Robot kinematiği', N'Diferansiyel sürüşlü robot modeli, koordinat dönüşümleri ve odometri.', NULL, 1, '2026-11-07T17:49:39.0504054', 0, NULL, 5700),
(402, 88, N'PID kontrol', N'Geri besleme, P, I ve D terimlerinin etkisi, kazanç ayarı ve kararlılık.', NULL, 2, '2026-11-07T17:49:39.0504851', 0, NULL, 6120),
(403, 88, N'ROS 2 mimarisi', N'Düğümler, konular, servisler, launch dosyaları ve Gazebo simülasyonu.', NULL, 3, '2026-11-07T17:49:39.0505482', 0, NULL, 6540),
(404, 88, N'Algılama ve navigasyon', N'Lidar ile SLAM, harita üzerinde yol planlama ve engelden kaçınma.', NULL, 4, '2026-11-07T17:49:39.0506255', 0, NULL, 5100),
(405, 89, N'Eskiz ve kısıtlar', N'Tam tanımlı eskizler, ölçülendirme ve tasarım niyeti.', NULL, 1, '2026-11-07T17:49:39.0585859', 0, NULL, 300),
(406, 89, N'Katı modelleme', N'Ekstrüzyon, döndürme, desenler, yuvarlatma ve parametrik değişiklikler.', NULL, 2, '2026-11-07T17:49:39.0586599', 0, NULL, 480),
(407, 89, N'Montaj ve mekanizmalar', N'Eşleme kısıtları, hareket simülasyonu ve çakışma kontrolü.', NULL, 3, '2026-11-07T17:49:39.0586873', 0, NULL, 660),
(408, 89, N'Teknik resim ve üretim', N'Görünüşler, kesitler, toleranslar, malzeme seçimi ve 3B baskı hazırlığı.', NULL, 4, '2026-11-07T17:49:39.0587114', 0, NULL, 360),
(409, 90, N'Ağ temelleri', N'OSI ve TCP/IP modelleri, IP adresleme, DNS ve HTTP trafiğini Wireshark ile izleme.', NULL, 1, '2026-11-07T17:49:39.0670444', 0, NULL, 720),
(410, 90, N'Kriptografi ve kimlik doğrulama', N'Simetrik ve asimetrik şifreleme, özet fonksiyonları, TLS ve parola güvenliği.', NULL, 2, '2026-11-07T17:49:39.0671297', 0, NULL, 420),
(411, 90, N'Web uygulama güvenliği', N'OWASP Top 10: SQL enjeksiyonu, XSS, CSRF ve erişim kontrolü hataları.', NULL, 3, '2026-11-07T17:49:39.0671629', 0, NULL, 600),
(412, 90, N'Sızma testi ve savunma', N'Nmap ile keşif, zafiyet taraması, güvenlik duvarı kuralları ve olay müdahalesi.', NULL, 4, '2026-11-07T17:49:39.0671880', 0, NULL, 300),
(413, 91, N'Dart ve Flutter''a giriş', N'Dart sözdizimi, null güvenliği, Flutter kurulumu ve ilk ekran.', NULL, 1, '2026-11-07T17:49:39.0742258', 0, NULL, 1620),
(414, 91, N'Widget''lar ve yerleşim', N'Stateless ve stateful widget''lar, Row, Column, liste ve form bileşenleri.', NULL, 2, '2026-11-07T17:49:39.0742982', 0, NULL, 1020),
(415, 91, N'Durum yönetimi ve veri', N'Provider ile durum yönetimi, HTTP istekleri ve JSON ayrıştırma.', NULL, 3, '2026-11-07T17:49:39.0743263', 0, NULL, 1680),
(416, 91, N'Yerel depolama ve yayın', N'SQLite ile çevrimdışı veri, uygulama simgesi, imzalama ve mağazaya gönderme.', NULL, 4, '2026-11-07T17:49:39.0743497', 0, NULL, 1080),
(417, 92, N'Konteyner temelleri', N'Docker imajı, katmanlar, Dockerfile yazımı ve Compose ile çok servisli ortam.', NULL, 1, '2026-11-07T17:49:39.0818769', 0, NULL, 1320),
(418, 92, N'Kubernetes', N'Pod, Deployment, Service, ConfigMap ve otomatik ölçekleme.', NULL, 2, '2026-11-07T17:49:39.0819560', 0, NULL, 1980),
(419, 92, N'CI/CD hatları', N'GitHub Actions ile test, imaj üretimi ve otomatik dağıtım.', NULL, 3, '2026-11-07T17:49:39.0819866', 0, NULL, 1380),
(420, 92, N'Altyapı ve izleme', N'Terraform ile altyapı tanımlama, Prometheus ve Grafana ile izleme.', NULL, 4, '2026-11-07T17:49:39.0820124', 0, NULL, 2040),
(421, 93, N'Unity arayüzü ve C# betikleri', N'Sahne, nesne, bileşen yapısı ve ilk betik.', NULL, 1, '2026-11-07T17:49:39.0892617', 0, NULL, 1020),
(422, 93, N'Fizik ve karakter kontrolü', N'Rigidbody, çarpışmalar, zıplama ve kamera takibi.', NULL, 2, '2026-11-07T17:49:39.0893383', 0, NULL, 1680),
(423, 93, N'Animasyon, arayüz ve ses', N'Animator, sprite animasyonları, skor ekranı ve ses efektleri.', NULL, 3, '2026-11-07T17:49:39.0893670', 0, NULL, 1080),
(424, 93, N'Bölüm tasarımı ve yayın', N'Tilemap ile bölüm tasarımı, oyun döngüsü ve WebGL olarak yayınlama.', NULL, 4, '2026-11-07T17:49:39.0893905', 0, NULL, 1740),
(425, 94, N'Veri mimarisi', N'OLTP ve OLAP, veri ambarı, veri gölü ve yıldız şema modelleme.', NULL, 1, '2026-11-07T17:49:39.0963270', 0, NULL, 2700),
(426, 94, N'Apache Spark', N'DataFrame API, bölümleme, dağıtık dönüşümler ve performans ayarı.', NULL, 2, '2026-11-07T17:49:39.0963987', 0, NULL, 3720),
(427, 94, N'Akan veri', N'Kafka konuları, üretici ve tüketiciler, gerçek zamanlı işleme.', NULL, 3, '2026-11-07T17:49:39.0964266', 0, NULL, 2880),
(428, 94, N'İş akışı ve veri kalitesi', N'Airflow ile zamanlanmış hatlar, veri doğrulama ve izleme.', NULL, 4, '2026-11-07T17:49:39.0964502', 0, NULL, 3900),
(429, 95, N'Devlet, iktidar ve meşruiyet', N'Devletin unsurları, egemenlik, iktidar türleri ve meşruiyet kaynakları.', NULL, 1, '2026-11-07T17:49:39.1036279', 0, NULL, 3360),
(430, 95, N'Siyasi ideolojiler ve rejimler', N'Liberalizm, muhafazakârlık, sosyalizm; demokratik ve otoriter rejimlerin karşılaştırması.', NULL, 2, '2026-11-07T17:49:39.1037056', 0, NULL, 4380),
(431, 95, N'Seçimler, partiler ve kamuoyu', N'Seçim sistemleri, parti sistemleri, baskı grupları ve medyanın rolü.', NULL, 3, '2026-11-07T17:49:39.1037353', 0, NULL, 3540),
(432, 95, N'Uluslararası ilişkiler kuramları ve kurumlar', N'Realizm, liberalizm ve inşacılık; BM, NATO ve AB''nin işleyişi.', NULL, 4, '2026-11-07T17:49:39.1037584', 0, NULL, 2700),
(433, 96, N'Hukuk nedir, kaynakları nelerdir?', N'Hukuk kuralının özellikleri, yazılı ve yazısız kaynaklar, normlar hiyerarşisi.', NULL, 1, '2026-11-07T17:49:39.1107118', 0, NULL, 6360),
(434, 96, N'Hak, ehliyet ve kişilik', N'Hak türleri, hak ve fiil ehliyeti, gerçek ve tüzel kişiler.', NULL, 2, '2026-11-07T17:49:39.1107824', 0, NULL, 4920),
(435, 96, N'Yargı örgütü', N'Adli, idari ve anayasa yargısı; mahkemelerin görevleri ve kanun yolları.', NULL, 3, '2026-11-07T17:49:39.1108106', 0, NULL, 5340),
(436, 96, N'Türk anayasa tarihi', N'Kanun-ı Esasi''den 1982 Anayasası''na temel değişiklikler ve güncel düzen.', NULL, 4, '2026-11-07T17:49:39.1108345', 0, NULL, 5760),
(437, 97, N'Ahlak felsefesinin temel soruları', N'Ahlaki görecelik, iyi ve doğru kavramları, etik akıl yürütme.', NULL, 1, '2026-11-07T17:49:39.1183261', 0, NULL, 300),
(438, 97, N'Erdem, ödev ve fayda', N'Aristoteles, Kant ve Mill''in kuramları; güncel ahlaki ikilemler üzerinde uygulama.', NULL, 2, '2026-11-07T17:49:39.1183983', 0, NULL, 480),
(439, 97, N'Güzellik ve sanat felsefesi', N'Mimesis, beğeni yargısı ve sanatın tanımı üzerine klasik tartışmalar.', NULL, 3, '2026-11-07T17:49:39.1184269', 0, NULL, 660),
(440, 97, N'Çağdaş estetik ve eleştiri', N'Modern sanat, yorum kuramları ve bir eser hakkında gerekçeli eleştiri yazmak.', NULL, 4, '2026-11-07T17:49:39.1184527', 0, NULL, 360),
(441, 98, N'Fikirden probleme: müşteri keşfi', N'Varsayımları belirleme, müşteri görüşmeleri ve problem doğrulama.', NULL, 1, '2026-11-07T17:49:39.1255809', 0, NULL, 720),
(442, 98, N'İş modeli ve değer önerisi', N'İş modeli kanvası, değer önerisi tasarımı ve gelir modelleri.', NULL, 2, '2026-11-07T17:49:39.1256535', 0, NULL, 420),
(443, 98, N'Rekabet ve strateji', N'Porter''ın beş gücü, konumlandırma ve sürdürülebilir rekabet avantajı.', NULL, 3, '2026-11-07T17:49:39.1256814', 0, NULL, 600),
(444, 98, N'Birim ekonomisi ve yatırımcı sunumu', N'Müşteri edinme maliyeti, yaşam boyu değer, fiyatlandırma ve sunum hazırlığı.', NULL, 4, '2026-11-07T17:49:39.1257058', 0, NULL, 300),
(445, 99, N'Sınav formatı ve puanlama', N'Dört bölümün yapısı, band ölçütleri ve çalışma planı.', NULL, 1, '2026-11-07T17:49:39.1332601', 0, NULL, 1740),
(446, 99, N'Academic Reading ve Listening', N'Hızlı tarama, soru tiplerine göre strateji ve not alma.', NULL, 2, '2026-11-07T17:49:39.1333307', 0, NULL, 1140),
(447, 99, N'Writing Task 1 ve Task 2', N'Grafik betimleme ve tartışma yazısı kalıpları, örnek metin analizi.', NULL, 3, '2026-11-07T17:49:39.1333572', 0, NULL, 1800),
(448, 99, N'Speaking ve deneme sınavı', N'Üç bölümlük konuşma pratiği ve tam deneme sınavı değerlendirmesi.', NULL, 4, '2026-11-07T17:49:39.1333798', 0, NULL, 1200),
(449, 100, N'Blender arayüzü ve temel modelleme', N'Gezinme, nesne ve düzenleme modları, ekstrüzyon ve modifier''lar.', NULL, 1, '2026-11-07T17:49:39.1406670', 0, NULL, 1440),
(450, 100, N'Malzeme, doku ve ışık', N'Shader düzenleyici, UV açma ve üç nokta ışıklandırma.', NULL, 2, '2026-11-07T17:49:39.1407424', 0, NULL, 2100),
(451, 100, N'Animasyon ve kamera', N'Anahtar kareler, grafik düzenleyici ve kamera hareketleri.', NULL, 3, '2026-11-07T17:49:39.1407702', 0, NULL, 1500),
(452, 100, N'Render ve hareketli grafik projesi', N'Eevee ve Cycles ile render alma, kısa bir logo animasyonu hazırlama.', NULL, 4, '2026-11-07T17:49:39.1407937', 0, NULL, 900),
(453, 101, N'Kil ve elle şekillendirme', N'Kil türleri, çimdikleme, fitil ve plaka yöntemleri.', NULL, 1, '2026-11-07T17:49:39.1481886', 0, NULL, 1140),
(454, 101, N'Çömlekçi çarkına giriş', N'Merkezleme, kap çekme ve tornalama.', NULL, 2, '2026-11-07T17:49:39.1482860', 0, NULL, 1800),
(455, 101, N'Figür ve form heykeli', N'Oran, denge ve kütle; armatürle küçük figür çalışması.', NULL, 3, '2026-11-07T17:49:39.1483145', 0, NULL, 1200),
(456, 101, N'Sır, pişirim ve sergileme', N'Astar ve sır uygulama, fırın süreçleri ve eserin sunumu.', NULL, 4, '2026-11-07T17:49:39.1483385', 0, NULL, 1860),
(457, 102, N'Ableton Live ve ilk ritim', N'Oturum ve düzenleme görünümleri, MIDI ile davul programlama.', NULL, 1, '2026-11-07T17:49:39.1556725', 0, NULL, 4260),
(458, 102, N'Sentezleyici ve ses tasarımı', N'Osilatör, filtre ve zarf; kendi bas ve pad seslerinizi yaratma.', NULL, 2, '2026-11-07T17:49:39.1557522', 0, NULL, 3420),
(459, 102, N'Örnekleme ve düzenleme', N'Sample kesme, warp, parça yapısı ve geçişler.', NULL, 3, '2026-11-07T17:49:39.1557812', 0, NULL, 4440),
(460, 102, N'Miks ve mastering', N'EQ, kompresör, reverb ve yayına hazır ses seviyesi.', NULL, 4, '2026-11-07T17:49:39.1558086', 0, NULL, 3600),
(461, 103, N'Anatomi ve biyomekaniğin temelleri', N'Kas-iskelet sistemi, eklem hareketleri ve kuvvet kolları.', NULL, 1, '2026-11-07T17:49:39.1633976', 0, NULL, 3060),
(462, 103, N'Hareket analizi', N'Squat, hinge ve itme-çekme kalıplarında doğru teknik ve sık hatalar.', NULL, 2, '2026-11-07T17:49:39.1634716', 0, NULL, 4080),
(463, 103, N'Sık görülen sakatlıklar', N'Diz, omuz ve bel sakatlıklarının mekanizmaları ve risk faktörleri.', NULL, 3, '2026-11-07T17:49:39.1634993', 0, NULL, 3240),
(464, 103, N'Önleyici program tasarımı', N'Isınma, mobilite, denge ve kademeli yüklenme ile kişisel program.', NULL, 4, '2026-11-07T17:49:39.1635232', 0, NULL, 4260),
(465, 104, N'Araştırma sorusu ve literatür taraması', N'Soru ve hipotez kurma, akademik veri tabanlarında arama.', NULL, 1, '2026-11-07T17:49:39.1707520', 0, NULL, 5160),
(466, 104, N'Nicel ve nitel yöntemler', N'Deney, anket, görüşme ve gözlem; örneklem seçimi.', NULL, 2, '2026-11-07T17:49:39.1708232', 0, NULL, 5580),
(467, 104, N'Veri toplama ve analiz', N'Ölçme araçları, geçerlik-güvenirlik ve temel analiz yaklaşımları.', NULL, 3, '2026-11-07T17:49:39.1708505', 0, NULL, 6000),
(468, 104, N'Kaynak gösterme ve bilimsel etik', N'APA kaynakçası, intihal, veri uydurma ve etik kurul süreçleri.', NULL, 4, '2026-11-07T17:49:39.1708739', 0, NULL, 6420);
SET IDENTITY_INSERT [Lessons] OFF;
-- Enrollments (201)
SET IDENTITY_INSERT [Enrollments] ON;
INSERT INTO [Enrollments] ([Id], [StudentId], [CourseId], [Grade], [EnrollmentDate], [DeletedAt], [IsDeleted], [Status]) VALUES
(1, 1, 1, 55.00, '2026-11-04T17:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(2, 1, 30, 62.00, '2026-09-18T16:49:39.1921552', NULL, 0, N'Tamamlandı'),
(3, 2, 14, 68.00, '2026-10-04T16:49:39.1921552', NULL, 0, N'Tamamlandı'),
(4, 2, 43, 75.00, '2026-08-18T15:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(5, 2, 72, 82.00, '2026-07-02T14:49:39.1921552', NULL, 0, N'Tamamlandı'),
(6, 2, 101, 89.00, '2026-11-02T13:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(7, 2, 26, 96.00, '2026-09-16T12:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(8, 3, 27, 81.00, '2026-09-03T15:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(9, 3, 56, 88.00, '2026-07-18T14:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(10, 3, 85, 95.00, '2026-06-01T13:49:39.1921552', NULL, 0, N'Tamamlandı'),
(11, 3, 10, 57.00, '2026-10-02T12:49:39.1921552', NULL, 0, N'Tamamlandı'),
(12, 4, 40, 94.00, '2026-08-03T14:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(13, 4, 69, 56.00, '2026-06-17T13:49:39.1921552', NULL, 0, N'Tamamlandı'),
(14, 4, 98, 63.00, '2026-10-18T12:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(15, 5, 53, 62.00, '2026-07-03T13:49:39.1921552', NULL, 0, N'Tamamlandı'),
(16, 5, 82, 69.00, '2026-11-03T12:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(17, 6, 66, 75.00, '2026-06-02T12:49:39.1921552', NULL, 0, N'Tamamlandı'),
(18, 6, 95, 82.00, '2026-10-03T11:49:39.1921552', NULL, 0, N'Tamamlandı'),
(19, 6, 20, 89.00, '2026-08-17T10:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(20, 6, 49, 96.00, '2026-07-01T09:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(21, 6, 78, 58.00, '2026-11-01T17:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(22, 7, 79, 88.00, '2026-10-19T11:49:39.1921552', NULL, 0, N'Tamamlandı'),
(23, 7, 4, 95.00, '2026-09-02T10:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(24, 7, 33, 57.00, '2026-07-17T09:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(25, 7, 62, 64.00, '2026-05-31T17:49:39.1921552', NULL, 0, N'Tamamlandı'),
(26, 8, 92, 56.00, '2026-09-18T10:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(27, 8, 17, 63.00, '2026-08-02T09:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(28, 8, 46, 70.00, '2026-06-16T17:49:39.1921552', NULL, 0, N'Tamamlandı'),
(29, 9, 1, 69.00, '2026-08-18T09:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(30, 9, 30, 76.00, '2026-07-02T17:49:39.1921552', NULL, 0, N'Tamamlandı'),
(31, 10, 14, 82.00, '2026-07-18T17:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(32, 10, 43, 89.00, '2026-06-01T16:49:39.1921552', NULL, 0, N'Tamamlandı'),
(33, 10, 72, 96.00, '2026-10-02T15:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(34, 10, 101, 58.00, '2026-08-16T14:49:39.1921552', NULL, 0, N'Tamamlandı'),
(35, 10, 26, 65.00, '2026-06-30T13:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(36, 11, 27, 95.00, '2026-06-17T16:49:39.1921552', NULL, 0, N'Tamamlandı'),
(37, 11, 56, 57.00, '2026-10-18T15:49:39.1921552', NULL, 0, N'Tamamlandı'),
(38, 11, 85, 64.00, '2026-09-01T14:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(39, 11, 10, 71.00, '2026-07-16T13:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(40, 12, 40, 63.00, '2026-11-03T15:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(41, 12, 69, 70.00, '2026-09-17T14:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(42, 12, 98, 77.00, '2026-08-01T13:49:39.1921552', NULL, 0, N'Tamamlandı'),
(43, 13, 53, 76.00, '2026-10-03T14:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(44, 13, 82, 83.00, '2026-08-17T13:49:39.1921552', NULL, 0, N'Tamamlandı'),
(45, 14, 66, 89.00, '2026-09-02T13:49:39.1921552', NULL, 0, N'Tamamlandı'),
(46, 14, 95, 96.00, '2026-07-17T12:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(47, 14, 20, 58.00, '2026-05-31T11:49:39.1921552', NULL, 0, N'Tamamlandı'),
(48, 14, 49, 65.00, '2026-10-01T10:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(49, 14, 78, 72.00, '2026-08-15T09:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(50, 15, 79, 57.00, '2026-08-02T12:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(51, 15, 4, 64.00, '2026-06-16T11:49:39.1921552', NULL, 0, N'Tamamlandı'),
(52, 15, 33, 71.00, '2026-10-17T10:49:39.1921552', NULL, 0, N'Tamamlandı'),
(53, 15, 62, 78.00, '2026-08-31T09:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(54, 16, 92, 70.00, '2026-07-02T11:49:39.1921552', NULL, 0, N'Tamamlandı'),
(55, 16, 17, 77.00, '2026-11-02T10:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(56, 16, 46, 84.00, '2026-09-16T09:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(57, 17, 1, 83.00, '2026-06-01T10:49:39.1921552', NULL, 0, N'Tamamlandı'),
(58, 17, 30, 90.00, '2026-10-02T09:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(59, 18, 14, 96.00, '2026-10-18T09:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(60, 18, 43, 58.00, '2026-09-01T17:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(61, 18, 72, 65.00, '2026-07-16T16:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(62, 18, 101, 72.00, '2026-05-30T15:49:39.1921552', NULL, 0, N'Tamamlandı'),
(63, 18, 26, 79.00, '2026-09-30T14:49:39.1921552', NULL, 0, N'Tamamlandı'),
(64, 19, 27, 64.00, '2026-09-17T17:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(65, 19, 56, 71.00, '2026-08-01T16:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(66, 19, 85, 78.00, '2026-06-15T15:49:39.1921552', NULL, 0, N'Tamamlandı'),
(67, 19, 10, 85.00, '2026-10-16T14:49:39.1921552', NULL, 0, N'Tamamlandı'),
(68, 20, 40, 77.00, '2026-08-17T16:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(69, 20, 69, 84.00, '2026-07-01T15:49:39.1921552', NULL, 0, N'Tamamlandı'),
(70, 20, 98, 91.00, '2026-11-01T14:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(71, 21, 53, 90.00, '2026-07-17T15:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(72, 21, 82, 97.00, '2026-05-31T14:49:39.1921552', NULL, 0, N'Tamamlandı'),
(73, 22, 66, 58.00, '2026-06-16T14:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(74, 22, 95, 65.00, '2026-10-17T13:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(75, 22, 20, 72.00, '2026-08-31T12:49:39.1921552', NULL, 0, N'Tamamlandı'),
(76, 22, 49, 79.00, '2026-07-15T11:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(77, 22, 78, 86.00, '2026-05-29T10:49:39.1921552', NULL, 0, N'Tamamlandı'),
(78, 23, 79, 71.00, '2026-11-02T13:49:39.1921552', NULL, 0, N'Tamamlandı'),
(79, 23, 4, 78.00, '2026-09-16T12:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(80, 23, 33, 85.00, '2026-07-31T11:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(81, 23, 62, 92.00, '2026-06-14T10:49:39.1921552', NULL, 0, N'Tamamlandı'),
(82, 24, 92, 84.00, '2026-10-02T12:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(83, 24, 17, 91.00, '2026-08-16T11:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(84, 24, 46, 98.00, '2026-06-30T10:49:39.1921552', NULL, 0, N'Tamamlandı'),
(85, 25, 1, 97.00, '2026-09-01T11:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(86, 25, 30, 59.00, '2026-07-16T10:49:39.1921552', NULL, 0, N'Tamamlandı'),
(87, 26, 14, 65.00, '2026-08-01T10:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(88, 26, 43, 72.00, '2026-06-15T09:49:39.1921552', NULL, 0, N'Tamamlandı'),
(89, 26, 72, 79.00, '2026-10-16T17:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(90, 26, 101, 86.00, '2026-08-30T16:49:39.1921552', NULL, 0, N'Tamamlandı'),
(91, 26, 26, 93.00, '2026-07-14T15:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(92, 27, 27, 78.00, '2026-07-01T09:49:39.1921552', NULL, 0, N'Tamamlandı'),
(93, 27, 56, 85.00, '2026-11-01T17:49:39.1921552', NULL, 0, N'Tamamlandı'),
(94, 27, 85, 92.00, '2026-09-15T16:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(95, 27, 10, 99.00, '2026-07-30T15:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(96, 28, 40, 91.00, '2026-05-31T17:49:39.1921552', NULL, 0, N'Tamamlandı'),
(97, 28, 69, 98.00, '2026-10-01T16:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(98, 28, 98, 60.00, '2026-08-15T15:49:39.1921552', NULL, 0, N'Devam Ediyor'),
(99, 4, 16, 0.00, '2026-09-21T17:49:39.1921552', '2026-09-23T17:49:39.1921552', 1, N'Devam Ediyor'),
(100, 11, 12, 0.00, '2026-07-20T17:49:39.1921552', '2026-07-22T17:49:39.1921552', 1, N'Devam Ediyor'),
(101, 18, 6, 0.00, '2026-10-05T17:49:39.1921552', '2026-10-07T17:49:39.1921552', 1, N'Devam Ediyor'),
(102, 25, 2, 0.00, '2026-08-03T17:49:39.1921552', '2026-08-05T17:49:39.1921552', 1, N'Devam Ediyor'),
(103, 29, 93, 59.00, '2026-11-07T16:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(104, 29, 18, 66.00, '2026-11-04T16:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(105, 29, 47, 73.00, '2026-10-28T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(106, 30, 100, 72.00, '2026-11-06T15:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(107, 30, 25, 79.00, '2026-11-03T15:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(108, 30, 54, 86.00, '2026-10-23T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(109, 31, 3, 85.00, '2026-11-05T14:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(110, 31, 32, 92.00, '2026-11-02T14:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(111, 31, 61, 99.00, '2026-10-18T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(112, 32, 10, 98.00, '2026-11-04T13:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(113, 32, 39, 60.00, '2026-11-07T13:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(114, 32, 68, 67.00, '2026-10-13T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(115, 33, 17, 66.00, '2026-11-03T12:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(116, 33, 46, 73.00, '2026-11-06T12:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(117, 33, 75, 80.00, '2026-10-28T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(118, 34, 24, 79.00, '2026-11-02T11:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(119, 34, 53, 86.00, '2026-11-05T11:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(120, 34, 82, 93.00, '2026-10-23T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(121, 35, 31, 92.00, '2026-11-07T10:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(122, 35, 60, 99.00, '2026-11-04T10:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(123, 35, 89, 61.00, '2026-10-18T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(124, 36, 38, 60.00, '2026-11-06T09:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(125, 36, 67, 67.00, '2026-11-03T09:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(126, 36, 96, 74.00, '2026-10-13T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(127, 37, 45, 73.00, '2026-11-05T08:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(128, 37, 74, 80.00, '2026-11-02T08:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(129, 37, 103, 87.00, '2026-10-28T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(130, 38, 52, 86.00, '2026-11-04T07:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(131, 38, 81, 93.00, '2026-11-07T07:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(132, 38, 6, 55.00, '2026-10-23T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(133, 39, 59, 99.00, '2026-11-03T06:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(134, 39, 88, 61.00, '2026-11-06T06:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(135, 39, 13, 68.00, '2026-10-18T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(136, 40, 66, 67.00, '2026-11-02T05:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(137, 40, 95, 74.00, '2026-11-05T05:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(138, 40, 20, 81.00, '2026-10-13T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(139, 41, 73, 80.00, '2026-11-07T04:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(140, 41, 102, 87.00, '2026-11-04T04:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(141, 41, 27, 94.00, '2026-10-28T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(142, 42, 80, 93.00, '2026-11-06T03:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(143, 42, 5, 55.00, '2026-11-03T03:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(144, 42, 34, 62.00, '2026-10-23T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(145, 43, 87, 61.00, '2026-11-05T02:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(146, 43, 12, 68.00, '2026-11-02T02:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(147, 43, 41, 75.00, '2026-10-18T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(148, 44, 94, 74.00, '2026-11-04T01:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(149, 44, 19, 81.00, '2026-11-07T01:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(150, 44, 48, 88.00, '2026-10-13T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(151, 45, 101, 87.00, '2026-11-03T00:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(152, 45, 26, 94.00, '2026-11-06T00:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(153, 45, 55, 56.00, '2026-10-28T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(154, 46, 4, 55.00, '2026-11-01T23:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(155, 46, 33, 62.00, '2026-11-04T23:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(156, 46, 62, 69.00, '2026-10-23T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(157, 47, 11, 68.00, '2026-11-06T22:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(158, 47, 40, 75.00, '2026-11-03T22:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(159, 47, 69, 82.00, '2026-10-18T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(160, 48, 18, 81.00, '2026-11-05T21:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(161, 48, 47, 88.00, '2026-11-02T21:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(162, 48, 76, 95.00, '2026-10-13T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(163, 49, 25, 94.00, '2026-11-05T16:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(164, 49, 54, 56.00, '2026-11-02T16:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(165, 49, 83, 63.00, '2026-10-28T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(166, 50, 32, 62.00, '2026-11-04T15:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(167, 50, 61, 69.00, '2026-11-07T15:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(168, 50, 90, 76.00, '2026-10-23T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(169, 51, 39, 75.00, '2026-11-03T14:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(170, 51, 68, 82.00, '2026-11-06T14:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(171, 51, 97, 89.00, '2026-10-18T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(172, 52, 46, 88.00, '2026-11-02T13:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(173, 52, 75, 95.00, '2026-11-05T13:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(174, 52, 104, 57.00, '2026-10-13T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(175, 53, 53, 56.00, '2026-11-07T12:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(176, 53, 82, 63.00, '2026-11-04T12:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(177, 53, 7, 70.00, '2026-10-28T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(178, 54, 60, 69.00, '2026-11-06T11:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(179, 54, 89, 76.00, '2026-11-03T11:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(180, 54, 14, 83.00, '2026-10-23T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(181, 55, 67, 82.00, '2026-11-05T10:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(182, 55, 96, 89.00, '2026-11-02T10:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(183, 55, 21, 96.00, '2026-10-18T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(184, 56, 74, 95.00, '2026-11-04T09:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(185, 56, 103, 57.00, '2026-11-07T09:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(186, 56, 28, 64.00, '2026-10-13T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(187, 57, 81, 63.00, '2026-11-03T08:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(188, 57, 6, 70.00, '2026-11-06T08:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(189, 57, 35, 77.00, '2026-10-28T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(190, 58, 88, 76.00, '2026-11-02T07:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(191, 58, 13, 83.00, '2026-11-05T07:49:40.5751557', NULL, 0, N'Devam Ediyor'),
(192, 58, 42, 90.00, '2026-10-23T17:49:40.5751557', NULL, 0, N'Tamamlandı'),
(193, 32, 37, 0.00, '2026-06-01T17:49:40.5751557', '2026-06-03T17:49:40.5751557', 1, N'Devam Ediyor'),
(194, 39, 32, 0.00, '2026-08-17T17:49:40.5751557', '2026-08-19T17:49:40.5751557', 1, N'Devam Ediyor'),
(195, 46, 27, 0.00, '2026-06-15T17:49:40.5751557', '2026-06-17T17:49:40.5751557', 1, N'Devam Ediyor'),
(196, 53, 22, 0.00, '2026-08-31T17:49:40.5751557', '2026-09-02T17:49:40.5751557', 1, N'Devam Ediyor'),
(197, 59, 4, 0.00, '2026-06-10T17:49:43.4359191', NULL, 0, N'Tamamlandı'),
(198, 59, 5, 0.00, '2026-07-10T17:49:43.4359191', NULL, 0, N'Tamamlandı'),
(199, 59, 37, 0.00, '2026-08-09T17:49:43.4359191', NULL, 0, N'Devam Ediyor'),
(200, 59, 6, 0.00, '2026-09-08T17:49:43.4359191', NULL, 0, N'Devam Ediyor'),
(201, 59, 18, 0.00, '2026-10-08T17:49:43.4359191', NULL, 0, N'Devam Ediyor');
SET IDENTITY_INSERT [Enrollments] OFF;
-- LessonCompletions (590)
SET IDENTITY_INSERT [LessonCompletions] ON;
INSERT INTO [LessonCompletions] ([Id], [StudentId], [LessonId], [CompletedAt]) VALUES
(1, 1, 121, '2026-09-28T17:01:39.4056466'),
(2, 1, 122, '2026-10-08T17:13:39.6191380'),
(3, 1, 123, '2026-10-18T17:25:39.8326294'),
(4, 1, 124, '2026-10-28T17:37:40.0461208'),
(5, 1, 1, '2026-11-05T11:49:39.4590194'),
(6, 1, 2, '2026-11-06T05:49:39.7258837'),
(7, 1, 3, '2026-11-06T23:49:39.9927480'),
(8, 2, 337, '2026-07-28T05:49:39.4108414'),
(9, 2, 338, '2026-08-22T20:49:39.6295276'),
(10, 2, 339, '2026-09-17T11:49:39.8482137'),
(11, 2, 340, '2026-10-13T02:49:40.0669000'),
(12, 2, 196, '2026-09-03T21:01:39.4108414'),
(13, 2, 197, '2026-09-20T02:13:39.6295276'),
(14, 2, 198, '2026-10-06T07:25:39.8482138'),
(15, 2, 199, '2026-10-22T12:37:40.0669000'),
(16, 2, 105, '2026-10-12T15:19:39.7388707'),
(17, 2, 55, '2026-10-10T08:59:39.3743937'),
(18, 2, 56, '2026-10-16T01:09:39.5566322'),
(19, 2, 57, '2026-10-21T17:19:39.7388707'),
(20, 2, 58, '2026-10-27T09:29:39.9211092'),
(21, 2, 59, '2026-11-02T01:39:40.1033477'),
(22, 2, 453, '2026-11-04T07:09:39.5566322'),
(23, 2, 454, '2026-11-06T00:29:39.9211092'),
(24, 3, 389, '2026-07-03T09:49:39.4122548'),
(25, 3, 390, '2026-08-04T05:49:39.6323545'),
(26, 3, 391, '2026-09-05T01:49:39.8524542'),
(27, 3, 392, '2026-10-06T21:49:40.0725539'),
(28, 3, 271, '2026-08-15T15:34:39.4672797'),
(29, 3, 272, '2026-09-12T16:19:39.7424043'),
(30, 3, 273, '2026-10-10T17:04:40.0175289'),
(31, 3, 109, '2026-10-06T04:49:39.7424043'),
(32, 3, 39, '2026-10-09T18:37:39.4122548'),
(33, 3, 40, '2026-10-17T00:25:39.6323545'),
(34, 3, 41, '2026-10-24T06:13:39.8524542'),
(35, 3, 42, '2026-10-31T12:01:40.0725539'),
(36, 4, 325, '2026-07-16T05:01:39.4135970'),
(37, 4, 326, '2026-08-13T20:13:39.6350389'),
(38, 4, 327, '2026-09-11T11:25:39.8564807'),
(39, 4, 328, '2026-10-10T02:37:40.0779226'),
(40, 4, 179, '2026-08-22T20:13:39.4135970'),
(41, 4, 180, '2026-09-11T01:37:39.6350389'),
(42, 4, 181, '2026-09-30T07:01:39.8564807'),
(43, 4, 182, '2026-10-19T12:25:40.0779226'),
(44, 4, 441, '2026-10-28T15:19:39.7457598'),
(45, 5, 255, '2026-07-24T18:29:39.3770909'),
(46, 5, 256, '2026-08-14T23:09:39.5620267'),
(47, 5, 257, '2026-09-05T03:49:39.7469625'),
(48, 5, 258, '2026-09-26T08:29:39.9318983'),
(49, 5, 259, '2026-10-17T13:09:40.1168341'),
(50, 5, 377, '2026-11-04T14:04:39.4695588'),
(51, 5, 378, '2026-11-05T15:19:39.7469625'),
(52, 5, 379, '2026-11-06T16:34:40.0243662'),
(53, 6, 313, '2026-07-04T04:13:39.4145282'),
(54, 6, 314, '2026-08-04T19:37:39.6369013'),
(55, 6, 315, '2026-09-05T11:01:39.8592743'),
(56, 6, 316, '2026-10-07T02:25:40.0816474'),
(57, 6, 231, '2026-07-27T06:37:39.4145282'),
(58, 6, 232, '2026-08-22T03:25:39.6369013'),
(59, 6, 233, '2026-09-17T00:13:39.8592743'),
(60, 6, 234, '2026-10-12T21:01:40.0816474'),
(61, 6, 81, '2026-09-27T14:19:39.7480878'),
(62, 6, 429, '2026-10-10T13:01:39.4145282'),
(63, 6, 430, '2026-10-17T14:13:39.6369013'),
(64, 6, 431, '2026-10-24T15:25:39.8592743'),
(65, 6, 432, '2026-10-31T16:37:40.0816474'),
(66, 6, 361, '2026-11-03T17:49:39.5627769'),
(67, 6, 362, '2026-11-05T17:49:39.9333987'),
(68, 7, 297, '2026-07-02T17:49:39.4149494'),
(69, 7, 298, '2026-08-03T17:49:39.6377437'),
(70, 7, 299, '2026-09-04T17:49:39.8605379'),
(71, 7, 300, '2026-10-06T17:49:40.0833322'),
(72, 7, 134, '2026-08-09T01:49:39.4149494'),
(73, 7, 135, '2026-08-31T17:49:39.6377437'),
(74, 7, 136, '2026-09-23T09:49:39.8605379'),
(75, 7, 137, '2026-10-16T01:49:40.0833322'),
(76, 7, 14, '2026-10-05T14:19:39.7491408'),
(77, 7, 365, '2026-10-23T08:13:39.4149494'),
(78, 7, 366, '2026-10-27T04:37:39.6377437'),
(79, 7, 367, '2026-10-31T01:01:39.8605379'),
(80, 7, 368, '2026-11-03T21:25:40.0833322'),
(81, 8, 213, '2026-07-07T07:32:30.7801546'),
(82, 8, 214, '2026-07-27T21:15:22.3681541'),
(83, 8, 215, '2026-08-17T10:58:13.9561535'),
(84, 8, 216, '2026-09-07T00:41:05.5441530'),
(85, 8, 217, '2026-09-27T14:23:57.1321524'),
(86, 8, 218, '2026-10-18T04:06:48.7201519'),
(87, 8, 69, '2026-08-26T17:49:39.4711542'),
(88, 8, 70, '2026-09-20T01:49:39.7501532'),
(89, 8, 71, '2026-10-14T09:49:40.0291523'),
(90, 8, 417, '2026-10-13T14:19:39.7501532'),
(91, 9, 121, '2026-07-28T08:13:39.4160133'),
(92, 9, 122, '2026-08-22T22:37:39.6398714'),
(93, 9, 123, '2026-09-17T13:01:39.8637295'),
(94, 9, 124, '2026-10-13T03:25:40.0875876'),
(95, 9, 1, '2026-09-07T17:49:39.4719778'),
(96, 9, 2, '2026-09-28T01:49:39.7518004'),
(97, 9, 3, '2026-10-18T09:49:40.0316231'),
(98, 10, 196, '2026-06-24T10:06:47.9239884'),
(99, 10, 197, '2026-07-17T03:23:56.6558216'),
(100, 10, 198, '2026-08-08T20:41:05.3876548'),
(101, 10, 199, '2026-08-31T13:58:14.1194881'),
(102, 10, 200, '2026-09-23T07:15:22.8513213'),
(103, 10, 201, '2026-10-16T00:32:31.5831545'),
(104, 10, 105, '2026-08-02T02:49:39.4728633'),
(105, 10, 106, '2026-09-03T15:49:39.7535714'),
(106, 10, 107, '2026-10-06T04:49:40.0342796'),
(107, 10, 55, '2026-09-12T17:49:39.7535714'),
(108, 10, 453, '2026-09-02T05:49:39.4167217'),
(109, 10, 454, '2026-09-18T20:49:39.6412882'),
(110, 10, 455, '2026-10-05T11:49:39.8658547'),
(111, 10, 456, '2026-10-22T02:49:40.0904212'),
(112, 10, 337, '2026-10-14T16:29:39.5664327'),
(113, 10, 338, '2026-10-26T17:09:39.9407102'),
(114, 11, 109, '2026-07-16T07:25:39.4176482'),
(115, 11, 110, '2026-08-13T22:01:39.6431413'),
(116, 11, 111, '2026-09-11T12:37:39.8686343'),
(117, 11, 112, '2026-10-10T03:13:40.0941274'),
(118, 11, 39, '2026-08-14T02:49:39.4740215'),
(119, 11, 40, '2026-09-11T15:49:39.7558878'),
(120, 11, 41, '2026-10-10T04:49:40.0377541'),
(121, 11, 389, '2026-10-05T04:19:39.7558878'),
(122, 11, 271, '2026-10-22T00:09:39.3800660'),
(123, 11, 272, '2026-10-25T08:29:39.5679769'),
(124, 11, 273, '2026-10-28T16:49:39.7558878'),
(125, 11, 274, '2026-11-01T01:09:39.9437987'),
(126, 11, 275, '2026-11-04T09:29:40.1317096'),
(127, 12, 441, '2026-08-21T05:01:39.4181600'),
(128, 12, 442, '2026-09-09T20:13:39.6441649'),
(129, 12, 443, '2026-09-29T11:25:39.8701697'),
(130, 12, 444, '2026-10-19T02:37:40.0961746'),
(131, 12, 325, '2026-09-30T09:34:39.4746612'),
(132, 12, 326, '2026-10-13T04:19:39.7571673'),
(133, 12, 327, '2026-10-25T23:04:40.0396734'),
(134, 12, 179, '2026-11-05T16:49:39.7571673'),
(135, 13, 377, '2026-09-03T00:13:39.4187504'),
(136, 13, 378, '2026-09-19T10:37:39.6453456'),
(137, 13, 379, '2026-10-05T21:01:39.8719408'),
(138, 13, 380, '2026-10-22T07:25:40.0985360'),
(139, 13, 255, '2026-10-12T09:34:39.4753992'),
(140, 13, 256, '2026-10-21T04:19:39.7586432'),
(141, 13, 257, '2026-10-29T23:04:40.0418872'),
(142, 14, 81, '2026-07-02T13:01:39.4194213'),
(143, 14, 82, '2026-08-03T14:13:39.6466874'),
(144, 14, 83, '2026-09-04T15:25:39.8739536'),
(145, 14, 84, '2026-10-06T16:37:40.1012197'),
(146, 14, 429, '2026-08-14T20:04:39.4762378'),
(147, 14, 430, '2026-09-12T03:19:39.7603205'),
(148, 14, 431, '2026-10-10T10:34:40.0444032'),
(149, 14, 361, '2026-09-26T13:49:39.7603205'),
(150, 14, 313, '2026-09-15T19:25:39.4194213'),
(151, 14, 314, '2026-09-29T01:01:39.6466874'),
(152, 14, 315, '2026-10-12T06:37:39.8739536'),
(153, 14, 316, '2026-10-25T12:13:40.1012197'),
(154, 14, 231, '2026-10-10T18:34:39.4762378'),
(155, 14, 232, '2026-10-20T02:19:39.7603205'),
(156, 14, 233, '2026-10-29T10:04:40.0444032'),
(157, 15, 14, '2026-07-15T08:13:39.4202348'),
(158, 15, 15, '2026-08-13T04:37:39.6483144'),
(159, 15, 16, '2026-09-11T01:01:39.8763941'),
(160, 15, 17, '2026-10-09T21:25:40.1044737'),
(161, 15, 365, '2026-08-26T20:04:39.4772547'),
(162, 15, 366, '2026-09-20T03:19:39.7623543'),
(163, 15, 367, '2026-10-14T10:34:40.0474538'),
(164, 15, 297, '2026-10-04T13:49:39.7623542'),
(165, 15, 134, '2026-10-20T11:49:39.3550692'),
(166, 15, 135, '2026-10-23T12:49:39.5179832'),
(167, 15, 136, '2026-10-26T13:49:39.6808972'),
(168, 15, 137, '2026-10-29T14:49:39.8438113'),
(169, 15, 138, '2026-11-01T15:49:40.0067253'),
(170, 15, 139, '2026-11-04T16:49:40.1696393'),
(171, 16, 417, '2026-07-28T03:25:39.4207037'),
(172, 16, 418, '2026-08-22T19:01:39.6492523'),
(173, 16, 419, '2026-09-17T10:37:39.8778010'),
(174, 16, 420, '2026-10-13T02:13:40.1063495'),
(175, 16, 213, '2026-09-26T21:01:39.4207038'),
(176, 16, 214, '2026-10-07T08:13:39.6492524'),
(177, 16, 215, '2026-10-17T19:25:39.8778010'),
(178, 16, 216, '2026-10-28T06:37:40.1063496'),
(179, 16, 69, '2026-11-05T02:19:39.7635267'),
(180, 17, 1, '2026-06-27T23:59:39.3829201'),
(181, 17, 2, '2026-07-24T13:09:39.5736851'),
(182, 17, 3, '2026-08-20T02:19:39.7644501'),
(183, 17, 4, '2026-09-15T15:29:39.9552150'),
(184, 17, 5, '2026-10-12T04:39:40.1459800'),
(185, 17, 121, '2026-10-11T11:49:39.4783026'),
(186, 17, 122, '2026-10-20T13:49:39.7644501'),
(187, 17, 123, '2026-10-29T15:49:40.0505975'),
(188, 18, 453, '2026-07-01T21:01:39.4214444'),
(189, 18, 454, '2026-08-03T02:13:39.6507336'),
(190, 18, 455, '2026-09-04T07:25:39.8800228'),
(191, 18, 456, '2026-10-06T12:37:40.1093120'),
(192, 18, 337, '2026-08-14T05:04:39.4787667'),
(193, 18, 338, '2026-09-11T17:19:39.7653782'),
(194, 18, 339, '2026-10-10T05:34:40.0519897'),
(195, 18, 196, '2026-10-05T05:49:39.7653782'),
(196, 18, 105, '2026-10-08T05:49:39.4214444'),
(197, 18, 106, '2026-10-15T20:49:39.6507336'),
(198, 18, 107, '2026-10-23T11:49:39.8800228'),
(199, 18, 108, '2026-10-31T02:49:40.1093120'),
(200, 18, 55, '2026-10-25T04:29:39.5743038'),
(201, 18, 56, '2026-10-31T23:09:39.9564525'),
(202, 19, 389, '2026-07-14T16:13:39.4220236'),
(203, 19, 390, '2026-08-12T16:37:39.6518920'),
(204, 19, 391, '2026-09-10T17:01:39.8817605'),
(205, 19, 392, '2026-10-09T17:25:40.1116289'),
(206, 19, 271, '2026-08-26T05:04:39.4794907'),
(207, 19, 272, '2026-09-19T17:19:39.7668263'),
(208, 19, 273, '2026-10-14T05:34:40.0541618'),
(209, 19, 109, '2026-10-13T05:49:39.7668263'),
(210, 19, 39, '2026-10-21T01:01:39.4220236'),
(211, 19, 40, '2026-10-25T11:13:39.6518920'),
(212, 19, 41, '2026-10-29T21:25:39.8817605'),
(213, 19, 42, '2026-11-03T07:37:40.1116289'),
(214, 20, 325, '2026-07-27T11:25:39.4224691'),
(215, 20, 326, '2026-08-22T07:01:39.6527830'),
(216, 20, 327, '2026-09-17T02:37:39.8830968'),
(217, 20, 328, '2026-10-12T22:13:40.1134108'),
(218, 20, 179, '2026-09-03T02:37:39.4224690'),
(219, 20, 180, '2026-09-19T12:25:39.6527829'),
(220, 20, 181, '2026-10-05T22:13:39.8830968'),
(221, 20, 182, '2026-10-22T08:01:40.1134107'),
(222, 20, 441, '2026-11-04T16:19:39.7679399'),
(223, 21, 377, '2026-07-02T15:25:39.4228254'),
(224, 21, 378, '2026-08-03T16:01:39.6534957'),
(225, 21, 379, '2026-09-04T16:37:39.8841661'),
(226, 21, 380, '2026-10-06T17:13:40.1148363'),
(227, 21, 255, '2026-08-14T22:19:39.4804930'),
(228, 21, 256, '2026-09-12T04:49:39.7688309'),
(229, 21, 257, '2026-10-10T11:19:40.0571688'),
(230, 22, 361, '2026-06-30T21:49:39.4232797'),
(231, 22, 362, '2026-08-02T08:49:39.6544043'),
(232, 22, 363, '2026-09-03T19:49:39.8855290'),
(233, 22, 364, '2026-10-06T06:49:40.1166535'),
(234, 22, 313, '2026-07-22T15:34:39.4810609'),
(235, 22, 314, '2026-08-27T16:19:39.7699666'),
(236, 22, 315, '2026-10-02T17:04:40.0588724'),
(237, 22, 231, '2026-09-11T02:49:39.7699666'),
(238, 22, 81, '2026-09-14T04:13:39.4232798'),
(239, 22, 82, '2026-09-27T19:37:39.6544044'),
(240, 22, 83, '2026-10-11T11:01:39.8855290'),
(241, 22, 84, '2026-10-25T02:25:40.1166536'),
(242, 22, 429, '2026-10-24T15:09:39.5773628'),
(243, 22, 430, '2026-10-31T16:29:39.9625705'),
(244, 23, 297, '2026-07-13T17:01:39.4238027'),
(245, 23, 298, '2026-08-11T23:13:39.6554502'),
(246, 23, 299, '2026-09-10T05:25:39.8870976'),
(247, 23, 300, '2026-10-09T11:37:40.1187452'),
(248, 23, 134, '2026-08-20T08:13:39.4238026'),
(249, 23, 135, '2026-09-09T04:37:39.6554501'),
(250, 23, 136, '2026-09-29T01:01:39.8870976'),
(251, 23, 137, '2026-10-18T21:25:40.1187451'),
(252, 23, 14, '2026-10-12T15:19:39.7712739'),
(253, 23, 365, '2026-11-03T14:37:39.4238027'),
(254, 23, 366, '2026-11-04T15:25:39.6554502'),
(255, 23, 367, '2026-11-05T16:13:39.8870977'),
(256, 23, 368, '2026-11-06T17:01:40.1187452'),
(257, 24, 213, '2026-07-19T01:32:30.7864788'),
(258, 24, 214, '2026-08-06T16:15:22.3808025'),
(259, 24, 215, '2026-08-25T06:58:13.9751261'),
(260, 24, 216, '2026-09-12T21:41:05.5694498'),
(261, 24, 217, '2026-10-01T12:23:57.1637734'),
(262, 24, 218, '2026-10-20T03:06:48.7580971'),
(263, 24, 69, '2026-09-06T07:19:39.4822215'),
(264, 24, 70, '2026-09-27T02:49:39.7722879'),
(265, 24, 71, '2026-10-17T22:19:40.0623543'),
(266, 24, 417, '2026-10-20T15:19:39.7722880'),
(267, 25, 121, '2026-08-08T07:25:39.4245930'),
(268, 25, 122, '2026-08-31T04:01:39.6570308'),
(269, 25, 123, '2026-09-23T00:37:39.8894686'),
(270, 25, 124, '2026-10-15T21:13:40.1219064'),
(271, 25, 1, '2026-09-18T07:19:39.4827024'),
(272, 25, 2, '2026-10-05T02:49:39.7732497'),
(273, 25, 3, '2026-10-21T22:19:40.0637970'),
(274, 26, 196, '2026-07-06T04:06:47.9299429'),
(275, 26, 197, '2026-07-26T22:23:56.6677307'),
(276, 26, 198, '2026-08-16T16:41:05.4055184'),
(277, 26, 199, '2026-09-06T10:58:14.1433062'),
(278, 26, 200, '2026-09-27T05:15:22.8810939'),
(279, 26, 201, '2026-10-17T23:32:31.6188817'),
(280, 26, 105, '2026-08-12T16:19:39.4832837'),
(281, 26, 106, '2026-09-10T16:49:39.7744123'),
(282, 26, 107, '2026-10-09T17:19:40.0655409'),
(283, 26, 55, '2026-09-19T14:19:39.7744123'),
(284, 26, 453, '2026-09-13T12:13:39.4250580'),
(285, 26, 454, '2026-09-27T07:37:39.6579609'),
(286, 26, 455, '2026-10-11T03:01:39.8908637'),
(287, 26, 456, '2026-10-24T22:25:40.1237666'),
(288, 26, 337, '2026-10-24T01:49:39.5803266'),
(289, 26, 338, '2026-10-31T09:49:39.9684980'),
(290, 27, 109, '2026-07-27T06:37:39.4254873'),
(291, 27, 110, '2026-08-22T03:25:39.6588195'),
(292, 27, 111, '2026-09-17T00:13:39.8921516'),
(293, 27, 112, '2026-10-12T21:01:40.1254838'),
(294, 27, 39, '2026-08-24T16:19:39.4838204'),
(295, 27, 40, '2026-09-18T16:49:39.7754856'),
(296, 27, 41, '2026-10-13T17:19:40.0671508'),
(297, 27, 389, '2026-10-12T05:19:39.7754856'),
(298, 27, 271, '2026-11-02T17:49:39.3865986'),
(299, 27, 272, '2026-11-03T17:49:39.5810421'),
(300, 27, 273, '2026-11-04T17:49:39.7754855'),
(301, 27, 274, '2026-11-05T17:49:39.9699290'),
(302, 27, 275, '2026-11-06T17:49:40.1643725'),
(303, 28, 179, '2026-06-23T14:23:56.5019663'),
(304, 28, 180, '2026-07-16T10:58:13.8117774'),
(305, 28, 181, '2026-08-08T07:32:31.1215885'),
(306, 28, 182, '2026-08-31T04:06:48.4313996'),
(307, 28, 183, '2026-09-23T00:41:05.7412107'),
(308, 28, 184, '2026-10-15T21:15:23.0510218'),
(309, 28, 441, '2026-09-05T16:19:39.4843246'),
(310, 28, 442, '2026-09-26T16:49:39.7764940'),
(311, 28, 443, '2026-10-17T17:19:40.0686635'),
(312, 28, 325, '2026-10-20T05:19:39.7764941'),
(313, 29, 219, '2026-10-30T04:06:49.2371323'),
(314, 29, 220, '2026-10-31T14:23:57.8991090'),
(315, 29, 221, '2026-11-02T00:41:06.5610856'),
(316, 29, 222, '2026-11-03T10:58:15.2230623'),
(317, 29, 223, '2026-11-04T21:15:23.8850389'),
(318, 29, 224, '2026-11-06T07:32:32.5470156'),
(319, 29, 73, '2026-11-05T11:04:40.7336148'),
(320, 29, 74, '2026-11-06T05:19:40.8920740'),
(321, 29, 75, '2026-11-06T23:34:41.0505331'),
(322, 29, 421, '2026-11-07T17:19:40.8920740'),
(323, 30, 260, '2026-10-26T05:49:40.6813075'),
(324, 30, 261, '2026-10-28T17:49:40.7874593'),
(325, 30, 262, '2026-10-31T05:49:40.8936111'),
(326, 30, 263, '2026-11-02T17:49:40.9997630'),
(327, 30, 264, '2026-11-05T05:49:41.1059148'),
(328, 30, 101, '2026-11-04T16:19:40.7343834'),
(329, 30, 102, '2026-11-05T16:49:40.8936111'),
(330, 30, 103, '2026-11-06T17:19:41.0528389'),
(331, 30, 449, '2026-11-07T04:49:40.8936111'),
(332, 31, 293, '2026-10-22T17:49:40.7031055'),
(333, 31, 294, '2026-10-26T17:49:40.8310553'),
(334, 31, 295, '2026-10-30T17:49:40.9590051'),
(335, 31, 296, '2026-11-03T17:49:41.0869549'),
(336, 31, 129, '2026-11-03T21:34:40.7350929'),
(337, 31, 130, '2026-11-05T04:19:40.8950302'),
(338, 31, 131, '2026-11-06T11:04:41.0549675'),
(339, 31, 10, '2026-11-06T16:19:40.8950302'),
(340, 32, 321, '2026-10-18T17:49:40.7037486'),
(341, 32, 322, '2026-10-23T17:49:40.8323415'),
(342, 32, 323, '2026-10-28T17:49:40.9609345'),
(343, 32, 324, '2026-11-02T17:49:41.0895274'),
(344, 32, 39, '2026-11-05T08:49:40.7358968'),
(345, 32, 40, '2026-11-06T03:49:40.8966380'),
(346, 32, 41, '2026-11-06T22:49:41.0573792'),
(347, 32, 173, '2026-11-07T15:49:40.8966380'),
(348, 33, 349, '2026-10-30T17:49:40.7043100'),
(349, 33, 350, '2026-11-01T17:49:40.8334643'),
(350, 33, 351, '2026-11-03T17:49:40.9626187'),
(351, 33, 352, '2026-11-05T17:49:41.0917730'),
(352, 33, 69, '2026-11-04T14:04:40.7365986'),
(353, 33, 70, '2026-11-05T15:19:40.8980415'),
(354, 33, 71, '2026-11-06T16:34:41.0594844'),
(355, 33, 213, '2026-11-07T03:19:40.8980415'),
(356, 34, 377, '2026-10-26T17:49:40.7050573'),
(357, 34, 378, '2026-10-29T17:49:40.8349590'),
(358, 34, 379, '2026-11-01T17:49:40.9648607'),
(359, 34, 380, '2026-11-04T17:49:41.0947624'),
(360, 34, 97, '2026-11-03T19:19:40.7375328'),
(361, 34, 98, '2026-11-05T02:49:40.8999099'),
(362, 34, 99, '2026-11-06T10:19:41.0622870'),
(363, 34, 255, '2026-11-06T14:49:40.8999099'),
(364, 35, 405, '2026-10-22T17:49:40.7055699'),
(365, 35, 406, '2026-10-26T17:49:40.8359841'),
(366, 35, 407, '2026-10-30T17:49:40.9663984'),
(367, 35, 408, '2026-11-03T17:49:41.0968126'),
(368, 35, 289, '2026-11-05T06:34:40.7381735'),
(369, 35, 290, '2026-11-06T02:19:40.9011913'),
(370, 35, 291, '2026-11-06T22:04:41.0642090'),
(371, 35, 125, '2026-11-07T14:19:40.9011912'),
(372, 36, 433, '2026-10-18T17:49:40.7060744'),
(373, 36, 434, '2026-10-23T17:49:40.8369932'),
(374, 36, 435, '2026-10-28T17:49:40.9679119'),
(375, 36, 436, '2026-11-02T17:49:41.0988307'),
(376, 36, 317, '2026-11-04T11:49:40.7388041'),
(377, 36, 318, '2026-11-05T13:49:40.9024526'),
(378, 36, 319, '2026-11-06T15:49:41.0661010'),
(379, 36, 167, '2026-11-07T01:49:40.9024525'),
(380, 37, 461, '2026-10-30T17:49:40.7069321'),
(381, 37, 462, '2026-11-01T17:49:40.8387085'),
(382, 37, 463, '2026-11-03T17:49:40.9704850'),
(383, 37, 464, '2026-11-05T17:49:41.1022614'),
(384, 37, 345, '2026-11-03T17:04:40.7398762'),
(385, 37, 346, '2026-11-05T01:19:40.9045968'),
(386, 37, 347, '2026-11-06T09:34:41.0693173'),
(387, 37, 207, '2026-11-06T13:19:40.9045968'),
(388, 38, 23, '2026-10-26T17:49:40.7074293'),
(389, 38, 24, '2026-10-29T17:49:40.8397029'),
(390, 38, 25, '2026-11-01T17:49:40.9719765'),
(391, 38, 26, '2026-11-04T17:49:41.1042501'),
(392, 38, 249, '2026-11-05T00:13:40.7074293'),
(393, 38, 250, '2026-11-05T16:37:40.8397029'),
(394, 38, 251, '2026-11-06T09:01:40.9719765'),
(395, 38, 252, '2026-11-07T01:25:41.1042501'),
(396, 38, 373, '2026-11-07T12:49:40.9058397'),
(397, 39, 51, '2026-10-22T17:49:40.7079433'),
(398, 39, 52, '2026-10-26T17:49:40.8407309'),
(399, 39, 53, '2026-10-30T17:49:40.9735185'),
(400, 39, 54, '2026-11-03T17:49:41.1063061'),
(401, 39, 285, '2026-11-04T09:34:40.7411402'),
(402, 39, 286, '2026-11-05T12:19:40.9071247'),
(403, 39, 287, '2026-11-06T15:04:41.0731092'),
(404, 39, 401, '2026-11-07T00:19:40.9071247'),
(405, 40, 81, '2026-10-18T17:49:40.7083894'),
(406, 40, 82, '2026-10-23T17:49:40.8416231'),
(407, 40, 83, '2026-10-28T17:49:40.9748568'),
(408, 40, 84, '2026-11-02T17:49:41.1080905'),
(409, 40, 313, '2026-11-03T14:49:40.7416978'),
(410, 40, 314, '2026-11-04T23:49:40.9082400'),
(411, 40, 315, '2026-11-06T08:49:41.0747821'),
(412, 40, 429, '2026-11-06T11:49:40.9082399'),
(413, 41, 109, '2026-10-30T17:49:40.7088879'),
(414, 41, 110, '2026-11-01T17:49:40.8426202'),
(415, 41, 111, '2026-11-03T17:49:40.9763525'),
(416, 41, 112, '2026-11-05T17:49:41.1100848'),
(417, 41, 457, '2026-11-05T02:04:40.7423210'),
(418, 41, 458, '2026-11-05T23:19:40.9094864'),
(419, 41, 459, '2026-11-06T20:34:41.0766517'),
(420, 41, 341, '2026-11-07T11:19:40.9094864'),
(421, 42, 140, '2026-10-25T14:49:40.6590666'),
(422, 42, 141, '2026-10-27T11:49:40.7429775'),
(423, 42, 142, '2026-10-29T08:49:40.8268885'),
(424, 42, 143, '2026-10-31T05:49:40.9107994'),
(425, 42, 144, '2026-11-02T02:49:40.9947103'),
(426, 42, 145, '2026-11-03T23:49:41.0786213'),
(427, 42, 146, '2026-11-05T20:49:41.1625322'),
(428, 42, 18, '2026-11-04T07:19:40.7429775'),
(429, 42, 19, '2026-11-05T10:49:40.9107994'),
(430, 42, 20, '2026-11-06T14:19:41.0786213'),
(431, 42, 369, '2026-11-06T22:49:40.9107994'),
(432, 43, 185, '2026-10-21T14:23:57.8143576'),
(433, 43, 186, '2026-10-24T10:58:15.0535595'),
(434, 43, 187, '2026-10-27T07:32:32.2927615'),
(435, 43, 188, '2026-10-30T04:06:49.5319634'),
(436, 43, 189, '2026-11-02T00:41:06.7711654'),
(437, 43, 190, '2026-11-04T21:15:24.0103673'),
(438, 43, 47, '2026-11-03T12:34:40.7437590'),
(439, 43, 48, '2026-11-04T22:19:40.9123624'),
(440, 43, 49, '2026-11-06T08:04:41.0809658'),
(441, 43, 397, '2026-11-06T10:19:40.9123625'),
(442, 44, 225, '2026-10-17T07:32:32.1004272'),
(443, 44, 226, '2026-10-20T21:15:23.6256987'),
(444, 44, 227, '2026-10-24T10:58:15.1509702'),
(445, 44, 228, '2026-10-28T00:41:06.6762418'),
(446, 44, 229, '2026-10-31T14:23:58.2015133'),
(447, 44, 230, '2026-11-04T04:06:49.7267848'),
(448, 44, 425, '2026-11-04T23:49:40.7443808'),
(449, 44, 426, '2026-11-05T21:49:40.9136060'),
(450, 44, 427, '2026-11-06T19:49:41.0828312'),
(451, 44, 77, '2026-11-07T09:49:40.9136060'),
(452, 45, 265, '2026-10-30T04:06:49.2436306'),
(453, 45, 266, '2026-10-31T14:23:57.9121056'),
(454, 45, 267, '2026-11-02T00:41:06.5805806'),
(455, 45, 268, '2026-11-03T10:58:15.2490556'),
(456, 45, 269, '2026-11-04T21:15:23.9175306'),
(457, 45, 270, '2026-11-06T07:32:32.5860056'),
(458, 45, 453, '2026-11-04T05:04:40.7449869'),
(459, 45, 454, '2026-11-05T09:19:40.9148181'),
(460, 45, 455, '2026-11-06T13:34:41.0846493'),
(461, 45, 105, '2026-11-06T21:19:40.9148181'),
(462, 46, 297, '2026-10-26T17:49:40.7115479'),
(463, 46, 298, '2026-10-29T17:49:40.8479402'),
(464, 46, 299, '2026-11-01T17:49:40.9843324'),
(465, 46, 300, '2026-11-04T17:49:41.1207247'),
(466, 46, 14, '2026-11-03T10:19:40.7456460'),
(467, 46, 15, '2026-11-04T20:49:40.9161363'),
(468, 46, 16, '2026-11-06T07:19:41.0866266'),
(469, 46, 134, '2026-11-06T08:49:40.9161363'),
(470, 47, 325, '2026-10-22T17:49:40.7120836'),
(471, 47, 326, '2026-10-26T17:49:40.8490116'),
(472, 47, 327, '2026-10-30T17:49:40.9859395'),
(473, 47, 328, '2026-11-03T17:49:41.1228675'),
(474, 47, 179, '2026-11-04T17:01:40.7120836'),
(475, 47, 180, '2026-11-05T11:13:40.8490116'),
(476, 47, 181, '2026-11-06T05:25:40.9859395'),
(477, 47, 182, '2026-11-06T23:37:41.1228675'),
(478, 47, 43, '2026-11-07T08:19:40.9174755'),
(479, 48, 353, '2026-10-18T17:49:40.7127630'),
(480, 48, 354, '2026-10-23T17:49:40.8503704'),
(481, 48, 355, '2026-10-28T17:49:40.9879778'),
(482, 48, 356, '2026-11-02T17:49:41.1255852'),
(483, 48, 219, '2026-11-03T21:01:40.7127630'),
(484, 48, 220, '2026-11-04T20:13:40.8503704'),
(485, 48, 221, '2026-11-05T19:25:40.9879778'),
(486, 48, 222, '2026-11-06T18:37:41.1255852'),
(487, 48, 73, '2026-11-06T19:49:40.9191741'),
(488, 49, 381, '2026-10-30T17:49:40.7133909'),
(489, 49, 382, '2026-11-01T17:49:40.8516261'),
(490, 49, 383, '2026-11-03T17:49:40.9898613'),
(491, 49, 384, '2026-11-05T17:49:41.1280965'),
(492, 49, 260, '2026-11-03T23:04:40.7479497'),
(493, 49, 261, '2026-11-05T05:19:40.9207437'),
(494, 49, 262, '2026-11-06T11:34:41.0935377'),
(495, 49, 101, '2026-11-06T17:19:40.9207437'),
(496, 50, 409, '2026-10-26T17:49:40.7139469'),
(497, 50, 410, '2026-10-29T17:49:40.8527382'),
(498, 50, 411, '2026-11-01T17:49:40.9915294'),
(499, 50, 412, '2026-11-04T17:49:41.1303207'),
(500, 50, 129, '2026-11-05T10:19:40.7486447');
INSERT INTO [LessonCompletions] ([Id], [StudentId], [LessonId], [CompletedAt]) VALUES
(501, 50, 130, '2026-11-06T04:49:40.9221338'),
(502, 50, 131, '2026-11-06T23:19:41.0956229'),
(503, 50, 293, '2026-11-07T16:49:40.9221338'),
(504, 51, 437, '2026-10-22T17:49:40.7146932'),
(505, 51, 438, '2026-10-26T17:49:40.8542307'),
(506, 51, 439, '2026-10-30T17:49:40.9937683'),
(507, 51, 440, '2026-11-03T17:49:41.1333058'),
(508, 51, 173, '2026-11-04T10:37:40.7146932'),
(509, 51, 174, '2026-11-05T06:25:40.8542307'),
(510, 51, 175, '2026-11-06T02:13:40.9937683'),
(511, 51, 176, '2026-11-06T22:01:41.1333058'),
(512, 51, 321, '2026-11-07T04:19:40.9239995'),
(513, 52, 465, '2026-10-18T17:49:40.7152293'),
(514, 52, 466, '2026-10-23T17:49:40.8553030'),
(515, 52, 467, '2026-10-28T17:49:40.9953767'),
(516, 52, 468, '2026-11-02T17:49:41.1354504'),
(517, 52, 213, '2026-11-03T14:37:40.7152293'),
(518, 52, 214, '2026-11-04T15:25:40.8553030'),
(519, 52, 215, '2026-11-05T16:13:40.9953767'),
(520, 52, 216, '2026-11-06T17:01:41.1354504'),
(521, 52, 349, '2026-11-06T15:49:40.9253398'),
(522, 53, 27, '2026-10-30T17:49:40.7156660'),
(523, 53, 28, '2026-11-01T17:49:40.8561763'),
(524, 53, 29, '2026-11-03T17:49:40.9966866'),
(525, 53, 30, '2026-11-05T17:49:41.1371969'),
(526, 53, 377, '2026-11-05T08:04:40.7507936'),
(527, 53, 378, '2026-11-06T03:19:40.9264315'),
(528, 53, 379, '2026-11-06T22:34:41.1020694'),
(529, 53, 255, '2026-11-07T15:19:40.9264315'),
(530, 54, 55, '2026-10-26T05:49:40.6928614'),
(531, 54, 56, '2026-10-28T17:49:40.8105671'),
(532, 54, 57, '2026-10-31T05:49:40.9282729'),
(533, 54, 58, '2026-11-02T17:49:41.0459786'),
(534, 54, 59, '2026-11-05T05:49:41.1636843'),
(535, 54, 405, '2026-11-04T13:19:40.7517142'),
(536, 54, 406, '2026-11-05T14:49:40.9282728'),
(537, 54, 407, '2026-11-06T16:19:41.1048314'),
(538, 54, 289, '2026-11-07T02:49:40.9282728'),
(539, 55, 85, '2026-10-22T17:49:40.7168724'),
(540, 55, 86, '2026-10-26T17:49:40.8585892'),
(541, 55, 87, '2026-10-30T17:49:41.0003060'),
(542, 55, 88, '2026-11-03T17:49:41.1420228'),
(543, 55, 433, '2026-11-03T18:34:40.7523016'),
(544, 55, 434, '2026-11-05T02:19:40.9294476'),
(545, 55, 435, '2026-11-06T10:04:41.1065936'),
(546, 55, 317, '2026-11-06T14:19:40.9294476'),
(547, 56, 113, '2026-10-18T17:49:40.7172879'),
(548, 56, 114, '2026-10-23T17:49:40.8594201'),
(549, 56, 115, '2026-10-28T17:49:41.0015524'),
(550, 56, 116, '2026-11-02T17:49:41.1436846'),
(551, 56, 345, '2026-11-05T05:49:40.7528209'),
(552, 56, 346, '2026-11-06T01:49:40.9304862'),
(553, 56, 347, '2026-11-06T21:49:41.1081515'),
(554, 56, 461, '2026-11-07T13:49:40.9304862'),
(555, 57, 147, '2026-10-29T23:49:40.6642789'),
(556, 57, 148, '2026-10-31T05:49:40.7534021'),
(557, 57, 149, '2026-11-01T11:49:40.8425253'),
(558, 57, 150, '2026-11-02T17:49:40.9316485'),
(559, 57, 151, '2026-11-03T23:49:41.0207718'),
(560, 57, 152, '2026-11-05T05:49:41.1098950'),
(561, 57, 153, '2026-11-06T11:49:41.1990182'),
(562, 57, 373, '2026-11-04T11:04:40.7534021'),
(563, 57, 374, '2026-11-05T13:19:40.9316485'),
(564, 57, 375, '2026-11-06T15:34:41.1098950'),
(565, 57, 23, '2026-11-07T01:19:40.9316486'),
(566, 58, 191, '2026-10-26T05:49:40.6945356'),
(567, 58, 192, '2026-10-28T17:49:40.8139156'),
(568, 58, 193, '2026-10-31T05:49:40.9332956'),
(569, 58, 194, '2026-11-02T17:49:41.0526756'),
(570, 58, 195, '2026-11-05T05:49:41.1720556'),
(571, 58, 401, '2026-11-03T16:19:40.7542256'),
(572, 58, 402, '2026-11-05T00:49:40.9332956'),
(573, 58, 403, '2026-11-06T09:19:41.1123656'),
(574, 58, 51, '2026-11-06T12:49:40.9332956'),
(575, 59, 14, '2026-07-10T17:49:43.4881665'),
(576, 59, 15, '2026-08-09T17:49:43.5404140'),
(577, 59, 16, '2026-09-08T17:49:43.5926615'),
(578, 59, 17, '2026-10-08T17:49:43.6449090'),
(579, 59, 18, '2026-07-30T17:49:43.4794586'),
(580, 59, 19, '2026-08-19T17:49:43.5229982'),
(581, 59, 20, '2026-09-08T17:49:43.5665377'),
(582, 59, 21, '2026-09-28T17:49:43.6100773'),
(583, 59, 22, '2026-10-18T17:49:43.6536169'),
(584, 59, 161, '2026-09-01T05:49:43.5012284'),
(585, 59, 162, '2026-09-23T17:49:43.5665377'),
(586, 59, 163, '2026-10-16T05:49:43.6318471'),
(587, 59, 23, '2026-09-23T17:49:43.5012284'),
(588, 59, 24, '2026-10-08T17:49:43.5665378'),
(589, 59, 25, '2026-10-23T17:49:43.6318471'),
(590, 59, 73, '2026-10-23T17:49:43.5665378');
SET IDENTITY_INSERT [LessonCompletions] OFF;
-- CourseCompletions (74)
SET IDENTITY_INSERT [CourseCompletions] ON;
INSERT INTO [CourseCompletions] ([Id], [StudentId], [CourseId], [Category], [Title], [CompletedAt]) VALUES
(1, 17, 1, N'Yazılım', N'İleri Seviye C# ve .NET API', '2026-10-12T04:39:40.1459800'),
(2, 15, 4, N'Yazılım', N'Algoritmalar', '2026-10-09T21:25:40.1044737'),
(3, 59, 4, N'Yazılım', N'Algoritmalar', '2026-10-08T17:49:43.6449090'),
(4, 59, 5, N'Yazılım', N'React ile Modern Web Geliştirme', '2026-10-18T17:49:43.6536169'),
(5, 38, 6, N'Matematik', N'Matematik', '2026-11-04T17:49:41.1042501'),
(6, 53, 7, N'Matematik', N'Matematik Geometri', '2026-11-05T17:49:41.1371969'),
(7, 3, 10, N'Fen Bilimleri', N'Kimya', '2026-10-31T12:01:40.0725539'),
(8, 19, 10, N'Fen Bilimleri', N'Kimya', '2026-11-03T07:37:40.1116289'),
(9, 39, 13, N'Coğrafya', N'Fiziki Coğrafya', '2026-11-03T17:49:41.1063061'),
(10, 2, 14, N'Coğrafya', N'Jeomorfoloji', '2026-11-02T01:39:40.1033477'),
(11, 54, 14, N'Coğrafya', N'Jeomorfoloji', '2026-11-05T05:49:41.1636843'),
(12, 14, 20, N'Yabancı Dil', N'İngilizce A1-A2', '2026-10-06T16:37:40.1012197'),
(13, 22, 20, N'Yabancı Dil', N'İngilizce A1-A2', '2026-10-25T02:25:40.1166536'),
(14, 40, 20, N'Yabancı Dil', N'İngilizce A1-A2', '2026-11-02T17:49:41.1080905'),
(15, 55, 21, N'Yabancı Dil', N'İngilizce', '2026-11-03T17:49:41.1420228'),
(16, 18, 26, N'Sanat', N'Sanat Tarihine Giriş', '2026-10-31T02:49:40.1093120'),
(17, 11, 27, N'Müzik', N'Piyano Eğitimi', '2026-10-10T03:13:40.0941274'),
(18, 27, 27, N'Müzik', N'Piyano Eğitimi', '2026-10-12T21:01:40.1254838'),
(19, 41, 27, N'Müzik', N'Piyano Eğitimi', '2026-11-05T17:49:41.1100848'),
(20, 56, 28, N'Müzik', N'Gitar Eğitimi', '2026-11-02T17:49:41.1436846'),
(21, 1, 30, N'Spor', N'Fonksiyonel Antrenman', '2026-10-28T17:37:40.0461208'),
(22, 9, 30, N'Spor', N'Fonksiyonel Antrenman', '2026-10-13T03:25:40.0875876'),
(23, 25, 30, N'Spor', N'Fonksiyonel Antrenman', '2026-10-15T21:13:40.1219064'),
(24, 15, 33, N'Matematik', N'Temel Matematik', '2026-11-04T16:49:40.1696393'),
(25, 42, 34, N'Matematik', N'Kalkülüs ve Analiz', '2026-11-05T20:49:41.1625322'),
(26, 57, 35, N'Matematik', N'Lineer Cebir', '2026-11-06T11:49:41.1990182'),
(27, 28, 40, N'Veri Bilimi & Yapay Zeka', N'Makine Öğrenmesine Giriş', '2026-10-15T21:15:23.0510218'),
(28, 43, 41, N'Veri Bilimi & Yapay Zeka', N'Derin Öğrenme ve Sinir Ağları', '2026-11-04T21:15:24.0103673'),
(29, 58, 42, N'Veri Bilimi & Yapay Zeka', N'Veri Görselleştirme ve Hikâye Anlatımı', '2026-11-05T05:49:41.1720556'),
(30, 10, 43, N'Ekonomi & Finans', N'Mikroekonomiye Giriş', '2026-10-16T00:32:31.5831545'),
(31, 26, 43, N'Ekonomi & Finans', N'Mikroekonomiye Giriş', '2026-10-17T23:32:31.6188817'),
(32, 8, 46, N'Ekonomi & Finans', N'Muhasebenin Temelleri', '2026-10-18T04:06:48.7201519'),
(33, 24, 46, N'Ekonomi & Finans', N'Muhasebenin Temelleri', '2026-10-20T03:06:48.7580971'),
(34, 29, 47, N'Edebiyat & Felsefe', N'Türk Edebiyatına Giriş', '2026-11-06T07:32:32.5470156'),
(35, 44, 48, N'Edebiyat & Felsefe', N'Felsefeye Giriş', '2026-11-04T04:06:49.7267848'),
(36, 5, 53, N'Sosyal Bilimler', N'Sosyolojiye Giriş', '2026-10-17T13:09:40.1168341'),
(37, 30, 54, N'Yabancı Dil', N'İspanyolca A1', '2026-11-05T05:49:41.1059148'),
(38, 45, 55, N'Müzik', N'Müzik Teorisi ve Kulak Eğitimi', '2026-11-06T07:32:32.5860056'),
(39, 11, 56, N'Sanat', N'Suluboya Atölyesi', '2026-11-04T09:29:40.1317096'),
(40, 27, 56, N'Sanat', N'Suluboya Atölyesi', '2026-11-06T17:49:40.1643725'),
(41, 31, 61, N'Türk Dili ve Edebiyatı', N'Cumhuriyet Dönemi Türk Edebiyatı', '2026-11-03T17:49:41.0869549'),
(42, 7, 62, N'Türk Dili ve Edebiyatı', N'Osmanlı Türkçesi ve Metin Okumaları', '2026-10-06T17:49:40.0833322'),
(43, 23, 62, N'Türk Dili ve Edebiyatı', N'Osmanlı Türkçesi ve Metin Okumaları', '2026-10-09T11:37:40.1187452'),
(44, 46, 62, N'Türk Dili ve Edebiyatı', N'Osmanlı Türkçesi ve Metin Okumaları', '2026-11-04T17:49:41.1207247'),
(45, 6, 66, N'Psikoloji & Bilişsel Bilimler', N'Bilişsel Bilime Giriş', '2026-10-07T02:25:40.0816474'),
(46, 14, 66, N'Psikoloji & Bilişsel Bilimler', N'Bilişsel Bilime Giriş', '2026-10-25T12:13:40.1012197'),
(47, 32, 68, N'Sosyal Bilimler', N'YKS Tarih Soru Kampı', '2026-11-02T17:49:41.0895274'),
(48, 4, 69, N'Sosyal Bilimler', N'Kent Sosyolojisi ve Saha Araştırması', '2026-10-10T02:37:40.0779226'),
(49, 20, 69, N'Sosyal Bilimler', N'Kent Sosyolojisi ve Saha Araştırması', '2026-10-12T22:13:40.1134108'),
(50, 47, 69, N'Sosyal Bilimler', N'Kent Sosyolojisi ve Saha Araştırması', '2026-11-03T17:49:41.1228675'),
(51, 2, 72, N'Sanat', N'Rönesans''tan Modernizme Sanat Tarihi', '2026-10-13T02:49:40.0669000'),
(52, 33, 75, N'Genel', N'YKS ve LGS Sınav Stratejileri', '2026-11-05T17:49:41.0917730'),
(53, 48, 76, N'Genel', N'Hızlı Okuma ve Not Alma Teknikleri', '2026-11-02T17:49:41.1255852'),
(54, 22, 78, N'Fotoğrafçılık & Sinema', N'Mobil Fotoğrafçılık ve Video Kurgu', '2026-10-06T06:49:40.1166535'),
(55, 7, 79, N'Fen Bilimleri', N'Genetik ve Moleküler Biyoloji', '2026-11-03T21:25:40.0833322'),
(56, 23, 79, N'Fen Bilimleri', N'Genetik ve Moleküler Biyoloji', '2026-11-06T17:01:40.1187452'),
(57, 13, 82, N'Hukuk & Kamu Yönetimi', N'Anayasa Hukukuna Giriş', '2026-10-22T07:25:40.0985360'),
(58, 21, 82, N'Hukuk & Kamu Yönetimi', N'Anayasa Hukukuna Giriş', '2026-10-06T17:13:40.1148363'),
(59, 34, 82, N'Hukuk & Kamu Yönetimi', N'Anayasa Hukukuna Giriş', '2026-11-04T17:49:41.0947624'),
(60, 49, 83, N'Hukuk & Kamu Yönetimi', N'İdare Hukuku ve Kamu Yönetimi', '2026-11-05T17:49:41.1280965'),
(61, 3, 85, N'Hukuk & Kamu Yönetimi', N'KVKK ve Bilişim Hukuku', '2026-10-06T21:49:40.0725539'),
(62, 19, 85, N'Hukuk & Kamu Yönetimi', N'KVKK ve Bilişim Hukuku', '2026-10-09T17:25:40.1116289'),
(63, 35, 89, N'Mühendislik & Robotik', N'SolidWorks ile CAD ve Mekanik Tasarım', '2026-11-03T17:49:41.0968126'),
(64, 50, 90, N'Yazılım', N'Siber Güvenlik ve Ağ Temelleri', '2026-11-04T17:49:41.1303207'),
(65, 16, 92, N'Yazılım', N'Docker, Kubernetes ve DevOps', '2026-10-13T02:13:40.1063495'),
(66, 6, 95, N'Sosyal Bilimler', N'Siyaset Bilimi ve Uluslararası İlişkilere Giriş', '2026-10-31T16:37:40.0816474'),
(67, 36, 96, N'Sosyal Bilimler', N'Hukukun Temel Kavramları ve Anayasa Bilgisi', '2026-11-02T17:49:41.0988307'),
(68, 51, 97, N'Edebiyat & Felsefe', N'Etik ve Estetiğe Giriş', '2026-11-03T17:49:41.1333058'),
(69, 12, 98, N'Ekonomi & Finans', N'Girişimcilik ve İş Stratejisi', '2026-10-19T02:37:40.0961746'),
(70, 10, 101, N'Sanat', N'Seramik ve Heykel Atölyesi', '2026-10-22T02:49:40.0904212'),
(71, 18, 101, N'Sanat', N'Seramik ve Heykel Atölyesi', '2026-10-06T12:37:40.1093120'),
(72, 26, 101, N'Sanat', N'Seramik ve Heykel Atölyesi', '2026-10-24T22:25:40.1237666'),
(73, 37, 103, N'Spor', N'Hareket Bilimi ve Sakatlıktan Korunma', '2026-11-05T17:49:41.1022614'),
(74, 52, 104, N'Genel', N'Araştırma Yöntemleri ve Bilimsel Etik', '2026-11-02T17:49:41.1354504');
SET IDENTITY_INSERT [CourseCompletions] OFF;
-- CourseRatings (149)
SET IDENTITY_INSERT [CourseRatings] ON;
INSERT INTO [CourseRatings] ([Id], [CourseId], [StudentId], [Stars], [CreatedAt], [UpdatedAt]) VALUES
(1, 1, 1, 5, '2026-11-05T17:49:39.1921552', '2026-11-05T17:49:39.1921552'),
(2, 30, 1, 5, '2026-09-20T16:49:39.1921552', '2026-09-20T16:49:39.1921552'),
(3, 14, 2, 4, '2026-10-06T16:49:39.1921552', '2026-10-06T16:49:39.1921552'),
(4, 26, 2, 5, '2026-09-19T12:49:39.1921552', '2026-09-19T12:49:39.1921552'),
(5, 43, 2, 5, '2026-08-22T15:49:39.1921552', '2026-08-22T15:49:39.1921552'),
(6, 101, 2, 4, '2026-11-07T17:49:40.5147961', '2026-11-07T17:49:40.5147961'),
(7, 10, 3, 4, '2026-10-05T12:49:39.1921552', '2026-10-05T12:49:39.1921552'),
(8, 27, 3, 4, '2026-09-07T15:49:39.1921552', '2026-09-07T15:49:39.1921552'),
(9, 85, 3, 5, '2026-06-07T13:49:39.1921552', '2026-06-07T13:49:39.1921552'),
(10, 40, 4, 4, '2026-08-07T14:49:39.1921552', '2026-08-07T14:49:39.1921552'),
(11, 98, 4, 4, '2026-10-24T12:49:39.1921552', '2026-10-24T12:49:39.1921552'),
(12, 82, 5, 4, '2026-11-07T17:49:40.5148776', '2026-11-07T17:49:40.5148776'),
(13, 20, 6, 5, '2026-08-23T10:49:39.1921552', '2026-08-23T10:49:39.1921552'),
(14, 49, 6, 5, '2026-07-02T09:49:39.1921552', '2026-07-02T09:49:39.1921552'),
(15, 66, 6, 4, '2026-06-04T12:49:39.1921552', '2026-06-04T12:49:39.1921552'),
(16, 78, 6, 4, '2026-11-04T17:49:39.1921552', '2026-11-04T17:49:39.1921552'),
(17, 4, 7, 2, '2026-09-03T10:49:39.1921552', '2026-09-03T10:49:39.1921552'),
(18, 33, 7, 5, '2026-07-19T09:49:39.1921552', '2026-07-19T09:49:39.1921552'),
(19, 62, 7, 5, '2026-06-03T17:49:39.1921552', '2026-06-03T17:49:39.1921552'),
(20, 17, 8, 4, '2026-08-04T09:49:39.1921552', '2026-08-04T09:49:39.1921552'),
(21, 46, 8, 2, '2026-06-19T17:49:39.1921552', '2026-06-19T17:49:39.1921552'),
(22, 1, 9, 3, '2026-08-21T09:49:39.1921552', '2026-08-21T09:49:39.1921552'),
(23, 26, 10, 3, '2026-07-05T13:49:39.1921552', '2026-07-05T13:49:39.1921552'),
(24, 43, 10, 4, '2026-06-07T16:49:39.1921552', '2026-06-07T16:49:39.1921552'),
(25, 72, 10, 2, '2026-10-03T15:49:39.1921552', '2026-10-03T15:49:39.1921552'),
(26, 101, 10, 5, '2026-08-18T14:49:39.1921552', '2026-08-18T14:49:39.1921552'),
(27, 10, 11, 5, '2026-07-21T13:49:39.1921552', '2026-07-21T13:49:39.1921552'),
(28, 27, 11, 5, '2026-06-23T16:49:39.1921552', '2026-06-23T16:49:39.1921552'),
(29, 56, 11, 3, '2026-10-19T15:49:39.1921552', '2026-10-19T15:49:39.1921552'),
(30, 85, 11, 4, '2026-09-03T14:49:39.1921552', '2026-09-03T14:49:39.1921552'),
(31, 40, 12, 4, '2026-11-07T17:49:40.5151151', '2026-11-07T17:49:40.5151151'),
(32, 69, 12, 5, '2026-09-18T14:49:39.1921552', '2026-09-18T14:49:39.1921552'),
(33, 98, 12, 5, '2026-08-03T13:49:39.1921552', '2026-08-03T13:49:39.1921552'),
(34, 53, 13, 4, '2026-10-04T14:49:39.1921552', '2026-10-04T14:49:39.1921552'),
(35, 82, 13, 4, '2026-08-19T13:49:39.1921552', '2026-08-19T13:49:39.1921552'),
(36, 20, 14, 4, '2026-06-02T11:49:39.1921552', '2026-06-02T11:49:39.1921552'),
(37, 66, 14, 4, '2026-09-06T13:49:39.1921552', '2026-09-06T13:49:39.1921552'),
(38, 78, 14, 5, '2026-08-20T09:49:39.1921552', '2026-08-20T09:49:39.1921552'),
(39, 95, 14, 5, '2026-07-23T12:49:39.1921552', '2026-07-23T12:49:39.1921552'),
(40, 33, 15, 4, '2026-10-21T10:49:39.1921552', '2026-10-21T10:49:39.1921552'),
(41, 62, 15, 4, '2026-09-05T09:49:39.1921552', '2026-09-05T09:49:39.1921552'),
(42, 79, 15, 4, '2026-08-08T12:49:39.1921552', '2026-08-08T12:49:39.1921552'),
(43, 17, 16, 5, '2026-11-06T10:49:39.1921552', '2026-11-06T10:49:39.1921552'),
(44, 46, 16, 5, '2026-09-21T09:49:39.1921552', '2026-09-21T09:49:39.1921552'),
(45, 92, 16, 4, '2026-07-08T11:49:39.1921552', '2026-07-08T11:49:39.1921552'),
(46, 1, 17, 2, '2026-06-06T10:49:39.1921552', '2026-06-06T10:49:39.1921552'),
(47, 30, 17, 5, '2026-10-08T09:49:39.1921552', '2026-10-08T09:49:39.1921552'),
(48, 14, 18, 4, '2026-10-24T09:49:39.1921552', '2026-10-24T09:49:39.1921552'),
(49, 26, 18, 2, '2026-10-01T14:49:39.1921552', '2026-10-01T14:49:39.1921552'),
(50, 72, 18, 5, '2026-07-19T16:49:39.1921552', '2026-07-19T16:49:39.1921552'),
(51, 101, 18, 4, '2026-06-03T15:49:39.1921552', '2026-06-03T15:49:39.1921552'),
(52, 10, 19, 3, '2026-10-17T14:49:39.1921552', '2026-10-17T14:49:39.1921552'),
(53, 56, 19, 2, '2026-08-04T16:49:39.1921552', '2026-08-04T16:49:39.1921552'),
(54, 85, 19, 5, '2026-06-19T15:49:39.1921552', '2026-06-19T15:49:39.1921552'),
(55, 69, 20, 3, '2026-07-04T15:49:39.1921552', '2026-07-04T15:49:39.1921552'),
(56, 98, 20, 4, '2026-11-05T14:49:39.1921552', '2026-11-05T14:49:39.1921552'),
(57, 53, 21, 5, '2026-07-20T15:49:39.1921552', '2026-07-20T15:49:39.1921552'),
(58, 82, 21, 5, '2026-06-04T14:49:39.1921552', '2026-06-04T14:49:39.1921552'),
(59, 20, 22, 4, '2026-09-04T12:49:39.1921552', '2026-09-04T12:49:39.1921552'),
(60, 49, 22, 5, '2026-07-20T11:49:39.1921552', '2026-07-20T11:49:39.1921552'),
(61, 66, 22, 5, '2026-06-22T14:49:39.1921552', '2026-06-22T14:49:39.1921552'),
(62, 95, 22, 4, '2026-10-19T13:49:39.1921552', '2026-10-19T13:49:39.1921552'),
(63, 4, 23, 4, '2026-09-21T12:49:39.1921552', '2026-09-21T12:49:39.1921552'),
(64, 33, 23, 4, '2026-08-06T11:49:39.1921552', '2026-08-06T11:49:39.1921552'),
(65, 79, 23, 5, '2026-11-04T13:49:39.1921552', '2026-11-04T13:49:39.1921552'),
(66, 17, 24, 4, '2026-08-22T11:49:39.1921552', '2026-08-22T11:49:39.1921552'),
(67, 92, 24, 4, '2026-10-04T12:49:39.1921552', '2026-10-04T12:49:39.1921552'),
(68, 30, 25, 4, '2026-07-18T10:49:39.1921552', '2026-07-18T10:49:39.1921552'),
(69, 14, 26, 5, '2026-08-03T10:49:39.1921552', '2026-08-03T10:49:39.1921552'),
(70, 26, 26, 5, '2026-07-17T15:49:39.1921552', '2026-07-17T15:49:39.1921552'),
(71, 43, 26, 4, '2026-06-19T09:49:39.1921552', '2026-06-19T09:49:39.1921552'),
(72, 72, 26, 4, '2026-10-21T17:49:39.1921552', '2026-10-21T17:49:39.1921552'),
(73, 10, 27, 2, '2026-08-02T15:49:39.1921552', '2026-08-02T15:49:39.1921552'),
(74, 27, 27, 5, '2026-07-05T09:49:39.1921552', '2026-07-05T09:49:39.1921552'),
(75, 56, 27, 5, '2026-11-06T17:49:39.1921552', '2026-11-06T17:49:39.1921552'),
(76, 40, 28, 4, '2026-06-04T17:49:39.1921552', '2026-06-04T17:49:39.1921552'),
(77, 69, 28, 2, '2026-10-06T16:49:39.1921552', '2026-10-06T16:49:39.1921552'),
(78, 18, 29, 5, '2026-11-05T16:49:40.5751557', '2026-11-05T16:49:40.5751557'),
(79, 47, 29, 5, '2026-10-30T17:49:40.5751557', '2026-10-30T17:49:40.5751557'),
(80, 93, 29, 3, '2026-11-07T17:49:41.4313768', '2026-11-07T17:49:41.4313768'),
(81, 25, 30, 4, '2026-11-05T15:49:40.5751557', '2026-11-05T15:49:40.5751557'),
(82, 54, 30, 5, '2026-10-26T17:49:40.5751557', '2026-10-26T17:49:40.5751557'),
(83, 100, 30, 5, '2026-11-07T17:49:41.4314296', '2026-11-07T17:49:41.4314296'),
(84, 3, 31, 4, '2026-11-07T17:49:41.4314491', '2026-11-07T17:49:41.4314491'),
(85, 32, 31, 4, '2026-11-06T14:49:40.5751557', '2026-11-06T14:49:40.5751557'),
(86, 10, 32, 4, '2026-11-07T17:49:41.4317183', '2026-11-07T17:49:41.4317183'),
(87, 68, 32, 4, '2026-10-19T17:49:40.5751557', '2026-10-19T17:49:40.5751557'),
(88, 46, 33, 4, '2026-11-07T17:49:41.4317831', '2026-11-07T17:49:41.4317831'),
(89, 75, 33, 4, '2026-10-29T17:49:40.5751557', '2026-10-29T17:49:40.5751557'),
(90, 24, 34, 5, '2026-11-07T17:49:41.4318170', '2026-11-07T17:49:41.4318170'),
(91, 53, 34, 5, '2026-11-06T11:49:40.5751557', '2026-11-06T11:49:40.5751557'),
(92, 82, 34, 4, '2026-10-25T17:49:40.5751557', '2026-10-25T17:49:40.5751557'),
(93, 31, 35, 2, '2026-11-07T17:49:41.4318727', '2026-11-07T17:49:41.4318727'),
(94, 60, 35, 5, '2026-11-06T10:49:40.5751557', '2026-11-06T10:49:40.5751557'),
(95, 89, 35, 5, '2026-10-21T17:49:40.5751557', '2026-10-21T17:49:40.5751557'),
(96, 38, 36, 4, '2026-11-07T17:49:41.4319207', '2026-11-07T17:49:41.4319207'),
(97, 67, 36, 2, '2026-11-06T09:49:40.5751557', '2026-11-06T09:49:40.5751557'),
(98, 45, 37, 3, '2026-11-07T17:49:41.4319530', '2026-11-07T17:49:41.4319530'),
(99, 103, 37, 2, '2026-11-02T17:49:40.5751557', '2026-11-02T17:49:40.5751557'),
(100, 52, 38, 3, '2026-11-07T17:49:41.4319868', '2026-11-07T17:49:41.4319868'),
(101, 81, 38, 4, '2026-11-07T17:49:41.4320034', '2026-11-07T17:49:41.4320034'),
(102, 13, 39, 5, '2026-10-23T17:49:40.5751557', '2026-10-23T17:49:40.5751557'),
(103, 59, 39, 5, '2026-11-07T17:49:41.4320360', '2026-11-07T17:49:41.4320360'),
(104, 88, 39, 3, '2026-11-07T06:49:40.5751557', '2026-11-07T06:49:40.5751557'),
(105, 20, 40, 4, '2026-10-19T17:49:40.5751557', '2026-10-19T17:49:40.5751557'),
(106, 66, 40, 5, '2026-11-03T05:49:40.5751557', '2026-11-03T05:49:40.5751557'),
(107, 95, 40, 5, '2026-11-07T05:49:40.5751557', '2026-11-07T05:49:40.5751557'),
(108, 27, 41, 4, '2026-10-29T17:49:40.5751557', '2026-10-29T17:49:40.5751557'),
(109, 73, 41, 4, '2026-11-07T17:49:41.4321299', '2026-11-07T17:49:41.4321299'),
(110, 5, 42, 4, '2026-11-05T03:49:40.5751557', '2026-11-05T03:49:40.5751557'),
(111, 80, 42, 4, '2026-11-07T17:49:41.4321628', '2026-11-07T17:49:41.4321628'),
(112, 41, 43, 4, '2026-10-22T17:49:40.5751557', '2026-10-22T17:49:40.5751557'),
(113, 87, 43, 4, '2026-11-07T17:49:41.4321936', '2026-11-07T17:49:41.4321936'),
(114, 19, 44, 5, '2026-11-07T17:49:41.4322101', '2026-11-07T17:49:41.4322101'),
(115, 48, 44, 5, '2026-10-18T17:49:40.5751557', '2026-10-18T17:49:40.5751557'),
(116, 94, 44, 4, '2026-11-07T17:49:41.4322378', '2026-11-07T17:49:41.4322378'),
(117, 26, 45, 2, '2026-11-07T17:49:41.4322557', '2026-11-07T17:49:41.4322557'),
(118, 55, 45, 5, '2026-11-03T17:49:40.5751557', '2026-11-03T17:49:40.5751557'),
(119, 101, 45, 5, '2026-11-04T00:49:40.5751557', '2026-11-04T00:49:40.5751557'),
(120, 4, 46, 4, '2026-11-07T17:49:41.4323006', '2026-11-07T17:49:41.4323006'),
(121, 33, 46, 2, '2026-11-05T23:49:40.5751557', '2026-11-05T23:49:40.5751557'),
(122, 11, 47, 3, '2026-11-07T17:49:41.4323336', '2026-11-07T17:49:41.4323336'),
(123, 69, 47, 2, '2026-10-21T17:49:40.5751557', '2026-10-21T17:49:40.5751557'),
(124, 47, 48, 3, '2026-11-05T21:49:40.5751557', '2026-11-05T21:49:40.5751557'),
(125, 76, 48, 4, '2026-10-17T17:49:40.5751557', '2026-10-17T17:49:40.5751557'),
(126, 25, 49, 5, '2026-11-07T17:49:41.4323986', '2026-11-07T17:49:41.4323986'),
(127, 54, 49, 5, '2026-11-06T16:49:40.5751557', '2026-11-06T16:49:40.5751557'),
(128, 83, 49, 3, '2026-11-02T17:49:40.5751557', '2026-11-02T17:49:40.5751557'),
(129, 32, 50, 4, '2026-11-07T17:49:41.4324428', '2026-11-07T17:49:41.4324428'),
(130, 61, 50, 5, '2026-11-07T17:49:41.4324573', '2026-11-07T17:49:41.4324573'),
(131, 90, 50, 5, '2026-10-29T17:49:40.5751557', '2026-10-29T17:49:40.5751557'),
(132, 39, 51, 4, '2026-11-07T17:49:41.4324870', '2026-11-07T17:49:41.4324870'),
(133, 68, 51, 4, '2026-11-07T17:49:41.4325014', '2026-11-07T17:49:41.4325014'),
(134, 46, 52, 4, '2026-11-07T17:49:41.4325179', '2026-11-07T17:49:41.4325179'),
(135, 104, 52, 4, '2026-10-15T17:49:40.5751557', '2026-10-15T17:49:40.5751557'),
(136, 53, 53, 4, '2026-11-07T17:49:41.4325503', '2026-11-07T17:49:41.4325503'),
(137, 82, 53, 4, '2026-11-07T12:49:40.5751557', '2026-11-07T12:49:40.5751557'),
(138, 14, 54, 5, '2026-10-25T17:49:40.5751557', '2026-10-25T17:49:40.5751557'),
(139, 60, 54, 5, '2026-11-07T17:49:41.4325961', '2026-11-07T17:49:41.4325961'),
(140, 89, 54, 4, '2026-11-07T11:49:40.5751557', '2026-11-07T11:49:40.5751557'),
(141, 21, 55, 2, '2026-10-21T17:49:40.5751557', '2026-10-21T17:49:40.5751557'),
(142, 67, 55, 5, '2026-11-07T17:49:41.4326416', '2026-11-07T17:49:41.4326416'),
(143, 96, 55, 5, '2026-11-07T10:49:40.5751557', '2026-11-07T10:49:40.5751557'),
(144, 28, 56, 4, '2026-10-17T17:49:40.5751557', '2026-10-17T17:49:40.5751557'),
(145, 74, 56, 2, '2026-11-07T17:49:41.4326854', '2026-11-07T17:49:41.4326854'),
(146, 6, 57, 3, '2026-11-07T17:49:41.4327014', '2026-11-07T17:49:41.4327014'),
(147, 81, 57, 2, '2026-11-04T08:49:40.5751557', '2026-11-04T08:49:40.5751557'),
(148, 42, 58, 3, '2026-10-24T17:49:40.5751557', '2026-10-24T17:49:40.5751557'),
(149, 88, 58, 4, '2026-11-04T07:49:40.5751557', '2026-11-04T07:49:40.5751557');
SET IDENTITY_INSERT [CourseRatings] OFF;
-- WalletTransactions (620)
SET IDENTITY_INSERT [WalletTransactions] ON;
INSERT INTO [WalletTransactions] ([Id], [UserId], [Amount], [Type], [CourseId], [Description], [CreatedAt], [RelatedTransactionId]) VALUES
(1, 37, 1500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-04T17:29:39.1921552', NULL),
(2, 37, -1499.00, N'Purchase', 1, N'İleri Seviye C# ve .NET API', '2026-11-04T17:49:39.1921552', NULL),
(3, 37, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-18T16:29:39.1921552', NULL),
(4, 37, -599.00, N'Purchase', 30, N'Fonksiyonel Antrenman', '2026-09-18T16:49:39.1921552', NULL),
(5, 38, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-04T16:29:39.1921552', NULL),
(6, 38, -799.00, N'Purchase', 14, N'Jeomorfoloji', '2026-10-04T16:49:39.1921552', NULL),
(7, 38, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-18T15:29:39.1921552', NULL),
(8, 38, -749.00, N'Purchase', 43, N'Mikroekonomiye Giriş', '2026-08-18T15:49:39.1921552', NULL),
(9, 38, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-02T14:29:39.1921552', NULL),
(10, 38, -899.00, N'Purchase', 72, N'Rönesans''tan Modernizme Sanat Tarihi', '2026-07-02T14:49:39.1921552', NULL),
(11, 38, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-02T13:29:39.1921552', NULL),
(12, 38, -899.00, N'Purchase', 101, N'Seramik ve Heykel Atölyesi', '2026-11-02T13:49:39.1921552', NULL),
(13, 38, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-16T12:29:39.1921552', NULL),
(14, 38, -549.00, N'Purchase', 26, N'Sanat Tarihine Giriş', '2026-09-16T12:49:39.1921552', NULL),
(15, 39, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-03T15:29:39.1921552', NULL),
(16, 39, -1099.00, N'Purchase', 27, N'Piyano Eğitimi', '2026-09-03T15:49:39.1921552', NULL),
(17, 39, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-18T14:29:39.1921552', NULL),
(18, 39, -749.00, N'Purchase', 56, N'Suluboya Atölyesi', '2026-07-18T14:49:39.1921552', NULL),
(19, 39, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-01T13:29:39.1921552', NULL),
(20, 39, -949.00, N'Purchase', 85, N'KVKK ve Bilişim Hukuku', '2026-06-01T13:49:39.1921552', NULL),
(21, 39, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-02T12:29:39.1921552', NULL),
(22, 39, -749.00, N'Purchase', 10, N'Kimya', '2026-10-02T12:49:39.1921552', NULL),
(23, 40, 1500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-03T14:29:39.1921552', NULL),
(24, 40, -1499.00, N'Purchase', 40, N'Makine Öğrenmesine Giriş', '2026-08-03T14:49:39.1921552', NULL),
(25, 40, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-17T13:29:39.1921552', NULL),
(26, 40, -949.00, N'Purchase', 69, N'Kent Sosyolojisi ve Saha Araştırması', '2026-06-17T13:49:39.1921552', NULL),
(27, 40, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-18T12:29:39.1921552', NULL),
(28, 40, -999.00, N'Purchase', 98, N'Girişimcilik ve İş Stratejisi', '2026-10-18T12:49:39.1921552', NULL),
(29, 41, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-03T13:29:39.1921552', NULL),
(30, 41, -599.00, N'Purchase', 53, N'Sosyolojiye Giriş', '2026-07-03T13:49:39.1921552', NULL),
(31, 41, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-03T12:29:39.1921552', NULL),
(32, 41, -699.00, N'Purchase', 82, N'Anayasa Hukukuna Giriş', '2026-11-03T12:49:39.1921552', NULL),
(33, 42, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-02T12:29:39.1921552', NULL),
(34, 42, -949.00, N'Purchase', 66, N'Bilişsel Bilime Giriş', '2026-06-02T12:49:39.1921552', NULL),
(35, 42, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-03T11:29:39.1921552', NULL),
(36, 42, -749.00, N'Purchase', 95, N'Siyaset Bilimi ve Uluslararası İlişkilere Giriş', '2026-10-03T11:49:39.1921552', NULL),
(37, 42, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-17T10:29:39.1921552', NULL),
(38, 42, -799.00, N'Purchase', 20, N'İngilizce A1-A2', '2026-08-17T10:49:39.1921552', NULL),
(39, 42, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-01T09:29:39.1921552', NULL),
(40, 42, -549.00, N'Purchase', 49, N'Mantık ve Eleştirel Düşünme', '2026-07-01T09:49:39.1921552', NULL),
(41, 42, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-01T17:29:39.1921552', NULL),
(42, 42, -699.00, N'Purchase', 78, N'Mobil Fotoğrafçılık ve Video Kurgu', '2026-11-01T17:49:39.1921552', NULL),
(43, 43, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-19T11:29:39.1921552', NULL),
(44, 43, -1099.00, N'Purchase', 79, N'Genetik ve Moleküler Biyoloji', '2026-10-19T11:49:39.1921552', NULL),
(45, 43, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-02T10:29:39.1921552', NULL),
(46, 43, -999.00, N'Purchase', 4, N'Algoritmalar', '2026-09-02T10:49:39.1921552', NULL),
(47, 43, 500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-17T09:29:39.1921552', NULL),
(48, 43, -499.00, N'Purchase', 33, N'Temel Matematik', '2026-07-17T09:49:39.1921552', NULL),
(49, 43, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-05-31T17:29:39.1921552', NULL),
(50, 43, -1099.00, N'Purchase', 62, N'Osmanlı Türkçesi ve Metin Okumaları', '2026-05-31T17:49:39.1921552', NULL),
(51, 44, 1500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-18T10:29:39.1921552', NULL),
(52, 44, -1499.00, N'Purchase', 92, N'Docker, Kubernetes ve DevOps', '2026-09-18T10:49:39.1921552', NULL),
(53, 44, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-02T09:29:39.1921552', NULL),
(54, 44, -599.00, N'Purchase', 17, N'Coğrafya', '2026-08-02T09:49:39.1921552', NULL),
(55, 44, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-16T17:29:39.1921552', NULL),
(56, 44, -799.00, N'Purchase', 46, N'Muhasebenin Temelleri', '2026-06-16T17:49:39.1921552', NULL),
(57, 45, 1500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-18T09:29:39.1921552', NULL),
(58, 45, -1499.00, N'Purchase', 1, N'İleri Seviye C# ve .NET API', '2026-08-18T09:49:39.1921552', NULL),
(59, 45, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-02T17:29:39.1921552', NULL),
(60, 45, -599.00, N'Purchase', 30, N'Fonksiyonel Antrenman', '2026-07-02T17:49:39.1921552', NULL),
(61, 46, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-18T17:29:39.1921552', NULL),
(62, 46, -799.00, N'Purchase', 14, N'Jeomorfoloji', '2026-07-18T17:49:39.1921552', NULL),
(63, 46, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-01T16:29:39.1921552', NULL),
(64, 46, -749.00, N'Purchase', 43, N'Mikroekonomiye Giriş', '2026-06-01T16:49:39.1921552', NULL),
(65, 46, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-02T15:29:39.1921552', NULL),
(66, 46, -899.00, N'Purchase', 72, N'Rönesans''tan Modernizme Sanat Tarihi', '2026-10-02T15:49:39.1921552', NULL),
(67, 46, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-16T14:29:39.1921552', NULL),
(68, 46, -899.00, N'Purchase', 101, N'Seramik ve Heykel Atölyesi', '2026-08-16T14:49:39.1921552', NULL),
(69, 46, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-30T13:29:39.1921552', NULL),
(70, 46, -549.00, N'Purchase', 26, N'Sanat Tarihine Giriş', '2026-06-30T13:49:39.1921552', NULL),
(71, 47, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-17T16:29:39.1921552', NULL),
(72, 47, -1099.00, N'Purchase', 27, N'Piyano Eğitimi', '2026-06-17T16:49:39.1921552', NULL),
(73, 47, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-18T15:29:39.1921552', NULL),
(74, 47, -749.00, N'Purchase', 56, N'Suluboya Atölyesi', '2026-10-18T15:49:39.1921552', NULL),
(75, 47, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-01T14:29:39.1921552', NULL),
(76, 47, -949.00, N'Purchase', 85, N'KVKK ve Bilişim Hukuku', '2026-09-01T14:49:39.1921552', NULL),
(77, 47, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-16T13:29:39.1921552', NULL),
(78, 47, -749.00, N'Purchase', 10, N'Kimya', '2026-07-16T13:49:39.1921552', NULL),
(79, 48, 1500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-03T15:29:39.1921552', NULL),
(80, 48, -1499.00, N'Purchase', 40, N'Makine Öğrenmesine Giriş', '2026-11-03T15:49:39.1921552', NULL),
(81, 48, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-17T14:29:39.1921552', NULL),
(82, 48, -949.00, N'Purchase', 69, N'Kent Sosyolojisi ve Saha Araştırması', '2026-09-17T14:49:39.1921552', NULL),
(83, 48, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-01T13:29:39.1921552', NULL),
(84, 48, -999.00, N'Purchase', 98, N'Girişimcilik ve İş Stratejisi', '2026-08-01T13:49:39.1921552', NULL),
(85, 49, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-03T14:29:39.1921552', NULL),
(86, 49, -599.00, N'Purchase', 53, N'Sosyolojiye Giriş', '2026-10-03T14:49:39.1921552', NULL),
(87, 49, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-17T13:29:39.1921552', NULL),
(88, 49, -699.00, N'Purchase', 82, N'Anayasa Hukukuna Giriş', '2026-08-17T13:49:39.1921552', NULL),
(89, 50, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-02T13:29:39.1921552', NULL),
(90, 50, -949.00, N'Purchase', 66, N'Bilişsel Bilime Giriş', '2026-09-02T13:49:39.1921552', NULL),
(91, 50, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-17T12:29:39.1921552', NULL),
(92, 50, -749.00, N'Purchase', 95, N'Siyaset Bilimi ve Uluslararası İlişkilere Giriş', '2026-07-17T12:49:39.1921552', NULL),
(93, 50, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-05-31T11:29:39.1921552', NULL),
(94, 50, -799.00, N'Purchase', 20, N'İngilizce A1-A2', '2026-05-31T11:49:39.1921552', NULL),
(95, 50, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-01T10:29:39.1921552', NULL),
(96, 50, -549.00, N'Purchase', 49, N'Mantık ve Eleştirel Düşünme', '2026-10-01T10:49:39.1921552', NULL),
(97, 50, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-15T09:29:39.1921552', NULL),
(98, 50, -699.00, N'Purchase', 78, N'Mobil Fotoğrafçılık ve Video Kurgu', '2026-08-15T09:49:39.1921552', NULL),
(99, 51, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-02T12:29:39.1921552', NULL),
(100, 51, -1099.00, N'Purchase', 79, N'Genetik ve Moleküler Biyoloji', '2026-08-02T12:49:39.1921552', NULL),
(101, 51, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-16T11:29:39.1921552', NULL),
(102, 51, -999.00, N'Purchase', 4, N'Algoritmalar', '2026-06-16T11:49:39.1921552', NULL),
(103, 51, 500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-17T10:29:39.1921552', NULL),
(104, 51, -499.00, N'Purchase', 33, N'Temel Matematik', '2026-10-17T10:49:39.1921552', NULL),
(105, 51, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-31T09:29:39.1921552', NULL),
(106, 51, -1099.00, N'Purchase', 62, N'Osmanlı Türkçesi ve Metin Okumaları', '2026-08-31T09:49:39.1921552', NULL),
(107, 52, 1500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-02T11:29:39.1921552', NULL),
(108, 52, -1499.00, N'Purchase', 92, N'Docker, Kubernetes ve DevOps', '2026-07-02T11:49:39.1921552', NULL),
(109, 52, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-02T10:29:39.1921552', NULL),
(110, 52, -599.00, N'Purchase', 17, N'Coğrafya', '2026-11-02T10:49:39.1921552', NULL),
(111, 52, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-16T09:29:39.1921552', NULL),
(112, 52, -799.00, N'Purchase', 46, N'Muhasebenin Temelleri', '2026-09-16T09:49:39.1921552', NULL),
(113, 53, 1500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-01T10:29:39.1921552', NULL),
(114, 53, -1499.00, N'Purchase', 1, N'İleri Seviye C# ve .NET API', '2026-06-01T10:49:39.1921552', NULL),
(115, 53, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-02T09:29:39.1921552', NULL),
(116, 53, -599.00, N'Purchase', 30, N'Fonksiyonel Antrenman', '2026-10-02T09:49:39.1921552', NULL),
(117, 54, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-18T09:29:39.1921552', NULL),
(118, 54, -799.00, N'Purchase', 14, N'Jeomorfoloji', '2026-10-18T09:49:39.1921552', NULL),
(119, 54, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-01T17:29:39.1921552', NULL),
(120, 54, -749.00, N'Purchase', 43, N'Mikroekonomiye Giriş', '2026-09-01T17:49:39.1921552', NULL),
(121, 54, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-16T16:29:39.1921552', NULL),
(122, 54, -899.00, N'Purchase', 72, N'Rönesans''tan Modernizme Sanat Tarihi', '2026-07-16T16:49:39.1921552', NULL),
(123, 54, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-05-30T15:29:39.1921552', NULL),
(124, 54, -899.00, N'Purchase', 101, N'Seramik ve Heykel Atölyesi', '2026-05-30T15:49:39.1921552', NULL),
(125, 54, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-30T14:29:39.1921552', NULL),
(126, 54, -549.00, N'Purchase', 26, N'Sanat Tarihine Giriş', '2026-09-30T14:49:39.1921552', NULL),
(127, 55, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-17T17:29:39.1921552', NULL),
(128, 55, -1099.00, N'Purchase', 27, N'Piyano Eğitimi', '2026-09-17T17:49:39.1921552', NULL),
(129, 55, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-01T16:29:39.1921552', NULL),
(130, 55, -749.00, N'Purchase', 56, N'Suluboya Atölyesi', '2026-08-01T16:49:39.1921552', NULL),
(131, 55, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-15T15:29:39.1921552', NULL),
(132, 55, -949.00, N'Purchase', 85, N'KVKK ve Bilişim Hukuku', '2026-06-15T15:49:39.1921552', NULL),
(133, 55, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-16T14:29:39.1921552', NULL),
(134, 55, -749.00, N'Purchase', 10, N'Kimya', '2026-10-16T14:49:39.1921552', NULL),
(135, 56, 1500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-17T16:29:39.1921552', NULL),
(136, 56, -1499.00, N'Purchase', 40, N'Makine Öğrenmesine Giriş', '2026-08-17T16:49:39.1921552', NULL),
(137, 56, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-01T15:29:39.1921552', NULL),
(138, 56, -949.00, N'Purchase', 69, N'Kent Sosyolojisi ve Saha Araştırması', '2026-07-01T15:49:39.1921552', NULL),
(139, 56, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-01T14:29:39.1921552', NULL),
(140, 56, -999.00, N'Purchase', 98, N'Girişimcilik ve İş Stratejisi', '2026-11-01T14:49:39.1921552', NULL),
(141, 57, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-17T15:29:39.1921552', NULL),
(142, 57, -599.00, N'Purchase', 53, N'Sosyolojiye Giriş', '2026-07-17T15:49:39.1921552', NULL),
(143, 57, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-05-31T14:29:39.1921552', NULL),
(144, 57, -699.00, N'Purchase', 82, N'Anayasa Hukukuna Giriş', '2026-05-31T14:49:39.1921552', NULL),
(145, 58, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-16T14:29:39.1921552', NULL),
(146, 58, -949.00, N'Purchase', 66, N'Bilişsel Bilime Giriş', '2026-06-16T14:49:39.1921552', NULL),
(147, 58, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-17T13:29:39.1921552', NULL),
(148, 58, -749.00, N'Purchase', 95, N'Siyaset Bilimi ve Uluslararası İlişkilere Giriş', '2026-10-17T13:49:39.1921552', NULL),
(149, 58, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-31T12:29:39.1921552', NULL),
(150, 58, -799.00, N'Purchase', 20, N'İngilizce A1-A2', '2026-08-31T12:49:39.1921552', NULL),
(151, 58, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-15T11:29:39.1921552', NULL),
(152, 58, -549.00, N'Purchase', 49, N'Mantık ve Eleştirel Düşünme', '2026-07-15T11:49:39.1921552', NULL),
(153, 58, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-05-29T10:29:39.1921552', NULL),
(154, 58, -699.00, N'Purchase', 78, N'Mobil Fotoğrafçılık ve Video Kurgu', '2026-05-29T10:49:39.1921552', NULL),
(155, 59, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-02T13:29:39.1921552', NULL),
(156, 59, -1099.00, N'Purchase', 79, N'Genetik ve Moleküler Biyoloji', '2026-11-02T13:49:39.1921552', NULL),
(157, 59, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-16T12:29:39.1921552', NULL),
(158, 59, -999.00, N'Purchase', 4, N'Algoritmalar', '2026-09-16T12:49:39.1921552', NULL),
(159, 59, 500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-31T11:29:39.1921552', NULL),
(160, 59, -499.00, N'Purchase', 33, N'Temel Matematik', '2026-07-31T11:49:39.1921552', NULL),
(161, 59, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-14T10:29:39.1921552', NULL),
(162, 59, -1099.00, N'Purchase', 62, N'Osmanlı Türkçesi ve Metin Okumaları', '2026-06-14T10:49:39.1921552', NULL),
(163, 60, 1500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-02T12:29:39.1921552', NULL),
(164, 60, -1499.00, N'Purchase', 92, N'Docker, Kubernetes ve DevOps', '2026-10-02T12:49:39.1921552', NULL),
(165, 60, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-16T11:29:39.1921552', NULL),
(166, 60, -599.00, N'Purchase', 17, N'Coğrafya', '2026-08-16T11:49:39.1921552', NULL),
(167, 60, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-30T10:29:39.1921552', NULL),
(168, 60, -799.00, N'Purchase', 46, N'Muhasebenin Temelleri', '2026-06-30T10:49:39.1921552', NULL),
(169, 61, 1500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-01T11:29:39.1921552', NULL),
(170, 61, -1499.00, N'Purchase', 1, N'İleri Seviye C# ve .NET API', '2026-09-01T11:49:39.1921552', NULL),
(171, 61, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-16T10:29:39.1921552', NULL),
(172, 61, -599.00, N'Purchase', 30, N'Fonksiyonel Antrenman', '2026-07-16T10:49:39.1921552', NULL),
(173, 62, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-01T10:29:39.1921552', NULL),
(174, 62, -799.00, N'Purchase', 14, N'Jeomorfoloji', '2026-08-01T10:49:39.1921552', NULL),
(175, 62, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-15T09:29:39.1921552', NULL),
(176, 62, -749.00, N'Purchase', 43, N'Mikroekonomiye Giriş', '2026-06-15T09:49:39.1921552', NULL),
(177, 62, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-16T17:29:39.1921552', NULL),
(178, 62, -899.00, N'Purchase', 72, N'Rönesans''tan Modernizme Sanat Tarihi', '2026-10-16T17:49:39.1921552', NULL),
(179, 62, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-30T16:29:39.1921552', NULL),
(180, 62, -899.00, N'Purchase', 101, N'Seramik ve Heykel Atölyesi', '2026-08-30T16:49:39.1921552', NULL),
(181, 62, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-14T15:29:39.1921552', NULL),
(182, 62, -549.00, N'Purchase', 26, N'Sanat Tarihine Giriş', '2026-07-14T15:49:39.1921552', NULL),
(183, 63, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-01T09:29:39.1921552', NULL),
(184, 63, -1099.00, N'Purchase', 27, N'Piyano Eğitimi', '2026-07-01T09:49:39.1921552', NULL),
(185, 63, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-01T17:29:39.1921552', NULL),
(186, 63, -749.00, N'Purchase', 56, N'Suluboya Atölyesi', '2026-11-01T17:49:39.1921552', NULL),
(187, 63, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-15T16:29:39.1921552', NULL),
(188, 63, -949.00, N'Purchase', 85, N'KVKK ve Bilişim Hukuku', '2026-09-15T16:49:39.1921552', NULL),
(189, 63, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-30T15:29:39.1921552', NULL),
(190, 63, -749.00, N'Purchase', 10, N'Kimya', '2026-07-30T15:49:39.1921552', NULL),
(191, 64, 1500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-05-31T17:29:39.1921552', NULL),
(192, 64, -1499.00, N'Purchase', 40, N'Makine Öğrenmesine Giriş', '2026-05-31T17:49:39.1921552', NULL),
(193, 64, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-01T16:29:39.1921552', NULL),
(194, 64, -949.00, N'Purchase', 69, N'Kent Sosyolojisi ve Saha Araştırması', '2026-10-01T16:49:39.1921552', NULL),
(195, 64, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-15T15:29:39.1921552', NULL),
(196, 64, -999.00, N'Purchase', 98, N'Girişimcilik ve İş Stratejisi', '2026-08-15T15:49:39.1921552', NULL),
(197, 40, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-21T17:29:39.1921552', NULL),
(198, 40, -999.00, N'Purchase', 16, N'Harita Bilgisi ve CBS', '2026-09-21T17:49:39.1921552', NULL),
(199, 47, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-20T17:29:39.1921552', NULL),
(200, 47, -599.00, N'Purchase', 12, N'Astronomiye Giriş', '2026-07-20T17:49:39.1921552', NULL),
(201, 54, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-05T17:29:39.1921552', NULL),
(202, 54, -699.00, N'Purchase', 6, N'Matematik', '2026-10-05T17:49:39.1921552', NULL),
(203, 61, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-03T17:29:39.1921552', NULL),
(204, 61, -999.00, N'Purchase', 2, N'Java', '2026-08-03T17:49:39.1921552', NULL),
(205, 2, 1049.30, N'Earning', 1, N'İleri Seviye C# ve .NET API', '2026-11-04T17:49:39.1921552', 2),
(206, 15, 419.30, N'Earning', 30, N'Fonksiyonel Antrenman', '2026-09-18T16:49:39.1921552', 4),
(207, 7, 559.30, N'Earning', 14, N'Jeomorfoloji', '2026-10-04T16:49:39.1921552', 6),
(208, 21, 524.30, N'Earning', 43, N'Mikroekonomiye Giriş', '2026-08-18T15:49:39.1921552', 8),
(209, 13, 629.30, N'Earning', 72, N'Rönesans''tan Modernizme Sanat Tarihi', '2026-07-02T14:49:39.1921552', 10),
(210, 13, 629.30, N'Earning', 101, N'Seramik ve Heykel Atölyesi', '2026-11-02T13:49:39.1921552', 12),
(211, 13, 384.30, N'Earning', 26, N'Sanat Tarihine Giriş', '2026-09-16T12:49:39.1921552', 14),
(212, 14, 769.30, N'Earning', 27, N'Piyano Eğitimi', '2026-09-03T15:49:39.1921552', 16),
(213, 13, 524.30, N'Earning', 56, N'Suluboya Atölyesi', '2026-07-18T14:49:39.1921552', 18),
(214, 34, 664.30, N'Earning', 85, N'KVKK ve Bilişim Hukuku', '2026-06-01T13:49:39.1921552', 20),
(215, 5, 524.30, N'Earning', 10, N'Kimya', '2026-10-02T12:49:39.1921552', 22),
(216, 19, 1049.30, N'Earning', 40, N'Makine Öğrenmesine Giriş', '2026-08-03T14:49:39.1921552', 24),
(217, 27, 664.30, N'Earning', 69, N'Kent Sosyolojisi ve Saha Araştırması', '2026-06-17T13:49:39.1921552', 26),
(218, 21, 699.30, N'Earning', 98, N'Girişimcilik ve İş Stratejisi', '2026-10-18T12:49:39.1921552', 28),
(219, 27, 419.30, N'Earning', 53, N'Sosyolojiye Giriş', '2026-07-03T13:49:39.1921552', 30),
(220, 34, 489.30, N'Earning', 82, N'Anayasa Hukukuna Giriş', '2026-11-03T12:49:39.1921552', 32),
(221, 33, 664.30, N'Earning', 66, N'Bilişsel Bilime Giriş', '2026-06-02T12:49:39.1921552', 34),
(222, 27, 524.30, N'Earning', 95, N'Siyaset Bilimi ve Uluslararası İlişkilere Giriş', '2026-10-03T11:49:39.1921552', 36),
(223, 10, 559.30, N'Earning', 20, N'İngilizce A1-A2', '2026-08-17T10:49:39.1921552', 38),
(224, 24, 384.30, N'Earning', 49, N'Mantık ve Eleştirel Düşünme', '2026-07-01T09:49:39.1921552', 40),
(225, 25, 489.30, N'Earning', 78, N'Mobil Fotoğrafçılık ve Video Kurgu', '2026-11-01T17:49:39.1921552', 42),
(226, 5, 769.30, N'Earning', 79, N'Genetik ve Moleküler Biyoloji', '2026-10-19T11:49:39.1921552', 44),
(227, 3, 699.30, N'Earning', 4, N'Algoritmalar', '2026-09-02T10:49:39.1921552', 46),
(228, 4, 349.30, N'Earning', 33, N'Temel Matematik', '2026-07-17T09:49:39.1921552', 48),
(229, 30, 769.30, N'Earning', 62, N'Osmanlı Türkçesi ve Metin Okumaları', '2026-05-31T17:49:39.1921552', 50),
(230, 36, 1049.30, N'Earning', 92, N'Docker, Kubernetes ve DevOps', '2026-09-18T10:49:39.1921552', 52),
(231, 7, 419.30, N'Earning', 17, N'Coğrafya', '2026-08-02T09:49:39.1921552', 54),
(232, 22, 559.30, N'Earning', 46, N'Muhasebenin Temelleri', '2026-06-16T17:49:39.1921552', 56),
(233, 2, 1049.30, N'Earning', 1, N'İleri Seviye C# ve .NET API', '2026-08-18T09:49:39.1921552', 58),
(234, 15, 419.30, N'Earning', 30, N'Fonksiyonel Antrenman', '2026-07-02T17:49:39.1921552', 60),
(235, 7, 559.30, N'Earning', 14, N'Jeomorfoloji', '2026-07-18T17:49:39.1921552', 62),
(236, 21, 524.30, N'Earning', 43, N'Mikroekonomiye Giriş', '2026-06-01T16:49:39.1921552', 64),
(237, 13, 629.30, N'Earning', 72, N'Rönesans''tan Modernizme Sanat Tarihi', '2026-10-02T15:49:39.1921552', 66),
(238, 13, 629.30, N'Earning', 101, N'Seramik ve Heykel Atölyesi', '2026-08-16T14:49:39.1921552', 68),
(239, 13, 384.30, N'Earning', 26, N'Sanat Tarihine Giriş', '2026-06-30T13:49:39.1921552', 70),
(240, 14, 769.30, N'Earning', 27, N'Piyano Eğitimi', '2026-06-17T16:49:39.1921552', 72),
(241, 13, 524.30, N'Earning', 56, N'Suluboya Atölyesi', '2026-10-18T15:49:39.1921552', 74),
(242, 34, 664.30, N'Earning', 85, N'KVKK ve Bilişim Hukuku', '2026-09-01T14:49:39.1921552', 76),
(243, 5, 524.30, N'Earning', 10, N'Kimya', '2026-07-16T13:49:39.1921552', 78),
(244, 19, 1049.30, N'Earning', 40, N'Makine Öğrenmesine Giriş', '2026-11-03T15:49:39.1921552', 80),
(245, 27, 664.30, N'Earning', 69, N'Kent Sosyolojisi ve Saha Araştırması', '2026-09-17T14:49:39.1921552', 82),
(246, 21, 699.30, N'Earning', 98, N'Girişimcilik ve İş Stratejisi', '2026-08-01T13:49:39.1921552', 84),
(247, 27, 419.30, N'Earning', 53, N'Sosyolojiye Giriş', '2026-10-03T14:49:39.1921552', 86),
(248, 34, 489.30, N'Earning', 82, N'Anayasa Hukukuna Giriş', '2026-08-17T13:49:39.1921552', 88),
(249, 33, 664.30, N'Earning', 66, N'Bilişsel Bilime Giriş', '2026-09-02T13:49:39.1921552', 90),
(250, 27, 524.30, N'Earning', 95, N'Siyaset Bilimi ve Uluslararası İlişkilere Giriş', '2026-07-17T12:49:39.1921552', 92),
(251, 10, 559.30, N'Earning', 20, N'İngilizce A1-A2', '2026-05-31T11:49:39.1921552', 94),
(252, 24, 384.30, N'Earning', 49, N'Mantık ve Eleştirel Düşünme', '2026-10-01T10:49:39.1921552', 96),
(253, 25, 489.30, N'Earning', 78, N'Mobil Fotoğrafçılık ve Video Kurgu', '2026-08-15T09:49:39.1921552', 98),
(254, 5, 769.30, N'Earning', 79, N'Genetik ve Moleküler Biyoloji', '2026-08-02T12:49:39.1921552', 100),
(255, 3, 699.30, N'Earning', 4, N'Algoritmalar', '2026-06-16T11:49:39.1921552', 102),
(256, 4, 349.30, N'Earning', 33, N'Temel Matematik', '2026-10-17T10:49:39.1921552', 104),
(257, 30, 769.30, N'Earning', 62, N'Osmanlı Türkçesi ve Metin Okumaları', '2026-08-31T09:49:39.1921552', 106),
(258, 36, 1049.30, N'Earning', 92, N'Docker, Kubernetes ve DevOps', '2026-07-02T11:49:39.1921552', 108),
(259, 7, 419.30, N'Earning', 17, N'Coğrafya', '2026-11-02T10:49:39.1921552', 110),
(260, 22, 559.30, N'Earning', 46, N'Muhasebenin Temelleri', '2026-09-16T09:49:39.1921552', 112),
(261, 2, 1049.30, N'Earning', 1, N'İleri Seviye C# ve .NET API', '2026-06-01T10:49:39.1921552', 114),
(262, 15, 419.30, N'Earning', 30, N'Fonksiyonel Antrenman', '2026-10-02T09:49:39.1921552', 116),
(263, 7, 559.30, N'Earning', 14, N'Jeomorfoloji', '2026-10-18T09:49:39.1921552', 118),
(264, 21, 524.30, N'Earning', 43, N'Mikroekonomiye Giriş', '2026-09-01T17:49:39.1921552', 120),
(265, 13, 629.30, N'Earning', 72, N'Rönesans''tan Modernizme Sanat Tarihi', '2026-07-16T16:49:39.1921552', 122),
(266, 13, 629.30, N'Earning', 101, N'Seramik ve Heykel Atölyesi', '2026-05-30T15:49:39.1921552', 124),
(267, 13, 384.30, N'Earning', 26, N'Sanat Tarihine Giriş', '2026-09-30T14:49:39.1921552', 126),
(268, 14, 769.30, N'Earning', 27, N'Piyano Eğitimi', '2026-09-17T17:49:39.1921552', 128),
(269, 13, 524.30, N'Earning', 56, N'Suluboya Atölyesi', '2026-08-01T16:49:39.1921552', 130),
(270, 34, 664.30, N'Earning', 85, N'KVKK ve Bilişim Hukuku', '2026-06-15T15:49:39.1921552', 132),
(271, 5, 524.30, N'Earning', 10, N'Kimya', '2026-10-16T14:49:39.1921552', 134),
(272, 19, 1049.30, N'Earning', 40, N'Makine Öğrenmesine Giriş', '2026-08-17T16:49:39.1921552', 136),
(273, 27, 664.30, N'Earning', 69, N'Kent Sosyolojisi ve Saha Araştırması', '2026-07-01T15:49:39.1921552', 138),
(274, 21, 699.30, N'Earning', 98, N'Girişimcilik ve İş Stratejisi', '2026-11-01T14:49:39.1921552', 140),
(275, 27, 419.30, N'Earning', 53, N'Sosyolojiye Giriş', '2026-07-17T15:49:39.1921552', 142),
(276, 34, 489.30, N'Earning', 82, N'Anayasa Hukukuna Giriş', '2026-05-31T14:49:39.1921552', 144),
(277, 33, 664.30, N'Earning', 66, N'Bilişsel Bilime Giriş', '2026-06-16T14:49:39.1921552', 146),
(278, 27, 524.30, N'Earning', 95, N'Siyaset Bilimi ve Uluslararası İlişkilere Giriş', '2026-10-17T13:49:39.1921552', 148),
(279, 10, 559.30, N'Earning', 20, N'İngilizce A1-A2', '2026-08-31T12:49:39.1921552', 150),
(280, 24, 384.30, N'Earning', 49, N'Mantık ve Eleştirel Düşünme', '2026-07-15T11:49:39.1921552', 152),
(281, 25, 489.30, N'Earning', 78, N'Mobil Fotoğrafçılık ve Video Kurgu', '2026-05-29T10:49:39.1921552', 154),
(282, 5, 769.30, N'Earning', 79, N'Genetik ve Moleküler Biyoloji', '2026-11-02T13:49:39.1921552', 156),
(283, 3, 699.30, N'Earning', 4, N'Algoritmalar', '2026-09-16T12:49:39.1921552', 158),
(284, 4, 349.30, N'Earning', 33, N'Temel Matematik', '2026-07-31T11:49:39.1921552', 160),
(285, 30, 769.30, N'Earning', 62, N'Osmanlı Türkçesi ve Metin Okumaları', '2026-06-14T10:49:39.1921552', 162),
(286, 36, 1049.30, N'Earning', 92, N'Docker, Kubernetes ve DevOps', '2026-10-02T12:49:39.1921552', 164),
(287, 7, 419.30, N'Earning', 17, N'Coğrafya', '2026-08-16T11:49:39.1921552', 166),
(288, 22, 559.30, N'Earning', 46, N'Muhasebenin Temelleri', '2026-06-30T10:49:39.1921552', 168),
(289, 2, 1049.30, N'Earning', 1, N'İleri Seviye C# ve .NET API', '2026-09-01T11:49:39.1921552', 170),
(290, 15, 419.30, N'Earning', 30, N'Fonksiyonel Antrenman', '2026-07-16T10:49:39.1921552', 172),
(291, 7, 559.30, N'Earning', 14, N'Jeomorfoloji', '2026-08-01T10:49:39.1921552', 174),
(292, 21, 524.30, N'Earning', 43, N'Mikroekonomiye Giriş', '2026-06-15T09:49:39.1921552', 176),
(293, 13, 629.30, N'Earning', 72, N'Rönesans''tan Modernizme Sanat Tarihi', '2026-10-16T17:49:39.1921552', 178),
(294, 13, 629.30, N'Earning', 101, N'Seramik ve Heykel Atölyesi', '2026-08-30T16:49:39.1921552', 180),
(295, 13, 384.30, N'Earning', 26, N'Sanat Tarihine Giriş', '2026-07-14T15:49:39.1921552', 182),
(296, 14, 769.30, N'Earning', 27, N'Piyano Eğitimi', '2026-07-01T09:49:39.1921552', 184),
(297, 13, 524.30, N'Earning', 56, N'Suluboya Atölyesi', '2026-11-01T17:49:39.1921552', 186),
(298, 34, 664.30, N'Earning', 85, N'KVKK ve Bilişim Hukuku', '2026-09-15T16:49:39.1921552', 188),
(299, 5, 524.30, N'Earning', 10, N'Kimya', '2026-07-30T15:49:39.1921552', 190),
(300, 19, 1049.30, N'Earning', 40, N'Makine Öğrenmesine Giriş', '2026-05-31T17:49:39.1921552', 192),
(301, 27, 664.30, N'Earning', 69, N'Kent Sosyolojisi ve Saha Araştırması', '2026-10-01T16:49:39.1921552', 194),
(302, 21, 699.30, N'Earning', 98, N'Girişimcilik ve İş Stratejisi', '2026-08-15T15:49:39.1921552', 196),
(303, 8, 699.30, N'Earning', 16, N'Harita Bilgisi ve CBS', '2026-09-21T17:49:39.1921552', 198),
(304, 40, 999.00, N'Refund', 16, N'Harita Bilgisi ve CBS', '2026-09-23T17:49:39.1921552', 198),
(305, 8, -699.30, N'EarningReversal', 16, N'Harita Bilgisi ve CBS', '2026-09-23T17:49:39.1921552', 198),
(306, 6, 419.30, N'Earning', 12, N'Astronomiye Giriş', '2026-07-20T17:49:39.1921552', 200),
(307, 47, 599.00, N'Refund', 12, N'Astronomiye Giriş', '2026-07-22T17:49:39.1921552', 200),
(308, 6, -419.30, N'EarningReversal', 12, N'Astronomiye Giriş', '2026-07-22T17:49:39.1921552', 200),
(309, 4, 489.30, N'Earning', 6, N'Matematik', '2026-10-05T17:49:39.1921552', 202),
(310, 54, 699.00, N'Refund', 6, N'Matematik', '2026-10-07T17:49:39.1921552', 202),
(311, 4, -489.30, N'EarningReversal', 6, N'Matematik', '2026-10-07T17:49:39.1921552', 202),
(312, 2, 699.30, N'Earning', 2, N'Java', '2026-08-03T17:49:39.1921552', 204),
(313, 61, 999.00, N'Refund', 2, N'Java', '2026-08-05T17:49:39.1921552', 204),
(314, 2, -699.30, N'EarningReversal', 2, N'Java', '2026-08-05T17:49:39.1921552', 204),
(315, 65, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-07T16:29:40.5751557', NULL),
(316, 65, -1099.00, N'Purchase', 93, N'Unity ile Oyun Geliştirme', '2026-11-07T16:49:40.5751557', NULL),
(317, 65, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-04T16:29:40.5751557', NULL),
(318, 65, -649.00, N'Purchase', 18, N'Tarih', '2026-11-04T16:49:40.5751557', NULL),
(319, 65, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-28T17:29:40.5751557', NULL),
(320, 65, -649.00, N'Purchase', 47, N'Türk Edebiyatına Giriş', '2026-10-28T17:49:40.5751557', NULL),
(321, 66, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-06T15:29:40.5751557', NULL),
(322, 66, -1099.00, N'Purchase', 100, N'Blender ile 3B Modelleme ve Animasyon', '2026-11-06T15:49:40.5751557', NULL),
(323, 66, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-03T15:29:40.5751557', NULL),
(324, 66, -699.00, N'Purchase', 25, N'Karakalem ve Desen', '2026-11-03T15:49:40.5751557', NULL),
(325, 66, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-23T17:29:40.5751557', NULL),
(326, 66, -799.00, N'Purchase', 54, N'İspanyolca A1', '2026-10-23T17:49:40.5751557', NULL),
(327, 67, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-05T14:29:40.5751557', NULL),
(328, 67, -899.00, N'Purchase', 3, N'Veri Yapıları', '2026-11-05T14:49:40.5751557', NULL),
(329, 67, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-02T14:29:40.5751557', NULL),
(330, 67, -549.00, N'Purchase', 32, N'Topluluk Önünde Konuşma', '2026-11-02T14:49:40.5751557', NULL),
(331, 67, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-18T17:29:40.5751557', NULL),
(332, 67, -899.00, N'Purchase', 61, N'Cumhuriyet Dönemi Türk Edebiyatı', '2026-10-18T17:49:40.5751557', NULL),
(333, 68, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-04T13:29:40.5751557', NULL),
(334, 68, -749.00, N'Purchase', 10, N'Kimya', '2026-11-04T13:49:40.5751557', NULL),
(335, 68, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-07T13:29:40.5751557', NULL),
(336, 68, -1199.00, N'Purchase', 39, N'Python ile Veri Analizi', '2026-11-07T13:49:40.5751557', NULL),
(337, 68, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-13T17:29:40.5751557', NULL),
(338, 68, -699.00, N'Purchase', 68, N'YKS Tarih Soru Kampı', '2026-10-13T17:49:40.5751557', NULL),
(339, 69, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-03T12:29:40.5751557', NULL),
(340, 69, -599.00, N'Purchase', 17, N'Coğrafya', '2026-11-03T12:49:40.5751557', NULL),
(341, 69, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-06T12:29:40.5751557', NULL),
(342, 69, -799.00, N'Purchase', 46, N'Muhasebenin Temelleri', '2026-11-06T12:49:40.5751557', NULL),
(343, 69, 500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-28T17:29:40.5751557', NULL),
(344, 69, -499.00, N'Purchase', 75, N'YKS ve LGS Sınav Stratejileri', '2026-10-28T17:49:40.5751557', NULL),
(345, 70, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-02T11:29:40.5751557', NULL),
(346, 70, -999.00, N'Purchase', 24, N'Grafik Tasarım ve Tipografi', '2026-11-02T11:49:40.5751557', NULL),
(347, 70, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-05T11:29:40.5751557', NULL),
(348, 70, -599.00, N'Purchase', 53, N'Sosyolojiye Giriş', '2026-11-05T11:49:40.5751557', NULL),
(349, 70, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-23T17:29:40.5751557', NULL),
(350, 70, -699.00, N'Purchase', 82, N'Anayasa Hukukuna Giriş', '2026-10-23T17:49:40.5751557', NULL),
(351, 71, 500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-07T10:29:40.5751557', NULL),
(352, 71, -399.00, N'Purchase', 31, N'Etkili Çalışma Teknikleri', '2026-11-07T10:49:40.5751557', NULL),
(353, 71, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-04T10:29:40.5751557', NULL),
(354, 71, -799.00, N'Purchase', 60, N'Akademik Türkçe ve Kompozisyon', '2026-11-04T10:49:40.5751557', NULL),
(355, 71, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-18T17:29:40.5751557', NULL),
(356, 71, -1199.00, N'Purchase', 89, N'SolidWorks ile CAD ve Mekanik Tasarım', '2026-10-18T17:49:40.5751557', NULL),
(357, 72, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-06T09:29:40.5751557', NULL),
(358, 72, -899.00, N'Purchase', 38, N'SQL ve Veritabanı Tasarımı', '2026-11-06T09:49:40.5751557', NULL),
(359, 72, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-03T09:29:40.5751557', NULL),
(360, 72, -1099.00, N'Purchase', 67, N'Araştırma Yöntemleri ve Deney Tasarımı', '2026-11-03T09:49:40.5751557', NULL),
(361, 72, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-13T17:29:40.5751557', NULL),
(362, 72, -649.00, N'Purchase', 96, N'Hukukun Temel Kavramları ve Anayasa Bilgisi', '2026-10-13T17:49:40.5751557', NULL),
(363, 73, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-05T08:29:40.5751557', NULL),
(364, 73, -699.00, N'Purchase', 45, N'Kişisel Finans ve Yatırım', '2026-11-05T08:49:40.5751557', NULL),
(365, 73, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-02T08:29:40.5751557', NULL),
(366, 73, -649.00, N'Purchase', 74, N'Sporcu Beslenmesi ve Performans', '2026-11-02T08:49:40.5751557', NULL),
(367, 73, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-28T17:29:40.5751557', NULL),
(368, 73, -699.00, N'Purchase', 103, N'Hareket Bilimi ve Sakatlıktan Korunma', '2026-10-28T17:49:40.5751557', NULL),
(369, 74, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-04T07:29:40.5751557', NULL),
(370, 74, -1199.00, N'Purchase', 52, N'Kısa Film Yapımı', '2026-11-04T07:49:40.5751557', NULL),
(371, 74, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-07T07:29:40.5751557', NULL),
(372, 74, -899.00, N'Purchase', 81, N'Jeopolitik ve Beşeri Coğrafya', '2026-11-07T07:49:40.5751557', NULL),
(373, 74, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-23T17:29:40.5751557', NULL),
(374, 74, -699.00, N'Purchase', 6, N'Matematik', '2026-10-23T17:49:40.5751557', NULL),
(375, 75, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-03T06:29:40.5751557', NULL),
(376, 75, -599.00, N'Purchase', 59, N'Türkçe Dil Bilgisi ve Yazım Kuralları', '2026-11-03T06:49:40.5751557', NULL),
(377, 75, 1500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-06T06:29:40.5751557', NULL),
(378, 75, -1499.00, N'Purchase', 88, N'ROS ile Robotik ve Kontrol Sistemleri', '2026-11-06T06:49:40.5751557', NULL),
(379, 75, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-18T17:29:40.5751557', NULL),
(380, 75, -699.00, N'Purchase', 13, N'Fiziki Coğrafya', '2026-10-18T17:49:40.5751557', NULL),
(381, 76, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-02T05:29:40.5751557', NULL),
(382, 76, -949.00, N'Purchase', 66, N'Bilişsel Bilime Giriş', '2026-11-02T05:49:40.5751557', NULL),
(383, 76, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-05T05:29:40.5751557', NULL),
(384, 76, -749.00, N'Purchase', 95, N'Siyaset Bilimi ve Uluslararası İlişkilere Giriş', '2026-11-05T05:49:40.5751557', NULL),
(385, 76, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-13T17:29:40.5751557', NULL),
(386, 76, -799.00, N'Purchase', 20, N'İngilizce A1-A2', '2026-10-13T17:49:40.5751557', NULL),
(387, 77, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-07T04:29:40.5751557', NULL),
(388, 77, -999.00, N'Purchase', 73, N'Armoni ve Beste Atölyesi', '2026-11-07T04:49:40.5751557', NULL),
(389, 77, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-04T04:29:40.5751557', NULL),
(390, 77, -1199.00, N'Purchase', 102, N'Ableton ile Müzik Prodüksiyonu', '2026-11-04T04:49:40.5751557', NULL),
(391, 77, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-28T17:29:40.5751557', NULL),
(392, 77, -1099.00, N'Purchase', 27, N'Piyano Eğitimi', '2026-10-28T17:49:40.5751557', NULL),
(393, 78, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-06T03:29:40.5751557', NULL),
(394, 78, -649.00, N'Purchase', 80, N'LGS Fen Bilimleri Kampı', '2026-11-06T03:49:40.5751557', NULL),
(395, 78, 1500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-03T03:29:40.5751557', NULL),
(396, 78, -1299.00, N'Purchase', 5, N'React ile Modern Web Geliştirme', '2026-11-03T03:49:40.5751557', NULL),
(397, 78, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-23T17:29:40.5751557', NULL),
(398, 78, -1099.00, N'Purchase', 34, N'Kalkülüs ve Analiz', '2026-10-23T17:49:40.5751557', NULL),
(399, 79, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-05T02:29:40.5751557', NULL),
(400, 79, -799.00, N'Purchase', 87, N'Temel Elektronik ve Devre Analizi', '2026-11-05T02:49:40.5751557', NULL),
(401, 79, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-02T02:29:40.5751557', NULL),
(402, 79, -599.00, N'Purchase', 12, N'Astronomiye Giriş', '2026-11-02T02:49:40.5751557', NULL),
(403, 79, 1750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-18T17:29:40.5751557', NULL),
(404, 79, -1699.00, N'Purchase', 41, N'Derin Öğrenme ve Sinir Ağları', '2026-10-18T17:49:40.5751557', NULL),
(405, 80, 1750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-04T01:29:40.5751557', NULL),
(406, 80, -1599.00, N'Purchase', 94, N'Büyük Veri ve Veri Mühendisliği', '2026-11-04T01:49:40.5751557', NULL),
(407, 80, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-07T01:29:40.5751557', NULL),
(408, 80, -599.00, N'Purchase', 19, N'Cumhuriyet Tarihi', '2026-11-07T01:49:40.5751557', NULL),
(409, 80, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-13T17:29:40.5751557', NULL),
(410, 80, -599.00, N'Purchase', 48, N'Felsefeye Giriş', '2026-10-13T17:49:40.5751557', NULL),
(411, 81, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-03T00:29:40.5751557', NULL),
(412, 81, -899.00, N'Purchase', 101, N'Seramik ve Heykel Atölyesi', '2026-11-03T00:49:40.5751557', NULL),
(413, 81, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-06T00:29:40.5751557', NULL),
(414, 81, -549.00, N'Purchase', 26, N'Sanat Tarihine Giriş', '2026-11-06T00:49:40.5751557', NULL),
(415, 81, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-28T17:29:40.5751557', NULL),
(416, 81, -699.00, N'Purchase', 55, N'Müzik Teorisi ve Kulak Eğitimi', '2026-10-28T17:49:40.5751557', NULL),
(417, 82, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-01T23:29:40.5751557', NULL),
(418, 82, -999.00, N'Purchase', 4, N'Algoritmalar', '2026-11-01T23:49:40.5751557', NULL),
(419, 82, 500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-04T23:29:40.5751557', NULL),
(420, 82, -499.00, N'Purchase', 33, N'Temel Matematik', '2026-11-04T23:49:40.5751557', NULL),
(421, 82, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-23T17:29:40.5751557', NULL),
(422, 82, -1099.00, N'Purchase', 62, N'Osmanlı Türkçesi ve Metin Okumaları', '2026-10-23T17:49:40.5751557', NULL),
(423, 83, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-06T22:29:40.5751557', NULL),
(424, 83, -749.00, N'Purchase', 11, N'Biyoloji', '2026-11-06T22:49:40.5751557', NULL),
(425, 83, 1500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-03T22:29:40.5751557', NULL),
(426, 83, -1499.00, N'Purchase', 40, N'Makine Öğrenmesine Giriş', '2026-11-03T22:49:40.5751557', NULL),
(427, 83, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-18T17:29:40.5751557', NULL),
(428, 83, -949.00, N'Purchase', 69, N'Kent Sosyolojisi ve Saha Araştırması', '2026-10-18T17:49:40.5751557', NULL),
(429, 84, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-05T21:29:40.5751557', NULL),
(430, 84, -649.00, N'Purchase', 18, N'Tarih', '2026-11-05T21:49:40.5751557', NULL),
(431, 84, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-02T21:29:40.5751557', NULL),
(432, 84, -649.00, N'Purchase', 47, N'Türk Edebiyatına Giriş', '2026-11-02T21:49:40.5751557', NULL),
(433, 84, 500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-13T17:29:40.5751557', NULL),
(434, 84, -449.00, N'Purchase', 76, N'Hızlı Okuma ve Not Alma Teknikleri', '2026-10-13T17:49:40.5751557', NULL),
(435, 85, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-05T16:29:40.5751557', NULL),
(436, 85, -699.00, N'Purchase', 25, N'Karakalem ve Desen', '2026-11-05T16:49:40.5751557', NULL),
(437, 85, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-02T16:29:40.5751557', NULL),
(438, 85, -799.00, N'Purchase', 54, N'İspanyolca A1', '2026-11-02T16:49:40.5751557', NULL),
(439, 85, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-28T17:29:40.5751557', NULL),
(440, 85, -849.00, N'Purchase', 83, N'İdare Hukuku ve Kamu Yönetimi', '2026-10-28T17:49:40.5751557', NULL),
(441, 86, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-04T15:29:40.5751557', NULL),
(442, 86, -549.00, N'Purchase', 32, N'Topluluk Önünde Konuşma', '2026-11-04T15:49:40.5751557', NULL),
(443, 86, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-07T15:29:40.5751557', NULL),
(444, 86, -899.00, N'Purchase', 61, N'Cumhuriyet Dönemi Türk Edebiyatı', '2026-11-07T15:49:40.5751557', NULL),
(445, 86, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-23T17:29:40.5751557', NULL),
(446, 86, -1199.00, N'Purchase', 90, N'Siber Güvenlik ve Ağ Temelleri', '2026-10-23T17:49:40.5751557', NULL),
(447, 87, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-03T14:29:40.5751557', NULL),
(448, 87, -1199.00, N'Purchase', 39, N'Python ile Veri Analizi', '2026-11-03T14:49:40.5751557', NULL),
(449, 87, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-06T14:29:40.5751557', NULL),
(450, 87, -699.00, N'Purchase', 68, N'YKS Tarih Soru Kampı', '2026-11-06T14:49:40.5751557', NULL),
(451, 87, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-18T17:29:40.5751557', NULL),
(452, 87, -649.00, N'Purchase', 97, N'Etik ve Estetiğe Giriş', '2026-10-18T17:49:40.5751557', NULL),
(453, 88, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-02T13:29:40.5751557', NULL),
(454, 88, -799.00, N'Purchase', 46, N'Muhasebenin Temelleri', '2026-11-02T13:49:40.5751557', NULL),
(455, 88, 500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-05T13:29:40.5751557', NULL),
(456, 88, -499.00, N'Purchase', 75, N'YKS ve LGS Sınav Stratejileri', '2026-11-05T13:49:40.5751557', NULL),
(457, 88, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-13T17:29:40.5751557', NULL),
(458, 88, -749.00, N'Purchase', 104, N'Araştırma Yöntemleri ve Bilimsel Etik', '2026-10-13T17:49:40.5751557', NULL),
(459, 89, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-07T12:29:40.5751557', NULL),
(460, 89, -599.00, N'Purchase', 53, N'Sosyolojiye Giriş', '2026-11-07T12:49:40.5751557', NULL),
(461, 89, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-04T12:29:40.5751557', NULL),
(462, 89, -699.00, N'Purchase', 82, N'Anayasa Hukukuna Giriş', '2026-11-04T12:49:40.5751557', NULL),
(463, 89, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-28T17:29:40.5751557', NULL),
(464, 89, -749.00, N'Purchase', 7, N'Matematik Geometri', '2026-10-28T17:49:40.5751557', NULL),
(465, 90, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-06T11:29:40.5751557', NULL),
(466, 90, -799.00, N'Purchase', 60, N'Akademik Türkçe ve Kompozisyon', '2026-11-06T11:49:40.5751557', NULL),
(467, 90, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-03T11:29:40.5751557', NULL),
(468, 90, -1199.00, N'Purchase', 89, N'SolidWorks ile CAD ve Mekanik Tasarım', '2026-11-03T11:49:40.5751557', NULL),
(469, 90, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-23T17:29:40.5751557', NULL),
(470, 90, -799.00, N'Purchase', 14, N'Jeomorfoloji', '2026-10-23T17:49:40.5751557', NULL),
(471, 91, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-05T10:29:40.5751557', NULL),
(472, 91, -1099.00, N'Purchase', 67, N'Araştırma Yöntemleri ve Deney Tasarımı', '2026-11-05T10:49:40.5751557', NULL),
(473, 91, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-02T10:29:40.5751557', NULL),
(474, 91, -649.00, N'Purchase', 96, N'Hukukun Temel Kavramları ve Anayasa Bilgisi', '2026-11-02T10:49:40.5751557', NULL),
(475, 91, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-18T17:29:40.5751557', NULL),
(476, 91, -899.00, N'Purchase', 21, N'İngilizce', '2026-10-18T17:49:40.5751557', NULL),
(477, 92, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-04T09:29:40.5751557', NULL),
(478, 92, -649.00, N'Purchase', 74, N'Sporcu Beslenmesi ve Performans', '2026-11-04T09:49:40.5751557', NULL),
(479, 92, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-07T09:29:40.5751557', NULL),
(480, 92, -699.00, N'Purchase', 103, N'Hareket Bilimi ve Sakatlıktan Korunma', '2026-11-07T09:49:40.5751557', NULL),
(481, 92, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-13T17:29:40.5751557', NULL),
(482, 92, -899.00, N'Purchase', 28, N'Gitar Eğitimi', '2026-10-13T17:49:40.5751557', NULL),
(483, 93, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-03T08:29:40.5751557', NULL),
(484, 93, -899.00, N'Purchase', 81, N'Jeopolitik ve Beşeri Coğrafya', '2026-11-03T08:49:40.5751557', NULL),
(485, 93, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-06T08:29:40.5751557', NULL),
(486, 93, -699.00, N'Purchase', 6, N'Matematik', '2026-11-06T08:49:40.5751557', NULL),
(487, 93, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-28T17:29:40.5751557', NULL),
(488, 93, -999.00, N'Purchase', 35, N'Lineer Cebir', '2026-10-28T17:49:40.5751557', NULL),
(489, 94, 1500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-02T07:29:40.5751557', NULL),
(490, 94, -1499.00, N'Purchase', 88, N'ROS ile Robotik ve Kontrol Sistemleri', '2026-11-02T07:49:40.5751557', NULL),
(491, 94, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-11-05T07:29:40.5751557', NULL),
(492, 94, -699.00, N'Purchase', 13, N'Fiziki Coğrafya', '2026-11-05T07:49:40.5751557', NULL),
(493, 94, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-23T17:29:40.5751557', NULL),
(494, 94, -899.00, N'Purchase', 42, N'Veri Görselleştirme ve Hikâye Anlatımı', '2026-10-23T17:49:40.5751557', NULL),
(495, 68, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-01T17:29:40.5751557', NULL),
(496, 68, -799.00, N'Purchase', 37, N'Python', '2026-06-01T17:49:40.5751557', NULL),
(497, 75, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-17T17:29:40.5751557', NULL),
(498, 75, -549.00, N'Purchase', 32, N'Topluluk Önünde Konuşma', '2026-08-17T17:49:40.5751557', NULL),
(499, 82, 1250.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-15T17:29:40.5751557', NULL),
(500, 82, -1099.00, N'Purchase', 27, N'Piyano Eğitimi', '2026-06-15T17:49:40.5751557', NULL);
INSERT INTO [WalletTransactions] ([Id], [UserId], [Amount], [Type], [CourseId], [Description], [CreatedAt], [RelatedTransactionId]) VALUES
(501, 89, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-31T17:29:40.5751557', NULL),
(502, 89, -849.00, N'Purchase', 22, N'Almanca A1', '2026-08-31T17:49:40.5751557', NULL),
(503, 36, 769.30, N'Earning', 93, N'Unity ile Oyun Geliştirme', '2026-11-07T16:49:40.5751557', 316),
(504, 9, 454.30, N'Earning', 18, N'Tarih', '2026-11-04T16:49:40.5751557', 318),
(505, 23, 454.30, N'Earning', 47, N'Türk Edebiyatına Giriş', '2026-10-28T17:49:40.5751557', 320),
(506, 12, 769.30, N'Earning', 100, N'Blender ile 3B Modelleme ve Animasyon', '2026-11-06T15:49:40.5751557', 322),
(507, 13, 489.30, N'Earning', 25, N'Karakalem ve Desen', '2026-11-03T15:49:40.5751557', 324),
(508, 28, 559.30, N'Earning', 54, N'İspanyolca A1', '2026-10-23T17:49:40.5751557', 326),
(509, 3, 629.30, N'Earning', 3, N'Veri Yapıları', '2026-11-05T14:49:40.5751557', 328),
(510, 16, 384.30, N'Earning', 32, N'Topluluk Önünde Konuşma', '2026-11-02T14:49:40.5751557', 330),
(511, 30, 629.30, N'Earning', 61, N'Cumhuriyet Dönemi Türk Edebiyatı', '2026-10-18T17:49:40.5751557', 332),
(512, 5, 524.30, N'Earning', 10, N'Kimya', '2026-11-04T13:49:40.5751557', 334),
(513, 20, 839.30, N'Earning', 39, N'Python ile Veri Analizi', '2026-11-07T13:49:40.5751557', 336),
(514, 9, 489.30, N'Earning', 68, N'YKS Tarih Soru Kampı', '2026-10-13T17:49:40.5751557', 338),
(515, 7, 419.30, N'Earning', 17, N'Coğrafya', '2026-11-03T12:49:40.5751557', 340),
(516, 22, 559.30, N'Earning', 46, N'Muhasebenin Temelleri', '2026-11-06T12:49:40.5751557', 342),
(517, 16, 349.30, N'Earning', 75, N'YKS ve LGS Sınav Stratejileri', '2026-10-28T17:49:40.5751557', 344),
(518, 12, 699.30, N'Earning', 24, N'Grafik Tasarım ve Tipografi', '2026-11-02T11:49:40.5751557', 346),
(519, 27, 419.30, N'Earning', 53, N'Sosyolojiye Giriş', '2026-11-05T11:49:40.5751557', 348),
(520, 34, 489.30, N'Earning', 82, N'Anayasa Hukukuna Giriş', '2026-10-23T17:49:40.5751557', 350),
(521, 16, 279.30, N'Earning', 31, N'Etkili Çalışma Teknikleri', '2026-11-07T10:49:40.5751557', 352),
(522, 29, 559.30, N'Earning', 60, N'Akademik Türkçe ve Kompozisyon', '2026-11-04T10:49:40.5751557', 354),
(523, 35, 839.30, N'Earning', 89, N'SolidWorks ile CAD ve Mekanik Tasarım', '2026-10-18T17:49:40.5751557', 356),
(524, 2, 629.30, N'Earning', 38, N'SQL ve Veritabanı Tasarımı', '2026-11-06T09:49:40.5751557', 358),
(525, 33, 769.30, N'Earning', 67, N'Araştırma Yöntemleri ve Deney Tasarımı', '2026-11-03T09:49:40.5751557', 360),
(526, 9, 454.30, N'Earning', 96, N'Hukukun Temel Kavramları ve Anayasa Bilgisi', '2026-10-13T17:49:40.5751557', 362),
(527, 22, 489.30, N'Earning', 45, N'Kişisel Finans ve Yatırım', '2026-11-05T08:49:40.5751557', 364),
(528, 15, 454.30, N'Earning', 74, N'Sporcu Beslenmesi ve Performans', '2026-11-02T08:49:40.5751557', 366),
(529, 15, 489.30, N'Earning', 103, N'Hareket Bilimi ve Sakatlıktan Korunma', '2026-10-28T17:49:40.5751557', 368),
(530, 26, 839.30, N'Earning', 52, N'Kısa Film Yapımı', '2026-11-04T07:49:40.5751557', 370),
(531, 8, 629.30, N'Earning', 81, N'Jeopolitik ve Beşeri Coğrafya', '2026-11-07T07:49:40.5751557', 372),
(532, 4, 489.30, N'Earning', 6, N'Matematik', '2026-10-23T17:49:40.5751557', 374),
(533, 29, 419.30, N'Earning', 59, N'Türkçe Dil Bilgisi ve Yazım Kuralları', '2026-11-03T06:49:40.5751557', 376),
(534, 35, 1049.30, N'Earning', 88, N'ROS ile Robotik ve Kontrol Sistemleri', '2026-11-06T06:49:40.5751557', 378),
(535, 7, 489.30, N'Earning', 13, N'Fiziki Coğrafya', '2026-10-18T17:49:40.5751557', 380),
(536, 33, 664.30, N'Earning', 66, N'Bilişsel Bilime Giriş', '2026-11-02T05:49:40.5751557', 382),
(537, 27, 524.30, N'Earning', 95, N'Siyaset Bilimi ve Uluslararası İlişkilere Giriş', '2026-11-05T05:49:40.5751557', 384),
(538, 10, 559.30, N'Earning', 20, N'İngilizce A1-A2', '2026-10-13T17:49:40.5751557', 386),
(539, 14, 699.30, N'Earning', 73, N'Armoni ve Beste Atölyesi', '2026-11-07T04:49:40.5751557', 388),
(540, 14, 839.30, N'Earning', 102, N'Ableton ile Müzik Prodüksiyonu', '2026-11-04T04:49:40.5751557', 390),
(541, 14, 769.30, N'Earning', 27, N'Piyano Eğitimi', '2026-10-28T17:49:40.5751557', 392),
(542, 6, 454.30, N'Earning', 80, N'LGS Fen Bilimleri Kampı', '2026-11-06T03:49:40.5751557', 394),
(543, 2, 909.30, N'Earning', 5, N'React ile Modern Web Geliştirme', '2026-11-03T03:49:40.5751557', 396),
(544, 17, 769.30, N'Earning', 34, N'Kalkülüs ve Analiz', '2026-10-23T17:49:40.5751557', 398),
(545, 35, 559.30, N'Earning', 87, N'Temel Elektronik ve Devre Analizi', '2026-11-05T02:49:40.5751557', 400),
(546, 6, 419.30, N'Earning', 12, N'Astronomiye Giriş', '2026-11-02T02:49:40.5751557', 402),
(547, 19, 1189.30, N'Earning', 41, N'Derin Öğrenme ve Sinir Ağları', '2026-10-18T17:49:40.5751557', 404),
(548, 19, 1119.30, N'Earning', 94, N'Büyük Veri ve Veri Mühendisliği', '2026-11-04T01:49:40.5751557', 406),
(549, 9, 419.30, N'Earning', 19, N'Cumhuriyet Tarihi', '2026-11-07T01:49:40.5751557', 408),
(550, 24, 419.30, N'Earning', 48, N'Felsefeye Giriş', '2026-10-13T17:49:40.5751557', 410),
(551, 13, 629.30, N'Earning', 101, N'Seramik ve Heykel Atölyesi', '2026-11-03T00:49:40.5751557', 412),
(552, 13, 384.30, N'Earning', 26, N'Sanat Tarihine Giriş', '2026-11-06T00:49:40.5751557', 414),
(553, 14, 489.30, N'Earning', 55, N'Müzik Teorisi ve Kulak Eğitimi', '2026-10-28T17:49:40.5751557', 416),
(554, 3, 699.30, N'Earning', 4, N'Algoritmalar', '2026-11-01T23:49:40.5751557', 418),
(555, 4, 349.30, N'Earning', 33, N'Temel Matematik', '2026-11-04T23:49:40.5751557', 420),
(556, 30, 769.30, N'Earning', 62, N'Osmanlı Türkçesi ve Metin Okumaları', '2026-10-23T17:49:40.5751557', 422),
(557, 5, 524.30, N'Earning', 11, N'Biyoloji', '2026-11-06T22:49:40.5751557', 424),
(558, 19, 1049.30, N'Earning', 40, N'Makine Öğrenmesine Giriş', '2026-11-03T22:49:40.5751557', 426),
(559, 27, 664.30, N'Earning', 69, N'Kent Sosyolojisi ve Saha Araştırması', '2026-10-18T17:49:40.5751557', 428),
(560, 9, 454.30, N'Earning', 18, N'Tarih', '2026-11-05T21:49:40.5751557', 430),
(561, 23, 454.30, N'Earning', 47, N'Türk Edebiyatına Giriş', '2026-11-02T21:49:40.5751557', 432),
(562, 16, 314.30, N'Earning', 76, N'Hızlı Okuma ve Not Alma Teknikleri', '2026-10-13T17:49:40.5751557', 434),
(563, 13, 489.30, N'Earning', 25, N'Karakalem ve Desen', '2026-11-05T16:49:40.5751557', 436),
(564, 28, 559.30, N'Earning', 54, N'İspanyolca A1', '2026-11-02T16:49:40.5751557', 438),
(565, 34, 594.30, N'Earning', 83, N'İdare Hukuku ve Kamu Yönetimi', '2026-10-28T17:49:40.5751557', 440),
(566, 16, 384.30, N'Earning', 32, N'Topluluk Önünde Konuşma', '2026-11-04T15:49:40.5751557', 442),
(567, 30, 629.30, N'Earning', 61, N'Cumhuriyet Dönemi Türk Edebiyatı', '2026-11-07T15:49:40.5751557', 444),
(568, 36, 839.30, N'Earning', 90, N'Siber Güvenlik ve Ağ Temelleri', '2026-10-23T17:49:40.5751557', 446),
(569, 20, 839.30, N'Earning', 39, N'Python ile Veri Analizi', '2026-11-03T14:49:40.5751557', 448),
(570, 9, 489.30, N'Earning', 68, N'YKS Tarih Soru Kampı', '2026-11-06T14:49:40.5751557', 450),
(571, 24, 454.30, N'Earning', 97, N'Etik ve Estetiğe Giriş', '2026-10-18T17:49:40.5751557', 452),
(572, 22, 559.30, N'Earning', 46, N'Muhasebenin Temelleri', '2026-11-02T13:49:40.5751557', 454),
(573, 16, 349.30, N'Earning', 75, N'YKS ve LGS Sınav Stratejileri', '2026-11-05T13:49:40.5751557', 456),
(574, 16, 524.30, N'Earning', 104, N'Araştırma Yöntemleri ve Bilimsel Etik', '2026-10-13T17:49:40.5751557', 458),
(575, 27, 419.30, N'Earning', 53, N'Sosyolojiye Giriş', '2026-11-07T12:49:40.5751557', 460),
(576, 34, 489.30, N'Earning', 82, N'Anayasa Hukukuna Giriş', '2026-11-04T12:49:40.5751557', 462),
(577, 4, 524.30, N'Earning', 7, N'Matematik Geometri', '2026-10-28T17:49:40.5751557', 464),
(578, 29, 559.30, N'Earning', 60, N'Akademik Türkçe ve Kompozisyon', '2026-11-06T11:49:40.5751557', 466),
(579, 35, 839.30, N'Earning', 89, N'SolidWorks ile CAD ve Mekanik Tasarım', '2026-11-03T11:49:40.5751557', 468),
(580, 7, 559.30, N'Earning', 14, N'Jeomorfoloji', '2026-10-23T17:49:40.5751557', 470),
(581, 33, 769.30, N'Earning', 67, N'Araştırma Yöntemleri ve Deney Tasarımı', '2026-11-05T10:49:40.5751557', 472),
(582, 9, 454.30, N'Earning', 96, N'Hukukun Temel Kavramları ve Anayasa Bilgisi', '2026-11-02T10:49:40.5751557', 474),
(583, 10, 629.30, N'Earning', 21, N'İngilizce', '2026-10-18T17:49:40.5751557', 476),
(584, 15, 454.30, N'Earning', 74, N'Sporcu Beslenmesi ve Performans', '2026-11-04T09:49:40.5751557', 478),
(585, 15, 489.30, N'Earning', 103, N'Hareket Bilimi ve Sakatlıktan Korunma', '2026-11-07T09:49:40.5751557', 480),
(586, 14, 629.30, N'Earning', 28, N'Gitar Eğitimi', '2026-10-13T17:49:40.5751557', 482),
(587, 8, 629.30, N'Earning', 81, N'Jeopolitik ve Beşeri Coğrafya', '2026-11-03T08:49:40.5751557', 484),
(588, 4, 489.30, N'Earning', 6, N'Matematik', '2026-11-06T08:49:40.5751557', 486),
(589, 17, 699.30, N'Earning', 35, N'Lineer Cebir', '2026-10-28T17:49:40.5751557', 488),
(590, 35, 1049.30, N'Earning', 88, N'ROS ile Robotik ve Kontrol Sistemleri', '2026-11-02T07:49:40.5751557', 490),
(591, 7, 489.30, N'Earning', 13, N'Fiziki Coğrafya', '2026-11-05T07:49:40.5751557', 492),
(592, 20, 629.30, N'Earning', 42, N'Veri Görselleştirme ve Hikâye Anlatımı', '2026-10-23T17:49:40.5751557', 494),
(593, 2, 559.30, N'Earning', 37, N'Python', '2026-06-01T17:49:40.5751557', 496),
(594, 68, 799.00, N'Refund', 37, N'Python', '2026-06-03T17:49:40.5751557', 496),
(595, 2, -559.30, N'EarningReversal', 37, N'Python', '2026-06-03T17:49:40.5751557', 496),
(596, 16, 384.30, N'Earning', 32, N'Topluluk Önünde Konuşma', '2026-08-17T17:49:40.5751557', 498),
(597, 75, 549.00, N'Refund', 32, N'Topluluk Önünde Konuşma', '2026-08-19T17:49:40.5751557', 498),
(598, 16, -384.30, N'EarningReversal', 32, N'Topluluk Önünde Konuşma', '2026-08-19T17:49:40.5751557', 498),
(599, 14, 769.30, N'Earning', 27, N'Piyano Eğitimi', '2026-06-15T17:49:40.5751557', 500),
(600, 82, 1099.00, N'Refund', 27, N'Piyano Eğitimi', '2026-06-17T17:49:40.5751557', 500),
(601, 14, -769.30, N'EarningReversal', 27, N'Piyano Eğitimi', '2026-06-17T17:49:40.5751557', 500),
(602, 11, 594.30, N'Earning', 22, N'Almanca A1', '2026-08-31T17:49:40.5751557', 502),
(603, 89, 849.00, N'Refund', 22, N'Almanca A1', '2026-09-02T17:49:40.5751557', 502),
(604, 11, -594.30, N'EarningReversal', 22, N'Almanca A1', '2026-09-02T17:49:40.5751557', 502),
(605, 97, 1000.00, N'TopUp', NULL, N'Demo bakiye', '2026-11-07T17:49:43.0526576', NULL),
(606, 97, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-06-10T17:29:43.4359191', NULL),
(607, 97, -999.00, N'Purchase', 4, N'Algoritmalar', '2026-06-10T17:49:43.4359191', NULL),
(608, 97, 1500.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-07-10T17:29:43.4359191', NULL),
(609, 97, -1299.00, N'Purchase', 5, N'React ile Modern Web Geliştirme', '2026-07-10T17:49:43.4359191', NULL),
(610, 97, 1000.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-08-09T17:29:43.4359191', NULL),
(611, 97, -799.00, N'Purchase', 37, N'Python', '2026-08-09T17:49:43.4359191', NULL),
(612, 97, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-09-08T17:29:43.4359191', NULL),
(613, 97, -699.00, N'Purchase', 6, N'Matematik', '2026-09-08T17:49:43.4359191', NULL),
(614, 97, 750.00, N'TopUp', NULL, N'Bakiye yükleme', '2026-10-08T17:29:43.4359191', NULL),
(615, 97, -649.00, N'Purchase', 18, N'Tarih', '2026-10-08T17:49:43.4359191', NULL),
(616, 3, 699.30, N'Earning', 4, N'Algoritmalar', '2026-06-10T17:49:43.4359191', 607),
(617, 2, 909.30, N'Earning', 5, N'React ile Modern Web Geliştirme', '2026-07-10T17:49:43.4359191', 609),
(618, 2, 559.30, N'Earning', 37, N'Python', '2026-08-09T17:49:43.4359191', 611),
(619, 4, 489.30, N'Earning', 6, N'Matematik', '2026-09-08T17:49:43.4359191', 613),
(620, 9, 454.30, N'Earning', 18, N'Tarih', '2026-10-08T17:49:43.4359191', 615);
SET IDENTITY_INSERT [WalletTransactions] OFF;
-- ForumThreads (11)
SET IDENTITY_INSERT [ForumThreads] ON;
INSERT INTO [ForumThreads] ([Id], [Topic], [Title], [AuthorId], [CreatedAt], [LastActivityAt]) VALUES
(1, N'software', N'Döngülerde sınır hatası: i < n mi, i <= n mi?', 97, '2026-11-01T17:49:44.2258927', '2026-11-02T05:49:44.2258927'),
(2, N'software', N'Algoritma çalışma planı: haftada 5 soru yeter mi?', 3, '2026-10-24T13:49:44.2258927', '2026-10-25T04:49:44.2258927'),
(3, N'math', N'Limitte 0/0 belirsizliği: L''Hôpital mı, çarpanlara ayırma mı?', 37, '2026-11-03T10:49:44.2258927', '2026-11-04T07:49:44.2258927'),
(4, N'math', N'Haftanın sorusu: üçgende açıortay', 4, '2026-10-28T11:49:44.2258927', '2026-10-29T14:49:44.2258927'),
(5, N'science', N'Bu ay gözlem: Jüpiter ve uyduları', 6, '2026-10-30T11:49:44.2258927', '2026-11-01T14:49:44.2258927'),
(6, N'science', N'Evde DNA izolasyonu: çilek deneyi', 5, '2026-10-17T11:49:44.2258927', '2026-10-19T04:49:44.2258927'),
(7, N'design', N'Arayüzde kaç renk kullanmalıyım?', 38, '2026-11-02T12:49:44.2258927', '2026-11-02T19:49:44.2258927'),
(8, N'career', N'Cumartesi çevrim içi çalışma grubu', 96, '2026-11-05T10:49:44.2258927', '2026-11-06T07:49:44.2258927'),
(9, N'career', N'İlk staj başvurusu için portfolyo önerileri', 45, '2026-10-26T10:49:44.2258927', '2026-10-27T07:49:44.2258927'),
(10, N'general', N'Topluluk alanına hoş geldiniz', 95, '2026-10-08T15:49:44.2258927', '2026-10-09T18:49:44.2258927'),
(11, N'general', N'Odaklanmak için çalışma yöntemleriniz neler?', 52, '2026-10-31T09:49:44.2258927', '2026-11-01T18:49:44.2258927');
SET IDENTITY_INSERT [ForumThreads] OFF;
-- ForumPosts (36)
SET IDENTITY_INSERT [ForumPosts] ON;
INSERT INTO [ForumPosts] ([Id], [ThreadId], [AuthorId], [Body], [CreatedAt]) VALUES
(1, 1, 97, N'Dizi elemanlarını gezerken son elemanı ya atlıyorum ya da dizinin dışına çıkıyorum. Bunun için aklınızda tuttuğunuz basit bir kural var mı?', '2026-11-01T17:49:44.2258927'),
(2, 1, 2, N'Yarı açık aralık düşünün: [0, n). Başlangıç dahil, bitiş hariç. Dizinin uzunluğu n ise koşul hep i < n olur. Kendi döngünüzü yazarken önce boş dizi ve tek elemanlı dizi için elle deneyin.', '2026-11-01T20:49:44.2258927'),
(3, 1, 37, N'Ben de aynı hatayı yapıyordum; foreach kullanmaya başlayınca bu sorun neredeyse bitti. İndeks gerekmiyorsa onu öneririm.', '2026-11-02T00:49:44.2258927'),
(4, 1, 96, N'Güzel tartışma. Bir sonraki adım: bu durumları birim testiyle sabitlemek. Boş, tek eleman, çok eleman: üç test, sınır hatası kalmaz.', '2026-11-02T05:49:44.2258927'),
(5, 2, 3, N'Yarışmaya hazırlanan öğrenciler sık soruyor. Benim önerim: sayıdan çok tekrar. Çözemediğiniz soruyu bir hafta sonra yeniden çözün; ikinci çözüm asıl öğrenmedir.', '2026-10-24T13:49:44.2258927'),
(6, 2, 39, N'Hocam her konudan kaç soru çözmeden diğerine geçmemeyi önerirsiniz?', '2026-10-24T20:49:44.2258927'),
(7, 2, 3, N'Konuya göre değişir ama ''artık tahmin edebiliyorum'' dediğiniz an genelde 8-10 sorudur. Grafikte daha fazla, sıralamada daha az.', '2026-10-25T04:49:44.2258927'),
(8, 3, 37, N'Sınavda hangisini önce denemeliyim? L''Hôpital hızlı ama bazen türev almak daha uzun sürüyor.', '2026-11-03T10:49:44.2258927'),
(9, 3, 4, N'Önce cebir: çarpanlara ayırma ya da eşlenikle çarpma çoğu soruda iki satırda biter ve sizi türev hatasından korur. L''Hôpital''i, ifade bunlara uymadığında kullanın.', '2026-11-03T20:49:44.2258927'),
(10, 3, 97, N'Bu kuralı not aldım, teşekkürler. Bir de trigonometrik limitlerde sin(x)/x''e benzetmek işe yarıyor.', '2026-11-04T07:49:44.2258927'),
(11, 4, 4, N'ABC üçgeninde AB = 6, AC = 9 ve A açısının açıortayı BC''yi D''de kesiyor. BC = 10 ise BD kaçtır? Çözümünüzü kısa bir açıklamayla yazın.', '2026-10-28T11:49:44.2258927'),
(12, 4, 38, N'Açıortay teoremiyle BD/DC = 6/9 = 2/3. BD = 10 · 2/5 = 4.', '2026-10-29T00:49:44.2258927'),
(13, 4, 4, N'Doğru ve temiz bir çözüm. Bonus: aynı soruda AD uzunluğunu da bulabilir misiniz?', '2026-10-29T14:49:44.2258927'),
(14, 5, 6, N'Gece yarısına doğru Jüpiter doğu ufkunda parlak bir nokta olarak görünüyor. Basit bir dürbünle bile dört Galilei uydusunu seçebilirsiniz. Gözlemlerinizi buraya yazın!', '2026-10-30T11:49:44.2258927'),
(15, 5, 42, N'Dün gece üç uydu gördüm, dördüncüsü gezegenin arkasında olmalı. Telefonla dürbünden fotoğraf çekmeye çalıştım ama titriyor.', '2026-10-31T03:49:44.2258927'),
(16, 5, 6, N'Telefonu dürbüne sabitlemek için bir mandal ve lastik yeter. Bir de pozlama süresini kısaltın.', '2026-10-31T20:49:44.2258927'),
(17, 5, 97, N'Ben de bu akşam deneyeceğim, hava açık görünüyor.', '2026-11-01T14:49:44.2258927'),
(18, 6, 5, N'Bulaşık deterjanı, tuz, su ve soğuk alkolle çilekten DNA çıkarabilirsiniz. Ölçüleri ve adımları kursun üçüncü dersinde anlattım; sonuçlarınızın fotoğrafını paylaşın.', '2026-10-17T11:49:44.2258927'),
(19, 6, 48, N'Yaptım! Beyaz ipliksi bir tabaka oluştu. Alkol yeterince soğuk değilse daha az çıkıyor sanırım.', '2026-10-18T07:49:44.2258927'),
(20, 6, 5, N'Kesinlikle, soğuk alkol DNA''nın çökmesini hızlandırır. Güzel gözlem.', '2026-10-19T04:49:44.2258927'),
(21, 7, 38, N'Portfolyo sitem için palet seçiyorum ve her şey çok kalabalık görünüyor. Sizce kaç renk ideal?', '2026-11-02T12:49:44.2258927'),
(22, 7, 96, N'Bir nötr ölçek (arka plan, metin, kenarlıklar), bir vurgu rengi ve durumlar için (başarı, hata) iki renk. Vurguyu ekranın en fazla onda birinde kullanın.', '2026-11-02T15:49:44.2258927'),
(23, 7, 43, N'60-30-10 kuralı da işime yarıyor: %60 ana, %30 ikincil, %10 vurgu.', '2026-11-02T19:49:44.2258927'),
(24, 8, 96, N'Bu cumartesi 14:00''te kurs ödevleri için bir çalışma saati açıyorum. Takıldığınız soruları önceden bu başlığa yazarsanız onlardan başlarız.', '2026-11-05T10:49:44.2258927'),
(25, 8, 37, N'Türev sorularıyla gelebilir miyim? Matematik kursundan.', '2026-11-05T16:49:44.2258927'),
(26, 8, 96, N'Tabii, branşlar karışık olabilir; sırayla bakarız.', '2026-11-05T23:49:44.2258927'),
(27, 8, 97, N'Ben de katılıyorum, döngü ödevini getireceğim.', '2026-11-06T07:49:44.2258927'),
(28, 9, 45, N'Yaz stajı için başvuracağım ama sadece okul projelerim var. Portfolyoya ne koymalıyım?', '2026-10-26T10:49:44.2258927'),
(29, 9, 2, N'Az ama bitmiş proje. Her birine kısa bir README: sorun, çözüm, neyi öğrendiniz. Kod okunaklıysa ve testleri varsa bu okul projesi olsa bile fark yaratır.', '2026-10-26T20:49:44.2258927'),
(30, 9, 45, N'Çok net, teşekkürler hocam. İki projeyi toparlayıp tekrar paylaşacağım.', '2026-10-27T07:49:44.2258927'),
(31, 10, 95, N'Burası kurslardan bağımsız sorular, kaynak önerileri ve çalışma grupları için. Lütfen saygılı olun; kişisel bilgilerinizi paylaşmayın. Bir mesajı yalnızca yazarı ya da yöneticiler silebilir.', '2026-10-08T15:49:44.2258927'),
(32, 10, 54, N'Elinize sağlık, güzel bir fikir!', '2026-10-09T04:49:44.2258927'),
(33, 10, 97, N'Merhaba herkese!', '2026-10-09T18:49:44.2258927'),
(34, 11, 52, N'Telefon yanımdayken 10 dakikadan fazla odaklanamıyorum. Sizin işe yarayan yöntemleriniz neler?', '2026-10-31T09:49:44.2258927'),
(35, 11, 51, N'25 dakika çalışma, 5 dakika ara. Telefonu başka odaya koymak en büyük fark oldu.', '2026-11-01T01:49:44.2258927'),
(36, 11, 50, N'Ben her oturumun başında tek bir hedef yazıyorum: ''şu dersi bitir'' gibi. Bitince bırakıyorum.', '2026-11-01T18:49:44.2258927');
SET IDENTITY_INSERT [ForumPosts] OFF;
-- ForumPostLikes (70)
INSERT INTO [ForumPostLikes] ([PostId], [UserId]) VALUES
(2, 4),
(2, 5),
(2, 6),
(3, 4),
(4, 5),
(4, 6),
(4, 7),
(4, 8),
(5, 7),
(5, 8),
(7, 9),
(7, 10),
(7, 11),
(8, 2),
(9, 3),
(9, 5),
(9, 6),
(9, 7),
(10, 4),
(10, 5),
(12, 6),
(12, 7),
(12, 8),
(13, 8),
(14, 9),
(14, 10),
(14, 11),
(14, 12),
(15, 2),
(15, 3),
(17, 4),
(17, 5),
(17, 6),
(18, 6),
(19, 6),
(19, 7),
(19, 8),
(19, 9),
(20, 8),
(20, 9),
(22, 2),
(22, 3),
(22, 4),
(23, 3),
(24, 4),
(24, 5),
(24, 6),
(24, 7),
(25, 5),
(25, 6),
(27, 7),
(27, 8),
(27, 9),
(28, 8),
(29, 3),
(29, 4),
(29, 5),
(29, 6),
(30, 3),
(30, 4),
(32, 5),
(32, 6),
(32, 7),
(33, 6),
(34, 7),
(34, 8),
(34, 9),
(34, 10),
(35, 8),
(35, 9);
-- Friendships (8)
SET IDENTITY_INSERT [Friendships] ON;
INSERT INTO [Friendships] ([Id], [RequesterId], [AddresseeId], [Status], [CreatedAt]) VALUES
(1, 97, 96, N'Accepted', '2026-09-08T17:49:44.4002138'),
(2, 37, 97, N'Accepted', '2026-09-23T17:49:44.4002138'),
(3, 97, 38, N'Accepted', '2026-10-08T17:49:44.4002138'),
(4, 39, 97, N'Pending', '2026-11-05T17:49:44.4002138'),
(5, 97, 3, N'Pending', '2026-11-06T17:49:44.4002138'),
(6, 2, 96, N'Accepted', '2026-08-09T17:49:44.4002138'),
(7, 96, 6, N'Accepted', '2026-08-29T17:49:44.4002138'),
(8, 42, 96, N'Pending', '2026-11-04T17:49:44.4002138');
SET IDENTITY_INSERT [Friendships] OFF;
-- DirectMessages (12)
SET IDENTITY_INSERT [DirectMessages] ON;
INSERT INTO [DirectMessages] ([Id], [SenderId], [RecipientId], [Body], [CreatedAt], [ReadAt]) VALUES
(1, 97, 96, N'Merhaba hocam, ikinci dersteki ödevde döngü koşulunu nasıl kurmam gerektiğini tam anlayamadım.', '2026-11-04T17:49:44.4002138', '2026-11-04T18:01:44.4002138'),
(2, 96, 97, N'Merhaba! Önce döngünün ne zaman durması gerektiğini bir cümleyle yaz, sonra o cümleyi koşula çevir. Kodunu paylaşırsan bakarım.', '2026-11-04T18:06:44.4002138', '2026-11-04T18:18:44.4002138'),
(3, 97, 96, N'Tamam, koşulu i < n yerine i <= n yazmışım, son elemanı fazladan geziyormuş.', '2026-11-04T18:46:44.4002138', '2026-11-04T18:58:44.4002138'),
(4, 96, 97, N'Aynen öyle, klasik bir sınır hatası. Bir sonraki derste bu tür hataları test yazarak yakalamayı göreceğiz.', '2026-11-04T19:49:44.4002138', '2026-11-04T20:01:44.4002138'),
(5, 97, 96, N'Harika, teşekkürler! Forumda da benzer bir soru açmıştım, oraya da çözümü yazacağım.', '2026-11-04T21:15:44.4002138', NULL),
(6, 37, 97, N'Selam! Matematik kursunda hangi derstesin?', '2026-11-06T17:49:44.4002138', '2026-11-06T18:01:44.4002138'),
(7, 97, 37, N'Limit konusunu bitirdim, türeve geçiyorum.', '2026-11-06T18:06:44.4002138', '2026-11-06T18:18:44.4002138'),
(8, 37, 97, N'Süper, cumartesi forumdaki çalışma grubuna katılmak ister misin?', '2026-11-06T18:46:44.4002138', NULL),
(9, 38, 97, N'Tasarım kursundaki renk ödevini paylaştın mı?', '2026-10-29T17:49:44.4002138', '2026-10-29T18:01:44.4002138'),
(10, 97, 38, N'Evet, dün yükledim. Senin paletin çok iyiydi bu arada.', '2026-10-29T18:06:44.4002138', '2026-10-29T18:18:44.4002138'),
(11, 2, 96, N'Bir sonraki dönem ortak bir proje atölyesi açalım mı?', '2026-11-02T17:49:44.4002138', '2026-11-02T18:01:44.4002138'),
(12, 96, 2, N'Çok iyi olur, öğrencilerden de bu yönde istek geliyor. Haftaya bir taslak çıkaralım.', '2026-11-02T18:06:44.4002138', '2026-11-02T18:18:44.4002138');
SET IDENTITY_INSERT [DirectMessages] OFF;
COMMIT TRANSACTION;
END
GO
