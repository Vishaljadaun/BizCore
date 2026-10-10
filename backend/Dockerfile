FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY BizCore.Domain/*.csproj BizCore.Domain/
COPY BizCore.Application/*.csproj BizCore.Application/
COPY BizCore.Infrastructure/*.csproj BizCore.Infrastructure/
COPY BizCore.API/*.csproj BizCore.API/
RUN dotnet restore BizCore.API/BizCore.API.csproj
COPY . .
RUN dotnet publish BizCore.API/BizCore.API.csproj -c Release -o /app --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app .
USER app
EXPOSE 10000
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["/bin/sh", "-c", "exec dotnet BizCore.API.dll --urls http://0.0.0.0:${PORT:-10000}"]
