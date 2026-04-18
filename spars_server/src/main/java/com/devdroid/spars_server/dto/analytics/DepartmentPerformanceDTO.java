package com.devdroid.spars_server.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentPerformanceDTO {
    private String department;
    private Double averageMarks;
    private Double passPercentage;
}
