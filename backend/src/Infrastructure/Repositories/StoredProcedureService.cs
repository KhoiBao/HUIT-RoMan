using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HUIT_RoMan.Infrastructure.Repositories
{
    /// <summary>
    /// Gọi các Stored Procedures / Functions PostgreSQL thông qua NpgsqlCommand.
    /// Dùng raw ADO.NET để có toàn quyền kiểm soát tham số và kết quả.
    /// </summary>
    public class StoredProcedureService : IStoredProcedureService
    {
        private readonly ApplicationDbContext _context;

        public StoredProcedureService(ApplicationDbContext context)
        {
            _context = context;
        }

        // ─────────────────────────────────────────────────────────────────
        // 1. fn_check_booking_conflict
        // ─────────────────────────────────────────────────────────────────
        public async Task<bool> CheckBookingConflictAsync(
            int roomId, DateTime startAt, DateTime endAt, int? excludeDetailId = null)
        {
            await using var conn = await OpenConnectionAsync();
            await using var cmd  = conn.CreateCommand();

            cmd.CommandText = "SELECT fn_check_booking_conflict($1, $2, $3, $4)";
            cmd.Parameters.Add(new NpgsqlParameter { Value = roomId });
            cmd.Parameters.Add(new NpgsqlParameter { Value = startAt.ToUniversalTime() });
            cmd.Parameters.Add(new NpgsqlParameter { Value = endAt.ToUniversalTime() });
            cmd.Parameters.Add(new NpgsqlParameter
            {
                Value = excludeDetailId.HasValue ? (object)excludeDetailId.Value : DBNull.Value
            });

            var result = await cmd.ExecuteScalarAsync();
            return result is true;
        }

        // ─────────────────────────────────────────────────────────────────
        // 2. fn_get_room_schedule
        // ─────────────────────────────────────────────────────────────────
        public async Task<IEnumerable<RoomScheduleResult>> GetRoomScheduleAsync(
            int roomId, DateTime windowStart, DateTime windowEnd)
        {
            var results = new List<RoomScheduleResult>();

            await using var conn = await OpenConnectionAsync();
            await using var cmd  = conn.CreateCommand();

            cmd.CommandText = "SELECT * FROM fn_get_room_schedule($1, $2, $3)";
            cmd.Parameters.Add(new NpgsqlParameter { Value = roomId });
            cmd.Parameters.Add(new NpgsqlParameter { Value = windowStart.ToUniversalTime() });
            cmd.Parameters.Add(new NpgsqlParameter { Value = windowEnd.ToUniversalTime() });

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new RoomScheduleResult
                {
                    BookingDetailId  = reader.GetInt32(0),
                    BookingId        = reader.GetInt32(1),
                    ActivityName     = reader.IsDBNull(2) ? null : reader.GetString(2),
                    Purpose          = reader.IsDBNull(3) ? null : reader.GetString(3),
                    StartAt          = reader.GetDateTime(4),
                    EndAt            = reader.GetDateTime(5),
                    StartPeriodId    = reader.IsDBNull(6) ? (int?)null : reader.GetInt32(6),
                    StartPeriodName  = reader.IsDBNull(7) ? null : reader.GetString(7),
                    EndPeriodId      = reader.IsDBNull(8) ? (int?)null : reader.GetInt32(8),
                    EndPeriodName    = reader.IsDBNull(9) ? null : reader.GetString(9),
                    GuestCount       = reader.GetInt32(10),
                    Status           = reader.IsDBNull(11) ? null : reader.GetString(11),
                    BookedByUsername = reader.IsDBNull(12) ? null : reader.GetString(12),
                    BookedByFullname = reader.IsDBNull(13) ? null : reader.GetString(13)
                });
            }

            return results;
        }

        // ─────────────────────────────────────────────────────────────────
        // 3. fn_get_available_rooms
        // ─────────────────────────────────────────────────────────────────
        public async Task<IEnumerable<AvailableRoomResult>> GetAvailableRoomsAsync(
            DateTime windowStart, DateTime windowEnd, int? roomTypeId = null, int minCapacity = 0)
        {
            var results = new List<AvailableRoomResult>();

            await using var conn = await OpenConnectionAsync();
            await using var cmd  = conn.CreateCommand();

            cmd.CommandText = "SELECT * FROM fn_get_available_rooms($1, $2, $3, $4)";
            cmd.Parameters.Add(new NpgsqlParameter { Value = windowStart.ToUniversalTime() });
            cmd.Parameters.Add(new NpgsqlParameter { Value = windowEnd.ToUniversalTime() });
            cmd.Parameters.Add(new NpgsqlParameter
            {
                NpgsqlDbType = NpgsqlTypes.NpgsqlDbType.Integer,
                Value = roomTypeId.HasValue ? (object)roomTypeId.Value : DBNull.Value
            });
            cmd.Parameters.Add(new NpgsqlParameter { Value = minCapacity });

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new AvailableRoomResult
                {
                    RoomId             = reader.GetInt32(0),
                    RoomName           = reader.GetString(1),
                    RoomCode           = reader.GetString(2),
                    Building           = reader.IsDBNull(3) ? null : reader.GetString(3),
                    Floor              = reader.IsDBNull(4) ? null : reader.GetString(4),
                    Capacity           = reader.GetInt32(5),
                    RoomTypeId         = reader.GetInt32(6),
                    RoomTypeName       = reader.GetString(7),
                    IsBookingByPeriod  = reader.GetBoolean(8)
                });
            }

            return results;
        }

        // ─────────────────────────────────────────────────────────────────
        // 4. sp_approve_booking
        // ─────────────────────────────────────────────────────────────────
        public async Task ApproveBookingAsync(
            int bookingId, string decision, string? rejectionReason = null)
        {
            await using var conn = await OpenConnectionAsync();
            await using var cmd  = conn.CreateCommand();

            cmd.CommandText = "CALL sp_approve_booking($1, $2, $3)";
            cmd.Parameters.Add(new NpgsqlParameter { Value = bookingId });
            cmd.Parameters.Add(new NpgsqlParameter { Value = decision });
            cmd.Parameters.Add(new NpgsqlParameter
            {
                Value = (object?)rejectionReason ?? DBNull.Value
            });

            await cmd.ExecuteNonQueryAsync();
        }

        // ─────────────────────────────────────────────────────────────────
        // 5. sp_update_room_status
        // ─────────────────────────────────────────────────────────────────
        public async Task UpdateRoomStatusAsync(int roomId, string status, string? reason = null)
        {
            await using var conn = await OpenConnectionAsync();
            await using var cmd  = conn.CreateCommand();

            cmd.CommandText = "CALL sp_update_room_status($1, $2, $3)";
            cmd.Parameters.Add(new NpgsqlParameter { Value = roomId });
            cmd.Parameters.Add(new NpgsqlParameter { Value = status });
            cmd.Parameters.Add(new NpgsqlParameter
            {
                Value = (object?)reason ?? DBNull.Value
            });

            await cmd.ExecuteNonQueryAsync();
        }

        // ─────────────────────────────────────────────────────────────────
        // 6. fn_get_booking_summary
        // ─────────────────────────────────────────────────────────────────
        public async Task<BookingSummaryResult?> GetBookingSummaryAsync(int year, int? month = null)
        {
            await using var conn = await OpenConnectionAsync();
            await using var cmd  = conn.CreateCommand();

            cmd.CommandText = "SELECT * FROM fn_get_booking_summary($1, $2)";
            cmd.Parameters.Add(new NpgsqlParameter { Value = year });
            cmd.Parameters.Add(new NpgsqlParameter
            {
                Value = month.HasValue ? (object)month.Value : DBNull.Value
            });

            await using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return new BookingSummaryResult
                {
                    TotalBookings   = reader.GetInt64(0),
                    Approved        = reader.GetInt64(1),
                    Rejected        = reader.GetInt64(2),
                    Pending         = reader.GetInt64(3),
                    Cancelled       = reader.GetInt64(4),
                    TotalRoomsUsed  = reader.GetInt64(5)
                };
            }

            return null;
        }

        // ─────────────────────────────────────────────────────────────────
        // 7. sp_record_violation_and_restrict
        // ─────────────────────────────────────────────────────────────────
        public async Task RecordViolationAndRestrictAsync(
            int userId,
            int violationTypeId,
            int usageSessionId,
            DateTime incidentTime,
            string description,
            int severity,
            string penaltyApplied,
            int restrictDays = 0)
        {
            await using var conn = await OpenConnectionAsync();
            await using var cmd  = conn.CreateCommand();

            cmd.CommandText = "CALL sp_record_violation_and_restrict($1, $2, $3, $4, $5, $6, $7, $8)";
            cmd.Parameters.Add(new NpgsqlParameter { Value = userId });
            cmd.Parameters.Add(new NpgsqlParameter { Value = violationTypeId });
            cmd.Parameters.Add(new NpgsqlParameter { Value = usageSessionId });
            cmd.Parameters.Add(new NpgsqlParameter { Value = incidentTime.ToUniversalTime() });
            cmd.Parameters.Add(new NpgsqlParameter { Value = description });
            cmd.Parameters.Add(new NpgsqlParameter { Value = severity });
            cmd.Parameters.Add(new NpgsqlParameter { Value = penaltyApplied });
            cmd.Parameters.Add(new NpgsqlParameter { Value = restrictDays });

            await cmd.ExecuteNonQueryAsync();
        }

        // ─────────────────────────────────────────────────────────────────
        // 8. fn_check_user_booking_eligibility
        // ─────────────────────────────────────────────────────────────────
        public async Task<bool> CheckUserBookingEligibilityAsync(int userId)
        {
            await using var conn = await OpenConnectionAsync();
            await using var cmd  = conn.CreateCommand();

            cmd.CommandText = "SELECT fn_check_user_booking_eligibility($1)";
            cmd.Parameters.Add(new NpgsqlParameter { Value = userId });

            var result = await cmd.ExecuteScalarAsync();
            return result is true;
        }

        // ─────────────────────────────────────────────────────────────────
        // 9. sp_process_room_checkout
        // ─────────────────────────────────────────────────────────────────
        public async Task ProcessRoomCheckoutAsync(
            int usageSessionId,
            DateTime actualCheckout,
            string roomCondition)
        {
            await using var conn = await OpenConnectionAsync();
            await using var cmd  = conn.CreateCommand();

            cmd.CommandText = "CALL sp_process_room_checkout($1, $2, $3)";
            cmd.Parameters.Add(new NpgsqlParameter { Value = usageSessionId });
            cmd.Parameters.Add(new NpgsqlParameter { Value = actualCheckout.ToUniversalTime() });
            cmd.Parameters.Add(new NpgsqlParameter { Value = roomCondition });

            await cmd.ExecuteNonQueryAsync();
        }

        // ─────────────────────────────────────────────────────────────────
        // HELPER: Mở và trả về kết nối NpgsqlConnection
        // ─────────────────────────────────────────────────────────────────
        private async Task<NpgsqlConnection> OpenConnectionAsync()
        {
            var conn = (NpgsqlConnection)_context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync();
            return conn;
        }
    }
}
