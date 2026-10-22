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

// CORS cho web React (Vite dev http://localhost:5173)
builder.Services.AddCors(options =>
{
    options.AddPolicy("Web", policy => policy
        .WithOrigins("http://localhost:5173", "https://localhost:5173", "http://127.0.0.1:5173", "https://127.0.0.1:5173", "http://localhost:3000")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

// PostgreSQL + EF Core (giữ nguyên connection string từ db_Library cũ)
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<HUIT_RoMan.Application.Common.Interfaces.IUnitOfWork, HUIT_RoMan.Infrastructure.Repositories.UnitOfWork>();
builder.Services.AddScoped(typeof(HUIT_RoMan.Application.Common.Interfaces.IRepository<>), typeof(HUIT_RoMan.Infrastructure.Repositories.Repository<>));
builder.Services.AddScoped<HUIT_RoMan.Application.Common.Interfaces.IStoredProcedureService, HUIT_RoMan.Infrastructure.Repositories.StoredProcedureService>();


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

app.Run();
