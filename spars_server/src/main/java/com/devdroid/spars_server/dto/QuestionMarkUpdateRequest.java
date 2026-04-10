package com.devdroid.spars_server.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QuestionMarkUpdateRequest {

    @NotNull(message = "Marks obtained are required")
    private Double marksObtained;

    @NotNull(message = "coNumber is required")
    private Integer coNumber;
}
