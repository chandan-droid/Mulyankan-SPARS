package com.devdroid.spars_server.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarkDTO {

    private Long id;

    private Long studentId;

    private Long assessmentId;

    private Double totalMarks;

    private LocalDateTime createdAt;
}
