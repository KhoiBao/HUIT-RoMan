using System.IO;
using System.Threading.Tasks;

namespace HUIT_RoMan.Application.Common.Interfaces
{
    // Dịch vụ lưu trữ tệp tin chuyên dụng (MinIO / S3 Object Storage)
    public interface IStorageService
    {
        // Tải tệp tin lên Bucket (trả về FileKey định danh trong Storage)
        Task<string> UploadFileAsync(Stream stream, string fileName, string contentType, string bucketName, string prefix);

        // Đọc Stream tệp tin từ Storage để tải về
        Task<Stream?> DownloadFileAsync(string bucketName, string fileKey);

        // Tạo Pre-signed URL an toàn có thời hạn để xem/tải tệp
        Task<string> GetPreSignedUrlAsync(string bucketName, string fileKey, int expiryMinutes = 60);

        // Xóa tệp tin khỏi Storage
        Task<bool> DeleteFileAsync(string bucketName, string fileKey);
    }
}

