package com.devdroid.spars_server.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherAssignmentDTO {

    private Long id;

    @NotNull(message = "teacherId is required")
    private Long teacherId;

    @NotNull(message = "subjectId is required")
    private Long subjectId;

    @NotNull(message = "classId is required")
    private Long classId;

    // Fields for displaying information
    private String teacherName;
    private String subjectName;
    private String className;
}
