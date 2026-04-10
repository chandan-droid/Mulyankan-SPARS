package com.devdroid.spars_server.dto;

import com.devdroid.spars_server.entity.AssessmentType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentDTO {

    private Long id;

    @NotBlank(message = "name is required")
    private String name;

    @NotNull(message = "type is required")
    private AssessmentType type;

    @NotNull(message = "subjectId is required")
    private Long subjectId;

    @NotNull(message = "classId is required")
    private Long classId;

    @NotNull(message = "maxMarks is required")
    @Min(value = 1, message = "maxMarks must be greater than 0")
    private Integer maxMarks;

    @NotNull(message = "examDate is required")
    private LocalDate examDate;
}
