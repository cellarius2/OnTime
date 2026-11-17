using System.Net;
using System.Globalization;
using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using OnTime.API.Models;
using Xunit;

public class JonasAiServiceTests
{
    [Fact]
    public async Task ThanksAfterCompletedSchedule_DoesNotReopenPreviousRequest()
    {
        var handler = new QueueHandler();
        var service = CreateService(handler);

        var response = await service.SendChatMessageAsync(new ChatRequest
        {
            Message = "obrigada jonas",
            History =
            [
                new() { Role = "user", Content = "Crie lembretes de segunda a sexta: entrada às 08:00, saída para almoço às 12:00, retorno às 13:00 e saída às 18:00." },
                new() { Role = "assistant", Content = "Os quatro horários estão prontos." },
                new() { Role = "assistant", Content = "Pronto! Seus quatro lembretes ficaram para segunda a sexta, às 08:00, 12:00, 13:00 e 18:00. Meu relógio já está se achando importante. 🦔" },
                new() { Role = "user", Content = "obrigada jonas" }
            ]
        }, CancellationToken.None);

        Assert.Equal("chat", response.Intent);
        Assert.Empty(response.Schedules!);
        Assert.Equal("De nada! Agora deixa o relógio comigo. 🦔", response.Text);
        Assert.Empty(handler.RequestBodies);
    }

    [Fact]
    public async Task SpokenTimeAndAbbreviatedDays_CompleteOpenRequest()
    {
        var handler = new QueueHandler(
            OllamaResponse("""{"text":"Qual dia?","intent":"chat","schedules":[]}"""),
            OllamaResponse("""{"text":"Fechado!","intent":"save_schedule","schedules":[{"days":["mon","tue","wed","thu","fri"],"time":"08:00","message":"Lembrete"}]}"""));
        var service = CreateService(handler);

        var first = await service.SendChatMessageAsync(new ChatRequest
        {
            Message = "me lembra às 8 da manhã"
        }, CancellationToken.None);
        var firstText = Assert.IsType<string>(first.Text);
        Assert.Equal("chat", first.Intent);
        Assert.Contains("08:00", firstText);

        var second = await service.SendChatMessageAsync(new ChatRequest
        {
            Message = "de seg a sex",
            History =
            [
                new() { Role = "user", Content = "me lembra às 8 da manhã" },
                new() { Role = "assistant", Content = firstText }
            ]
        }, CancellationToken.None);

        var reminder = Assert.Single(second.Schedules!);
        Assert.Equal("08:00", reminder.Time);
        Assert.Equal(["mon", "tue", "wed", "thu", "fri"], reminder.Days);
    }

    [Fact]
    public async Task NewRequestAfterCompletion_IgnoresOldScheduleData()
    {
        var handler = new QueueHandler(OllamaResponse("""
            {"text":"Novo lembrete pronto.","intent":"save_schedule","schedules":[{"days":["tue"],"time":"09:30","message":"Novo lembrete"}]}
            """));
        var service = CreateService(handler);

        var response = await service.SendChatMessageAsync(new ChatRequest
        {
            Message = "bota um lembrete na terça às 9 e meia",
            History =
            [
                new() { Role = "user", Content = "segunda a sexta às 08:00" },
                new() { Role = "assistant", Content = "Pronto! Seu lembrete ficou para segunda a sexta, às 08:00." }
            ]
        }, CancellationToken.None);

        var reminder = Assert.Single(response.Schedules!);
        Assert.Equal("09:30", reminder.Time);
        Assert.Equal(["tue"], reminder.Days);
    }

    [Fact]
    public async Task CorrectionUpdatesTimeAndPreservesOpenDays()
    {
        var handler = new QueueHandler(OllamaResponse("""
            {"text":"Corrigido.","intent":"save_schedule","schedules":[{"days":["mon","tue","wed","thu","fri"],"time":"08:30","message":"Lembrete"}]}
            """));
        var service = CreateService(handler);

        var response = await service.SendChatMessageAsync(new ChatRequest
        {
            Message = "na verdade, às 8 e meia",
            History =
            [
                new() { Role = "user", Content = "me lembra de seg a sex às 8 da manhã" },
                new() { Role = "assistant", Content = "Confirmo esse horário para os cinco dias?" }
            ]
        }, CancellationToken.None);

        var reminder = Assert.Single(response.Schedules!);
        Assert.Equal("08:30", reminder.Time);
        Assert.Equal(5, reminder.Days.Length);
    }

    [Fact]
    public async Task MissingDay_PreservesPunchPairsAndDoesNotSave()
    {
        var handler = new QueueHandler(OllamaResponse("""
            {"text":"Qual dia?","intent":"save_schedule","schedules":[{"days":["mon"],"time":"14:00","message":"Entrada"},{"days":["mon"],"time":"18:00","message":"Saída"}]}
            """));
        var service = CreateService(handler);

        var response = await service.SendChatMessageAsync(new ChatRequest
        {
            Message = "Agende a entrada às 14:00 e a saída às 18:00."
        }, CancellationToken.None);

        Assert.Equal("chat", response.Intent);
        Assert.Empty(response.Schedules!);
        var text = Assert.IsType<string>(response.Text);
        Assert.Contains("entrada às 14:00", text, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("saida as 18:00", RemoveAccents(text), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DayFollowUp_PreservesTwoPunchesFromHistory()
    {
        var handler = new QueueHandler(OllamaResponse("""
            {"text":"Segunda-feira ficou organizada.","intent":"save_schedule","schedules":[{"days":["mon"],"time":"14:00","message":"Bater o ponto de entrada"},{"days":["mon"],"time":"18:00","message":"Bater o ponto de saída"}]}
            """));
        var service = CreateService(handler);

        var response = await service.SendChatMessageAsync(new ChatRequest
        {
            Message = "Pode confirmar para segunda-feira?",
            History =
            [
                new() { Role = "user", Content = "Agende a entrada às 14:00 e a saída às 18:00." },
                new() { Role = "assistant", Content = "Em quais dias eu coloco meus espinhos em alerta?" }
            ]
        }, CancellationToken.None);

        Assert.Equal("save_schedule", response.Intent);
        Assert.Equal(["14:00", "18:00"], response.Schedules!.Select(item => item.Time));
        Assert.All(response.Schedules, item => Assert.Equal(["mon"], item.Days));
        Assert.Contains("entrada", response.Schedules[0].Message, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("saída", response.Schedules[1].Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CompleteSingleMessage_ReturnsExactlyTwoPunches()
    {
        var handler = new QueueHandler(OllamaResponse("""
            {"text":"Meu relógio aprovou.","intent":"save_schedule","schedules":[{"days":["mon"],"time":"14:00","message":"Entrada"},{"days":["mon"],"time":"18:00","message":"Saída"}]}
            """));
        var service = CreateService(handler);

        var response = await service.SendChatMessageAsync(new ChatRequest
        {
            Message = "Na segunda-feira, agende a entrada às 14:00 e a saída às 18:00."
        }, CancellationToken.None);

        Assert.Equal("save_schedule", response.Intent);
        Assert.Equal(2, response.Schedules!.Count);
        Assert.Equal(["14:00", "18:00"], response.Schedules.Select(item => item.Time));
    }

    [Fact]
    public async Task ModelOmittingRequestedTime_IsBlocked()
    {
        var handler = new QueueHandler(OllamaResponse("""
            {"text":"Tudo certo.","intent":"save_schedule","schedules":[{"days":["mon"],"time":"14:00","message":"Entrada"}]}
            """));
        var service = CreateService(handler);

        var response = await service.SendChatMessageAsync(new ChatRequest
        {
            Message = "Na segunda-feira, agende a entrada às 14:00 e a saída às 18:00."
        }, CancellationToken.None);

        Assert.Equal("chat", response.Intent);
        Assert.Empty(response.Schedules!);
        Assert.Contains("incompleta", Assert.IsType<string>(response.Text), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Greeting_UsesConfiguredModelAndHistoryWithoutDuplicatingCurrentMessage()
    {
        var handler = new QueueHandler(OllamaResponse("""
            {"text":"Oi! Jonas na área, com os espinhos no horário! 🦔","intent":"chat","schedules":[]}
            """));
        var service = CreateService(handler);

        var response = await service.SendChatMessageAsync(new ChatRequest
        {
            Message = "Como você está?",
            History =
            [
                new() { Role = "assistant", Content = "Como posso ajudar?" },
                new() { Role = "user", Content = "Como você está?" }
            ]
        }, CancellationToken.None);

        Assert.Equal("chat", response.Intent);
        Assert.Empty(response.Schedules!);
        Assert.Contains("Jonas", Assert.IsType<string>(response.Text));

        using var payload = JsonDocument.Parse(handler.RequestBodies.Single());
        Assert.Equal("deepseek-test", payload.RootElement.GetProperty("model").GetString());
        var messages = payload.RootElement.GetProperty("messages").EnumerateArray().ToList();
        Assert.Equal(3, messages.Count);
        Assert.Single(messages, item =>
            item.GetProperty("role").GetString() == "user"
            && item.GetProperty("content").GetString() == "Como você está?");
    }

    [Fact]
    public async Task FollowUp_ReturnsTwoValidatedSchedules()
    {
        var handler = new QueueHandler(OllamaResponse("""
            {"text":"Perfeito! Separei entrada e saída.","intent":"save_schedule","schedules":[{"days":["mon","tue","wed","thu","fri"],"time":"08:12","message":"Bater o ponto de entrada"},{"days":["mon","tue","wed","thu","fri"],"time":"18:00","message":"Bater o ponto de saída"}]}
            """));
        var service = CreateService(handler);

        var response = await service.SendChatMessageAsync(new ChatRequest
        {
            Message = "De segunda a sexta, às 08:12 e às 18:00",
            History =
            [
                new() { Role = "user", Content = "Me lembra de bater o ponto" },
                new() { Role = "assistant", Content = "Quais dias e horários?" }
            ]
        }, CancellationToken.None);

        Assert.Equal("save_schedule", response.Intent);
        Assert.Equal(2, response.Schedules!.Count);
        Assert.Equal(["08:12", "18:00"], response.Schedules.Select(item => item.Time));
        Assert.All(response.Schedules, item => Assert.Equal(5, item.Days.Length));
    }

    [Fact]
    public async Task OllamaFailure_ReturnsFriendlyChatFallback()
    {
        var service = CreateService(new ThrowingHandler());

        var response = await service.SendChatMessageAsync(
            new ChatRequest { Message = "Como está seu dia?" }, CancellationToken.None);

        Assert.Equal("chat", response.Intent);
        Assert.Empty(response.Schedules!);
        Assert.Contains("tentar de novo", ((string)response.Text!).ToLowerInvariant());
    }

    [Fact]
    public async Task OllamaTimeout_ReturnsFriendlyChatFallback()
    {
        var service = CreateService(new TimeoutHandler());

        var response = await service.SendChatMessageAsync(
            new ChatRequest { Message = "Como está seu dia?" }, CancellationToken.None);

        Assert.Equal("chat", response.Intent);
        Assert.Empty(response.Schedules!);
        Assert.Contains("relógio cansou", Assert.IsType<string>(response.Text).ToLowerInvariant());
    }

    [Fact(Timeout = 30_000)]
    public async Task Chat_AllowsSimulatedResponseSlowerThanTwentySeconds()
    {
        var handler = new DelayedHandler(
            TimeSpan.FromMilliseconds(20_250),
            () => OllamaResponse("""
                {"text":"Demorei, mas cheguei no horário dos espinhos!","intent":"chat","schedules":[]}
                """));
        var service = CreateService(handler, new() { ["JonasAi:TimeoutSeconds"] = "25" });
        var stopwatch = Stopwatch.StartNew();

        var response = await service.SendChatMessageAsync(
            new ChatRequest { Message = "Conte uma piada curta" }, CancellationToken.None);

        Assert.True(stopwatch.Elapsed >= TimeSpan.FromSeconds(20));
        Assert.Equal("chat", response.Intent);
        Assert.Contains("espinhos", Assert.IsType<string>(response.Text));
    }

    [Fact]
    public async Task Chat_WithReducedTimeout_ReturnsSpecificTimeoutMessage()
    {
        var handler = new DelayedHandler(
            TimeSpan.FromSeconds(5),
            () => OllamaResponse("""{"text":"tarde demais","intent":"chat","schedules":[]}"""));
        var service = CreateService(handler, new() { ["JonasAi:TimeoutSeconds"] = "1" });
        var stopwatch = Stopwatch.StartNew();

        var response = await service.SendChatMessageAsync(
            new ChatRequest { Message = "Conte uma piada curta" }, CancellationToken.None);

        Assert.InRange(stopwatch.Elapsed, TimeSpan.FromMilliseconds(800), TimeSpan.FromSeconds(3));
        Assert.Contains("relógio cansou", Assert.IsType<string>(response.Text).ToLowerInvariant());
    }

    [Fact]
    public async Task UserCancellation_StopsOllamaAndNextAttemptCanSucceed()
    {
        var handler = new CancelThenRespondHandler(OllamaResponse("""
            {"text":"Agora sim.","intent":"save_schedule","schedules":[{"days":["mon"],"time":"08:00","message":"Entrada"},{"days":["mon"],"time":"18:00","message":"Saída"}]}
            """));
        var service = CreateService(handler, new() { ["JonasAi:TimeoutSeconds"] = "30" });
        using var cancellation = new CancellationTokenSource(TimeSpan.FromMilliseconds(100));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            service.SendChatMessageAsync(
                new ChatRequest { Message = "Na segunda, entrada às 08:00 e saída às 18:00" },
                cancellation.Token));

        var retry = await service.SendChatMessageAsync(
            new ChatRequest { Message = "Na segunda, entrada às 08:00 e saída às 18:00" },
            CancellationToken.None);

        Assert.Equal("save_schedule", retry.Intent);
        Assert.Equal(["08:00", "18:00"], retry.Schedules!.Select(item => item.Time));
    }

    [Fact]
    public async Task DispatchMessage_UsesPreviousMessageAndReturnsVariation()
    {
        var handler = new QueueHandler(
            OllamaResponse("""{"text":"🦔 18:00! Hora de registrar a saída!"}"""),
            OllamaResponse("""{"text":"⏰ 18:00! Expediente encerrado: registre a saída!"}"""));
        var service = CreateService(handler);
        var schedule = new Schedule
        {
            Title = "Bater ponto de saída",
            Time = "18:00",
            Days = "mon,tue,wed,thu,fri",
            Message = "Mensagem salva"
        };

        var first = await service.GenerateReminderMessageAsync(
            schedule, CancellationToken.None, dispatch: true);
        var second = await service.GenerateReminderMessageAsync(
            schedule, CancellationToken.None, first, dispatch: true);

        Assert.NotEqual(first, second);
        using var secondRequest = JsonDocument.Parse(handler.RequestBodies[1]);
        var reminderInput = secondRequest.RootElement
            .GetProperty("messages")[1]
            .GetProperty("content")
            .GetString();
        using var reminderPayload = JsonDocument.Parse(reminderInput!);
        Assert.Equal(first, reminderPayload.RootElement.GetProperty("previousMessage").GetString());
    }

    private static JonasAiService CreateService(
        HttpMessageHandler ollamaHandler, Dictionary<string, string?>? overrides = null)
    {
        var settings = new Dictionary<string, string?>
        {
            ["JonasAi:Provider"] = "Ollama",
            ["JonasAi:OllamaUrl"] = "http://ollama.test",
            ["JonasAi:Model"] = "deepseek-test"
        };
        foreach (var (key, value) in overrides ?? [])
            settings[key] = value;

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();
        var n8n = new N8nService(
            new HttpClient(new ThrowingHandler()), configuration, NullLogger<N8nService>.Instance);
        return new JonasAiService(
            new HttpClient(ollamaHandler), configuration, n8n, NullLogger<JonasAiService>.Instance);
    }

    private static HttpResponseMessage OllamaResponse(string content) => new(HttpStatusCode.OK)
    {
        Content = new StringContent(JsonSerializer.Serialize(new
        {
            message = new { role = "assistant", content },
            done_reason = "stop"
        }), Encoding.UTF8, "application/json")
    };

    private static string RemoveAccents(string value) => string.Concat(
        value.Normalize(System.Text.NormalizationForm.FormD).Where(character =>
            CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark));

    private sealed class QueueHandler(params HttpResponseMessage[] responses) : HttpMessageHandler
    {
        private readonly Queue<HttpResponseMessage> _responses = new(responses);
        public List<string> RequestBodies { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            RequestBodies.Add(await request.Content!.ReadAsStringAsync(cancellationToken));
            return _responses.Dequeue();
        }
    }

    private sealed class ThrowingHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken) =>
            throw new HttpRequestException("simulated outage");
    }

    private sealed class TimeoutHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken) =>
            throw new TaskCanceledException("simulated timeout");
    }

    private sealed class DelayedHandler(
        TimeSpan delay, Func<HttpResponseMessage> responseFactory) : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            await Task.Delay(delay, cancellationToken);
            return responseFactory();
        }
    }

    private sealed class CancelThenRespondHandler(HttpResponseMessage response) : HttpMessageHandler
    {
        private int _requests;

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (Interlocked.Increment(ref _requests) == 1)
                await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
            return response;
        }
    }
}
