using HUIT_RoMan.Application;
using HUIT_RoMan.Domain.Entities;
using HUIT_RoMan.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Controllers (thin - logic nằm ở Application, DB nằm ở Infrastructure)
builder.Services.AddControllers();

// PostgreSQL + EF Core (giữ nguyên connection string từ db_Library cũ)
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Identity (User : IdentityUser<int> trong Domain)
builder.Services.AddIdentity<User, IdentityRole<int>>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "HUIT-RoMan.API",
        Version = "v1"
    });
});

// Business layer (hiện trống, sau này chứa BookingService, RoomService...)
builder.Services.AddApplication();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "HUIT-RoMan.API v1");
        c.RoutePrefix = "swagger";
    });
}

// NOTE: http profile in launchSettings.json only listens on http://localhost:5056
// (no https). Keep HTTPS redirection out of Development to avoid SwaggerUI's
// fetch of /swagger/v1/swagger.json getting 307-redirected to a non-existent
// https port (which shows as "does not specify a valid version field").
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
