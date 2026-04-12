# Stage 1: Build using Gradle Wrapper
FROM eclipse-temurin:17-jdk AS builder

WORKDIR /app

COPY . .

# Give permission (IMPORTANT for Linux)
RUN chmod +x gradlew

# Build project
RUN ./gradlew build -x test

# Stage 2: Run
FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=builder /app/build/libs/*.jar app.jar

ENTRYPOINT ["java","-jar","app.jar"]