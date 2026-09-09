using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Vikreta.Api;
using Vikreta.Api.Infrastructure;
using Vikreta.Api.Middleware;
using Vikreta.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Services ───────────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();

// Swagger with JWT support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Vikreta API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT",
        Description = "Enter your JWT token"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

// Tenant context (scoped per request)
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddHttpContextAccessor();

// EF Core — uses ITenantContext for global query filters
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
{
    var tenantCtx = sp.GetRequiredService<ITenantContext>();
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("Default"),
        sql => sql.EnableRetryOnFailure(3));
});

// Domain services
builder.Services.AddScoped<IInventoryService, InventoryService>();

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "vikreta-super-secret-key-change-in-production-32chars";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "vikreta-api",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "vikreta-web",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// CORS — allow frontend dev server
builder.Services.AddCors(options =>
{
    options.AddPolicy("VikretaWeb", policy =>
        policy.WithOrigins(
            "http://localhost:5173",
            "http://localhost:3000",
            builder.Configuration["AllowedOrigins"] ?? "http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

// ── Build ──────────────────────────────────────────────────────────────────
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("VikretaWeb");
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Tenant resolution must come before auth
app.UseMiddleware<TenantMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// ── Seed ───────────────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    // For seeding we need a context without tenant filter
    var services = scope.ServiceProvider;
    try
    {
        // Create a temporary tenant context that returns empty Guid for migration/seed
        var tenantCtx = services.GetRequiredService<ITenantContext>();
        tenantCtx.SetTenant(Guid.Empty); // bypass filter for migration
        var db = services.GetRequiredService<AppDbContext>();
        await DbSeeder.SeedAsync(db);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred during database seeding.");
    }
}

app.Run();
