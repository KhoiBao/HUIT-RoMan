using System;
using System.Threading;
using System.Threading.Tasks;

namespace HUIT_RoMan.Application.Common.Interfaces
{
    public interface IEmailService
    {
        Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default);

        Task<bool> SendBookingApprovalEmailAsync(
            string toEmail,
            string recipientName,
            int bookingId,
            string activityName,
            string decision,
            string? reason = null,
            string? roomSummary = null,
            DateTime? startAt = null,
            DateTime? endAt = null,
            CancellationToken cancellationToken = default);
    }
}

