package com.devdroid.spars_server.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarkCreateRequest {

    @NotNull(message = "studentId is required")
    private Long studentId;

    @NotNull(message = "assessmentId is required")
    private Long assessmentId;

    @NotNull(message = "totalMarks is required")
    @Min(value = 0, message = "totalMarks must be >= 0")
    private Double totalMarks;
}
