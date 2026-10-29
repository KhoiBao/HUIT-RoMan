namespace HUIT_RoMan.Application.Common.Models
{
    public class SmtpSettings
    {
        public string Host { get; set; } = "smtp.gmail.com";
        public int Port { get; set; } = 587;
        public bool EnableSsl { get; set; } = true;
        public string UserName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string SenderEmail { get; set; } = "no-reply@huit.edu.vn";
        public string SenderName { get; set; } = "Hệ thống quản lý phòng dùng chung HUIT";
        public bool EnableEmail { get; set; } = false;
    }
}

