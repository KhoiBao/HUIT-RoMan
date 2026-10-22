# ---------- Build ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore riêng để tận dụng Docker layer cache khi source thay đổi.
COPY HUIT-RoMan.sln ./
COPY src/API/HUIT-RoMan.API.csproj src/API/
COPY src/Application/HUIT-RoMan.Application.csproj src/Application/
COPY src/Domain/HUIT-RoMan.Domain.csproj src/Domain/
COPY src/Infrastructure/HUIT-RoMan.Infrastructure.csproj src/Infrastructure/
RUN dotnet restore src/API/HUIT-RoMan.API.csproj

COPY src ./src
RUN dotnet publish src/API/HUIT-RoMan.API.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ---------- Runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# curl dùng cho healthcheck của Docker Compose.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

# Chạy bằng user không phải root có sẵn trong image .NET 8.
USER $APP_UID

HEALTHCHECK --interval=10s --timeout=5s --start-period=45s --retries=6 \
    CMD curl -fsS http://127.0.0.1:8080/api/health || exit 1

ENTRYPOINT ["dotnet", "HUIT-RoMan.API.dll"]
