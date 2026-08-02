using Microsoft.EntityFrameworkCore;

Environment.SetEnvironmentVariable("DOTNET_USE_POLLING_FILE_WATCHER", "1");

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection deve ser configurada por variável de ambiente.");

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

var allowedOriginsSection = builder.Configuration.GetSection("Cors:AllowedOrigins");
var allowedOrigins = !string.IsNullOrWhiteSpace(allowedOriginsSection.Value)
    ? allowedOriginsSection.Value.Split(
        ',',
        StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    : allowedOriginsSection.Get<string[]>() ?? [];

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddHttpClient<N8nService>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler();
app.UseCors("AllowFrontend");
app.MapHealthChecks("/health");
app.MapGet("/", () => Results.Ok(new
{
    status = "ok",
    service = "OnTime API"
}));
app.MapGet("/api/status", () => Results.Ok(new
{
    status = "ok",
    service = "OnTime API"
}));
app.MapControllers();

if (builder.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider
        .GetRequiredService<AppDbContext>()
        .Database.MigrateAsync();
}

app.Run();
