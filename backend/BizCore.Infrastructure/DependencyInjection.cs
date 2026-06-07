using BizCore.Application.Common.Interfaces;
using BizCore.Infrastructure.Persistence;
using BizCore.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructureServices(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            // ── PostgreSQL + EF Core ──────────────────────────
            services.AddDbContext<BizCoreDbContext>(options =>
                options.UseNpgsql(
                    configuration.GetConnectionString("DefaultConnection"),
                    b => b.MigrationsHistoryTable(
                        "__migrations", "shared")
                ));

            // IApplicationDbContext → BizCoreDbContext
            // Jab Application layer IApplicationDbContext maange
            // toh BizCoreDbContext do
            services.AddScoped<IApplicationDbContext>(
                provider => provider
                    .GetRequiredService<BizCoreDbContext>());

            // ── HTTP Context ──────────────────────────────────
            // IHttpContextAccessor → CurrentUserService ke liye zaroori
            // AddHttpContextAccessor:
            // Microsoft.Extensions.DependencyInjection.Abstractions se
            // lekin actually
            // Microsoft.AspNetCore.Http.Abstractions mein hai
            // .NET 8 WebAPI project mein automatically available hai
            services.AddHttpContextAccessor();

            // ── Custom Services ───────────────────────────────
            services.AddScoped<ICurrentUserService, CurrentUserService>();
            // ↑ Interface → Implementation
            // CurrentUserService BizCore.Infrastructure.Services mein hai

            services.AddScoped<ITokenService, TokenService>();
            // ↑ TokenService bhi Services folder mein hai

            // ── Seeder ────────────────────────────────────────
            services.AddScoped<BizCoreDbSeeder>();

            // ── JWT Authentication ────────────────────────────
            var jwtSettings = configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings["SecretKey"];

            if (string.IsNullOrEmpty(secretKey))
                throw new InvalidOperationException(
                    "JWT SecretKey appsettings.json mein configure nahi hai!");

            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme =
                    JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme =
                    JwtBearerDefaults.AuthenticationScheme;
                // ↑ Yeh batata hai: by default JWT use karo
                // Jab [Authorize] attribute lage
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters =
                    new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = jwtSettings["Issuer"],
                        ValidAudience = jwtSettings["Audience"],
                        IssuerSigningKey = new SymmetricSecurityKey(
                            Encoding.UTF8.GetBytes(secretKey)),
                        ClockSkew = TimeSpan.Zero
                        // ClockSkew = TimeSpan.Zero:
                        // Default 5 min grace period hata do
                        // Token exactly 15 min mein expire ho
                    };
            });

            // ── Authorization ─────────────────────────────────
            services.AddAuthorization();

            return services;
        }
    }
}
