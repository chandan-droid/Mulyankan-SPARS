package com.devdroid.spars_server.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MarkUpdateRequest {

    @NotNull(message = "Marks obtained are required")
    private Double marksObtained;

    private Long studentId;
}
