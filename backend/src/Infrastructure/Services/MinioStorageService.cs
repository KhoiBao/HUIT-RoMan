using System;
using System.IO;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Minio;
using Minio.DataModel.Args;

namespace HUIT_RoMan.Infrastructure.Services
{
    // Cài đặt dịch vụ lưu trữ Object Storage sử dụng MinIO (tương thích AWS S3)
    // Tích hợp sẵn cơ chế dự phòng Local Disk Fallback khi môi trường cục bộ chưa bật MinIO
    public class MinioStorageService : IStorageService
    {
        private readonly ILogger<MinioStorageService> _logger;
        private readonly IMinioClient? _minioClient;
        private readonly string _defaultBucket;
        private readonly string _localStoragePath;
        private readonly bool _useLocalStorageFallback;

        public MinioStorageService(IConfiguration configuration, ILogger<MinioStorageService> logger)
        {
            _logger = logger;

            var endpoint = configuration["StorageSettings:Endpoint"] ?? configuration["Minio:Endpoint"] ?? "localhost:9000";
            var accessKey = configuration["StorageSettings:AccessKey"] ?? configuration["Minio:AccessKey"];
            var secretKey = configuration["StorageSettings:SecretKey"] ?? configuration["Minio:SecretKey"];
            var useSsl = bool.TryParse(configuration["StorageSettings:UseSsl"] ?? configuration["Minio:UseSSL"], out var ssl) && ssl;
            _defaultBucket = configuration["StorageSettings:BucketName"] ?? configuration["Minio:BucketName"] ?? "violations";
            _localStoragePath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "storage");

            // Không còn fallback credential cứng trong source: thiếu AccessKey/SecretKey thì dùng Local Storage.
            if (string.IsNullOrWhiteSpace(accessKey) || string.IsNullOrWhiteSpace(secretKey))
            {
                _logger.LogWarning("Thiếu cấu hình StorageSettings AccessKey/SecretKey (đặt qua biến môi trường StorageSettings__AccessKey/__SecretKey) — kích hoạt chế độ Local Storage Fallback.");
                _useLocalStorageFallback = true;
                return;
            }

            try
            {
                // Khởi tạo MinIO Client chuẩn
                _minioClient = new MinioClient()
                    .WithEndpoint(endpoint)
                    .WithCredentials(accessKey, secretKey)
                    .WithSSL(useSsl)
                    .Build();

                _useLocalStorageFallback = false;
                _logger.LogInformation("MinIO Storage Service đã khởi tạo thành công với Endpoint: {Endpoint}", endpoint);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Không thể kết nối MinIO Client, kích hoạt chế độ Local Storage Fallback.");
                _useLocalStorageFallback = true;
            }
        }

        private async Task EnsureBucketExistsAsync(string bucketName)
        {
            if (_minioClient == null) return;
            try
            {
                var beArgs = new BucketExistsArgs().WithBucket(bucketName);
                bool found = await _minioClient.BucketExistsAsync(beArgs);
                if (!found)
                {
                    var mbArgs = new MakeBucketArgs().WithBucket(bucketName);
                    await _minioClient.MakeBucketAsync(mbArgs);
                    _logger.LogInformation("Đã tự động khởi tạo Bucket mới: {Bucket}", bucketName);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Lỗi kiểm tra/tạo bucket MinIO '{Bucket}'.", bucketName);
            }
        }

        public async Task<string> UploadFileAsync(Stream stream, string fileName, string contentType, string bucketName, string prefix)
        {
            var targetBucket = string.IsNullOrWhiteSpace(bucketName) ? _defaultBucket : bucketName;
            var ext = Path.GetExtension(fileName);
            var safeName = Path.GetFileNameWithoutExtension(fileName).Replace(" ", "_");
            var uniqueKey = $"{prefix.TrimEnd('/')}/{DateTime.UtcNow:yyyyMMdd}/{Guid.NewGuid():N}_{safeName}{ext}";

            if (!_useLocalStorageFallback && _minioClient != null)
            {
                try
                {
                    await EnsureBucketExistsAsync(targetBucket);

                    var poArgs = new PutObjectArgs()
                        .WithBucket(targetBucket)
                        .WithObject(uniqueKey)
                        .WithStreamData(stream)
                        .WithObjectSize(stream.Length)
                        .WithContentType(contentType);

                    await _minioClient.PutObjectAsync(poArgs);
                    _logger.LogInformation("Đã upload file lên MinIO: {Bucket}/{Key} ({Size} bytes)", targetBucket, uniqueKey, stream.Length);
                    return uniqueKey;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Lỗi upload lên MinIO, tự động lưu dự phòng trên Local Disk: {Key}", uniqueKey);
                }
            }

            // Fallback lưu Local Disk
            var localFullPath = Path.Combine(_localStoragePath, targetBucket, uniqueKey.Replace('/', Path.DirectorySeparatorChar));
            var dir = Path.GetDirectoryName(localFullPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            if (stream.CanSeek)
            {
                stream.Position = 0;
            }

            using (var fileStream = new FileStream(localFullPath, FileMode.Create, FileAccess.Write))
            {
                await stream.CopyToAsync(fileStream);
            }

            _logger.LogInformation("Đã lưu file dự phòng trên Local Storage: {Path}", localFullPath);
            return uniqueKey;
        }

        public async Task<Stream?> DownloadFileAsync(string bucketName, string fileKey)
        {
            var targetBucket = string.IsNullOrWhiteSpace(bucketName) ? _defaultBucket : bucketName;

            if (!_useLocalStorageFallback && _minioClient != null)
            {
                try
                {
                    var ms = new MemoryStream();
                    var goArgs = new GetObjectArgs()
                        .WithBucket(targetBucket)
                        .WithObject(fileKey)
                        .WithCallbackStream(s => s.CopyTo(ms));

                    await _minioClient.GetObjectAsync(goArgs);
                    ms.Position = 0;
                    return ms;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Lỗi đọc file từ MinIO '{Bucket}/{Key}', thử đọc từ Local Storage Fallback.", targetBucket, fileKey);
                }
            }

            // Fallback đọc Local Disk
            var localFullPath = Path.Combine(_localStoragePath, targetBucket, fileKey.Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(localFullPath))
            {
                return new FileStream(localFullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
            }

            return null;
        }

        public async Task<string> GetPreSignedUrlAsync(string bucketName, string fileKey, int expiryMinutes = 60)
        {
            var targetBucket = string.IsNullOrWhiteSpace(bucketName) ? _defaultBucket : bucketName;

            if (!_useLocalStorageFallback && _minioClient != null)
            {
                try
                {
                    var args = new PresignedGetObjectArgs()
                        .WithBucket(targetBucket)
                        .WithObject(fileKey)
                        .WithExpiry(expiryMinutes * 60);

                    return await _minioClient.PresignedGetObjectAsync(args);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Không thể sinh Pre-signed URL từ MinIO, trả về download endpoint của API.");
                }
            }

            // Nếu không dùng Pre-signed URL hoặc chạy Local, trả về route tải qua API
            return $"/api/Violations/attachments/download?fileKey={Uri.EscapeDataString(fileKey)}";
        }

        public async Task<bool> DeleteFileAsync(string bucketName, string fileKey)
        {
            var targetBucket = string.IsNullOrWhiteSpace(bucketName) ? _defaultBucket : bucketName;

            if (!_useLocalStorageFallback && _minioClient != null)
            {
                try
                {
                    var roArgs = new RemoveObjectArgs()
                        .WithBucket(targetBucket)
                        .WithObject(fileKey);

                    await _minioClient.RemoveObjectAsync(roArgs);
                    _logger.LogInformation("Đã xóa file trên MinIO: {Bucket}/{Key}", targetBucket, fileKey);
                    return true;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Lỗi xóa file trên MinIO '{Bucket}/{Key}'.", targetBucket, fileKey);
                }
            }

            var localFullPath = Path.Combine(_localStoragePath, targetBucket, fileKey.Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(localFullPath))
            {
                File.Delete(localFullPath);
                return true;
            }

            return false;
        }
    }
}

