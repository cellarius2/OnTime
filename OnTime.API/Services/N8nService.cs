using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using OnTime.API.Models;

public class N8nService(HttpClient http, IConfiguration config)
{
    private readonly string _chatWebhook = config["N8n:ChatWebhookUrl"] ?? string.Empty;
    private readonly string _reminderWebhook = config["N8n:ReminderMessageWebhookUrl"] ?? string.Empty;

    public bool IsChatConfigured => Uri.TryCreate(_chatWebhook, UriKind.Absolute, out _);
    public bool IsReminderConfigured => Uri.TryCreate(_reminderWebhook, UriKind.Absolute, out _);

    public async Task<ChatResponse> SendChatMessageAsync(ChatRequest request)
    {
        if (!IsChatConfigured)
            throw new InvalidOperationException("O webhook de chat do n8n não está configurado.");

        var response = await http.PostAsJsonAsync(_chatWebhook, request);
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        if (string.IsNullOrWhiteSpace(content))
            return Fallback("O Jonas está dormindo... Aguarde um pouco e ele já levanta! 🦔");

        var json = ExtractJson(content);
        if (json is not null)
        {
            var parsed = TryDeserializeChatResponse(json);

            if (parsed is not null)
            {
                var inner = TryExtractInnerResponse(parsed);

                if (inner is not null)
                    return inner;

                return NormalizeResponse(parsed);
            }
        }

        return Fallback(CleanText(content));
    }

    public async Task<string> GenerateReminderMessageAsync(Schedule schedule)
    {
        if (!IsReminderConfigured)
            return schedule.Message;

        var prompt = new
        {
            message = $"""
            Crie uma mensagem curta e simpática para um lembrete de ponto.
            Título: {schedule.Title}
            Horário: {schedule.Time}
            Você é Jonas, um ouriço pontual e dramático.
            Retorne apenas a mensagem final, sem JSON, sem markdown, máximo 2 frases.
            """
        };

        var response = await http.PostAsJsonAsync(_reminderWebhook, prompt);
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        var text = CleanText(content);

        return text.Length > 0 ? text : schedule.Message;
    }

    private static ChatResponse? TryExtractInnerResponse(ChatResponse response)
    {
        if (!string.Equals(response.Intent, "chat", StringComparison.OrdinalIgnoreCase))
            return null;

        var responseText = ConvertToString(response.Text);

        if (string.IsNullOrWhiteSpace(responseText))
            return null;

        var innerJson = ExtractJson(responseText);

        if (innerJson is null)
            return null;

        var inner = TryDeserializeChatResponse(innerJson);

        if (inner is null)
            return null;

        inner = NormalizeResponse(inner);

        if (
            string.Equals(inner.Intent, "save_schedule", StringComparison.OrdinalIgnoreCase)
            || inner.Schedules?.Count > 0
        )
        {
            return inner;
        }

        return null;
    }

    private static ChatResponse? TryDeserializeChatResponse(string json)
    {
        try
        {
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            var response = JsonSerializer.Deserialize<ChatResponse>(json, options);

            return response is null ? null : NormalizeResponse(response);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static ChatResponse NormalizeResponse(ChatResponse response)
    {
        response.Intent = string.IsNullOrWhiteSpace(response.Intent)
            ? "chat"
            : ConvertToString(response.Intent);

        response.Text = CleanText(ConvertToString(response.Text));

        response.Schedules ??= new();

        return response;
    }

    private static string ConvertToString(object? value)
    {
        if (value is null)
            return string.Empty;

        if (value is string text)
            return text;

        if (value is JsonElement json)
        {
            return json.ValueKind switch
            {
                JsonValueKind.String => json.GetString() ?? string.Empty,
                JsonValueKind.Number => json.ToString(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Object => json.ToString(),
                JsonValueKind.Array => json.ToString(),
                _ => string.Empty
            };
        }

        return value.ToString() ?? string.Empty;
    }

    private static string? ExtractJson(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;

        text = CleanText(text);

        var match = Regex.Match(text, @"\{[\s\S]*\}", RegexOptions.Multiline);

        if (!match.Success)
            return null;

        var candidate = match.Value.Trim();

        try
        {
            JsonDocument.Parse(candidate);
            return candidate;
        }
        catch
        {
            return null;
        }
    }

    private static string CleanText(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return string.Empty;

        return content
            .Trim()
            .TrimStart('=')
            .Replace("```json", "")
            .Replace("```", "")
            .Trim();
    }

    private static ChatResponse Fallback(string text)
    {
        return new ChatResponse
        {
            Text = CleanText(text),
            Intent = "chat",
            Schedules = new()
        };
    }
}
