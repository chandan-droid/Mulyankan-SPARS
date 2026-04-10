package com.devdroid.spars_server.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDTO {

    private Long id;

    @NotBlank(message = "regNo is required")
    private String regNo;

    @NotBlank(message = "name is required")
    private String name;

    @NotNull(message = "classId is required")
    private Long classId;
}
