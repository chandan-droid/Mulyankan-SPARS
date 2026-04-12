# Use Java base image
FROM eclipse-temurin:17-jdk
# Set working directory
WORKDIR /app

# Copy jar file
COPY build/libs/*-SNAPSHOT.jar app.jar

# Expose port
EXPOSE 8080

# Run application
ENTRYPOINT ["java", "-jar", "app.jar"]