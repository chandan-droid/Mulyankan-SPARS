package com.devdroid.spars_server.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentQuestionMarksRequest {

    @NotNull(message = "Student ID cannot be null")
    private Long studentId;

    @Valid
    private List<QuestionMarkCreateRequest> questionMarks;
}
