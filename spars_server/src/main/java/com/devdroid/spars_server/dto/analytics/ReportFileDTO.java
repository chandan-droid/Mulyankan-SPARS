package com.devdroid.spars_server.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportFileDTO {
    private String reportType;
    private String format;
    private String fileName;
    private String downloadUrl;
}
