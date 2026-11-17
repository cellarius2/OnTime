using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using OnTime.API.Models;
using Xunit;

public class ApiFlowTests
{
    [Fact]
    public async Task FourPunchRequest_CreatesFourSeparateWeekdaySchedules()
    {
        var ollama = new QueueHandler(
            OllamaResponse("""
                {"text":"Os quatro horários estão em formação!","intent":"save_schedule","schedules":[{"days":["mon","tue","wed","thu","fri"],"time":"08:00","message":"Entrada"},{"days":["mon","tue","wed","thu","fri"],"time":"12:00","message":"Saída para almoço"},{"days":["mon","tue","wed","thu","fri"],"time":"13:00","message":"Retorno do almoço"},{"days":["mon","tue","wed","thu","fri"],"time":"18:00","message":"Saída"}]}
                """),
            OllamaResponse("{\"text\":\"08:00! Hora da entrada.\"}"),
            OllamaResponse("{\"text\":\"12:00! Hora da saída para almoço.\"}"),
            OllamaResponse("{\"text\":\"13:00! Hora do retorno do almoço.\"}"),
            OllamaResponse("{\"text\":\"18:00! Hora da saída.\"}"));
        await using var factory = new OnTimeFactory(ollama);
        using var client = factory.CreateClient();

        var chat = await client.PostAsJsonAsync("/api/chat", new
        {
            message = "Crie lembretes de segunda a sexta: entrada às 08:00, saída para almoço às 12:00, retorno às 13:00 e saída às 18:00.",
            history = Array.Empty<object>()
        });
        chat.EnsureSuccessStatusCode();
        var reply = await chat.Content.ReadFromJsonAsync<ChatApiResponse>();
        Assert.Equal("save_schedule", reply!.Intent);
        Assert.Equal(4, reply.Schedules.Count);

        foreach (var reminder in reply.Schedules)
        {
            var created = await client.PostAsJsonAsync("/api/schedule", new
            {
                days = string.Join(',', reminder.Days),
                time = reminder.Time,
                message = reminder.Message,
                title = reminder.Message,
                description = "",
                active = true,
                discordWebhookUrl = "https://example.test/webhook",
                googleChatWebhookUrl = "",
                notificationService = "discord"
            });
            Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        }

        var schedules = await client.GetFromJsonAsync<List<Schedule>>("/api/schedule");
        Assert.Equal(4, schedules!.Count);
        Assert.Equal(["08:00", "12:00", "13:00", "18:00"],
            schedules.OrderBy(item => item.Time).Select(item => item.Time));
        Assert.All(schedules, item => Assert.Equal("mon,tue,wed,thu,fri", item.Days));

        var thanks = await client.PostAsJsonAsync("/api/chat", new
        {
            message = "obrigada jonas",
            history = new object[]
            {
                new { role = "user", content = "Crie lembretes de segunda a sexta: entrada às 08:00, saída para almoço às 12:00, retorno às 13:00 e saída às 18:00." },
                new { role = "assistant", content = "Pronto! Seus quatro lembretes ficaram para segunda a sexta, às 08:00, 12:00, 13:00 e 18:00." }
            }
        });
        thanks.EnsureSuccessStatusCode();
        var thanksReply = await thanks.Content.ReadFromJsonAsync<ChatApiResponse>();
        Assert.Equal("chat", thanksReply!.Intent);
        Assert.Empty(thanksReply.Schedules);

        var afterThanks = await client.GetFromJsonAsync<List<Schedule>>("/api/schedule");
        Assert.Equal(4, afterThanks!.Count);
    }

    [Fact]
    public async Task SpokenTimeFollowUp_CreatesOneWeekdaySchedule()
    {
        var ollama = new QueueHandler(
            OllamaResponse("{\"text\":\"Qual dia?\",\"intent\":\"chat\",\"schedules\":[]}"),
            OllamaResponse("{\"text\":\"Fechado!\",\"intent\":\"save_schedule\",\"schedules\":[{\"days\":[\"mon\",\"tue\",\"wed\",\"thu\",\"fri\"],\"time\":\"08:00\",\"message\":\"Lembrete\"}]}"),
            OllamaResponse("{\"text\":\"08:00! Hora do lembrete.\"}"));
        await using var factory = new OnTimeFactory(ollama);
        using var client = factory.CreateClient();

        var first = await client.PostAsJsonAsync("/api/chat", new
        {
            message = "me lembra às 8 da manhã",
            history = Array.Empty<object>()
        });
        first.EnsureSuccessStatusCode();
        var firstReply = await first.Content.ReadFromJsonAsync<ChatApiResponse>();
        Assert.Equal("chat", firstReply!.Intent);

        var second = await client.PostAsJsonAsync("/api/chat", new
        {
            message = "de seg a sex",
            history = new[]
            {
                new { role = "user", content = "me lembra às 8 da manhã" },
                new { role = "assistant", content = firstReply.Text }
            }
        });
        second.EnsureSuccessStatusCode();
        var secondReply = await second.Content.ReadFromJsonAsync<ChatApiResponse>();
        var reminder = Assert.Single(secondReply!.Schedules);

        var created = await client.PostAsJsonAsync("/api/schedule", new
        {
            days = string.Join(',', reminder.Days),
            time = reminder.Time,
            message = reminder.Message,
            title = reminder.Message,
            description = "",
            active = true,
            discordWebhookUrl = "https://example.test/webhook",
            googleChatWebhookUrl = "",
            notificationService = "discord"
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        var schedules = await client.GetFromJsonAsync<List<Schedule>>("/api/schedule");
        var saved = Assert.Single(schedules!);
        Assert.Equal("08:00", saved.Time);
        Assert.Equal("mon,tue,wed,thu,fri", saved.Days);
    }

    [Fact]
    public async Task ManualReminder_PersistsMultipleDaysAcrossCreateEditAndReload()
    {
        var ollama = new QueueHandler(
            OllamaResponse("""{"text":"Lembrete das 09:00 criado!"}"""),
            OllamaResponse("""{"text":"Lembrete das 09:00 atualizado!"}"""));
        await using var factory = new OnTimeFactory(ollama);
        using var client = factory.CreateClient();

        var createdResponse = await client.PostAsJsonAsync("/api/schedule", new
        {
            days = "mon,tue,wed,thu,fri",
            time = "09:00",
            message = "Bater o ponto",
            title = "Bater o ponto",
            description = "",
            active = true,
            discordWebhookUrl = "https://example.test/webhook",
            googleChatWebhookUrl = "",
            notificationService = "discord"
        });
        Assert.Equal(HttpStatusCode.Created, createdResponse.StatusCode);
        var created = await createdResponse.Content.ReadFromJsonAsync<Schedule>();
        Assert.Equal("mon,tue,wed,thu,fri", created!.Days);

        var afterCreate = await client.GetFromJsonAsync<List<Schedule>>("/api/schedule");
        Assert.Single(afterCreate!);

        var updateResponse = await client.PutAsJsonAsync($"/api/schedule/{created.Id}", new
        {
            days = "mon,tue,thu,fri,sat",
            time = "09:00",
            message = created.Message,
            title = created.Title,
            description = "",
            active = true,
            discordWebhookUrl = "https://example.test/webhook",
            googleChatWebhookUrl = "",
            notificationService = "discord"
        });
        updateResponse.EnsureSuccessStatusCode();

        var afterReload = await client.GetFromJsonAsync<List<Schedule>>("/api/schedule");
        var persisted = Assert.Single(afterReload!);
        Assert.Equal("09:00", persisted.Time);
        Assert.Equal("mon,tue,thu,fri,sat", persisted.Days);
    }

    [Fact]
    public async Task ChatFollowUp_SavesExactlyTwoSchedulesThroughRealRoutes()
    {
        var ollama = new QueueHandler(
            OllamaResponse("""
                {"text":"Qual dia?","intent":"chat","schedules":[]}
                """),
            OllamaResponse("""
                {"text":"Segunda-feira organizada!","intent":"save_schedule","schedules":[{"days":["mon"],"time":"14:00","message":"Entrada"},{"days":["mon"],"time":"18:00","message":"Saída"}]}
                """),
            OllamaResponse("""{"text":"Entrada às 14:00, combinado!"}"""),
            OllamaResponse("""{"text":"Saída às 18:00, não esqueça!"}"""));
        await using var factory = new OnTimeFactory(ollama);
        using var client = factory.CreateClient();

        var first = await client.PostAsJsonAsync("/api/chat", new
        {
            message = "Agende a entrada às 14:00 e a saída às 18:00.",
            history = Array.Empty<object>()
        });
        first.EnsureSuccessStatusCode();
        var firstReply = await first.Content.ReadFromJsonAsync<ChatApiResponse>();
        Assert.Equal("chat", firstReply!.Intent);
        Assert.Empty(firstReply.Schedules);
        Assert.Contains("14:00", firstReply.Text);
        Assert.Contains("18:00", firstReply.Text);

        var second = await client.PostAsJsonAsync("/api/chat", new
        {
            message = "Pode confirmar para segunda-feira?",
            history = new[]
            {
                new { role = "user", content = "Agende a entrada às 14:00 e a saída às 18:00." },
                new { role = "assistant", content = firstReply.Text }
            }
        });
        second.EnsureSuccessStatusCode();
        var secondReply = await second.Content.ReadFromJsonAsync<ChatApiResponse>();
        Assert.Equal("save_schedule", secondReply!.Intent);
        Assert.Equal(2, secondReply.Schedules.Count);
        Assert.Equal(["14:00", "18:00"], secondReply.Schedules.Select(item => item.Time));
        Assert.All(secondReply.Schedules, item => Assert.Equal(["mon"], item.Days));

        foreach (var reminder in secondReply.Schedules)
        {
            var created = await client.PostAsJsonAsync("/api/schedule", new
            {
                days = string.Join(',', reminder.Days),
                time = reminder.Time,
                message = reminder.Message,
                title = reminder.Message,
                description = "",
                active = true,
                discordWebhookUrl = "https://example.test/webhook",
                googleChatWebhookUrl = "",
                notificationService = "discord"
            });
            Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        }

        var schedules = await client.GetFromJsonAsync<List<Schedule>>("/api/schedule");
        Assert.Equal(2, schedules!.Count);
        Assert.Equal(2, schedules.Select(item => item.Time).Distinct().Count());
        Assert.Equal(["14:00", "18:00"], schedules.OrderBy(item => item.Time).Select(item => item.Time));
        Assert.All(schedules, item => Assert.Equal("mon", item.Days));
    }

    [Fact]
    public async Task NotificationRoute_RequiresTokenAndVariesMessage()
    {
        var ollama = new QueueHandler(
            OllamaResponse("""{"text":"🦔 18:00! Primeiro aviso de saída."}"""),
            OllamaResponse("""{"text":"⏰ 18:00! Segundo aviso de saída."}"""));
        await using var factory = new OnTimeFactory(ollama);
        using var client = factory.CreateClient();
        var id = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Schedules.Add(new Schedule
            {
                Id = id,
                Days = "mon,tue,wed,thu,fri",
                Time = "18:00",
                Title = "Bater ponto de saída",
                Message = "Mensagem salva",
                Active = true
            });
            await db.SaveChangesAsync();
        }

        var hidden = await client.PostAsJsonAsync(
            $"/api/schedule/{id}/notification-message", new { previousMessage = (string?)null });
        Assert.True(
            hidden.StatusCode == HttpStatusCode.Unauthorized,
            $"Expected 401, received {(int)hidden.StatusCode}: {await hidden.Content.ReadAsStringAsync()}");

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", "test-dispatch-token-with-at-least-32-characters");
        var first = await client.PostAsJsonAsync(
            $"/api/schedule/{id}/notification-message", new { previousMessage = (string?)null });
        first.EnsureSuccessStatusCode();
        var firstText = (await first.Content.ReadFromJsonAsync<NotificationResponse>())!.Text;

        var second = await client.PostAsJsonAsync(
            $"/api/schedule/{id}/notification-message", new { previousMessage = firstText });
        second.EnsureSuccessStatusCode();
        var secondText = (await second.Content.ReadFromJsonAsync<NotificationResponse>())!.Text;

        Assert.NotEqual(firstText, secondText);
    }

    private sealed class OnTimeFactory(HttpMessageHandler ollamaHandler) : WebApplicationFactory<Program>
    {
        private readonly string _databaseName = $"ontime-{Guid.NewGuid()}";

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseSetting(
                "ConnectionStrings:DefaultConnection",
                "Host=unused;Database=unused;Username=unused;Password=unused");
            builder.ConfigureAppConfiguration((_, configuration) =>
            {
                configuration.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = "Host=unused;Database=unused;Username=unused;Password=unused",
                    ["Database:MigrateOnStartup"] = "false",
                    ["JonasAi:Provider"] = "Ollama",
                    ["JonasAi:OllamaUrl"] = "http://ollama.test",
                    ["JonasAi:Model"] = "deepseek-test",
                    ["JonasAi:DispatchToken"] = "test-dispatch-token-with-at-least-32-characters"
                });
            });

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.RemoveAll<AppDbContext>();
                services.AddDbContext<AppDbContext>(options =>
                    options.UseInMemoryDatabase(_databaseName));
                services.AddHttpClient<JonasAiService>()
                    .ConfigurePrimaryHttpMessageHandler(() => ollamaHandler);
            });
        }
    }

    private static HttpResponseMessage OllamaResponse(string content) => new(HttpStatusCode.OK)
    {
        Content = new StringContent(JsonSerializer.Serialize(new
        {
            message = new { role = "assistant", content },
            done_reason = "stop"
        }), Encoding.UTF8, "application/json")
    };

    private sealed class QueueHandler(params HttpResponseMessage[] responses) : HttpMessageHandler
    {
        private readonly Queue<HttpResponseMessage> _responses = new(responses);

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(_responses.Dequeue());
    }

    private sealed record ChatApiResponse(string Text, string Intent, List<ScheduleDto> Schedules);
    private sealed record NotificationResponse(string Text);
}
