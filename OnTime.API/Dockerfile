FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY . ./

RUN dotnet restore ./OnTime.API.csproj
RUN dotnet publish ./OnTime.API.csproj -c Release --no-restore -o out

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

COPY --from=build /src/out ./out

EXPOSE 10000

ENTRYPOINT ["dotnet", "./out/OnTime.API.dll"]
