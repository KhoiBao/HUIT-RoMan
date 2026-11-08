using HUIT_RoMan.Application;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Domain.Entities;
using HUIT_RoMan.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Secrets bắt buộc phải được cung cấp qua biến môi trường (file .env) - không có fallback trong code.
var jwtSecret = builder.Configuration["JwtSettings:Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret))
{
    throw new InvalidOperationException(
        "Chưa cấu hình JwtSettings:Secret. Sao chép .env.example thành .env và khai báo JWT_SECRET (biến môi trường JwtSettings__Secret).");
}
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Chưa cấu hình ConnectionStrings:DefaultConnection. Sao chép .env.example thành .env và khai báo POSTGRES_* .");
}

// nginx (container web) và tunnel đứng trước API: tin X-Forwarded-For để rate limiter phân hoạch đúng theo IP client.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Controllers (thin - logic nằm ở Application, DB nằm ở Infrastructure)
builder.Services.AddControllers();

// CORS cho web React - Cho phep moi Origin (Localhost, LAN IP, Public Tunnel) kem Credentials cho SignalR
builder.Services.AddCors(options =>
{
    options.AddPolicy("Web", policy => policy
        .SetIsOriginAllowed(_ => true)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

// SignalR (in-memory; hệ thống chỉ chạy một instance API)
builder.Services.AddSignalR();

// PostgreSQL + EF Core (giữ nguyên connection string từ db_Library cũ)
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<HUIT_RoMan.Application.Common.Interfaces.IUnitOfWork, HUIT_RoMan.Infrastructure.Repositories.UnitOfWork>();
builder.Services.AddScoped(typeof(HUIT_RoMan.Application.Common.Interfaces.IRepository<>), typeof(HUIT_RoMan.Infrastructure.Repositories.Repository<>));
builder.Services.AddScoped<HUIT_RoMan.Application.Common.Interfaces.IStoredProcedureService, HUIT_RoMan.Infrastructure.Repositories.StoredProcedureService>();

// Email Service (SMTP)
builder.Services.Configure<HUIT_RoMan.Application.Common.Models.SmtpSettings>(builder.Configuration.GetSection("SmtpSettings"));
builder.Services.AddScoped<HUIT_RoMan.Application.Common.Interfaces.IEmailService, HUIT_RoMan.Infrastructure.Services.EmailService>();

// Storage Service (MinIO / S3 Object Storage)
builder.Services.AddSingleton<HUIT_RoMan.Application.Common.Interfaces.IStorageService, HUIT_RoMan.Infrastructure.Services.MinioStorageService>();


// Identity (User : IdentityUser<int> trong Domain)
builder.Services.AddIdentity<User, IdentityRole<int>>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

// Add JWT Authentication
var key = Encoding.ASCII.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["JwtSettings:Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = @"JWT Authorization header using the Bearer scheme. \r\n\r\n 
                      Enter 'Bearer' [space] and then your token in the text input below.
                      \r\n\r\nExample: 'Bearer 12345abcdef'",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

// Business layer (hiện trống, sau này chứa BookingService, RoomService...)
builder.Services.AddApplication();

// Register HttpContextAccessor and CurrentUserService for role-based/department-based auth
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<HUIT_RoMan.Application.Common.Interfaces.ICurrentUserService, HUIT_RoMan.API.Services.CurrentUserService>();

// Tác vụ nền: tự động hủy đơn đã duyệt không nhận phòng đúng hạn (no-show).
// Chạy độc lập với trình duyệt; an toàn khi chạy lặp lại hoặc chạy nhiều instance backend.
builder.Services.AddHostedService<HUIT_RoMan.API.Services.BookingNoShowWatcher>();
builder.Services.AddHostedService<HUIT_RoMan.API.Services.BookingReminderWatcher>();
// Tác vụ nền: tự đóng phiên đang sử dụng quá giờ kết thúc mà không trả phòng.
builder.Services.AddHostedService<HUIT_RoMan.API.Services.OverdueSessionAutoCloseWatcher>();

// Chống brute-force: giới hạn tần suất theo IP cho login và các bước OTP quên mật khẩu.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, _) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            "{\"message\":\"Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.\"}");
    };

    static string PartitionKey(HttpContext context) =>
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            $"auth:{PartitionKey(context)}",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));

    options.AddPolicy("otp", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            $"otp:{PartitionKey(context)}",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromMinutes(1) }));
});

var app = builder.Build();

app.UseForwardedHeaders();

// Docker/CI có thể bật Database__AutoMigrate=true để áp migration trước khi seed.
// Mặc định tắt để giữ nguyên quy trình `update-db.bat` khi chạy local.
var autoMigrate = builder.Configuration.GetValue<bool>("Database:AutoMigrate");

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();

    try
    {
        if (autoMigrate)
        {
            var dbContext = services.GetRequiredService<ApplicationDbContext>();
            logger.LogInformation("Đang áp dụng các migration còn thiếu...");
            await dbContext.Database.MigrateAsync();
        }

        // Run Database Seeder
        await HUIT_RoMan.Infrastructure.Persistence.ApplicationDbSeeder.SeedAsync(services);
    }
    catch (System.Exception ex)
    {
        logger.LogError(ex, "Lỗi xảy ra trong quá trình khởi tạo Database.");
        if (autoMigrate)
        {
            throw;
        }
    }
}

if (args.Contains("--seed-only"))
{
    Console.WriteLine("[Seeder] Khoi tao du lieu seed hoan tat.");
    return;
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger(c =>
    {
        c.SerializeAsV2 = true;
    });
    app.UseSwaggerUI();
}

app.UseCors("Web");

app.UseRateLimiter();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<HUIT_RoMan.API.Hubs.ChatHub>("/hubs/chat");

app.Run();
