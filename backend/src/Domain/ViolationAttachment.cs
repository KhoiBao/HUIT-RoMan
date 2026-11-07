using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    // Tệp đính kèm của biên bản vi phạm (hình ảnh chứng cứ, biên bản kiểm điểm Word/PDF...)
    [Table("ViolationAttachments")]
    public class ViolationAttachment : Common.BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [ForeignKey("ViolationRecord")]
        public int ViolationRecordId { get; set; }
        public virtual ViolationRecord ViolationRecord { get; set; }

        // Khóa lưu trữ Object Key trong MinIO/S3 (VD: violations/2026/VP-20261106-001/uuid-filename.docx)
        [StringLength(500)]
        public string FileKey { get; set; } = string.Empty;

        // Tên file gốc người dùng tải lên
        [StringLength(255)]
        public string OriginalFileName { get; set; } = string.Empty;

        // Định dạng MIME (image/png, image/jpeg, application/pdf, application/vnd.openxmlformats...)
        [StringLength(100)]
        public string ContentType { get; set; } = string.Empty;

        // Dung lượng file tính bằng bytes
        public long FileSize { get; set; }

        // Người tải lên file
        public int? UploadedByUserId { get; set; }
        [ForeignKey("UploadedByUserId")]
        public virtual User? UploadedByUser { get; set; }
    }
}

