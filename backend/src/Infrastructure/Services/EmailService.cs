using System;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HUIT_RoMan.Infrastructure.Services
{
    public class EmailService : IEmailService
    {
        private readonly SmtpSettings _settings;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IOptions<SmtpSettings> settings, ILogger<EmailService> logger)
        {
            _settings = settings?.Value ?? new SmtpSettings();
            _logger = logger;
        }

        public async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(toEmail))
            {
                _logger.LogWarning("[Email] Không thể gửi email: Địa chỉ người nhận trống.");
                return false;
            }

            // Nếu cấu hình tắt email hoặc chưa có cấu hình SMTP (dev/test mode)
            if (!_settings.EnableEmail || string.IsNullOrWhiteSpace(_settings.Host))
            {
                _logger.LogInformation(
                    "[Email Mock] To: {To} | Subject: '{Subject}' (SMTP đang tắt hoặc chưa cấu hình tài khoản trong appsettings.json)",
                    toEmail, subject);
                return true;
            }

            try
            {
                using var client = new SmtpClient(_settings.Host, _settings.Port)
                {
                    EnableSsl = _settings.EnableSsl,
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                    UseDefaultCredentials = false
                };

                if (!string.IsNullOrWhiteSpace(_settings.UserName) && !string.IsNullOrWhiteSpace(_settings.Password))
                {
                    client.Credentials = new NetworkCredential(_settings.UserName, _settings.Password);
                }

                using var mailMessage = new MailMessage
                {
                    From = new MailAddress(_settings.SenderEmail, _settings.SenderName, Encoding.UTF8),
                    Subject = subject,
                    Body = htmlBody,
                    IsBodyHtml = true,
                    SubjectEncoding = Encoding.UTF8,
                    BodyEncoding = Encoding.UTF8
                };

                mailMessage.To.Add(new MailAddress(toEmail));

                await client.SendMailAsync(mailMessage, cancellationToken);
                _logger.LogInformation("[Email Sent] Gửi email thành công tới {To} | Tiêu đề: '{Subject}'", toEmail, subject);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Email Error] Gặp lỗi khi gửi email tới {To} qua SMTP {Host}:{Port}: {Message}",
                    toEmail, _settings.Host, _settings.Port, ex.Message);
                return false;
            }
        }

        public async Task<bool> SendBookingApprovalEmailAsync(
            string toEmail,
            string recipientName,
            int bookingId,
            string activityName,
            string decision,
            string? reason = null,
            string? roomSummary = null,
            DateTime? startAt = null,
            DateTime? endAt = null,
            string? checkInCode = null,
            CancellationToken cancellationToken = default)
        {
            var isApproved = decision == "Đã duyệt";
            var isRejected = decision == "Từ chối";
            var isPartial = decision == "Duyệt một phần";
            var isCancelled = decision == "Đã hủy bởi quản trị" || decision == "Đã hủy";

            string subjectPrefix = isApproved ? "ĐÃ ĐƯỢC DUYỆT" :
                                   isRejected ? "BỊ TỪ CHỐI" :
                                   isPartial ? "ĐƯỢC DUYỆT MỘT PHẦN" :
                                   isCancelled ? "ĐÃ BỊ HỦY BỞI QUẢN TRỊ" : "CẬP NHẬT TRẠNG THÁI";

            var subject = $"[HUIT] Đơn đặt phòng #{bookingId} {subjectPrefix} - {activityName}";

            var badgeBg = isApproved ? "#ecfdf5" : isRejected ? "#fef2f2" : isPartial ? "#eff6ff" : "#fffbeb";
            var badgeBorder = isApproved ? "#10b981" : isRejected ? "#ef4444" : isPartial ? "#3b82f6" : "#f59e0b";
            var badgeText = isApproved ? "#047857" : isRejected ? "#b91c1c" : isPartial ? "#1d4ed8" : "#b45309";
            var statusHeading = isApproved ? "ĐÃ PHÊ DUYỆT" : isRejected ? "TỪ CHỐI YÊU CẦU" : isPartial ? "DUYỆT MỘT PHẦN" : "ĐÃ HỦY BỞI QUẢN TRỊ";

            // Giờ Việt Nam (UTC+7)
            string timeStr = "Theo chi tiết đơn đặt phòng";
            if (startAt.HasValue && endAt.HasValue)
            {
                var s = startAt.Value.AddHours(7);
                var e = endAt.Value.AddHours(7);
                timeStr = $"{s:HH:mm} – {e:HH:mm}, ngày {s:dd/MM/yyyy}";
            }

            var sb = new StringBuilder();
            sb.Append($@"
<!DOCTYPE html>
<html lang=""vi"">
<head>
  <meta charset=""UTF-8"" />
  <title>{subject}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f1f5f9; margin: 0; padding: 24px; }}
    .email-container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0; }}
    .email-header {{ background: #003366; color: #ffffff; padding: 24px 28px; text-align: left; }}
    .email-header h1 {{ margin: 0; font-size: 19px; font-weight: 700; letter-spacing: -0.02em; }}
    .email-header p {{ margin: 4px 0 0; font-size: 12px; color: #cbd5e1; }}
    .email-body {{ padding: 28px; }}
    .status-banner {{ background: {badgeBg}; border: 1.5px solid {badgeBorder}; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; text-align: center; }}
    .status-banner-title {{ font-size: 16px; font-weight: 800; color: {badgeText}; margin: 0; text-transform: uppercase; letter-spacing: 0.03em; }}
    .info-table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
    .info-table td {{ padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13.5px; }}
    .info-label {{ font-weight: 600; color: #64748b; width: 34%; vertical-align: top; }}
    .info-val {{ color: #0f172a; font-weight: 500; }}
    .notice-box {{ background: #f8fafc; border-left: 4px solid #0284c7; padding: 14px 16px; margin: 24px 0; border-radius: 0 6px 6px 0; font-size: 13px; color: #334155; }}
    .notice-box strong {{ color: #0369a1; }}
    .btn-link {{ display: inline-block; background: #0066cc; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 13.5px; margin-top: 12px; }}
    .email-footer {{ background: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; font-size: 11.5px; color: #64748b; text-align: center; }}
  </style>
</head>
<body>
  <div class=""email-container"">
    <div class=""email-header"">
      <h1>TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP.HCM (HUIT)</h1>
      <p>Hệ thống Quản lý Phòng Dùng Chung HUIT</p>
    </div>

    <div class=""email-body"">
      <p>Xin chào <strong>{recipientName}</strong>,</p>
      <p>Hệ thống quản lý phòng dùng chung HUIT xin thông báo về kết quả xử lý đơn đặt phòng của bạn:</p>

      <div class=""status-banner"">
        <h2 class=""status-banner-title"">KẾT QUẢ: {statusHeading}</h2>
      </div>");

            if ((isApproved || isPartial) && !string.IsNullOrWhiteSpace(checkInCode))
            {
                sb.Append($@"
      <div style=""background: #f0fdf4; border: 2px solid #86efac; border-radius: 10px; padding: 18px 20px; margin: 20px 0; text-align: center;"">
        <p style=""margin: 0 0 6px; font-size: 13px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;"">
          🔑 MÃ NHẬN PHÒNG (CHECK-IN CODE) CỦA BẠN
        </p>
        <div style=""font-family: 'Courier New', Courier, monospace; font-size: 26px; font-weight: 900; color: #15803d; letter-spacing: 2px; margin: 8px 0; background: #ffffff; padding: 10px 16px; border-radius: 8px; border: 1.5px dashed #22c55e; display: inline-block;"">
          {checkInCode}
        </div>
        <p style=""margin: 8px 0 0; font-size: 12.5px; color: #166534;"">
          Vui lòng nhập mã này trên hệ thống hoặc xuất trình cho cán bộ trực khi đến nhận phòng.
        </p>
      </div>");
            }

            sb.Append($@"
      <table class=""info-table"">
        <tr>
          <td class=""info-label"">Mã đơn đặt:</td>
          <td class=""info-val""><strong>#{bookingId}</strong></td>
        </tr>
        <tr>
          <td class=""info-label"">Hoạt động:</td>
          <td class=""info-val"">{activityName}</td>
        </tr>
        <tr>
          <td class=""info-label"">Phòng / Khu vực:</td>
          <td class=""info-val"">{roomSummary ?? "Theo chi tiết đơn đặt phòng"}</td>
        </tr>
        <tr>
          <td class=""info-label"">Khung giờ mượn:</td>
          <td class=""info-val"">{timeStr}</td>
        </tr>");

            if (!string.IsNullOrWhiteSpace(checkInCode))
            {
                sb.Append($@"
        <tr>
          <td class=""info-label"">Mã nhận phòng:</td>
          <td class=""info-val""><strong style=""font-family: 'Courier New', Courier, monospace; font-size: 15px; color: #15803d; background: #dcfce7; padding: 2px 8px; border-radius: 4px; border: 1px solid #86efac; letter-spacing: 1px;"">{checkInCode}</strong></td>
        </tr>");
            }

            if (!string.IsNullOrWhiteSpace(reason))
            {
                sb.Append($@"
        <tr>
          <td class=""info-label"">Ghi chú / Lý do:</td>
          <td class=""info-val"" style=""color: {badgeText};""><strong>{reason}</strong></td>
        </tr>");
            }

            sb.Append($@"
        <tr>
          <td class=""info-label"">Thời điểm xử lý:</td>
          <td class=""info-val"">{DateTime.UtcNow.AddHours(7):HH:mm dd/MM/yyyy} (Giờ Việt Nam)</td>
        </tr>
      </table>");

            if (isApproved || isPartial)
            {
                sb.Append(@"
      <div class=""notice-box"">
        <strong>⚠️ Lưu ý quan trọng về thủ tục nhận phòng (Check-in):</strong><br />
        • Cửa sổ nhận phòng mở trong vòng <strong>15 phút trước giờ bắt đầu</strong> [T - 15 phút, T).<br />
        • Quá giờ bắt đầu (T), nếu chưa thực hiện nhận phòng trực tuyến hoặc qua mã xác nhận, hệ thống sẽ <strong>tự động hủy đơn do vắng mặt (No-show)</strong> để giải phóng phòng cho người khác.<br />
        • Vui lòng kiểm tra hiện trạng thiết bị và xác nhận trả phòng đúng giờ khi kết thúc.
      </div>");
            }
            else if (isRejected)
            {
                sb.Append(@"
      <div class=""notice-box"">
        <strong>💡 Gợi ý tiếp theo:</strong><br />
        Đơn đặt phòng này không thể đáp ứng do phòng bận hoặc lý do nêu trên. Bạn có thể truy cập hệ thống để tra cứu phòng trống khác hoặc chọn khung giờ khác phù hợp hơn.
      </div>");
            }

            sb.Append($@"
      <div style=""text-align: center; margin-top: 24px;"">
        <a href=""https://roman.huit.edu.vn/dat-phong?tab=my-bookings"" class=""btn-link"">
          Xem chi tiết đơn trên hệ thống &rarr;
        </a>
      </div>
    </div>

    <div class=""email-footer"">
      <p style=""margin: 0 0 6px;""><strong>Ban Quản trị Phòng Dùng Chung & Thiết bị Thư viện HUIT</strong></p>
      <p style=""margin: 0 0 4px;"">Địa chỉ: 140 Lê Trọng Tấn, P. Tây Thạnh, Q. Tân Phú, TP. Hồ Chí Minh</p>
      <p style=""margin: 0;"">Email này được gửi tự động từ hệ thống quản lý phòng dùng chung HUIT. Vui lòng không trả lời trực tiếp email này.</p>
    </div>
  </div>
</body>
</html>");

            return await SendEmailAsync(toEmail, subject, sb.ToString(), cancellationToken);
        }
    }
}

