using Microsoft.AspNetCore.Mvc;
using OnTime.API.Models;
using System.Diagnostics;
using System.Text.Json;

[ApiController]
[Route("api/[controller]")]
public class ChatController(
    JonasAiService jonas, AppDbContext db, ILogger<ChatController> logger) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request, CancellationToken ct)
    {
        var total = Stopwatch.StartNew();
        var ai = Stopwatch.StartNew();
        var raw = await jonas.SendChatMessageAsync(request, ct);
        logger.LogInformation("Jonas respondeu ao chat em {ElapsedMs} ms", ai.ElapsedMilliseconds);

        var text = ExtractString(raw.Text, "text") ?? raw.Text?.ToString() ?? "";
        var intent = ExtractString(raw.Text, "intent") ?? raw.Intent ?? "chat";
        var schedules = ExtractSchedules(raw.Text) ?? raw.Schedules;

        db.Conversations.Add(new Conversation
        {
            Message = request.Message,
            Response = text,
        });
        var persistence = Stopwatch.StartNew();
        await db.SaveChangesAsync(ct);
        logger.LogInformation(
            "Conversa persistida em {PersistenceMs} ms; requisição de chat concluída em {TotalMs} ms",
            persistence.ElapsedMilliseconds, total.ElapsedMilliseconds);

        return Ok(new { text, intent, schedules });
    }

    private static string? ExtractString(object? obj, string key)
    {
        if (obj is JsonElement el && el.ValueKind == JsonValueKind.Object)
            if (el.TryGetProperty(key, out var prop) && prop.ValueKind == JsonValueKind.String)
                return prop.GetString();
        return null;
    }

    private static List<ScheduleDto>? ExtractSchedules(object? obj)
    {
        if (obj is JsonElement el && el.ValueKind == JsonValueKind.Object)
            if (el.TryGetProperty("schedules", out var prop) && prop.ValueKind == JsonValueKind.Array)
                return JsonSerializer.Deserialize<List<ScheduleDto>>(
                    prop.GetRawText(),
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        return null;
    }
}
