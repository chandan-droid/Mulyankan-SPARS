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
public class QuestionMarkCreateRequest {

    @NotNull(message = "questionNumber is required")
    private Integer questionNumber;

    @NotNull(message = "coNumber is required")
    private Integer coNumber;

    @NotNull(message = "maxMarks is required")
    @Min(value = 0, message = "maxMarks must be >= 0")
    private Double maxMarks;

    @NotNull(message = "obtainedMarks is required")
    @Min(value = 0, message = "obtainedMarks must be >= 0")
    private Double obtainedMarks;
}
