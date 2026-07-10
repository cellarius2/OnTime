FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY OnTime.API/OnTime.API.csproj OnTime.API/
RUN dotnet restore OnTime.API/OnTime.API.csproj

COPY OnTime.API/ OnTime.API/
RUN dotnet publish OnTime.API/OnTime.API.csproj -c Release --no-restore -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://0.0.0.0:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "OnTime.API.dll"]
