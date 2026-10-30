using HUIT_RoMan.Domain.Common;
using HUIT_RoMan.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace HUIT_RoMan.Infrastructure.Persistence
{
    public class ApplicationDbContext : IdentityDbContext<User, IdentityRole<int>, int>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<Department> Departments { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<Shift> Shifts { get; set; }
        public DbSet<ShiftLog> ShiftLogs { get; set; }
        public DbSet<Period> Periods { get; set; }
        public DbSet<RoomType> RoomTypes { get; set; }
        public DbSet<Room> Rooms { get; set; }
        public DbSet<Booking> Bookings { get; set; }
        public DbSet<BookingDetail> BookingDetails { get; set; }
        public DbSet<UsageSession> UsageSessions { get; set; }
        public DbSet<ViolationType> ViolationTypes { get; set; }
        public DbSet<ViolationRecord> ViolationRecords { get; set; }
        public DbSet<Feedback> Feedbacks { get; set; }
        public DbSet<EquipmentCategory> EquipmentCategories { get; set; }
        public DbSet<Equipment> Equipments { get; set; }
        public DbSet<RoomEquipment> RoomEquipments { get; set; }
        public DbSet<EquipmentConditionLog> EquipmentConditionLogs { get; set; }
        public DbSet<MaintenanceRecord> MaintenanceRecords { get; set; }
        public DbSet<UsageCondition> UsageConditions { get; set; }
        public DbSet<RoomTypeCondition> RoomTypeConditions { get; set; }
        public DbSet<ChatConversation> ChatConversations { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<UserRestriction> UserRestrictions { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<ApprovalHistory> ApprovalHistories { get; set; }
        public DbSet<BookingExtension> BookingExtensions { get; set; }
        public DbSet<WorkingHour> WorkingHours { get; set; }
        public DbSet<SystemSetting> SystemSettings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Mã phòng duy nhất giữa các phòng đang hoạt động; phòng đã xóa mềm
            // không chặn việc tái sử dụng mã khi seed lại.
            modelBuilder.Entity<Room>()
                .HasIndex(r => r.RoomCode)
                .IsUnique()
                .HasFilter("\"IsDeleted\" = FALSE");

            // Chỉ ràng buộc trên bản ghi còn sống: phiên đã xoá mềm không được
            // chặn việc tạo phiên mới cho cùng chi tiết đặt phòng.
            modelBuilder.Entity<UsageSession>()
                .HasIndex(s => s.BookingDetailId)
                .IsUnique()
                .HasFilter("\"IsDeleted\" = FALSE");

            modelBuilder.Entity<UsageSession>()
                .HasIndex(s => s.ConfirmationCode)
                .IsUnique()
                .HasFilter("\"IsDeleted\" = FALSE");

            // These database constraints backstop API validation and protect imports/direct SQL.
            modelBuilder.Entity<Room>().ToTable(t =>
            {
                t.HasCheckConstraint("CK_Rooms_Capacity_Positive", "\"Capacity\" > 0");
                t.HasCheckConstraint("CK_Rooms_Status", "\"Status\" IN ('Trống', 'Đang sử dụng', 'Bảo trì')");
            });
            modelBuilder.Entity<RoomType>().ToTable(t =>
                t.HasCheckConstraint("CK_RoomTypes_DefaultCapacity_Positive", "\"DefaultCapacity\" > 0"));
            modelBuilder.Entity<Period>().ToTable(t =>
                t.HasCheckConstraint("CK_Periods_Time_Range", "\"EndTime\" > \"StartTime\""));
            modelBuilder.Entity<Booking>().ToTable(t =>
            {
                t.HasCheckConstraint("CK_Bookings_GuestCount_Positive", "\"GuestCount\" > 0");
                t.HasCheckConstraint("CK_Bookings_Status", "\"Status\" IN ('Chờ duyệt', 'Đã duyệt', 'Duyệt một phần', 'Từ chối', 'Đã hủy', 'Đang sử dụng', 'Hoàn thành')");
                t.HasCheckConstraint("CK_Bookings_Approval_Audit",
                    "(\"ApprovalMode\" IS NULL AND \"ApprovedByUserId\" IS NULL AND \"ApprovedAt\" IS NULL) OR (\"ApprovalMode\" IN ('MANUAL', 'AUTO') AND \"ApprovedByUserId\" IS NOT NULL AND \"ApprovedAt\" IS NOT NULL)");
            });
            modelBuilder.Entity<BookingDetail>().ToTable(t =>
            {
                t.HasCheckConstraint("CK_BookingDetails_GuestCount_Positive", "\"GuestCount\" > 0");
                t.HasCheckConstraint("CK_BookingDetails_Time_Range", "\"EndAt\" > \"StartAt\"");
                t.HasCheckConstraint("CK_BookingDetails_Status", "\"Status\" IN ('Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Đã hủy', 'Đang sử dụng', 'Hoàn thành')");
                t.HasCheckConstraint("CK_BookingDetails_Approval_Audit",
                    "(\"ApprovalMode\" IS NULL AND \"ApprovedByUserId\" IS NULL AND \"ApprovedAt\" IS NULL) OR (\"ApprovalMode\" IN ('MANUAL', 'AUTO') AND \"ApprovedByUserId\" IS NOT NULL AND \"ApprovedAt\" IS NOT NULL)");
            });
            modelBuilder.Entity<ApprovalHistory>().ToTable(t =>
            {
                // Mỗi dòng phải chỉ rõ một chủ thể: tài khoản thật, hồ sơ nhân sự,
                // hoặc được đánh dấu là do chế độ tự động duyệt thực hiện.
                t.HasCheckConstraint("CK_ApprovalHistories_Actor",
                    "\"ActorUserId\" IS NOT NULL OR \"EmployeeId\" IS NOT NULL OR \"ApprovalMode\" = 'AUTO'");
                t.HasCheckConstraint("CK_ApprovalHistories_Mode",
                    "\"ApprovalMode\" IS NULL OR \"ApprovalMode\" IN ('MANUAL', 'AUTO')");
            });
            modelBuilder.Entity<UsageSession>().ToTable(t =>
            {
                t.HasCheckConstraint("CK_UsageSessions_ActualGuestCount_Positive", "\"ActualGuestCount\" IS NULL OR \"ActualGuestCount\" > 0");
                t.HasCheckConstraint("CK_UsageSessions_Checkout_After_Checkin", "\"ActualCheckOut\" IS NULL OR \"ActualCheckIn\" IS NULL OR \"ActualCheckOut\" >= \"ActualCheckIn\"");
                t.HasCheckConstraint("CK_UsageSessions_Status", "\"Status\" IN ('Chờ nhận phòng', 'Đang sử dụng', 'Hoàn thành', 'Đã hủy')");
            });

            modelBuilder.Entity<BookingDetail>()
                .HasIndex(d => new { d.RoomId, d.Status, d.StartAt, d.EndAt });

            modelBuilder.Entity<BookingExtension>().ToTable(t =>
            {
                t.HasCheckConstraint("CK_BookingExtensions_Time_Range", "\"NewEndAt\" > \"PreviousEndAt\"");
                t.HasCheckConstraint("CK_BookingExtensions_Status", "\"Status\" IN ('Đã áp dụng')");
            });
            modelBuilder.Entity<BookingExtension>()
                .HasIndex(e => new { e.BookingDetailId, e.RequestedAt });

            modelBuilder.Entity<WorkingHour>().ToTable(t =>
            {
                t.HasCheckConstraint("CK_WorkingHours_DayOfWeek", "\"DayOfWeek\" BETWEEN 0 AND 6");
                t.HasCheckConstraint("CK_WorkingHours_Time_Range",
                    "\"IsClosed\" = TRUE OR \"CloseTime\" > \"OpenTime\"");
            });
            modelBuilder.Entity<WorkingHour>()
                .HasIndex(w => new { w.DepartmentId, w.DayOfWeek })
                .IsUnique()
                .HasFilter("\"IsDeleted\" = FALSE");

            // Configure Composite Keys
            modelBuilder.Entity<RoomEquipment>()
                .HasKey(re => new { re.RoomId, re.EquipmentId });

            // Hai khoá ngoại cùng trỏ tới User: người đặt và người phê duyệt.
            modelBuilder.Entity<Booking>()
                .HasOne(b => b.User)
                .WithMany(u => u.Bookings)
                .HasForeignKey(b => b.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Booking>()
                .HasOne(b => b.ApprovedByUser)
                .WithMany()
                .HasForeignKey(b => b.ApprovedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<BookingDetail>()
                .HasOne(d => d.ApprovedByUser)
                .WithMany()
                .HasForeignKey(d => d.ApprovedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ApprovalHistory>()
                .HasOne(h => h.ActorUser)
                .WithMany()
                .HasForeignKey(h => h.ActorUserId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<SystemSetting>()
                .HasOne(s => s.UpdatedByUser)
                .WithMany()
                .HasForeignKey(s => s.UpdatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<RoomTypeCondition>()
                .HasKey(rtc => new { rtc.RoomTypeId, rtc.UsageConditionId });

            // Configure One-to-One: User - Employee
            modelBuilder.Entity<Employee>()
                .HasOne(e => e.User)
                .WithOne(u => u.EmployeeProfile)
                .HasForeignKey<Employee>(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Avoid cascade delete cycles
            foreach (var relationship in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
            {
                relationship.DeleteBehavior = DeleteBehavior.Restrict;
            }

            // Xóa mềm: mọi entity ISoftDelete tự loại bản ghi IsDeleted khỏi query
            foreach (var clrType in modelBuilder.Model.GetEntityTypes()
                         .Select(t => t.ClrType)
                         .Where(t => typeof(ISoftDelete).IsAssignableFrom(t)))
            {
                var param = Expression.Parameter(clrType, "e");
                var body = Expression.Equal(
                    Expression.Property(param, nameof(ISoftDelete.IsDeleted)),
                    Expression.Constant(false));
                modelBuilder.Entity(clrType).HasQueryFilter(Expression.Lambda(body, param));
            }

            // Lưu ý: ràng buộc chống trùng lịch của BookingDetails
            // (EX_BookingDetails_Room_NoOverlap) được tạo bằng SQL trong migration
            // 20261022085713_AddBookingOverlapConstraint vì EF Core chưa hỗ trợ exclusion constraint.
        }
    }
}
