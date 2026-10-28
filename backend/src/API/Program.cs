using HUIT_RoMan.Application;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Domain.Entities;
using HUIT_RoMan.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

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

// SignalR & Cấu hình Redis Backplane (Docker)
var signalRBuilder = builder.Services.AddSignalR();
var redisConnectionString = builder.Configuration["Redis:ConnectionString"];
if (!string.IsNullOrWhiteSpace(redisConnectionString))
{
    try
    {
        var redisConfig = StackExchange.Redis.ConfigurationOptions.Parse(redisConnectionString);
        redisConfig.ConnectTimeout = 1500;
        redisConfig.SyncTimeout = 1500;
        redisConfig.AbortOnConnectFail = true;
        using var multiplexer = StackExchange.Redis.ConnectionMultiplexer.Connect(redisConfig);
        if (multiplexer.IsConnected)
        {
            signalRBuilder.AddStackExchangeRedis(redisConnectionString, options =>
            {
                options.Configuration.ChannelPrefix = StackExchange.Redis.RedisChannel.Literal("HUIT_RoMan_Chat");
            });
            Console.WriteLine($"[SignalR] Kết nối Redis Backplane thành công tại: {redisConnectionString}");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[SignalR] Không thể kết nối Redis Backplane ({ex.Message}). Tự động fallback sang In-memory SignalR.");
    }
}
else
{
    Console.WriteLine("[SignalR] Không cấu hình Redis ConnectionString. Sử dụng In-memory SignalR.");
}

// PostgreSQL + EF Core (giữ nguyên connection string từ db_Library cũ)
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<HUIT_RoMan.Application.Common.Interfaces.IUnitOfWork, HUIT_RoMan.Infrastructure.Repositories.UnitOfWork>();
builder.Services.AddScoped(typeof(HUIT_RoMan.Application.Common.Interfaces.IRepository<>), typeof(HUIT_RoMan.Infrastructure.Repositories.Repository<>));
builder.Services.AddScoped<HUIT_RoMan.Application.Common.Interfaces.IStoredProcedureService, HUIT_RoMan.Infrastructure.Repositories.StoredProcedureService>();

// Email Service (SMTP)
builder.Services.Configure<HUIT_RoMan.Application.Common.Models.SmtpSettings>(builder.Configuration.GetSection("SmtpSettings"));
builder.Services.AddScoped<HUIT_RoMan.Application.Common.Interfaces.IEmailService, HUIT_RoMan.Infrastructure.Services.EmailService>();


// Identity (User : IdentityUser<int> trong Domain)
builder.Services.AddIdentity<User, IdentityRole<int>>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

// Add JWT Authentication
var secretKey = builder.Configuration["JwtSettings:Secret"] ?? "super_secret_key_for_development_huit_roman_12345";
var key = Encoding.ASCII.GetBytes(secretKey);

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

var app = builder.Build();

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

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<HUIT_RoMan.API.Hubs.ChatHub>("/hubs/chat");

app.Run();
