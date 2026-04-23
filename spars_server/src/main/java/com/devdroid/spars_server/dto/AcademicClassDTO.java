package com.devdroid.spars_server.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcademicClassDTO {

    private Long id;

    @NotBlank(message = "branch is required")
    private String branch;

    @NotNull(message = "semester is required")
    private Integer semester;

    private String section;

    @NotBlank(message = "academicYear is required")
    private String academicYear;

    private int studentCount;

    private List<String> subjects;
}
