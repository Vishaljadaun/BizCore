using BizCore.API.Middleware;
using BizCore.Application;
using BizCore.Infrastructure;
using BizCore.Infrastructure.Persistence;
using Microsoft.OpenApi.Models;
using System.Text.Json.Serialization;

// ↑ Yeh using directives bilkul top pe honi chahiye

var builder = WebApplication.CreateBuilder(args);

// ── Services Register Karo ────────────────────────────
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddControllers()
  .AddJsonOptions(options =>
  {
      // ← Yeh add karo
      options.JsonSerializerOptions.Converters.Add(
          new JsonStringEnumConverter()
      );
      // Ab "Employee" string directly enum mein convert hoga
      // Frontend ko integer bhejne ki zarurat nahi hai
  });

builder.Services.AddEndpointsApiExplorer();

// ── Swagger Configuration ─────────────────────────────
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "BizCore API",
        Version = "v1",
        Description = "BizCore Business Management Platform API",
    });
    // ↑ OpenApiInfo explicitly define karo
    // Yeh version field Swagger UI ko batata hai

    // JWT Bearer Auth definition
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "JWT token enter karo: Bearer {token}",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Allow only explicitly configured frontend origins in a hosted environment.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? (builder.Environment.IsDevelopment()
        ? new[] { "http://localhost:5173", "http://localhost:5174", "http://localhost:5175" }
        : Array.Empty<string>());
builder.Services.AddCors(options =>
{
    options.AddPolicy("BizCoreFrontend", policy =>
    {
        if (allowedOrigins.Length > 0)
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader().AllowAnyMethod().AllowCredentials();
    });
});

var app = builder.Build();

// ── Middleware Pipeline ───────────────────────────────
// ORDER BILKUL SAHI HONA CHAHIYE

app.UseMiddleware<GlobalExceptionMiddleware>();
// ↑ SABSE PEHLE — saare errors catch karega

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.UseCors("BizCoreFrontend");
// Render terminates HTTPS at its edge; internal container traffic is HTTP.
if (app.Environment.IsDevelopment()) app.UseHttpsRedirection();
app.UseAuthentication();   // JWT token read karo
app.UseAuthorization();    // Permissions check karo
app.MapControllers();
// Startup completes only after database migrations succeed.
app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

// ── Database Seed ─────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var seeder = scope.ServiceProvider
        .GetRequiredService<BizCoreDbSeeder>();
    await seeder.SeedAsync();
}

app.Run();