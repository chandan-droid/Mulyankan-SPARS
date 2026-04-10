package com.devdroid.spars_server.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoAttainmentReportDTO {
    private String subjectName;
    private String scope; // e.g., "Student", "Class", "Institute"
    private Long scopeId; // e.g., studentId, classId
    private List<CoAttainmentDTO> coAttainments;
}
