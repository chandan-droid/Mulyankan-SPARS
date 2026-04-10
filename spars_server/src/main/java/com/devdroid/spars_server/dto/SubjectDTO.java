package com.devdroid.spars_server.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectDTO {

    private Long id;

    @NotBlank(message = "subjectCode is required")
    private String subjectCode;

    @NotBlank(message = "subjectName is required")
    private String subjectName;
}
