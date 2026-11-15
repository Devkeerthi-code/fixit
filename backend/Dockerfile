# Multi-stage build: compile with the full JDK + Maven, run on a small JRE image.

FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
# Copy the build files first so the dependency download is cached until pom.xml changes
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY src src
RUN ./mvnw -B -q package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S fixit && adduser -S fixit -G fixit
COPY --from=build /app/target/fixit-backend-*.jar app.jar
USER fixit
EXPOSE 8080
# Render's free tier has 512 MB; cap the heap so the container isn't killed
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
